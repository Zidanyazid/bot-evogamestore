import { MyContext } from '../context';
import { prisma } from '../../db/client';
import { getMainMenuInlineKeyboard, getMenuLainInlineKeyboard, getCategoryInlineKeyboard } from '../menus/main';
import { getCategoryListCaption } from '../handlers/orderFlow';
import { InputFile, InlineKeyboard } from 'grammy';
import path from 'path';

/**
 * Helper to generate the exact caption text matching the requested premium layout
 */
export async function renderMainMenuText(telegramId: string, firstName: string, username: string | null) {
  // 1. Fetch user from DB
  const user = await prisma.user.findUnique({
    where: { id: telegramId }
  });

  if (!user) return '⚠️ Akun Anda belum terdaftar.';

  // 2. Fetch User Stats (Real database values without offsets)
  const userTotalBeliAggregate = await prisma.transaction.aggregate({
    where: { telegramId, orderStatus: 'SUCCESS' },
    _sum: { quantity: true }
  });
  const userTotalBeli = userTotalBeliAggregate._sum.quantity || 0;

  const userTotalSpentAggregate = await prisma.transaction.aggregate({
    where: { telegramId, orderStatus: 'SUCCESS' },
    _sum: { amount: true }
  });
  const userTotalSpent = userTotalSpentAggregate._sum.amount || 0;

  // 3. Fetch Bot-wide Stats (Real database values without offsets)
  const dbUsersCount = await prisma.user.count();
  const dbSalesAggregate = await prisma.transaction.aggregate({
    where: { orderStatus: 'SUCCESS' },
    _sum: { quantity: true }
  });
  const dbSalesCount = dbSalesAggregate._sum.quantity || 0;

  const dbRevenueAggregate = await prisma.transaction.aggregate({
    where: { orderStatus: 'SUCCESS' },
    _sum: { amount: true }
  });
  const dbRevenue = dbRevenueAggregate._sum.amount || 0;

  // Build string matching the UI screenshot exactly (using real DB values)
  return (
    `Halo ${firstName} 👋\n` +
    `*${firstName} (${username || 'Member'})*\n\n` +
    `*User Info*\n` +
    ` └ ID : \`${user.id}\`\n` +
    ` └ Username : @${user.username || 'Tidak ada'}\n` +
    ` └ Saldo : Rp. ${user.balance.toLocaleString('id-ID')}\n` +
    ` └ Total Beli : ${userTotalBeli} pcs\n` +
    ` └ Total Transaksi : Rp. ${userTotalSpent.toLocaleString('id-ID')}\n\n` +
    `*Bot Info*\n` +
    ` └ Terjual : *${dbSalesCount} pcs*\n` +
    ` └ Total Transaksi : *Rp. ${dbRevenue.toLocaleString('id-ID')}*\n` +
    ` └ Total Pengguna : *${dbUsersCount}*\n\n` +
    `*Sortcuts :*\n` +
    `/start – Mulai Bot\n` +
    `/stok – Cek Stok Produk\n` +
    `/info – Info Bot`
  );
}

/**
 * Handles the main /start command by sending a new photo with caption and menu
 */
export async function handleStartCommand(ctx: MyContext) {
  const telegramId = String(ctx.from?.id);
  const username = ctx.from?.username || null;
  const firstName = ctx.from?.first_name || 'Evo';
  const lastName = ctx.from?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();

  if (!telegramId) return;

  try {
    // 1. Ensure user is registered in MySQL
    let user = await prisma.user.findUnique({ where: { id: telegramId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: telegramId,
          username,
          name: fullName,
          balance: 0
        }
      });
      console.log(`[Database] Registered new user: ${fullName} (ID: ${telegramId})`);
    } else {
      user = await prisma.user.update({
        where: { id: telegramId },
        data: { username, name: fullName }
      });
    }

    // 2. Locate the banner file path using process.cwd() for absolute path safety
    const bannerPath = path.join(process.cwd(), 'src/assets/banner.png');

    // 3. Render caption text
    const caption = await renderMainMenuText(telegramId, firstName, username);

    // 4. Send premium photo with inline keyboard
    await ctx.replyWithPhoto(new InputFile(bannerPath), {
      caption,
      parse_mode: 'Markdown',
      reply_markup: getMainMenuInlineKeyboard()
    });

  } catch (error) {
    console.error('Error handling start command:', error);
    await ctx.reply('⚠️ Terjadi kesalahan saat memproses data pendaftaran Anda. Silakan coba beberapa saat lagi.');
  }
}

/**
 * Edits the current active message to display the Main Menu (Image 1)
 */
