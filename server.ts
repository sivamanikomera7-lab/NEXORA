import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import {
  clearSessionCookie,
  createSessionToken,
  createSignedDownloadToken,
  hashPassword,
  optionalAuth,
  requireAdmin,
  requireAuth,
  setSessionCookie,
  verifyPassword,
  verifySignedDownloadToken,
  type AuthedRequest,
} from './src/server/auth.ts';
import { db, initDatabase, privateStorageDir, publicUploadsDir } from './src/server/db.ts';
import { ensurePrivatePdfFile } from './src/server/pdf.ts';
import {
  createRazorpayOrder,
  dispatchOrderConfirmationEmail,
  generateSandboxPaymentSignature,
  getPublicRazorpayKey,
  isLiveRazorpayConfigured,
  verifyRazorpaySignature,
} from './src/server/razorpay.ts';

dotenv.config();
initDatabase();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '4mb' }));
app.use(cookieParser());

// Serve ONLY public uploaded product images and logos (NEVER storage/private)
app.use('/uploads', express.static(publicUploadsDir));

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, publicUploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.png';
      cb(null, `img-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const privateAssetUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, privateStorageDir),
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${safeName}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitizePublicProduct(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    subtitle: row.subtitle,
    description: row.description,
    price: row.price,
    discount_price: row.discount_price,
    category_id: row.category_id,
    category_name: row.category_name,
    category_slug: row.category_slug,
    image_url: row.image_url,
    file_name: row.file_name,
    file_format: row.file_format,
    file_size_label: row.file_size_label,
    pages_or_duration: row.pages_or_duration,
    preview_excerpt: row.preview_excerpt,
    highlights: typeof row.highlights_json === 'string' ? JSON.parse(row.highlights_json) : [],
    is_featured: Boolean(row.is_featured),
    is_bestseller: Boolean(row.is_bestseller),
    is_new_arrival: Boolean(row.is_new_arrival),
    is_published: Boolean(row.is_published),
    sales_count: row.sales_count,
    created_at: row.created_at,
  };
}

// ---------- Health & Public Settings ----------
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'nexora-api' });
});

app.get('/nexora-source.zip', (_req, res) => {
  const zipPath = path.resolve(process.cwd(), 'storage', 'nexora-source.zip');
  if (!fs.existsSync(zipPath)) {
    res.status(404).json({ error: 'Source archive not found.' });
    return;
  }
  res.setHeader('Content-Disposition', 'attachment; filename="nexora-source.zip"');
  res.setHeader('Content-Type', 'application/zip');
  res.sendFile(zipPath);
});

app.get('/api/settings', (_req, res) => {
  const settings = db.prepare('SELECT * FROM site_settings WHERE id = 1').get();
  res.json(settings);
});

// ---------- Authentication & Profile ----------
app.get('/api/auth/me', optionalAuth, (req: AuthedRequest, res) => {
  if (!req.authUser) {
    res.json({ user: null });
    return;
  }
  const user = db
    .prepare('SELECT id, name, email, role, phone, company, created_at FROM users WHERE id = ?')
    .get(req.authUser.uid);
  res.json({ user: user || null });
});

app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, phone = '', company = '' } = req.body || {};
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const result = db
      .prepare('INSERT INTO users (name, email, password_hash, role, phone, company) VALUES (?, ?, ?, ?, ?, ?)')
      .run(String(name).trim(), normalizedEmail, hashPassword(String(password)), 'customer', String(phone), String(company));

    const userId = Number(result.lastInsertRowid);
    const token = createSessionToken({ uid: userId, email: normalizedEmail, role: 'customer' });
    setSessionCookie(res, token);

    const user = db
      .prepare('SELECT id, name, email, role, phone, company, created_at FROM users WHERE id = ?')
      .get(userId);
    res.status(201).json({ user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password, requireAdminRole } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as
      | {
          id: number;
          name: string;
          email: string;
          password_hash: string;
          role: 'customer' | 'admin';
          phone: string;
          company: string;
          created_at: string;
        }
      | undefined;

    if (!userRow || !verifyPassword(String(password), userRow.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    if (requireAdminRole && userRow.role !== 'admin') {
      res.status(403).json({ error: 'This account does not have administrator privileges.' });
      return;
    }

    const token = createSessionToken({ uid: userRow.id, email: userRow.email, role: userRow.role });
    setSessionCookie(res, token);

    res.json({
      user: {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
        role: userRow.role,
        phone: userRow.phone,
        company: userRow.company,
        created_at: userRow.created_at,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Sign in failed.' });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.put('/api/auth/profile', requireAuth, (req: AuthedRequest, res) => {
  const { name, phone = '', company = '' } = req.body || {};
  if (!name) {
    res.status(400).json({ error: 'Name is required.' });
    return;
  }
  db.prepare('UPDATE users SET name = ?, phone = ?, company = ? WHERE id = ?').run(
    String(name).trim(),
    String(phone).trim(),
    String(company).trim(),
    req.authUser!.uid
  );
  const user = db
    .prepare('SELECT id, name, email, role, phone, company, created_at FROM users WHERE id = ?')
    .get(req.authUser!.uid);
  res.json({ user });
});

app.put('/api/auth/password', requireAuth, (req: AuthedRequest, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || String(newPassword).length < 6) {
    res.status(400).json({ error: 'Valid current password and new password (min 6 chars) required.' });
    return;
  }
  const userRow = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.authUser!.uid) as
    | { password_hash: string }
    | undefined;
  if (!userRow || !verifyPassword(String(currentPassword), userRow.password_hash)) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
    hashPassword(String(newPassword)),
    req.authUser!.uid
  );
  res.json({ ok: true });
});

// ---------- Public Storefront Catalog ----------
app.get('/api/categories', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, COUNT(p.id) as product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_published = 1
       GROUP BY c.id
       ORDER BY c.sort_order ASC, c.id ASC`
    )
    .all();
  res.json(rows);
});

