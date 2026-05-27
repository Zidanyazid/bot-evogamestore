import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CircleDollarSign, 
  ShoppingBag, 
  Package, 
  Clock, 
  TrendingUp,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  BarChart3,
  Wallet,
  Globe,
  Database,
  Bot,
  Shield,
  Server,
  ChevronRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ComposedChart,
  Line
} from 'recharts';

interface Transaction {
  id: string;
  refId: string;
  telegramId: string;
  productName: string;
  gameName: string;
  targetId: string;
  amount: number;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  user: {
    name?: string;
  };
}

interface ChartItem {
  date: string;
  revenue: number;
  transactions: number;
}

interface DashboardProps {
  stats: {
    totalUsers: number;
    totalRevenue: number;
    successTransactions: number;
    activeProducts: number;
    pendingTransactions: Transaction[];
    chartData?: ChartItem[];
  };
  onRefresh: () => void;
}

// Time-based greeting
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Selamat Pagi';
  if (hour < 15) return 'Selamat Siang';
  if (hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

function getGreetingEmoji(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '☀️';
  if (hour < 15) return '🌤️';
  if (hour < 18) return '🌅';
  return '🌙';
}

// Custom tooltip for chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-4 shadow-2xl">
        <p className="text-[#86868b] text-xs font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-white text-sm font-medium">
              {entry.name}: {entry.name === 'Pendapatan' 
                ? `Rp ${Number(entry.value).toLocaleString('id-ID')}` 
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const DashboardView: React.FC<DashboardProps> = ({ stats, onRefresh }) => {
  const chartData = stats.chartData || [];
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute some derivative stats
  const totalChartRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
  const totalChartTx = chartData.reduce((sum, d) => sum + d.transactions, 0);
  const avgDailyRevenue = chartData.length > 0 ? totalChartRevenue / chartData.length : 0;

  const statCards = [
    {
      label: 'Total Pengguna',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      gradient: 'from-blue-500/20 to-cyan-500/20',
      borderGlow: 'group-hover:shadow-blue-500/10',
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
      trend: '+12%',
      trendUp: true
    },
    {
      label: 'Total Pendapatan',
      value: `Rp ${stats.totalRevenue.toLocaleString('id-ID')}`,
      icon: CircleDollarSign,
      gradient: 'from-emerald-500/20 to-teal-500/20',
      borderGlow: 'group-hover:shadow-emerald-500/10',
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10',
      trend: '+8.2%',
      trendUp: true,
      highlight: true
    },
    {
      label: 'Transaksi Sukses',
      value: stats.successTransactions.toLocaleString(),
      icon: ShoppingBag,
      gradient: 'from-violet-500/20 to-purple-500/20',
      borderGlow: 'group-hover:shadow-violet-500/10',
      iconColor: 'text-violet-400',
      iconBg: 'bg-violet-500/10',
      trend: '+5.7%',
      trendUp: true
    },
    {
      label: 'Produk Aktif',
      value: stats.activeProducts.toString(),
      icon: Package,
      gradient: 'from-amber-500/20 to-orange-500/20',
      borderGlow: 'group-hover:shadow-amber-500/10',
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10',
      trend: 'Stabil',
      trendUp: true
    }
  ];

  const infraItems = [
    { label: 'Database Engine', value: 'Active MySQL', icon: Database, color: 'text-emerald-400', pulse: true },
    { label: 'Telegram Bot', value: 'Active grammY', icon: Bot, color: 'text-blue-400', pulse: true },
    { label: 'Payment Gate', value: 'SHA256 HMAC', icon: Shield, color: 'text-violet-400', pulse: false },
    { label: 'Supplier API', value: 'Digiflazz Online', icon: Globe, color: 'text-amber-400', pulse: true },
  ];

  return (
    <div className="space-y-8 animate-fadeIn text-[#f5f5f7]">

      {/* ── Hero Greeting Banner ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-[#1c1c1e] via-[#1a1a2e] to-[#16213e]">
        {/* Animated background orbs */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-violet-500/8 rounded-full blur-3xl" style={{ animation: 'pulse 4s ease-in-out infinite' }} />
        <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl" style={{ animation: 'pulse 6s ease-in-out infinite' }} />
        
        <div className="relative z-10 px-8 py-8 flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getGreetingEmoji()}</span>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                {getGreeting()}, Admin
              </h1>
            </div>
            <p className="text-[#86868b] text-sm font-medium max-w-md">
              Dashboard real-time Evo Game Store. Pantau penjualan, kelola stok, dan optimalkan performa toko Anda.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Sistem Online
              </span>
              <span className="text-[#86868b] text-xs font-mono">
                {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button 
              onClick={onRefresh}
              className="apple-pill-btn px-6 py-3 font-semibold active:scale-95 cursor-pointer flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <Zap className="w-4 h-4" />
              Segarkan Data
            </button>
          </div>
        </div>
      </div>

      {/* ── Stat Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div 
              key={i}
              className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#1c1c1e] p-6 transition-all duration-500 hover:border-white/[0.12] hover:shadow-2xl ${card.borderGlow} cursor-default`}
            >
              {/* Gradient overlay on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${card.iconBg} ${card.iconColor} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-semibold ${card.trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {card.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {card.trend}
                  </div>
                </div>
                <p className="text-[#86868b] text-xs font-semibold uppercase tracking-wider mb-1">{card.label}</p>
                <h3 className={`text-2xl font-bold tracking-tight ${card.highlight ? 'bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent' : 'text-white'}`}>
                  {card.value}
                </h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Charts + Infrastructure Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue + Transaction Composed Chart (2 cols) */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#1c1c1e] p-6 space-y-5">
          {/* Ambient glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-[17px] tracking-tight text-white">Analitik Penjualan</h3>
                  <p className="text-[#86868b] text-xs mt-0.5">Pendapatan & transaksi 7 hari terakhir</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-[#86868b]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2997ff]" />
                  Pendapatan
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-400" />
                  Transaksi
                </span>
              </div>
            </div>

            {/* Mini stat cards row */}
            <div className="grid grid-cols-3 gap-3 my-5">
              <div className="bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.04]">
                <p className="text-[#86868b] text-[10px] font-bold uppercase tracking-wider">Revenue 7D</p>
                <p className="text-white font-bold text-lg mt-0.5">Rp {totalChartRevenue.toLocaleString('id-ID')}</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.04]">
                <p className="text-[#86868b] text-[10px] font-bold uppercase tracking-wider">Transaksi 7D</p>
                <p className="text-white font-bold text-lg mt-0.5">{totalChartTx}</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.04]">
                <p className="text-[#86868b] text-[10px] font-bold uppercase tracking-wider">Rata-rata/Hari</p>
                <p className="text-white font-bold text-lg mt-0.5">Rp {avgDailyRevenue.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>

          <div className="h-[280px] w-full relative z-10">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2997ff" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2997ff" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="date" stroke="#86868b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#86868b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#86868b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar yAxisId="right" dataKey="transactions" name="Transaksi" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={28} />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" name="Pendapatan" stroke="#2997ff" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue2)" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                <BarChart3 className="w-10 h-10 text-slate-600" />
                <p className="italic text-sm">Belum ada transaksi sukses dalam 7 hari terakhir.</p>
              </div>
            )}
          </div>
        </div>

        {/* Infrastructure + Quick Actions Panel */}
        <div className="space-y-5">
          {/* Infrastructure Status */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#1c1c1e] p-6">
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-[15px] tracking-tight text-white">Status Infrastruktur</h3>
              </div>
              
              <div className="space-y-1">
                {infraItems.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                        <span className="text-[#a1a1a6] text-[13px] font-medium">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.pulse && (
                          <span className="relative flex h-2 w-2">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${item.color === 'text-emerald-400' ? 'bg-emerald-400' : item.color === 'text-blue-400' ? 'bg-blue-400' : 'bg-amber-400'}`} />
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${item.color === 'text-emerald-400' ? 'bg-emerald-400' : item.color === 'text-blue-400' ? 'bg-blue-400' : 'bg-amber-400'}`} />
                          </span>
                        )}
                        <span className={`text-xs font-semibold ${item.color}`}>{item.value}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#1c1c1e] p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-[15px] tracking-tight text-white">Ringkasan Cepat</h3>
            </div>
            
            <div className="space-y-2.5">
              <div className="flex items-center justify-between bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.04] group hover:border-blue-500/20 transition-all cursor-default">
                <div className="flex items-center gap-3">
                  <Wallet className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-white text-xs font-semibold">Antrean Aktif</p>
                    <p className="text-[#86868b] text-[10px]">Menunggu diproses</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-blue-400">{stats.pendingTransactions.length}</span>
              </div>
              
              <div className="flex items-center justify-between bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.04] group hover:border-emerald-500/20 transition-all cursor-default">
                <div className="flex items-center gap-3">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="text-white text-xs font-semibold">Produk Aktif</p>
                    <p className="text-[#86868b] text-[10px]">Siap dijual</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-emerald-400">{stats.activeProducts}</span>
              </div>

              <div className="flex items-center justify-between bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.04] group hover:border-violet-500/20 transition-all cursor-default">
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-violet-400" />
                  <div>
                    <p className="text-white text-xs font-semibold">Total Member</p>
                    <p className="text-[#86868b] text-[10px]">Terdaftar di bot</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-violet-400">{stats.totalUsers}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Pending Transactions Table ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#1c1c1e] p-6">
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-[17px] tracking-tight text-white">Antrean Transaksi Aktif</h3>
                <p className="text-[#86868b] text-xs mt-0.5">
                  {stats.pendingTransactions.length > 0 
                    ? `${stats.pendingTransactions.length} pesanan menunggu pemrosesan` 
                    : 'Semua pesanan telah diproses'}
                </p>
              </div>
            </div>
            {stats.pendingTransactions.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse">
                <Clock className="w-3 h-3" />
                {stats.pendingTransactions.length} Pending
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="p-4 text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Ref ID</th>
                  <th className="p-4 text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Member</th>
                  <th className="p-4 text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Kategori / Produk</th>
                  <th className="p-4 text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Target</th>
                  <th className="p-4 text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Total Bayar</th>
                  <th className="p-4 text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Pembayaran</th>
                  <th className="p-4 text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="text-slate-300 font-medium">
                {stats.pendingTransactions.length > 0 ? (
                  stats.pendingTransactions.map((tx, idx) => (
                    <tr 
                      key={tx.id} 
                      className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <td className="p-4">
                        <span className="font-mono text-xs bg-white/[0.04] px-2 py-1 rounded-md border border-white/[0.06]">
                          {tx.refId.length > 12 ? tx.refId.slice(0, 12) + '…' : tx.refId}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(tx.user?.name || tx.telegramId || '?')[0].toUpperCase()}
                          </div>
                          <span className="font-semibold text-white text-sm">{tx.user?.name || tx.telegramId}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white text-sm">{tx.gameName}</div>
                        <div className="text-[11px] text-[#86868b] mt-0.5">{tx.productName}</div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono bg-white/[0.04] border border-white/[0.06] text-white px-2.5 py-1 rounded-lg text-xs">
                          {tx.targetId}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-bold bg-gradient-to-r from-blue-300 to-cyan-200 bg-clip-text text-transparent">
                          Rp {tx.amount.toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {tx.paymentStatus}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          tx.orderStatus === 'PROCESSING' 
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/15' 
                            : tx.orderStatus === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/15'
                            : 'bg-white/5 text-white border-white/10'
                        }`}>
                          {tx.orderStatus === 'PROCESSING' && (
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-400" />
                            </span>
                          )}
                          {tx.orderStatus === 'PENDING' && (
                            <Clock className="w-3 h-3" />
                          )}
                          {tx.orderStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                          <Sparkles className="w-7 h-7 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">Semua Pesanan Selesai!</p>
                          <p className="text-[#86868b] text-xs mt-1">Antrean kosong. Semua pesanan H2H dan Manual sukses diproses.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
