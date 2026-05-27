import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Users as UsersIcon, 
  Ticket, 
  Megaphone, 
  ShieldAlert, 
  History,
  RefreshCw,
  LogOut,
  Sparkles,
  Settings
} from 'lucide-react';

import { DashboardView } from './components/DashboardView';
import { StockView } from './components/StockView';
import { UserView } from './components/UserView';
import { VoucherPromoView } from './components/VoucherPromoView';
import { BroadcastView } from './components/BroadcastView';
import { BlacklistView } from './components/BlacklistView';
import { AuditView } from './components/AuditView';
import { SettingsView } from './components/SettingsView';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('admin');
  const [loginError, setLoginError] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Global State data
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    successTransactions: 0,
    activeProducts: 0,
    pendingTransactions: [],
    chartData: []
  });
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Setup authentication headers
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Admin-Password': password
  });

  // Pull all dashboard metrics
  const fetchAllData = async () => {
    if (!isLoggedIn) return;
    setIsRefreshing(true);
    try {
      // Fetch stats
      const statsRes = await fetch('/api/admin/stats', { headers: getHeaders() });
      if (statsRes.status === 401) {
        setIsLoggedIn(false);
        return;
      }
      const statsData = await statsRes.json();
      setStats(statsData);

      // Fetch products
      const prodRes = await fetch('/api/admin/products', { headers: getHeaders() });
      const prodData = await prodRes.json();
      setProducts(prodData);

      // Fetch users
      const usersRes = await fetch('/api/admin/users', { headers: getHeaders() });
      const usersData = await usersRes.json();
      setUsers(usersData);

      // Fetch vouchers
      const vouchRes = await fetch('/api/admin/vouchers', { headers: getHeaders() });
      const vouchData = await vouchRes.json();
      setVouchers(vouchData);

      // Fetch blacklist
      const blackRes = await fetch('/api/admin/blacklist', { headers: getHeaders() });
      const blackData = await blackRes.json();
      setBlacklist(blackData);

      // Fetch transactions
      const txRes = await fetch('/api/admin/transactions', { headers: getHeaders() });
      const txData = await txRes.json();
      setTransactions(txData);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Trigger login check
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(false);
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'X-Admin-Password': password }
      });
      if (res.status === 200) {
        setIsLoggedIn(true);
      } else {
        setLoginError(true);
      }
    } catch (err) {
      alert('Gagal menyambung ke API server Express.');
    }
  };

  // Poll stats every 15 seconds to support real-time monitoring
  useEffect(() => {
    if (isLoggedIn) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 15000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  // Handle Auth screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0b0f19]">
        <div className="apple-store-card p-8 w-full max-w-md space-y-6 relative animate-fadeIn shadow-2xl">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-white/5 rounded-full text-sky-400 mb-2">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold tracking-tight-display text-white">Evo Game Store</h2>
            <p className="text-slate-400 text-xs">Masukkan password panel admin</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block">Password Admin</label>
              <input 
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="apple-input w-full"
              />
            </div>

            {loginError && (
              <p className="text-red-400 text-xs font-semibold text-center mt-2 animate-pulse">
                ❌ Password salah! Silakan coba lagi.
              </p>
            )}

            <button 
              type="submit"
              className="apple-pill-btn w-full py-3 mt-4 text-sm font-semibold active:scale-95 cursor-pointer"
            >
              Masuk Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Sidebar navigation options
  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'stock', label: 'Kelola Stok', icon: Package },
    { id: 'users', label: 'Kelola User', icon: UsersIcon },
    { id: 'vouchers', label: 'Kelola Voucher', icon: Ticket },
    { id: 'broadcast', label: 'Kirim Broadcast', icon: Megaphone },
    { id: 'blacklist', label: 'Banned & Blacklist', icon: ShieldAlert },
    { id: 'transactions', label: 'Audit Transaksi', icon: History },
    { id: 'settings', label: 'Pengaturan', icon: Settings }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0f19] text-[#f5f5f7]">
      {/* 1. Global Navigation Bar (44px) */}
      <header className="apple-global-nav w-full px-6 flex items-center justify-between text-xs text-[#cccccc] font-medium tracking-tight-display select-none">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-white">
          <Sparkles className="w-4 h-4 text-[#2997ff]" />
          Evo Game Store Panel
        </div>
        <div className="flex items-center gap-4 text-slate-500 text-[11px] font-mono">
          <span>unix_socket: MAMP Pro MySQL</span>
        </div>
      </header>

      {/* 2. Sub-Navigation Bar (52px Frosted Glass) */}
      <div className="apple-sub-nav-frosted sticky top-0 z-40 w-full px-6 flex items-center justify-between select-none">
        <div className="text-lg font-semibold tracking-tight-display text-white">
          {menuItems.find(m => m.id === activeTab)?.label || 'Overview'}
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Sync Aktif
          </span>
          <button 
            onClick={fetchAllData}
            disabled={isRefreshing}
            className="apple-utility-btn flex items-center gap-1.5 text-xs cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-1 w-full">
        {/* Minimalist Sidebar */}
        <aside className="w-[260px] bg-black/40 border-r border-slate-900 p-6 flex flex-col justify-between select-none">
          <div className="space-y-6">
            <div className="text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-2">
              Menu Dashboard
            </div>
            <nav className="space-y-1">
              {menuItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full py-2.5 px-3.5 rounded-lg flex items-center gap-2.5 font-medium text-[14px] transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-white/10 text-white font-semibold' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="pt-6 border-t border-slate-900 space-y-3">
            <button 
              onClick={() => setIsLoggedIn(false)}
              className="w-full py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-lg flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar Panel
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8 bg-[#161617] overflow-y-auto">
          <div className="max-w-[1440px] mx-auto">
            {activeTab === 'dashboard' && <DashboardView stats={stats} onRefresh={fetchAllData} />}
            {activeTab === 'stock' && <StockView products={products} onRefresh={fetchAllData} adminPassword={password} />}
            {activeTab === 'users' && <UserView users={users} onRefresh={fetchAllData} adminPassword={password} />}
            {activeTab === 'vouchers' && <VoucherPromoView vouchers={vouchers} onRefresh={fetchAllData} adminPassword={password} />}
            {activeTab === 'broadcast' && <BroadcastView adminPassword={password} />}
            {activeTab === 'blacklist' && <BlacklistView blacklist={blacklist} onRefresh={fetchAllData} adminPassword={password} />}
            {activeTab === 'transactions' && <AuditView transactions={transactions} />}
            {activeTab === 'settings' && <SettingsView adminPassword={password} onRefresh={fetchAllData} />}
          </div>
        </main>
      </div>
    </div>
  );
}