app.get('/api/products', (req, res) => {
  const { category, search, sort, collection } = req.query;
  const conditions = ['p.is_published = 1'];
  const params: unknown[] = [];

  if (category && category !== 'all') {
    conditions.push('c.slug = ?');
    params.push(String(category));
  }
  if (search && String(search).trim()) {
    const q = `%${String(search).trim()}%`;
    conditions.push('(p.name LIKE ? OR p.subtitle LIKE ? OR p.description LIKE ?)');
    params.push(q, q, q);
  }
  if (collection === 'featured') conditions.push('p.is_featured = 1');
  if (collection === 'bestseller') conditions.push('p.is_bestseller = 1');
  if (collection === 'new') conditions.push('p.is_new_arrival = 1');

  let orderBy = 'p.is_featured DESC, p.sales_count DESC, p.id DESC';
  if (sort === 'price-asc') orderBy = 'COALESCE(p.discount_price, p.price) ASC';
  if (sort === 'price-desc') orderBy = 'COALESCE(p.discount_price, p.price) DESC';
  if (sort === 'bestselling') orderBy = 'p.sales_count DESC';
  if (sort === 'newest') orderBy = 'p.id DESC';

  const sql = `
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${orderBy}
  `;
  const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
  res.json(rows.map(sanitizePublicProduct));
});

