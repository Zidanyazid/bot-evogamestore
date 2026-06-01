# 🎮 Evo Game Store — Telegram Bot

Telegram bot untuk top-up game & produk digital berbayar (voucher, akun premium, dll) dengan pembayaran QRIS otomatis via Tripay dan fulfillment via Digiflazz.

## ✨ Features

- **Telegram Bot** — Interface utama via chat (`/start`, browsing katalog, order)
- **QRIS Payment** — Pembayaran otomatis via Tripay (QRIS, VA, e-wallet)
- **Auto Top-up H2H** — Fulfillment otomatis via Digiflazz untuk produk game
- **Manual Stock** — Support produk manual (akun premium, voucher) dengan stok mandiri
- **Deposit Saldo** — User bisa deposit ke wallet, saldo tercatat otomatis
- **Admin Panel** — Dashboard web untuk manage produk, stok, transaksi, user
- **Voucher & Diskon** — Sistem voucher dengan batas pemakaian
- **Blacklist** — Block user nakal
- **Broadcast** — Kirim pesan ke semua user
- **Webhook** — Callback real-time dari Tripay & Digiflazz

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22+ |
| Language | TypeScript |
| Bot Framework | [grammY](https://grammy.dev/) (Telegram Bot API) |
| Database | MySQL 8.0 + Prisma ORM |
| Payment | [Tripay](https://tripay.co.id) |
| Supplier | [Digiflazz](https://digiflazz.com) (H2H top-up) |
| Web Server | Express.js |
| Process Manager | PM2 |
| Admin Panel | React + Vite + Tailwind CSS |

## 📋 Prerequisites

- Node.js >= 18
- MySQL 8.0+
- Telegram Bot Token (dari [@BotFather](https://t.me/BotFather))
- Tripay merchant account ([tripay.co.id](https://tripay.co.id))
- Digiflazz reseller account ([digiflazz.com](https://digiflazz.com))
- Domain + SSL (untuk webhook)

## 🚀 Installation

```bash
# 1. Clone repository
git clone https://github.com/Zidanyazid/bot-evogamestore.git
cd bot-evogamestore

# 2. Install dependencies
npm ci

# 3. Install admin panel dependencies
cd src/web/admin && npm ci && cd ../../..

# 4. Copy .env template
cp .env.example .env

# 5. Edit .env dengan kredensial Anda
nano .env

# 6. Generate Prisma Client
npx prisma generate

# 7. Push database schema
npx prisma db push

# 8. Build TypeScript + Admin Panel
npm run build:all

# 9. Start dengan PM2
pm2 start ecosystem.config.js
pm2 save
```

## ⚙️ Environment Variables

Salin `.env.example` menjadi `.env` dan isi:

| Variable | Description |
|----------|------------|
| `PORT` | Port Express server (default: `3000`) |
| `TELEGRAM_BOT_TOKEN` | Token dari @BotFather |
| `DATABASE_URL` | MySQL connection string |
| `TRIPAY_API_KEY` | API Key dari dashboard Tripay |
| `TRIPAY_PRIVATE_KEY` | Private Key dari dashboard Tripay |
| `TRIPAY_MERCHANT_CODE` | Kode merchant Tripay |
| `DIGIFLAZZ_USERNAME` | Username Digiflazz |
| `DIGIFLAZZ_API_KEY` | API Key Digiflazz |
| `WEBHOOK_URL` | Domain production (tanpa trailing slash) |
| `NODE_ENV` | `production` atau `development` |

## 🔗 Webhook URLs

Setelah deploy, daftarkan URL berikut di dashboard masing-masing:

| Service | Webhook URL |
|---------|------------|
| **Tripay** | `https://domain-anda.com/webhooks/tripay` |
| **Digiflazz** | `https://domain-anda.com/webhooks/digiflazz` |

## 📁 Project Structure

```
bot-evogamestore/
├── src/
│   ├── index.ts              # Entry point
│   ├── config/
│   │   └── env.ts            # Environment config
│   ├── db/
│   │   └── client.ts         # Prisma client
│   ├── services/
│   │   ├── tripay.ts         # Tripay payment gateway
│   │   └── digiflazz.ts      # Digiflazz H2H supplier
│   ├── bot/
│   │   ├── context.ts        # grammY context types
│   │   ├── commands/
│   │   │   ├── start.ts      # /start command
│   │   │   ├── profile.ts    # User profile & balance
│   │   │   └── deposit.ts    # Deposit saldo flow
│   │   └── handlers/
│   │       └── orderFlow.ts  # Product browsing & order
│   └── web/
│       ├── server.ts         # Express API + webhooks
│       ├── admin/            # Admin panel (React + Vite)
│       └── public/           # Built admin panel output
├── prisma/
│   └── schema.prisma         # Database schema
├── ecosystem.config.js       # PM2 config
├── package.json
└── tsconfig.json
```

## 🗄 Database Schema

| Table | Description |
|-------|------------|
| `users` | Telegram users (balance, role) |
| `transactions` | Semua transaksi (deposit + order) |
| `products` | Katalog produk (H2H + manual) |
| `stock_items` | Stok akun/voucher manual |
| `vouchers` | Kode voucher & diskon |
| `categories` | Kategori produk |
| `blacklist` | User yang diblokir |
| `settings` | Key-value app settings |

## 🔐 Payment Flow

```
User pilih produk
    ↓
Bot generate invoice → Tripay API (POST /transaction/create)
    ↓
User bayar via QRIS/VA
    ↓
Tripay callback → POST /webhooks/tripay
    ↓
Bot verifikasi signature (HMAC-SHA256)
    ↓
┌─ H2H Product → Kirim order ke Digiflazz → Auto top-up
├─ Manual Product → Kurangi stok → Kirim akun/voucher
└─ Deposit → Tambah saldo user
```

## 🖥 Admin Panel

Akses di `https://domain-anda.com/admin`

Features:
- Dashboard statistik (revenue, transaksi, user)
- CRUD produk & stok
- Manajemen user (role, balance)
- Riwayat transaksi
- Voucher management
- Blacklist management
- Broadcast pesan
- Settings & maintenance mode

## 📜 Scripts

```bash
npm run dev              # Development (tsx watch)
npm run build            # Build TypeScript
npm run build:admin      # Build admin panel (Vite)
npm run build:all        # Build semua
npm run start            # Start production (node dist/index.js)
npm run prisma:generate  # Generate Prisma client
npm run prisma:push      # Push schema ke database
npm run prisma:studio    # Buka Prisma Studio (DB browser)
```

## 📄 License

Private — © 2026 Evo Game Store
