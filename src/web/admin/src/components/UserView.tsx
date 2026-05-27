import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Coins, 
  Award, 
  DollarSign,
  UserCheck
} from 'lucide-react';

interface User {
  id: string;
  name?: string;
  username?: string;
  balance: number;
  role: string;
  createdAt: string;
}

interface UserProps {
  users: User[];
  onRefresh: () => void;
  adminPassword: string;
}

export const UserView: React.FC<UserProps> = ({ users, onRefresh, adminPassword }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);

  // Balance edit form states
  const [editUserId, setEditUserId] = useState('');
  const [editUserName, setEditUserName] = useState('');
  const [editUserBalance, setEditUserBalance] = useState(0);
  const [adjustAmount, setAdjustAmount] = useState('');

  // Filters users
  const filteredUsers = users.filter(u => 
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    u.id.includes(searchTerm)
  );

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Admin-Password': adminPassword
  });

  // Open Edit balance modal
  const handleOpenBalanceModal = (id: string, name: string, balance: number) => {
    setEditUserId(id);
    setEditUserName(name);
    setEditUserBalance(balance);
    setAdjustAmount('');
    setIsBalanceModalOpen(true);
  };

  // Submit Balance change
  const handleBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(adjustAmount);
    if (isNaN(amountNum)) {
      alert('Masukkan nominal saldo yang valid!');
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${editUserId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ adjustBalance: amountNum })
      });
      const data = await res.json();
      if (data.success) {
        setIsBalanceModalOpen(false);
        onRefresh();
      } else {
        alert(`Gagal: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle role levels (USER <-> RESELLER <-> ADMIN)
  const handleToggleRole = async (id: string, currentRole: string) => {
    const nextRoleMap: Record<string, string> = {
      'USER': 'RESELLER',
      'RESELLER': 'ADMIN',
      'ADMIN': 'USER'
    };
    const nextRole = nextRoleMap[currentRole] || 'USER';

    if (!confirm(`Apakah Anda yakin ingin merubah level akun member ini menjadi ${nextRole}?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ role: nextRole })
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
      {/* Search Bar - Apple search-input style */}
      <div className="flex gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Cari nama, username, atau Telegram ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="apple-input w-full pl-12"
          />
        </div>
      </div>

      {/* Users table - Apple styled utility grid */}
      <div className="apple-store-card p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-white/5 text-[#86868b] font-semibold">
                <th className="p-4 text-xs uppercase tracking-wider">Telegram ID</th>
                <th className="p-4 text-xs uppercase tracking-wider">Nama Member</th>
                <th className="p-4 text-xs uppercase tracking-wider">Username</th>
                <th className="p-4 text-xs uppercase tracking-wider">Saldo Terkini</th>
                <th className="p-4 text-xs uppercase tracking-wider">Level Akun</th>
                <th className="p-4 text-xs uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-slate-300 font-medium">
              {filteredUsers.length > 0 ? (
                filteredUsers.map(u => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono text-white">{u.id}</td>
                    <td className="p-4 font-bold text-white">{u.name || 'Member'}</td>
                    <td className="p-4">
                      {u.username ? (
                        <span className="text-[#2997ff] font-semibold">@{u.username}</span>
                      ) : (
                        <span className="text-slate-650 font-medium italic">Tidak ada</span>
                      )}
                    </td>
                    <td className="p-4 font-bold text-white">
                      Rp {u.balance.toLocaleString('id-ID')}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                        u.role === 'ADMIN' 
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                          : u.role === 'RESELLER' 
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                          : 'bg-white/5 text-slate-300 border border-white/10'
                      }`}>
                        <Award className="w-3.5 h-3.5" />
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-right flex justify-end gap-3">
                      <button 
                        onClick={() => handleOpenBalanceModal(u.id, u.name || 'Member', u.balance)}
                        className="apple-ghost-btn flex items-center gap-1.5 text-xs cursor-pointer"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        Edit Saldo
                      </button>
                      <button 
                        onClick={() => handleToggleRole(u.id, u.role)}
                        className="apple-utility-btn flex items-center gap-1.5 text-xs cursor-pointer border border-transparent hover:border-white/10"
                        title="Ubah Level Role Akun"
                      >
                        <Award className="w-3.5 h-3.5" />
                        Ubah Level
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-medium italic">
                    Belum ada pengguna terdaftar di bot Telegram Anda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: EDIT USER BALANCE */}
      {isBalanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="apple-store-card w-full max-w-lg p-8 relative animate-scaleUp">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6 tracking-tight-display">
              <Coins className="w-5 h-5 text-[#2997ff]" />
              Kelola Saldo Pengguna
            </h3>
            
            <form onSubmit={handleBalanceSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-1">Nama Member</label>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-white font-semibold flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#2997ff]" />
                  {editUserName} <span className="font-mono text-xs text-slate-500">({editUserId})</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-1">Saldo Terkini</label>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-emerald-400 font-bold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Rp {editUserBalance.toLocaleString('id-ID')}
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-2">
                  Nominal Tambah / Kurang (Gunakan tanda minus - untuk memotong)
                </label>
                <input 
                  type="number" 
                  placeholder="contoh: 50000 atau -20000" 
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="apple-input w-full font-semibold"
                />
              </div>

              <div className="flex gap-4 mt-8 pt-4 border-t border-white/5">
                <button 
                  type="button"
                  onClick={() => setIsBalanceModalOpen(false)}
                  className="w-1/2 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl transition-colors active:scale-95 cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="w-1/2 py-3 bg-[#0066cc] hover:bg-[#0071e3] text-white font-bold rounded-xl transition-colors active:scale-95 cursor-pointer"
                >
                  Update Saldo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