app.get('/api/products/:slug', (req, res) => {
  const row = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.slug = ? AND p.is_published = 1`
    )
    .get(req.params.slug) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  res.json(sanitizePublicProduct(row));
});

// ---------- Coupons ----------
app.post('/api/coupons/validate', (req, res) => {
  const { code, subtotal } = req.body || {};
  if (!code) {
    res.status(400).json({ error: 'Coupon code is required.' });
    return;
  }
  const normalized = String(code).trim().toUpperCase();
  const coupon = db
    .prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1')
    .get(normalized) as
    | {
        id: number;
        code: string;
        discount_type: 'percent' | 'fixed';
        discount_value: number;
        min_order_amount: number;
        max_uses: number;
        used_count: number;
        expires_at: string | null;
      }
    | undefined;

  if (!coupon) {
    res.status(404).json({ error: 'Invalid or inactive coupon code.' });
    return;
  }
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
    res.status(400).json({ error: 'This coupon has expired.' });
    return;
  }
  if (coupon.used_count >= coupon.max_uses) {
    res.status(400).json({ error: 'Coupon usage limit reached.' });
    return;
  }
  const orderSubtotal = Number(subtotal || 0);
  if (orderSubtotal < coupon.min_order_amount) {
    res.status(400).json({
      error: `Minimum order of INR ${coupon.min_order_amount} required for ${coupon.code}.`,
    });
    return;
  }

  const discountAmount =
    coupon.discount_type === 'percent'
      ? Math.round((orderSubtotal * coupon.discount_value) / 100)
      : Math.min(orderSubtotal, coupon.discount_value);

  res.json({
    code: coupon.code,
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value,
    discount_amount: discountAmount,
  });
});

// ---------- Razorpay Payment & Order Verification Flow ----------
app.post('/api/payments/create-order', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { productIds, couponCode } = req.body || {};
    if (!Array.isArray(productIds) || productIds.length === 0) {
      res.status(400).json({ error: 'Select at least one digital product to purchase.' });
      return;
    }

    const uniqueIds = [...new Set(productIds.map((id) => Number(id)).filter((id) => Number.isFinite(id)))];
    const placeholders = uniqueIds.map(() => '?').join(',');
    const products = db
      .prepare(`SELECT id, name, price, discount_price, is_published FROM products WHERE id IN (${placeholders}) AND is_published = 1`)
      .all(...uniqueIds) as Array<{
      id: number;
      name: string;
      price: number;
      discount_price: number | null;
    }>;

    if (products.length === 0) {
      res.status(400).json({ error: 'No valid published products found.' });
      return;
    }

    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.authUser!.uid) as {
      id: number;
      name: string;
      email: string;
    };

    const subtotal = products.reduce((acc, p) => acc + (p.discount_price ?? p.price), 0);
    let discountAmount = 0;
    let appliedCoupon: string | null = null;

    if (couponCode) {
      const normalized = String(couponCode).trim().toUpperCase();
      const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(normalized) as
        | {
            code: string;
            discount_type: 'percent' | 'fixed';
            discount_value: number;
            min_order_amount: number;
            max_uses: number;
            used_count: number;
            expires_at: string | null;
          }
        | undefined;
      if (
        coupon &&
        coupon.used_count < coupon.max_uses &&
        subtotal >= coupon.min_order_amount &&
        (!coupon.expires_at || new Date(coupon.expires_at).getTime() > Date.now())
      ) {
        discountAmount =
          coupon.discount_type === 'percent'
            ? Math.round((subtotal * coupon.discount_value) / 100)
            : Math.min(subtotal, coupon.discount_value);
        appliedCoupon = coupon.code;
      }
    }

    const totalAmount = Math.max(1, subtotal - discountAmount);
    const orderNumber = `NX-${Date.now().toString().slice(-6)}${crypto.randomInt(10, 99)}`;
    const rzpOrder = await createRazorpayOrder({
      amountInRupees: totalAmount,
      receipt: orderNumber,
      notes: {
        user_id: String(user.id),
        customer_email: user.email,
      },
    });

    const orderInsert = db
      .prepare(
        `INSERT INTO orders (
          order_number, user_id, customer_name, customer_email, subtotal, discount_amount,
          coupon_code, total_amount, currency, status, razorpay_order_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'pending', ?)`
      )
      .run(
        orderNumber,
        user.id,
        user.name,
        user.email,
        subtotal,
        discountAmount,
        appliedCoupon,
        totalAmount,
        rzpOrder.id
      );

    const dbOrderId = Number(orderInsert.lastInsertRowid);
    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, product_name, unit_price) VALUES (?, ?, ?, ?)'
    );
    for (const p of products) {
      insertItem.run(dbOrderId, p.id, p.name, p.discount_price ?? p.price);
    }

    db.prepare(
      `INSERT INTO payments (order_id, gateway, razorpay_order_id, amount, currency, status)
       VALUES (?, 'razorpay', ?, ?, 'INR', 'created')`
    ).run(dbOrderId, rzpOrder.id, totalAmount);

    res.json({
      orderId: dbOrderId,
      orderNumber,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      totalRupees: totalAmount,
      currency: rzpOrder.currency,
      key: getPublicRazorpayKey(),
      mode: rzpOrder.mode,
      customer: {
        name: user.name,
        email: user.email,
      },
      items: products.map((p) => p.name),
    });
  } catch (err) {
    console.error('Create Razorpay order error:', err);
    res.status(500).json({ error: 'Unable to initiate Razorpay checkout order.' });
  }
});

// Sandbox authorization helper (disabled automatically when live Razorpay keys are configured)
app.post('/api/payments/sandbox-authorize', requireAuth, (req: AuthedRequest, res) => {
  if (isLiveRazorpayConfigured()) {
    res.status(403).json({ error: 'Sandbox authorization disabled when live Razorpay keys are active.' });
    return;
  }
  const { razorpay_order_id } = req.body || {};
  if (!razorpay_order_id) {
    res.status(400).json({ error: 'razorpay_order_id is required.' });
    return;
  }
  const order = db
    .prepare('SELECT id, user_id FROM orders WHERE razorpay_order_id = ?')
    .get(String(razorpay_order_id)) as { id: number; user_id: number } | undefined;

  if (!order || order.user_id !== req.authUser!.uid) {
    res.status(404).json({ error: 'Pending order not found.' });
    return;
  }

  const paymentId = `pay_Nx${crypto.randomBytes(7).toString('hex')}`;
  const signature = generateSandboxPaymentSignature(String(razorpay_order_id), paymentId);
  res.json({
    razorpay_order_id: String(razorpay_order_id),
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  });
});

app.post('/api/payments/verify', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, method = 'upi' } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ error: 'Missing Razorpay payment verification parameters.' });
      return;
    }

    const order = db
      .prepare('SELECT * FROM orders WHERE razorpay_order_id = ?')
      .get(String(razorpay_order_id)) as
      | {
          id: number;
          order_number: string;
          user_id: number;
          customer_name: string;
          customer_email: string;
          coupon_code: string | null;
          total_amount: number;
          status: string;
        }
      | undefined;

    if (!order || order.user_id !== req.authUser!.uid) {
      res.status(404).json({ error: 'Order record not found.' });
      return;
    }

    const mode = isLiveRazorpayConfigured() ? 'live' : 'sandbox';
    const isValid = verifyRazorpaySignature({
      razorpayOrderId: String(razorpay_order_id),
      razorpayPaymentId: String(razorpay_payment_id),
      razorpaySignature: String(razorpay_signature),
      mode,
    });

    if (!isValid) {
      db.prepare("UPDATE orders SET status = 'failed' WHERE id = ?").run(order.id);
      db.prepare("UPDATE payments SET status = 'failed' WHERE razorpay_order_id = ?").run(String(razorpay_order_id));
      res.status(400).json({ error: 'Payment signature verification failed. Download access denied.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const expiryIso = new Date(Date.now() + 365 * 86400000).toISOString();
    const items = db
      .prepare('SELECT product_id, product_name FROM order_items WHERE order_id = ?')
      .all(order.id) as Array<{ product_id: number; product_name: string }>;

    const tx = db.transaction(() => {
      db.prepare(
        "UPDATE orders SET status = 'paid', razorpay_payment_id = ?, paid_at = ? WHERE id = ?"
      ).run(String(razorpay_payment_id), nowIso, order.id);

      db.prepare(
        `UPDATE payments
         SET status = 'verified', razorpay_payment_id = ?, razorpay_signature = ?, method = ?, verified_at = ?
         WHERE razorpay_order_id = ?`
      ).run(String(razorpay_payment_id), String(razorpay_signature), String(method), nowIso, String(razorpay_order_id));

      if (order.coupon_code) {
        db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE code = ?').run(order.coupon_code);
      }

      const grantPerm = db.prepare(`
        INSERT OR IGNORE INTO download_permissions (user_id, order_id, product_id, max_downloads, expires_at)
        VALUES (?, ?, ?, 25, ?)
      `);
      const incSales = db.prepare('UPDATE products SET sales_count = sales_count + 1 WHERE id = ?');

      for (const item of items) {
        grantPerm.run(order.user_id, order.id, item.product_id, expiryIso);
        incSales.run(item.product_id);
      }
    });

    tx();

    await dispatchOrderConfirmationEmail({
      toEmail: order.customer_email,
      customerName: order.customer_name,
      orderNumber: order.order_number,
      totalAmount: order.total_amount,
      paymentId: String(razorpay_payment_id),
      productNames: items.map((i) => i.product_name),
    });

    res.json({
      verified: true,
      orderNumber: order.order_number,
      paymentId: String(razorpay_payment_id),
      unlockedProducts: items.map((i) => i.product_name),
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ error: 'Payment verification failed.' });
  }
});

// ---------- Customer Orders & Secure Download Library ----------
app.get('/api/orders', requireAuth, (req: AuthedRequest, res) => {
  const orders = db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.authUser!.uid) as Array<Record<string, unknown>>;

  const getItems = db.prepare(
    `SELECT oi.*, p.slug as product_slug, p.image_url, p.file_format
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ?`
  );
  const getEmail = db.prepare('SELECT subject, status, preview_text, created_at FROM email_logs WHERE order_number = ? LIMIT 1');

  const enriched = orders.map((o) => ({
    ...o,
    items: getItems.all(o.id),
    emailReceipt: getEmail.get(o.order_number) || null,
  }));
  res.json(enriched);
});

app.get('/api/downloads', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT dp.id as permission_id, dp.download_count, dp.max_downloads, dp.expires_at, dp.last_downloaded_at, dp.created_at as unlocked_at,
              o.order_number, o.paid_at,
              p.id as product_id, p.name as product_name, p.slug as product_slug, p.image_url,
              p.file_name, p.file_format, p.file_size_label, p.pages_or_duration
       FROM download_permissions dp
       JOIN orders o ON dp.order_id = o.id
       JOIN products p ON dp.product_id = p.id
       WHERE dp.user_id = ? AND o.status = 'paid'
       ORDER BY dp.created_at DESC`
    )
    .all(req.authUser!.uid);
  res.json(rows);
});

