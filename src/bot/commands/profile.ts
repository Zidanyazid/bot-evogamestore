import { MyContext } from '../context';
import { prisma } from '../../db/client';

export async function handleProfileCommand(ctx: MyContext) {
  const telegramId = String(ctx.from?.id);
  if (!telegramId) return;

  try {
    const user = await prisma.user.findUnique({
      where: { id: telegramId },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    });

    if (!user) {
      await ctx.reply('⚠️ Akun Anda belum terdaftar. Silakan ketik /start terlebih dahulu.');
      return;
    }

    // Get recent transactions count
    const successfulTx = await prisma.transaction.count({
      where: { telegramId, orderStatus: 'SUCCESS' }
    });

    const profileMsg = 
      `👤 *PROFIL EVOMEMBER* 👤\n\n` +
      `📌 *Nama:* *${user.name || 'Tidak ada'}*\n` +
      `🏷️ *Username:* @${user.username || '-'}\n` +
      `🆔 *Telegram ID:* \`${user.id}\`\n` +
      `🎖️ *Level Akun:* \`${user.role}\`\n\n` +
      `💰 *Saldo Utama:* *Rp ${user.balance.toLocaleString('id-ID')}*\n` +
      `📊 *Total Transaksi:* ${user._count.transactions} order (${successfulTx} sukses)\n\n` +
      `💡 _Gunakan menu deposit untuk menambah saldo agar transaksi game lebih praktis dan instan menggunakan potong saldo!_`;

    await ctx.reply(profileMsg, {
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('Error handling profile command:', error);
    await ctx.reply('⚠️ Gagal mengambil informasi profil Anda.');
  }
}

export async function handleHistoryCommand(ctx: MyContext) {
  const telegramId = String(ctx.from?.id);
  if (!telegramId) return;

  try {
    const txList = await prisma.transaction.findMany({
      where: { telegramId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    if (txList.length === 0) {
      await ctx.reply('🧾 *Riwayat Transaksi:*\n\nAnda belum memiliki riwayat transaksi di Evo Game Store.', { parse_mode: 'Markdown' });
      return;
    }

    let historyMsg = `🧾 *5 Transaksi Terakhir Anda:*\n\n`;
    for (const tx of txList) {
      const statusIcon = tx.orderStatus === 'SUCCESS' ? '✅' : tx.orderStatus === 'FAILED' ? '❌' : '⏳';
      historyMsg += 
        `-----------------------------------------\n` +
        `${statusIcon} *${tx.gameName} - ${tx.productName}*\n` +
        `Target: \`${tx.targetId}${tx.targetZone ? ` (${tx.targetZone})` : ''}\`\n` +
        `Harga: *Rp ${tx.amount.toLocaleString('id-ID')}*\n` +
        `Ref ID: \`${tx.refId}\`\n` +
        `Status Order: *${tx.orderStatus}* | Bayar: *${tx.paymentStatus}*\n`;
    }

    await ctx.reply(historyMsg, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error handling history command:', error);
    await ctx.reply('⚠️ Gagal mengambil riwayat transaksi Anda.');
  }
}
