import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Home,
  MapPin,
  MessageCircle,
  PackageSearch,
  Phone,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Truck,
  User as UserIcon,
  X,
} from 'lucide-react';
import { AccountView } from './components/AccountView';
import { AdminDashboard, type AdminSection } from './components/AdminDashboard';
import { CartDrawer, type CartItem } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { ManualOrderSection } from './components/ManualOrderSection';
import { OrderTrackingView } from './components/OrderTrackingView';
import { ParcelServiceView } from './components/ParcelServiceView';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { ResilientImage } from './components/ResilientImage';
import { SellProductSection } from './components/SellProductSection';
import { api, getStoredToken, setStoredToken } from './lib/api';
import {
  OFFICIAL_EMAIL,
  OFFICIAL_PHONE,
  OFFICIAL_PHONE_TEL,
  OFFICIAL_WHATSAPP_URL,
} from './lib/contact';
import type {
  BannerSettings,
  Category,
  DeliveryZone,
  Order,
  Product,
  Review,
  User,
} from './types/marketplace';

type PageView = 'home' | 'track' | 'account' | 'admin' | 'sell' | 'parcel';
type CollectionTab = 'all' | 'featured' | 'bestseller' | 'local' | 'offers';

const HERO_IMAGE = '/src/assets/images/hero_barlekha_market_1794993132647.jpg';