app.post('/api/downloads/:permissionId/token', requireAuth, (req: AuthedRequest, res) => {
  const permissionId = Number(req.params.permissionId);
  const perm = db
    .prepare(
      `SELECT dp.*, o.status as order_status
       FROM download_permissions dp
       JOIN orders o ON dp.order_id = o.id
       WHERE dp.id = ? AND dp.user_id = ?`
    )
    .get(permissionId, req.authUser!.uid) as
    | {
        id: number;
        user_id: number;
        product_id: number;
        download_count: number;
        max_downloads: number;
        expires_at: string | null;
        order_status: string;
      }
    | undefined;

  if (!perm || perm.order_status !== 'paid') {
    res.status(403).json({ error: 'Verified purchase required for download.' });
    return;
  }
  if (perm.expires_at && new Date(perm.expires_at).getTime() < Date.now()) {
    res.status(403).json({ error: 'Download permission has expired.' });
    return;
  }
  if (perm.download_count >= perm.max_downloads) {
    res.status(403).json({ error: 'Maximum download limit reached for this license.' });
    return;
  }

  const token = createSignedDownloadToken(perm.id, perm.user_id, perm.product_id);
  res.json({
    downloadUrl: `/api/downloads/file/${encodeURIComponent(token)}`,
    expiresInSeconds: 300,
  });
});

