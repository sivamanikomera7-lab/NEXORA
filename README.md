# NEXORA — Premium Digital Products E-Commerce Platform

**Tagline:** *Digital Products. Unlimited Possibilities.*

NEXORA is a full-stack digital products storefront and glassmorphism administration console built for selling ebooks, PDF guides, UI templates, engineering courses, and downloadable asset packs with Razorpay payment verification and private signed file delivery.

## Key Capabilities

- **Customer Storefront (13 Complete Pages)**: Home, Shop All Products (live search, category filters, sorting), Product Details (sticky gallery, interactive preview modal, Buy Now & Cart), About NEXORA, Contact Us, FAQ, Login / Register, My Account, My Orders (with confirmation email receipts), Download Library, Privacy Policy, Terms & Conditions, and Refund Policy.
- **Razorpay Payment Verification Pipeline**: Server-side order creation (`POST /api/payments/create-order`), HMAC-SHA256 cryptographic signature verification (`POST /api/payments/verify`), coupon code validation, and automatic download permission provisioning.
- **Private Digital Asset Vault**: Paid PDFs and archives are stored outside public web roots (`storage/private/`) and delivered exclusively via short-lived 5-minute HMAC-signed download tokens.
- **Protected Admin Console (`/admin`)**: Role-based admin authentication (`role = 'admin'`), real-time revenue KPIs & daily/weekly/monthly charts, product CRUD with image & private PDF upload, category management, order & download tracking, customer purchase histories, coupon management, and live website settings editor.

## Project Structure

```text
├── server.ts                          # Express API server + Vite SSR/SPA middleware
├── src/
│   ├── server/
│   │   ├── auth.ts                    # scrypt hashing, HTTP-only signed sessions, RBAC, signed download tokens
│   │   ├── db.ts                      # SQLite schema, WAL setup, and seed data
│   │   ├── pdf.ts                     # Private PDF generator for seeded catalog assets
│   │   └── razorpay.ts                # Razorpay order API, HMAC verification & Nodemailer receipts
│   ├── context/AppContext.tsx         # Auth, cart, settings, toast & client router state
│   ├── components/                    # Navbar, Footer, ProductCard, CartDrawer, RazorpayCheckoutModal, RevenueChart
│   ├── pages/                         # 13 Customer pages + AdminDashboard (/admin)
│   └── lib/                           # Image asset registry & currency/date formatters
├── supabase/migrations/
│   └── 001_initial_schema.sql         # PostgreSQL / Supabase schema & RLS policies
├── docs/DEPLOYMENT.md                 # Razorpay, Admin, Backup & Cloudflare deployment guide
└── .env.example                       # Required environment variable template
```

## Quick Start

1. Copy `.env.example` to `.env` and fill in your secrets (optional in local sandbox mode).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run development server on port 3000:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   npm start
   ```

## Default Test Credentials

- **Admin Console (`/admin`)**: `admin@nexora.digital` / `NexoraAdmin@2026`
- **Customer Account (`/login`)**: `alex.mercer@nexora.demo` / `Customer@123`
- **Sample Coupon Codes**: `NEXORA20` (20% off), `LAUNCH15` (15% off), `SAVE300` (₹300 off orders above ₹1,200)
