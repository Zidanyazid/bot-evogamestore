import { MyContext, MyConversation } from '../context';
import { prisma } from '../../db/client';
import { TokopayService } from '../../services/tokopay';

/**
 * Conversation handler for interactive balance deposits
 */
export async function depositConversation(conversation: MyConversation, ctx: MyContext) {
  await ctx.reply('💳 *DEPOSIT SALDO EVO GAME STORE*\n\nMasukkan nominal deposit yang Anda inginkan:\n_(Contoh: 25000, minimal Rp 10.000)_', {
    parse_mode: 'Markdown'
  });

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

    if (isNaN(amount) || amount < 10000) {
      await ctx.reply('⚠️ Nominal deposit tidak valid! Minimal deposit adalah *Rp 10.000*. Silakan ketik nominal yang benar atau ketik "batal" untuk membatalkan.', {
        parse_mode: 'Markdown'
      });
    } else {
      isValid = true;
    }
  }

  // User input is valid. Let's register a unique transaction Ref ID
  const refId = `DEP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const telegramId = String(ctx.from?.id);

  const fee = Math.ceil(amount * 0.017); // 1.7% QRISREALTIME fee
  const grossAmount = amount + fee;

  await ctx.reply('⏳ _Sedang membuat invoice QRIS otomatis..._');

  // Let's call the Tokopay service to generate invoice
  const tokopayRes = await TokopayService.createOrder({
    refId,
    amount: grossAmount,
    paymentChannel: 'QRISREALTIME'
  });

  if (!tokopayRes.success || !tokopayRes.paymentLink) {
    await ctx.reply(`❌ *Gagal membuat invoice deposit:*\n\`${tokopayRes.errorMessage || 'Server sibuk'}\`\n\nSilakan coba beberapa saat lagi atau hubungi admin.`, {
      parse_mode: 'Markdown'
    });
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
        paymentLink: tokopayRes.paymentLink,
        paymentQr: tokopayRes.paymentQr || null
      }
    });

    let paymentMsg = 
      `📝 *INVOICE DEPOSIT SALDO* 📝\n\n` +
      `🧾 *No. Referensi:* \`${refId}\`\n` +
      `💰 *Jumlah Deposit:* *Rp ${amount.toLocaleString('id-ID')}*\n` +
      `🔌 *Biaya Layanan (QRIS 1.7%):* *Rp ${fee.toLocaleString('id-ID')}*\n` +
      `💳 *Total Bayar:* *Rp ${grossAmount.toLocaleString('id-ID')}*\n\n` +
      `📱 *Cara Pembayaran:*\n` +
      `1. Klik tautan pembayaran di bawah untuk melihat QRIS.\n` +
      `2. Scan QRIS menggunakan DANA, OVO, GoPay, LinkAja, ShopeePay, atau Mobile Banking Anda.\n` +
      `3. Setelah pembayaran sukses dilakukan, saldo Anda akan *otomatis bertambah* secara real-time!\n\n` +
      `🔗 *Tautan Bayar:* [Klik di Sini untuk Membayar](${tokopayRes.paymentLink})`;

    // If QR code is present as a link/image, let's send it
    if (tokopayRes.paymentQr && tokopayRes.paymentQr.startsWith('http')) {
      await ctx.replyWithPhoto(tokopayRes.paymentQr, {
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
