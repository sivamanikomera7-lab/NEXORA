import { CartDrawer } from './components/CartDrawer.tsx';
import { Footer } from './components/Footer.tsx';
import { Navbar } from './components/Navbar.tsx';
import { PreviewModal } from './components/PreviewModal.tsx';
import { RazorpayCheckoutModal } from './components/RazorpayCheckoutModal.tsx';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { AccountPage, DownloadsPage, OrdersPage } from './pages/CustomerPortalPages.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { AboutPage, ContactPage, FaqPage, LegalPage } from './pages/InfoPages.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { ShopPage } from './pages/ShopPage.tsx';
import { AdminDashboard } from './pages/admin/AdminDashboard.tsx';

function RouterView() {
  const { path } = useApp();
  const cleanPath = path.replace(/\/+$/, '') || '/';

  if (cleanPath === '/admin' || cleanPath.startsWith('/admin/')) {
    return <AdminDashboard />;
  }

  let pageContent = <HomePage />;
  if (cleanPath === '/shop') {
    pageContent = <ShopPage />;
  } else if (cleanPath.startsWith('/product/')) {
    const slug = cleanPath.slice('/product/'.length);
    pageContent = <ProductDetailPage slug={slug} />;
  } else if (cleanPath === '/about') {
    pageContent = <AboutPage />;
  } else if (cleanPath === '/contact') {
    pageContent = <ContactPage />;
  } else if (cleanPath === '/faq') {
    pageContent = <FaqPage />;
  } else if (cleanPath === '/login') {
    pageContent = <LoginPage />;
  } else if (cleanPath === '/account') {
    pageContent = <AccountPage />;
  } else if (cleanPath === '/orders') {
    pageContent = <OrdersPage />;
  } else if (cleanPath === '/downloads') {
    pageContent = <DownloadsPage />;
  } else if (cleanPath === '/privacy') {
    pageContent = <LegalPage type="privacy" />;
  } else if (cleanPath === '/terms') {
    pageContent = <LegalPage type="terms" />;
  } else if (cleanPath === '/refund-policy') {
    pageContent = <LegalPage type="refund" />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#05070E] text-slate-100">
      <Navbar />
      <div className="flex-1">{pageContent}</div>
      <Footer />
      <CartDrawer />
      <PreviewModal />
      <RazorpayCheckoutModal />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <RouterView />
    </AppProvider>
  );
}
