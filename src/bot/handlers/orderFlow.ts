import { MyContext, MyConversation } from '../context';
import { prisma } from '../../db/client';
import { TripayService } from '../../services/tripay';
import { DigiflazzService } from '../../services/digiflazz';
import { InlineKeyboard, InputFile } from 'grammy';
import path from 'path';

// Predefined mock products for 14 premium apps
export const defaultProducts = [
  // 1. Alight Motion
  { code: 'am_1m', gameName: 'ALIGHT MOTION', name: 'Alight Motion Pro 1 Bulan 🎬', price: 15000 },
  // 2. Canva
  { code: 'canva_1m', gameName: 'CANVA', name: 'Canva Pro 1 Bulan 🎨', price: 5000 },
  { code: 'canva_1y', gameName: 'CANVA', name: 'Canva Pro 1 Tahun 🎨', price: 25000 },
  // 3. CapCut
  { code: 'capcut_1m', gameName: 'CAPCUT', name: 'CapCut Pro 1 Bulan 📹', price: 12000 },
  // 4. CapCut Head
  { code: 'capcut_head', gameName: 'CAPCUT HEAD', name: 'CapCut Head Admin 👑', price: 45000 },
  // 5. CapCut Kosongan
  { code: 'capcut_empty', gameName: 'CAPCUT KOSONGAN', name: 'CapCut Akun Kosongan 📄', price: 3000 },
  // 6. ChatGPT
  { code: 'chatgpt_plus', gameName: 'CHATGPT', name: 'ChatGPT Plus 1 Bulan (Shared) 🤖', price: 35000 },
  // 7. Gemini
  { code: 'gemini_advanced', gameName: 'GEMINI', name: 'Gemini Advanced 1 Bulan ☄️', price: 40000 },
  // 8. Grok AI
  { code: 'grok_pro', gameName: 'GROK AI', name: 'Grok AI Premium 1 Bulan 🧠', price: 38000 },
  // 9. GSuite
  { code: 'gsuite_1m', gameName: 'GSUITE', name: 'GSuite Business 1 Bulan 💼', price: 50000 },
  // 10. Link
  { code: 'link_custom', gameName: 'LINK', name: 'Custom Link Premium 🔗', price: 10000 },
  // 11. Prime Video
  { code: 'prime_1m', gameName: 'PRIME VIDEO', name: 'Amazon Prime Video 1 Bulan 🍿', price: 8000 },
  // 12. Vidio
  { code: 'vidio_platinum', gameName: 'VIDIO', name: 'Vidio Platinum 1 Bulan 📺', price: 25000 },
  // 13. Viu
  { code: 'viu_premium', gameName: 'VIU', name: 'Viu Premium 1 Bulan 🎬', price: 7000 },
  // 14. YouTube
  { code: 'yt_1m', gameName: 'YOUTUBE', name: 'YouTube Premium 1 Bulan 🔴', price: 9000 },
  { code: 'yt_3m', gameName: 'YOUTUBE', name: 'YouTube Premium 3 Bulan 🔴', price: 24000 }
];

export const categories = [
  'ALIGHT MOTION',
  'CANVA',
  'CAPCUT',
  'CAPCUT HEAD',
  'CAPCUT KOSONGAN',
  'CHATGPT',
  'GEMINI',
  'GROK AI',
  'GSUITE',
  'LINK',
  'PRIME VIDEO',
  'VIDIO',
  'VIU',
  'YOUTUBE'
];

/**
 * Returns dynamic Indonesian greeting based on current server hour
 */
export function getTimeOfDayGreeting(): string {
  const hours = new Date().getHours();
  if (hours >= 5 && hours < 11) return 'Pagi';
  if (hours >= 11 && hours < 15) return 'Siang';
  if (hours >= 15 && hours < 18) return 'Sore';
  return 'Malam';
}

/**
 * Clears old game products and seeds new premium application products if needed
 */
export async function seedProductsIfNeeded() {
  // 1. Check and wipe old gaming categories if they exist
  const hasOldGames = await prisma.product.findFirst({
    where: { OR: [{ gameName: 'Mobile Legends' }, { gameName: 'Free Fire' }] }
  });

  if (hasOldGames) {
    console.log('[Database] Migrating old gaming categories to premium apps...');
    await prisma.product.deleteMany({});
  }

  // 2. Seed default products if empty
  const count = await prisma.product.count();
  if (count === 0) {
    console.log('[Database] Seeding premium app products...');
    for (const prod of defaultProducts) {
      await prisma.product.create({ data: prod });
    }
  }
}

