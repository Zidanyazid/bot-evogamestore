import express, { Request, Response } from 'express';
import axios from 'axios';
import path from 'path';
import { prisma } from '../db/client';
import { TokopayService } from '../services/tokopay';
import { DigiflazzService } from '../services/digiflazz';
import { config } from '../config/env';
import { Bot } from 'grammy';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store active Telegram Bot instance reference
let telegramBot: Bot<any> | null = null;

export function setBotInstance(bot: Bot<any>) {
  telegramBot = bot;
}

/**
 * Endpoint for Tokopay Payment Gateway Webhook Callback
 */
app.post('/webhooks/tokopay', async (req: Request, res: Response): Promise<void> => {
  const { merchant_id, ref_id, reff_id, status, nominal, signature } = req.body;
  
  // Tokopay sometimes uses reff_id or ref_id, let's handle both
  const finalRefId = ref_id || reff_id;

  console.log(`[Tokopay Webhook] Received callback for RefID: ${finalRefId}, Status: ${status}`);

  if (!finalRefId || !signature) {
    res.status(400).json({ status: false, message: 'Invalid payload parameters' });
    return;
  }

  // 1. Verify Signature
  const isValid = TokopayService.verifyCallbackSignature(signature, finalRefId);
  if (!isValid) {
    console.error(`[Tokopay Webhook] Signature verification failed for RefID: ${finalRefId}`);
    res.status(401).json({ status: false, message: 'Invalid signature verification' });
    return;
  }

  // 2. Process payment if status is successful/paid
  // Tokopay typically sends "Success" or 1 for successful payment
  const isPaid = status === 'Success' || status === 'success' || String(status) === '1';

  if (!isPaid) {
    console.warn(`[Tokopay Webhook] Transaction not successful yet. Status: ${status}`);
    res.json({ status: true }); // Acknowledge receipt
    return;
  }

  try {
    // 3. Find transaction in database
    const transaction = await prisma.transaction.findUnique({
      where: { refId: finalRefId },
      include: { user: true }
    });

    if (!transaction) {
      console.error(`[Tokopay Webhook] Transaction not found for RefID: ${finalRefId}`);
      res.status(404).json({ status: false, message: 'Transaction not found' });
      return;
    }

    // Prevent double processing
    if (transaction.paymentStatus === 'PAID') {
      console.log(`[Tokopay Webhook] Transaction RefID: ${finalRefId} has already been processed.`);
      res.json({ status: true });
      return;
    }

    // 4. Update transaction payment status to PAID
    const updatedTx = await prisma.transaction.update({
      where: { refId: finalRefId },
      data: {
        paymentStatus: 'PAID',
        orderStatus: 'PROCESSING'
      }
    });

    console.log(`[Database] Transaction RefID: ${finalRefId} status updated to PAID. Dispatching top-up...`);

    // 5. Instantly notify customer that payment was received and top-up is beginning
    if (telegramBot) {
      try {
        await telegramBot.api.sendMessage(
          transaction.telegramId,
          `✅ *Pembayaran Sukses!*\n\nPembayaran sebesar *Rp ${transaction.amount.toLocaleString('id-ID')}* telah kami terima.\n\n⚡ *Pesanan Anda Sedang Diproses:*\n🎮 Game: *${transaction.gameName}*\n📦 Produk: *${transaction.productName}*\nTarget: \`${transaction.targetId}${transaction.targetZone ? ` (${transaction.targetZone})` : ''}\`\n\n_Mohon tunggu sebentar, kami sedang mengirimkan produk digital Anda..._`,
          { parse_mode: 'Markdown' }
        );
      } catch (err) {
        console.error('Failed to send Telegram message:', err);
      }
    }

    // 5b. Handle DEPOSIT balance credit
    if (transaction.productCode === 'DEPOSIT') {
      console.log(`[Deposit Webhook] RefID: ${finalRefId} is a DEPOSIT. Crediting user balance...`);

      // Calculate net amount by backing out the 1.7% fee
      const netAmount = Math.round(transaction.amount / 1.017);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: transaction.telegramId },
          data: { balance: { increment: netAmount } }
        }),
        prisma.transaction.update({
          where: { refId: finalRefId },
          data: { orderStatus: 'SUCCESS', sn: `CREDITED: Rp ${netAmount.toLocaleString('id-ID')}` }
        })
      ]);

      if (telegramBot) {
        try {
          await telegramBot.api.sendMessage(
            transaction.telegramId,
            `✅ *Deposit Saldo Sukses!*\n\nPembayaran sebesar *Rp ${transaction.amount.toLocaleString('id-ID')}* telah kami terima.\n\n💰 Saldo sebesar *Rp ${netAmount.toLocaleString('id-ID')}* telah berhasil ditambahkan ke akun Anda.\n\nTerima kasih telah melakukan deposit di *Evo Game Store*!`,
            { parse_mode: 'Markdown' }
          );
        } catch (err) {
          console.error('Failed to send deposit Telegram message:', err);
        }
      }

      res.json({ status: true });
      return;
    }

    // Fetch the product detail to check its provider (H2H or MANUAL)
    const product = await prisma.product.findUnique({
      where: { code: transaction.productCode }
    });

    if (product?.provider === 'MANUAL') {
      // 6. PROCESS MANUAL STOCK DISPATCH
      console.log(`[Manual Order] RefID: ${finalRefId} is a MANUAL stock product. Finding unsold stock...`);
      
      const stocks = await prisma.stockItem.findMany({
        where: { productCode: transaction.productCode, isSold: false },
        orderBy: { createdAt: 'asc' },
        take: transaction.quantity
      });

      if (stocks.length >= transaction.quantity) {
        // Successful instant delivery!
        const stockIds = stocks.map(s => s.id);
        const credentialsList = stocks.map(s => s.value).join('\n');

        await prisma.$transaction([
          prisma.stockItem.updateMany({
            where: { id: { in: stockIds } },
            data: { isSold: true, transactionId: transaction.id }
          }),
          prisma.transaction.update({
            where: { refId: finalRefId },
            data: { orderStatus: 'SUCCESS', sn: credentialsList }
          })
        ]);

        console.log(`[Manual Success] RefID: ${finalRefId} dispatched ${stocks.length} stock items.`);

        if (telegramBot) {
          await telegramBot.api.sendMessage(
            transaction.telegramId,
            `🚀 *PESANAN AKUN PREMIUM ANDA SELESAI!*\n\nPembayaran sukses. Berikut adalah data akses akun premium Anda:\n\n` +
            `📋 *Detail Pesanan:*\n` +
            `📱 Kategori: *${transaction.gameName}*\n` +
            `📦 Produk: *${transaction.productName}*\n` +
            `🛍️ Jumlah: *${transaction.quantity}* pcs\n` +
            `Target: \`${transaction.targetId}\`\n\n` +
            `🧾 *Data Akses Akun / Voucher (SN):*\n` +
            `\`${credentialsList}\`\n\n` +
            `Terima kasih telah berbelanja di *Evo Game Store*!`,
            { parse_mode: 'Markdown' }
          );
        }
      } else {
        // Out of stock!
        await prisma.transaction.update({
          where: { refId: finalRefId },
          data: { orderStatus: 'FAILED', sn: 'OUT OF STOCK' }
        });

        console.error(`[Manual Failed] RefID: ${finalRefId} failed: MANUAL product is OUT OF STOCK.`);

        if (telegramBot) {
          await telegramBot.api.sendMessage(
            transaction.telegramId,
            `❌ *Stok Akun Premium Habis!*\n\nMohon maaf, pembayaran sebesar *Rp ${transaction.amount.toLocaleString('id-ID')}* telah berhasil diterima, namun **stok untuk produk ${transaction.productName} baru saja habis** sebelum pesanan Anda diproses.\n\n` +
            `📢 *Solusi:*\n` +
            `Silakan hubungi admin kami di @CsVitopedia dengan melampirkan ID Transaksi Anda: \`${transaction.id}\` untuk pengisian saldo bot / pengiriman akun manual secara langsung!`,
            { parse_mode: 'Markdown' }
          );
        }
      }

      res.json({ status: true });
      return;
    }

    // 6. Request H2H injection from Digiflazz
    const digiflazzResult = await DigiflazzService.createOrder({
      refId: finalRefId,
      skuCode: transaction.productCode,
      customerNo: transaction.targetZone 
        ? `${transaction.targetId}${transaction.targetZone}`
        : transaction.targetId
    });

    if (digiflazzResult.success && digiflazzResult.status === 'SUCCESS') {
      // SUCCESSFUL TOP-UP
      await prisma.transaction.update({
        where: { refId: finalRefId },
        data: {
          orderStatus: 'SUCCESS',
          sn: digiflazzResult.sn || 'SUCCESS'
        }
      });

      console.log(`[Top-up Success] RefID: ${finalRefId} top-up completed. SN: ${digiflazzResult.sn}`);

      // Notify customer of final SUCCESS
      if (telegramBot) {
        await telegramBot.api.sendMessage(
          transaction.telegramId,
          `🚀 *TOP-UP SELESAI!*\n\nTop-up game Anda telah berhasil dikirim oleh server kami.\n\n📋 *Detail Transaksi:*\n🎮 Game: *${transaction.gameName}*\n📦 Produk: *${transaction.productName}*\nTarget: \`${transaction.targetId}${transaction.targetZone ? ` (${transaction.targetZone})` : ''}\`\n\n🧾 *Serial Number / Kode SN:*\n\`${digiflazzResult.sn || 'PROCESSED'}\`\n\nTerima kasih telah berbelanja di *Evo Game Store*!`,
          { parse_mode: 'Markdown' }
        );
      }
    } else if (digiflazzResult.status === 'FAILED') {
      // FAILED TOP-UP
      await prisma.transaction.update({
        where: { refId: finalRefId },
        data: {
          orderStatus: 'FAILED',
          sn: 'ORDER FAILED'
        }
      });

      console.error(`[Top-up Failed] RefID: ${finalRefId} failed. Error: ${digiflazzResult.message}`);

      // Notify customer of FAILURE and process refund to balance / contact support
      if (telegramBot) {
        await telegramBot.api.sendMessage(
          transaction.telegramId,
          `❌ *Top-up Gagal!*\n\nMohon maaf, server kami gagal menyuntikkan top-up ke akun Anda.\n\n📋 *Detail Transaksi:*\n🎮 Game: *${transaction.gameName}*\n📦 Produk: *${transaction.productName}*\nTarget: \`${transaction.targetId}${transaction.targetZone ? ` (${transaction.targetZone})` : ''}\`\n\n📢 *Solusi:*\nSilakan hubungi admin kami di @CsVitopedia atau laporkan ID Transaksi: \`${transaction.id}\` untuk pengembalian dana manual / pemrosesan ulang.`,
          { parse_mode: 'Markdown' }
        );
      }
    } else {
      // PENDING AT DIGIFLAZZ (Will process asynchronously via webhook or manual check)
      await prisma.transaction.update({
        where: { refId: finalRefId },
        data: {
          orderStatus: 'PROCESSING'
        }
      });

      console.log(`[Top-up Pending] RefID: ${finalRefId} is pending in Digiflazz queue.`);

      if (telegramBot) {
        await telegramBot.api.sendMessage(
          transaction.telegramId,
          `⏳ *Transaksi Pending di Server!*\n\nTop-up sedang diantrekan oleh server operator H2H. Kami akan segera memberi tahu Anda di sini begitu status berubah menjadi Sukses.`,
          { parse_mode: 'Markdown' }
        );
      }
    }

    res.json({ status: true });
  } catch (error: any) {
    console.error('Error processing webhook callback:', error);
    res.status(500).json({ status: false, message: 'Internal server error' });
  }
});

