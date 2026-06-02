import { MyContext, MyConversation } from '../context';
import { prisma } from '../../db/client';
import { TripayService } from '../../services/tripay';

/**
 * QRIS2 DIRECT fee calculation:
 * - Min Amount: Rp 1.000
 * - Max Amount: Rp 5.000.000
 * - Fee: Rp 750 + 0.7%
 * - Min Expired: 10 menit
 * - Max Expired: 1.440 menit
 */
function calculateQRISFee(amount: number): { fee: number; grossAmount: number } {
  const fee = 750 + Math.ceil(amount * 0.007); // Rp 750 flat + 0.7%
  return { fee, grossAmount: amount + fee };
}

/**
 * Conversation handler for interactive balance deposits
 */
export async function depositConversation(conversation: MyConversation, ctx: MyContext) {
  await ctx.reply(
    '💳 *DEPOSIT SALDO EVO GAME STORE*\n\n' +
    'Masukkan nominal deposit yang Anda inginkan:\n' +
    '_(Minimal Rp 1.000, Maks Rp 5.000.000)_\n\n' +
    '💡 *Info Biaya QRIS DIRECT:*\n' +
    '• Fee: Rp 750 + 0.7% per transaksi\n' +
    `• Contoh deposit Rp 50.000 = fee Rp ${(750 + Math.ceil(50000 * 0.007)).toLocaleString('id-ID')}`,
    { parse_mode: 'Markdown' }
  );

  let amountStr = '';
  let isValid = false;
  let amount = 0;

  while (!isValid) {
    const inputCtx = await conversation.wait();
    
    // Allow cancellation
    if (inputCtx.message?.text === '/cancel' || inputCtx.message?.text?.toLowerCase() === 'batal') {
      await ctx.reply('❌ Deposit dibatalkan. Kembali ke menu utama.');
      return;
    }

    amountStr = inputCtx.message?.text || '';
    amount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10);

    if (isNaN(amount) || amount < 1000) {
      await ctx.reply(
        '⚠️ Nominal deposit tidak valid! Minimal deposit adalah *Rp 1.000*. ' +
        'Silakan ketik nominal yang benar atau ketik "batal" untuk membatalkan.',
        { parse_mode: 'Markdown' }
      );
    } else if (amount > 5000000) {
      await ctx.reply(
        '⚠️ Nominal deposit melebihi batas maksimal *Rp 5.000.000*. ' +
        'Silakan ketik nominal yang lebih kecil atau ketik "batal".',
        { parse_mode: 'Markdown' }
      );
    } else {
      isValid = true;
    }
  }

  // User input is valid. Let's register a unique transaction Ref ID
  const refId = `DEP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const telegramId = String(ctx.from?.id);

  const { fee, grossAmount } = calculateQRISFee(amount);

  await ctx.reply('⏳ _Sedang membuat invoice QRIS otomatis..._');

  // Let's call the Tripay service to generate invoice
  const tripayRes = await TripayService.createOrder({
    refId,
    amount: grossAmount,
    paymentMethod: 'QRIS'
  });

  if (!tripayRes.success || !tripayRes.paymentLink) {
    await ctx.reply(
      `❌ *Gagal membuat invoice deposit:* \n\`${tripayRes.errorMessage || 'Server sibuk'}\`\n\nSilakan coba beberapa saat lagi atau hubungi admin.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  try {
    // Save transaction in database with special SKU "DEPOSIT"
    await prisma.transaction.create({
      data: {
        refId,
        telegramId,
        productCode: 'DEPOSIT',
        productName: `Deposit Saldo Rp ${amount.toLocaleString('id-ID')}`,
        gameName: 'SALDO',
        targetId: telegramId,
        amount: grossAmount,
        paymentMethod: 'QRIS',
        paymentStatus: 'UNPAID',
        orderStatus: 'PENDING',
        paymentLink: tripayRes.paymentLink,
        paymentQr: tripayRes.paymentQr || null
      }
    });

    let paymentMsg = 
      `📝 *INVOICE DEPOSIT SALDO* 📝\n\n` +
      `🧾 *No. Referensi:* \`${refId}\`\n` +
      `💳 *Metode:* QRIS DIRECT\n` +
      `💰 *Jumlah Deposit:* *Rp ${amount.toLocaleString('id-ID')}*\n` +
      `🔌 *Biaya Layanan:* *Rp ${fee.toLocaleString('id-ID')}* (Rp 750 + 0.7%)\n` +
      `💵 *Total Bayar:* *Rp ${grossAmount.toLocaleString('id-ID')}*\n\n` +
      `📱 *Cara Pembayaran:*\n` +
      `1. Klik tautan pembayaran di bawah untuk melihat QRIS.\n` +
      `2. Scan QRIS menggunakan DANA, OVO, GoPay, LinkAja, ShopeePay, atau Mobile Banking Anda.\n` +
      `3. Setelah pembayaran sukses, saldo Anda akan *otomatis bertambah* secara real-time!\n\n` +
      `🔗 *Tautan Bayar:* [Klik di Sini untuk Membayar](${tripayRes.paymentLink})`;

    // If QR code is present as a link/image, let's send it
    if (tripayRes.paymentQr && tripayRes.paymentQr.startsWith('http')) {
      await ctx.replyWithPhoto(tripayRes.paymentQr, {
        caption: paymentMsg,
        parse_mode: 'Markdown'
      });
    } else {
      await ctx.reply(paymentMsg, {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true }
      });
    }
  } catch (error) {
    console.error('Error registering deposit transaction:', error);
    await ctx.reply('⚠️ Terjadi kesalahan sistem saat menyimpan invoice deposit Anda.');
  }
}
