import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  ToggleLeft, 
  ToggleRight, 
  Trash2, 
  Edit3, 
  Layers, 
  Cpu, 
  Wrench,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';

interface Product {
  code: string;
  gameName: string;
  name: string;
  price: number;
  status: boolean;
  provider: string;
  description?: string | null;
  wholesaleRules?: string | null;
  _count?: {
    stockItems: number;
  };
}

interface StockProps {
  products: Product[];
  onRefresh: () => void;
  adminPassword: string;
}

export const StockView: React.FC<StockProps> = ({ products, onRefresh, adminPassword }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  
  // Product creation form states
  const [newCode, setNewCode] = useState('');
  const [newGame, setNewGame] = useState('');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newProvider, setNewProvider] = useState('H2H');
  const [newDescription, setNewDescription] = useState('');
  const [newWholesaleRules, setNewWholesaleRules] = useState('');

  // Product editing form states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editCode, setEditCode] = useState('');
  const [editGame, setEditGame] = useState('');
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editProvider, setEditProvider] = useState('H2H');
  const [editDescription, setEditDescription] = useState('');
  const [editWholesaleRules, setEditWholesaleRules] = useState('');

  // Bulk stock & stock management states
  const [stockProductCode, setStockProductCode] = useState('');
  const [stockProductName, setStockProductName] = useState('');
  const [stockValues, setStockValues] = useState('');
  
  const [stockItems, setStockItems] = useState<{ id: string; value: string; isSold: boolean; createdAt: string }[]>([]);
  const [activeStockTab, setActiveStockTab] = useState<'input' | 'view'>('input');
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [showStockValuesMap, setShowStockValuesMap] = useState<Record<string, boolean>>({});

  // Wholesale parser/formatter helpers
  const parseWholesaleRules = (text: string): string => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const rules: { minQty: number; price: number }[] = [];
    for (const line of lines) {
      const parts = line.split(':');
      if (parts.length === 2) {
        const minQty = parseInt(parts[0].trim(), 10);
        const price = parseFloat(parts[1].trim());
        if (!isNaN(minQty) && !isNaN(price)) {
          rules.push({ minQty, price });
        }
      }
    }
    return JSON.stringify(rules);
  };

  const formatWholesaleRules = (jsonStr: string | null | undefined): string => {
    if (!jsonStr) return '';
    try {
      const rules = JSON.parse(jsonStr);
      if (Array.isArray(rules)) {
        return rules.map(r => `${r.minQty}:${r.price}`).join('\n');
      }
    } catch (err) {}
    return '';
  };

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Admin-Password': adminPassword
  });

  // Fetch all stock items for a product (sold & unsold)
  const fetchStockItems = async (code: string) => {
    try {
      const res = await fetch(`/api/admin/products/${code}/stock`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStockItems(data);
      }
    } catch (err) {
      console.error('Error fetching stock items:', err);
    }
  };

  // Delete a specific stock item
  const handleDeleteStockItem = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus item stok ini?')) return;
    try {
      const res = await fetch(`/api/admin/stock/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        fetchStockItems(stockProductCode);
        onRefresh();
      } else {
        alert('Gagal menghapus item stok.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filters products
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.gameName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle status
  const handleToggleStatus = async (code: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/products/${code}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status: !currentStatus })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Inline Price change
  const handleEditPrice = async (code: string, currentPrice: number) => {
    const newPriceStr = prompt(`Masukkan harga baru untuk SKU ${code}:`, String(currentPrice));
    if (newPriceStr === null) return;
    const priceNum = parseFloat(newPriceStr);
    if (isNaN(priceNum) || priceNum < 0) {
      alert('Harga tidak valid!');
      return;
    }

    try {
      const res = await fetch(`/api/admin/products/${code}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ price: priceNum })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete product
  const handleDeleteProduct = async (code: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus produk SKU ${code}?`)) return;

    try {
      const res = await fetch(`/api/admin/products/${code}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Product Submit
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName || !newPrice) {
      alert('Semua field wajib diisi!');
      return;
    }

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          code: newCode.trim(),
          gameName: newGame,
          name: newName.trim(),
          price: parseFloat(newPrice),
          provider: newProvider,
          description: newDescription,
          wholesaleRules: parseWholesaleRules(newWholesaleRules)
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setNewCode('');
        setNewName('');
        setNewPrice('');
        setNewDescription('');
        setNewWholesaleRules('');
        onRefresh();
      } else {
        alert(`Gagal: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName || !editPrice) {
      alert('Nama dan Harga wajib diisi!');
      return;
    }

    try {
      const res = await fetch(`/api/admin/products/${editCode}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          gameName: editGame,
          name: editName.trim(),
          price: parseFloat(editPrice),
          provider: editProvider,
          description: editDescription,
          wholesaleRules: parseWholesaleRules(editWholesaleRules)
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsEditModalOpen(false);
        onRefresh();
      } else {
        alert(`Gagal: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEditModal = (p: Product) => {
    setEditCode(p.code);
    setEditGame(p.gameName);
    setEditName(p.name);
    setEditPrice(String(p.price));
    setEditProvider(p.provider);
    setEditDescription(p.description || '');
    setEditWholesaleRules(formatWholesaleRules(p.wholesaleRules));
    setIsEditModalOpen(true);
  };

  // Bulk Stock Modal trigger
  const handleOpenStockModal = (code: string, name: string) => {
    setStockProductCode(code);
    setStockProductName(name);
    setStockValues('');
    setActiveStockTab('input');
    setStockSearchTerm('');
    setShowStockValuesMap({});
    setIsStockModalOpen(true);
    fetchStockItems(code);
  };

  // Bulk Stock Submit
  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLines = stockValues.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (cleanLines.length === 0) {
      alert('Harap isi data stok minimal 1 baris!');
      return;
    }

    try {
      const res = await fetch(`/api/admin/products/${stockProductCode}/stock`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ stockItems: cleanLines })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Berhasil menyimpan ${data.count} stok baru!`);
        setStockValues('');
        fetchStockItems(stockProductCode);
        onRefresh();
        setActiveStockTab('view');
      } else {
        alert(`Gagal: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-[#f5f5f7]">
      {/* Search and Action Bar - Apple search-input & pill button constraints */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Cari nama, SKU, atau kategori..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="apple-input w-full pl-12"
          />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={() => {
              setNewGame('');
              setIsAddModalOpen(true);
            }}
            className="apple-pill-btn flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Produk
          </button>
        </div>
      </div>

      {/* Products Table - Apple styled utility grid */}
      <div className="apple-store-card p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-white/5 text-[#86868b] font-semibold">
                <th className="p-4 text-xs uppercase tracking-wider">SKU Code</th>
                <th className="p-4 text-xs uppercase tracking-wider">Kategori</th>
                <th className="p-4 text-xs uppercase tracking-wider">Nama Produk</th>
                <th className="p-4 text-xs uppercase tracking-wider">Harga Reseller</th>
                <th className="p-4 text-xs uppercase tracking-wider">Penyedia</th>
                <th className="p-4 text-xs uppercase tracking-wider">Stok Mandiri</th>
                <th className="p-4 text-xs uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-slate-300 font-medium">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(p => (
                  <tr key={p.code} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono font-semibold text-white">{p.code}</td>
                    <td className="p-4">
                      <button 
                        onClick={() => handleOpenEditModal(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer active:scale-95"
                        title="Klik untuk ubah Kategori"
                      >
                        <Layers className="w-3 h-3 text-[#2997ff]" />
                        {p.gameName}
                      </button>
                    </td>
                    <td className="p-4 font-bold text-white">
                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="hover:text-[#2997ff] text-left transition-colors cursor-pointer"
                        title="Klik untuk ubah nama produk"
                      >
                        {p.name}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-400">Rp {p.price.toLocaleString('id-ID')}</span>
                        <button 
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Ubah Produk"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      {p.provider === 'MANUAL' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <Wrench className="w-3 h-3" />
                          MANUAL
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-[#2997ff]/10 text-[#2997ff] border border-[#2997ff]/20">
                          <Cpu className="w-3 h-3" />
                          H2H
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {p.provider === 'MANUAL' ? (
                        <button 
                          onClick={() => handleOpenStockModal(p.code, p.name)}
                          className="font-bold text-[#2997ff] hover:text-[#2997ff]/80 underline underline-offset-4 text-[13px] inline-flex items-center gap-1 cursor-pointer"
                        >
                          Input Stok ({p._count?.stockItems || 0})
                        </button>
                      ) : (
                        <span className="text-[#86868b] text-xs italic">Otomatis Supplier</span>
                      )}
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => handleToggleStatus(p.code, p.status)}
                        className="transition-transform active:scale-90 cursor-pointer"
                      >
                        {p.status ? (
                          <ToggleRight className="w-8 h-8 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-600" />
                        )}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(p)}
                          className="p-2 hover:bg-[#0066cc]/10 rounded-xl text-slate-400 hover:text-[#2997ff] border border-transparent hover:border-[#0066cc]/20 transition-all active:scale-90 cursor-pointer"
                          title="Ubah Produk"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(p.code)}
                          className="p-2 hover:bg-red-500/10 rounded-xl text-slate-500 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all active:scale-90 cursor-pointer"
                          title="Hapus Produk"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-medium italic">
                    Belum ada produk terdaftar. Tambahkan produk baru untuk memulai!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD PRODUCT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="apple-store-card w-full max-w-lg p-8 relative animate-scaleUp">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6 tracking-tight-display">
              <Package className="w-5 h-5 text-[#2997ff]" />
              Tambah Produk Baru
            </h3>
            
            <form onSubmit={handleAddProductSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-2">SKU CODE (Unique)</label>
                <input 
                  type="text" 
                  placeholder="contoh: canva_premium" 
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="apple-input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 text-xs font-semibold mb-2">KATEGORI</label>
                  <input 
                    type="text" 
                    placeholder="contoh: Canva, Spotify" 
                    value={newGame}
                    onChange={(e) => setNewGame(e.target.value)}
                    className="apple-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-xs font-semibold mb-2">PENYEDIA (PROVIDER)</label>
                  <select 
                    value={newProvider}
                    onChange={(e) => setNewProvider(e.target.value)}
                    className="apple-input w-full appearance-none cursor-pointer"
                    style={{ backgroundColor: '#1c1c1e' }}
                  >
                    <option value="H2H">Digiflazz (H2H)</option>
                    <option value="MANUAL">Stok Mandiri (MANUAL)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-2">NAMA PRODUK</label>
                <input 
                  type="text" 
                  placeholder="contoh: Canva Pro Premium 1 Bulan" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="apple-input w-full"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-2">HARGA RESELLER (Rupiah)</label>
                <input 
                  type="number" 
                  placeholder="contoh: 5000" 
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="apple-input w-full"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-2">DESKRIPSI PRODUK</label>
                <textarea 
                  rows={2}
                  placeholder="contoh:&#10;✅ VOUCHER BUY 1 GET 1&#10;❌ Garansi hanya pin salah"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl outline-none text-white focus:border-[#2997ff] transition-colors text-sm resize-y"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-2">HARGA GROSIR (Format: MinQty:Harga, satu baris satu aturan)</label>
                <textarea 
                  rows={2}
                  placeholder="contoh:&#10;10:1800&#10;25:1700"
                  value={newWholesaleRules}
                  onChange={(e) => setNewWholesaleRules(e.target.value)}
                  className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl outline-none text-white focus:border-[#2997ff] transition-colors text-sm font-mono resize-y"
                />
              </div>

              <div className="flex gap-4 mt-8 pt-4 border-t border-white/5">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl transition-colors active:scale-95 cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="w-1/2 py-3 bg-[#0066cc] hover:bg-[#0071e3] text-white font-bold rounded-xl transition-colors active:scale-95 cursor-pointer"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KELOLA STOCK MANUAL */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="apple-store-card w-full max-w-2xl p-8 relative animate-scaleUp">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2 tracking-tight-display">
              <Wrench className="w-5 h-5 text-purple-400" />
              Kelola Stok Mandiri (MANUAL)
            </h3>
            <p className="text-slate-400 text-xs mb-6">SKU: <span className="font-mono text-purple-400 font-bold">{stockProductCode}</span> | {stockProductName}</p>

            {/* Tabs Trigger */}
            <div className="flex border-b border-white/5 mb-6">
              <button
                type="button"
                onClick={() => setActiveStockTab('input')}
                className={`pb-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
                  activeStockTab === 'input' 
                    ? 'border-[#2997ff] text-[#2997ff]' 
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Tambah Stok Baru
              </button>
              <button
                type="button"
                onClick={() => setActiveStockTab('view')}
                className={`pb-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
                  activeStockTab === 'view' 
                    ? 'border-[#2997ff] text-[#2997ff]' 
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Daftar & Hapus Stok ({stockItems.length})
              </button>
            </div>

            {activeStockTab === 'input' ? (
              <form onSubmit={handleStockSubmit} className="space-y-4">
                <div>
                  <label className="block text-slate-500 text-xs font-semibold mb-2">
                    Kredensial Stok Baru (Satu baris = satu akun/voucher)
                  </label>
                  <textarea 
                    rows={6}
                    placeholder="canvamember1@gmail.com|pass123&#10;canvamember2@gmail.com|pass456"
                    value={stockValues}
                    onChange={(e) => setStockValues(e.target.value)}
                    className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl outline-none text-white focus:border-[#2997ff] transition-colors font-mono text-sm resize-y"
                  />
                </div>

                <div className="flex gap-2.5 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold leading-relaxed">
                    Peringatan: Pastikan format kredensial konsisten agar tidak membingungkan pembeli ketika data dikirimkan.
                  </p>
                </div>

                <div className="flex gap-4 mt-8 pt-4 border-t border-white/5">
                  <button 
                    type="button"
                    onClick={() => setIsStockModalOpen(false)}
                    className="w-1/2 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl transition-colors active:scale-95 cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button 
                    type="submit"
                    className="w-1/2 py-3 bg-[#0066cc] hover:bg-[#0071e3] text-white font-bold rounded-xl transition-colors active:scale-95 cursor-pointer"
                  >
                    Simpan Stok
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {/* Search Stock Items */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Cari kredensial stok (email, pass, voucher, dll)..."
                    value={stockSearchTerm}
                    onChange={(e) => setStockSearchTerm(e.target.value)}
                    className="apple-input w-full pl-12 py-2"
                  />
                </div>

                {/* Stock Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</div>
                    <div className="text-lg font-black text-white mt-0.5">{stockItems.length}</div>
                  </div>
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center text-emerald-400">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tersedia</div>
                    <div className="text-lg font-black mt-0.5">{stockItems.filter(item => !item.isSold).length}</div>
                  </div>
                  <div className="p-3 bg-[#2997ff]/5 border border-[#2997ff]/10 rounded-xl text-center text-[#2997ff]">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Terjual</div>
                    <div className="text-lg font-black mt-0.5">{stockItems.filter(item => item.isSold).length}</div>
                  </div>
                </div>

                {/* Scrollable Stock List */}
                <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1">
                  {stockItems.filter(item => item.value.toLowerCase().includes(stockSearchTerm.toLowerCase())).length > 0 ? (
                    stockItems
                      .filter(item => item.value.toLowerCase().includes(stockSearchTerm.toLowerCase()))
                      .map(item => {
                        const isShow = showStockValuesMap[item.id] || false;
                        return (
                          <div key={item.id} className="flex items-center justify-between p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
                            <div className="flex-1 min-w-0 mr-4">
                              <div className="flex items-center gap-2 mb-1.5">
                                {item.isSold ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#2997ff]/10 text-[#2997ff] border border-[#2997ff]/20">TERJUAL</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">TERSEDIA</span>
                                )}
                                <span className="text-[10px] text-slate-500 font-semibold">{new Date(item.createdAt).toLocaleDateString('id-ID')}</span>
                              </div>
                              <div className="font-mono font-bold text-sm text-white break-all">
                                {isShow ? item.value : '••••••••••••••••••••'}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setShowStockValuesMap(prev => ({ ...prev, [item.id]: !isShow }))}
                                className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer active:scale-90"
                                title={isShow ? 'Sembunyikan' : 'Tampilkan'}
                              >
                                {isShow ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStockItem(item.id)}
                                className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all cursor-pointer active:scale-90"
                                title="Hapus Stok"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="text-center py-12 text-slate-500 italic text-xs">
                      {stockSearchTerm ? 'Stok cocok dengan pencarian tidak ditemukan.' : 'Belum ada data stok dimasukkan.'}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/5">
                  <button 
                    type="button"
                    onClick={() => setIsStockModalOpen(false)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl transition-colors active:scale-95 cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: EDIT PRODUCT */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="apple-store-card w-full max-w-lg p-8 relative animate-scaleUp">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6 tracking-tight-display">
              <Package className="w-5 h-5 text-[#2997ff]" />
              Ubah Detail Produk
            </h3>
            
            <form onSubmit={handleEditProductSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-2">SKU CODE (Tidak dapat diubah)</label>
                <input 
                  type="text" 
                  value={editCode}
                  disabled
                  className="apple-input w-full opacity-50 cursor-not-allowed bg-white/5"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 text-xs font-semibold mb-2">KATEGORI</label>
                  <input 
                    type="text" 
                    placeholder="contoh: Canva, Spotify" 
                    value={editGame}
                    onChange={(e) => setEditGame(e.target.value)}
                    className="apple-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-xs font-semibold mb-2">PENYEDIA (PROVIDER)</label>
                  <select 
                    value={editProvider}
                    onChange={(e) => setEditProvider(e.target.value)}
                    className="apple-input w-full appearance-none cursor-pointer"
                    style={{ backgroundColor: '#1c1c1e' }}
                  >
                    <option value="H2H">Digiflazz (H2H)</option>
                    <option value="MANUAL">Stok Mandiri (MANUAL)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-2">NAMA PRODUK</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="apple-input w-full"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-2">HARGA RESELLER (Rupiah)</label>
                <input 
                  type="number" 
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="apple-input w-full"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-2">DESKRIPSI PRODUK</label>
                <textarea 
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl outline-none text-white focus:border-[#2997ff] transition-colors text-sm resize-y"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-2">HARGA GROSIR (Format: MinQty:Harga, satu baris satu aturan)</label>
                <textarea 
                  rows={2}
                  value={editWholesaleRules}
                  onChange={(e) => setEditWholesaleRules(e.target.value)}
                  className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl outline-none text-white focus:border-[#2997ff] transition-colors text-sm font-mono resize-y"
                />
              </div>

              <div className="flex gap-4 mt-8 pt-4 border-t border-white/5">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-1/2 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl transition-colors active:scale-95 cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="w-1/2 py-3 bg-[#0066cc] hover:bg-[#0071e3] text-white font-bold rounded-xl transition-colors active:scale-95 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
