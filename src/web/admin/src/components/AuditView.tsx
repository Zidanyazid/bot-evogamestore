import React, { useState } from 'react';
import { 
  Search, 
  Calendar,
  ExternalLink
} from 'lucide-react';

interface Transaction {
  id: string;
  refId: string;
  telegramId: string;
  productCode: string;
  productName: string;
  gameName: string;
  targetId: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  paymentLink?: string;
  sn?: string;
  createdAt: string;
}

interface AuditProps {
  transactions: Transaction[];
}

export const AuditView: React.FC<AuditProps> = ({ transactions }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filters transactions
  const filteredTx = transactions.filter(tx => 
    tx.refId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.targetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.gameName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn text-[#f5f5f7]">
      {/* Search Bar - Apple search-input style */}
      <div className="flex gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Cari Ref ID, Target, atau Produk..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="apple-input w-full pl-12"
          />
        </div>
      </div>

      {/* Audit Log Table - Apple styled utility grid */}
      <div className="apple-store-card p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-white/5 text-[#86868b] font-semibold">
                <th className="p-4 text-xs uppercase tracking-wider">Ref ID</th>
                <th className="p-4 text-xs uppercase tracking-wider">Target Account</th>
                <th className="p-4 text-xs uppercase tracking-wider">Kategori / Produk</th>
                <th className="p-4 text-xs uppercase tracking-wider">Total Bayar</th>
                <th className="p-4 text-xs uppercase tracking-wider">Metode</th>
                <th className="p-4 text-xs uppercase tracking-wider">Pembayaran</th>
                <th className="p-4 text-xs uppercase tracking-wider">Status Order</th>
                <th className="p-4 text-xs uppercase tracking-wider">SN / Receipt (Voucher)</th>
                <th className="p-4 text-xs uppercase tracking-wider">Waktu Transaksi</th>
              </tr>
            </thead>
            <tbody className="text-slate-300 font-medium">
              {filteredTx.length > 0 ? (
                filteredTx.map(tx => (
                  <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono text-xs">
                      <div className="flex items-center gap-1.5 text-white">
                        {tx.refId}
                        {tx.paymentLink && (
                          <a 
                            href={tx.paymentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#2997ff] hover:text-[#2997ff]/80 transition-colors"
                            title="Buka Link Invoice"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-mono bg-white/5 border border-white/10 text-white px-2.5 py-1 rounded-md text-xs">
                        {tx.targetId}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-white">{tx.gameName}</div>
                      <div className="text-xs text-[#86868b] mt-0.5">{tx.productName}</div>
                    </td>
                    <td className="p-4 font-bold text-white">Rp {tx.amount.toLocaleString('id-ID')}</td>
                    <td className="p-4">
                      <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-white/5 text-slate-300 border border-white/10">
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${
                        tx.paymentStatus === 'PAID' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {tx.paymentStatus}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${
                        tx.orderStatus === 'SUCCESS' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : tx.orderStatus === 'FAILED' 
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/20 animate-pulse'
                      }`}>
                        {tx.orderStatus}
                      </span>
                    </td>
                    <td className="p-4">
                      {tx.sn ? (
                        <span 
                          className="font-mono text-xs max-w-[160px] truncate block text-slate-300 bg-slate-900 border border-slate-800/80 px-2 py-1.5 rounded"
                          title={tx.sn}
                        >
                          {tx.sn}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs italic">Menunggu...</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-450 text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(tx.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500 font-medium italic">
                    Belum ada riwayat transaksi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