app.get('/api/downloads/file/:token', (req, res) => {
  const payload = verifySignedDownloadToken(req.params.token);
  if (!payload) {
    res.status(403).json({ error: 'Invalid or expired download link. Generate a fresh link from your Download Library.' });
    return;
  }

  const perm = db
    .prepare(
      `SELECT dp.*, o.status as order_status, p.file_path, p.file_name, p.name as product_name, p.description
       FROM download_permissions dp
       JOIN orders o ON dp.order_id = o.id
       JOIN products p ON dp.product_id = p.id
       WHERE dp.id = ? AND dp.user_id = ? AND dp.product_id = ?`
    )
    .get(payload.permissionId, payload.userId, payload.productId) as
    | {
        id: number;
        order_status: string;
        download_count: number;
        max_downloads: number;
        file_path: string;
        file_name: string;
        product_name: string;
        description: string;
      }
    | undefined;

  if (!perm || perm.order_status !== 'paid') {
    res.status(403).json({ error: 'Download access unauthorized.' });
    return;
  }

  // Ensure file exists on disk (resilient fallback if container restarted)
  if (!fs.existsSync(perm.file_path)) {
    ensurePrivatePdfFile(perm.file_path, perm.product_name, [
      perm.product_name,
      perm.description,
      'Verified NEXORA Digital Vault Distribution',
    ]);
  }

  db.prepare(
    "UPDATE download_permissions SET download_count = download_count + 1, last_downloaded_at = datetime('now') WHERE id = ?"
  ).run(perm.id);

  res.setHeader('Content-Disposition', `attachment; filename="${perm.file_name}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.resolve(perm.file_path));
});

// ---------- Newsletter & Contact ----------
app.post('/api/newsletter', (req, res) => {
  const { email } = req.body || {};
  if (!email || !String(email).includes('@')) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  const normalized = String(email).trim().toLowerCase();
  db.prepare('INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)').run(normalized);
  res.status(201).json({ ok: true, message: 'Subscribed to NEXORA releases.' });
});

app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !subject || !message) {
    res.status(400).json({ error: 'All fields are required.' });
    return;
  }
  db.prepare('INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)').run(
    String(name).trim(),
    String(email).trim().toLowerCase(),
    String(subject).trim(),
    String(message).trim()
  );
  res.status(201).json({ ok: true, message: 'Your inquiry has been received.' });
});

// ---------- Admin Protected Routes (/api/admin/*) ----------
app.get('/api/admin/overview', requireAdmin, (_req, res) => {
  const totals = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as totalRevenue,
         COUNT(CASE WHEN status = 'paid' THEN 1 END) as totalOrders,
         COALESCE(SUM(CASE WHEN status = 'paid' AND date(COALESCE(paid_at, created_at)) = date('now') THEN total_amount ELSE 0 END), 0) as todaySales,
         COALESCE(SUM(CASE WHEN status = 'paid' AND strftime('%Y-%m', COALESCE(paid_at, created_at)) = strftime('%Y-%m', 'now') THEN total_amount ELSE 0 END), 0) as monthlySales
       FROM orders`
    )
    .get() as Record<string, number>;

  const prodStats = db
    .prepare(
      `SELECT COUNT(*) as totalProducts, COUNT(CASE WHEN is_published = 1 THEN 1 END) as publishedProducts FROM products`
    )
    .get() as Record<string, number>;

  const custStats = db
    .prepare("SELECT COUNT(*) as totalCustomers FROM users WHERE role = 'customer'")
    .get() as Record<string, number>;

  const dailySeries = db
    .prepare(
      `SELECT date(COALESCE(paid_at, created_at)) as bucket,
              COALESCE(SUM(total_amount), 0) as revenue,
              COUNT(*) as orders
       FROM orders
       WHERE status = 'paid' AND date(COALESCE(paid_at, created_at)) >= date('now', '-14 days')
       GROUP BY bucket
       ORDER BY bucket ASC`
    )
    .all();

  const weeklySeries = db
    .prepare(
      `SELECT strftime('%Y-W%W', COALESCE(paid_at, created_at)) as bucket,
              COALESCE(SUM(total_amount), 0) as revenue,
              COUNT(*) as orders
       FROM orders
       WHERE status = 'paid'
       GROUP BY bucket
       ORDER BY bucket ASC
       LIMIT 12`
    )
    .all();

  const monthlySeries = db
    .prepare(
      `SELECT strftime('%Y-%m', COALESCE(paid_at, created_at)) as bucket,
              COALESCE(SUM(total_amount), 0) as revenue,
              COUNT(*) as orders
       FROM orders
       WHERE status = 'paid'
       GROUP BY bucket
       ORDER BY bucket ASC
       LIMIT 12`
    )
    .all();

  const recentOrders = db
    .prepare(
      `SELECT o.*, GROUP_CONCAT(oi.product_name, ', ') as product_names
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT 8`
    )
    .all();

  res.json({
    metrics: {
      ...totals,
      ...prodStats,
      ...custStats,
    },
    charts: {
      daily: dailySeries,
      weekly: weeklySeries,
      monthly: monthlySeries,
    },
    recentOrders,
  });
});

