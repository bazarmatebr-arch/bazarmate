import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  BannerSettings,
  Category,
  Coupon,
  DeliveryZone,
  Order,
  OrderStatus,
  ParcelBooking,
  Product,
  Review,
  SavedAddress,
  SellerListing,
  Supplier,
  User,
} from '../src/types/marketplace.ts';

export interface StoredUser extends User {
  passwordHash: string;
}

export interface DatabaseSchema {
  categories: Category[];
  suppliers: Supplier[];
  products: Product[];
  deliveryZones: DeliveryZone[];
  coupons: Coupon[];
  banner: BannerSettings;
  orders: Order[];
  users: StoredUser[];
  reviews: Review[];
  sellerListings: SellerListing[];
  parcelBookings: ParcelBooking[];
  orderSeq: number;
  parcelSeq: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'bazarmate.json');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, key] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

const TOKEN_SECRET = process.env.SESSION_SECRET || 'bazarmate-barlekha-sylhet-2026-secret';

export function signToken(payload: { userId: string; role: 'customer' | 'admin' }): string {
  const data = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 * 14 }),
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyToken(token: string): { userId: string; role: 'customer' | 'admin' } | null {
  try {
    const [data, sig] = token.split('.');
    if (!data || !sig) return null;
    const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!parsed.exp || parsed.exp < Date.now()) return null;
    return { userId: parsed.userId, role: parsed.role };
  } catch {
    return null;
  }
}

const IMG_GROCERY = '/src/assets/images/cat_grocery_essentials_1794993131782.jpg';
const IMG_FRESH = '/src/assets/images/cat_fresh_food_1794993133045.jpg';
const IMG_LOCAL = '/src/assets/images/cat_sylhet_satkara_local_1794993132684.jpg';
const IMG_FASHION = '/src/assets/images/cat_fashion_clothing_1794993133815.jpg';
const IMG_TECH = '/src/assets/images/cat_electronics_tech_1794993133400.jpg';
const IMG_HOME = '/src/assets/images/cat_home_lifestyle_1794993133743.jpg';

