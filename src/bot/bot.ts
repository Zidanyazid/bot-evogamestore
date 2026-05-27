import { Bot, session } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { MyContext, SessionData } from './context';
import { config } from '../config/env';
import { prisma } from '../db/client';
import { 
  handleStartCommand, 
  handleMainMenuCallback, 
  handleMenuLainCallback,
  handleListProdukCallback,
  handleCategorySelectCallback
} from './commands/start';
import { handleProfileCommand, handleHistoryCommand } from './commands/profile';
import { depositConversation } from './commands/deposit';
import { 
  orderConversation, 
  buyAppConversation, 
  qtyInputConversation,
  renderInteractiveCheckoutCaption,
  renderInteractiveCheckoutKeyboard,
  calculateUnitPrice
} from './handlers/orderFlow';

/**
 * Generates a dynamic stock status message from the live MySQL database.
 * Groups products by category, counts unsold StockItem for MANUAL products,
 * and color-codes: 🟢 >10, 🟡 1-10, 🔴 0 (Habis)
 */
async function getDynamicStockMessage(): Promise<string> {
  try {
    const products = await prisma.product.findMany({
      where: { status: true },
      include: {
        _count: {
          select: { stockItems: { where: { isSold: false } } }
        }
      },
      orderBy: [{ gameName: 'asc' }, { price: 'asc' }]
    });

    // Group products by gameName (dynamic category)
    const grouped = new Map<string, typeof products>();
    for (const p of products) {
      if (!grouped.has(p.gameName)) {
        grouped.set(p.gameName, []);
      }
      grouped.get(p.gameName)!.push(p);
    }

    if (grouped.size === 0) {
      return `📦 *STATUS STOK PRODUK* 📦\n\n⚠️ _Belum ada produk aktif di database._`;
    }

    let msg = `📦 *STATUS STOK PRODUK* 📦\n\n`;

    for (const [categoryName, catProducts] of grouped) {
      msg += `┌ *${categoryName}*\n`;

      for (const prod of catProducts) {
        const isManual = prod.provider === 'MANUAL';

        if (isManual) {
          const available = prod._count?.stockItems || 0;
          let icon: string;
          let statusLabel: string;

          if (available === 0) {
            icon = '🔴';
            statusLabel = 'HABIS';
          } else if (available <= 10) {
            icon = '🟡';
            statusLabel = `Sisa ${available} pcs`;
          } else {
            icon = '🟢';
            statusLabel = `Stok ${available} pcs`;
          }

          msg += `│  ${icon} ${prod.name} : *${statusLabel}*\n`;
        } else {
          // H2H product — always available from supplier
          msg += `│  🟢 ${prod.name} : *Server H2H* ⚡\n`;
        }
      }

      msg += `└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─\n\n`;
    }

    const timeStr = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    msg += `🕐 _Diperbarui: ${timeStr}_\n`;
    msg += `⚡ _Server H2H otomatis 24 jam non-stop!_`;

    return msg;
  } catch (err) {
    console.error('Error generating dynamic stock message:', err);
    return `📦 *STATUS STOK PRODUK* 📦\n\n⚠️ _Gagal mengambil data stok dari server. Silakan coba lagi._`;
  }
}
// Initialize the Telegram Bot
const bot = new Bot<MyContext>(config.telegramBotToken);

// Setup default session structure
function initial(): SessionData {
  return {
    orderState: {}
  };
}

// 1. Register Session Middleware
bot.use(
  session({
    initial,
    getSessionKey: (ctx) => ctx.from?.id.toString()
  })
);

// 2. Register Conversation Middleware
bot.use(conversations());

// 3. Register Conversations
bot.use(createConversation(depositConversation));
bot.use(createConversation(orderConversation));
bot.use(createConversation(buyAppConversation));
bot.use(createConversation(qtyInputConversation));
// 3.5. Register Maintenance Mode Middleware (runs before blacklist)
bot.use(async (ctx, next) => {
  try {
    const maintenanceSetting = await prisma.setting.findUnique({ where: { key: 'maintenanceMode' } });
    if (maintenanceSetting?.value === 'true') {
      // Allow admin users to bypass maintenance mode
      const telegramId = String(ctx.from?.id);
      const user = await prisma.user.findUnique({ where: { id: telegramId } });
      if (user?.role === 'ADMIN') {
        await next();
        return;
      }

      const msgSetting = await prisma.setting.findUnique({ where: { key: 'maintenanceMessage' } });
      const maintenanceMsg = msgSetting?.value || '🔧 Bot sedang dalam mode pemeliharaan. Silakan coba beberapa saat lagi.';
      try {
        await ctx.reply(`🛡️ *MODE PEMELIHARAAN AKTIF*\n\n${maintenanceMsg}`, { parse_mode: 'Markdown' });
      } catch (err) {
        // Silently fail if reply errors (e.g. callback queries)
      }
      return; // Block all further processing
    }
  } catch (err) {
    // If settings table check fails, let the bot continue normally
    console.error('Maintenance mode check failed:', err);
  }
  await next();
});

