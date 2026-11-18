import { useEffect, useState } from 'react';
import {
  Heart,
  LogOut,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { api, setStoredToken } from '../lib/api';
import {
  ORDER_STATUS_BN,
  type DeliveryZone,
  type Order,
  type Product,
  type User,
} from '../types/marketplace';
import { ResilientImage } from './ResilientImage';

interface AccountViewProps {
  user: User | null;
  products: Product[];
  deliveryZones: DeliveryZone[];
  onAuthSuccess: (user: User) => void;
  onUserUpdate: (user: User) => void;
  onLogout: () => void;
  onReorder: (order: Order) => void;
  onTrackOrder: (orderNumber: string) => void;
  onSelectProduct: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: Product, quantity?: number) => void;
  onBrowseCatalog: () => void;
}

export function AccountView({
  user,
  products,
  deliveryZones,
  onAuthSuccess,
  onUserUpdate,
  onLogout,
  onReorder,
  onTrackOrder,
  onSelectProduct,
  onToggleWishlist,
  onAddToCart,
  onBrowseCatalog,
}: AccountViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [tab, setTab] = useState<'orders' | 'wishlist' | 'addresses' | 'profile'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // New Address Form
  const [addrLabel, setAddrLabel] = useState('');
  const [addrArea, setAddrArea] = useState('');
  const [addrZoneId, setAddrZoneId] = useState(deliveryZones[0]?.id || 'zone-barlekha');
  const [addrText, setAddrText] = useState('');

  // Profile Edit
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [profileSaved, setProfileSaved] = useState(false);

  // Wishlist Search & Feedback
  const [wishlistQuery, setWishlistQuery] = useState('');

  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditEmail(user.email || '');
      setLoadingOrders(true);
      api
        .getMyOrders()
        .then(setOrders)
        .catch(() => {})
        .finally(() => setLoadingOrders(false));
    }
  }, [user]);

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await api.login({ identifier, password });
        setStoredToken(res.token);
        onAuthSuccess(res.user);
      } else {
        const res = await api.register({ name, mobile, email, password });
        setStoredToken(res.token);
        onAuthSuccess(res.user);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'লগইন সম্পন্ন হয়নি।');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!addrText.trim()) return;
    try {
      const res = await api.updateProfile({
        newAddress: {
          label: addrLabel || 'বাসা',
          area: addrArea || 'বড়লেখা',
          deliveryZoneId: addrZoneId,
          address: addrText,
          mobile: user?.mobile || '',
        },
      });
      onUserUpdate(res.user);
      setAddrLabel('');
      setAddrArea('');
      setAddrText('');
    } catch {
      // ignore
    }
  }

  async function handleRemoveAddress(id: string) {
    if (!user) return;
    const next = user.savedAddresses.filter((a) => a.id !== id);
    const res = await api.updateProfile({ savedAddresses: next });
    onUserUpdate(res.user);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const res = await api.updateProfile({ name: editName, email: editEmail });
    onUserUpdate(res.user);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  }

  if (!user) {
    return (
      <section className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white border border-[#E5E4DF] rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[#18181B]">
              {mode === 'login' ? 'অ্যাকাউন্টে লগইন করুন' : 'নতুন অ্যাকাউন্ট তৈরি করুন'}
            </h1>
            <p className="mt-1 text-sm text-[#52525B]">
              আপনার অর্ডার ট্র্যাক, রি-অর্ডার, সংরক্ষিত ঠিকানা ও উইশলিস্ট পরিচালনা করুন।
            </p>
          </div>

          <div className="flex p-1 bg-[#F3F2EE] rounded-lg">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                mode === 'login' ? 'bg-white text-[#18181B] shadow-xs' : 'text-[#52525B]'
              }`}
            >
              লগইন
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                mode === 'register' ? 'bg-white text-[#18181B] shadow-xs' : 'text-[#52525B]'
              }`}
            >
              রেজিস্টার
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {mode === 'register' ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#18181B] mb-1">
                    আপনার নাম *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="যেমন: ফারহান চৌধুরী"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#18181B] mb-1">
                    মোবাইল নম্বর *
                  </label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#18181B] mb-1">
                    ইমেইল (ঐচ্ছিক)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-medium text-[#18181B] mb-1">
                  মোবাইল নম্বর বা ইমেইল *
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="01712345678 বা email"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#18181B] mb-1">
                পাসওয়ার্ড *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-sm border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
              />
            </div>

            {authError && (
              <p className="text-xs text-[#DC2626] bg-[#FEF2F2] p-2.5 rounded-lg border border-[#FECACA]">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 text-sm font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235] min-h-[44px]"
            >
              {submitting
                ? 'অপেক্ষা করুন...'
                : mode === 'login'
                  ? 'লগইন করুন'
                  : 'অ্যাকাউন্ট খুলুন'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="pt-3 border-t border-[#F0EFEA] space-y-2 text-xs text-[#52525B]">
              <p className="font-medium text-[#18181B]">দ্রুত ডেমো অ্যাকাউন্ট ব্যবহার করুন:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('01712345678');
                    setPassword('123456');
                  }}
                  className="px-3 py-1.5 border border-[#E5E4DF] rounded-md hover:bg-[#FAF9F6]"
                >
                  ক্রেতা ডেমো (01712345678)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('admin@bazarmate.bd');
                    setPassword('admin123');
                  }}
                  className="px-3 py-1.5 border border-[#E5E4DF] rounded-md hover:bg-[#FAF9F6]"
                >
                  অ্যাডমিন ডেমো
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  const currentOrders = orders.filter((o) => !['Delivered', 'Cancelled'].includes(o.status));
  const previousOrders = orders.filter((o) => ['Delivered', 'Cancelled'].includes(o.status));
  const wishlistProducts = products.filter((p) => user.wishlist.includes(p.id));

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-[#E5E4DF] rounded-xl p-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#0F6B46]/10 text-[#0F6B46] flex items-center justify-center">
            <UserIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#18181B]">{user.name}</h1>
            <p className="text-xs text-[#52525B] font-mono-tabular">
              {user.mobile} {user.email ? `· ${user.email}` : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-[#E5E4DF] rounded-lg hover:bg-[#F3F2EE] text-[#52525B]"
        >
          <LogOut className="w-4 h-4" />
          <span>লগআউট</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-[#F3F2EE] rounded-lg w-fit">
        {[
          { id: 'orders', label: `আমার অর্ডার (${orders.length})` },
          { id: 'wishlist', label: `উইশলিস্ট (${wishlistProducts.length})` },
          { id: 'addresses', label: `সংরক্ষিত ঠিকানা (${user.savedAddresses.length})` },
          { id: 'profile', label: 'প্রোফাইল' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as typeof tab)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              tab === t.id ? 'bg-white text-[#18181B] shadow-xs' : 'text-[#52525B] hover:text-[#18181B]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'orders' && (
        <div className="space-y-6">
          {loadingOrders ? (
            <div className="p-8 text-center text-sm text-[#52525B]">অর্ডার লোড হচ্ছে...</div>
          ) : orders.length === 0 ? (
            <div className="bg-white border border-[#E5E4DF] rounded-xl p-10 text-center">
              <Package className="w-10 h-10 mx-auto text-[#A1A1AA] mb-2" />
              <p className="text-sm font-medium text-[#18181B]">এখনো কোনো অর্ডার নেই</p>
            </div>
          ) : (
            <>
              {currentOrders.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-base font-bold text-[#18181B]">চলমান অর্ডার</h2>
                  {currentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white border border-[#E5E4DF] rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-[#52525B]">
                          <span className="font-mono-tabular font-bold text-[#18181B]">
                            {order.orderNumber}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{ORDER_STATUS_BN[order.status]}</span>
                        </div>
                        <p className="text-sm font-medium text-[#18181B]">
                          {order.items.map((i) => `${i.productName} (${i.quantity})`).join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-base font-bold text-[#0F6B46] tabular-nums">
                          ৳{order.totalAmount.toLocaleString('en-US')}
                        </span>
                        <button
                          type="button"
                          onClick={() => onTrackOrder(order.orderNumber)}
                          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235]"
                        >
                          ট্র্যাক করুন
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {previousOrders.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-base font-bold text-[#18181B]">পূর্ববর্তী অর্ডার</h2>
                  {previousOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white border border-[#E5E4DF] rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-[#52525B]">
                          <span className="font-mono-tabular font-bold text-[#18181B]">
                            {order.orderNumber}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{ORDER_STATUS_BN[order.status]}</span>
                        </div>
                        <p className="text-sm text-[#3F3F46]">
                          {order.items.map((i) => `${i.productName} (${i.quantity})`).join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-base font-bold text-[#18181B] tabular-nums">
                          ৳{order.totalAmount.toLocaleString('en-US')}
                        </span>
                        <button
                          type="button"
                          onClick={() => onReorder(order)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#0F6B46] text-[#0F6B46] hover:bg-[#0F6B46]/5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>পুনরায় অর্ডার</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'wishlist' && (() => {
        const filteredWishlist = wishlistProducts.filter((p) => {
          const q = wishlistQuery.trim().toLowerCase();
          if (!q) return true;
          return (
            p.name.toLowerCase().includes(q) ||
            p.nameEn.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            p.subCategory.toLowerCase().includes(q)
          );
        });
        const inStockWishlist = wishlistProducts.filter((p) => p.stock > 0);
        const wishlistTotalValue = wishlistProducts.reduce((sum, p) => sum + p.price, 0);

        return (
          <div className="space-y-5">
            {/* Dedicated Wishlist Header Bar */}
            <div className="bg-white border border-[#E5E4DF] rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h2 className="text-base sm:text-lg font-bold text-[#18181B]">
                  পছন্দের তালিকা (Wishlist)
                </h2>
                <p className="text-xs text-[#52525B] tabular-nums">
                  সংরক্ষিত পণ্য: {wishlistProducts.length}টি · আনুমানিক মোট মূল্য: ৳
                  {wishlistTotalValue.toLocaleString('en-US')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {wishlistProducts.length > 0 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={wishlistQuery}
                      onChange={(e) => setWishlistQuery(e.target.value)}
                      placeholder="পছন্দের পণ্য খুঁজুন..."
                      className="pl-8 pr-3 py-2 text-xs bg-[#FAF9F6] border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46] w-48"
                    />
                  </div>
                )}

                {inStockWishlist.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      inStockWishlist.forEach((p) => onAddToCart(p, 1));
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235] whitespace-nowrap"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>সব কার্টে যোগ করুন ({inStockWishlist.length})</span>
                  </button>
                )}
              </div>
            </div>

            {wishlistProducts.length === 0 ? (
              <div className="bg-white border border-[#E5E4DF] rounded-xl p-10 text-center space-y-3">
                <Heart className="w-10 h-10 mx-auto text-[#A1A1AA]" strokeWidth={1.5} />
                <div className="space-y-1">
                  <p className="text-base font-semibold text-[#18181B]">
                    আপনার উইশলিস্ট এখন খালি
                  </p>
                  <p className="text-xs text-[#52525B] max-w-sm mx-auto">
                    পছন্দের যেকোনো পণ্যের ওপর হার্ট আইকনে ক্লিক করে এখানে সংরক্ষণ করুন এবং পরে সহজে কার্টে যোগ করুন।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onBrowseCatalog}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235]"
                >
                  <span>এখনই বাজার দেখুন</span>
                </button>
              </div>
            ) : filteredWishlist.length === 0 ? (
              <div className="bg-white border border-[#E5E4DF] rounded-xl p-8 text-center text-sm text-[#52525B]">
                “{wishlistQuery}” দিয়ে উইশলিস্টে কোনো পণ্য পাওয়া যায়নি।
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWishlist.map((p) => {
                  const outOfStock = p.stock <= 0;
                  return (
                    <article
                      key={p.id}
                      className="bg-white border border-[#E5E4DF] rounded-xl overflow-hidden flex flex-col"
                    >
                      <div className="relative aspect-[4/3] bg-[#F3F2EE]">
                        <button
                          type="button"
                          onClick={() => onSelectProduct(p)}
                          className="block w-full h-full text-left"
                        >
                          <ResilientImage
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleWishlist(p.id)}
                          aria-label={`${p.name} উইশলিস্ট থেকে সরান`}
                          className="absolute top-2.5 right-2.5 w-9 h-9 flex items-center justify-center rounded-lg bg-white/90 border border-[#E5E4DF] text-[#DC2626] hover:bg-[#FEF2F2]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="p-4 flex flex-col flex-1 gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-[#52525B]">
                          <span>{p.subCategory}</span>
                          <span aria-hidden="true">·</span>
                          <span>{p.unit}</span>
                          <span aria-hidden="true">·</span>
                          <span className={outOfStock ? 'text-[#DC2626]' : 'text-[#0F6B46]'}>
                            {outOfStock ? 'স্টক শেষ' : `স্টকে ${p.stock}টি`}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onSelectProduct(p)}
                          className="text-left text-sm font-semibold text-[#18181B] line-clamp-2 hover:text-[#0F6B46]"
                        >
                          {p.name}
                        </button>

                        <div className="mt-auto pt-3 border-t border-[#F0EFEA] flex items-center justify-between gap-2">
                          <div className="flex items-baseline gap-2 tabular-nums">
                            <span className="text-base font-bold text-[#18181B]">
                              ৳{p.price.toLocaleString('en-US')}
                            </span>
                            {p.compareAtPrice && p.compareAtPrice > p.price && (
                              <span className="text-xs text-[#71717A] line-through">
                                ৳{p.compareAtPrice.toLocaleString('en-US')}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={outOfStock}
                            onClick={() => onAddToCart(p, 1)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235] disabled:bg-[#E5E4DF] disabled:text-[#71717A]"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>{outOfStock ? 'নেই' : 'কার্টে যোগ'}</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {tab === 'addresses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="text-base font-bold text-[#18181B]">সংরক্ষিত ঠিকানা</h2>
            {user.savedAddresses.length === 0 ? (
              <p className="text-sm text-[#52525B] bg-white border border-[#E5E4DF] rounded-xl p-5">
                এখনো কোনো ঠিকানা সংরক্ষিত নেই।
              </p>
            ) : (
              user.savedAddresses.map((addr) => (
                <div
                  key={addr.id}
                  className="bg-white border border-[#E5E4DF] rounded-xl p-4 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-[#18181B]">
                      <MapPin className="w-4 h-4 text-[#0F6B46]" />
                      <span>{addr.label}</span>
                      <span className="text-xs text-[#52525B] font-normal">· {addr.area}</span>
                    </div>
                    <p className="text-xs text-[#52525B]">{addr.address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAddress(addr.id)}
                    className="text-xs text-[#DC2626] hover:underline"
                  >
                    মুছুন
                  </button>
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={handleSaveAddress}
            className="bg-white border border-[#E5E4DF] rounded-xl p-5 space-y-3 h-fit"
          >
            <h3 className="text-sm font-bold text-[#18181B]">নতুন ঠিকানা যোগ করুন</h3>
            <input
              type="text"
              required
              value={addrLabel}
              onChange={(e) => setAddrLabel(e.target.value)}
              placeholder="ঠিকানার নাম (যেমন: বাসা / অফিস)"
              className="w-full px-3 py-2 text-sm border border-[#E5E4DF] rounded-lg"
            />
            <select
              value={addrZoneId}
              onChange={(e) => setAddrZoneId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg"
            >
              {deliveryZones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} (৳{z.charge})
                </option>
              ))}
            </select>
            <input
              type="text"
              required
              value={addrArea}
              onChange={(e) => setAddrArea(e.target.value)}
              placeholder="এলাকা (যেমন: দক্ষিণবাজার)"
              className="w-full px-3 py-2 text-sm border border-[#E5E4DF] rounded-lg"
            />
            <textarea
              required
              rows={2}
              value={addrText}
              onChange={(e) => setAddrText(e.target.value)}
              placeholder="বিস্তারিত ঠিকানা"
              className="w-full px-3 py-2 text-sm border border-[#E5E4DF] rounded-lg"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ঠিকানা সংরক্ষণ</span>
            </button>
          </form>
        </div>
      )}

      {tab === 'profile' && (
        <form
          onSubmit={handleSaveProfile}
          className="max-w-md bg-white border border-[#E5E4DF] rounded-xl p-5 space-y-4"
        >
          <h2 className="text-base font-bold text-[#18181B]">প্রোফাইল তথ্য</h2>
          <div>
            <label className="block text-xs font-medium text-[#52525B] mb-1">নাম</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-[#E5E4DF] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#52525B] mb-1">ইমেইল</label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-[#E5E4DF] rounded-lg"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235]"
            >
              আপডেট করুন
            </button>
            {profileSaved && <span className="text-xs text-[#0F6B46]">তথ্য সংরক্ষিত হয়েছে</span>}
          </div>
        </form>
      )}
    </section>
  );
}
