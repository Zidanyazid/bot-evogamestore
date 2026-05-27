import React, { useState } from 'react';
import { 
  Megaphone, 
  Send, 
  Image as ImageIcon, 
  Smile, 
  FileText,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface BroadcastProps {
  adminPassword: string;
}

export const BroadcastView: React.FC<BroadcastProps> = ({ adminPassword }) => {
  const [message, setMessage] = useState('');
  const [mediaType, setMediaType] = useState('text'); // text, photo, sticker
  const [imageUrn, setImageUrn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{
    success: boolean;
    total: number;
    successCount: number;
    failCount: number;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message && mediaType === 'text') {
      alert('Harap isi pesan broadcast!');
      return;
    }
    if ((mediaType === 'photo' || mediaType === 'sticker') && !imageUrn) {
      alert('Harap masukkan URL gambar atau ID/URL sticker!');
      return;
    }

    if (!confirm('Apakah Anda yakin ingin mengirim broadcast massal ke SEMUA pengguna bot Telegram?')) return;

    setIsLoading(true);
    setBroadcastResult(null);

    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword
        },
        body: JSON.stringify({ message, imageUrn, mediaType })
      });
      const data = await res.json();
      if (data.success) {
        setBroadcastResult(data);
        setMessage('');
        setImageUrn('');
      } else {
        alert(`Gagal mengirim broadcast: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      alert('Koneksi terputus saat memproses broadcast.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn text-[#f5f5f7]">
      {/* Configuration Form */}
      <div className="apple-store-card p-6 lg:col-span-2 space-y-6">
        <div className="flex items-center gap-2 text-white pb-4 border-b border-white/5">
          <Megaphone className="w-5 h-5 text-[#2997ff]" />
          <h3 className="font-semibold text-[17px] tracking-tight-display">Buat Pesan Siaran Massal (Broadcast)</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Media Type Selector */}
          <div>
            <label className="block text-slate-500 text-xs font-semibold mb-3">TIPE BROADCAST MEDIA</label>
            <div className="grid grid-cols-3 gap-4">
              <button 
                type="button"
                onClick={() => setMediaType('text')}
                className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 border font-bold text-xs transition-all cursor-pointer ${
                  mediaType === 'text' 
                    ? 'bg-[#2997ff]/10 text-[#2997ff] border-[#2997ff]/20' 
                    : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/10'
                }`}
              >
                <FileText className="w-4 h-4" />
                Hanya Teks
              </button>

              <button 
                type="button"
                onClick={() => setMediaType('photo')}
                className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 border font-bold text-xs transition-all cursor-pointer ${
                  mediaType === 'photo' 
                    ? 'bg-[#2997ff]/10 text-[#2997ff] border-[#2997ff]/20' 
                    : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/10'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                Foto + Teks
              </button>

              <button 
                type="button"
                onClick={() => setMediaType('sticker')}
                className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 border font-bold text-xs transition-all cursor-pointer ${
                  mediaType === 'sticker' 
                    ? 'bg-[#2997ff]/10 text-[#2997ff] border-[#2997ff]/20' 
                    : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/10'
                }`}
              >
                <Smile className="w-4 h-4" />
                Sticker / GIF
              </button>
            </div>
          </div>

          {/* Media URL Input */}
          {mediaType !== 'text' && (
            <div>
              <label className="block text-slate-500 text-xs font-semibold mb-2">
                {mediaType === 'photo' ? 'URL FOTO (Link gambar publik, contoh .png / .jpg)' : 'ID STICKER / URL STICKER'}
              </label>
              <input 
                type="text"
                placeholder={mediaType === 'photo' ? 'https://link-gambar.com/banner-promo.jpg' : 'CAACAgIAAxkBAAE...'}
                value={imageUrn}
                onChange={(e) => setImageUrn(e.target.value)}
                className="apple-input w-full font-mono text-xs"
              />
            </div>
          )}

          {/* Message Text Area */}
          <div>
            <label className="block text-slate-500 text-xs font-semibold mb-2">ISI PESAN (Mendukung Markdown Telegram)</label>
            <textarea 
              rows={8}
              placeholder={`*Promo Spesial Hari Ini!* \n\nDapatkan diskon Canva Pro termurah hanya hari ini di Evo Game Store. \n\n_Gunakan tombol di bawah untuk beli._`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl outline-none text-white focus:border-[#2997ff] transition-colors font-medium resize-y"
            />
          </div>

          {/* Warning banner */}
          <div className="flex gap-2.5 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="text-xs font-semibold leading-relaxed">
              Penting: Mengirim pesan siaran massal memerlukan beberapa detik untuk memproses pengiriman ke seluruh database pengguna. Jangan menutup dashboard ini saat pengiriman berlangsung!
            </div>
          </div>

          {/* Submit Action */}
          <button 
            type="submit"
            disabled={isLoading}
            className="apple-pill-btn w-full py-3.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sedang Mengirim Siaran...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Kirim Siaran Sekarang
              </>
            )}
          </button>
        </form>
      </div>

      {/* Broadcast Delivery Report */}
      <div className="apple-store-card p-6 flex flex-col justify-between h-fit space-y-6">
        <div>
          <div className="flex items-center gap-2 text-white pb-4 border-b border-white/5">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-[17px] tracking-tight-display">Hasil Laporan Siaran</h3>
          </div>

          {broadcastResult ? (
            <div className="mt-6 space-y-4 font-semibold text-sm">
              <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                <span className="text-slate-400">Total Pengguna Terdaftar</span>
                <span className="text-white font-bold">{broadcastResult.total}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                <span className="text-slate-400">Berhasil Terkirim</span>
                <span className="text-emerald-400 font-bold">{broadcastResult.successCount} users</span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-slate-400">Gagal / User Blokir Bot</span>
                <span className="text-red-400 font-bold">{broadcastResult.failCount} users</span>
              </div>

              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 text-xs mt-6 leading-relaxed">
                Siaran massal telah selesai dikirim secara real-time ke seluruh database bot Telegram.
              </div>
            </div>
          ) : (
            <div className="mt-8 text-center text-slate-500 italic text-sm py-12">
              Belum ada laporan siaran terbaru. Silakan kirim siaran massal untuk memantau status pengiriman.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
