# NEXORA Production Deployment, Razorpay & Admin Guide

## 1. Razorpay Payment Integration Setup

1. Create a Razorpay account at [dashboard.razorpay.com](https://dashboard.razorpay.com) and navigate to **Settings -> API Keys**.
2. Generate your Test or Live `Key ID` and `Key Secret`.
3. Add them to your server environment variables (never expose `RAZORPAY_KEY_SECRET` to the client):
   ```env
   RAZORPAY_KEY_ID="rzp_live_your_key_id"
   RAZORPAY_KEY_SECRET="your_secret_key"
   ```
4. **How Checkout Verification Works**:
   - Customer clicks **Buy Now** or **Checkout** -> `POST /api/payments/create-order` creates an order via Razorpay REST API (`/v1/orders`) and records a `pending` order in SQL.
   - Frontend opens Razorpay Checkout (`window.Razorpay`) with the returned `razorpayOrderId`.
   - On payment success, the client posts `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` to `POST /api/payments/verify`.
   - Backend computes `HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET)` and compares with `crypto.timingSafeEqual`.
   - Only upon cryptographic match does the server mark the order `paid`, insert `download_permissions`, increment `sales_count`, and dispatch the confirmation email.
5. **Sandbox Mode**: When `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are unset or placeholders, NEXORA runs an end-to-end HMAC-verified sandbox checkout modal so you can test the full purchase, email receipt, and private PDF download flow without live credentials.

## 2. Admin Dashboard Setup & Security

- **Route**: `/admin`
- **Default Admin Account (Seeded on Boot)**:
  - Email: `admin@nexora.digital`
  - Password: `NexoraAdmin@2026`
- Immediately change the admin password after first login or create a dedicated admin row in the `users` table with `role = 'admin'`.
- All `/api/admin/*` endpoints verify the signed HTTP-only `nexora_session` cookie and enforce `role === 'admin'`. Passwords are salted and hashed with `crypto.scryptSync`.

## 3. Private File Storage & Secure PDF Delivery

- Uploaded paid PDFs and digital archives are stored inside `storage/private/` (never mounted via `express.static`).
- When a buyer clicks **Download** inside `/downloads`, the frontend requests a 5-minute HMAC-signed token from `POST /api/downloads/:permissionId/token`.
- `GET /api/downloads/file/:token` validates the HMAC signature, expiration timestamp, and `download_count < max_downloads` before streaming the file with `Content-Disposition: attachment` and `Cache-Control: no-store`.

## 4. Cloudflare + Supabase Production Deployment Guide

1. **Database**: Create a Supabase PostgreSQL project and execute `supabase/migrations/001_initial_schema.sql` in the SQL Editor. Create a **Private** storage bucket named `private-digital-assets` and a **Public** bucket named `product-media`.
2. **Cloudflare Pages / Workers**:
   - Connect your repository to Cloudflare Pages (`npm run build`).
   - Configure Edge / Node compatibility (`nodejs_compat` flag in `wrangler.toml`) and store `RAZORPAY_KEY_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, and `SMTP_PASS` as encrypted Cloudflare Secrets (`wrangler secret put`).
3. **Database Backups Strategy**:
   - Enable Supabase automated daily Point-in-Time Recovery (PITR) backups.
   - For local/SQLite deployments (`data/nexora.db`), schedule an hourly `sqlite3 data/nexora.db ".backup '/backups/nexora-$(date +%F-%H).db'"` cron job synced to Cloudflare R2 or S3 with 30-day retention.
