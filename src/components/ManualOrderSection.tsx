import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardEdit,
  MessageCircle,
  Phone,
  Plus,
  Trash2,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  OFFICIAL_PHONE,
  OFFICIAL_PHONE_TEL,
  OFFICIAL_WHATSAPP_URL,
} from '../lib/contact';
import type { DeliveryZone, Order, User } from '../types/marketplace';

interface ManualLine {
  id: string;
  name: string;
  unit: string;
  quantity: number;
}

interface ManualOrderSectionProps {
  deliveryZones: DeliveryZone[];
  user: User | null;
  onTrackOrder: (orderNumber: string) => void;
  onOpenOrderPanel: (orderNumber: string) => void;
}

export function ManualOrderSection({
  deliveryZones,
  user,
  onTrackOrder,
  onOpenOrderPanel,
}: ManualOrderSectionProps) {
  const [lines, setLines] = useState<ManualLine[]>([
    { id: 'line-1', name: '', unit: '১ কেজি', quantity: 1 },
  ]);
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerMobile, setCustomerMobile] = useState(user?.mobile || '');
  const [deliveryZoneId, setDeliveryZoneId] = useState(
    deliveryZones[0]?.id || 'zone-barlekha',
  );
  const [area, setArea] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (deliveryZones.length > 0 && !deliveryZones.some((z) => z.id === deliveryZoneId)) {
      setDeliveryZoneId(deliveryZones[0].id);
    }
  }, [deliveryZones, deliveryZoneId]);

  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.name);
      if (!customerMobile) setCustomerMobile(user.mobile);
      if (!deliveryAddress && user.savedAddresses.length > 0) {
        const first = user.savedAddresses[0];
        setArea(first.area);
        setDeliveryAddress(first.address);
        setDeliveryZoneId(first.deliveryZoneId);
      }
    }
  }, [user]);

  const selectedZone =
    deliveryZones.find((z) => z.id === deliveryZoneId) || deliveryZones[0];

  function addLine(presetName = '', presetUnit = '১ পিস') {
    setLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: presetName,
        unit: presetUnit,
        quantity: 1,
      },
    ]);
  }

  function updateLine(id: string, patch: Partial<ManualLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const validLines = lines.filter((l) => l.name.trim().length > 0);
    if (validLines.length === 0) {
      setError('কমপক্ষে একটি পণ্যের নাম লিখুন।');
      return;
    }

    setSubmitting(true);
    try {
      const order = await api.createOrder({
        customerName,
        customerMobile,
        area: area || selectedZone?.name || 'বড়লেখা',
        deliveryZoneId: selectedZone?.id || 'zone-barlekha',
        deliveryAddress,
        orderNote,
        customItems: validLines.map((l) => ({
          name: l.name.trim(),
          unit: l.unit.trim() || '১ পিস',
          quantity: l.quantity,
        })),
      });
      setSubmittedOrder(order);
      setLines([{ id: 'line-reset', name: '', unit: '১ কেজি', quantity: 1 }]);
      setOrderNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'অর্ডার পাঠানো যায়নি।');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      id="manual-order"
      className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 border-t border-[#E5E4DF]"
    >
      <div className="bg-white border border-[#E5E4DF] rounded-2xl p-5 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#F0EFEA] pb-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#0F6B46]">
              <ClipboardEdit className="w-4 h-4" />
              <span>ম্যানুয়াল বাজার তালিকা (কাস্টম অর্ডার)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#18181B]">
              পছন্দের পণ্য খুঁজে না পেলে নাম লিখে অর্ডার করুন
            </h2>
            <p className="text-sm text-[#52525B] leading-relaxed">
              বাজারের ফর্দের মতো পণ্যের নাম ও পরিমাণ লিখে অর্ডার পাঠিয়ে দিন। আমাদের বড়লেখা টিম স্থানীয় বাজার থেকে সংগ্রহ করে প্রকৃত মূল্যে যাচাই ও প্যাক করে আপনার বাসায় পৌঁছে দেবে।
            </p>
          </div>
          <div className="space-y-2 text-xs text-[#52525B] tabular-nums">
            <div>
              ডেলিভারি: বড়লেখা ৳{deliveryZones[0]?.charge ?? 100} · সারাদেশে ৳
              {deliveryZones[1]?.charge ?? 150}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={OFFICIAL_PHONE_TEL}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E5E4DF] bg-[#FAF9F6] text-[#18181B] font-mono-tabular font-semibold hover:border-[#0F6B46]"
              >
                <Phone className="w-3.5 h-3.5 text-[#0F6B46]" />
                <span>{OFFICIAL_PHONE}</span>
              </a>
              <a
                href={OFFICIAL_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#0F6B46]/30 bg-[#0F6B46]/5 text-[#0F6B46] font-semibold hover:bg-[#0F6B46]/10"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp ফর্দ: {OFFICIAL_PHONE}</span>
              </a>
            </div>
          </div>
        </div>

        {submittedOrder ? (
          <div className="py-6 space-y-5 text-center max-w-xl mx-auto">
            <CheckCircle2 className="w-12 h-12 text-[#0F6B46] mx-auto" strokeWidth={1.6} />
            <div className="space-y-1">
              <p className="text-xs font-mono-tabular text-[#52525B]">
                অর্ডার নম্বর: {submittedOrder.orderNumber}
              </p>
              <h3 className="text-xl font-bold text-[#18181B]">
                আপনার ম্যানুয়াল বাজার তালিকা গৃহীত হয়েছে!
              </h3>
              <p className="text-sm text-[#52525B]">
                আমাদের টিম বড়লেখার দোকান থেকে পণ্যগুলোর বাজারদর যাচাই করে আপনার অর্ডার কনফার্ম করবে।
              </p>
            </div>

            <div className="text-left bg-[#FAF9F6] border border-[#E5E4DF] rounded-xl p-4 space-y-2 text-xs">
              <div className="font-semibold text-[#18181B]">তালিকাভুক্ত পণ্যসমূহ:</div>
              {submittedOrder.items.map((item) => (
                <div key={item.productId} className="flex justify-between text-[#3F3F46]">
                  <span>
                    {item.productName} ({item.unit}) × {item.quantity}
                  </span>
                  <span className="text-[#52525B]">বাজার মূল্যে</span>
                </div>
              ))}
              <div className="pt-2 border-t border-[#E5E4DF] flex justify-between font-semibold text-[#18181B] tabular-nums">
                <span>ডেলিভারি চার্জ</span>
                <span>৳{submittedOrder.deliveryCharge}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onTrackOrder(submittedOrder.orderNumber)}
                className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235]"
              >
                অর্ডার স্ট্যাটাস ট্র্যাক করুন
              </button>
              <button
                type="button"
                onClick={() => onOpenOrderPanel(submittedOrder.orderNumber)}
                className="px-5 py-2.5 text-xs font-semibold rounded-lg border border-[#0F6B46] text-[#0F6B46] hover:bg-[#0F6B46]/5"
              >
                অর্ডার ম্যানেজমেন্ট প্যানেল
              </button>
              <button
                type="button"
                onClick={() => setSubmittedOrder(null)}
                className="px-5 py-2.5 text-xs font-semibold rounded-lg border border-[#E5E4DF] hover:bg-[#F3F2EE]"
              >
                নতুন ফর্দ লিখুন
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Manual Item List Builder */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-[#18181B]">
                  ১. পণ্যের নাম ও পরিমাণ লিখুন
                </span>
                <button
                  type="button"
                  onClick={() => addLine()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#0F6B46] text-[#0F6B46] hover:bg-[#0F6B46]/5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>আরো পণ্য যোগ করুন</span>
                </button>
              </div>

              <div className="space-y-3">
                {lines.map((line, idx) => (
                  <div
                    key={line.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 rounded-xl border border-[#E5E4DF] bg-[#FAF9F6] items-center"
                  >
                    <div className="sm:col-span-6">
                      <label className="block text-[11px] text-[#52525B] mb-1">
                        পণ্য #{idx + 1} *
                      </label>
                      <input
                        type="text"
                        required={idx === 0}
                        value={line.name}
                        onChange={(e) => updateLine(line.id, { name: e.target.value })}
                        placeholder="যেমন: হাকালুকির বোয়াল মাছ / প্রাণ ঘি / খাতা-কলম"
                        className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] text-[#52525B] mb-1">ওজন / সাইজ</label>
                      <input
                        type="text"
                        value={line.unit}
                        onChange={(e) => updateLine(line.id, { unit: e.target.value })}
                        placeholder="১ কেজি / ২০০ গ্রাম"
                        className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-[#52525B] mb-1">সংখ্যা</label>
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(line.id, {
                            quantity: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg tabular-nums focus:outline-none focus:border-[#0F6B46]"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end pt-4 sm:pt-5">
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length === 1}
                        aria-label="সারি মুছুন"
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-[#71717A] hover:text-[#DC2626] disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Add Common Local Items */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-[#52525B]">দ্রুত যোগ করুন:</span>
                {[
                  { name: 'গরুর মাংস (সলিড)', unit: '১ কেজি' },
                  { name: 'দেশি শিং / কই মাছ', unit: '৫০০ গ্রাম' },
                  { name: 'প্যারাসুট নারিকেল তেল', unit: '২০০ মিলি' },
                  { name: 'আড়ং খাঁটি ঘি', unit: '২০০ গ্রাম' },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      const emptyFirst = lines.find((l) => !l.name.trim());
                      if (emptyFirst) {
                        updateLine(emptyFirst.id, { name: preset.name, unit: preset.unit });
                      } else {
                        addLine(preset.name, preset.unit);
                      }
                    }}
                    className="px-2.5 py-1 text-xs border border-[#E5E4DF] rounded-md bg-white text-[#3F3F46] hover:border-[#0F6B46] hover:text-[#0F6B46]"
                  >
                    + {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Delivery Address & Confirm */}
            <div className="lg:col-span-5 bg-[#FAF9F6] border border-[#E5E4DF] rounded-xl p-5 space-y-3.5 h-fit">
              <h3 className="text-sm font-bold text-[#18181B]">
                ২. ক্রেতার তথ্য ও ডেলিভারি ঠিকানা
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    আপনার নাম *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="আপনার নাম"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    মোবাইল নম্বর *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg tabular-nums focus:outline-none focus:border-[#0F6B46]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    ডেলিভারি জোন *
                  </label>
                  <select
                    value={selectedZone?.id || ''}
                    onChange={(e) => setDeliveryZoneId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                  >
                    {deliveryZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} (৳{z.charge})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    এলাকা / ওয়ার্ড *
                  </label>
                  <input
                    type="text"
                    required
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="যেমন: হাজীগঞ্জ রোড"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                  সম্পূর্ণ ডেলিভারি ঠিকানা *
                </label>
                <textarea
                  required
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="বাসার নম্বর, রাস্তা বা পরিচিত স্থানের নাম"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                  অতিরিক্ত নির্দেশনা (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="যেমন: ভালো মানের তাজা পণ্য নেবেন"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                />
              </div>

              {error && (
                <p className="text-xs text-[#DC2626] bg-[#FEF2F2] p-2.5 rounded-lg border border-[#FECACA]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 text-sm font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235] disabled:opacity-60 min-h-[44px]"
              >
                {submitting
                  ? 'অর্ডার পাঠানো হচ্ছে...'
                  : `ম্যানুয়াল অর্ডার পাঠান (ডেলিভারি ৳${selectedZone?.charge ?? 100})`}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
