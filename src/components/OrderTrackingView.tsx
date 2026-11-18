import { useEffect, useState } from 'react';
import {
  Check,
  MessageCircle,
  PackageCheck,
  Phone,
  Search,
  Truck,
  UserCheck,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  OFFICIAL_PHONE,
  OFFICIAL_PHONE_TEL,
  OFFICIAL_WHATSAPP_URL,
} from '../lib/contact';
import { ORDER_STATUS_BN, type Order, type OrderStatus } from '../types/marketplace';

interface OrderTrackingViewProps {
  initialOrderNumber?: string;
}

const PROGRESS_STAGES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Collected',
  'Packed',
  'Out for Delivery',
  'Delivered',
];

export function OrderTrackingView({ initialOrderNumber = '' }: OrderTrackingViewProps) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber || 'BM-1002');
  const [mobile, setMobile] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function lookup(num: string, mob?: string) {
    if (!num.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.trackOrder(num.trim(), mob?.trim());
      setOrder(result);
    } catch (err) {
      setOrder(null);
      setError(err instanceof Error ? err.message : 'অর্ডার খুঁজে পাওয়া যায়নি।');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialOrderNumber) {
      setOrderNumber(initialOrderNumber);
      lookup(initialOrderNumber);
    } else {
      lookup('BM-1002');
    }
  }, [initialOrderNumber]);

  const currentIndex = order ? PROGRESS_STAGES.indexOf(order.status) : -1;

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#18181B]">
            লাইভ অর্ডার ট্র্যাকিং
          </h1>
          <p className="text-sm text-[#52525B]">
            আপনার অর্ডার নম্বর দিয়ে সংগ্রহ, মান যাচাই, প্যাকিং ও ডেলিভারির বর্তমান অবস্থা জানুন।
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <a
            href={OFFICIAL_PHONE_TEL}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E4DF] bg-white text-[#18181B] font-mono-tabular font-semibold hover:border-[#0F6B46]"
          >
            <Phone className="w-3.5 h-3.5 text-[#0F6B46]" />
            <span>{OFFICIAL_PHONE}</span>
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

      {/* Search Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          lookup(orderNumber, mobile);
        }}
        className="bg-white border border-[#E5E4DF] rounded-xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-5 gap-3"
      >
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-[#52525B] mb-1">
            অর্ডার নম্বর *
          </label>
          <input
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="যেমন: BM-1001 বা BM-1002"
            className="w-full px-3.5 py-2.5 text-sm font-mono-tabular border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-[#52525B] mb-1">
            মোবাইল নম্বর (ঐচ্ছিক)
          </label>
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="01XXXXXXXXX"
            className="w-full px-3.5 py-2.5 text-sm font-mono-tabular border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235] min-h-[42px]"
          >
            <Search className="w-4 h-4" />
            <span>{loading ? 'খোঁজা হচ্ছে...' : 'ট্র্যাক করুন'}</span>
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-sm text-[#DC2626]">
          {error}
        </div>
      )}

      {order && (
        <div className="bg-white border border-[#E5E4DF] rounded-xl p-5 sm:p-7 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F0EFEA] pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#52525B]">
                <span className="font-mono-tabular font-semibold text-[#18181B]">
                  {order.orderNumber}
                </span>
                <span aria-hidden="true">·</span>
                <span>{new Date(order.createdAt).toLocaleDateString('bn-BD')}</span>
              </div>
              <h2 className="mt-1 text-lg font-bold text-[#18181B]">
                {ORDER_STATUS_BN[order.status]}
              </h2>
            </div>
            <div className="text-right tabular-nums">
              <div className="text-xs text-[#52525B]">মোট বিল (COD)</div>
              <div className="text-xl font-bold text-[#0F6B46]">
                ৳{order.totalAmount.toLocaleString('en-US')}
              </div>
            </div>
          </div>

          {order.status === 'Cancelled' ? (
            <div className="p-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#DC2626]">
              এই অর্ডারটি বাতিল করা হয়েছে। প্রয়োজনে বড়লেখা সাপোর্ট নম্বরে ({OFFICIAL_PHONE}) কল বা হোয়াটসঅ্যাপ করুন।
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
              {PROGRESS_STAGES.map((stage, idx) => {
                const done = currentIndex >= idx;
                const active = currentIndex === idx;
                return (
                  <div
                    key={stage}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      active
                        ? 'border-[#0F6B46] bg-[#0F6B46]/5'
                        : done
                          ? 'border-[#0F6B46]/30 bg-[#FAF9F6]'
                          : 'border-[#E5E4DF] bg-white opacity-60'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center mb-1.5 ${
                        done ? 'bg-[#0F6B46] text-white' : 'bg-[#F3F2EE] text-[#71717A]'
                      }`}
                    >
                      {done ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <span className="text-xs font-mono-tabular">{idx + 1}</span>
                      )}
                    </div>
                    <div className="text-[11px] font-semibold text-[#18181B] leading-tight">
                      {stage}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rider & Delivery Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-lg border border-[#E5E4DF] bg-[#FAF9F6] space-y-1.5 text-sm">
              <div className="flex items-center gap-2 font-semibold text-[#18181B]">
                <PackageCheck className="w-4 h-4 text-[#0F6B46]" />
                <span>ডেলিভারি ঠিকানা</span>
              </div>
              <p className="text-[#3F3F46]">{order.customerName} ({order.customerMobile})</p>
              <p className="text-xs text-[#52525B]">{order.deliveryAddress}</p>
            </div>

            <div className="p-4 rounded-lg border border-[#E5E4DF] bg-[#FAF9F6] space-y-1.5 text-sm">
              <div className="flex items-center gap-2 font-semibold text-[#18181B]">
                <Truck className="w-4 h-4 text-[#0F6B46]" />
                <span>ডেলিভারি রাইডার তথ্য</span>
              </div>
              {order.fulfillment.deliveryRiderName ? (
                <div className="flex items-center gap-2 text-[#3F3F46]">
                  <UserCheck className="w-4 h-4 text-[#0F6B46]" />
                  <span>
                    {order.fulfillment.deliveryRiderName} · {order.fulfillment.deliveryRiderPhone}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-[#52525B]">
                  পণ্য সংগ্রহ ও প্যাকিং শেষে রাইডার অ্যাসাইন করা হবে।
                </p>
              )}
            </div>
          </div>

          {/* Items & History */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <h3 className="text-sm font-semibold text-[#18181B] mb-3">অর্ডারকৃত পণ্য</h3>
              <div className="space-y-2 border border-[#E5E4DF] rounded-lg p-3.5">
                {order.items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex justify-between gap-2 text-xs py-1 border-b border-[#F0EFEA] last:border-b-0"
                  >
                    <span className="text-[#18181B]">
                      {item.productName} ({item.unit}) × {item.quantity}
                    </span>
                    <span className="font-semibold tabular-nums shrink-0">
                      ৳{(item.price * item.quantity).toLocaleString('en-US')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#18181B] mb-3">প্রক্রিয়াকরণ ইতিহাস</h3>
              <div className="space-y-2.5 border border-[#E5E4DF] rounded-lg p-3.5">
                {order.fulfillment.history.map((h, i) => (
                  <div key={i} className="text-xs flex items-start justify-between gap-3">
                    <div>
                      <span className="font-semibold text-[#18181B]">{h.status}: </span>
                      <span className="text-[#52525B]">{h.note}</span>
                    </div>
                    <span className="text-[11px] text-[#71717A] font-mono-tabular shrink-0">
                      {new Date(h.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
