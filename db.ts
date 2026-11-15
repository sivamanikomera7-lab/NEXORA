import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { hashPassword } from './auth.ts';
import { ensurePrivatePdfFile } from './pdf.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const PRIVATE_STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'private');
const PUBLIC_UPLOADS_DIR = path.resolve(process.cwd(), 'storage', 'public-uploads');

for (const dir of [DATA_DIR, PRIVATE_STORAGE_DIR, PUBLIC_UPLOADS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export const dbPath = path.join(DATA_DIR, 'nexora.db');
export const privateStorageDir = PRIVATE_STORAGE_DIR;
export const publicUploadsDir = PUBLIC_UPLOADS_DIR;

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer', 'admin')),
      phone TEXT DEFAULT '',
      company TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      subtitle TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      price REAL NOT NULL,
      discount_price REAL,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      image_url TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_format TEXT NOT NULL DEFAULT 'PDF',
      file_size_label TEXT NOT NULL DEFAULT '12.4 MB',
      pages_or_duration TEXT NOT NULL DEFAULT '140 Pages',
      preview_excerpt TEXT NOT NULL DEFAULT '',
      highlights_json TEXT NOT NULL DEFAULT '[]',
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_bestseller INTEGER NOT NULL DEFAULT 0,
      is_new_arrival INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      sales_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      discount_type TEXT NOT NULL CHECK(discount_type IN ('percent', 'fixed')),
      discount_value REAL NOT NULL,
      min_order_amount REAL NOT NULL DEFAULT 0,
      max_uses INTEGER NOT NULL DEFAULT 500,
      used_count INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      coupon_code TEXT,
      total_amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'failed', 'refunded')),
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      paid_at TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      product_name TEXT NOT NULL,
      unit_price REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      gateway TEXT NOT NULL DEFAULT 'razorpay',
      razorpay_order_id TEXT NOT NULL,
      razorpay_payment_id TEXT,
      razorpay_signature TEXT,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      status TEXT NOT NULL DEFAULT 'created' CHECK(status IN ('created', 'verified', 'failed')),
      method TEXT NOT NULL DEFAULT 'razorpay',
      verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS download_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      download_count INTEGER NOT NULL DEFAULT 0,
      max_downloads INTEGER NOT NULL DEFAULT 25,
      expires_at TEXT,
      last_downloaded_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, order_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      order_number TEXT,
      status TEXT NOT NULL DEFAULT 'sent',
      preview_text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'reviewed', 'resolved')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      brand_name TEXT NOT NULL DEFAULT 'NEXORA',
      tagline TEXT NOT NULL DEFAULT 'Digital Products. Unlimited Possibilities.',
      logo_url TEXT NOT NULL DEFAULT '',
      hero_title TEXT NOT NULL DEFAULT 'Digital Products. Unlimited Possibilities.',
      hero_subtitle TEXT NOT NULL DEFAULT 'Architectural ebooks, production UI templates, engineering courses, and security playbooks engineered for high-output builders.',
      hero_cta_text TEXT NOT NULL DEFAULT 'Explore Catalog',
      contact_email TEXT NOT NULL DEFAULT 'support@nexora.digital',
      contact_phone TEXT NOT NULL DEFAULT '+91 9963955611',
      contact_address TEXT NOT NULL DEFAULT 'Thummalacheruvu, Piduguralla, Andhra Pradesh',
      twitter_url TEXT NOT NULL DEFAULT 'https://x.com/nexoradigital',
      github_url TEXT NOT NULL DEFAULT 'https://github.com/nexoradigital',
      linkedin_url TEXT NOT NULL DEFAULT 'https://linkedin.com/company/nexoradigital',
      instagram_url TEXT NOT NULL DEFAULT 'https://instagram.com/nexoradigital',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedInitialData();
}