app.get('/api/admin/products', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       JOIN categories c ON p.category_id = c.id
       ORDER BY p.id DESC`
    )
    .all() as Array<Record<string, unknown>>;
  res.json(rows.map(sanitizePublicProduct));
});

app.post('/api/admin/upload/image', requireAdmin, imageUpload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No image file provided.' });
    return;
  }
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

app.post('/api/admin/upload/asset', requireAdmin, privateAssetUpload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No digital asset file provided.' });
    return;
  }
  const sizeMb = (req.file.size / (1024 * 1024)).toFixed(2);
  res.json({
    fileTokenPath: req.file.filename,
    fileName: req.file.originalname,
    fileSizeLabel: `${sizeMb} MB`,
  });
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  try {
    const {
      name,
      subtitle = '',
      description,
      price,
      discount_price = null,
      category_id,
      image_url = 'asset:prod_ebook_systems',
      file_token_path,
      file_name = 'NEXORA-Digital-Asset.pdf',
      file_format = 'PDF',
      file_size_label = '8.5 MB',
      pages_or_duration = '120 Pages',
      preview_excerpt = '',
      highlights = [],
      is_featured = false,
      is_bestseller = false,
      is_new_arrival = true,
      is_published = true,
    } = req.body || {};

    if (!name || !description || !price || !category_id) {
      res.status(400).json({ error: 'Name, description, price, and category are required.' });
      return;
    }

    const baseSlug = slugify(String(name));
    const existingSlug = db.prepare('SELECT id FROM products WHERE slug = ?').get(baseSlug);
    const finalSlug = existingSlug ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;

    let resolvedPrivatePath = path.join(privateStorageDir, `${finalSlug}.pdf`);
    if (file_token_path) {
      const candidate = path.join(privateStorageDir, path.basename(String(file_token_path)));
      if (fs.existsSync(candidate)) {
        resolvedPrivatePath = candidate;
      }
    }
    ensurePrivatePdfFile(resolvedPrivatePath, String(name), [
      String(name),
      String(subtitle),
      String(description),
    ]);

    const result = db
      .prepare(
        `INSERT INTO products (
          name, slug, subtitle, description, price, discount_price, category_id,
          image_url, file_path, file_name, file_format, file_size_label, pages_or_duration,
          preview_excerpt, highlights_json, is_featured, is_bestseller, is_new_arrival, is_published
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        String(name).trim(),
        finalSlug,
        String(subtitle).trim(),
        String(description).trim(),
        Number(price),
        discount_price !== null && discount_price !== '' ? Number(discount_price) : null,
        Number(category_id),
        String(image_url),
        resolvedPrivatePath,
        String(file_name),
        String(file_format),
        String(file_size_label),
        String(pages_or_duration),
        String(preview_excerpt),
        JSON.stringify(Array.isArray(highlights) ? highlights : []),
        is_featured ? 1 : 0,
        is_bestseller ? 1 : 0,
        is_new_arrival ? 1 : 0,
        is_published ? 1 : 0
      );

    const row = db
      .prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?`
      )
      .get(Number(result.lastInsertRowid)) as Record<string, unknown>;

    res.status(201).json(sanitizePublicProduct(row));
  } catch (err) {
    console.error('Admin create product error:', err);
    res.status(500).json({ error: 'Failed to create product.' });
  }
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const {
      name = existing.name,
      subtitle = existing.subtitle,
      description = existing.description,
      price = existing.price,
      discount_price = existing.discount_price,
      category_id = existing.category_id,
      image_url = existing.image_url,
      file_token_path,
      file_name = existing.file_name,
      file_format = existing.file_format,
      file_size_label = existing.file_size_label,
      pages_or_duration = existing.pages_or_duration,
      preview_excerpt = existing.preview_excerpt,
      highlights,
      is_featured = existing.is_featured,
      is_bestseller = existing.is_bestseller,
      is_new_arrival = existing.is_new_arrival,
      is_published = existing.is_published,
    } = req.body || {};

    let resolvedPrivatePath = String(existing.file_path);
    if (file_token_path) {
      const candidate = path.join(privateStorageDir, path.basename(String(file_token_path)));
      if (fs.existsSync(candidate)) {
        resolvedPrivatePath = candidate;
      }
    }

    db.prepare(
      `UPDATE products SET
        name = ?, subtitle = ?, description = ?, price = ?, discount_price = ?, category_id = ?,
        image_url = ?, file_path = ?, file_name = ?, file_format = ?, file_size_label = ?, pages_or_duration = ?,
        preview_excerpt = ?, highlights_json = ?, is_featured = ?, is_bestseller = ?, is_new_arrival = ?, is_published = ?,
        updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      String(name).trim(),
      String(subtitle).trim(),
      String(description).trim(),
      Number(price),
      discount_price !== null && discount_price !== '' ? Number(discount_price) : null,
      Number(category_id),
      String(image_url),
      resolvedPrivatePath,
      String(file_name),
      String(file_format),
      String(file_size_label),
      String(pages_or_duration),
      String(preview_excerpt),
      highlights ? JSON.stringify(highlights) : String(existing.highlights_json),
      is_featured ? 1 : 0,
      is_bestseller ? 1 : 0,
      is_new_arrival ? 1 : 0,
      is_published ? 1 : 0,
      id
    );

    const updated = db
      .prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?`
      )
      .get(id) as Record<string, unknown>;
    res.json(sanitizePublicProduct(updated));
  } catch (err) {
    console.error('Admin update product error:', err);
    res.status(500).json({ error: 'Failed to update product.' });
  }
});

app.patch('/api/admin/products/:id/publish', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { is_published } = req.body || {};
  db.prepare("UPDATE products SET is_published = ?, updated_at = datetime('now') WHERE id = ?").run(
    is_published ? 1 : 0,
    id
  );
  res.json({ ok: true });
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const usedInOrders = db.prepare('SELECT COUNT(*) as c FROM order_items WHERE product_id = ?').get(id) as {
    c: number;
  };
  if (usedInOrders.c > 0) {
    // Unpublish instead of breaking historical order integrity
    db.prepare('UPDATE products SET is_published = 0 WHERE id = ?').run(id);
    res.json({ ok: true, archived: true, message: 'Product has historical orders and was unpublished.' });
    return;
  }
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  res.json({ ok: true, deleted: true });
});

app.get('/api/admin/categories', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, COUNT(p.id) as product_count
       FROM categories c LEFT JOIN products p ON p.category_id = c.id
       GROUP BY c.id ORDER BY c.sort_order ASC, c.id ASC`
    )
    .all();
  res.json(rows);
});