export async function seedCategoriesIfNeeded() {
  // Category table is no longer used, categories are loaded dynamically from active products.
  console.log('[Database] Dynamic categories system active.');
}

/**
 * Generates the premium categories list caption dynamically from DB
 */
export async function getCategoryListCaption(firstName: string): Promise<string> {
  const greeting = getTimeOfDayGreeting();
  
  // Get active products unique gameNames dynamically
  const activeProducts = await prisma.product.findMany({
    where: { status: true },
    select: { gameName: true },
    distinct: ['gameName'],
    orderBy: { gameName: 'asc' }
  });

  let lines = '';
  activeProducts.forEach((prod, index) => {
    lines += ` ┊ *[${index + 1}] ${prod.gameName.toUpperCase()}*\n`;
  });

  return (
    `Selamat ${greeting}, ${firstName} 👋\n\n` +
    `Berikut adalah daftar kategori produk yang tersedia:\n` +
    `╭ - - - - - - - - - - - - - - - - - ╮\n` +
    lines +
    `╰ - - - - - - - - - - - - - - - - - ╯`
  );
}

/**
 * Conversation handler for ordering a premium app package (ID/Email input & checkout)
 */
export async function buyAppConversation(conversation: MyConversation, ctx: MyContext) {
  const productCode = conversation.session.orderState.productCode;
  const qty = conversation.session.orderState.qty || 1;
  const methodChoice = conversation.session.orderState.paymentMethod || 'SALDO'; // 'SALDO' or 'QRIS'

  if (!productCode) return;

  const product = await conversation.external(() => 
    prisma.product.findUnique({ where: { code: productCode } })
  );

  if (!product) {
    await ctx.reply('⚠️ Produk tidak ditemukan atau sudah tidak aktif.');
    return;
  }

  const telegramId = String(ctx.from?.id);
  const username = ctx.from?.username;
  const targetId = username ? `@${username}` : telegramId;

  // Fetch user balance
  const user = await conversation.external(() => 
    prisma.user.findUnique({ where: { id: telegramId } })
  );

  if (!user) return;

  const refId = `EVO-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const unitPrice = calculateUnitPrice(product, qty);
  const totalAmount = unitPrice * qty;

  if (methodChoice === 'SALDO') {
    // Pay via balance
    if (user.balance < totalAmount) {
      await ctx.reply(`❌ *Saldo Anda tidak mencukupi!*\n\nTotal belanja: *Rp ${totalAmount.toLocaleString('id-ID')}*\nSaldo Anda: *Rp ${user.balance.toLocaleString('id-ID')}*\n\nSilakan isi saldo menggunakan menu /deposit.`);
      return;
    }

    await ctx.reply('⏳ _Memproses pemotongan saldo dan pendaftaran produk premium Anda..._');

    // MANUAL Stock Processing Flow
    if (product.provider === 'MANUAL') {
      try {
        const stocks = await conversation.external(() => 
          prisma.stockItem.findMany({
            where: { productCode: product.code, isSold: false },
            orderBy: { createdAt: 'asc' },
            take: qty
          })
        );

        if (stocks.length < qty) {
          await ctx.reply(`❌ *Stok Akun Premium Tidak Mencukupi!*\n\nMohon maaf, produk *${product.name}* saat ini hanya tersedia *${stocks.length}* pcs, sedangkan Anda ingin membeli *${qty}* pcs. Saldo Anda tidak dikurangi.`);
          return;
        }

        const stockIds = stocks.map(s => s.id);
        const credentialsList = stocks.map(s => s.value).join('\n');

        await conversation.external(() => prisma.$transaction(async (tx) => {
          // Verify stock isn't sold concurrently
          const stockChecks = await tx.stockItem.count({
            where: { id: { in: stockIds }, isSold: false }
          });
          if (stockChecks !== qty) {
            throw new Error('STOCK_ITEM_CONCURRENT_SOLD');
          }

          // Decrement user balance
          await tx.user.update({
            where: { id: telegramId },
            data: { balance: { decrement: totalAmount } }
          });

          // Create transaction log (Paid & Success)
          const newTx = await tx.transaction.create({
            data: {
              refId,
              telegramId,
              productCode: product.code,
              productName: product.name,
              gameName: product.gameName,
              targetId,
              quantity: qty,
              amount: totalAmount,
              paymentMethod: 'SALDO',
              paymentStatus: 'PAID',
              orderStatus: 'SUCCESS',
              sn: credentialsList
            }
          });

          // Mark stock items as sold
          await tx.stockItem.updateMany({
            where: { id: { in: stockIds } },
            data: { isSold: true, transactionId: newTx.id }
          });
        }));

        await ctx.reply(
          `🚀 *PESANAN AKUN PREMIUM ANDA SELESAI!* 🚀\n\n` +
          `Pembelian sukses menggunakan saldo bot.\n\n` +
          `📋 *Detail Pesanan:*\n` +
          `📱 Kategori: *${product.gameName}*\n` +
          `📦 Produk: *${product.name}*\n` +
          `🛍️ Jumlah: *${qty}* pcs\n` +
          `Target: \`${targetId}\`\n\n` +
          `🧾 *Data Akses Akun / Voucher (SN):*\n` +
          `\`${credentialsList}\`\n\n` +
          `💰 Sisa saldo Anda: *Rp ${(user.balance - totalAmount).toLocaleString('id-ID')}*\n\n` +
          `Terima kasih telah berbelanja di *Evo Game Store*!`,
          { parse_mode: 'Markdown' }
        );
        return;
      } catch (err: any) {
        if (err.message === 'STOCK_ITEM_CONCURRENT_SOLD') {
          await ctx.reply(`❌ *Stok Akun Premium Habis!*\n\nMohon maaf, produk *${product.name}* baru saja kehabisan stok beberapa saat yang lalu karena dibeli pelanggan lain. Saldo Anda tidak dikurangi.`);
        } else {
          console.error('Manual balance checkout error:', err);
          await ctx.reply('⚠️ Terjadi kesalahan internal saat memproses pembelian saldo produk manual.');
        }
        return;
      }
    }

    // Default H2H Digiflazz Flow
    try {
      await conversation.external(() => prisma.$transaction([
        prisma.user.update({
          where: { id: telegramId },
          data: { balance: { decrement: totalAmount } }
        }),
        prisma.transaction.create({
          data: {
            refId,
            telegramId,
            productCode: product.code,
            productName: product.name,
            gameName: product.gameName,
            targetId,
            quantity: qty,
            amount: totalAmount,
            paymentMethod: 'SALDO',
            paymentStatus: 'PAID',
            orderStatus: 'PROCESSING'
          }
        })
      ]));

      // Submit to H2H qty times (or split by index)
      let allSuccess = true;
      let failedCalls = 0;
      let snList: string[] = [];

      for (let i = 0; i < qty; i++) {
        const itemRef = qty > 1 ? `${refId}-${i+1}` : refId;
        const topupRes = await conversation.external(() => 
          DigiflazzService.createOrder({
            refId: itemRef,
            skuCode: product.code,
            customerNo: targetId
          })
        );

        if (topupRes.success && topupRes.status === 'SUCCESS') {
          snList.push(topupRes.sn || 'SUCCESS');
        } else if (topupRes.status === 'FAILED') {
          allSuccess = false;
          failedCalls++;
        } else {
          snList.push('PENDING/QUEUE');
        }
      }

      if (allSuccess && failedCalls === 0) {
        const combinedSn = snList.join('\n');
        await conversation.external(() => prisma.transaction.update({
          where: { refId },
          data: { orderStatus: 'SUCCESS', sn: combinedSn }
        }));

        await ctx.reply(
          `🚀 *PESANAN SELESAI!* 🚀\n\n` +
          `Pembelian produk premium berhasil dikirim.\n\n` +
          `📋 *Detail Pesanan:*\n` +
          `📱 Kategori: *${product.gameName}*\n` +
          `📦 Produk: *${product.name}*\n` +
          `🛍️ Jumlah: *${qty}* pcs\n` +
          `Target: \`${targetId}\`\n\n` +
          `🧾 *Serial Number / Akses Target:*\n\`${combinedSn}\`\n\n` +
          `💰 Sisa saldo Anda: *Rp ${(user.balance - totalAmount).toLocaleString('id-ID')}*`,
          { parse_mode: 'Markdown' }
        );
      } else if (failedCalls > 0) {
        // Partial or full refund
        const refundAmount = failedCalls * unitPrice;
        await conversation.external(() => prisma.$transaction([
          prisma.user.update({
            where: { id: telegramId },
            data: { balance: { increment: refundAmount } }
          }),
          prisma.transaction.update({
            where: { refId },
            data: { orderStatus: failedCalls === qty ? 'FAILED' : 'SUCCESS', sn: `FAILED: ${failedCalls} items. Success: ${qty - failedCalls} items.` }
          })
        ]));

        await ctx.reply(`⚠️ *Proses Selesai Sebagian!*\n\nSebanyak *${failedCalls}* dari *${qty}* item gagal diisi oleh server H2H. Dana sebesar *Rp ${refundAmount.toLocaleString('id-ID')}* telah dikembalikan otomatis ke saldo Anda.\n\nSisa item sukses: *${qty - failedCalls}* pcs.`);
      } else {
        await ctx.reply(`⏳ *Pesanan Berhasil Antre!* Transaksi saat ini pending di server operator H2H. Kami akan segera memberi tahu Anda begitu produk Anda sukses diaktifkan!`);
      }
    } catch (err) {
      console.error('Balance checkout error:', err);
      await ctx.reply('⚠️ Terjadi kesalahan internal saat memproses pembelian saldo.');
    }

  } else {
    // Pay via QRIS
    const fee = Math.ceil(totalAmount * 0.017); // 1.7% QRISREALTIME fee
    const grossAmount = totalAmount + fee;

    await ctx.reply('⏳ _Sedang membuat invoice QRIS otomatis..._');

    const tripayRes = await TripayService.createOrder({
      refId,
      productName: product.name,
      customerName: ctx.from?.first_name || 'Pelanggan',
      amount: grossAmount,
      paymentMethod: 'QRIS'
    });

    if (!tripayRes.success || !tripayRes.paymentLink) {
      await ctx.reply(`❌ *Gagal membuat invoice QRIS:* \`${tripayRes.errorMessage || 'Server sibuk'}\``);
      return;
    }

    try {
      await prisma.transaction.create({
        data: {
          refId,
          telegramId,
          productCode: product.code,
          productName: product.name,
          gameName: product.gameName,
          targetId,
          quantity: qty,
          amount: grossAmount,
          paymentMethod: 'QRIS',
          paymentStatus: 'UNPAID',
          orderStatus: 'PENDING',
          paymentLink: tripayRes.paymentLink,
          paymentQr: tripayRes.paymentQr || null
        }
      });

      let qrisMsg = 
        `📋 *INVOICE PEMBAYARAN QRIS* 📋\n\n` +
        `🧾 *No. Referensi:* \`${refId}\`\n` +
        `📱 Produk: *${product.name}*\n` +
        `🛍️ Jumlah: *${qty}* pcs\n` +
        `📧 Target: \`${targetId}\`\n` +
        `💵 Harga Produk: *Rp ${totalAmount.toLocaleString('id-ID')}*\n` +
        `🔌 Biaya Layanan (QRIS 1.7%): *Rp ${fee.toLocaleString('id-ID')}*\n` +
        `💰 *Total Bayar: Rp ${grossAmount.toLocaleString('id-ID')}*\n\n` +
        `📱 *Cara Pembayaran:*\n` +
        `1. Klik link pembayaran atau scan QRIS di bawah.\n` +
        `2. Setelah bayar sukses, produk premium akan *otomatis diproses* oleh bot dan dikirim ke Anda!\n\n` +
        `🔗 *Tautan Bayar:* [Klik di Sini untuk Membayar](${tripayRes.paymentLink})`;

      if (tripayRes.paymentQr && tripayRes.paymentQr.startsWith('http')) {
        await ctx.replyWithPhoto(tripayRes.paymentQr, {
          caption: qrisMsg,
          parse_mode: 'Markdown'
        });
      } else {
        await ctx.reply(qrisMsg, {
          parse_mode: 'Markdown',
          link_preview_options: { is_disabled: true }
        });
      }
    } catch (err) {
      console.error('Invoice registration error:', err);
      await ctx.reply('⚠️ Terjadi kesalahan internal saat menyimpan transaksi.');
    }
  }
}

