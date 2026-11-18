import { useEffect, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  MapPin,
  MessageCircle,
  Phone,
  Truck,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  OFFICIAL_PHONE,
  OFFICIAL_PHONE_TEL,
  OFFICIAL_WHATSAPP_URL,
} from '../lib/contact';
import type { DeliveryZone, Order, User } from '../types/marketplace';
import type { CartItem } from './CartDrawer';

interface CheckoutModalProps {
  open: boolean;
  items: CartItem[];
  deliveryZones: DeliveryZone[];
  selectedZoneId: string;
  appliedCoupon: { code: string; discount: number } | null;
  user: User | null;
  onSelectZone: (zoneId: string) => void;
  onOrderSuccess: (order: Order) => void;
  onTrackOrder: (orderNumber: string) => void;
  onOpenOrderPanel?: (orderNumber: string) => void;
  onClose: () => void;
}

export function CheckoutModal({
  open,
  items,
  deliveryZones,
  selectedZoneId,
  appliedCoupon,
  user,
  onSelectZone,
  onOrderSuccess,
  onTrackOrder,
  onOpenOrderPanel,
  onClose,
}: CheckoutModalProps) {
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerMobile, setCustomerMobile] = useState(user?.mobile || '');
  const [area, setArea] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (open && user) {
      if (!customerName) setCustomerName(user.name);
      if (!customerMobile) setCustomerMobile(user.mobile);
      if (!deliveryAddress && user.savedAddresses.length > 0) {
        const first = user.savedAddresses[0];
        setArea(first.area);
        setDeliveryAddress(first.address);
        onSelectZone(first.deliveryZoneId);
      }
    }
  }, [open, user]);

  if (!open) return null;

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const selectedZone =
    deliveryZones.find((z) => z.id === selectedZoneId) || deliveryZones[0];
  const deliveryCharge = selectedZone?.charge ?? 100;
  const discount = appliedCoupon ? Math.min(subtotal, appliedCoupon.discount) : 0;
  const totalAmount = Math.max(0, subtotal - discount) + deliveryCharge;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const order = await api.createOrder({
        customerName,
        customerMobile,
        area: area || selectedZone?.name || 'বড়লেখা',
        deliveryZoneId: selectedZone?.id || 'zone-barlekha',
        deliveryAddress,
        orderNote,
        couponCode: appliedCoupon?.code,
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      });
      setConfirmedOrder(order);
      onOrderSuccess(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'অর্ডার সম্পন্ন করা যায়নি।');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCloseAll() {
    setConfirmedOrder(null);
    setError('');
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="চেকআউট"
    >
      <div className="relative w-full max-w-3xl bg-white sm:rounded-2xl border border-[#E5E4DF] shadow-2xl max-h-[100dvh] sm:max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E4DF] sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-[#18181B]">
            {confirmedOrder ? 'অর্ডার নিশ্চিত হয়েছে' : 'সহজ চেকআউট — Bazar Mate'}
          </h2>
          <button
            type="button"
            onClick={handleCloseAll}
            aria-label="বন্ধ করুন"
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F3F2EE] text-[#52525B]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmedOrder ? (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col items-center text-center py-4">
              <CheckCircle2 className="w-14 h-14 text-[#0F6B46] mb-3" strokeWidth={1.6} />
              <p className="text-xs font-mono-tabular text-[#52525B]">
                অর্ডার নম্বর: {confirmedOrder.orderNumber}
              </p>
              <h3 className="mt-1 text-2xl font-bold text-[#18181B]">
                ধন্যবাদ, {confirmedOrder.customerName}! আপনার অর্ডারটি গৃহীত হয়েছে।
              </h3>
              <p className="mt-2 text-sm text-[#52525B] max-w-md">
                আমাদের বড়লেখা টিম দ্রুত স্থানীয় দোকান থেকে আপনার পণ্যগুলো সংগ্রহ ও যাচাই করে একসাথে প্যাকিং শুরু করবে।
              </p>
            </div>

            <div className="border border-[#E5E4DF] rounded-xl p-5 bg-[#FAF9F6] space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#52525B]">ক্রেতার নাম ও মোবাইল</span>
                <span className="font-medium text-[#18181B]">
                  {confirmedOrder.customerName} · {confirmedOrder.customerMobile}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#52525B] shrink-0">ডেলিভারি ঠিকানা</span>
                <span className="font-medium text-[#18181B] text-right">
                  {confirmedOrder.deliveryAddress}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#52525B]">পেমেন্ট মাধ্যম</span>
                <span className="font-medium text-[#0F6B46]">Cash on Delivery (পণ্য হাতে পেয়ে পরিশোধ)</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E5E4DF] font-bold text-base tabular-nums">
                <span>মোট প্রদেয় মূল্য</span>
                <span>৳{confirmedOrder.totalAmount.toLocaleString('en-US')}</span>
              </div>
              <div className="pt-2 border-t border-[#E5E4DF] flex flex-wrap items-center justify-between gap-2 text-xs text-[#52525B]">
                <span>অর্ডার সংক্রান্ত সহায়তা:</span>
                <div className="flex items-center gap-3 font-mono-tabular">
                  <a
                    href={OFFICIAL_PHONE_TEL}
                    className="inline-flex items-center gap-1 font-semibold text-[#18181B] hover:text-[#0F6B46]"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#0F6B46]" />
                    <span>{OFFICIAL_PHONE}</span>
                  </a>
                  <a
                    href={OFFICIAL_WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-[#0F6B46] hover:underline"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  const num = confirmedOrder.orderNumber;
                  handleCloseAll();
                  onTrackOrder(num);
                }}
                className="px-6 py-3 text-sm font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235]"
              >
                অর্ডার স্ট্যাটাস ট্র্যাক করুন
              </button>
              {onOpenOrderPanel && (
                <button
                  type="button"
                  onClick={() => {
                    const num = confirmedOrder.orderNumber;
                    handleCloseAll();
                    onOpenOrderPanel(num);
                  }}
                  className="px-6 py-3 text-sm font-semibold rounded-lg border border-[#0F6B46] text-[#0F6B46] hover:bg-[#0F6B46]/5"
                >
                  অর্ডার ম্যানেজমেন্ট প্যানেল
                </button>
              )}
              <button
                type="button"
                onClick={handleCloseAll}
                className="px-6 py-3 text-sm font-semibold rounded-lg border border-[#E5E4DF] text-[#18181B] hover:bg-[#F3F2EE]"
              >
                হোমপেজে ফিরে যান
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-6 p-6">
            <div className="md:col-span-3 space-y-4">
              {user && user.savedAddresses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#52525B]">সংরক্ষিত ঠিকানা থেকে বেছে নিন:</p>
                  <div className="flex flex-wrap gap-2">
                    {user.savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => {
                          setArea(addr.area);
                          setDeliveryAddress(addr.address);
                          setCustomerMobile(addr.mobile || user.mobile);
                          onSelectZone(addr.deliveryZoneId);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#E5E4DF] rounded-lg hover:border-[#0F6B46] bg-[#FAF9F6]"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#0F6B46]" />
                        <span>{addr.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#18181B] mb-1">
                    আপনার পূর্ণ নাম *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="যেমন: রাকিব আহমেদ"
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
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46] tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#18181B] mb-1">
                    ডেলিভারি জোন *
                  </label>
                  <select
                    value={selectedZone?.id || ''}
                    onChange={(e) => onSelectZone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                  >
                    {deliveryZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} (৳{z.charge})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#18181B] mb-1">
                    এলাকা / বাজার / ওয়ার্ড *
                  </label>
                  <input
                    type="text"
                    required
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="যেমন: হাজীগঞ্জ রোড, বড়লেখা"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#18181B] mb-1">
                  সম্পূর্ণ ডেলিভারি ঠিকানা *
                </label>
                <textarea
                  required
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="বাসা/হোল্ডিং নম্বর, রাস্তা, পরিচিত স্থানের নাম (যেমন: মসজিদ/স্কুলের পাশে)"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#18181B] mb-1">
                  অর্ডার নোট (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="যেমন: মাছ কেটে দেবেন, বা বিকেল ৫টার পর ডেলিভারি"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                />
              </div>

              {/* Payment Method */}
              <div className="pt-2 space-y-2">
                <p className="text-xs font-semibold text-[#18181B]">পেমেন্ট পদ্ধতি</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 p-3.5 rounded-lg border-2 border-[#0F6B46] bg-[#0F6B46]/5">
                    <Banknote className="w-5 h-5 text-[#0F6B46] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-[#18181B]">Cash on Delivery</p>
                      <p className="text-xs text-[#52525B]">পণ্য বুঝে পেয়ে মূল্য পরিশোধ করুন</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3.5 rounded-lg border border-[#E5E4DF] bg-[#FAF9F6] opacity-70">
                    <CreditCard className="w-5 h-5 text-[#71717A] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#52525B]">অনলাইন পেমেন্ট</p>
                      <p className="text-xs text-[#71717A]">বিকাশ / নগদ / কার্ড (শীঘ্রই আসছে)</p>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 text-xs text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-lg">
                  {error}
                </div>
              )}
            </div>

            {/* Summary Sidebar */}
            <div className="md:col-span-2 bg-[#FAF9F6] border border-[#E5E4DF] rounded-xl p-4 h-fit space-y-4">
              <h3 className="text-sm font-bold text-[#18181B] border-b border-[#E5E4DF] pb-2">
                অর্ডার সারাংশ ({items.length}টি পণ্য)
              </h3>
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex justify-between gap-2 text-xs">
                    <span className="text-[#3F3F46] line-clamp-1">
                      {product.name} × {quantity}
                    </span>
                    <span className="font-semibold text-[#18181B] tabular-nums shrink-0">
                      ৳{(product.price * quantity).toLocaleString('en-US')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 text-sm border-t border-[#E5E4DF] pt-3 tabular-nums">
                <div className="flex justify-between text-[#52525B]">
                  <span>সাবটোটাল</span>
                  <span>৳{subtotal.toLocaleString('en-US')}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[#0F6B46]">
                    <span>কুপন ছাড় ({appliedCoupon?.code})</span>
                    <span>-৳{discount.toLocaleString('en-US')}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#52525B]">
                  <span>ডেলিভারি ({selectedZone?.name})</span>
                  <span>৳{deliveryCharge.toLocaleString('en-US')}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#18181B] pt-2 border-t border-[#E5E4DF]">
                  <span>সর্বমোট</span>
                  <span>৳{totalAmount.toLocaleString('en-US')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-[#52525B] pt-1">
                <Truck className="w-4 h-4 text-[#0F6B46] shrink-0" />
                <span>{selectedZone?.estimatedTime}</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 text-sm font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235] disabled:opacity-60 min-h-[44px]"
              >
                {submitting ? 'অর্ডার পাঠানো হচ্ছে...' : 'অর্ডার কনফার্ম করুন'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
