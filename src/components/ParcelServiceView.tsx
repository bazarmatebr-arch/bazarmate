import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  Search,
  Truck,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  OFFICIAL_PHONE,
  OFFICIAL_PHONE_TEL,
  OFFICIAL_WHATSAPP_URL,
} from '../lib/contact';
import {
  PARCEL_STATUS_BN,
  type DeliveryZone,
  type ParcelBooking,
  type User,
} from '../types/marketplace';

interface ParcelServiceViewProps {
  deliveryZones: DeliveryZone[];
  user: User | null;
  onBackHome: () => void;
}

const BARLEKHA_UNIONS = [
  'বড়লেখা পৌরসভা',
  '১নং বর্ণি ইউনিয়ন',
  '২নং দাসেরবাজার ইউনিয়ন',
  '৩নং নিজ বাহাদুরপুর ইউনিয়ন',
  '৪নং উত্তর শাহবাজপুর ইউনিয়ন',
  '৫নং দক্ষিণ শাহবাজপুর ইউনিয়ন',
  '৬নং বড়লেখা সদর ইউনিয়ন',
  '৭নং তালিমপুর ইউনিয়ন',
  '৮নং দক্ষিণভাগ উত্তর (কাঁঠালতলী) ইউনিয়ন',
  '৯নং সুজানগর ইউনিয়ন',
  '১০নং দক্ষিণভাগ দক্ষিণ ইউনিয়ন',
];