export default function App() {
  const [view, setView] = useState<PageView>('home');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Storefront Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [banner, setBanner] = useState<BannerSettings | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  // User & Session
  const [user, setUser] = useState<User | null>(null);

  // Search & Catalog Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default');
  const [collectionTab, setCollectionTab] = useState<CollectionTab>('all');

  // Cart & Checkout
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('bazarmate_cart');
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState('zone-barlekha');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(
    null,
  );
  const [cartToast, setCartToast] = useState('');

  // Modals & Navigation targets
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [trackOrderNum, setTrackOrderNum] = useState<string>('');
  const [adminFocusOrder, setAdminFocusOrder] = useState<string>('');
  const [adminSection, setAdminSection] = useState<AdminSection>('orders');

  // Review Form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [revName, setRevName] = useState('');
  const [revLocation, setRevLocation] = useState('বড়লেখা, সিলেট');
  const [revComment, setRevComment] = useState('');
  const [revRating, setRevRating] = useState(5);

  const catalogRef = useRef<HTMLElement>(null);
  const manualOrderRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  async function fetchStorefront() {
    try {
      const data = await api.getStorefront();
      setCategories(data.categories);
      setProducts(data.products);
      setDeliveryZones(data.deliveryZones);
      if (data.deliveryZones.length > 0 && !selectedZoneId) {
        setSelectedZoneId(data.deliveryZones[0].id);
      }
      setBanner(data.banner);
      setReviews(data.reviews);
      setLoadError('');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'মার্কেটপ্লেস লোড করা যায়নি।');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStorefront();
    if (getStoredToken()) {
      api
        .getMe()
        .then((res) => setUser(res.user))
        .catch(() => setStoredToken(null));
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('bazarmate_cart', JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  function addToCart(product: Product, quantity = 1) {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = {
          product,
          quantity: Math.min(product.stock, next[idx].quantity + quantity),
        };
        return next;
      }
      return [...prev, { product, quantity: Math.min(product.stock, quantity) }];
    });
    setCartToast(`"${product.name}" ব্যাগে যোগ হয়েছে`);
    setTimeout(() => setCartToast(''), 2200);
  }

  function updateCartQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i)),
    );
  }

  function removeCartItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  function handleBuyNow(product: Product, quantity: number) {
    addToCart(product, quantity);
    setActiveProduct(null);
    setCheckoutOpen(true);
  }

  async function handleToggleWishlist(productId: string) {
    if (!user) {
      setView('account');
      return;
    }
    const res = await api.toggleWishlist(productId);
    setUser({ ...user, wishlist: res.wishlist });
  }

  function handleReorder(order: Order) {
    const itemsToAdd: CartItem[] = [];
    for (const item of order.items) {
      const liveProd = products.find((p) => p.id === item.productId && p.stock > 0);
      if (liveProd) {
        itemsToAdd.push({
          product: liveProd,
          quantity: Math.min(liveProd.stock, item.quantity),
        });
      }
    }
    if (itemsToAdd.length > 0) {
      setCart(itemsToAdd);
      setCartOpen(true);
    }
  }

  function scrollToCatalog(categoryId?: string) {
    if (categoryId) {
      setSelectedCategoryId(categoryId);
      setSelectedSubCategory('ALL');
    }
    if (view !== 'home') {
      setView('home');
      setTimeout(() => catalogRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    } else {
      catalogRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  const activeCategory = categories.find((c) => c.id === selectedCategoryId);
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = products.filter((p) => {
      if (selectedCategoryId !== 'ALL' && p.categoryId !== selectedCategoryId) return false;
      if (selectedSubCategory !== 'ALL' && p.subCategory !== selectedSubCategory) return false;
      if (selectedBrand !== 'ALL' && p.brand !== selectedBrand) return false;
      if (inStockOnly && p.stock <= 0) return false;
      if (collectionTab === 'featured' && !p.featured) return false;
      if (collectionTab === 'bestseller' && !p.bestSeller) return false;
      if (collectionTab === 'local' && !p.isLocalSpecial) return false;
      if (collectionTab === 'offers' && !(p.compareAtPrice && p.compareAtPrice > p.price))
        return false;

      if (q) {
        const cat = categories.find((c) => c.id === p.categoryId);
        const hay = [
          p.name,
          p.nameEn,
          p.brand,
          p.subCategory,
          cat?.name || '',
          cat?.nameBn || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'price-asc') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      list = [...list].sort((a, b) => b.price - a.price);
    }
    return list;
  }, [
    products,
    categories,
    searchQuery,
    selectedCategoryId,
    selectedSubCategory,
    selectedBrand,
    inStockOnly,
    collectionTab,
    sortBy,
  ]);

  const relatedProducts = useMemo(() => {
    if (!activeProduct) return [];
    return products
      .filter((p) => p.id !== activeProduct.id && p.categoryId === activeProduct.categoryId)
      .slice(0, 3);
  }, [activeProduct, products]);

  const totalCartQty = cart.reduce((sum, item) => sum + item.quantity, 0);

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    const created = await api.submitReview({
      customerName: revName,
      location: revLocation,
      rating: revRating,
      comment: revComment,
    });
    setReviews((prev) => [created, ...prev]);
    setRevName('');
    setRevComment('');
    setShowReviewForm(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#18181B] pb-16 md:pb-0">
      {/* Slim Dismissible Announcement Bar (<= 36px, non-sticky) */}
      {showAnnouncement && banner?.announcementActive && view === 'home' && (
        <div className="bg-[#0F6B46] text-white text-xs py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <p className="truncate font-medium mx-auto">{banner.announcementText}</p>
            <button
              type="button"
              onClick={() => setShowAnnouncement(false)}
              aria-label="বন্ধ করুন"
              className="text-white/80 hover:text-white shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Navigation Bar (Strict 1-row, 3-zone contract) */}
      <header className="sticky top-0 z-40 h-14 md:h-16 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#E5E4DF]">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element Brand Wordmark */}
          <button
            type="button"
            onClick={() => setView('home')}
            className="text-xl font-bold tracking-tight text-[#0F6B46] whitespace-nowrap shrink-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6B46] rounded"
          >
            Bazar Mate
          </button>

          {/* Zone 2: 5 Single-Line Navigation Links */}
          <nav
            aria-label="প্রধান নেভিগেশন"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#52525B]"
          >
            <button
              type="button"
              onClick={() => setView('home')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#18181B] ${
                view === 'home' ? 'text-[#0F6B46] font-semibold' : ''
              }`}
            >
              হোম
            </button>
            <button
              type="button"
              onClick={() => scrollToCatalog('ALL')}
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#18181B]"
            >
              ক্যাটাগরি
            </button>
            <button
              type="button"
              onClick={() => {
                if (view !== 'home') {
                  setView('home');
                  setTimeout(
                    () => howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' }),
                    80,
                  );
                } else {
                  howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#18181B]"
            >
              কীভাবে কাজ করে
            </button>
            <button
              type="button"
              onClick={() => setView('track')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#18181B] ${
                view === 'track' ? 'text-[#0F6B46] font-semibold' : ''
              }`}
            >
              অর্ডার ট্র্যাক
            </button>
            <button
              type="button"
              onClick={() => {
                setAdminSection('orders');
                setView('admin');
              }}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#18181B] ${
                view === 'admin' ? 'text-[#0F6B46] font-semibold' : ''
              }`}
            >
              JK
            </button>
          </nav>

          {/* Zone 3: Primary Action & Account/Cart */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setView('account')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#18181B] border border-[#E5E4DF] bg-white rounded-lg hover:bg-[#F3F2EE] whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <UserIcon className="w-3.5 h-3.5 text-[#52525B]" />
              <span className="max-w-[90px] truncate">
                {user ? user.name.split(' ')[0] : 'লগইন'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F6B46] rounded-lg hover:bg-[#0B5235] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="tabular-nums">ব্যাগ ({totalCartQty})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1">
        {view === 'home' && (
          <>
            {/* HERO SPLIT SECTION */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-10 sm:pt-10 sm:pb-14">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-6 flex flex-col justify-center space-y-5">
                  <p className="text-xs sm:text-sm font-semibold text-[#0F6B46] tracking-wide">
                    {banner?.heroBadge || 'বড়লেখা, সিলেট · লোকাল মার্কেটপ্লেস ও হোম ডেলিভারি'}
                  </p>
                  <h1 className="text-3xl sm:text-5xl font-bold text-[#18181B] leading-[1.15] tracking-tight [text-wrap:balance]">
                    {banner?.heroTitle || 'ঘরে বসেই বাজার করুন।'}
                  </h1>
                  <p className="text-base sm:text-lg text-[#52525B] leading-relaxed max-w-xl">
                    {banner?.heroSubtitle ||
                      'আপনার প্রয়োজনীয় পণ্য অর্ডার করুন, আমরা সংগ্রহ করে নিরাপদে আপনার বাসায় পৌঁছে দেব।'}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => scrollToCatalog('ALL')}
                      className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235] transition-colors min-h-[44px]"
                    >
                      <span>{banner?.heroCta || 'এখনই বাজার করুন'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        manualOrderRef.current?.scrollIntoView({ behavior: 'smooth' })
                      }
                      className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-semibold rounded-lg border border-[#0F6B46] bg-white text-[#0F6B46] hover:bg-[#0F6B46]/5 transition-colors min-h-[44px]"
                    >
                      <span>নাম লিখে অর্ডার করুন</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setView('sell')}
                      className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-semibold rounded-lg border border-[#E5E4DF] bg-white text-[#18181B] hover:bg-[#F3F2EE] transition-colors min-h-[44px]"
                    >
                      <span>পণ্য বিক্রি করুন</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setView('parcel')}
                      className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-semibold rounded-lg border border-[#0F6B46]/35 bg-[#0F6B46]/5 text-[#0F6B46] hover:bg-[#0F6B46]/10 transition-colors min-h-[44px]"
                    >
                      <Truck className="w-4 h-4" />
                      <span>পার্সেল কুরিয়ার সেবা</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setView('track')}
                      className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-semibold rounded-lg border border-[#E5E4DF] bg-white text-[#18181B] hover:bg-[#F3F2EE] transition-colors min-h-[44px]"
                    >
                      <span>অর্ডার ট্র্যাক করুন</span>
                    </button>
                  </div>

                  {/* Clean unboxed key promises */}
                  <div className="pt-4 border-t border-[#E5E4DF] flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#52525B]">
                    <span>বড়লেখা উপজেলা ৳{deliveryZones[0]?.charge ?? 100}</span>
                    <span aria-hidden="true">·</span>
                    <span>সারাদেশে ৳{deliveryZones[1]?.charge ?? 150}</span>
                    <span aria-hidden="true">·</span>
                    <span>Cash on Delivery</span>
                    <span aria-hidden="true">·</span>
                    <a
                      href={OFFICIAL_WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono-tabular font-semibold text-[#0F6B46] hover:underline"
                    >
                      ফোন ও হোয়াটসঅ্যাপ: {OFFICIAL_PHONE}
                    </a>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div className="aspect-[16/10] lg:aspect-auto lg:h-full min-h-[260px] rounded-2xl overflow-hidden border border-[#E5E4DF] bg-[#F3F2EE]">
                    <ResilientImage
                      src={HERO_IMAGE}
                      alt="Bazar Mate বড়লেখা অনলাইন মার্কেটপ্লেস ও হোম ডেলিভারি"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* SEARCH, CATEGORY NAVIGATION & PRODUCT CATALOG */}
            <section
              ref={catalogRef}
              id="catalog"
              className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 border-t border-[#E5E4DF] space-y-6"
            >
              {/* Search + Filter Controls Bar */}
              <div className="bg-white border border-[#E5E4DF] rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-6 relative">
                    <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      ref={searchInputRef}
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="পণ্যের নাম, ব্র্যান্ড বা ক্যাটাগরি খুঁজুন (যেমন: চাল, রুই মাছ, সাতকরা, চার্জার)..."
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FAF9F6] border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <select
                      aria-label="ব্র্যান্ড ফিল্টার"
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm bg-[#FAF9F6] border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                    >
                      <option value="ALL">সব ব্র্যান্ড</option>
                      {availableBrands.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <select
                      aria-label="দাম অনুযায়ী সাজান"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm bg-[#FAF9F6] border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                    >
                      <option value="default">ডিফল্ট ক্রম</option>
                      <option value="price-asc">কম দাম থেকে বেশি</option>
                      <option value="price-desc">বেশি দাম থেকে কম</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 flex items-center">
                    <label className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-xs sm:text-sm font-medium bg-[#FAF9F6] border border-[#E5E4DF] rounded-lg cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(e) => setInStockOnly(e.target.checked)}
                        className="accent-[#0F6B46]"
                      />
                      <span>স্টকে আছে</span>
                    </label>
                  </div>
                </div>

                {/* 6 Main Category Filter Buttons */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId('ALL');
                      setSelectedSubCategory('ALL');
                    }}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      selectedCategoryId === 'ALL'
                        ? 'bg-[#0F6B46] text-white border-[#0F6B46]'
                        : 'bg-[#FAF9F6] text-[#3F3F46] border-[#E5E4DF] hover:border-[#0F6B46]'
                    }`}
                  >
                    সব ক্যাটাগরি
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(cat.id);
                        setSelectedSubCategory('ALL');
                      }}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                        selectedCategoryId === cat.id
                          ? 'bg-[#0F6B46] text-white border-[#0F6B46]'
                          : 'bg-[#FAF9F6] text-[#3F3F46] border-[#E5E4DF] hover:border-[#0F6B46]'
                      }`}
                    >
                      {cat.nameBn}
                    </button>
                  ))}
                </div>

                {/* Sub-category Bar when a Category is selected */}
                {activeCategory && activeCategory.subCategories.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-[#F0EFEA]">
                    <span className="text-xs text-[#52525B] shrink-0 mr-1 flex items-center gap-1">
                      <SlidersHorizontal className="w-3 h-3" />
                      উপ-বিভাগ:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSubCategory('ALL')}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        selectedSubCategory === 'ALL'
                          ? 'bg-[#18181B] text-white font-semibold'
                          : 'text-[#52525B] hover:bg-[#F3F2EE]'
                      }`}
                    >
                      সব
                    </button>
                    {activeCategory.subCategories.map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setSelectedSubCategory(sub)}
                        className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          selectedSubCategory === sub
                            ? 'bg-[#18181B] text-white font-semibold'
                            : 'text-[#52525B] hover:bg-[#F3F2EE]'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Collection Segmented Tabs & Count */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-1 p-1 bg-[#F3F2EE] rounded-lg overflow-x-auto no-scrollbar">
                  {[
                    { id: 'all', label: 'সকল পণ্য' },
                    { id: 'featured', label: 'ফিচার্ড' },
                    { id: 'bestseller', label: 'জনপ্রিয়' },
                    { id: 'local', label: 'বড়লেখার স্থানীয় পণ্য' },
                    { id: 'offers', label: 'বিশেষ ছাড়' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCollectionTab(tab.id as CollectionTab)}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        collectionTab === tab.id
                          ? 'bg-white text-[#18181B] shadow-xs'
                          : 'text-[#52525B] hover:text-[#18181B]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <p className="text-xs text-[#52525B] tabular-nums">
                  মোট {filteredProducts.length}টি পণ্য পাওয়া গেছে
                </p>
              </div>

              {/* Product Grid */}
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div
                      key={n}
                      className="bg-white border border-[#E5E4DF] rounded-xl h-80 animate-pulse"
                    />
                  ))}
                </div>
              ) : loadError ? (
                <div className="bg-white border border-[#E5E4DF] rounded-xl p-8 text-center space-y-3">
                  <p className="text-sm text-[#DC2626]">{loadError}</p>
                  <button
                    type="button"
                    onClick={fetchStorefront}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F6B46] text-white"
                  >
                    আবার চেষ্টা করুন
                  </button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="bg-white border border-[#E5E4DF] rounded-xl p-12 text-center space-y-3">
                  <p className="text-base font-semibold text-[#18181B]">
                    এই ফিল্টারে কোনো পণ্য পাওয়া যায়নি
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategoryId('ALL');
                      setSelectedSubCategory('ALL');
                      setSelectedBrand('ALL');
                      setCollectionTab('all');
                      setInStockOnly(false);
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#E5E4DF] hover:bg-[#F3F2EE]"
                  >
                    ফিল্টার রিসেট করুন
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      category={categories.find((c) => c.id === product.categoryId)}
                      isWishlisted={Boolean(user?.wishlist.includes(product.id))}
                      onSelect={setActiveProduct}
                      onAddToCart={addToCart}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* MANUAL BAZAR LIST ORDER SECTION */}
            <div ref={manualOrderRef}>
              <ManualOrderSection
                deliveryZones={deliveryZones}
                user={user}
                onTrackOrder={(num) => {
                  setTrackOrderNum(num);
                  setView('track');
                }}
                onOpenOrderPanel={(num) => {
                  setAdminFocusOrder(num);
                  setAdminSection('orders');
                  setView('admin');
                }}
              />
            </div>

            {/* HOW BAZAR MATE WORKS + DELIVERY & REVIEWS */}
            <section
              ref={howItWorksRef}
              id="how-it-works"
              className="bg-white border-t border-[#E5E4DF] py-12 sm:py-16"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
                {/* 4-Step Procurement Process */}
                <div className="space-y-6">
                  <div className="max-w-2xl space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-bold text-[#18181B]">
                      Bazar Mate কীভাবে কাজ করে
                    </h2>
                    <p className="text-sm sm:text-base text-[#52525B]">
                      বড়লেখার বিভিন্ন বিশ্বস্ত দোকান ও কৃষকের কাছ থেকে পণ্য সংগ্রহ করে আমরা একসাথে যাচাই ও প্যাক করে পৌঁছে দেই।
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[
                      {
                        step: '০১',
                        title: 'অনলাইনে অর্ডার করুন',
                        desc: 'মুদি, তাজা মাছ-সবজি, সাতকরা বা ইলেকট্রনিক্স — প্রয়োজনীয় সব পণ্য একসাথে কার্টে যোগ করে অর্ডার করুন।',
                      },
                      {
                        step: '০২',
                        title: 'স্থানীয় দোকান থেকে সংগ্রহ',
                        desc: 'আমাদের সংগ্রহ টিম বড়লেখা দক্ষিণবাজার, উত্তরবাজার ও স্থানীয় বাগান থেকে সতেজ পণ্য সংগ্রহ করে।',
                      },
                      {
                        step: '০৩',
                        title: 'মান যাচাই ও একসাথে প্যাকিং',
                        desc: 'প্রতিটি পণ্যের ওজন ও গুণগত মান যাচাই করে সুন্দর ও নিরাপদ বক্সে একত্রিত করা হয়।',
                      },
                      {
                        step: '০৪',
                        title: 'বাসায় নিরাপদ ডেলিভারি',
                        desc: 'আমাদের ডেলিভারি রাইডার আপনার বাসায় পৌঁছে দেয় — পণ্য হাতে পেয়ে Cash on Delivery তে পরিশোধ করুন।',
                      },
                    ].map((item) => (
                      <div
                        key={item.step}
                        className="p-5 rounded-xl border border-[#E5E4DF] bg-[#FAF9F6] space-y-2"
                      >
                        <span className="text-xs font-mono-tabular font-bold text-[#0F6B46]">
                          ধাপ {item.step}
                        </span>
                        <h3 className="text-base font-bold text-[#18181B]">{item.title}</h3>
                        <p className="text-xs sm:text-sm text-[#52525B] leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery Info + Customer Reviews Adjacency */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 border-t border-[#E5E4DF]">
                  <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center gap-2 text-[#0F6B46] font-semibold text-sm">
                      <Truck className="w-4 h-4" />
                      <span>ডেলিভারি ও পেমেন্ট তথ্য</span>
                    </div>
                    <div className="space-y-3">
                      {deliveryZones.map((zone) => (
                        <div
                          key={zone.id}
                          className="p-4 rounded-xl border border-[#E5E4DF] bg-[#FAF9F6] flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="text-sm font-bold text-[#18181B]">{zone.name}</div>
                            <div className="text-xs text-[#52525B]">{zone.estimatedTime}</div>
                          </div>
                          <div className="text-lg font-bold text-[#0F6B46] tabular-nums">
                            ৳{zone.charge}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-start gap-2.5 text-xs text-[#52525B] pt-1">
                      <CheckCircle2 className="w-4 h-4 text-[#0F6B46] shrink-0 mt-0.5" />
                      <span>
                        বর্তমানে ক্যাশ অন ডেলিভারি চালু আছে; ভবিষ্যতে বিকাশ/নগদ অনলাইন পেমেন্ট ও মোবাইল অ্যাপ যুক্ত করা হবে।
                      </span>
                    </div>
                    <div className="pt-2 border-t border-[#E5E4DF] flex flex-wrap items-center gap-2 text-xs">
                      <a
                        href={OFFICIAL_PHONE_TEL}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E4DF] bg-[#FAF9F6] text-[#18181B] font-mono-tabular font-semibold hover:border-[#0F6B46]"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#0F6B46]" />
                        <span>কল: {OFFICIAL_PHONE}</span>
                      </a>
                      <a
                        href={OFFICIAL_WHATSAPP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#0F6B46]/30 bg-[#0F6B46]/5 text-[#0F6B46] font-semibold hover:bg-[#0F6B46]/10"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>হোয়াটসঅ্যাপ: {OFFICIAL_PHONE}</span>
                      </a>
                    </div>
                  </div>

                  <div className="lg:col-span-8 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-bold text-[#18181B]">
                        বড়লেখার ক্রেতাদের অভিজ্ঞতা
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowReviewForm((v) => !v)}
                        className="text-xs font-semibold text-[#0F6B46] hover:underline"
                      >
                        {showReviewForm ? 'ফর্ম বন্ধ করুন' : 'আপনার মতামত লিখুন'}
                      </button>
                    </div>

                    {showReviewForm && (
                      <form
                        onSubmit={handleReviewSubmit}
                        className="p-4 rounded-xl border border-[#E5E4DF] bg-[#FAF9F6] grid grid-cols-1 sm:grid-cols-3 gap-3"
                      >
                        <input
                          type="text"
                          required
                          value={revName}
                          onChange={(e) => setRevName(e.target.value)}
                          placeholder="আপনার নাম *"
                          className="px-3 py-2 text-xs bg-white border border-[#E5E4DF] rounded-lg"
                        />
                        <input
                          type="text"
                          value={revLocation}
                          onChange={(e) => setRevLocation(e.target.value)}
                          placeholder="এলাকা (বড়লেখা)"
                          className="px-3 py-2 text-xs bg-white border border-[#E5E4DF] rounded-lg"
                        />
                        <select
                          value={revRating}
                          onChange={(e) => setRevRating(Number(e.target.value))}
                          className="px-3 py-2 text-xs bg-white border border-[#E5E4DF] rounded-lg"
                        >
                          <option value={5}>৫ স্টার রেটিং</option>
                          <option value={4}>৪ স্টার রেটিং</option>
                          <option value={3}>৩ স্টার রেটিং</option>
                        </select>
                        <textarea
                          required
                          rows={2}
                          value={revComment}
                          onChange={(e) => setRevComment(e.target.value)}
                          placeholder="Bazar Mate সম্পর্কে আপনার অভিজ্ঞতা লিখুন *"
                          className="sm:col-span-2 px-3 py-2 text-xs bg-white border border-[#E5E4DF] rounded-lg"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235]"
                        >
                          মতামত জমা দিন
                        </button>
                      </form>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {reviews.slice(0, 3).map((rev) => (
                        <article
                          key={rev.id}
                          className="p-4 rounded-xl border border-[#E5E4DF] bg-[#FAF9F6] flex flex-col justify-between gap-3"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-0.5 text-[#D97706]">
                              {Array.from({ length: rev.rating }).map((_, idx) => (
                                <Star key={idx} className="w-3.5 h-3.5 fill-current" />
                              ))}
                            </div>
                            <p className="text-xs text-[#3F3F46] leading-relaxed">
                              “{rev.comment}”
                            </p>
                          </div>
                          <div className="pt-2 border-t border-[#E5E4DF]">
                            <div className="text-xs font-bold text-[#18181B]">
                              {rev.customerName}
                            </div>
                            <div className="text-[11px] text-[#52525B]">
                              {rev.location} · {rev.orderSummary}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {view === 'track' && <OrderTrackingView initialOrderNumber={trackOrderNum} />}

        {view === 'account' && (
          <AccountView
            user={user}
            products={products}
            deliveryZones={deliveryZones}
            onAuthSuccess={(u) => setUser(u)}
            onUserUpdate={(u) => setUser(u)}
            onLogout={() => {
              setStoredToken(null);
              setUser(null);
            }}
            onReorder={handleReorder}
            onTrackOrder={(num) => {
              setTrackOrderNum(num);
              setView('track');
            }}
            onSelectProduct={setActiveProduct}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={addToCart}
            onBrowseCatalog={() => scrollToCatalog('ALL')}
            onOpenSellProduct={() => setView('sell')}
          />
        )}

        {view === 'sell' && (
          <SellProductSection
            categories={categories}
            user={user}
            onBackHome={() => setView('home')}
            onOpenAdminSellers={() => {
              setAdminSection('sellers');
              setView('admin');
            }}
          />
        )}

        {view === 'parcel' && (
          <ParcelServiceView
            deliveryZones={deliveryZones}
            user={user}
            onBackHome={() => setView('home')}
          />
        )}

        {view === 'admin' && (
          <AdminDashboard
            user={user}
            initialSection={adminSection}
            focusOrderNumber={adminFocusOrder}
            onAuthSuccess={(u) => setUser(u)}
            onLogout={() => {
              setStoredToken(null);
              setUser(null);
            }}
            onStorefrontRefresh={fetchStorefront}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#18181B] text-[#E4E4E7] border-t border-[#27272A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-xs">
          <div className="space-y-2.5">
            <div className="text-lg font-bold text-white">Bazar Mate</div>
            <p className="text-[#A1A1AA] leading-relaxed">
              বড়লেখা, সিলেট ভিত্তিক আধুনিক অনলাইন মার্কেটপ্লেস ও হোম ডেলিভারি প্ল্যাটফর্ম। স্থানীয় দোকান ও কৃষকের পণ্য যাচাই করে একসাথে আপনার বাসায় পৌঁছে দিই।
            </p>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-white">প্রধান ক্যাটাগরি</div>
            <ul className="space-y-1.5 text-[#A1A1AA]">
              {categories.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => scrollToCatalog(c.id)}
                    className="hover:text-white transition-colors"
                  >
                    {c.nameBn}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-white">সহায়তা ও অ্যাকাউন্ট</div>
            <ul className="space-y-1.5 text-[#A1A1AA]">
              <li>
                <button type="button" onClick={() => setView('track')} className="hover:text-white">
                  অর্ডার ট্র্যাকিং
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setView('account')}
                  className="hover:text-white"
                >
                  ক্রেতা অ্যাকাউন্ট ও উইশলিস্ট
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setView('sell')}
                  className="hover:text-white"
                >
                  পণ্য বিক্রি করুন (বিক্রেতা)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setView('parcel')}
                  className="hover:text-white"
                >
                  পার্সেল কুরিয়ার সেবা (বড়লেখা)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setAdminSection('orders');
                    setView('admin');
                  }}
                  className="hover:text-white"
                >
                  JK
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-white">যোগাযোগ (বড়লেখা হাব)</div>
            <div className="flex items-start gap-2 text-[#A1A1AA]">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#10B981]" />
              <span>দক্ষিণবাজার মেইন রোড, বড়লেখা, মৌলভীবাজার, সিলেট</span>
            </div>
            <div className="flex items-center gap-2 text-[#A1A1AA] font-mono-tabular">
              <Phone className="w-3.5 h-3.5 shrink-0 text-[#10B981]" />
              <a href={OFFICIAL_PHONE_TEL} className="hover:text-white">
                {OFFICIAL_PHONE}
              </a>
              <span aria-hidden="true">·</span>
              <span>{OFFICIAL_EMAIL}</span>
            </div>
            <div className="flex items-center gap-2 text-[#10B981] font-mono-tabular">
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              <a
                href={OFFICIAL_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                WhatsApp: {OFFICIAL_PHONE}
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-[#27272A] py-4 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#71717A]">
            <span>© {new Date().getFullYear()} Bazar Mate — Barlekha, Sylhet, Bangladesh.</span>
            <span>ঘরে বসেই বাজার করুন · API-ready Local Marketplace Platform</span>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation (56px, respects 15% sticky budget) */}
      <nav
        aria-label="মোবাইল ন্যাভিগেশন"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-white border-t border-[#E5E4DF] grid grid-cols-5"
      >
        <button
          type="button"
          onClick={() => setView('home')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            view === 'home' ? 'text-[#0F6B46]' : 'text-[#52525B]'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>হোম</span>
        </button>
        <button
          type="button"
          onClick={() => {
            scrollToCatalog('ALL');
            setTimeout(() => searchInputRef.current?.focus(), 200);
          }}
          className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[#52525B]"
        >
          <Search className="w-4 h-4" />
          <span>খুঁজুন</span>
        </button>
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-[#0F6B46]"
        >
          <ShoppingBag className="w-4 h-4" />
          <span className="tabular-nums">ব্যাগ ({totalCartQty})</span>
        </button>
        <button
          type="button"
          onClick={() => setView('track')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            view === 'track' ? 'text-[#0F6B46]' : 'text-[#52525B]'
          }`}
        >
          <PackageSearch className="w-4 h-4" />
          <span>ট্র্যাক</span>
        </button>
        <button
          type="button"
          onClick={() => setView('account')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            view === 'account' ? 'text-[#0F6B46]' : 'text-[#52525B]'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>অ্যাকাউন্ট</span>
        </button>
      </nav>

      {/* Subtle Add-to-Cart Toast */}
      {cartToast && (
        <div className="fixed bottom-16 md:bottom-6 right-4 z-50 bg-[#18181B] text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-lg">
          {cartToast}
        </div>
      )}

      {/* Product Detail Modal */}
      <ProductModal
        product={activeProduct}
        category={
          activeProduct
            ? categories.find((c) => c.id === activeProduct.categoryId)
            : undefined
        }
        relatedProducts={relatedProducts}
        isWishlisted={Boolean(activeProduct && user?.wishlist.includes(activeProduct.id))}
        onClose={() => setActiveProduct(null)}
        onSelectProduct={setActiveProduct}
        onAddToCart={addToCart}
        onBuyNow={handleBuyNow}
        onToggleWishlist={handleToggleWishlist}
      />

      {/* Slide-Over Cart Drawer */}
      <CartDrawer
        open={cartOpen}
        items={cart}
        deliveryZones={deliveryZones}
        selectedZoneId={selectedZoneId}
        appliedCoupon={appliedCoupon}
        onSelectZone={setSelectedZoneId}
        onApplyCoupon={setAppliedCoupon}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeCartItem}
        onClose={() => setCartOpen(false)}
        onProceedToCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        open={checkoutOpen}
        items={cart}
        deliveryZones={deliveryZones}
        selectedZoneId={selectedZoneId}
        appliedCoupon={appliedCoupon}
        user={user}
        onSelectZone={setSelectedZoneId}
        onOrderSuccess={() => {
          setCart([]);
          setAppliedCoupon(null);
          fetchStorefront();
        }}
        onTrackOrder={(num) => {
          setTrackOrderNum(num);
          setView('track');
        }}
        onOpenOrderPanel={(num) => {
          setAdminFocusOrder(num);
          setAdminSection('orders');
          setView('admin');
        }}
        onClose={() => setCheckoutOpen(false)}
      />
    </div>
  );
}
