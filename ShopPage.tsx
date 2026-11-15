import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProductCard } from '../components/ProductCard.tsx';
import type { Category, Product } from '../types.ts';

export function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeCategory !== 'all') params.set('category', activeCategory);
    if (search.trim()) params.set('search', search.trim());
    if (sort) params.set('sort', sort);

    fetch(`/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .finally(() => setLoading(false));
  }, [activeCategory, search, sort]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Shop Digital Products</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Instant Razorpay checkout and private PDF / asset delivery across all formats.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="h-10 w-full sm:w-64 rounded-lg border border-white/12 bg-white/[0.04] pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort products"
            className="h-10 rounded-lg border border-white/12 bg-[#0B101D] px-3.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
          >
            <option value="featured">Featured First</option>
            <option value="bestselling">Best Selling</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="newest">Newest Arrivals</option>
          </select>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]'
          }`}
        >
          All Products
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.slug)}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeCategory === cat.slug
                ? 'bg-blue-600 text-white'
                : 'border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="glass-panel h-96 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <p className="font-display text-lg font-semibold text-white">No matching products found</p>
          <p className="mt-1 text-sm text-slate-400">Try clearing your search filter or selecting All Products.</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setActiveCategory('all');
            }}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