export function ParcelServiceView({
  deliveryZones,
  user,
  onBackHome,
}: ParcelServiceViewProps) {
  const [senderName, setSenderName] = useState(user?.name || '');
  const [senderMobile, setSenderMobile] = useState(user?.mobile || '');
  const [pickupArea, setPickupArea] = useState(BARLEKHA_UNIONS[0]);
  const [pickupAddress, setPickupAddress] = useState('');

  const [receiverName, setReceiverName] = useState('');
  const [receiverMobile, setReceiverMobile] = useState('');
  const [deliveryZoneId, setDeliveryZoneId] = useState(
    deliveryZones[0]?.id || 'zone-barlekha',
  );
  const [deliveryArea, setDeliveryArea] = useState(BARLEKHA_UNIONS[0]);
  const [customDeliveryArea, setCustomDeliveryArea] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  const [parcelType, setParcelType] = useState('সাধারণ পার্সেল / বক্স');
  const [weight, setWeight] = useState('১ কেজি পর্যন্ত');
  const [codAmount, setCodAmount] = useState('');
  const [note, setNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bookedParcel, setBookedParcel] = useState<ParcelBooking | null>(null);

  // Tracking lookup
  const [trackQuery, setTrackQuery] = useState('PKG-1001');
  const [trackResults, setTrackResults] = useState<ParcelBooking[] | null>(null);
  const [trackError, setTrackError] = useState('');
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    if (deliveryZones.length > 0 && !deliveryZones.some((z) => z.id === deliveryZoneId)) {
      setDeliveryZoneId(deliveryZones[0].id);
    }
  }, [deliveryZones, deliveryZoneId]);

  useEffect(() => {
    if (user) {
      if (!senderName) setSenderName(user.name);
      if (!senderMobile) setSenderMobile(user.mobile);
      if (!pickupAddress && user.savedAddresses.length > 0) {
        setPickupAddress(user.savedAddresses[0].address);
      }
    }
  }, [user]);

  const selectedZone =
    deliveryZones.find((z) => z.id === deliveryZoneId) || deliveryZones[0];

  function handleRecipientUnionChange(union: string) {
    setDeliveryArea(union);
    if (union === 'বড়লেখা পৌরসভা') {
      const z = deliveryZones.find((d) => d.id === 'zone-barlekha');
      if (z) setDeliveryZoneId(z.id);
    } else if (union === '৬নং বড়লেখা সদর ইউনিয়ন') {
      const z = deliveryZones.find((d) => d.id === 'zone-barlekha-sadar');
      if (z) setDeliveryZoneId(z.id);
    } else {
      const z = deliveryZones.find((d) => d.id === 'zone-others');
      if (z) setDeliveryZoneId(z.id);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const resolvedDeliveryArea =
      deliveryArea !== 'OTHER'
        ? deliveryArea
        : customDeliveryArea.trim() || selectedZone?.name || 'বড়লেখা উপজেলা';

    try {
      const created = await api.createParcel({
        senderName,
        senderMobile,
        pickupArea,
        pickupAddress,
        receiverName,
        receiverMobile,
        deliveryZoneId: selectedZone?.id || 'zone-barlekha',
        deliveryArea: resolvedDeliveryArea,
        deliveryAddress,
        parcelType,
        weight,
        codAmount: codAmount ? Number(codAmount) : 0,
        note,
      });
      setBookedParcel(created);
      setTrackQuery(created.parcelCode);
      setReceiverName('');
      setReceiverMobile('');
      setCustomDeliveryArea('');
      setDeliveryAddress('');
      setCodAmount('');
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'কুরিয়ার বুকিং সম্পন্ন হয়নি।');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    const q = trackQuery.trim();
    if (!q) return;
    setTracking(true);
    setTrackError('');
    try {
      const isCode = q.toUpperCase().startsWith('PKG-');
      const res = await api.trackParcels(isCode ? { parcelCode: q } : { mobile: q });
      setTrackResults(res);
    } catch (err) {
      setTrackResults(null);
      setTrackError(err instanceof Error ? err.message : 'পার্সেল খুঁজে পাওয়া যায়নি।');
    } finally {
      setTracking(false);
    }
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#0F6B46] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>হোমপেজে ফিরে যান</span>
        </button>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <a
            href={OFFICIAL_PHONE_TEL}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E4DF] bg-white text-[#18181B] font-mono-tabular font-semibold hover:border-[#0F6B46]"
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
            <span>WhatsApp: {OFFICIAL_PHONE}</span>
          </a>
        </div>
      </div>

      <div className="bg-white border border-[#E5E4DF] rounded-2xl p-5 sm:p-8 space-y-6">
        <div className="border-b border-[#F0EFEA] pb-5 space-y-1.5 max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#0F6B46]">
            <Truck className="w-4 h-4" />
            <span>বড়লেখা উপজেলা · কুরিয়ার সার্ভিস</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#18181B]">
            কুরিয়ার সার্ভিস (পার্সেল রিসিভ ও ডেলিভারি)
          </h1>
          <p className="text-sm text-[#52525B] leading-relaxed">
            বড়লেখা পৌরসভা ও উপজেলার সব ১০টি ইউনিয়নে বাসা, দোকান, বাজার বা কুরিয়ার পয়েন্ট থেকে আপনার পার্সেল রিসিভ করে আমরা নিরাপদে প্রাপকের ঠিকানায় পৌঁছে দিই। ক্যাশ অন ডেলিভারি (COD) টাকা সংগ্রহের সুবিধাও রয়েছে।
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Courier Info & Live Tracking */}
          <div className="lg:col-span-4 space-y-5">
            <div className="p-4 rounded-xl border border-[#E5E4DF] bg-[#FAF9F6] space-y-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-sm text-[#18181B]">
                <MapPin className="w-4 h-4 text-[#0F6B46]" />
                <span>কভারেজ ও চার্জ</span>
              </div>
              <div className="space-y-1.5 text-[#52525B] tabular-nums">
                <p>
                  <span className="font-semibold text-[#18181B]">বড়লেখা পৌরসভার ভিতরে:</span>{' '}
                  ৳{deliveryZones[0]?.charge ?? 40} ({deliveryZones[0]?.estimatedTime || '১–২ ঘণ্টা'})
                </p>
                <p>
                  <span className="font-semibold text-[#18181B]">বড়লেখা সদর:</span>{' '}
                  ৳{deliveryZones[1]?.charge ?? 60} ({deliveryZones[1]?.estimatedTime || '২–৩ ঘণ্টা'})
                </p>
                <p>
                  <span className="font-semibold text-[#18181B]">অন্যান্য (অন্যান্য ইউনিয়ন ও সারাদেশ):</span>{' '}
                  ৳{deliveryZones[2]?.charge ?? 100}
                </p>
              </div>
              <p className="text-[11px] text-[#71717A] pt-1 border-t border-[#E5E4DF] leading-relaxed">
                ইউনিয়নসমূহ: {BARLEKHA_UNIONS.join(' · ')}
              </p>
            </div>

            {/* Courier Tracking Box */}
            <div className="p-4 rounded-xl border border-[#E5E4DF] bg-[#FAF9F6] space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-[#18181B]">
                <PackageCheck className="w-4 h-4 text-[#0F6B46]" />
                <span>কুরিয়ার ট্র্যাক করুন</span>
              </div>
              <form onSubmit={handleTrack} className="flex gap-2">
                <input
                  type="text"
                  value={trackQuery}
                  onChange={(e) => setTrackQuery(e.target.value)}
                  placeholder="PKG-1001 বা মোবাইল নম্বর"
                  className="flex-1 px-3 py-2 text-xs font-mono-tabular bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                />
                <button
                  type="submit"
                  disabled={tracking}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235]"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>খুঁজুন</span>
                </button>
              </form>

              {trackError && <p className="text-xs text-[#DC2626]">{trackError}</p>}

              {trackResults && (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {trackResults.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-lg border border-[#E5E4DF] bg-white text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono-tabular font-bold text-[#18181B]">
                          {p.parcelCode}
                        </span>
                        <span className="font-semibold text-[#0F6B46]">
                          {PARCEL_STATUS_BN[p.status]}
                        </span>
                      </div>
                      <div className="text-[#52525B]">
                        {p.pickupArea} → {p.deliveryArea}
                      </div>
                      <div className="text-[#71717A] tabular-nums">
                        প্রাপক: {p.receiverName} ({p.receiverMobile})
                      </div>
                      {p.riderName && (
                        <div className="text-[#3F3F46]">
                          রাইডার: {p.riderName} ({p.riderPhone})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Parcel Booking Form or Confirmation */}
          <div className="lg:col-span-8">
            {bookedParcel ? (
              <div className="bg-[#FAF9F6] border border-[#E5E4DF] rounded-xl p-6 sm:p-8 text-center space-y-5">
                <CheckCircle2 className="w-12 h-12 text-[#0F6B46] mx-auto" strokeWidth={1.6} />
                <div className="space-y-1">
                  <p className="text-xs font-mono-tabular text-[#52525B]">
                    কুরিয়ার ট্র্যাকিং কোড: {bookedParcel.parcelCode}
                  </p>
                  <h2 className="text-xl font-bold text-[#18181B]">
                    আপনার কুরিয়ার সার্ভিস বুকিং সম্পন্ন হয়েছে!
                  </h2>
                  <p className="text-sm text-[#52525B]">
                    আমাদের বড়লেখা রাইডার দ্রুত {bookedParcel.pickupArea} থেকে পার্সেল রিসিভ করে {bookedParcel.deliveryArea}-এ পৌঁছে দেবে।
                  </p>
                </div>

                <div className="max-w-md mx-auto bg-white border border-[#E5E4DF] rounded-xl p-4 text-left text-xs space-y-2 tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-[#52525B]">পিকআপ ইউনিয়ন</span>
                    <span className="font-semibold text-[#18181B] text-right">
                      {bookedParcel.pickupArea}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#52525B]">প্রাপক ও গন্তব্য</span>
                    <span className="font-semibold text-[#18181B] text-right">
                      {bookedParcel.receiverName} ({bookedParcel.receiverMobile}) · {bookedParcel.deliveryArea}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#52525B]">কুরিয়ার চার্জ</span>
                    <span className="font-bold text-[#0F6B46]">৳{bookedParcel.deliveryCharge}</span>
                  </div>
                  {bookedParcel.codAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#52525B]">প্রাপক থেকে COD সংগ্রহ</span>
                      <span className="font-bold text-[#18181B]">৳{bookedParcel.codAmount}</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setBookedParcel(null)}
                  className="px-6 py-2.5 text-xs font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235]"
                >
                  আরেকটি কুরিয়ার বুকিং করুন
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-[#FAF9F6] border border-[#E5E4DF] rounded-xl p-5 sm:p-6 space-y-5"
              >
                {/* Sender Section */}
                <div className="space-y-3">
                  <h2 className="text-sm font-bold text-[#18181B]">
                    ১. প্রেরক ও রিসিভ (পিকআপ) ঠিকানা
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                        প্রেরকের নাম *
                      </label>
                      <input
                        type="text"
                        required
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="আপনার / দোকানের নাম"
                        className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                        প্রেরকের মোবাইল *
                      </label>
                      <input
                        type="tel"
                        required
                        value={senderMobile}
                        onChange={(e) => setSenderMobile(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg tabular-nums focus:outline-none focus:border-[#0F6B46]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                        পিকআপ ইউনিয়ন / পৌরসভা *
                      </label>
                      <select
                        value={pickupArea}
                        onChange={(e) => setPickupArea(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                      >
                        {BARLEKHA_UNIONS.map((union) => (
                          <option key={union} value={union}>
                            {union}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                      রিসিভ করার বিস্তারিত ঠিকানা (বাসা / দোকান / কুরিয়ার পয়েন্ট) *
                    </label>
                    <input
                      type="text"
                      required
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      placeholder="যেমন: বড়লেখা দক্ষিণবাজার, সোনালী ব্যাংকের পাশে"
                      className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                    />
                  </div>
                </div>

                {/* Receiver Section */}
                <div className="space-y-3 pt-4 border-t border-[#E5E4DF]">
                  <h2 className="text-sm font-bold text-[#18181B]">
                    ২. প্রাপক ও ডেলিভারি ঠিকানা
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                        প্রাপকের নাম *
                      </label>
                      <input
                        type="text"
                        required
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        placeholder="যিনি পার্সেল নেবেন"
                        className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                        প্রাপকের মোবাইল *
                      </label>
                      <input
                        type="tel"
                        required
                        value={receiverMobile}
                        onChange={(e) => setReceiverMobile(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg tabular-nums focus:outline-none focus:border-[#0F6B46]"
                      />
                    </div>
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
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                        প্রাপকের ইউনিয়ন / পৌরসভা (বড়লেখা উপজেলা) *
                      </label>
                      <div className="space-y-2">
                        <select
                          value={deliveryArea}
                          onChange={(e) => handleRecipientUnionChange(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                        >
                          {BARLEKHA_UNIONS.map((union) => (
                            <option key={union} value={union}>
                              {union}
                            </option>
                          ))}
                          <option value="OTHER">অন্যান্য এলাকা (লিখে দিন)</option>
                        </select>
                        {deliveryArea === 'OTHER' && (
                          <input
                            type="text"
                            required
                            value={customDeliveryArea}
                            onChange={(e) => setCustomDeliveryArea(e.target.value)}
                            placeholder="যেমন: জুড়ী / সিলেট সদর / ঢাকা"
                            className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                          />
                        )}
                      </div>
                    </div>
                    <div className="sm:col-span-7">
                      <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                        প্রাপকের গ্রাম / বাজার / বাড়ির বিস্তারিত ঠিকানা *
                      </label>
                      <input
                        type="text"
                        required
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="গ্রাম, ওয়ার্ড নং, বাড়ির নাম বা পরিচিত স্থানের নাম"
                        className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                      />
                    </div>
                  </div>
                </div>

                {/* Parcel Details */}
                <div className="space-y-3 pt-4 border-t border-[#E5E4DF]">
                  <h2 className="text-sm font-bold text-[#18181B]">৩. পার্সেলের বিবরণ</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                        পার্সেলের ধরন
                      </label>
                      <select
                        value={parcelType}
                        onChange={(e) => setParcelType(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                      >
                        <option value="সাধারণ পার্সেল / বক্স">সাধারণ পার্সেল / বক্স</option>
                        <option value="জরুরি ডকুমেন্ট / কাগজ">জরুরি ডকুমেন্ট / কাগজ</option>
                        <option value="পোশাক / উপহার">পোশাক / উপহার</option>
                        <option value="খাবার / ফলমূল">খাবার / ফলমূল</option>
                        <option value="কুরিয়ার হ্যান্ডওভার পার্সেল">কুরিয়ার হ্যান্ডওভার পার্সেল</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                        আনুমানিক ওজন
                      </label>
                      <select
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                      >
                        <option value="১ কেজি পর্যন্ত">১ কেজি পর্যন্ত</option>
                        <option value="১ – ৩ কেজি">১ – ৩ কেজি</option>
                        <option value="৩ – ৫ কেজি">৩ – ৫ কেজি</option>
                        <option value="৫+ কেজি (বড় পার্সেল)">৫+ কেজি (বড় পার্সেল)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                        ক্যাশ অন ডেলিভারি সংগ্রহ (৳, ঐচ্ছিক)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={codAmount}
                        onChange={(e) => setCodAmount(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg tabular-nums focus:outline-none focus:border-[#0F6B46]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                      বিশেষ নির্দেশনা (ঐচ্ছিক)
                    </label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="যেমন: ভঙ্গুর কাঁচের জিনিস / দুপুরের আগে পিকআপ করবেন"
                      className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-[#DC2626] bg-[#FEF2F2] p-2.5 rounded-lg border border-[#FECACA]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-3 text-sm font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235] disabled:opacity-60 min-h-[44px]"
                >
                  {submitting
                    ? 'বুকিং পাঠানো হচ্ছে...'
                    : `কুরিয়ার সার্ভিস বুকিং নিশ্চিত করুন (চার্জ ৳${selectedZone?.charge ?? 40})`}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