// 3.6. Register Blacklist Checking Middleware
bot.use(async (ctx, next) => {
  const telegramId = String(ctx.from?.id);
  if (telegramId) {
    const isBanned = await prisma.blacklist.findUnique({ where: { telegramId } });
    if (isBanned) {
      try {
        await ctx.reply(`🚫 *Akses Anda Ditangguhkan!*\n\nMohon maaf, akun Anda telah dinonaktifkan dari sistem kami oleh administrator.\nAlasan: *${isBanned.reason || 'Pelanggaran ketentuan layanan'}*`, { parse_mode: 'Markdown' });
      } catch (err) {
        console.error('Failed to send blacklist response:', err);
      }
      return; // Stop execution
    }
  }
  await next();
});

// 4. Command Registrations
bot.command('start', handleStartCommand);
bot.command('profile', handleProfileCommand);
bot.command('history', handleHistoryCommand);
bot.command('deposit', async (ctx) => {
  await ctx.conversation.enter('depositConversation');
});
bot.command('order', async (ctx) => {
  // Directly enter premium categories list instead of game prompt
  const firstName = ctx.from?.first_name || 'Evo';
  await ctx.reply('🎮 Silakan pilih produk premium dari menu utama di atas!');
});
bot.command('stok', async (ctx) => {
  const stockMsg = await getDynamicStockMessage();
  await ctx.reply(stockMsg, { parse_mode: 'Markdown' });
});
bot.command('info', async (ctx) => {
  const infoMsg = 
    `🤖 *INFO EVO GAME STORE BOT* 🤖\n\n` +
    `Bot ini dikembangkan dengan teknologi modern & real-time:\n` +
    `⚡ *Engine:* grammY + Node.js (TypeScript)\n` +
    `📡 *Payment:* QRIS Otomatis Real-time\n` +
    `🔌 *Supplier:* Digiflazz H2H otomatis 24 Jam\n\n` +
    `Hubungi @CsVitopedia jika Anda memiliki pertanyaan atau kendala!`;
  await ctx.reply(infoMsg, { parse_mode: 'Markdown' });
});

// 5. Inline Keyboard Callback Handlers
bot.callbackQuery('menu:list_produk', async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleListProdukCallback(ctx);
});

bot.callbackQuery('menu:saldo', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('depositConversation');
});

bot.callbackQuery('menu:history', async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleHistoryCommand(ctx);
});

bot.callbackQuery('menu:popular', async (ctx) => {
  await ctx.answerCallbackQuery();
  const popularMessage = 
    `🔥 *PRODUK POPULER EVO GAME STORE* 🔥\n\n` +
    `1. *Canva Pro 1 Bulan* (Rp 5.000)\n` +
    `2. *YouTube Premium 1 Bulan* (Rp 9.000)\n` +
    `3. *CapCut Pro 1 Bulan* (Rp 12.000)\n\n` +
    `💡 _Silakan pilih menu 'List Produk' di main menu untuk melakukan pemesanan!_`;
  await ctx.reply(popularMessage, { parse_mode: 'Markdown' });
});

bot.callbackQuery('menu:menu_lain', async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleMenuLainCallback(ctx);
});

bot.callbackQuery('menu:main_menu', async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleMainMenuCallback(ctx);
});

// Regex to capture chosen category number 1-14
bot.callbackQuery(/^cat:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const catIndex = parseInt(ctx.match[1], 10);
  await handleCategorySelectCallback(ctx, catIndex);
});

// Regex to capture refresh request for a category index
bot.callbackQuery(/^cat_ref:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('Memperbarui...');
  const catIndex = parseInt(ctx.match[1], 10);
  await handleCategorySelectCallback(ctx, catIndex);
});

