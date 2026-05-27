import React, { useState } from 'react';
import { 
  Ticket, 
  Plus, 
  Trash2, 
  Coins, 
  Hash
} from 'lucide-react';

interface Voucher {
  code: string;
  discount: number;
  maxUse: number;
  usedCount: number;
  status: boolean;
  createdAt: string;
}

interface VoucherProps {
  vouchers: Voucher[];
  onRefresh: () => void;
  adminPassword: string;
}

export const VoucherPromoView: React.FC<VoucherProps> = ({ vouchers, onRefresh, adminPassword }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState('');
  const [newMaxUse, setNewMaxUse] = useState('1');

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Admin-Password': adminPassword
  });

  // Add Voucher Submit
  const handleAddVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newDiscount || !newMaxUse) {
      alert('Semua field wajib diisi!');
      return;
    }

    try {
      const res = await fetch('/api/admin/vouchers', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          code: newCode.trim(),
          discount: parseFloat(newDiscount),
          maxUse: parseInt(newMaxUse, 10)
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setNewCode('');
        setNewDiscount('');
        setNewMaxUse('1');
        onRefresh();
      } else {
        alert(`Gagal: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Voucher
  const handleDeleteVoucher = async (code: string) => {
    if (!confirm(`Hapus kode voucher promo ${code}?`)) return;

    try {
      const res = await fetch(`/api/admin/vouchers/${code}`, {
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

  return (
    <div className="space-y-6 animate-fadeIn text-[#f5f5f7]">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight-display">
            <Ticket className="w-5 h-5 text-[#2997ff]" />
            Kelola Kode Voucher / Diskon
          </h2>
          <p className="text-slate-400 text-xs mt-1">Buat kode diskon promo nominal Rupiah untuk memotong harga belanja pengguna.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="apple-pill-btn w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Voucher
        </button>
      </div>

      {/* Vouchers Grid */}
      <div className="apple-store-card p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-white/5 text-[#86868b] font-semibold">
                <th className="p-4 text-xs uppercase tracking-wider">Kode Voucher</th>
                <th className="p-4 text-xs uppercase tracking-wider">Potongan Diskon</th>
                <th className="p-4 text-xs uppercase tracking-wider">Limit Pemakaian</th>
                <th className="p-4 text-xs uppercase tracking-wider">Sudah Digunakan</th>
                <th className="p-4 text-xs uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-slate-300 font-medium">
              {vouchers.length > 0 ? (
                vouchers.map(v => (
                  <tr key={v.code} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <span className="font-mono font-bold bg-white/5 border border-white/10 text-[#2997ff] px-3 py-1.5 rounded-lg text-xs">
                        {v.code}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-emerald-400">
                      Rp {v.discount.toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 font-semibold text-slate-200">
                      {v.maxUse} kali
                    </td>
                    <td className="p-4 font-semibold text-slate-450">
                      {v.usedCount} kali
                    </td>
                    <td className="p-4">
                      {v.usedCount >= v.maxUse ? (
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                          LIMIT EXPIRED
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          AKTIF
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDeleteVoucher(v.code)}
                        className="p-2 hover:bg-red-500/10 rounded-xl text-slate-500 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all active:scale-95 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-medium italic">
                    Belum ada voucher terdaftar. Tambahkan voucher baru untuk diskon promo!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD VOUCHER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="apple-store-card w-full max-w-lg p-8 relative animate-scaleUp">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6 tracking-tight-display">
              <Ticket className="w-5 h-5 text-[#2997ff]" />
              Buat Voucher Promo Baru
            </h3>
            
            <form onSubmit={handleAddVoucher} className="space-y-4">
              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-2">KODE VOUCHER (KAPITAL)</label>
                <input 
                  type="text" 
                  placeholder="contoh: DISKON5K" 
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="apple-input w-full uppercase font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-2">POTONGAN NOMINAL (Rupiah)</label>
                <div className="relative">
                  <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input 
                    type="number" 
                    placeholder="contoh: 5000" 
                    value={newDiscount}
                    onChange={(e) => setNewDiscount(e.target.value)}
                    className="apple-input w-full pl-12 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-2">MAKSIMAL PENGGUNAAN (Redemption Limit)</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input 
                    type="number" 
                    placeholder="contoh: 10" 
                    value={newMaxUse}
                    onChange={(e) => setNewMaxUse(e.target.value)}
                    className="apple-input w-full pl-12 font-semibold"
                  />
                </div>
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
                  Buat Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
