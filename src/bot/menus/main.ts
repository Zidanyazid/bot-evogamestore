import { InlineKeyboard } from 'grammy';

/**
 * Returns the premium main inline keyboard (Image 1)
 */
export function getMainMenuInlineKeyboard() {
  return new InlineKeyboard()
    .text('List Produk 🛒', 'menu:list_produk')
    .text('💰 Saldo', 'menu:saldo')
    .row()
    .text('📁 Riwayat Transaksi', 'menu:history')
    .row()
    .text('Produk Populer ✨', 'menu:popular')
    .text('Menu Lain ⏩', 'menu:menu_lain');
}

/**
 * Returns the "Menu Lain" inline keyboard (Image 2)
 */
export function getMenuLainInlineKeyboard() {
  return new InlineKeyboard()
    .text('Cara Order ❓', 'menu:cara_order')
    .text('Daftar Stok 📦', 'menu:daftar_stok')
    .row()
    .text('Sewa Bot 🤖', 'menu:sewa_bot')
    .text('Kembali ke Menu ↩️', 'menu:main_menu');
}

/**
 * Returns the Premium App Categories inline keyboard (Image 3)
 */
export function getCategoryInlineKeyboard(categoriesCount: number) {
  const kb = new InlineKeyboard();
  for (let i = 1; i <= categoriesCount; i++) {
    kb.text(String(i), `cat:${i}`);
    if (i % 5 === 0 && i !== categoriesCount) {
      kb.row();
    }
  }
  kb.row().text('🔄 Kembali ke Menu', 'menu:main_menu');
  return kb;
}
