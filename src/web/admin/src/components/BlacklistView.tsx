import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Plus, 
  Search, 
  Calendar,
  AlertOctagon
} from 'lucide-react';

interface BlacklistedUser {
  telegramId: string;
  reason?: string;
  createdAt: string;
}

interface BlacklistProps {
  blacklist: BlacklistedUser[];
  onRefresh: () => void;
  adminPassword: string;
}

export const BlacklistView: React.FC<BlacklistProps> = ({ blacklist, onRefresh, adminPassword }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  
  const [banId, setBanId] = useState('');
  const [banReason, setBanReason] = useState('');

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Admin-Password': adminPassword
  });

  const filteredBlacklist = blacklist.filter(b => 
    b.telegramId.includes(searchTerm) || 
    (b.reason && b.reason.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Submit Ban User ID
  const handleBanUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banId) {
      alert('Telegram ID wajib diisi!');
      return;
    }

    try {
      const res = await fetch('/api/admin/blacklist', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          telegramId: banId.trim(),
          reason: banReason.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsBanModalOpen(false);
        setBanId('');
        setBanReason('');
        onRefresh();
      } else {
        alert(`Gagal membanned: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Remove Ban
  const handleUnbanUser = async (id: string) => {
    if (!confirm(`Hapus pemblokiran (unban) untuk Telegram ID ${id}?`)) return;

    try {
      const res = await fetch(`/api/admin/blacklist/${id}`, {
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
            <ShieldAlert className="w-5 h-5 text-red-400" />
            Sistem Security Blacklist / Ban User
          </h2>
          <p className="text-slate-400 text-xs mt-1">Blokir akses pengguna nakal secara instan. Pengguna diblokir tidak dapat menggunakan bot sama sekali.</p>
        </div>
        <button 
          onClick={() => setIsBanModalOpen(true)}
          className="w-full sm:w-auto bg-red-650 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-red-500/20 active:scale-95 cursor-pointer"
          style={{ borderRadius: '9999px' }}
        >
          <Plus className="w-4 h-4" />
          Banned User ID
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Cari ID Telegram yang diblokir..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="apple-input w-full pl-12"
          />
        </div>
      </div>

      {/* Banned Users Table */}
      <div className="apple-store-card p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-white/5 text-[#86868b] font-semibold">
                <th className="p-4 text-xs uppercase tracking-wider">Telegram User ID</th>
                <th className="p-4 text-xs uppercase tracking-wider">Alasan Pemblokiran</th>
                <th className="p-4 text-xs uppercase tracking-wider">Waktu Banned</th>
                <th className="p-4 text-xs uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-slate-300 font-medium">
              {filteredBlacklist.length > 0 ? (
                filteredBlacklist.map(b => (
                  <tr key={b.telegramId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono font-bold text-red-400">{b.telegramId}</td>
                    <td className="p-4 font-semibold text-white">{b.reason || 'Pelanggaran ketentuan layanan'}</td>
                    <td className="p-4 text-slate-450 font-medium text-xs">
                      <div className="flex items-center gap-1.5 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(b.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleUnbanUser(b.telegramId)}
                        className="py-1.5 px-3 hover:bg-emerald-500/10 rounded-xl text-emerald-400 hover:text-emerald-300 border border-transparent hover:border-emerald-500/20 transition-all font-bold text-xs active:scale-95 cursor-pointer"
                      >
                        Unban Akun
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 font-medium italic">
                    🛡️ Sistem aman. Belum ada ID pengguna yang diblokir saat ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: BAN USER */}
      {isBanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="apple-store-card w-full max-w-lg p-8 relative animate-scaleUp">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6 tracking-tight-display">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              Blokir Pengguna (Banned)
            </h3>
            
            <form onSubmit={handleBanUserSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-2">TELEGRAM USER ID</label>
                <input 
                  type="text" 
                  placeholder="contoh: 1779873901" 
                  value={banId}
                  onChange={(e) => setBanId(e.target.value)}
                  className="apple-input w-full font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-2">ALASAN BLOKIR</label>
                <input 
                  type="text" 
                  placeholder="contoh: Melakukan spamming deposit / bot abuse" 
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="apple-input w-full"
                />
              </div>

              <div className="flex gap-2.5 p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400">
                <AlertOctagon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold leading-relaxed">
                  Perhatian: Pengguna yang diblokir akan langsung kehilangan seluruh akses interaksi bot secara instan.
                </p>
              </div>

              <div className="flex gap-4 mt-8 pt-4 border-t border-white/5">
                <button 
                  type="button"
                  onClick={() => setIsBanModalOpen(false)}
                  className="w-1/2 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl transition-colors active:scale-95 cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="w-1/2 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors active:scale-95 cursor-pointer"
                >
                  Blokir Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