/**
 * Calculates unit price based on wholesale pricing rules
 */
export function calculateUnitPrice(product: { price: number; wholesaleRules?: string | null }, qty: number): number {
  if (!product.wholesaleRules) return product.price;
  try {
    const rules = JSON.parse(product.wholesaleRules);
    if (!Array.isArray(rules) || rules.length === 0) return product.price;
    
    // Sort rules by minQty descending so we match the highest threshold first
    const sortedRules = [...rules].sort((a, b) => b.minQty - a.minQty);
    for (const rule of sortedRules) {
      if (qty >= rule.minQty) {
        return rule.price;
      }
    }
  } catch (err) {
    console.error('Failed to parse wholesaleRules:', err);
  }
  return product.price;
}

/**
 * Renders the beautiful dynamic checkout summary matching screenshot
 */
export async function renderInteractiveCheckoutCaption(product: any, qty: number): Promise<string> {
  const isManual = product.provider === 'MANUAL';
  let availableStock = 0;
  let soldStock = 0;
  
  if (isManual) {
    availableStock = await prisma.stockItem.count({
      where: { productCode: product.code, isSold: false }
    });
    soldStock = await prisma.stockItem.count({
      where: { productCode: product.code, isSold: true }
    });
  } else {
    // Count successful transactions as sold
    soldStock = await prisma.transaction.count({
      where: { productCode: product.code, orderStatus: 'SUCCESS' }
    });
  }

  // Format description lines cleanly
  const rawDesc = product.description ? product.description.trim() : '-';
  const descLines = rawDesc.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
  const formattedDesc = descLines.join('\n');

  let wholesaleText = '';
  if (product.wholesaleRules) {
    try {
      const rules = JSON.parse(product.wholesaleRules);
      if (Array.isArray(rules) && rules.length > 0) {
        const sortedDisplay = [...rules].sort((a, b) => a.minQty - b.minQty);
        wholesaleText += `──────────────────────────\n`;
        wholesaleText += `🏷️ *HARGA GROSIR*\n`;
        sortedDisplay.forEach(rule => {
          wholesaleText += ` 🏷️ Min *${rule.minQty}* Pcs : *Rp ${rule.price.toLocaleString('id-ID')}*\n`;
        });
      }
    } catch (err) {}
  }

  const unitPrice = calculateUnitPrice(product, qty);
  const totalPrice = unitPrice * qty;
  
  // Format current date in Indonesian format
  const timeStr = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jakarta'
  });

  const summary = 
    `🛍️ *FORM DETAIL CHECKOUT PRODUK* 🛍️\n` +
    `──────────────────────────\n` +
    `📦 *Produk :* *${product.name.toUpperCase()}*\n` +
    `🔑 *Kode SKU :* \`${product.code}\`\n` +
    `⚡ *Sisa Stok :* *${isManual ? availableStock + ' Pcs' : 'Tersedia (H2H)'}*\n` +
    `📈 *Terjual :* *${soldStock} Pcs*\n` +
    `📊 *Total Stok :* *${isManual ? (availableStock + soldStock) + ' Pcs' : 'Tersedia'}*\n\n` +
    `📝 *Deskripsi :*\n${formattedDesc}\n` +
    `──────────────────────────\n` +
    `🔢 *Jumlah Beli :* *${qty} Pcs*\n` +
    `💵 *Harga Satuan :* *Rp ${unitPrice.toLocaleString('id-ID')}*\n` +
    `💰 *Total Bayar :* *Rp ${totalPrice.toLocaleString('id-ID')}*\n` +
    `──────────────────────────\n` +
    wholesaleText +
    `🕒 *Diperbarui pada: ${timeStr} WIB*`;

  return summary;
}