// Regex to capture chosen package product code
bot.callbackQuery(/^buy_pkg:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productCode = ctx.match[1];
  
  ctx.session.orderState = {
    productCode,
    qty: 1
  };

  const product = await prisma.product.findUnique({ where: { code: productCode } });
  if (!product) {
    await ctx.reply('⚠️ Produk tidak ditemukan atau sudah dinonaktifkan.');
    return;
  }

  const caption = await renderInteractiveCheckoutCaption(product, 1);
  const keyboard = renderInteractiveCheckoutKeyboard(productCode);

  await ctx.editMessageCaption({
    caption,
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
});

// Quantity selection adjustments
bot.callbackQuery('qty_dec', async (ctx) => {
  await ctx.answerCallbackQuery();
  const productCode = ctx.session.orderState.productCode;
  if (!productCode) return;

  const product = await prisma.product.findUnique({ where: { code: productCode } });
  if (!product) return;

  let currentQty = ctx.session.orderState.qty || 1;
  currentQty = Math.max(1, currentQty - 1);
  ctx.session.orderState.qty = currentQty;

  const caption = await renderInteractiveCheckoutCaption(product, currentQty);
  const keyboard = renderInteractiveCheckoutKeyboard(productCode);

  try {
    await ctx.editMessageCaption({
      caption,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (err) {}
});

bot.callbackQuery('qty_inc', async (ctx) => {
  await ctx.answerCallbackQuery();
  const productCode = ctx.session.orderState.productCode;
  if (!productCode) return;

  const product = await prisma.product.findUnique({ where: { code: productCode } });
  if (!product) return;

  let currentQty = ctx.session.orderState.qty || 1;
  
  // Stock limitation check for MANUAL products
  if (product.provider === 'MANUAL') {
    const availableStock = await prisma.stockItem.count({
      where: { productCode: product.code, isSold: false }
    });
    if (currentQty >= availableStock) {
      await ctx.reply(`⚠️ Pembelian tidak dapat melebihi jumlah sisa stok yang tersedia (*${availableStock}* pcs).`, { parse_mode: 'Markdown' });
      return;
    }
  }

  currentQty = currentQty + 1;
  ctx.session.orderState.qty = currentQty;

  const caption = await renderInteractiveCheckoutCaption(product, currentQty);
  const keyboard = renderInteractiveCheckoutKeyboard(productCode);

  try {
    await ctx.editMessageCaption({
      caption,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (err) {}
});

bot.callbackQuery('qty_refresh', async (ctx) => {
  await ctx.answerCallbackQuery();
  const productCode = ctx.session.orderState.productCode;
  if (!productCode) return;

  const product = await prisma.product.findUnique({ where: { code: productCode } });
  if (!product) return;

  const currentQty = ctx.session.orderState.qty || 1;
  const caption = await renderInteractiveCheckoutCaption(product, currentQty);
  const keyboard = renderInteractiveCheckoutKeyboard(productCode);

  try {
    await ctx.editMessageCaption({
      caption,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (err) {}
});

bot.callbackQuery('qty_input', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('qtyInputConversation');
});

// Finalize purchase confirmations
bot.callbackQuery(/^qty_buy:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const paymentMethod = ctx.match[1].toUpperCase(); // 'SALDO' or 'QRIS'
  
  ctx.session.orderState.paymentMethod = paymentMethod;
  await ctx.conversation.enter('buyAppConversation');
});

bot.callbackQuery('menu:cara_order', async (ctx) => {
  await ctx.answerCallbackQuery();
  const guideMsg = 
    `❓ *CARA ORDER DI EVO GAME STORE* ❓\n\n` +
    `1. Pilih menu *List Produk 🛒*.\n` +
    `2. Pilih kategori produk yang Anda inginkan (1-14).\n` +
    `3. Pilih paket akun premium yang ingin dibeli.\n` +
    `4. Masukkan Email / No. Akun target penerima Anda.\n` +
    `5. Pilih metode pembayaran:\n` +
    `   * Potong Saldo Akun (Instan)\n` +
    `   * QRIS Instan (Scan QR)\n` +
    `6. Selesaikan pembayaran (jika via QRIS) dan top-up akan otomatis diproses dalam waktu kurang dari 1 menit!`;
  await ctx.reply(guideMsg, { parse_mode: 'Markdown' });
});

bot.callbackQuery('menu:daftar_stok', async (ctx) => {
  await ctx.answerCallbackQuery();
  const stockMsg = await getDynamicStockMessage();
  await ctx.reply(stockMsg, { parse_mode: 'Markdown' });
});

bot.callbackQuery('menu:sewa_bot', async (ctx) => {
  await ctx.answerCallbackQuery();
  const rentMsg = 
    `🤖 *SEWA BOT AUTO ORDER TOP-UP* 🤖\n\n` +
    `Ingin memiliki bot Telegram auto-order premium seperti ini untuk toko game Anda sendiri?\n\n` +
    `Kami menawarkan layanan sewa/pembuatan bot kustom:\n` +
    `✅ Integrasi Pembayaran QRIS otomatis\n` +
    `✅ Integrasi supplier H2H Digiflazz / VIP Reseller\n` +
    `✅ Dashboard admin web premium\n\n` +
    `💬 Silakan hubungi admin kami di @CsVitopedia untuk penawaran harga terbaik!`;
  await ctx.reply(rentMsg, { parse_mode: 'Markdown' });
});

// Global error handler
bot.catch((err) => {
  console.error(`[Telegram Bot Error] Error occurred:`, err.error);
});

export { bot };