app.post('/api/admin/categories', requireAdmin, (req, res) => {
  const { name, description = '' } = req.body || {};
  if (!name) {
    res.status(400).json({ error: 'Category name is required.' });
    return;
  }
  const slug = slugify(String(name));
  const result = db
    .prepare('INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, 99)')
    .run(String(name).trim(), slug, String(description).trim());
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json(cat);
});

app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const count = db.prepare('SELECT COUNT(*) as c FROM products WHERE category_id = ?').get(id) as { c: number };
  if (count.c > 0) {
    res.status(400).json({ error: 'Cannot delete a category with existing products.' });
    return;
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  res.json({ ok: true });
});

app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT o.*,
              GROUP_CONCAT(oi.product_name, ', ') as product_names,
              COALESCE(SUM(dp.download_count), 0) as total_downloads,
              MAX(dp.last_downloaded_at) as last_downloaded_at
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN download_permissions dp ON dp.order_id = o.id
       GROUP BY o.id
       ORDER BY o.created_at DESC`
    )
    .all();
  res.json(rows);
});

app.get('/api/admin/customers', requireAdmin, (_req, res) => {
  const customers = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.phone, u.company, u.created_at,
              COUNT(CASE WHEN o.status = 'paid' THEN 1 END) as order_count,
              COALESCE(SUM(CASE WHEN o.status = 'paid' THEN o.total_amount ELSE 0 END), 0) as total_spent
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id
       WHERE u.role = 'customer'
       GROUP BY u.id
       ORDER BY total_spent DESC, u.created_at DESC`
    )
    .all() as Array<Record<string, unknown>>;

  const getHistory = db.prepare(
    `SELECT o.id, o.order_number, o.total_amount, o.status, o.created_at,
            GROUP_CONCAT(oi.product_name, ', ') as product_names
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.user_id = ?
     GROUP BY o.id
     ORDER BY o.created_at DESC`
  );

  res.json(customers.map((c) => ({ ...c, orders: getHistory.all(c.id) })));
});