/**
 * Renders inline keyboard with interactive plus, minus, refresh, input and buy options
 */
export function renderInteractiveCheckoutKeyboard(productCode: string) {
  return new InlineKeyboard()
    .text('➖', 'qty_dec')
    .text('📝 Qty', 'qty_input')
    .text('🔄 Refresh', 'qty_refresh')
    .text('➕', 'qty_inc')
    .row()
    .text('💳 Buy ( Saldo )', 'qty_buy:saldo')
    .text('📱 Buy ( Now )', 'qty_buy:qris')
    .row()
    .text('❌ Batal', 'menu:list_produk');
}

/**
 * Conversation asking the user to write quantity manually
 */
export async function qtyInputConversation(conversation: MyConversation, ctx: MyContext) {
  await ctx.reply('📝 *Ketik jumlah pembelian yang Anda inginkan (Angka saja):*', { parse_mode: 'Markdown' });
  
  const responseCtx = await conversation.waitFor(':text');
  const text = responseCtx.message?.text || '';
  const qtyVal = parseInt(text, 10);
  
  if (isNaN(qtyVal) || qtyVal <= 0) {
    await ctx.reply('⚠️ Jumlah pembelian tidak valid! Pembelian diatur ke 1 pcs.');
    conversation.session.orderState.qty = 1;
  } else {
    conversation.session.orderState.qty = qtyVal;
  }
  
  const productCode = conversation.session.orderState.productCode!;
  const product = await conversation.external(() => 
    prisma.product.findUnique({ where: { code: productCode } })
  );
  if (product) {
    const caption = await renderInteractiveCheckoutCaption(product, conversation.session.orderState.qty);
    const keyboard = renderInteractiveCheckoutKeyboard(productCode);
    const bannerPath = path.join(process.cwd(), 'src/assets/banner.png');
    await ctx.replyWithPhoto(new InputFile(bannerPath), {
      caption,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
}

// Stub conversation for matching previous typings
export async function orderConversation(conversation: MyConversation, ctx: MyContext) {
  // Legacy conversation, we now handle category inline, so this simply prompts them to click inline
  await ctx.reply('🎮 Silakan gunakan tombol inline di atas untuk memilih produk premium yang Anda inginkan!');
}
