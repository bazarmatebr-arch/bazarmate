import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ImagePlus,
  MessageCircle,
  Phone,
  Search,
  Store,
  Upload,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  OFFICIAL_PHONE,
  OFFICIAL_PHONE_TEL,
  OFFICIAL_WHATSAPP_URL,
} from '../lib/contact';
import type { Category, SellerListing, SellerListingStatus, User } from '../types/marketplace';
import { ResilientImage } from './ResilientImage';

interface SellProductSectionProps {
  categories: Category[];
  user: User | null;
  onOpenAdminSellers?: () => void;
}

const LISTING_STATUS_BN: Record<SellerListingStatus, string> = {
  Pending: 'যাচাইয়ের অপেক্ষায়',
  Approved: 'অনুমোদিত ও স্টোরে প্রকাশিত',
  Rejected: 'বাতিলকৃত',
};

async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ছবিটি পড়া যায়নি।'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('সঠিক ছবির ফরম্যাট দিন (JPG/PNG/WebP)।'));
      img.onload = () => {
        const maxSide = 800;
        let { width, height } = img;
        if (width > maxSide || height > maxSide) {
          if (width >= height) {
            height = Math.round((height * maxSide) / width);
            width = maxSide;
          } else {
            width = Math.round((width * maxSide) / height);
            height = maxSide;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export function SellProductSection({
  categories,
  user,
  onOpenAdminSellers,
}: SellProductSectionProps) {
  const [sellerName, setSellerName] = useState(user?.name || '');
  const [shopName, setShopName] = useState('');
  const [sellerMobile, setSellerMobile] = useState(user?.mobile || '');
  const [marketArea, setMarketArea] = useState(user?.savedAddresses[0]?.area || 'বড়লেখা, সিলেট');

  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'cat-grocery');
  const [subCategory, setSubCategory] = useState(categories[0]?.subCategories[0] || '');
  const [brand, setBrand] = useState('');
  const [unit, setUnit] = useState('১ কেজি');
  const [askingPrice, setAskingPrice] = useState('');
  const [suggestedSellingPrice, setSuggestedSellingPrice] = useState('');
  const [stock, setStock] = useState('20');
  const [description, setDescription] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [error, setError] = useState('');
  const [submittedListing, setSubmittedListing] = useState<SellerListing | null>(null);

  // Status Lookup
  const [lookupMobile, setLookupMobile] = useState(user?.mobile || '');
  const [lookupResults, setLookupResults] = useState<SellerListing[] | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    if (categories.length > 0 && !categories.some((c) => c.id === categoryId)) {
      setCategoryId(categories[0].id);
      setSubCategory(categories[0].subCategories[0] || '');
    } else if (categories.length > 0 && !subCategory) {
      const cat = categories.find((c) => c.id === categoryId) || categories[0];
      setSubCategory(cat.subCategories[0] || '');
    }
  }, [categories, categoryId, subCategory]);

  useEffect(() => {
    if (user) {
      if (!sellerName) setSellerName(user.name);
      if (!sellerMobile) setSellerMobile(user.mobile);
      if (!lookupMobile) setLookupMobile(user.mobile);
    }
  }, [user]);

  const activeCategory = categories.find((c) => c.id === categoryId) || categories[0];

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setImageProcessing(true);
    try {
      const compressed = await compressImageFile(file);
      setImagePreview(compressed);
      setImageUrlInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ছবি আপলোড করা যায়নি।');
    } finally {
      setImageProcessing(false);
      e.target.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const parsedAsking = Number(askingPrice);
    if (!parsedAsking || parsedAsking <= 0) {
      setError('সঠিক বিক্রয় মূল্য (৳) লিখুন।');
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.submitSellerListing({
        sellerName,
        shopName,
        sellerMobile,
        marketArea,
        productName,
        categoryId,
        subCategory: subCategory || activeCategory?.subCategories[0] || 'অন্যান্য',
        brand,
        unit,
        askingPrice: parsedAsking,
        suggestedSellingPrice: suggestedSellingPrice ? Number(suggestedSellingPrice) : undefined,
        stock: Math.max(1, Number(stock) || 10),
        description,
        image: imagePreview || imageUrlInput.trim() || undefined,
      });
      setSubmittedListing(created);
      setProductName('');
      setAskingPrice('');
      setSuggestedSellingPrice('');
      setDescription('');
      setImagePreview('');
      setImageUrlInput('');
      setLookupMobile(created.sellerMobile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'পণ্য আপলোড সম্পন্ন হয়নি।');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!lookupMobile.trim()) return;
    setLookupLoading(true);
    try {
      const list = await api.lookupSellerListingsByMobile(lookupMobile.trim());
      setLookupResults(list);
    } catch {
      setLookupResults([]);
    } finally {
      setLookupLoading(false);
    }
  }

  return (
    <section
      id="sell-product"
      className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 border-t border-[#E5E4DF]"
    >
      <div className="bg-white border border-[#E5E4DF] rounded-2xl p-5 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#F0EFEA] pb-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#0F6B46]">
              <Store className="w-4 h-4" />
              <span>বিক্রেতা কর্নার · পণ্য ও দাম আপলোড</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#18181B]">
              Bazar Mate-এ আপনার পণ্য বিক্রি করুন
            </h2>
            <p className="text-sm text-[#52525B] leading-relaxed">
              আপনি কৃষক, স্থানীয় দোকানদার, হোম-কিচেন উদ্যোক্তা বা যেকোনো বিক্রেতা হলে আপনার পণ্যের নাম, ছবি, পরিমাণ ও দাম আপলোড করুন। আমাদের টিম যাচাই করে স্টোরে প্রকাশ করবে।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <a
              href={OFFICIAL_PHONE_TEL}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E4DF] bg-[#FAF9F6] text-[#18181B] font-mono-tabular font-semibold hover:border-[#0F6B46]"
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

        {submittedListing ? (
          <div className="py-6 space-y-5 max-w-xl mx-auto text-center">
            <CheckCircle2 className="w-12 h-12 text-[#0F6B46] mx-auto" strokeWidth={1.6} />
            <div className="space-y-1">
              <p className="text-xs font-mono-tabular text-[#52525B]">
                আবেদন নম্বর: {submittedListing.id}
              </p>
              <h3 className="text-xl font-bold text-[#18181B]">
                আপনার পণ্য বিক্রির আবেদন জমা হয়েছে!
              </h3>
              <p className="text-sm text-[#52525B]">
                আমাদের টিম যাচাই করে শীঘ্রই স্টোরে প্রকাশ করবে অথবা {OFFICIAL_PHONE} নম্বর থেকে যোগাযোগ করবে।
              </p>
            </div>

            <div className="text-left bg-[#FAF9F6] border border-[#E5E4DF] rounded-xl p-4 flex items-center gap-4">
              <div className="w-20 h-16 rounded-lg overflow-hidden bg-[#F3F2EE] border border-[#E5E4DF] shrink-0">
                <ResilientImage
                  src={submittedListing.image}
                  alt={submittedListing.productName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1 text-xs">
                <div className="font-bold text-sm text-[#18181B] truncate">
                  {submittedListing.productName} ({submittedListing.unit})
                </div>
                <div className="text-[#52525B] tabular-nums">
                  বিক্রেতার দাম: ৳{submittedListing.askingPrice} · স্টক: {submittedListing.stock}টি
                </div>
                <div className="text-[#D97706] font-semibold">
                  অবস্থা: {LISTING_STATUS_BN[submittedListing.status]}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setSubmittedListing(null)}
                className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235]"
              >
                আরেকটি পণ্য আপলোড করুন
              </button>
              {onOpenAdminSellers && (
                <button
                  type="button"
                  onClick={onOpenAdminSellers}
                  className="px-5 py-2.5 text-xs font-semibold rounded-lg border border-[#0F6B46] text-[#0F6B46] hover:bg-[#0F6B46]/5"
                >
                  অ্যাডমিন অনুমোদন প্যানেল
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Seller Guide + Status Check */}
            <div className="lg:col-span-4 space-y-5">
              <div className="space-y-3 text-xs sm:text-sm text-[#52525B]">
                <h3 className="text-sm font-bold text-[#18181B]">কীভাবে পণ্য আপলোড করবেন</h3>
                <ol className="space-y-2 list-decimal list-inside leading-relaxed">
                  <li>আপনার নাম, দোকান বা খামারের নাম এবং মোবাইল নম্বর লিখুন।</li>
                  <li>পণ্যের নাম, ক্যাটাগরি, ওজন/পরিমাণ ও আপনার বিক্রয় মূল্য (৳) দিন।</li>
                  <li>পণ্যের আসল ছবি আপলোড করুন (মোবাইল ক্যামেরা বা গ্যালারি থেকে)।</li>
                  <li>যাচাই শেষে আপনার পণ্য Bazar Mate-এর মূল স্টোরে লাইভ হবে।</li>
                </ol>
              </div>

              {/* Lookup seller's submitted products */}
              <div className="pt-4 border-t border-[#F0EFEA] space-y-3">
                <h4 className="text-xs font-bold text-[#18181B]">
                  আগে আপলোড করা পণ্যের অবস্থা দেখুন
                </h4>
                <form onSubmit={handleLookup} className="flex gap-2">
                  <input
                    type="tel"
                    value={lookupMobile}
                    onChange={(e) => setLookupMobile(e.target.value)}
                    placeholder="বিক্রেতার মোবাইল নম্বর"
                    className="flex-1 px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E5E4DF] rounded-lg tabular-nums focus:outline-none focus:border-[#0F6B46]"
                  />
                  <button
                    type="submit"
                    disabled={lookupLoading}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg border border-[#E5E4DF] bg-white hover:bg-[#FAF9F6]"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>দেখুন</span>
                  </button>
                </form>

                {lookupResults !== null && (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {lookupResults.length === 0 ? (
                      <p className="text-xs text-[#71717A]">
                        এই মোবাইল নম্বরে এখনো কোনো পণ্য আপলোড পাওয়া যায়নি।
                      </p>
                    ) : (
                      lookupResults.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-lg border border-[#E5E4DF] bg-[#FAF9F6] text-xs space-y-0.5"
                        >
                          <div className="font-semibold text-[#18181B] truncate">
                            {item.productName} ({item.unit})
                          </div>
                          <div className="flex justify-between text-[#52525B] tabular-nums">
                            <span>দাম: ৳{item.askingPrice}</span>
                            <span
                              className={
                                item.status === 'Approved'
                                  ? 'text-[#0F6B46] font-semibold'
                                  : item.status === 'Rejected'
                                    ? 'text-[#DC2626] font-semibold'
                                    : 'text-[#D97706] font-semibold'
                              }
                            >
                              {LISTING_STATUS_BN[item.status]}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Product Upload Form */}
            <form
              onSubmit={handleSubmit}
              className="lg:col-span-8 bg-[#FAF9F6] border border-[#E5E4DF] rounded-xl p-5 sm:p-6 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    বিক্রেতার নাম *
                  </label>
                  <input
                    type="text"
                    required
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    placeholder="আপনার নাম"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    দোকান / ফার্মের নাম
                  </label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="যেমন: মায়ের দোয়া স্টোর"
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
                    value={sellerMobile}
                    onChange={(e) => setSellerMobile(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg tabular-nums focus:outline-none focus:border-[#0F6B46]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    এলাকা / বাজার *
                  </label>
                  <input
                    type="text"
                    required
                    value={marketArea}
                    onChange={(e) => setMarketArea(e.target.value)}
                    placeholder="বড়লেখা, সিলেট"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-[#E5E4DF]">
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    পণ্যের নাম *
                  </label>
                  <input
                    type="text"
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="যেমন: বাড়ির খাঁটি সরিষার তেল / দেশি আম"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    ক্যাটাগরি *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      const cat = categories.find((c) => c.id === nextId);
                      setCategoryId(nextId);
                      setSubCategory(cat?.subCategories[0] || '');
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameBn}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    উপ-বিভাগ
                  </label>
                  <select
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                  >
                    {(activeCategory?.subCategories || ['অন্যান্য']).map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-12 gap-3">
                <div className="col-span-1 sm:col-span-3">
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    ওজন / ইউনিট *
                  </label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="১ কেজি / ১ পিস"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                  />
                </div>
                <div className="col-span-1 sm:col-span-3">
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    আপনার বিক্রয় দাম (৳) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={askingPrice}
                    onChange={(e) => setAskingPrice(e.target.value)}
                    placeholder="যেমন: 250"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg tabular-nums focus:outline-none focus:border-[#0F6B46]"
                  />
                </div>
                <div className="col-span-1 sm:col-span-3">
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    খুচরা বাজার দাম (৳)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={suggestedSellingPrice}
                    onChange={(e) => setSuggestedSellingPrice(e.target.value)}
                    placeholder="ঐচ্ছিক"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg tabular-nums focus:outline-none focus:border-[#0F6B46]"
                  />
                </div>
                <div className="col-span-1 sm:col-span-3">
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    মজুদ / স্টক *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg tabular-nums focus:outline-none focus:border-[#0F6B46]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    ব্র্যান্ড / উৎস (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="যেমন: দেশি / ঘরোয়া"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                  />
                </div>
                <div className="sm:col-span-8">
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    পণ্যের বিবরণ
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="পণ্যের মান, উৎপত্তিস্থল বা বিশেষ বৈশিষ্ট্য লিখুন"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                  />
                </div>
              </div>

              {/* Product Photo Upload */}
              <div className="pt-1 space-y-2">
                <label className="block text-[11px] font-medium text-[#52525B]">
                  পণ্যের ছবি আপলোড করুন (ঐচ্ছিক)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-[#0F6B46] bg-white text-[#0F6B46] hover:bg-[#0F6B46]/5 cursor-pointer min-h-[40px]">
                    <ImagePlus className="w-4 h-4" />
                    <span>{imageProcessing ? 'ছবি প্রস্তুত হচ্ছে...' : 'ছবি নির্বাচন করুন'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="sr-only"
                    />
                  </label>
                  <span className="text-xs text-[#71717A]">অথবা</span>
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => {
                      setImageUrlInput(e.target.value);
                      if (e.target.value.trim()) setImagePreview('');
                    }}
                    placeholder="ছবির লিংক (URL) পেস্ট করুন"
                    className="flex-1 min-w-[200px] px-3 py-2 text-xs bg-white border border-[#E5E4DF] rounded-lg focus:outline-none focus:border-[#0F6B46]"
                  />
                  {(imagePreview || imageUrlInput) && (
                    <div className="flex items-center gap-2">
                      <img
                        src={imagePreview || imageUrlInput}
                        alt="প্রিভিউ"
                        className="w-11 h-11 rounded-lg object-cover border border-[#E5E4DF] bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview('');
                          setImageUrlInput('');
                        }}
                        aria-label="ছবি সরান"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E5E4DF] bg-white text-[#71717A] hover:text-[#DC2626]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <p className="text-xs text-[#DC2626] bg-[#FEF2F2] p-2.5 rounded-lg border border-[#FECACA]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || imageProcessing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235] disabled:opacity-60 min-h-[44px]"
              >
                <Upload className="w-4 h-4" />
                <span>
                  {submitting ? 'আপলোড হচ্ছে...' : 'বিক্রির জন্য পণ্য আপলোড করুন'}
                </span>
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
