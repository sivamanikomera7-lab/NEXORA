export type UserRole = 'customer' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  company: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  product_count?: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  price: number;
  discount_price: number | null;
  category_id: number;
  category_name: string;
  category_slug: string;
  image_url: string;
  file_name: string;
  file_format: string;
  file_size_label: string;
  pages_or_duration: string;
  preview_excerpt: string;
  highlights: string[];
  is_featured: boolean;
  is_bestseller: boolean;
  is_new_arrival: boolean;
  is_published: boolean;
  sales_count: number;
  created_at: string;
}

export interface SiteSettings {
  brand_name: string;
  tagline: string;
  logo_url: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cta_text: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  twitter_url: string;
  github_url: string;
  linkedin_url: string;
  instagram_url: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  product_slug?: string;
  image_url?: string;
  file_format?: string;
  unit_price: number;
}

export interface OrderRecord {
  id: number;
  order_number: string;
  user_id: number;
  customer_name: string;
  customer_email: string;
  subtotal: number;
  discount_amount: number;
  coupon_code: string | null;
  total_amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  paid_at: string | null;
  items?: OrderItem[];
  emailReceipt?: {
    subject: string;
    status: string;
    preview_text: string;
    created_at: string;
  } | null;
  product_names?: string;
  total_downloads?: number;
  last_downloaded_at?: string | null;
}

export interface DownloadPermission {
  permission_id: number;
  download_count: number;
  max_downloads: number;
  expires_at: string | null;
  last_downloaded_at: string | null;
  unlocked_at: string;
  order_number: string;
  paid_at: string;
  product_id: number;
  product_name: string;
  product_slug: string;
  image_url: string;
  file_name: string;
  file_format: string;
  file_size_label: string;
  pages_or_duration: string;
}

export interface Coupon {
  id: number;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses: number;
  used_count: number;
  is_active: number;
  expires_at: string | null;
  created_at: string;
}

export interface RazorpayOrderSession {
  orderId: number;
  orderNumber: string;
  razorpayOrderId: string;
  amount: number;
  totalRupees: number;
  currency: string;
  key: string;
  mode: 'live' | 'sandbox';
  customer: {
    name: string;
    email: string;
  };
  items: string[];
}