function seedInitialData(): void {
  const settingsCount = db.prepare('SELECT COUNT(*) as c FROM site_settings').get() as { c: number };
  if (settingsCount.c === 0) {
    db.prepare(`INSERT INTO site_settings (id) VALUES (1)`).run();
  } else {
    db.prepare(
      `UPDATE site_settings
       SET contact_phone = '+91 9963955611',
           contact_address = 'Thummalacheruvu, Piduguralla, Andhra Pradesh'
       WHERE id = 1 AND contact_phone = '+91 80 4568 9200'`
    ).run();
  }

  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (userCount.c === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, phone, company)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertUser.run(
      'NEXORA Administrator',
      'admin@nexora.digital',
      hashPassword('NexoraAdmin@2026'),
      'admin',
      '+91 80 4568 9200',
      'NEXORA Digital Labs'
    );
    insertUser.run(
      'Alex Mercer',
      'alex.mercer@nexora.demo',
      hashPassword('Customer@123'),
      'customer',
      '+91 98450 11223',
      'Meridian Studio'
    );
    insertUser.run(
      'Priya Nair',
      'priya.nair@cloudcraft.in',
      hashPassword('Customer@123'),
      'customer',
      '+91 98801 44556',
      'CloudCraft Systems'
    );
    insertUser.run(
      'Rohan Kulkarni',
      'rohan@vectorworks.io',
      hashPassword('Customer@123'),
      'customer',
      '+91 97400 88991',
      'VectorWorks'
    );
  }

  const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number };
  if (catCount.c === 0) {
    const insertCat = db.prepare(`
      INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)
    `);
    insertCat.run('Ebooks', 'ebooks', 'Deep-dive technical and creative monographs in crisp PDF & EPUB.', 1);
    insertCat.run('PDF Guides', 'pdf-guides', 'Actionable operational checklists, playbooks, and reference manuals.', 2);
    insertCat.run('Templates', 'templates', 'Production-grade design systems, Notion workspaces, and starter kits.', 3);
    insertCat.run('Courses', 'courses', 'Self-paced architectural video + workbook curricula.', 4);
    insertCat.run('Digital Files', 'digital-files', 'Curated shaders, icon packs, vector assets, and modular kits.', 5);
    insertCat.run('Premium Resources', 'premium-resources', 'All-access executive bundles and enterprise reference vaults.', 6);
  }

  const prodCount = db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number };
  if (prodCount.c === 0) {
    const cats = db.prepare('SELECT id, slug FROM categories').all() as Array<{ id: number; slug: string }>;
    const catMap = new Map(cats.map((c) => [c.slug, c.id]));

    const seedProducts = [
      {
        name: 'Distributed Systems Architecture Handbook',
        slug: 'distributed-systems-architecture-handbook',
        subtitle: 'Consensus, event sourcing, and resilient multi-region patterns.',
        description:
          'A 196-page engineering monograph covering Raft consensus, idempotent payment pipelines, outbox pattern reliability, and zero-downtime Postgres schema migrations with production diagrams.',
        price: 2499,
        discount_price: 1499,
        category_slug: 'ebooks',
        image_url: 'asset:prod_ebook_systems',
        file_name: 'NEXORA-Distributed-Systems-Handbook.pdf',
        file_format: 'PDF + EPUB',
        file_size_label: '18.6 MB',
        pages_or_duration: '196 Pages',
        preview_excerpt:
          'Chapter 1: Deterministic State & Idempotency Keys — How to guarantee at-most-once settlement across unreliable webhook networks.\nChapter 2: Partitioning & Read Replicas — Practical sharding topologies for multi-tenant SaaS workloads.\nChapter 3: Zero-Downtime Migrations — Expand-and-contract deployment recipes.',
        highlights: [
          '196 illustrated pages with architectural blueprints',
          'Production webhook & Razorpay idempotency patterns',
          'Lifetime updates + commercial team reference license',
        ],
        is_featured: 1,
        is_bestseller: 1,
        is_new_arrival: 0,
        sales_count: 148,
      },
      {
        name: 'Obsidian Glassmorphism UI & SaaS Design System',
        slug: 'obsidian-glassmorphism-ui-design-system',
        subtitle: '240+ dark-mode Figma components and Tailwind v4 tokens.',
        description:
          'Precision-crafted component architecture for futuristic SaaS consoles, fintech dashboards, and digital storefronts. Includes responsive auto-layout frames, tabular numeric typography scales, and exportable CSS tokens.',
        price: 3499,
        discount_price: 2199,
        category_slug: 'templates',
        image_url: 'asset:prod_template_kit',
        file_name: 'NEXORA-Obsidian-UI-System.pdf',
        file_format: 'PDF + Figma Kit',
        file_size_label: '42.0 MB',
        pages_or_duration: '240 Components',
        preview_excerpt:
          'Included Tokens: 60-30-10 Obsidian Surface Palette, Glass Backdrop Elevation Levels 1-3, Tabular Numeric Scales.\nIncluded Screens: Checkout Drawers, Analytics Consoles, Auth Gates, Billing Matrices.',
        highlights: [
          '240+ responsive dark glassmorphism components',
          'WCAG AA verified contrast tokens included',
          'Commercial multi-project agency license',
        ],
        is_featured: 1,
        is_bestseller: 1,
        is_new_arrival: 0,
        sales_count: 214,
      },
      {
        name: 'Full-Stack Production Engineering Masterclass',
        slug: 'full-stack-production-engineering-masterclass',
        subtitle: 'End-to-end edge deployment, auth, and payment pipelines.',
        description:
          '14-hour modular masterclass with companion PDF lab manuals. Learn how to architect fast React storefronts, cryptographic webhook verifiers, private S3/R2 signed asset delivery, and automated observability.',
        price: 4999,
        discount_price: 2999,
        category_slug: 'courses',
        image_url: 'asset:prod_course_mastery',
        file_name: 'NEXORA-Production-Engineering-Workbook.pdf',
        file_format: 'HD Video + PDF',
        file_size_label: '1.2 GB Vault',
        pages_or_duration: '14 Hours · 38 Lessons',
        preview_excerpt:
          'Module 01: Sub-50ms Edge Caching & API Routing\nModule 02: Cryptographic HMAC Payment Signature Verification\nModule 03: Private Digital Asset Delivery via Short-Lived Signed URLs',
        highlights: [
          '38 studio-recorded 4K engineering lessons + PDF workbook',
          'Complete reference repositories and CI/CD checklists',
          'Verified completion credential and lifetime curriculum access',
        ],
        is_featured: 1,
        is_bestseller: 0,
        is_new_arrival: 1,
        sales_count: 96,
      },
      {
        name: 'Zero-Trust API & Payment Security Playbook',
        slug: 'zero-trust-api-payment-security-playbook',
        subtitle: 'Hardening authentication, RBAC, and webhook cryptography.',
        description:
          'An actionable PDF field guide for securing modern digital commerce platforms. Covers scrypt credential storage, HTTP-only session hardening, timing-safe signature validation, and automated audit logging.',
        price: 1799,
        discount_price: 999,
        category_slug: 'pdf-guides',
        image_url: 'asset:prod_guide_security',
        file_name: 'NEXORA-Zero-Trust-Security-Playbook.pdf',
        file_format: 'PDF Guide',
        file_size_label: '9.8 MB',
        pages_or_duration: '112 Pages',
        preview_excerpt:
          'Checklist 01: Timing-safe HMAC verification for payment webhooks\nChecklist 02: Preventing privilege escalation in multi-role admin dashboards\nChecklist 03: Private bucket isolation for paid digital downloads',
        highlights: [
          '112-page battle-tested security checklist & threat models',
          'Ready-to-audit SQL RLS and Express middleware patterns',
          'Updated for OWASP API Top 10 standards',
        ],
        is_featured: 0,
        is_bestseller: 1,
        is_new_arrival: 0,
        sales_count: 175,
      },
      {
        name: 'NEXORA Architect All-Access Vault Bundle',
        slug: 'nexora-architect-all-access-vault-bundle',
        subtitle: 'Every handbook, template kit, and security manual in one vault.',
        description:
          'Complete curated bundle uniting our flagship Distributed Systems Handbook, Obsidian UI Design System, Zero-Trust Security Playbook, and Founder Launch SOP templates at 45% bundle savings.',
        price: 7999,
        discount_price: 4499,
        category_slug: 'premium-resources',
        image_url: 'asset:prod_bundle_resources',
        file_name: 'NEXORA-Architect-Vault-Bundle.pdf',
        file_format: 'Multi-Asset Vault',
        file_size_label: '68.4 MB',
        pages_or_duration: '6 Core Assets',
        preview_excerpt:
          'Bundle Manifest:\n1. Distributed Systems Architecture Handbook (196p PDF)\n2. Obsidian Glassmorphism UI System (240+ Components)\n3. Zero-Trust API Security Playbook (112p PDF)\n4. Agency Commercial License',
        highlights: [
          'Save ₹3,500 compared to individual asset purchases',
          'Includes full commercial & team redistribution rights',
          'Priority access to all future v2 asset releases',
        ],
        is_featured: 0,
        is_bestseller: 1,
        is_new_arrival: 1,
        sales_count: 89,
      },
      {
        name: 'High-Contrast Isometric Icon & Mesh Asset Pack',
        slug: 'high-contrast-isometric-icon-mesh-pack',
        subtitle: '480 vector glyphs, 4K obsidian meshes, and glass textures.',
        description:
          'Curated digital asset pack engineered for dark-mode product launches, pitch decks, and hero backgrounds. Every vector icon uses consistent 1.5px geometric strokes alongside 24 lossless 4K gradient meshes.',
        price: 1499,
        discount_price: 899,
        category_slug: 'digital-files',
        image_url: 'asset:hero_nexora_vault',
        file_name: 'NEXORA-Isometric-Asset-Vault.pdf',
        file_format: 'SVG + PNG + PDF',
        file_size_label: '154 MB',
        pages_or_duration: '480+ Files',
        preview_excerpt:
          'Pack Contents:\n- 480 Stroke-Consistent Technical SVG Icons\n- 24 Deep Navy & Electric Blue 4K Mesh Backdrops\n- Commercial Attribution-Free License Certificate',
        highlights: [
          '480 pixel-aligned SVG icons on a 24px grid',
          '24 uncompressed 4K dark obsidian studio backdrops',
          'Royalty-free commercial usage for client & SaaS builds',
        ],
        is_featured: 0,
        is_bestseller: 0,
        is_new_arrival: 1,
        sales_count: 64,
      },
      {
        name: 'Cloudflare Edge & Serverless Commerce Blueprint',
        slug: 'cloudflare-edge-serverless-commerce-blueprint',
        subtitle: 'Global edge caching, D1/Postgres pooling, and R2 signed URLs.',
        description:
          'Practical PDF engineering guide to running zero-cold-start digital storefronts on Cloudflare Pages/Workers paired with Supabase Postgres and private R2 object delivery.',
        price: 1599,
        discount_price: null,
        category_slug: 'pdf-guides',
        image_url: 'asset:prod_guide_security',
        file_name: 'NEXORA-Cloudflare-Edge-Blueprint.pdf',
        file_format: 'PDF Guide',
        file_size_label: '11.2 MB',
        pages_or_duration: '94 Pages',
        preview_excerpt:
          'Section 1: Edge Runtime Compatibility Checklist\nSection 2: Hyperdrive Connection Pooling with Supabase PostgreSQL\nSection 3: Presigned Download Streaming Without Exposing Bucket Keys',
        highlights: [
          '94-page edge deployment & caching architecture manual',
          'Production wrangler.toml and CI pipeline templates',
          'Real-world latency benchmarks & cost modeling',
        ],
        is_featured: 0,
        is_bestseller: 0,
        is_new_arrival: 1,
        sales_count: 42,
      },
      {
        name: 'Founder Digital Product Launch OS (Notion + Templates)',
        slug: 'founder-digital-product-launch-os',
        subtitle: 'Complete GTM roadmap, pricing calculator, and email sequences.',
        description:
          'An integrated launch workspace and template suite built for independent creators and software studios selling digital products globally via Razorpay and Stripe.',
        price: 1999,
        discount_price: 1299,
        category_slug: 'templates',
        image_url: 'asset:prod_template_kit',
        file_name: 'NEXORA-Founder-Launch-OS.pdf',
        file_format: 'Notion + PDF',
        file_size_label: '14.5 MB',
        pages_or_duration: '18 Templates',
        preview_excerpt:
          'Workspace Modules:\n- Product Pricing & Margin Calculator\n- 14-Day Launch Email Sequence Copybook\n- Razorpay GST & Invoice Reconciliation Tracker',
        highlights: [
          '18 interconnected launch & operations templates',
          'High-converting onboarding & transactional email copy',
          'Instant Notion duplicate link + printable PDF SOPs',
        ],
        is_featured: 0,
        is_bestseller: 0,
        is_new_arrival: 0,
        sales_count: 118,
      },
    ];

    const insertProd = db.prepare(`
      INSERT INTO products (
        name, slug, subtitle, description, price, discount_price, category_id,
        image_url, file_path, file_name, file_format, file_size_label, pages_or_duration,
        preview_excerpt, highlights_json, is_featured, is_bestseller, is_new_arrival, is_published, sales_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    for (const p of seedProducts) {
      const catId = catMap.get(p.category_slug) ?? 1;
      const privatePath = path.join(PRIVATE_STORAGE_DIR, p.file_name);
      ensurePrivatePdfFile(privatePath, p.name, [
        `Product: ${p.name}`,
        `Format: ${p.file_format} | Length: ${p.pages_or_duration}`,
        '----------------------------------------------------------------',
        p.description,
        '----------------------------------------------------------------',
        'Included Key Highlights:',
        ...p.highlights.map((h) => `* ${h}`),
        '----------------------------------------------------------------',
        'Preview & Curriculum Outline:',
        ...p.preview_excerpt.split('\n'),
        '----------------------------------------------------------------',
        'Licensed exclusively through NEXORA Digital Vault.',
      ]);

      insertProd.run(
        p.name,
        p.slug,
        p.subtitle,
        p.description,
        p.price,
        p.discount_price,
        catId,
        p.image_url,
        privatePath,
        p.file_name,
        p.file_format,
        p.file_size_label,
        p.pages_or_duration,
        p.preview_excerpt,
        JSON.stringify(p.highlights),
        p.is_featured,
        p.is_bestseller,
        p.is_new_arrival,
        p.sales_count
      );
    }
  }

  const couponCount = db.prepare('SELECT COUNT(*) as c FROM coupons').get() as { c: number };
  if (couponCount.c === 0) {
    const insertCoupon = db.prepare(`
      INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, used_count, is_active, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `);
    insertCoupon.run('NEXORA20', 'percent', 20, 500, 1000, 34, '2027-12-31T23:59:59Z');
    insertCoupon.run('LAUNCH15', 'percent', 15, 0, 500, 19, '2027-12-31T23:59:59Z');
    insertCoupon.run('SAVE300', 'fixed', 300, 1200, 300, 11, '2027-12-31T23:59:59Z');
  }

  const orderCount = db.prepare('SELECT COUNT(*) as c FROM orders').get() as { c: number };
  if (orderCount.c === 0) {
    const users = db.prepare("SELECT id, name, email FROM users WHERE role = 'customer'").all() as Array<{
      id: number;
      name: string;
      email: string;
    }>;
    const products = db.prepare('SELECT id, name, price, discount_price FROM products').all() as Array<{
      id: number;
      name: string;
      price: number;
      discount_price: number | null;
    }>;

    if (users.length > 0 && products.length > 0) {
      const insertOrder = db.prepare(`
        INSERT INTO orders (
          order_number, user_id, customer_name, customer_email, subtotal, discount_amount,
          coupon_code, total_amount, currency, status, razorpay_order_id, razorpay_payment_id,
          created_at, paid_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'paid', ?, ?, ?, ?)
      `);
      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, unit_price, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      const insertPayment = db.prepare(`
        INSERT INTO payments (
          order_id, gateway, razorpay_order_id, razorpay_payment_id, razorpay_signature,
          amount, currency, status, method, verified_at, created_at
        ) VALUES (?, 'razorpay', ?, ?, ?, ?, 'INR', 'verified', ?, ?, ?)
      `);
      const insertPerm = db.prepare(`
        INSERT INTO download_permissions (user_id, order_id, product_id, download_count, max_downloads, expires_at, created_at)
        VALUES (?, ?, ?, ?, 25, ?, ?)
      `);
      const insertEmail = db.prepare(`
        INSERT INTO email_logs (recipient_email, subject, order_number, status, preview_text, created_at)
        VALUES (?, ?, ?, 'sent', ?, ?)
      `);

      const seedOrdersSpec = [
        { daysAgo: 0, userIdx: 0, prodIdx: 0, method: 'upi', downloads: 1 },
        { daysAgo: 0, userIdx: 1, prodIdx: 1, method: 'card', downloads: 0 },
        { daysAgo: 1, userIdx: 2, prodIdx: 4, method: 'netbanking', downloads: 2 },
        { daysAgo: 2, userIdx: 1, prodIdx: 2, method: 'upi', downloads: 1 },
        { daysAgo: 4, userIdx: 2, prodIdx: 3, method: 'card', downloads: 3 },
        { daysAgo: 6, userIdx: 0, prodIdx: 5, method: 'upi', downloads: 0 },
        { daysAgo: 9, userIdx: 1, prodIdx: 0, method: 'card', downloads: 1 },
        { daysAgo: 12, userIdx: 2, prodIdx: 1, method: 'upi', downloads: 2 },
        { daysAgo: 15, userIdx: 0, prodIdx: 3, method: 'card', downloads: 1 },
        { daysAgo: 19, userIdx: 1, prodIdx: 4, method: 'netbanking', downloads: 4 },
        { daysAgo: 24, userIdx: 2, prodIdx: 2, method: 'upi', downloads: 2 },
        { daysAgo: 28, userIdx: 1, prodIdx: 7, method: 'card', downloads: 1 },
      ];

      seedOrdersSpec.forEach((spec, idx) => {
        const customer = users[spec.userIdx % users.length];
        const product = products[spec.prodIdx % products.length];
        const unitPrice = product.discount_price ?? product.price;
        const ts = new Date(Date.now() - spec.daysAgo * 86400000 - idx * 3600000).toISOString();
        const orderNo = `NX-${String(202601 + idx)}`;
        const rzpOrderId = `order_NxSeed${1000 + idx}`;
        const rzpPayId = `pay_NxSeed${9000 + idx}`;

        const res = insertOrder.run(
          orderNo,
          customer.id,
          customer.name,
          customer.email,
          unitPrice,
          0,
          null,
          unitPrice,
          rzpOrderId,
          rzpPayId,
          ts,
          ts
        );
        const orderId = Number(res.lastInsertRowid);
        insertItem.run(orderId, product.id, product.name, unitPrice, ts);
        insertPayment.run(
          orderId,
          rzpOrderId,
          rzpPayId,
          `hmac_verified_${orderNo.toLowerCase()}`,
          unitPrice,
          spec.method,
          ts,
          ts
        );
        insertPerm.run(
          customer.id,
          orderId,
          product.id,
          spec.downloads,
          new Date(Date.now() + 365 * 86400000).toISOString(),
          ts
        );
        insertEmail.run(
          customer.email,
          `Order Confirmed: ${orderNo} — Your NEXORA Download Is Ready`,
          orderNo,
          `Thank you ${customer.name}. Your payment of INR ${unitPrice} (${rzpPayId}) is verified and ${product.name} is unlocked in your Download Library.`,
          ts
        );
      });
    }
  }
}
