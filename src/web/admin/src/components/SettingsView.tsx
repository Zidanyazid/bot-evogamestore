import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Store,
  MessageSquare,
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Power,
  ToggleLeft,
  ToggleRight,
  Wrench
} from 'lucide-react';

interface SettingsProps {
  adminPassword: string;
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsProps> = ({ adminPassword, onRefresh }) => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  // Local form states
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [storeName, setStoreName] = useState('');

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Admin-Password': adminPassword
  });

  // Fetch all settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/settings', { headers: getHeaders() });
      const data = await res.json();
      setSettings(data);
      setMaintenanceMode(data.maintenanceMode === 'true');
      setMaintenanceMessage(data.maintenanceMessage || '');
      setStoreName(data.storeName || '');
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Save a single setting
  const saveSetting = async (key: string, value: string) => {
    setSavingKey(key);
    setSavedKey(null);
    try {
      const res = await fetch(`/api/admin/settings/${key}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ value })
      });
      const data = await res.json();
      if (data.success) {
        setSavedKey(key);
        setTimeout(() => setSavedKey(null), 2500);
        // Update local state
        setSettings(prev => ({ ...prev, [key]: value }));
      }
    } catch (err) {
      console.error('Failed to save setting:', err);
    } finally {
      setSavingKey(null);
    }
  };

  // Toggle maintenance mode
  const handleMaintenanceToggle = async () => {
    const newValue = !maintenanceMode;
    setMaintenanceMode(newValue);
    await saveSetting('maintenanceMode', String(newValue));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#86868b]">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span className="text-sm font-medium">Memuat pengaturan...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn text-[#f5f5f7] max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400">
            <Settings className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan Sistem</h1>
        </div>
        <p className="text-[#86868b] text-sm ml-[52px]">
          Kelola konfigurasi bot dan sistem toko Anda.
        </p>
      </div>

      {/* ── Maintenance Mode Card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#1c1c1e]">
        {/* Glow when active */}
        {maintenanceMode && (
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        )}

        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl transition-colors duration-300 ${
                maintenanceMode ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
              }`}>
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-[17px] tracking-tight text-white">Mode Pemeliharaan</h3>
                <p className="text-[#86868b] text-xs mt-0.5">
                  {maintenanceMode 
                    ? 'Bot sedang dinonaktifkan untuk semua pengguna (kecuali Admin)' 
                    : 'Bot aktif dan melayani semua pengguna'}
                </p>
              </div>
            </div>

            {/* Premium Toggle Switch */}
            <button
              onClick={handleMaintenanceToggle}
              disabled={savingKey === 'maintenanceMode'}
              className="relative cursor-pointer active:scale-95 transition-transform disabled:opacity-50"
              aria-label="Toggle maintenance mode"
            >
              {savingKey === 'maintenanceMode' ? (
                <Loader2 className="w-6 h-6 animate-spin text-[#86868b]" />
              ) : (
                <div className={`w-[52px] h-[32px] rounded-full transition-all duration-300 flex items-center px-[3px] ${
                  maintenanceMode 
                    ? 'bg-amber-500 shadow-lg shadow-amber-500/30' 
                    : 'bg-white/10'
                }`}>
                  <div className={`w-[26px] h-[26px] rounded-full bg-white shadow-md transition-transform duration-300 ${
                    maintenanceMode ? 'translate-x-[20px]' : 'translate-x-0'
                  }`} />
                </div>
              )}
            </button>
          </div>

          {/* Status Banner */}
          <div className={`rounded-xl px-4 py-3 border transition-all duration-300 ${
            maintenanceMode
              ? 'bg-amber-500/5 border-amber-500/15'
              : 'bg-emerald-500/5 border-emerald-500/15'
          }`}>
            <div className="flex items-center gap-2.5">
              {maintenanceMode ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-amber-400 text-sm font-semibold">Maintenance Mode Aktif</p>
                    <p className="text-amber-400/60 text-xs mt-0.5">
                      Semua pesan dari pengguna akan diblokir. User dengan role ADMIN tetap bisa menggunakan bot.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-emerald-400 text-sm font-semibold">Sistem Online</p>
                    <p className="text-emerald-400/60 text-xs mt-0.5">
                      Bot berjalan normal dan melayani semua pengguna.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {savedKey === 'maintenanceMode' && (
            <div className="flex items-center gap-1.5 mt-3 text-emerald-400 text-xs font-semibold animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Pengaturan berhasil disimpan
            </div>
          )}
        </div>
      </div>

      {/* ── Maintenance Message Card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#1c1c1e] p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-[17px] tracking-tight text-white">Pesan Pemeliharaan</h3>
            <p className="text-[#86868b] text-xs mt-0.5">
              Pesan yang akan ditampilkan ke pengguna saat maintenance mode aktif.
            </p>
          </div>
        </div>

        <textarea
          value={maintenanceMessage}
          onChange={(e) => setMaintenanceMessage(e.target.value)}
          rows={3}
          placeholder="Masukkan pesan pemeliharaan..."
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm p-4 outline-none focus:border-blue-500/40 transition-colors resize-none font-medium placeholder:text-slate-600"
        />

        <div className="flex items-center justify-between mt-4">
          {savedKey === 'maintenanceMessage' && (
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Pesan berhasil disimpan
            </div>
          )}
          <div className="flex-1" />
          <button
            onClick={() => saveSetting('maintenanceMessage', maintenanceMessage)}
            disabled={savingKey === 'maintenanceMessage'}
            className="apple-pill-btn px-5 py-2.5 text-xs font-semibold cursor-pointer active:scale-95 flex items-center gap-2 disabled:opacity-50"
          >
            {savingKey === 'maintenanceMessage' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Simpan Pesan
          </button>
        </div>
      </div>

      {/* ── Store Name Card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#1c1c1e] p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-[17px] tracking-tight text-white">Nama Toko</h3>
            <p className="text-[#86868b] text-xs mt-0.5">
              Nama brand toko yang ditampilkan di bot dan dashboard.
            </p>
          </div>
        </div>

        <input
          type="text"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="Masukkan nama toko..."
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm px-4 py-3 outline-none focus:border-cyan-500/40 transition-colors font-semibold placeholder:text-slate-600"
        />

        <div className="flex items-center justify-between mt-4">
          {savedKey === 'storeName' && (
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Nama toko berhasil disimpan
            </div>
          )}
          <div className="flex-1" />
          <button
            onClick={() => saveSetting('storeName', storeName)}
            disabled={savingKey === 'storeName'}
            className="apple-pill-btn px-5 py-2.5 text-xs font-semibold cursor-pointer active:scale-95 flex items-center gap-2 disabled:opacity-50"
          >
            {savingKey === 'storeName' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Simpan
          </button>
        </div>
      </div>

      {/* ── Danger Zone Card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-red-500/10 bg-[#1c1c1e] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-[17px] tracking-tight text-white">Zona Berbahaya</h3>
            <p className="text-[#86868b] text-xs mt-0.5">
              Tindakan yang memerlukan perhatian ekstra.
            </p>
          </div>
        </div>

        <div className="bg-red-500/[0.03] border border-red-500/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-semibold">Reset Semua Pengaturan</p>
              <p className="text-[#86868b] text-xs mt-0.5">Mengembalikan semua pengaturan ke default.</p>
            </div>
            <button
              onClick={async () => {
                if (!confirm('Apakah Anda yakin ingin mereset semua pengaturan ke default?')) return;
                await saveSetting('maintenanceMode', 'false');
                await saveSetting('maintenanceMessage', '🔧 Bot sedang dalam mode pemeliharaan. Silakan coba beberapa saat lagi.');
                await saveSetting('storeName', 'Evo Game Store');
                setMaintenanceMode(false);
                setMaintenanceMessage('🔧 Bot sedang dalam mode pemeliharaan. Silakan coba beberapa saat lagi.');
                setStoreName('Evo Game Store');
              }}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-xl text-xs transition-colors cursor-pointer active:scale-95 border border-red-500/15"
            >
              Reset Default
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
