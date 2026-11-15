import "./App.css";
import { useState } from "react";

type Product = {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  icon: string;
};

const initialProducts: Product[] = [
  {
    id: 1,
    title: "The Ultimate E-Book",
    description: "A practical digital guide to help you grow your skills.",
    price: 499,
    category: "E-Books",
    icon: "📘",
  },
  {
    id: 2,
    title: "Business Growth Toolkit",
    description: "Templates and resources for your next big idea.",
    price: 799,
    category: "Templates",
    icon: "🚀",
  },
  {
    id: 3,
    title: "Creator's Starter Pack",
    description: "Digital resources to start creating with confidence.",
    price: 299,
    category: "Resources",
    icon: "✨",
  },
];

export default function App() {
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState<"home" | "shop" | "admin">("home");
  const [adminOpen, setAdminOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  function addProduct() {
    if (!title.trim() || !price || Number(price) <= 0) {
      alert("Please enter a product name and valid price.");
      return;
    }

    setProducts([
      ...products,
      {
        id: Date.now(),
        title,
        description: description || "Premium digital product.",
        price: Number(price),
        category: "Digital Products",
        icon: "📦",
      },
    ]);

    setTitle("");
    setPrice("");
    setDescription("");
    alert("Product added successfully!");
  }

  return (
    <div className="app">
      <header className="navbar">
        <a className="brand" href="#" onClick={() => setPage("home")}>
          NEXORA<span>.</span>
        </a>

        <nav>
          <button onClick={() => setPage("home")}>Home</button>
          <button onClick={() => setPage("shop")}>Explore</button>
          <button onClick={() => setPage("admin")}>Dashboard</button>
        </nav>

        <button className="nav-cta" onClick={() => setPage("shop")}>
          Explore Products ↗
        </button>
      </header>

      <main>
        {page === "home" && (
          <section className="hero">
            <div className="hero-badge">✦ YOUR DIGITAL WORLD STARTS HERE</div>
            <h1>
              Unlock Your
              <br />
              <span>Digital Potential.</span>
            </h1>
            <p>
              Discover premium e-books, practical resources and digital
              products designed to move you forward.
            </p>
            <div className="hero-actions">
              <button className="primary-btn" onClick={() => setPage("shop")}>
                Explore Collection ↗
              </button>
              <button className="secondary-btn" onClick={() => setPage("admin")}>
                Admin Dashboard
              </button>
            </div>
            <div className="hero-stats">
              <div><strong>100%</strong><small>Digital Products</small></div>
              <div><strong>Instant</strong><small>Access After Purchase</small></div>
              <div><strong>Secure</strong><small>Checkout Experience</small></div>
            </div>
          </section>
        )}

        {page === "shop" && (
          <section className="content-section">
            <div className="section-label">THE NEXORA COLLECTION</div>
            <h2>Explore Digital Products</h2>
            <p className="section-description">
              Find resources that help turn your next idea into action.
            </p>
            <div className="product-grid">
              {products.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-icon">{product.icon}</div>
                  <span className="category">{product.category}</span>
                  <h3>{product.title}</h3>
                  <p>{product.description}</p>
                  <div className="product-bottom">
                    <strong>₹{product.price.toLocaleString("en-IN")}</strong>
                    <button onClick={() => alert("Payment checkout will be connected in a later step.")}>
                      Buy Now ↗
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {page === "admin" && (
          <section className="content-section admin-section">
            <div className="section-label">NEXORA CONTROL CENTER</div>
            <h2>Admin Dashboard</h2>
            <p className="section-description">
              Manage your digital product catalogue.
            </p>

            <div className="dashboard-stats">
              <div className="stat-card">
                <span>Total Products</span>
                <strong>{products.length}</strong>
              </div>
              <div className="stat-card">
                <span>Store Status</span>
                <strong>Preview</strong>
              </div>
              <div className="stat-card">
                <span>Payments</span>
                <strong>Not Connected</strong>
              </div>
            </div>

            <div className="admin-panel">
              <div className="panel-heading">
                <h3>Product Management</h3>
                <button className="primary-btn" onClick={() => setAdminOpen(!adminOpen)}>
                  {adminOpen ? "Close Form" : "+ Add Product"}
                </button>
              </div>

              {adminOpen && (
                <div className="product-form">
                  <input
                    placeholder="Product name"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <input
                    placeholder="Price in INR"
                    type="number"
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  <textarea
                    placeholder="Product description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <button className="primary-btn" onClick={addProduct}>
                    Save Product
                  </button>
                </div>
              )}

              {products.map((product) => (
                <div className="admin-product" key={product.id}>
                  <span>{product.icon} {product.title}</span>
                  <strong>₹{product.price.toLocaleString("en-IN")}</strong>
                </div>
              ))}
            </div>
            <p className="notice">
              Demo dashboard only. Secure admin login, permanent product
              storage, PDF uploads and payment verification will be added
              through the backend setup.
            </p>
          </section>
        )}
      </main>

      <footer className="footer">
        <a className="brand" href="#" onClick={() => setPage("home")}>
          NEXORA<span>.</span>
        </a>
        <p>Ideas. Resources. Possibilities.</p>
        <small>© {new Date().getFullYear()} NEXORA. All rights reserved.</small>
      </footer>
    </div>
  );
}