function createInitialData(): DatabaseSchema {
  const now = new Date().toISOString();

  const categories: Category[] = [
    {
      id: 'cat-grocery',
      name: 'Grocery & Daily Essentials',
      nameBn: 'মুদি ও নিত্যপ্রয়োজনীয় পণ্য',
      description: 'প্রতিদিনের চাল, ডাল, তেল, মসলা ও গৃহস্থালির বাজার',
      image: IMG_GROCERY,
      sortOrder: 1,
      subCategories: [
        'চাল',
        'ডাল',
        'তেল',
        'লবণ',
        'চিনি',
        'মসলা',
        'চা',
        'কফি',
        'বিস্কুট',
        'নুডলস',
        'শুকনো খাবার',
        'শিশুপণ্য',
        'পরিষ্কার-পরিচ্ছন্নতার পণ্য',
        'অন্যান্য নিত্যপ্রয়োজনীয় পণ্য',
      ],
    },
    {
      id: 'cat-fresh',
      name: 'Fresh Food',
      nameBn: 'তাজা মাছ, মাংস ও শাকসবজি',
      description: 'হাকালুকি ও স্থানীয় বাজারের তাজা মাছ, মাংস ও সবজি',
      image: IMG_FRESH,
      sortOrder: 2,
      subCategories: [
        'তাজা মাছ',
        'গরুর মাংস',
        'খাসির মাংস',
        'মুরগি',
        'ডিম',
        'শাকসবজি',
        'ফলমূল',
        'অন্যান্য Fresh Food',
      ],
    },
    {
      id: 'cat-fashion',
      name: 'Fashion & Clothing',
      nameBn: 'পোশাক ও ফ্যাশন',
      description: 'পরিবারের সবার পোশাক, জুতা, স্যান্ডেল ও এক্সেসরিজ',
      image: IMG_FASHION,
      sortOrder: 3,
      subCategories: [
        'পুরুষদের পোশাক',
        'নারীদের পোশাক',
        'শিশুদের পোশাক',
        'জুতা',
        'স্যান্ডেল',
        'ব্যাগ',
        'ফ্যাশন এক্সেসরিজ',
      ],
    },
    {
      id: 'cat-electronics',
      name: 'Electronics & Technology',
      nameBn: 'ইলেকট্রনিক্স ও প্রযুক্তি',
      description: 'অরিজিনাল চার্জার, কেবল, ইয়ারফোন ও ঘরের ইলেকট্রনিক পণ্য',
      image: IMG_TECH,
      sortOrder: 4,
      subCategories: [
        'মোবাইল এক্সেসরিজ',
        'চার্জার',
        'কেবল',
        'ইয়ারফোন',
        'হেডফোন',
        'ছোট ইলেকট্রনিক পণ্য',
        'ঘরের প্রয়োজনীয় ইলেকট্রনিক পণ্য',
        'অন্যান্য Electronics',
      ],
    },
    {
      id: 'cat-home',
      name: 'Home & Lifestyle',
      nameBn: 'হোম ও লাইফস্টাইল',
      description: 'রান্নাঘরের সামগ্রী, স্টোরেজ, বেডিং ও ঘর সাজানোর পণ্য',
      image: IMG_HOME,
      sortOrder: 5,
      subCategories: [
        'রান্নাঘরের সামগ্রী',
        'গৃহস্থালির পণ্য',
        'প্লাস্টিক পণ্য',
        'স্টোরেজ পণ্য',
        'বেডিং',
        'ঘর সাজানোর সামগ্রী',
        'ব্যক্তিগত ব্যবহার্য পণ্য',
      ],
    },
    {
      id: 'cat-local',
      name: 'Local & Other Products',
      nameBn: 'সিলেট ও বড়লেখার স্থানীয় পণ্য',
      description: 'বড়লেখার খাঁটি সাতকরা, জারা লেবু, চা পাতা ও প্রাকৃতিক মধু',
      image: IMG_LOCAL,
      sortOrder: 6,
      subCategories: [
        'স্থানীয় কৃষিপণ্য',
        'সাতকরা',
        'লেবু',
        'চা',
        'মধু',
        'স্থানীয় খাবার',
        'স্টেশনারি',
        'অন্যান্য প্রয়োজনীয় পণ্য',
      ],
    },
  ];

  const suppliers: Supplier[] = [
    {
      id: 'sup-1',
      name: 'হাজী আব্দুল করিম',
      shopName: 'করিম গ্রোসারি অ্যান্ড ট্রেডার্স',
      mobile: '01711223344',
      address: 'দক্ষিণবাজার মেইন রোড, বড়লেখা, সিলেট',
      marketArea: 'বড়লেখা দক্ষিণবাজার',
      notes: 'সকাল ৯টা থেকে রাত ৯টা পর্যন্ত পাইকারি ও খুচরা সংগ্রহ',
      active: true,
      createdAt: now,
    },
    {
      id: 'sup-2',
      name: 'মো. জসিম উদ্দিন',
      shopName: 'হাকালুকি তাজা মাছ ও সবজি আড়ত',
      mobile: '01812334455',
      address: 'উত্তরবাজার মাছ মহাল, বড়লেখা, সিলেট',
      marketArea: 'বড়লেখা উত্তরবাজার',
      notes: 'সকাল ৭টার মধ্যে অর্ডার দিলে তাজা মাছ ও দেশি সবজি',
      active: true,
      createdAt: now,
    },
    {
      id: 'sup-3',
      name: 'নজরুল ইসলাম',
      shopName: 'মাধবকুণ্ড সিলেটি অর্গানিক হাট',
      mobile: '01913445566',
      address: 'কাঁঠালতলী বাজার রোড, বড়লেখা, সিলেট',
      marketArea: 'কাঁঠালতলী / মাধবকুণ্ড',
      notes: 'সরাসরি বাগানের সাতকরা, জারা লেবু ও পাহাড়ি মধু',
      active: true,
      createdAt: now,
    },
    {
      id: 'sup-4',
      name: 'রিয়াদ আহমেদ',
      shopName: 'সুরমা ফ্যাশন ও ফুটওয়্যার',
      mobile: '01714556677',
      address: 'হাজীগঞ্জ বাজার মার্কেট (২য় তলা), বড়লেখা',
      marketArea: 'হাজীগঞ্জ বাজার',
      notes: 'কটন পাঞ্জাবি, থ্রি-পিস ও চামড়ার স্যান্ডেল',
      active: true,
      createdAt: now,
    },
    {
      id: 'sup-5',
      name: 'তানভীর হাসান',
      shopName: 'বড়লেখা টেক জোন',
      mobile: '01615667788',
      address: 'পৌর মার্কেট নিচতলা, বড়লেখা, সিলেট',
      marketArea: 'বড়লেখা পৌর মার্কেট',
      notes: 'অরিজিনাল ওয়ারেন্টিসহ চার্জার, কেবল ও ইয়ারফোন',
      active: true,
      createdAt: now,
    },
    {
      id: 'sup-6',
      name: 'শফিকুল আলম',
      shopName: 'আধুনিক হোম অ্যান্ড কিচেন',
      mobile: '01716778899',
      address: 'জুড়ী রোড, বড়লেখা, সিলেট',
      marketArea: 'জুড়ী রোড',
      notes: 'গৃহস্থালির প্লাস্টিক, স্টোরেজ ও রান্নাঘরের সামগ্রী',
      active: true,
      createdAt: now,
    },
  ];

  const products: Product[] = [
    {
      id: 'prod-1',
      name: 'প্রিমিয়াম মিনিকেট চাল (নতুন ও ঝরঝরে)',
      nameEn: 'Premium Miniket Rice',
      categoryId: 'cat-grocery',
      subCategory: 'চাল',
      brand: 'রশিদ / তীর',
      unit: '৫ কেজি',
      price: 390,
      compareAtPrice: 415,
      purchasePrice: 355,
      stock: 48,
      supplierId: 'sup-1',
      image: IMG_GROCERY,
      description: 'বাছাইকৃত সেরা মানের মিনিকেট চাল। প্রতিদিনের ভাত ঝরঝরে ও সুস্বাদু রাখতে সরাসরি বড়লেখা দক্ষিণবাজার থেকে সংগৃহীত।',
      featured: true,
      bestSeller: true,
      isLocalSpecial: false,
      active: true,
      createdAt: now,
    },
    {
      id: 'prod-2',
      name: 'খাঁটি দেশি সরিষার তেল (কাঠের ঘানি)',
      nameEn: 'Pure Mustard Oil',
      categoryId: 'cat-grocery',
      subCategory: 'তেল',
      brand: 'প্রাণ / সুরমা',
      unit: '১ লিটার',
      price: 310,
      compareAtPrice: 340,
      purchasePrice: 275,
      stock: 35,
      supplierId: 'sup-1',
      image: IMG_GROCERY,
      description: 'ঝাঁঝালো ও খাঁটি সরিষার তেল। ভর্তা, ভাজি ও দৈনন্দিন রান্নার জন্য শতভাগ বিশুদ্ধ।',
      featured: true,
      bestSeller: true,
      isLocalSpecial: false,
      active: true,
      createdAt: now,
    },
    {
      id: 'prod-3',
      name: 'দেশি মসুর ডাল (ছোট দানা)',
      nameEn: 'Deshi Red Masoor Lentils',
      categoryId: 'cat-grocery',
      subCategory: 'ডাল',
      brand: 'Bazar Mate Select',
      unit: '১ কেজি',
      price: 145,
      purchasePrice: 128,
      stock: 60,
      supplierId: 'sup-1',
      image: IMG_GROCERY,
      description: 'পরিষ্কার ও কঙ্করমুক্ত দেশি ছোট দানার মসুর ডাল। দ্রুত সিদ্ধ হয় এবং চমৎকার স্বাদ।',
      featured: false,
      bestSeller: true,
      isLocalSpecial: false,
      active: true,
      createdAt: now,
    },
    {
      id: 'prod-4',
      name: 'আয়োডিনযুক্ত পরিশোধিত লবণ ও হলুদ-মরিচ গুঁড়া কম্বো',
      nameEn: 'Salt & Spice Essentials Pack',
      categoryId: 'cat-grocery',
      subCategory: 'মসলা',
      brand: 'রাঁধুনী / এসিআই',
      unit: '১ কেজি + ৪০০ গ্রাম',
      price: 220,
      purchasePrice: 190,
      stock: 40,
      supplierId: 'sup-1',
      image: IMG_GROCERY,
      description: 'প্রতিদিনের রান্নার অপরিহার্য লবণ, খাঁটি হলুদ ও ঝাল মরিচ গুঁড়ার সাশ্রয়ী কম্বো।',
      featured: false,
      bestSeller: false,
      isLocalSpecial: false,
      active: true,
      createdAt: now,
    },
    {
      id: 'prod-5',
      name: 'হাকালুকির তাজা রুই মাছ (কাটা ও পরিষ্কার করা)',
      nameEn: 'Fresh Hakaluki Rui Fish',
      categoryId: 'cat-fresh',
      subCategory: 'তাজা মাছ',
      brand: 'হাকালুকি ফ্রেশ',
      unit: '১ কেজি',
      price: 380,
      compareAtPrice: 410,
      purchasePrice: 330,
      stock: 20,
      supplierId: 'sup-2',
      image: IMG_FRESH,
      description: 'হাকালুকি হাওরের তাজা রুই মাছ। অর্ডার কনফার্ম করার পর কেটে ও পরিষ্কার করে আইস-প্যাক সহ বাসায় পাঠানো হয়।',
      featured: true,
      bestSeller: true,
      isLocalSpecial: true,
      active: true,
      createdAt: now,
    },
    {
      id: 'prod-6',
      name: 'তাজা ফার্মের লাল ডিম (বড় সাইজ)',
      nameEn: 'Fresh Farm Brown Eggs',
      categoryId: 'cat-fresh',
      subCategory: 'ডিম',
      brand: 'বড়লেখা পোল্ট্রি',
      unit: '১২ পিস (১ ডজন)',
      price: 155,
      purchasePrice: 138,
      stock: 55,
      supplierId: 'sup-2',
      image: IMG_FRESH,
      description: 'প্রতিদিন খামার থেকে সংগৃহীত সতেজ ও বড় আকারের ডিম, নিরাপদ ডিমের ট্রে-তে প্যাক করা।',
      featured: false,
      bestSeller: true,
      isLocalSpecial: false,
      active: true,
      createdAt: now,
    },
    {
      id: 'prod-7',
      name: 'টাটকা দেশি সবজি বাস্কেট (আলু, পটল, ঢেঁড়স, টমেটো)',
      nameEn: 'Daily Fresh Vegetable Basket',
      categoryId: 'cat-fresh',
      subCategory: 'শাকসবজি',
      brand: 'স্থানীয় কৃষক',
      unit: '৩ কেজি কম্বো',
      price: 210,
      compareAtPrice: 240,
      purchasePrice: 175,
      stock: 25,
      supplierId: 'sup-2',
      image: IMG_FRESH,
      description: 'সকালের বাছাইকৃত টাটকা দেশি সবজি। আলু ১ কেজি, টমেটো ৫০০ গ্রাম, ঢেঁড়স ও করলা/পটল সহ সম্পূর্ণ পরিবারের বাজার।',
      featured: true,
      bestSeller: false,
      isLocalSpecial: true,
      active: true,
      createdAt: now,
    },
    {
      id: 'prod-8',
      name: 'সোনালী মুরগি (ড্রেসড ও পরিষ্কার)',
      nameEn: 'Fresh Sonali Chicken Dressed',
      categoryId: 'cat-fresh',
      subCategory: 'মুরগি',
      brand: 'তাজা বাজার',
      unit: '১ কেজি',
      price: 340,
      purchasePrice: 300,
      stock: 18,
      supplierId: 'sup-2',
      image: IMG_FRESH,
      description: 'অর্ডার পাওয়ার পরপরই স্বাস্থ্যসম্মতভাবে ড্রেসড ও পরিষ্কার করা সোনালী মুরগি।',
      featured: false,
      bestSeller: true,
      isLocalSpecial: false,
      active: true,
      createdAt: now,
    },
    {
      id: 'prod-9',
      name: 'বড়লেখার খাঁটি সবুজ সাতকরা (পাহাড়ি বাগানের)',
      nameEn: 'Authentic Sylheti Green Satkara',
      categoryId: 'cat-local',
      subCategory: 'সাতকরা',
      brand: 'বড়লেখা অরিজিনাল',
      unit: '৪ পিস (বড়)',
      price: 240,
      compareAtPrice: 280,
      purchasePrice: 190,
      stock: 32,
      supplierId: 'sup-3',
      image: IMG_LOCAL,
      description: 'বড়লেখা ও পাহাড়ি অঞ্চলের বিখ্যাত সুগন্ধি সাতকরা। গরুর মাংস বা ডালের সাথে অতুলনীয় সিলেটি স্বাদ।',
      featured: true,
      bestSeller: true,
      isLocalSpecial: true,
      active: true,
      createdAt: now,
    },
    {
      id: 'prod-10',
      name: 'সিলেটি স্পেশাল ব্ল্যাক টি (গোল্ডেন ক্লোনাল চা)',
      nameEn: 'Sylhet Special Clonal Black Tea',
      categoryId: 'cat-local',
      subCategory: 'চা',
      brand: 'মাধবকুণ্ড টি এস্টেট',
      unit: '৫০০ গ্রাম',
      price: 260,
      purchasePrice: 215,
      stock: 44,
      supplierId: 'sup-3',
      image: IMG_LOCAL,
      description: 'বড়লেখা ও মৌলভীবাজারের বাগান থেকে সরাসরি সংগৃহীত কড়া লিকার ও সুগন্ধিযুক্ত প্রিমিয়াম চা পাতা।',
      featured: true,
      bestSeller: true,
      isLocalSpecial: true,
      active: true,
      createdAt: now,
    },
    {
      id: 'prod-11',
      name: 'প্রাকৃতিক খাঁটি মধু (পাহাড়ি ফুলের)',
      nameEn: 'Raw Natural Sylheti Honey',
      categoryId: 'cat-local',
      subCategory: 'মধু',
      brand: 'সিলেটি অর্গানিক হাট',
      unit: '২৫০ গ্রাম গ্লাস জার',
      price: 350,
      compareAtPrice: 390,
      purchasePrice: 280,
      stock: 22,
      supplierId: 'sup-3',
      image: IMG_LOCAL,
      description: 'কোনো চিনি বা কৃত্রিম উপাদান ছাড়া শতভাগ প্রাকৃতিক ও ল্যাব-পরীক্ষিত খাঁটি মধু।',
      featured: false,
      bestSeller: false,
      isLocalSpecial: true,
      active: true,
      createdAt: now,
    },
    {
      id: 'prod-12',
      name: 'সুগন্ধি জারা লেবু ও কাগজি লেবু (বাগানের তাজা)',
      nameEn: 'Sylheti Zara & Kagzi Lemon',
      categoryId: 'cat-local',
      subCategory: 'লেবু',
      brand: 'বড়লেখা কৃষক',
      unit: '৪ পিস',
      price: 130,
      purchasePrice: 95,
      stock: 40,
      supplierId: 'sup-3',
      image: IMG_LOCAL,
      description: 'রসালো ও চমৎকার সুঘ্রাণযুক্ত বড়লেখার বিখ্যাত জারা ও কাগজি লেবু।',
      featured: false,
      bestSeller: false,
      isLocalSpecial: true,
      active: true,
      createdAt: now,
    },
    {
      id: 'prod-13',
      name: 'প্রিমিয়াম হ্যান্ডলুম কটন পাঞ্জাবি (ক্রিম)',
      nameEn: 'Handloom Cotton Panjabi',
      categoryId: 'cat-fashion',
      subCategory: 'পুরুষদের পোশাক',
      brand: 'সুরমা ক্রাফট',
      unit: '১ পিস (M / L / XL)',
      price: 1250,
      compareAtPrice: 1450,
      purchasePrice: 980,
      stock: 15,
      supplierId: 'sup-4',
      image: IMG_FASHION,
      description: 'আরামদায়ক পিওর কটন কাপড়ের তৈরি মার্জিত পাঞ্জাবি। গরমে ও উৎসবে পরার জন্য উপযুক্ত।',
      featured: true,
      bestSeller: false,
      isLocalSpecial: false,
      active: true,
      createdAt: now,
    },
    {
      id: 'prod-14',
      name: 'ক্লাসিক লেদার স্যান্ডেল (ডাবল বকলস)',
      nameEn: 'Classic Leather Sandals',
      categoryId: 'cat-fashion',
      subCategory: 'স্যান্ডেল',
      brand: 'সুরমা ফুটওয়্যার',
      unit: '১ জোড়া (৪০–৪৩)',
      price: 890,
      purchasePrice: 700,
      stock: 12,
      supplierId: 'sup-4',
      image: IMG_FASHION,
      description: 'টেকসই চামড়া ও আরামদায়ক সোলের তৈরি দৈনন্দিন ব্যবহারের ক্লাসিক স্যান্ডেল।',
      featured: false,
      bestSeller: true,
      isLocalSpecial: false,
      active: true,
      createdAt: now,
    },
    {
      id: 'prod-15',
      name: 'হ্যান্ডওভেন এমারেল্ড কটন ওড়না / স্কার্ফ',
      nameEn: 'Handwoven Cotton Scarf',
      categoryId: 'cat-fashion',
      subCategory: 'নারীদের পোশাক',
      brand: 'তাঁতশিল্প বাংলা',
      unit: '১ পিস',
      price: 540,
      purchasePrice: 410,
      stock: 19,
      supplierId: 'sup-4',
      image: IMG_FASHION,
      description: 'নরম সুতির তৈরি ঐতিহ্যবাহী নকশার ওড়না, যা প্রতিদিনের ব্যবহারে অত্যন্ত আরামদায়ক।',
      featured: false,
      bestSeller: false,
      isLocalSpecial: false,
      active: true,
      createdAt: now,
    },
    {
      id: 'prod-16',
      name: '৩৩ ওয়াট ফাস্ট GaN USB-C মোবাইল চার্জার',
      nameEn: '33W Fast GaN USB-C Charger',
      categoryId: 'cat-electronics',
      subCategory: 'চার্জার',
      brand: 'Anker / Baseus',
      unit: '১ পিস (৬ মাস ওয়ারেন্টি)',
      price: 950,
      compareAtPrice: 1100,
      purchasePrice: 760,
      stock: 20,
      supplierId: 'sup-5',
      image: IMG_TECH,
      description: 'অরিজিনাল ৩৩ ওয়াট ফাস্ট চার্জিং অ্যাডাপ্টার। স্মার্টফোন ও ট্যাবলেট নিরাপদে দ্রুত চার্জ করে।',
      featured: true,
      bestSeller: true,
      isLocalSpecial: false,
      active: true,
      createdAt: now,
    },
    {
      id: 'prod-17',
      name: 'ব্রেইডেড নাইলন ফাস্ট টাইপ-সি ডেটা কেবল (১.২ মিটার)',
      nameEn: 'Braided Fast Type-C Cable',
      categoryId: 'cat-electronics',
      subCategory: 'কেবল',
      brand: 'Baseus',
      unit: '১ পিস',
      price: 320,
      purchasePrice: 230,
      stock: 38,
      supplierId: 'sup-5',
      image: IMG_TECH,
      description: 'শক্তপোক্ত ব্রেইডেড কেবল, সহজে ছিঁড়ে না এবং ৬০ ওয়াট পর্যন্ত ফাস্ট চার্জিং সাপোর্ট করে।',
      featured: false,
      bestSeller: false,
      isLocalSpecial: false,
      active: true,
      createdAt: now,
    },
    {
      id: 'prod-18',
      name: 'ওয়্যারলেস ব্লুটুথ ইয়ারবাডস (ANC ও ২৪ ঘণ্টা ব্যাটারি)',
      nameEn: 'Wireless Bluetooth Earbuds',
      categoryId: 'cat-electronics',
      subCategory: 'ইয়ারফোন',
      brand: 'Soundcore / QCY',
      unit: '১ সেট',
      price: 1650,
      compareAtPrice: 1850,
      purchasePrice: 1320,
      stock: 4,
      supplierId: 'sup-5',
      image: IMG_TECH,
      description: 'ক্রিস্টাল ক্লিয়ার কল কোয়ালিটি এবং গভীর বেজ সাউন্ড। দ্রুত চার্জিং কেসসহ।',
      featured: false,
      bestSeller: true,
      isLocalSpecial: false,
      active: true,
      createdAt: now,
    },
    {
      id: 'prod-19',
      name: 'এয়ারটাইট গ্লাস কিচেন স্টোরেজ জার সেট (৩ পিস)',
      nameEn: 'Airtight Glass Kitchen Jar Set',
      categoryId: 'cat-home',
      subCategory: 'রান্নাঘরের সামগ্রী',
      brand: 'হোম প্রো',
      unit: '৩ পিস সেট',
      price: 780,
      compareAtPrice: 880,
      purchasePrice: 600,
      stock: 16,
      supplierId: 'sup-6',
      image: IMG_HOME,
      description: 'চা পাতা, কফি, চিনি বা শুকনো মসলা সতেজ রাখার জন্য কাঠের ঢাকনাযুক্ত আধুনিক গ্লাস জার।',
      featured: true,
      bestSeller: false,
      isLocalSpecial: false,
      active: true,
      createdAt: now,
    },
    {
      id: 'prod-20',
      name: 'স্টেইনলেস স্টিল কেটলি (১.২ লিটার)',
      nameEn: 'Brushed Stainless Steel Kettle',
      categoryId: 'cat-home',
      subCategory: 'গৃহস্থালির পণ্য',
      brand: 'কিয়াম / মিয়াকো',
      unit: '১ পিস',
      price: 1180,
      purchasePrice: 920,
      stock: 3,
      supplierId: 'sup-6',
      image: IMG_HOME,
      description: 'মরিচারোধী স্টেইনলেস স্টিলের টেকসই কেটলি। গরম পানি, চা বা কফি তৈরির জন্য চমৎকার।',
      featured: false,
      bestSeller: false,
      isLocalSpecial: false,
      active: true,
      createdAt: now,
    },
  ];

  const deliveryZones: DeliveryZone[] = [
    {
      id: 'zone-barlekha',
      name: 'বড়লেখা উপজেলা',
      charge: 100,
      estimatedTime: '২–৪ ঘণ্টার মধ্যে ডেলিভারি',
      active: true,
    },
    {
      id: 'zone-nationwide',
      name: 'সারাদেশে (বাংলাদেশ)',
      charge: 150,
      estimatedTime: '২৪–৭২ ঘণ্টার মধ্যে কুরিয়ার ডেলিভারি',
      active: true,
    },
  ];

  const coupons: Coupon[] = [
    {
      id: 'cpn-1',
      code: 'BARLEKHA50',
      type: 'fixed',
      value: 50,
      minOrder: 500,
      active: true,
      usageCount: 14,
    },
    {
      id: 'cpn-2',
      code: 'SATKARA10',
      type: 'percent',
      value: 10,
      minOrder: 1000,
      active: true,
      usageCount: 6,
    },
  ];

  const banner: BannerSettings = {
    announcementText: 'বড়লেখা উপজেলা ডেলিভারি ৳100 · সারাদেশে ৳150 · ক্যাশ অন ডেলিভারি',
    announcementActive: true,
    heroTitle: 'ঘরে বসেই বাজার করুন।',
    heroSubtitle: 'আপনার প্রয়োজনীয় পণ্য অর্ডার করুন, আমরা সংগ্রহ করে নিরাপদে আপনার বাসায় পৌঁছে দেব।',
    heroCta: 'এখনই বাজার করুন',
    heroBadge: 'বড়লেখা, সিলেট · লোকাল মার্কেটপ্লেস ও হোম ডেলিভারি',
  };

  const users: StoredUser[] = [
    {
      id: 'usr-admin',
      name: 'Admin 1 (প্রধান অ্যাডমিন)',
      mobile: '01602507070',
      email: 'admin@bazarmate.bd',
      role: 'admin',
      passwordHash: hashPassword('admin123'),
      savedAddresses: [],
      wishlist: [],
      createdAt: now,
    },
    {
      id: 'usr-admin-2',
      name: 'Admin 2 (সহযোগী অ্যাডমিন)',
      mobile: '01602507071',
      email: 'admin2@bazarmate.bd',
      role: 'admin',
      passwordHash: hashPassword('admin123'),
      savedAddresses: [],
      wishlist: [],
      createdAt: now,
    },
    {
      id: 'usr-cust-1',
      name: 'ফারহান চৌধুরী',
      mobile: '01712345678',
      email: 'farhan@example.com',
      role: 'customer',
      passwordHash: hashPassword('123456'),
      savedAddresses: [
        {
          id: 'addr-1',
          label: 'বাসা (বড়লেখা)',
          area: 'পৌরসভা ২নং ওয়ার্ড, হাজীগঞ্জ রোড',
          deliveryZoneId: 'zone-barlekha',
          address: 'বাসা #১২, মসজিদ গলি, হাজীগঞ্জ রোড, বড়লেখা, সিলেট',
          mobile: '01712345678',
        },
      ],
      wishlist: ['prod-9', 'prod-5'],
      createdAt: now,
    },
  ];

  const orders: Order[] = [
    {
      id: 'ord-1001',
      orderNumber: 'BM-1001',
      userId: 'usr-cust-1',
      customerName: 'ফারহান চৌধুরী',
      customerMobile: '01712345678',
      area: 'পৌরসভা ২নং ওয়ার্ড, হাজীগঞ্জ রোড',
      deliveryZoneId: 'zone-barlekha',
      deliveryAddress: 'বাসা #১২, মসজিদ গলি, হাজীগঞ্জ রোড, বড়লেখা, সিলেট',
      orderNote: 'রুই মাছ যেন মাঝারি পিস করে কাটা হয়',
      paymentMethod: 'COD',
      items: [
        {
          productId: 'prod-1',
          productName: 'প্রিমিয়াম মিনিকেট চাল (নতুন ও ঝরঝরে)',
          unit: '৫ কেজি',
          image: IMG_GROCERY,
          quantity: 1,
          price: 390,
          purchasePrice: 355,
          supplierId: 'sup-1',
          supplierName: 'করিম গ্রোসারি অ্যান্ড ট্রেডার্স',
          collected: true,
          qcPassed: true,
        },
        {
          productId: 'prod-5',
          productName: 'হাকালুকির তাজা রুই মাছ (কাটা ও পরিষ্কার করা)',
          unit: '১ কেজি',
          image: IMG_FRESH,
          quantity: 1,
          price: 380,
          purchasePrice: 330,
          supplierId: 'sup-2',
          supplierName: 'হাকালুকি তাজা মাছ ও সবজি আড়ত',
          collected: true,
          qcPassed: true,
        },
        {
          productId: 'prod-9',
          productName: 'বড়লেখার খাঁটি সবুজ সাতকরা (পাহাড়ি বাগানের)',
          unit: '৪ পিস (বড়)',
          image: IMG_LOCAL,
          quantity: 1,
          price: 240,
          purchasePrice: 190,
          supplierId: 'sup-3',
          supplierName: 'মাধবকুণ্ড সিলেটি অর্গানিক হাট',
          collected: true,
          qcPassed: true,
        },
      ],
      subtotal: 1010,
      discount: 0,
      deliveryCharge: 100,
      totalAmount: 1110,
      status: 'Delivered',
      fulfillment: {
        supplierListGenerated: true,
        collectionCompleted: true,
        qualityCheckPassed: true,
        consolidated: true,
        packed: true,
        deliveryRiderName: 'কামাল হোসেন',
        deliveryRiderPhone: '01899112233',
        history: [
          { status: 'Pending', timestamp: now, note: 'ক্রেতার অর্ডার গ্রহণ করা হয়েছে' },
          { status: 'Confirmed', timestamp: now, note: 'অর্ডার কনফার্ম ও সাপ্লায়ার লিস্ট তৈরি' },
          { status: 'Collected', timestamp: now, note: '৩টি স্থানীয় দোকান থেকে পণ্য সংগৃহীত' },
          { status: 'Packed', timestamp: now, note: 'মান যাচাই ও একসাথে প্যাকিং সম্পন্ন' },
          { status: 'Delivered', timestamp: now, note: 'ক্রেতার হাতে ডেলিভারি ও COD সম্পন্ন' },
        ],
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ord-1002',
      orderNumber: 'BM-1002',
      userId: 'usr-cust-1',
      customerName: 'সাবরিনা আক্তার',
      customerMobile: '01755667788',
      area: 'দক্ষিণভাগ রোড, বড়লেখা',
      deliveryZoneId: 'zone-barlekha',
      deliveryAddress: 'নূরজাহান ভিলা, দক্ষিণভাগ রোড, বড়লেখা',
      orderNote: 'বিকেল ৪টার পর কল দিয়ে আসবেন',
      paymentMethod: 'COD',
      items: [
        {
          productId: 'prod-10',
          productName: 'সিলেটি স্পেশাল ব্ল্যাক টি (গোল্ডেন ক্লোনাল চা)',
          unit: '৫০০ গ্রাম',
          image: IMG_LOCAL,
          quantity: 2,
          price: 260,
          purchasePrice: 215,
          supplierId: 'sup-3',
          supplierName: 'মাধবকুণ্ড সিলেটি অর্গানিক হাট',
          collected: true,
          qcPassed: false,
        },
        {
          productId: 'prod-16',
          productName: '৩৩ ওয়াট ফাস্ট GaN USB-C মোবাইল চার্জার',
          unit: '১ পিস (৬ মাস ওয়ারেন্টি)',
          image: IMG_TECH,
          quantity: 1,
          price: 950,
          purchasePrice: 760,
          supplierId: 'sup-5',
          supplierName: 'বড়লেখা টেক জোন',
          collected: false,
          qcPassed: false,
        },
      ],
      subtotal: 1470,
      discount: 50,
      couponCode: 'BARLEKHA50',
      deliveryCharge: 100,
      totalAmount: 1520,
      status: 'Processing',
      fulfillment: {
        supplierListGenerated: true,
        collectionCompleted: false,
        qualityCheckPassed: false,
        consolidated: false,
        packed: false,
        deliveryRiderName: '',
        deliveryRiderPhone: '',
        history: [
          { status: 'Pending', timestamp: now, note: 'ক্রেতার অর্ডার গ্রহণ করা হয়েছে' },
          { status: 'Confirmed', timestamp: now, note: 'অর্ডার কনফার্ম হয়েছে' },
          { status: 'Processing', timestamp: now, note: 'সাপ্লায়ার থেকে পণ্য সংগ্রহ চলমান' },
        ],
      },
      createdAt: now,
      updatedAt: now,
    },
  ];

  const reviews: Review[] = [
    {
      id: 'rev-1',
      customerName: 'তাসনিম জাহান',
      location: 'হাজীগঞ্জ রোড, বড়লেখা',
      rating: 5,
      comment:
        'এক অর্ডারেই চাল-ডাল, হাকালুকির রুই মাছ আর সাতকরা একসাথে পেয়ে গেলাম। মাছ খুব পরিষ্কার করে কেটে দিয়েছিল এবং সব প্যাকেজিং ছিল নিখুঁত।',
      orderSummary: 'মুদি ও তাজা মাছ অর্ডার',
      createdAt: now,
    },
    {
      id: 'rev-2',
      customerName: 'আশরাফুল ইসলাম',
      location: 'কাঁঠালতলী, বড়লেখা',
      rating: 5,
      comment:
        'বড়লেখায় এমন পেশাদার ডেলিভারি সার্ভিস সত্যিই দরকার ছিল। চার্জার আর ঘরের বাজার মিলিয়ে ৩ ঘণ্টার মধ্যেই বাসায় পৌঁছে দিয়েছে।',
      orderSummary: 'ইলেকট্রনিক্স ও গ্রোসারি',
      createdAt: now,
    },
    {
      id: 'rev-3',
      customerName: 'রাহাতুল হক',
      location: 'শাহবাজপুর বাজার, বড়লেখা',
      rating: 5,
      comment:
        'বাবার বাসার জন্য নিয়মিত বাজার করে দেই। ক্যাশ অন ডেলিভারি ও লাইভ অর্ডার স্ট্যাটাস দেখার সুবিধাটা দারুণ নির্ভরযোগ্য।',
      orderSummary: 'সাপ্তাহিক পারিবারিক বাজার',
      createdAt: now,
    },
  ];

  const sellerListings: SellerListing[] = [
    {
      id: 'sell-1001',
      sellerName: 'সাজিদুর রহমান',
      shopName: 'গ্রামবাংলা খামার, দক্ষিণভাগ',
      sellerMobile: '01722334455',
      marketArea: 'দক্ষিণভাগ, বড়লেখা',
      productName: 'দেশি পাকা পেঁপে (বাড়ির আঙিনার)',
      categoryId: 'cat-fresh',
      subCategory: 'ফলমূল',
      brand: 'স্থানীয় খামার',
      unit: '১ কেজি',
      askingPrice: 70,
      suggestedSellingPrice: 85,
      stock: 25,
      description: 'ফরমালিনমুক্ত সম্পূর্ণ প্রাকৃতিকভাবে পাকা দেশি মিষ্টি পেঁপে।',
      image: IMG_FRESH,
      status: 'Pending',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const parcelBookings: ParcelBooking[] = [
    {
      id: 'pcl-1001',
      parcelCode: 'PKG-1001',
      senderName: 'কামাল উদ্দিন',
      senderMobile: '01711002233',
      pickupArea: 'দক্ষিণবাজার, বড়লেখা',
      pickupAddress: 'দক্ষিণবাজার মেইন রোড, নিউ মার্কেট দোকান #৫',
      receiverName: 'সাব্বির আহমদ',
      receiverMobile: '01811223344',
      deliveryZoneId: 'zone-barlekha',
      deliveryArea: 'কাঁঠালতলী বাজার, বড়লেখা',
      deliveryAddress: 'কাঁঠালতলী স্কুল রোড, বড়লেখা',
      parcelType: 'জরুরি ডকুমেন্ট ও গিফট',
      weight: '১ কেজি পর্যন্ত',
      codAmount: 0,
      deliveryCharge: 100,
      note: 'বিকেল ৫টার আগে পৌঁছে দেবেন',
      status: 'In Transit',
      riderName: 'জাহিদ হাসান',
      riderPhone: '01899112233',
      createdAt: now,
      updatedAt: now,
    },
  ];

  return {
    categories,
    suppliers,
    products,
    deliveryZones,
    coupons,
    banner,
    orders,
    users,
    reviews,
    sellerListings,
    parcelBookings,
    orderSeq: 1002,
    parcelSeq: 1001,
  };
}

let cachedDb: DatabaseSchema | null = null;

export function getDb(): DatabaseSchema {
  if (cachedDb) return cachedDb;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    cachedDb = createInitialData();
    saveDb(cachedDb);
    return cachedDb;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    cachedDb = JSON.parse(raw) as DatabaseSchema;
    let needsSave = false;
    if (!Array.isArray(cachedDb.sellerListings)) {
      cachedDb.sellerListings = [];
      needsSave = true;
    }
    if (!Array.isArray(cachedDb.parcelBookings)) {
      cachedDb.parcelBookings = [];
      needsSave = true;
    }
    if (typeof cachedDb.parcelSeq !== 'number') {
      cachedDb.parcelSeq = 1000 + cachedDb.parcelBookings.length;
      needsSave = true;
    }
    const existingAdmins = cachedDb.users.filter((u) => u.role === 'admin');
    if (existingAdmins.length < 2 && !cachedDb.users.some((u) => u.id === 'usr-admin-2')) {
      cachedDb.users.push({
        id: 'usr-admin-2',
        name: 'Admin 2 (সহযোগী অ্যাডমিন)',
        mobile: '01602507071',
        email: 'admin2@bazarmate.bd',
        role: 'admin',
        passwordHash: hashPassword('admin123'),
        savedAddresses: [],
        wishlist: [],
        createdAt: new Date().toISOString(),
      });
      needsSave = true;
    }
    if (needsSave) {
      saveDb(cachedDb);
    }
    return cachedDb;
  } catch {
    cachedDb = createInitialData();
    saveDb(cachedDb);
    return cachedDb;
  }
}

export const MAX_ADMINS = 2;

export function getAuthorizedAdmins(db: DatabaseSchema): StoredUser[] {
  return db.users.filter((u) => u.role === 'admin').slice(0, MAX_ADMINS);
}

export function saveDb(db: DatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
  cachedDb = db;
}

export function sanitizeUser(u: StoredUser): User {
  const { passwordHash: _ignored, ...rest } = u;
  return rest;
}

export function createOrderNumber(db: DatabaseSchema): string {
  db.orderSeq += 1;
  return `BM-${db.orderSeq}`;
}

export function createParcelCode(db: DatabaseSchema): string {
  db.parcelSeq = (db.parcelSeq || 1000) + 1;
  return `PKG-${db.parcelSeq}`;
}

export function isValidStatusTransition(_from: OrderStatus, _to: OrderStatus): boolean {
  return true;
}

export function createSavedAddress(
  label: string,
  area: string,
  deliveryZoneId: string,
  address: string,
  mobile: string,
): SavedAddress {
  return {
    id: `addr-${Date.now()}`,
    label,
    area,
    deliveryZoneId,
    address,
    mobile,
  };
}
