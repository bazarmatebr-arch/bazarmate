import { useEffect, useState } from 'react';
import {
  BarChart3,
  Boxes,
  CheckSquare,
  ClipboardList,
  FolderTree,
  Lock,
  Plus,
  Settings,
  Store,
  Tag,
  Trash2,
  Truck,
  Users,
} from 'lucide-react';
import { api, setStoredToken } from '../lib/api';
import {
  ORDER_STATUS_BN,
  ORDER_STATUS_FLOW,
  type AdminOverviewStats,
  type BannerSettings,
  type Category,
  type Coupon,
  type DeliveryZone,
  type Order,
  type OrderStatus,
  type Product,
  type Supplier,
  type User,
} from '../types/marketplace';

interface AdminDashboardProps {
  user: User | null;
  onAuthSuccess: (user: User) => void;
  onStorefrontRefresh: () => void;
}

type AdminSection =
  | 'overview'
  | 'orders'
  | 'products'
  | 'categories'
  | 'suppliers'
  | 'delivery'
  | 'coupons'
  | 'customers';

const SECTION_LABELS: Record<AdminSection, string> = {
  overview: 'ওভারভিউ ও রিপোর্ট',
  orders: 'অর্ডার ও ফুলফিলমেন্ট',
  products: 'পণ্য ও স্টক',
  categories: 'ক্যাটাগরি ও সাব-ক্যাটাগরি',
  suppliers: 'সাপ্লায়ার ম্যানেজমেন্ট',
  delivery: 'ডেলিভারি চার্জ ও ব্যানার',
  coupons: 'কুপন ও ডিসকাউন্ট',
  customers: 'ক্রেতা তালিকা',
};