/**
 * Sandbox Simulation Interface (Visual HTML Payment Page)
 */
app.get('/sandbox/pay', async (req: Request, res: Response) => {
  const { refId, amount } = req.query;

  if (!refId || !amount) {
    res.send('<h2>Invalid sandbox URL parameters. Missing refId or amount.</h2>');
    return;
  }

  // Render a premium styled mock checkout screen
  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tokopay Sandbox Simulator</title>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: 'Outfit', sans-serif;
        }
        body {
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
          color: #f8fafc;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          overflow: hidden;
          padding: 20px;
        }
        .container {
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 40px;
          width: 100%;
          max-width: 480px;
          text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          animation: fadeInUp 0.6s ease-out;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .logo {
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(to right, #38bdf8, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 30px;
        }
        .invoice-card {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 30px;
          text-align: left;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .invoice-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 15px;
        }
        .invoice-row:last-child {
          margin-bottom: 0;
          padding-top: 12px;
          border-top: 1px dashed rgba(255, 255, 255, 0.1);
        }
        .label {
          color: #94a3b8;
        }
        .value {
          font-weight: 600;
        }
        .amount {
          font-size: 22px;
          color: #38bdf8;
          font-weight: 700;
        }
        .btn-pay {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          color: white;
          border: none;
          padding: 16px 28px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 14px;
          cursor: pointer;
          width: 100%;
          transition: all 0.3s ease;
          box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);
        }
        .btn-pay:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 25px -5px rgba(59, 130, 246, 0.4);
        }
        .btn-pay:active {
          transform: translateY(0);
        }
        .status-message {
          margin-top: 20px;
          font-size: 14px;
          color: #4ade80;
          display: none;
          font-weight: 500;
        }
        .loader {
          width: 24px;
          height: 24px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          display: none;
          margin: 20px auto 0 auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">TOKOPAY SIMULATOR</div>
        <h3 style="margin-bottom: 20px; font-weight: 600;">Selesaikan Pembayaran</h3>
        
        <div class="invoice-card">
          <div class="invoice-row">
            <span class="label">No. Referensi:</span>
            <span class="value" style="font-family: monospace; font-size: 14px;">${refId}</span>
          </div>
          <div class="invoice-row">
            <span class="label">Metode Pembayaran:</span>
            <span class="value">QRIS</span>
          </div>
          <div class="invoice-row">
            <span class="label">Total Bayar:</span>
            <span class="value amount">Rp ${Number(amount).toLocaleString('id-ID')}</span>
          </div>
        </div>

        <button class="btn-pay" onclick="simulatePayment()">SIMULASIKAN PEMBAYARAN SUKSES</button>
        
        <div class="loader" id="loader"></div>
        <div class="status-message" id="statusMessage">
          🎉 Pembayaran sukses! Mengirimkan callback ke bot Anda... Anda bisa menutup halaman ini dan mengecek chat Telegram bot Anda.
        </div>
      </div>

      <script>
        function simulatePayment() {
          const btn = document.querySelector('.btn-pay');
          const loader = document.getElementById('loader');
          const statusMsg = document.getElementById('statusMessage');
          
          btn.style.display = 'none';
          loader.style.display = 'block';

          // Call the trigger endpoint on the server
          fetch('/sandbox/trigger-callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refId: '${refId}', amount: ${amount} })
          })
          .then(res => res.json())
          .then(data => {
            loader.style.display = 'none';
            if(data.success) {
              statusMsg.style.display = 'block';
            } else {
              alert('Terjadi kesalahan: ' + data.message);
              btn.style.display = 'block';
            }
          })
          .catch(err => {
            loader.style.display = 'none';
            alert('Gagal menyambung ke server simulator.');
            btn.style.display = 'block';
          });
        }
      </script>
    </body>
    </html>
  `;

  res.send(html);
});

/**
 * Sandbox trigger helper to fire a webhook POST payload representing a Tokopay Callback
 */
app.post('/sandbox/trigger-callback', async (req: Request, res: Response) => {
  const { refId, amount } = req.body;

  if (!refId) {
    res.status(400).json({ success: false, message: 'refId is required' });
    return;
  }

  // Generate signature matching the sandbox verification
  const generatedSignature = TokopayService.generateSignature(refId);

  try {
    // Send simulated callback using axios directly to ourselves
    const callbackPayload = {
      merchant_id: config.tokopay.merchantId || 'MOCK_MERCHANT',
      ref_id: refId,
      nominal: amount,
      status: 'Success',
      signature: generatedSignature
    };

    console.log('[Sandbox Simulator] Injecting mock callback payload...');
    const result = await axios.post(`${config.webhookUrl}/webhooks/tokopay`, callbackPayload);

    res.json({ success: true, callbackResult: result.data });
  } catch (error: any) {
    console.error('[Sandbox Simulator] Callback failure:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// ADMIN DASHBOARD ROUTINGS & API ENDPOINTS
// ==========================================

// Serve static admin files inside src/web/public/ folder under /admin routing
app.use('/admin', express.static(path.join(process.cwd(), 'src/web/public')));

// Simple Auth Middleware
function adminAuth(req: Request, res: Response, next: any) {
  const password = req.headers['x-admin-password'] || req.query.password;
  if (password !== 'admin') {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}

/**
 * GET /api/admin/stats
 * Fetches dashboard indicators and pending transaction list
 */
app.get('/api/admin/stats', adminAuth, async (req: Request, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    
    // Revenue sum of all PAID/SUCCESS transactions
    const revenueAggr = await prisma.transaction.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { amount: true }
    });
    const totalRevenue = revenueAggr._sum.amount || 0;

    const successTransactions = await prisma.transaction.count({
      where: { orderStatus: 'SUCCESS' }
    });

    const activeProducts = await prisma.product.count({
      where: { status: true }
    });

    const pendingTransactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { orderStatus: 'PENDING' },
          { orderStatus: 'PROCESSING' }
        ]
      },
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch last 7 days of successful transactions to build historical sales chart
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSales = await prisma.transaction.findMany({
      where: {
        orderStatus: 'SUCCESS',
        createdAt: { gte: sevenDaysAgo }
      },
      select: {
        amount: true,
        createdAt: true
      }
    });

    // Populate dynamic 7 days map
    const dailyMap = new Map<string, { date: string; revenue: number; transactions: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
      dailyMap.set(dateStr, { date: dateStr, revenue: 0, transactions: 0 });
    }

    recentSales.forEach(tx => {
      const dateStr = new Date(tx.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
      if (dailyMap.has(dateStr)) {
        const current = dailyMap.get(dateStr)!;
        current.revenue += tx.amount;
        current.transactions += 1;
      }
    });

    const chartData = Array.from(dailyMap.values());

    res.json({
      success: true,
      totalUsers,
      totalRevenue,
      successTransactions,
      activeProducts,
      pendingTransactions,
      chartData
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/products
 * List all products including unsold manual stock count
 */
app.get('/api/admin/products', adminAuth, async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        _count: {
          select: {
            stockItems: { where: { isSold: false } }
          }
        }
      },
      orderBy: [
        { gameName: 'asc' },
        { price: 'asc' }
      ]
    });
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/products
 * Create new premium app package
 */
app.post('/api/admin/products', adminAuth, async (req: Request, res: Response) => {
  const { code, gameName, name, price, provider = 'H2H', description = '', wholesaleRules = '[]' } = req.body;
  if (!code || !gameName || !name || isNaN(price)) {
    return res.status(400).json({ success: false, message: 'Invalid body parameters' });
  }

  try {
    const newProduct = await prisma.product.create({
      data: { code, gameName, name, price, provider, description, wholesaleRules }
    });
    res.json({ success: true, product: newProduct });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/admin/products/:code
 * Update product price, status, description, or wholesaleRules
 */
app.put('/api/admin/products/:code', adminAuth, async (req: Request, res: Response) => {
  const { code } = req.params;
  const { gameName, name, price, provider, status, description, wholesaleRules } = req.body;

  try {
    const updateData: any = {};
    if (gameName !== undefined) updateData.gameName = gameName;
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (provider !== undefined) updateData.provider = provider;
    if (status !== undefined) updateData.status = Boolean(status);
    if (description !== undefined) updateData.description = description;
    if (wholesaleRules !== undefined) updateData.wholesaleRules = wholesaleRules;

    const updated = await prisma.product.update({
      where: { code },
      data: updateData
    });
    res.json({ success: true, product: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/admin/products/:code
 * Delete a product
 */
app.delete('/api/admin/products/:code', adminAuth, async (req: Request, res: Response) => {
  const { code } = req.params;

  try {
    await prisma.product.delete({ where: { code } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/products/:code/stock
 * Bulk add manual stock items
 */
app.post('/api/admin/products/:code/stock', adminAuth, async (req: Request, res: Response) => {
  const { code } = req.params;
  const { stockItems } = req.body; // array of credentials strings

  if (!Array.isArray(stockItems) || stockItems.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid stock items list' });
  }

  try {
    const data = stockItems.map(item => ({
      productCode: code,
      value: item,
      isSold: false
    }));

    const result = await prisma.stockItem.createMany({
      data
    });

    res.json({ success: true, count: result.count });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/products/:code/stock
 * Get list of stock items for a product (includes sold and unsold)
 */
app.get('/api/admin/products/:code/stock', adminAuth, async (req: Request, res: Response) => {
  const { code } = req.params;

  try {
    const stockItems = await prisma.stockItem.findMany({
      where: { productCode: code },
      orderBy: { createdAt: 'desc' }
    });
    res.json(stockItems);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/admin/stock/:id
 * Delete a specific stock item
 */
app.delete('/api/admin/stock/:id', adminAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.stockItem.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/users
 * List all users
 */
app.get('/api/admin/users', adminAuth, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/admin/users/:id
 * Modify user role or adjust user balance
 */
app.put('/api/admin/users/:id', adminAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role, adjustBalance } = req.body;

  try {
    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (adjustBalance !== undefined) {
      updateData.balance = { increment: parseFloat(adjustBalance) };
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    });
    res.json({ success: true, user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/transactions
 * List all transactions log
 */
app.get('/api/admin/transactions', adminAuth, async (req: Request, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// VOUCHER / PROMO ENDPOINTS
// ==========================================

/**
 * GET /api/admin/vouchers
 * List all discount codes
 */
app.get('/api/admin/vouchers', adminAuth, async (req: Request, res: Response) => {
  try {
    const vouchers = await prisma.voucher.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(vouchers);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/vouchers
 * Create a new discount code
 */
app.post('/api/admin/vouchers', adminAuth, async (req: Request, res: Response) => {
  const { code, discount, maxUse = 1 } = req.body;
  if (!code || isNaN(discount) || isNaN(maxUse)) {
    return res.status(400).json({ success: false, message: 'Invalid voucher fields' });
  }

  try {
    const newVoucher = await prisma.voucher.create({
      data: {
        code: code.trim().toUpperCase(),
        discount: parseFloat(discount),
        maxUse: parseInt(maxUse, 10),
        status: true
      }
    });
    res.json({ success: true, voucher: newVoucher });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/admin/vouchers/:code
 * Delete discount code
 */
app.delete('/api/admin/vouchers/:code', adminAuth, async (req: Request, res: Response) => {
  const { code } = req.params;

  try {
    await prisma.voucher.delete({
      where: { code: code.toUpperCase() }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// USER BLACKLIST ENDPOINTS
// ==========================================

/**
 * GET /api/admin/blacklist
 * List all banned user IDs
 */
app.get('/api/admin/blacklist', adminAuth, async (req: Request, res: Response) => {
  try {
    const banned = await prisma.blacklist.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(banned);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/blacklist
 * Ban a user ID
 */
app.post('/api/admin/blacklist', adminAuth, async (req: Request, res: Response) => {
  const { telegramId, reason } = req.body;
  if (!telegramId) {
    return res.status(400).json({ success: false, message: 'Telegram ID is required' });
  }

  try {
    const banned = await prisma.blacklist.create({
      data: {
        telegramId: String(telegramId).trim(),
        reason: reason || 'Pelanggaran ketentuan layanan'
      }
    });
    res.json({ success: true, banned });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/admin/blacklist/:id
 * Unban a user ID
 */
app.delete('/api/admin/blacklist/:id', adminAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.blacklist.delete({
      where: { telegramId: id }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// BULK TELEGRAM BROADCAST ENDPOINT
// ==========================================

/**
 * POST /api/admin/broadcast
 * Broadcast notification message to all users in MySQL database
 */
app.post('/api/admin/broadcast', adminAuth, async (req: Request, res: Response) => {
  const { message, imageUrn, mediaType = 'text' } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, message: 'Broadcast message text is required' });
  }

  if (!telegramBot) {
    return res.status(500).json({ success: false, message: 'Telegram bot interface is not ready' });
  }

  try {
    const users = await prisma.user.findMany({ select: { id: true } });
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      try {
        if (mediaType === 'photo' && imageUrn) {
          await telegramBot.api.sendPhoto(user.id, imageUrn, {
            caption: message,
            parse_mode: 'Markdown'
          });
        } else if (mediaType === 'sticker' && imageUrn) {
          await telegramBot.api.sendSticker(user.id, imageUrn);
          if (message.trim().length > 0) {
            await telegramBot.api.sendMessage(user.id, message, { parse_mode: 'Markdown' });
          }
        } else {
          await telegramBot.api.sendMessage(user.id, message, { parse_mode: 'Markdown' });
        }
        successCount++;
      } catch (err) {
        console.error(`Failed to send broadcast to ${user.id}:`, err);
        failCount++;
      }
    }

    res.json({
      success: true,
      total: users.length,
      successCount,
      failCount
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// DYNAMIC CATEGORY MANAGEMENT ENDPOINTS
// ==========================================

/**
 * GET /api/admin/categories
 * List all categories
 */
app.get('/api/admin/categories', adminAuth, async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/categories
 * Create new category
 */
app.post('/api/admin/categories', adminAuth, async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || String(name).trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Category name is required' });
  }

  try {
    const newCategory = await prisma.category.create({
      data: { name: String(name).trim().toUpperCase() }
    });
    res.json({ success: true, category: newCategory });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/admin/categories/:id
 * Delete a category
 */
app.delete('/api/admin/categories/:id', adminAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.category.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// SETTINGS / CONFIGURATION ENDPOINTS
// ==========================================

// Default settings values
const DEFAULT_SETTINGS: Record<string, string> = {
  maintenanceMode: 'false',
  maintenanceMessage: '🔧 Bot sedang dalam mode pemeliharaan. Silakan coba beberapa saat lagi.',
  storeName: 'Evo Game Store',
};

/**
 * GET /api/admin/settings
 * Returns all settings merged with defaults
 */
app.get('/api/admin/settings', adminAuth, async (req: Request, res: Response) => {
  try {
    const dbSettings = await prisma.setting.findMany();
    const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const s of dbSettings) {
      settingsMap[s.key] = s.value;
    }
    res.json(settingsMap);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/admin/settings/:key
 * Upsert a single setting by key
 */
app.put('/api/admin/settings/:key', adminAuth, async (req: Request, res: Response) => {
  const { key } = req.params;
  const { value } = req.body;

  if (value === undefined || value === null) {
    return res.status(400).json({ success: false, message: 'Value is required' });
  }

  try {
    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) }
    });
    res.json({ success: true, setting });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/settings/maintenance-status (NO AUTH - used by bot middleware)
 * Quick endpoint for bot to check maintenance status without admin auth
 */
app.get('/api/admin/settings/maintenance-status', async (req: Request, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'maintenanceMode' } });
    const message = await prisma.setting.findUnique({ where: { key: 'maintenanceMessage' } });
    res.json({
      enabled: setting?.value === 'true',
      message: message?.value || DEFAULT_SETTINGS.maintenanceMessage
    });
  } catch (error: any) {
    res.json({ enabled: false, message: '' });
  }
});

export { app as expressApp };
