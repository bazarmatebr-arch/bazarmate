import { useState } from 'react';
import { Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import type { DeliveryZone, Product } from '../types/marketplace';
import { ResilientImage } from './ResilientImage';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  deliveryZones: DeliveryZone[];
  selectedZoneId: string;
  appliedCoupon: { code: string; discount: number } | null;
  onSelectZone: (zoneId: string) => void;
  onApplyCoupon: (coupon: { code: string; discount: number } | null) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClose: () => void;
  onProceedToCheckout: () => void;
}

export function CartDrawer({
  open,
  items,
  deliveryZones,
  selectedZoneId,
  appliedCoupon,
  onSelectZone,
  onApplyCoupon,
  onUpdateQuantity,
  onRemoveItem,
  onClose,
  onProceedToCheckout,
}: CartDrawerProps) {
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  if (!open) return null;

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const selectedZone =
    deliveryZones.find((z) => z.id === selectedZoneId) || deliveryZones[0];
  const deliveryCharge = items.length > 0 ? selectedZone?.charge ?? 100 : 0;
  const discount = appliedCoupon ? Math.min(subtotal, appliedCoupon.discount) : 0;
  const totalAmount = Math.max(0, subtotal - discount) + deliveryCharge;

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCheckingCoupon(true);
    setCouponError('');
    try {
      const res = await api.validateCoupon(couponInput.trim(), subtotal);
      onApplyCoupon({ code: res.coupon.code, discount: res.discount });
      setCouponInput('');
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : 'কুপন যাচাই করা যায়নি।');
    } finally {
      setCheckingCoupon(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="শপিং কার্ট"
    >
      <div className="w-full max-w-md bg-white h-full flex flex-col border-l border-[#E5E4DF] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E4DF]">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#0F6B46]" />
            <h2 className="text-lg font-bold text-[#18181B]">
              আপনার বাজারের ব্যাগ ({items.reduce((s, i) => s + i.quantity, 0)})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="কার্ট বন্ধ করুন"
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F3F2EE] text-[#52525B]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <ShoppingBag className="w-12 h-12 text-[#A1A1AA] mb-3" strokeWidth={1.4} />
              <p className="text-base font-semibold text-[#18181B]">আপনার কার্ট এখন খালি</p>
              <p className="text-sm text-[#52525B] mt-1 max-w-[26ch]">
                চাল, মাছ, সাতকরা, পোশাক বা ঘরের প্রয়োজনীয় পণ্য কার্টে যোগ করুন।
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235]"
              >
                কেনাকাটা শুরু করুন
              </button>
            </div>
          ) : (
            items.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="flex gap-3.5 pb-4 border-b border-[#F0EFEA] last:border-b-0"
              >
                <div className="w-20 h-16 rounded-lg overflow-hidden bg-[#F3F2EE] border border-[#E5E4DF] shrink-0">
                  <ResilientImage
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[#18181B] line-clamp-2 leading-snug">
                      {product.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(product.id)}
                      aria-label="পণ্য সরান"
                      className="text-[#71717A] hover:text-[#DC2626] p-1 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-[#52525B] mt-0.5">{product.unit}</p>
                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="inline-flex items-center border border-[#E5E4DF] rounded-md bg-[#FAF9F6]">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-[#EFECE6]"
                        aria-label="কমান"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-semibold tabular-nums">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateQuantity(product.id, Math.min(product.stock, quantity + 1))
                        }
                        className="w-8 h-8 flex items-center justify-center hover:bg-[#EFECE6]"
                        aria-label="বাড়ান"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-[#18181B] tabular-nums">
                      ৳{(product.price * quantity).toLocaleString('en-US')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary & Checkout Footer */}
        {items.length > 0 && (
          <div className="border-t border-[#E5E4DF] bg-[#FAF9F6] px-5 py-4 space-y-4">
            {/* Delivery Zone Selector */}
            <div>
              <label
                htmlFor="cart-zone-select"
                className="block text-xs font-medium text-[#52525B] mb-1.5"
              >
                ডেলিভারি এলাকা নির্বাচন করুন
              </label>
              <select
                id="cart-zone-select"
                value={selectedZone?.id || ''}
                onChange={(e) => onSelectZone(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
              >
                {deliveryZones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} — ৳{zone.charge} ({zone.estimatedTime})
                  </option>
                ))}
              </select>
            </div>

            {/* Coupon Code */}
            <form onSubmit={handleApplyCoupon} className="space-y-1.5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="কুপন কোড (যেমন: BARLEKHA50)"
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={checkingCoupon}
                  className="px-3.5 py-2 text-xs font-semibold border border-[#E5E4DF] bg-white rounded-lg hover:bg-[#F3F2EE] whitespace-nowrap"
                >
                  প্রয়োগ
                </button>
              </div>
              {couponError && <p className="text-xs text-[#DC2626]">{couponError}</p>}
              {appliedCoupon && (
                <div className="flex items-center justify-between text-xs text-[#0F6B46] font-medium">
                  <span>কুপন {appliedCoupon.code} যুক্ত হয়েছে</span>
                  <button
                    type="button"
                    onClick={() => onApplyCoupon(null)}
                    className="underline text-[#52525B]"
                  >
                    সরান
                  </button>
                </div>
              )}
            </form>

            {/* Totals */}
            <div className="space-y-1.5 text-sm border-t border-[#E5E4DF] pt-3 tabular-nums">
              <div className="flex justify-between text-[#52525B]">
                <span>পণ্যের মোট মূল্য (Subtotal)</span>
                <span>৳{subtotal.toLocaleString('en-US')}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#0F6B46]">
                  <span>ডিসকাউন্ট</span>
                  <span>-৳{discount.toLocaleString('en-US')}</span>
                </div>
              )}
              <div className="flex justify-between text-[#52525B]">
                <span>ডেলিভারি চার্জ ({selectedZone?.name})</span>
                <span>৳{deliveryCharge.toLocaleString('en-US')}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#18181B] pt-1.5 border-t border-[#E5E4DF]">
                <span>সর্বমোট (Total)</span>
                <span>৳{totalAmount.toLocaleString('en-US')}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onProceedToCheckout}
              className="w-full py-3 px-4 text-sm font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235] transition-colors min-h-[44px]"
            >
              চেকআউট করুন · ৳{totalAmount.toLocaleString('en-US')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