export function AdminDashboard({
  user,
  onAuthSuccess,
  onStorefrontRefresh,
}: AdminDashboardProps) {
  const [section, setSection] = useState<AdminSection>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Admin Login state
  const [loginId, setLoginId] = useState('admin@bazarmate.bd');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Data
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [banner, setBanner] = useState<BannerSettings | null>(null);
  const [customers, setCustomers] = useState<User[]>([]);

  // Order Fulfillment selection
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [statusNote, setStatusNote] = useState('');

  // Product Form
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodForm, setProdForm] = useState<Partial<Product>>({
    name: '',
    categoryId: 'cat-grocery',
    subCategory: 'চাল',
    brand: '',
    unit: '১ কেজি',
    price: 0,
    compareAtPrice: undefined,
    purchasePrice: 0,
    stock: 20,
    supplierId: 'sup-1',
    description: '',
    featured: false,
    bestSeller: false,
    isLocalSpecial: false,
    image: '/src/assets/images/cat_grocery_essentials_1794993131782.jpg',
  });

  // Category Form
  const [catName, setCatName] = useState('');
  const [catNameBn, setCatNameBn] = useState('');
  const [catSubs, setCatSubs] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Supplier Form
  const [supForm, setSupForm] = useState<Partial<Supplier>>({
    name: '',
    shopName: '',
    mobile: '',
    address: '',
    marketArea: '',
    notes: '',
  });
  const [editingSupId, setEditingSupId] = useState<string | null>(null);

  // Coupon Form
  const [cpnCode, setCpnCode] = useState('');
  const [cpnType, setCpnType] = useState<'fixed' | 'percent'>('fixed');
  const [cpnValue, setCpnValue] = useState(50);
  const [cpnMin, setCpnMin] = useState(500);

  // New Zone Form
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneCharge, setNewZoneCharge] = useState(120);
  const [newZoneTime, setNewZoneTime] = useState('৩–৬ ঘণ্টার মধ্যে');
  const [savedNotice, setSavedNotice] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAdminDashboard();
      setStats(data.stats);
      setCategories(data.categories);
      setProducts(data.products);
      setSuppliers(data.suppliers);
      setOrders(data.orders);
      setDeliveryZones(data.deliveryZones);
      setCoupons(data.coupons);
      setBanner(data.banner);
      setCustomers(data.customers);
      if (data.orders.length > 0 && !selectedOrder) {
        const first = data.orders[0];
        setSelectedOrder(first);
        setRiderName(first.fulfillment.deliveryRiderName || '');
        setRiderPhone(first.fulfillment.deliveryRiderPhone || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'অ্যাডমিন ডেটা লোড করা যায়নি।');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      loadDashboard();
    }
  }, [user]);

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await api.login({ identifier: loginId, password: loginPass });
      if (res.user.role !== 'admin') {
        setLoginError('এই অ্যাকাউন্টটির অ্যাডমিন অনুমতি নেই।');
        return;
      }
      setStoredToken(res.token);
      onAuthSuccess(res.user);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'লগইন ব্যর্থ হয়েছে।');
    }
  }

  function flashSaved(msg: string) {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(''), 2500);
  }

  if (!user || user.role !== 'admin') {
    return (
      <section className="max-w-md mx-auto px-4 py-14">
        <div className="bg-white border border-[#E5E4DF] rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0F6B46]/10 text-[#0F6B46] flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#18181B]">Bazar Mate অ্যাডমিন প্যানেল</h1>
              <p className="text-xs text-[#52525B]">পণ্য, সাপ্লায়ার, অর্ডার ফুলফিলমেন্ট ও ডেলিভারি নিয়ন্ত্রণ</p>
            </div>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#18181B] mb-1">অ্যাডমিন ইমেইল</label>
              <input
                type="text"
                required
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#E5E4DF] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#18181B] mb-1">পাসওয়ার্ড</label>
              <input
                type="password"
                required
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="admin123"
                className="w-full px-3.5 py-2.5 text-sm border border-[#E5E4DF] rounded-lg"
              />
            </div>

            {loginError && (
              <p className="text-xs text-[#DC2626] bg-[#FEF2F2] p-2.5 rounded-lg border border-[#FECACA]">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 text-sm font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235]"
            >
              অ্যাডমিন ড্যাশবোর্ডে প্রবেশ করুন
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginId('admin@bazarmate.bd');
                setLoginPass('admin123');
              }}
              className="w-full py-2 text-xs font-medium text-[#52525B] border border-[#E5E4DF] rounded-lg hover:bg-[#FAF9F6]"
            >
              অ্যাডমিন ডেমো তথ্য পূরণ করুন (admin@bazarmate.bd / admin123)
            </button>
          </form>
        </div>
      </section>
    );
  }

  async function handleOrderUpdate(
    order: Order,
    updates: {
      status?: OrderStatus;
      note?: string;
      items?: Order['items'];
      fulfillment?: Partial<Order['fulfillment']>;
    },
  ) {
    const updated = await api.updateOrder(order.id, updates);
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setSelectedOrder(updated);
    flashSaved(`অর্ডার ${updated.orderNumber} আপডেট হয়েছে`);
    loadDashboard();
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (editingProductId) {
      await api.updateProduct(editingProductId, prodForm);
      flashSaved('পণ্য আপডেট হয়েছে');
    } else {
      await api.createProduct(prodForm);
      flashSaved('নতুন পণ্য যুক্ত হয়েছে');
    }
    setEditingProductId(null);
    setProdForm({
      name: '',
      categoryId: categories[0]?.id || 'cat-grocery',
      subCategory: categories[0]?.subCategories[0] || '',
      brand: '',
      unit: '১ কেজি',
      price: 0,
      purchasePrice: 0,
      stock: 20,
      supplierId: suppliers[0]?.id || 'sup-1',
      description: '',
      featured: false,
      bestSeller: false,
      isLocalSpecial: false,
      image: categories[0]?.image || '/src/assets/images/cat_grocery_essentials_1794993131782.jpg',
    });
    await loadDashboard();
    onStorefrontRefresh();
  }

  async function handleQuickStockOrPrice(p: Product, patch: Partial<Product>) {
    await api.updateProduct(p.id, patch);
    await loadDashboard();
    onStorefrontRefresh();
    flashSaved('স্টক/মূল্য আপডেট হয়েছে');
  }

  async function handleDeleteProduct(id: string) {
    await api.deleteProduct(id);
    await loadDashboard();
    onStorefrontRefresh();
    flashSaved('পণ্য মুছে ফেলা হয়েছে');
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    const subCategories = catSubs
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (editingCatId) {
      await api.updateCategory(editingCatId, { name: catName, nameBn: catNameBn, subCategories });
      flashSaved('ক্যাটাগরি আপডেট হয়েছে');
    } else {
      await api.createCategory({ name: catName, nameBn: catNameBn, subCategories });
      flashSaved('নতুন ক্যাটাগরি তৈরি হয়েছে');
    }
    setEditingCatId(null);
    setCatName('');
    setCatNameBn('');
    setCatSubs('');
    await loadDashboard();
    onStorefrontRefresh();
  }

  async function handleSaveSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (editingSupId) {
      await api.updateSupplier(editingSupId, supForm);
      flashSaved('সাপ্লায়ার তথ্য আপডেট হয়েছে');
    } else {
      await api.createSupplier(supForm);
      flashSaved('নতুন সাপ্লায়ার যুক্ত হয়েছে');
    }
    setEditingSupId(null);
    setSupForm({ name: '', shopName: '', mobile: '', address: '', marketArea: '', notes: '' });
    await loadDashboard();
  }

  async function handleSaveZones(nextZones: DeliveryZone[]) {
    const updated = await api.updateDeliveryZones(nextZones);
    setDeliveryZones(updated);
    onStorefrontRefresh();
    flashSaved('ডেলিভারি চার্জ সংরক্ষিত হয়েছে');
  }

  async function handleSaveBanner(e: React.FormEvent) {
    e.preventDefault();
    if (!banner) return;
    const updated = await api.updateBanner(banner);
    setBanner(updated);
    onStorefrontRefresh();
    flashSaved('ব্যানার ও হেডলাইন সংরক্ষিত হয়েছে');
  }

  async function handleAddCoupon(e: React.FormEvent) {
    e.preventDefault();
    await api.createCoupon({
      code: cpnCode,
      type: cpnType,
      value: cpnValue,
      minOrder: cpnMin,
      active: true,
    });
    setCpnCode('');
    await loadDashboard();
    flashSaved('নতুন কুপন যুক্ত হয়েছে');
  }

  const filteredOrders =
    orderStatusFilter === 'ALL'
      ? orders
      : orders.filter((o) => o.status === orderStatusFilter);

  const navItems: { id: AdminSection; label: string; icon: typeof BarChart3 }[] = [
    { id: 'overview', label: 'ওভারভিউ ও রিপোর্ট', icon: BarChart3 },
    { id: 'orders', label: 'অর্ডার ও ফুলফিলমেন্ট', icon: ClipboardList },
    { id: 'products', label: 'পণ্য ও স্টক', icon: Boxes },
    { id: 'categories', label: 'ক্যাটাগরি', icon: FolderTree },
    { id: 'suppliers', label: 'সাপ্লায়ার', icon: Store },
    { id: 'delivery', label: 'ডেলিভারি ও ব্যানার', icon: Truck },
    { id: 'coupons', label: 'কুপন', icon: Tag },
    { id: 'customers', label: 'ক্রেতা', icon: Users },
  ];

  // Group selected order items by Supplier for Procurement List
  const supplierGroupedItems = selectedOrder
    ? selectedOrder.items.reduce<
        Record<string, { supplierName: string; supplier?: Supplier; items: Order['items'] }>
      >((acc, item) => {
        if (!acc[item.supplierId]) {
          acc[item.supplierId] = {
            supplierName: item.supplierName,
            supplier: suppliers.find((s) => s.id === item.supplierId),
            items: [],
          };
        }
        acc[item.supplierId].items.push(item);
        return acc;
      }, {})
    : {};

  return (
    <div className="min-h-[82vh] bg-[#FAF9F6] border-t border-[#E5E4DF]">
      <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row">
        {/* 240px Sidebar Navigation */}
        <aside className="lg:w-64 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-[#E5E4DF] p-4">
          <div className="px-2 pb-3 mb-3 border-b border-[#F0EFEA] hidden lg:block">
            <p className="text-xs font-semibold text-[#52525B]">Bazar Mate অপারেশনস</p>
            <p className="text-sm font-bold text-[#18181B]">অ্যাডমিন কন্ট্রোল</p>
          </div>
          <nav className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#0F6B46] text-white'
                      : 'text-[#3F3F46] hover:bg-[#F3F2EE]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Viewport */}
        <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Top Breadcrumb Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E5E4DF]">
            <div className="text-sm text-[#52525B]">
              <span>অ্যাডমিন</span>
              <span className="mx-2">/</span>
              <span className="font-semibold text-[#18181B]">{SECTION_LABELS[section]}</span>
            </div>
            <div className="flex items-center gap-3">
              {savedNotice && (
                <span className="text-xs font-semibold text-[#0F6B46]">{savedNotice}</span>
              )}
              <button
                type="button"
                onClick={loadDashboard}
                className="px-3.5 py-2 text-xs font-semibold border border-[#E5E4DF] bg-white rounded-lg hover:bg-[#F3F2EE]"
              >
                {loading ? 'রিফ্রেশ হচ্ছে...' : 'ডেটা রিফ্রেশ'}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#DC2626]">
              {error}
            </div>
          )}

          {/* 1. OVERVIEW & REPORTS */}
          {section === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { label: 'মোট অর্ডার', value: stats.totalOrders, prefix: '' },
                  { label: 'মোট বিক্রি (Sales)', value: stats.totalSales, prefix: '৳' },
                  { label: 'চলমান (Pending/Active)', value: stats.pendingOrders, prefix: '' },
                  { label: 'সম্পন্ন ডেলিভারি', value: stats.deliveredOrders, prefix: '' },
                  { label: 'মোট ক্রেতা', value: stats.totalCustomers, prefix: '' },
                  { label: 'মোট পণ্য', value: stats.totalProducts, prefix: '' },
                  { label: 'কম স্টক পণ্য (≤10)', value: stats.lowStockProducts.length, prefix: '' },
                  { label: 'সম্ভাব্য গ্রস মার্জিন', value: stats.estimatedProfit, prefix: '৳' },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="bg-white border border-[#E5E4DF] rounded-xl p-4 space-y-1"
                  >
                    <p className="text-xs text-[#52525B]">{kpi.label}</p>
                    <p className="text-2xl font-bold text-[#18181B] tabular-nums">
                      {kpi.prefix}
                      {kpi.value.toLocaleString('en-US')}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Low Stock Alerts */}
                <div className="bg-white border border-[#E5E4DF] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#E5E4DF] flex items-center justify-between">
                    <h2 className="text-sm font-bold text-[#18181B]">কম স্টক সতর্কতা</h2>
                    <span className="text-xs text-[#D97706] font-medium">
                      {stats.lowStockProducts.length}টি পণ্য
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF9F6] text-[#52525B] border-b border-[#E5E4DF]">
                        <tr>
                          <th className="px-4 py-2.5 font-semibold">পণ্য</th>
                          <th className="px-4 py-2.5 font-semibold text-right">স্টক</th>
                          <th className="px-4 py-2.5 font-semibold text-right">দাম</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0EFEA]">
                        {stats.lowStockProducts.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-[#52525B]">
                              সব পণ্যের পর্যাপ্ত স্টক রয়েছে।
                            </td>
                          </tr>
                        ) : (
                          stats.lowStockProducts.map((p) => (
                            <tr key={p.id} className="hover:bg-[#FAF9F6]">
                              <td className="px-4 py-2.5 font-medium text-[#18181B]">{p.name}</td>
                              <td className="px-4 py-2.5 text-right font-mono-tabular font-bold text-[#DC2626]">
                                {p.stock}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono-tabular">
                                ৳{p.price}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Orders Summary */}
                <div className="bg-white border border-[#E5E4DF] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#E5E4DF] flex items-center justify-between">
                    <h2 className="text-sm font-bold text-[#18181B]">সাম্প্রতিক অর্ডারসমূহ</h2>
                    <button
                      type="button"
                      onClick={() => setSection('orders')}
                      className="text-xs font-semibold text-[#0F6B46] hover:underline"
                    >
                      সব দেখুন
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF9F6] text-[#52525B] border-b border-[#E5E4DF]">
                        <tr>
                          <th className="px-4 py-2.5 font-semibold">অর্ডার</th>
                          <th className="px-4 py-2.5 font-semibold">ক্রেতা</th>
                          <th className="px-4 py-2.5 font-semibold">স্ট্যাটাস</th>
                          <th className="px-4 py-2.5 font-semibold text-right">মোট</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0EFEA]">
                        {orders.slice(0, 6).map((o) => (
                          <tr key={o.id} className="hover:bg-[#FAF9F6]">
                            <td className="px-4 py-2.5 font-mono-tabular font-semibold">
                              {o.orderNumber}
                            </td>
                            <td className="px-4 py-2.5">{o.customerName}</td>
                            <td className="px-4 py-2.5 text-[#52525B]">{o.status}</td>
                            <td className="px-4 py-2.5 text-right font-mono-tabular font-semibold">
                              ৳{o.totalAmount.toLocaleString('en-US')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. ORDERS & 9-STAGE FULFILLMENT */}
          {section === 'orders' && (
            <div className="space-y-5">
              {/* Status Filter */}
              <div className="flex flex-wrap gap-1.5">
                {['ALL', ...ORDER_STATUS_FLOW].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      orderStatusFilter === st
                        ? 'bg-[#0F6B46] text-white border-[#0F6B46]'
                        : 'bg-white text-[#52525B] border-[#E5E4DF] hover:text-[#18181B]'
                    }`}
                  >
                    {st === 'ALL' ? `সব (${orders.length})` : st}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Order Table */}
                <div className="xl:col-span-5 bg-white border border-[#E5E4DF] rounded-xl overflow-hidden h-fit">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF9F6] text-[#52525B] border-b border-[#E5E4DF]">
                        <tr>
                          <th className="px-3.5 py-2.5 font-semibold">অর্ডার</th>
                          <th className="px-3.5 py-2.5 font-semibold">ক্রেতা ও এলাকা</th>
                          <th className="px-3.5 py-2.5 font-semibold">অবস্থা</th>
                          <th className="px-3.5 py-2.5 font-semibold text-right">মোট</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0EFEA]">
                        {filteredOrders.map((o) => {
                          const isSelected = selectedOrder?.id === o.id;
                          return (
                            <tr
                              key={o.id}
                              onClick={() => {
                                setSelectedOrder(o);
                                setRiderName(o.fulfillment.deliveryRiderName || '');
                                setRiderPhone(o.fulfillment.deliveryRiderPhone || '');
                              }}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-[#0F6B46]/8' : 'hover:bg-[#FAF9F6]'
                              }`}
                            >
                              <td className="px-3.5 py-3 font-mono-tabular font-bold text-[#18181B]">
                                {o.orderNumber}
                              </td>
                              <td className="px-3.5 py-3">
                                <div className="font-medium text-[#18181B]">{o.customerName}</div>
                                <div className="text-[11px] text-[#52525B]">{o.area}</div>
                              </td>
                              <td className="px-3.5 py-3 text-[#0F6B46] font-medium">{o.status}</td>
                              <td className="px-3.5 py-3 text-right font-mono-tabular font-semibold">
                                ৳{o.totalAmount}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Fulfillment Procurement Console */}
                <div className="xl:col-span-7 bg-white border border-[#E5E4DF] rounded-xl p-5 space-y-6">
                  {!selectedOrder ? (
                    <p className="text-sm text-[#52525B] py-10 text-center">
                      বাম পাশ থেকে যেকোনো অর্ডার নির্বাচন করে ফুলফিলমেন্ট প্রক্রিয়া পরিচালনা করুন।
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#F0EFEA] pb-4">
                        <div>
                          <div className="text-xs font-mono-tabular text-[#52525B]">
                            {selectedOrder.orderNumber} · {selectedOrder.paymentMethod}
                          </div>
                          <h3 className="text-lg font-bold text-[#18181B]">
                            {selectedOrder.customerName} ({selectedOrder.customerMobile})
                          </h3>
                          <p className="text-xs text-[#52525B] mt-0.5">
                            ঠিকানা: {selectedOrder.deliveryAddress}
                          </p>
                          {selectedOrder.orderNote && (
                            <p className="text-xs text-[#D97706] mt-1">
                              নোট: {selectedOrder.orderNote}
                            </p>
                          )}
                        </div>
                        <div className="text-right tabular-nums">
                          <div className="text-xs text-[#52525B]">বর্তমান স্ট্যাটাস</div>
                          <div className="text-sm font-bold text-[#0F6B46]">
                            {ORDER_STATUS_BN[selectedOrder.status]}
                          </div>
                        </div>
                      </div>

                      {/* Step 1: Supplier-grouped Product Procurement List */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-[#18181B]">
                            ১. সাপ্লায়ার অনুযায়ী সংগ্রহ ও মান যাচাই তালিকা
                          </h4>
                          <span className="text-xs text-[#52525B]">
                            {Object.keys(supplierGroupedItems).length}টি স্থানীয় দোকান
                          </span>
                        </div>

                        <div className="space-y-3">
                          {Object.entries(supplierGroupedItems).map(([supId, group]) => (
                            <div
                              key={supId}
                              className="border border-[#E5E4DF] rounded-lg p-3.5 bg-[#FAF9F6] space-y-2.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="font-bold text-[#18181B]">
                                  {group.supplierName}
                                </span>
                                <span className="text-[#52525B]">
                                  {group.supplier?.marketArea} · {group.supplier?.mobile}
                                </span>
                              </div>
                              <div className="space-y-2">
                                {group.items.map((item) => (
                                  <div
                                    key={item.productId}
                                    className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#E5E4DF] rounded-md px-3 py-2 text-xs"
                                  >
                                    <div>
                                      <span className="font-medium text-[#18181B]">
                                        {item.productName} ({item.unit}) × {item.quantity}
                                      </span>
                                      <span className="ml-2 text-[#52525B] font-mono-tabular">
                                        কেনা: ৳{item.purchasePrice} | বিক্রি: ৳{item.price}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={item.collected}
                                          onChange={(e) => {
                                            const nextItems = selectedOrder.items.map((x) =>
                                              x.productId === item.productId
                                                ? { ...x, collected: e.target.checked }
                                                : x,
                                            );
                                            handleOrderUpdate(selectedOrder, { items: nextItems });
                                          }}
                                          className="accent-[#0F6B46]"
                                        />
                                        <span>সংগৃহীত</span>
                                      </label>
                                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={item.qcPassed}
                                          onChange={(e) => {
                                            const nextItems = selectedOrder.items.map((x) =>
                                              x.productId === item.productId
                                                ? { ...x, qcPassed: e.target.checked }
                                                : x,
                                            );
                                            handleOrderUpdate(selectedOrder, { items: nextItems });
                                          }}
                                          className="accent-[#0F6B46]"
                                        />
                                        <span>QC পাস</span>
                                      </label>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Step 2: Consolidation, Packing & Rider Assignment */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#F0EFEA]">
                        <div className="space-y-2.5">
                          <h4 className="text-sm font-bold text-[#18181B]">
                            ২. কনসলিডেশন ও প্যাকিং চেকলিস্ট
                          </h4>
                          {[
                            { key: 'collectionCompleted', label: 'সব দোকান থেকে সংগ্রহ সম্পন্ন' },
                            { key: 'qualityCheckPassed', label: 'সম্পূর্ণ অর্ডার মান যাচাই সম্পন্ন' },
                            { key: 'consolidated', label: 'হাব-এ একত্রিত করা হয়েছে' },
                            { key: 'packed', label: 'নিরাপদ প্যাকিং সম্পন্ন' },
                          ].map((chk) => {
                            const checked = Boolean(
                              selectedOrder.fulfillment[
                                chk.key as keyof Order['fulfillment']
                              ],
                            );
                            return (
                              <label
                                key={chk.key}
                                className="flex items-center gap-2 text-xs text-[#18181B] cursor-pointer"
                              >
                                <CheckSquare
                                  className={`w-4 h-4 ${
                                    checked ? 'text-[#0F6B46]' : 'text-[#A1A1AA]'
                                  }`}
                                />
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={checked}
                                  onChange={(e) =>
                                    handleOrderUpdate(selectedOrder, {
                                      fulfillment: { [chk.key]: e.target.checked },
                                    })
                                  }
                                />
                                <span>{chk.label}</span>
                              </label>
                            );
                          })}
                        </div>

                        <div className="space-y-2.5">
                          <h4 className="text-sm font-bold text-[#18181B]">
                            ৩. ডেলিভারি রাইডার অ্যাসাইনমেন্ট
                          </h4>
                          <input
                            type="text"
                            value={riderName}
                            onChange={(e) => setRiderName(e.target.value)}
                            placeholder="রাইডারের নাম (যেমন: কামাল হোসেন)"
                            className="w-full px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                          />
                          <input
                            type="tel"
                            value={riderPhone}
                            onChange={(e) => setRiderPhone(e.target.value)}
                            placeholder="রাইডারের মোবাইল নম্বর"
                            className="w-full px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleOrderUpdate(selectedOrder, {
                                fulfillment: {
                                  deliveryRiderName: riderName,
                                  deliveryRiderPhone: riderPhone,
                                },
                              })
                            }
                            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[#0F6B46] text-[#0F6B46] hover:bg-[#0F6B46]/5"
                          >
                            রাইডার সংরক্ষণ করুন
                          </button>
                        </div>
                      </div>

                      {/* Step 3: Order Status Transitions */}
                      <div className="pt-3 border-t border-[#F0EFEA] space-y-2.5">
                        <h4 className="text-sm font-bold text-[#18181B]">
                          ৪. অর্ডার স্ট্যাটাস পরিবর্তন করুন
                        </h4>
                        <input
                          type="text"
                          value={statusNote}
                          onChange={(e) => setStatusNote(e.target.value)}
                          placeholder="ঐচ্ছিক স্ট্যাটাস নোট (যেমন: ডেলিভারি ম্যান রওনা দিয়েছে)"
                          className="w-full px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                        />
                        <div className="flex flex-wrap gap-2">
                          {ORDER_STATUS_FLOW.map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => {
                                handleOrderUpdate(selectedOrder, {
                                  status: st,
                                  note: statusNote || undefined,
                                });
                                setStatusNote('');
                              }}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                                selectedOrder.status === st
                                  ? 'bg-[#0F6B46] text-white border-[#0F6B46]'
                                  : st === 'Cancelled'
                                    ? 'border-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2]'
                                    : 'border-[#E5E4DF] bg-[#FAF9F6] text-[#18181B] hover:border-[#0F6B46]'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. PRODUCTS MANAGEMENT */}
          {section === 'products' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <form
                onSubmit={handleSaveProduct}
                className="xl:col-span-4 bg-white border border-[#E5E4DF] rounded-xl p-5 space-y-3 h-fit"
              >
                <h2 className="text-sm font-bold text-[#18181B]">
                  {editingProductId ? 'পণ্য সম্পাদনা' : 'নতুন পণ্য যোগ করুন'}
                </h2>
                <input
                  type="text"
                  required
                  value={prodForm.name || ''}
                  onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                  placeholder="পণ্যের নাম *"
                  className="w-full px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <select
                    value={prodForm.categoryId || ''}
                    onChange={(e) => {
                      const cat = categories.find((c) => c.id === e.target.value);
                      setProdForm({
                        ...prodForm,
                        categoryId: e.target.value,
                        subCategory: cat?.subCategories[0] || '',
                        image: cat?.image || prodForm.image,
                      });
                    }}
                    className="w-full px-2.5 py-2 text-xs bg-white border border-[#E5E4DF] rounded-lg"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={prodForm.subCategory || ''}
                    onChange={(e) => setProdForm({ ...prodForm, subCategory: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs bg-white border border-[#E5E4DF] rounded-lg"
                  >
                    {(
                      categories.find((c) => c.id === prodForm.categoryId)?.subCategories || []
                    ).map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={prodForm.brand || ''}
                    onChange={(e) => setProdForm({ ...prodForm, brand: e.target.value })}
                    placeholder="ব্র্যান্ড"
                    className="w-full px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    value={prodForm.unit || ''}
                    onChange={(e) => setProdForm({ ...prodForm, unit: e.target.value })}
                    placeholder="ওজন/ইউনিট (১ কেজি)"
                    className="w-full px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-[#52525B]">বিক্রয় মূল্য ৳</label>
                    <input
                      type="number"
                      required
                      value={prodForm.price || 0}
                      onChange={(e) => setProdForm({ ...prodForm, price: Number(e.target.value) })}
                      className="w-full px-2.5 py-2 text-xs border border-[#E5E4DF] rounded-lg tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#52525B]">কেনা দাম ৳</label>
                    <input
                      type="number"
                      value={prodForm.purchasePrice || 0}
                      onChange={(e) =>
                        setProdForm({ ...prodForm, purchasePrice: Number(e.target.value) })
                      }
                      className="w-full px-2.5 py-2 text-xs border border-[#E5E4DF] rounded-lg tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#52525B]">স্টক</label>
                    <input
                      type="number"
                      value={prodForm.stock || 0}
                      onChange={(e) => setProdForm({ ...prodForm, stock: Number(e.target.value) })}
                      className="w-full px-2.5 py-2 text-xs border border-[#E5E4DF] rounded-lg tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-[#52525B]">সাপ্লায়ার</label>
                  <select
                    value={prodForm.supplierId || ''}
                    onChange={(e) => setProdForm({ ...prodForm, supplierId: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs bg-white border border-[#E5E4DF] rounded-lg"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.shopName} ({s.marketArea})
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  rows={2}
                  value={prodForm.description || ''}
                  onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                  placeholder="পণ্যের বিবরণ"
                  className="w-full px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                />

                <div className="flex flex-wrap gap-3 text-xs">
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={Boolean(prodForm.featured)}
                      onChange={(e) => setProdForm({ ...prodForm, featured: e.target.checked })}
                      className="accent-[#0F6B46]"
                    />
                    <span>Featured</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={Boolean(prodForm.bestSeller)}
                      onChange={(e) => setProdForm({ ...prodForm, bestSeller: e.target.checked })}
                      className="accent-[#0F6B46]"
                    />
                    <span>Best Seller</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={Boolean(prodForm.isLocalSpecial)}
                      onChange={(e) =>
                        setProdForm({ ...prodForm, isLocalSpecial: e.target.checked })
                      }
                      className="accent-[#0F6B46]"
                    />
                    <span>Local Special</span>
                  </label>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-2 text-xs font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235]"
                  >
                    {editingProductId ? 'আপডেট করুন' : 'পণ্য যুক্ত করুন'}
                  </button>
                  {editingProductId && (
                    <button
                      type="button"
                      onClick={() => setEditingProductId(null)}
                      className="px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                    >
                      বাতিল
                    </button>
                  )}
                </div>
              </form>

              <div className="xl:col-span-8 bg-white border border-[#E5E4DF] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF9F6] text-[#52525B] border-b border-[#E5E4DF]">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">পণ্য</th>
                        <th className="px-4 py-2.5 font-semibold">সাব-ক্যাটাগরি</th>
                        <th className="px-4 py-2.5 font-semibold text-right">দাম (৳)</th>
                        <th className="px-4 py-2.5 font-semibold text-right">স্টক</th>
                        <th className="px-4 py-2.5 font-semibold text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EFEA]">
                      {products.map((p) => (
                        <tr key={p.id} className="hover:bg-[#FAF9F6]">
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-[#18181B]">{p.name}</div>
                            <div className="text-[11px] text-[#52525B]">
                              {p.unit} · {p.brand}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-[#52525B]">{p.subCategory}</td>
                          <td className="px-4 py-2.5 text-right font-mono-tabular">
                            <input
                              type="number"
                              defaultValue={p.price}
                              onBlur={(e) => {
                                const val = Number(e.target.value);
                                if (val !== p.price) handleQuickStockOrPrice(p, { price: val });
                              }}
                              className="w-20 px-2 py-1 text-right border border-[#E5E4DF] rounded"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono-tabular">
                            <input
                              type="number"
                              defaultValue={p.stock}
                              onBlur={(e) => {
                                const val = Number(e.target.value);
                                if (val !== p.stock) handleQuickStockOrPrice(p, { stock: val });
                              }}
                              className="w-16 px-2 py-1 text-right border border-[#E5E4DF] rounded"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProductId(p.id);
                                setProdForm(p);
                              }}
                              className="text-[#0F6B46] font-semibold hover:underline"
                            >
                              এডিট
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p.id)}
                              className="text-[#DC2626] hover:underline"
                            >
                              মুছুন
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4. CATEGORIES MANAGEMENT */}
          {section === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleSaveCategory}
                className="lg:col-span-4 bg-white border border-[#E5E4DF] rounded-xl p-5 space-y-3 h-fit"
              >
                <h2 className="text-sm font-bold text-[#18181B]">
                  {editingCatId ? 'ক্যাটাগরি সম্পাদনা' : 'নতুন ক্যাটাগরি যোগ করুন'}
                </h2>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="English Name (e.g. Fresh Food)"
                  className="w-full px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                />
                <input
                  type="text"
                  required
                  value={catNameBn}
                  onChange={(e) => setCatNameBn(e.target.value)}
                  placeholder="বাংলা নাম (যেমন: তাজা মাছ ও মাংস)"
                  className="w-full px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                />
                <textarea
                  rows={3}
                  value={catSubs}
                  onChange={(e) => setCatSubs(e.target.value)}
                  placeholder="সাব-ক্যাটাগরি কমা (,) দিয়ে আলাদা করে লিখুন (যেমন: চাল, ডাল, তেল)"
                  className="w-full px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 text-xs font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235]"
                  >
                    {editingCatId ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                  </button>
                  {editingCatId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatId(null);
                        setCatName('');
                        setCatNameBn('');
                        setCatSubs('');
                      }}
                      className="px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                    >
                      বাতিল
                    </button>
                  )}
                </div>
              </form>

              <div className="lg:col-span-8 space-y-3">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="bg-white border border-[#E5E4DF] rounded-xl p-4 flex flex-wrap items-start justify-between gap-4"
                  >
                    <div className="space-y-1 flex-1">
                      <h3 className="text-sm font-bold text-[#18181B]">
                        {cat.name} · <span className="text-[#0F6B46]">{cat.nameBn}</span>
                      </h3>
                      <p className="text-xs text-[#52525B] leading-relaxed">
                        সাব-ক্যাটাগরি: {cat.subCategories.join(' · ')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatId(cat.id);
                        setCatName(cat.name);
                        setCatNameBn(cat.nameBn);
                        setCatSubs(cat.subCategories.join(', '));
                      }}
                      className="text-xs font-semibold text-[#0F6B46] hover:underline"
                    >
                      সম্পাদনা
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. SUPPLIERS MANAGEMENT */}
          {section === 'suppliers' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <form
                onSubmit={handleSaveSupplier}
                className="xl:col-span-4 bg-white border border-[#E5E4DF] rounded-xl p-5 space-y-3 h-fit"
              >
                <h2 className="text-sm font-bold text-[#18181B]">
                  {editingSupId ? 'সাপ্লায়ার আপডেট' : 'নতুন স্থানীয় সাপ্লায়ার / দোকানদার'}
                </h2>
                <input
                  type="text"
                  required
                  value={supForm.name || ''}
                  onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
                  placeholder="দোকানদার / সাপ্লায়ারের নাম *"
                  className="w-full px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                />
                <input
                  type="text"
                  required
                  value={supForm.shopName || ''}
                  onChange={(e) => setSupForm({ ...supForm, shopName: e.target.value })}
                  placeholder="দোকানের নাম *"
                  className="w-full px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                />
                <input
                  type="tel"
                  required
                  value={supForm.mobile || ''}
                  onChange={(e) => setSupForm({ ...supForm, mobile: e.target.value })}
                  placeholder="মোবাইল নম্বর *"
                  className="w-full px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                />
                <input
                  type="text"
                  value={supForm.marketArea || ''}
                  onChange={(e) => setSupForm({ ...supForm, marketArea: e.target.value })}
                  placeholder="বাজার এলাকা (যেমন: দক্ষিণবাজার)"
                  className="w-full px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                />
                <input
                  type="text"
                  value={supForm.address || ''}
                  onChange={(e) => setSupForm({ ...supForm, address: e.target.value })}
                  placeholder="সম্পূর্ণ ঠিকানা"
                  className="w-full px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                />
                <textarea
                  rows={2}
                  value={supForm.notes || ''}
                  onChange={(e) => setSupForm({ ...supForm, notes: e.target.value })}
                  placeholder="বিশেষ নোট / সংগ্রহের সময়"
                  className="w-full px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                />
                <button
                  type="submit"
                  className="w-full py-2 text-xs font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235]"
                >
                  {editingSupId ? 'আপডেট করুন' : 'সাপ্লায়ার সংরক্ষণ'}
                </button>
              </form>

              <div className="xl:col-span-8 bg-white border border-[#E5E4DF] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF9F6] text-[#52525B] border-b border-[#E5E4DF]">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">দোকান ও মালিক</th>
                        <th className="px-4 py-2.5 font-semibold">এলাকা ও যোগাযোগ</th>
                        <th className="px-4 py-2.5 font-semibold text-right">সরবরাহকৃত পণ্য</th>
                        <th className="px-4 py-2.5 font-semibold text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EFEA]">
                      {suppliers.map((s) => {
                        const supProducts = products.filter((p) => p.supplierId === s.id);
                        return (
                          <tr key={s.id} className="hover:bg-[#FAF9F6]">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-[#18181B]">{s.shopName}</div>
                              <div className="text-[11px] text-[#52525B]">{s.name}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div>{s.marketArea}</div>
                              <div className="text-[11px] text-[#52525B] font-mono-tabular">
                                {s.mobile} · {s.address}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono-tabular font-semibold">
                              {supProducts.length}টি
                            </td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSupId(s.id);
                                  setSupForm(s);
                                }}
                                className="text-[#0F6B46] font-semibold hover:underline"
                              >
                                এডিট
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await api.deleteSupplier(s.id);
                                  loadDashboard();
                                }}
                                className="text-[#DC2626] hover:underline"
                              >
                                মুছুন
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 6. DELIVERY ZONES & BANNER SETTINGS */}
          {section === 'delivery' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-[#E5E4DF] rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[#0F6B46]" />
                  <h2 className="text-sm font-bold text-[#18181B]">ডেলিভারি জোন ও চার্জ</h2>
                </div>
                <div className="space-y-3">
                  {deliveryZones.map((zone, idx) => (
                    <div
                      key={zone.id}
                      className="flex flex-wrap items-center justify-between gap-3 border border-[#E5E4DF] rounded-lg p-3"
                    >
                      <div className="flex-1 min-w-[160px]">
                        <input
                          type="text"
                          value={zone.name}
                          onChange={(e) => {
                            const next = [...deliveryZones];
                            next[idx] = { ...zone, name: e.target.value };
                            setDeliveryZones(next);
                          }}
                          className="w-full text-sm font-semibold text-[#18181B] border-b border-transparent focus:border-[#0F6B46] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={zone.estimatedTime}
                          onChange={(e) => {
                            const next = [...deliveryZones];
                            next[idx] = { ...zone, estimatedTime: e.target.value };
                            setDeliveryZones(next);
                          }}
                          className="w-full text-xs text-[#52525B] focus:outline-none mt-0.5"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#52525B]">৳</span>
                        <input
                          type="number"
                          value={zone.charge}
                          onChange={(e) => {
                            const next = [...deliveryZones];
                            next[idx] = { ...zone, charge: Number(e.target.value) };
                            setDeliveryZones(next);
                          }}
                          className="w-20 px-2.5 py-1.5 text-sm font-mono-tabular font-bold border border-[#E5E4DF] rounded-lg"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveZones(deliveryZones)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235]"
                >
                  ডেলিভারি চার্জ সংরক্ষণ করুন
                </button>

                <div className="pt-4 border-t border-[#F0EFEA] space-y-2.5">
                  <p className="text-xs font-semibold text-[#18181B]">নতুন এলাকা/জোন যোগ করুন</p>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newZoneName}
                      onChange={(e) => setNewZoneName(e.target.value)}
                      placeholder="এলাকার নাম"
                      className="col-span-2 px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                    />
                    <input
                      type="number"
                      value={newZoneCharge}
                      onChange={(e) => setNewZoneCharge(Number(e.target.value))}
                      className="px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg tabular-nums"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newZoneName.trim()) return;
                      const next = [
                        ...deliveryZones,
                        {
                          id: `zone-${Date.now()}`,
                          name: newZoneName.trim(),
                          charge: newZoneCharge,
                          estimatedTime: newZoneTime,
                          active: true,
                        },
                      ];
                      handleSaveZones(next);
                      setNewZoneName('');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-[#E5E4DF] rounded-lg hover:bg-[#FAF9F6]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>জোন যোগ করুন</span>
                  </button>
                </div>
              </div>

              {banner && (
                <form
                  onSubmit={handleSaveBanner}
                  className="bg-white border border-[#E5E4DF] rounded-xl p-5 space-y-3 h-fit"
                >
                  <h2 className="text-sm font-bold text-[#18181B]">হোমপেজ ব্যানার ও ঘোষণা</h2>
                  <div>
                    <label className="block text-xs text-[#52525B] mb-1">শীর্ষ ঘোষণা বার</label>
                    <input
                      type="text"
                      value={banner.announcementText}
                      onChange={(e) =>
                        setBanner({ ...banner, announcementText: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#52525B] mb-1">হিরো স্লোগান</label>
                    <input
                      type="text"
                      value={banner.heroTitle}
                      onChange={(e) => setBanner({ ...banner, heroTitle: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#52525B] mb-1">সাব-টেক্সট</label>
                    <textarea
                      rows={2}
                      value={banner.heroSubtitle}
                      onChange={(e) => setBanner({ ...banner, heroSubtitle: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235]"
                  >
                    ব্যানার আপডেট করুন
                  </button>
                </form>
              )}
            </div>
          )}

          {/* 7. COUPONS */}
          {section === 'coupons' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleAddCoupon}
                className="lg:col-span-4 bg-white border border-[#E5E4DF] rounded-xl p-5 space-y-3 h-fit"
              >
                <h2 className="text-sm font-bold text-[#18181B]">নতুন কুপন তৈরি</h2>
                <input
                  type="text"
                  required
                  value={cpnCode}
                  onChange={(e) => setCpnCode(e.target.value)}
                  placeholder="কুপন কোড (যেমন: EID100)"
                  className="w-full px-3 py-2 text-xs font-mono-tabular uppercase border border-[#E5E4DF] rounded-lg"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={cpnType}
                    onChange={(e) => setCpnType(e.target.value as 'fixed' | 'percent')}
                    className="px-2.5 py-2 text-xs bg-white border border-[#E5E4DF] rounded-lg"
                  >
                    <option value="fixed">নির্দিষ্ট টাকা (৳)</option>
                    <option value="percent">শতাংশ (%)</option>
                  </select>
                  <input
                    type="number"
                    required
                    value={cpnValue}
                    onChange={(e) => setCpnValue(Number(e.target.value))}
                    placeholder="ছাড়"
                    className="px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg tabular-nums"
                  />
                </div>
                <input
                  type="number"
                  value={cpnMin}
                  onChange={(e) => setCpnMin(Number(e.target.value))}
                  placeholder="সর্বনিম্ন অর্ডার (৳)"
                  className="w-full px-3 py-2 text-xs border border-[#E5E4DF] rounded-lg tabular-nums"
                />
                <button
                  type="submit"
                  className="w-full py-2 text-xs font-semibold rounded-lg bg-[#0F6B46] text-white"
                >
                  কুপন যুক্ত করুন
                </button>
              </form>

              <div className="lg:col-span-8 bg-white border border-[#E5E4DF] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF9F6] text-[#52525B] border-b border-[#E5E4DF]">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">কোড</th>
                      <th className="px-4 py-2.5 font-semibold">ছাড়</th>
                      <th className="px-4 py-2.5 font-semibold">ন্যূনতম অর্ডার</th>
                      <th className="px-4 py-2.5 font-semibold text-right">ব্যবহার</th>
                      <th className="px-4 py-2.5 font-semibold text-right">অবস্থা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EFEA]">
                    {coupons.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-3 font-mono-tabular font-bold">{c.code}</td>
                        <td className="px-4 py-3 tabular-nums">
                          {c.type === 'fixed' ? `৳${c.value}` : `${c.value}%`}
                        </td>
                        <td className="px-4 py-3 tabular-nums">৳{c.minOrder}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{c.usageCount}</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await api.updateCoupon(c.id, { active: !c.active });
                              loadDashboard();
                            }}
                            className="text-[#0F6B46] font-semibold hover:underline"
                          >
                            {c.active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await api.deleteCoupon(c.id);
                              loadDashboard();
                            }}
                            className="text-[#DC2626]"
                            aria-label="মুছুন"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 8. CUSTOMERS */}
          {section === 'customers' && (
            <div className="bg-white border border-[#E5E4DF] rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9F6] text-[#52525B] border-b border-[#E5E4DF]">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">নাম</th>
                    <th className="px-4 py-2.5 font-semibold">মোবাইল</th>
                    <th className="px-4 py-2.5 font-semibold">ইমেইল</th>
                    <th className="px-4 py-2.5 font-semibold text-right">সংরক্ষিত ঠিকানা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EFEA]">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-[#FAF9F6]">
                      <td className="px-4 py-3 font-semibold text-[#18181B]">{c.name}</td>
                      <td className="px-4 py-3 font-mono-tabular">{c.mobile}</td>
                      <td className="px-4 py-3 text-[#52525B]">{c.email || '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {c.savedAddresses.length}টি
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