export async function handleMainMenuCallback(ctx: MyContext) {
  const telegramId = String(ctx.from?.id);
  const firstName = ctx.from?.first_name || 'Evo';
  const username = ctx.from?.username || null;

  if (!telegramId) return;

  try {
    const caption = await renderMainMenuText(telegramId, firstName, username);

    await ctx.editMessageCaption({
      caption,
      parse_mode: 'Markdown',
      reply_markup: getMainMenuInlineKeyboard()
    });
  } catch (error) {
    console.error('Error updating main menu callback:', error);
  }
}

/**
 * Edits the current active message to display the "Menu Lain" (Image 2)
 */
export async function handleMenuLainCallback(ctx: MyContext) {
  try {
    await ctx.editMessageCaption({
      caption: 'Silahkan pilih menu dibawah ini :',
      parse_mode: 'Markdown',
      reply_markup: getMenuLainInlineKeyboard()
    });
  } catch (error) {
    console.error('Error updating menu lain callback:', error);
  }
}

export async function handleListProdukCallback(ctx: MyContext) {
  const firstName = ctx.from?.first_name || 'Evo';
  try {
    const activeProducts = await prisma.product.findMany({
      where: { status: true },
      select: { gameName: true },
      distinct: ['gameName'],
      orderBy: { gameName: 'asc' }
    });
    const caption = await getCategoryListCaption(firstName);

    await ctx.editMessageCaption({
      caption,
      parse_mode: 'Markdown',
      reply_markup: getCategoryInlineKeyboard(activeProducts.length)
    });
  } catch (error) {
    console.error('Error updating list produk callback:', error);
  }
}

/**
 * Handles showing packages for a chosen premium app category index (1-based index)
 */
export async function handleCategorySelectCallback(ctx: MyContext, catIndex: number) {
  try {
    const activeProducts = await prisma.product.findMany({
      where: { status: true },
      select: { gameName: true },
      distinct: ['gameName'],
      orderBy: { gameName: 'asc' }
    });
    const categoryName = activeProducts[catIndex - 1]?.gameName;
    if (!categoryName) return;

    const products = await prisma.product.findMany({
      where: { gameName: categoryName, status: true },
      include: {
        _count: {
          select: { stockItems: { where: { isSold: false } } }
        }
      },
      orderBy: { price: 'asc' }
    });

    if (products.length === 0) {
      await ctx.editMessageCaption({
        caption: `📦 *${categoryName}*\n\n⚠️ Maaf, saat ini stok produk untuk kategori ini sedang kosong di server supplier H2H.`,
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('↩️ Kembali ke Kategori', 'menu:list_produk')
      });
      return;
    }

    // Query successful transaction counts dynamically to get sold stats
    const productCodes = products.map(p => p.code);
    const successfulTxCounts = await prisma.transaction.groupBy({
      by: ['productCode'],
      where: {
        productCode: { in: productCodes },
        orderStatus: 'SUCCESS'
      },
      _sum: {
        quantity: true
      }
    });

    const soldMap = new Map<string, number>();
    for (const code of productCodes) {
      soldMap.set(code, 0);
    }
    for (const tx of successfulTxCounts) {
      soldMap.set(tx.productCode, tx._sum.quantity || 0);
    }

    let totalCategorySold = 0;
    for (const qty of soldMap.values()) {
      totalCategorySold += qty;
    }

    // Generate Vitopedia style formatted list
    let packageMsg = `╭ - - - - - - - - - - - - - - - - - ╮\n` +
                     ` ┊ *Produk : ${categoryName.toUpperCase()}*\n` +
                     ` ┊ *Terjual : ${totalCategorySold}pcs*\n` +
                     `╰ - - - - - - - - - - - - - - - - - ╯\n\n`;

    const keyboard = new InlineKeyboard();

    products.forEach((prod) => {
      const isManual = prod.provider === 'MANUAL';
      const stockCount = isManual ? (prod._count?.stockItems || 0) : 0;
      const soldCount = soldMap.get(prod.code) || 0;

      packageMsg += `╭ - - - - - - - - - - - - - - - - - ╮\n` +
                    ` ┊ *${prod.name.toUpperCase()}*\n` +
                    ` ┊ Harga: *Rp ${prod.price.toLocaleString('id-ID')}* - Stok: *${isManual ? stockCount : 'Tersedia'}*\n` +
                    ` ┊ ╰➤ Terjual: *${soldCount}pcs*\n` +
                    `╰ - - - - - - - - - - - - - - - - - ╯\n\n`;

      // Full-width buttons containing product names (Vitopedia style)
      keyboard.text(prod.name.toUpperCase(), `buy_pkg:${prod.code}`).row();
    });

    const timeStr = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Jakarta'
    });
    
    packageMsg += `╰➤ *Refresh at ${timeStr} WIB*`;

    // Bottom utility row
    keyboard.text('🔄 Refresh', `cat_ref:${catIndex}`)
            .text('↩️ Kembali', 'menu:list_produk');

    await ctx.editMessageCaption({
      caption: packageMsg,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

  } catch (error) {
    console.error('Error rendering category select callback:', error);
  }
}