app.get('/api/admin/payments', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, o.order_number, o.customer_name, o.customer_email
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       ORDER BY p.created_at DESC`
    )
    .all();
  res.json(rows);
});

app.get('/api/admin/coupons', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM coupons ORDER BY id DESC').all();
  res.json(rows);
});

app.post('/api/admin/coupons', requireAdmin, (req, res) => {
  const { code, discount_type = 'percent', discount_value, min_order_amount = 0, max_uses = 500 } = req.body || {};
  if (!code || !discount_value) {
    res.status(400).json({ error: 'Coupon code and discount value are required.' });
    return;
  }
  const result = db
    .prepare(
      'INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, is_active) VALUES (?, ?, ?, ?, ?, 1)'
    )
    .run(
      String(code).trim().toUpperCase(),
      discount_type === 'fixed' ? 'fixed' : 'percent',
      Number(discount_value),
      Number(min_order_amount),
      Number(max_uses)
    );
  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json(coupon);
});

app.patch('/api/admin/coupons/:id', requireAdmin, (req, res) => {
  const { is_active } = req.body || {};
  db.prepare('UPDATE coupons SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, Number(req.params.id));
  res.json({ ok: true });
});

app.delete('/api/admin/coupons/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM coupons WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

app.get('/api/admin/messages', requireAdmin, (_req, res) => {
  const messages = db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all();
  const subscribers = db.prepare('SELECT * FROM newsletter_subscribers ORDER BY created_at DESC').all();
  res.json({ messages, subscribers });
});

app.patch('/api/admin/messages/:id', requireAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!['new', 'reviewed', 'resolved'].includes(String(status))) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }
  db.prepare('UPDATE contact_messages SET status = ? WHERE id = ?').run(String(status), Number(req.params.id));
  res.json({ ok: true });
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM site_settings WHERE id = 1').get() as Record<string, string>;
  const body = req.body || {};
  db.prepare(
    `UPDATE site_settings SET
      brand_name = ?, tagline = ?, logo_url = ?, hero_title = ?, hero_subtitle = ?, hero_cta_text = ?,
      contact_email = ?, contact_phone = ?, contact_address = ?,
      twitter_url = ?, github_url = ?, linkedin_url = ?, instagram_url = ?,
      updated_at = datetime('now')
     WHERE id = 1`
  ).run(
    body.brand_name ?? existing.brand_name,
    body.tagline ?? existing.tagline,
    body.logo_url ?? existing.logo_url,
    body.hero_title ?? existing.hero_title,
    body.hero_subtitle ?? existing.hero_subtitle,
    body.hero_cta_text ?? existing.hero_cta_text,
    body.contact_email ?? existing.contact_email,
    body.contact_phone ?? existing.contact_phone,
    body.contact_address ?? existing.contact_address,
    body.twitter_url ?? existing.twitter_url,
    body.github_url ?? existing.github_url,
    body.linkedin_url ?? existing.linkedin_url,
    body.instagram_url ?? existing.instagram_url
  );
  const updated = db.prepare('SELECT * FROM site_settings WHERE id = 1').get();
  res.json(updated);
});

// ---------- Vite / Production Static Fallback ----------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NEXORA storefront & API server listening on http://localhost:${PORT}`);
  });
}

startServer();
