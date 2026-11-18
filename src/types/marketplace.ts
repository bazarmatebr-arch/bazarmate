export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Collected'
  | 'Packed'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Collected',
  'Packed',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

export const ORDER_STATUS_BN: Record<OrderStatus, string> = {
  Pending: 'অপেক্ষমাণ (Pending)',
  Confirmed: 'নিশ্চিত হয়েছে (Confirmed)',
  Processing: 'সংগ্রহ চলছে (Processing)',
  Collected: 'পণ্য সংগৃহীত (Collected)',
  Packed: 'প্যাকিং সম্পন্ন (Packed)',
  'Out for Delivery': 'ডেলিভারির পথে (Out for Delivery)',
  Delivered: 'ডেলিভারি সম্পন্ন (Delivered)',
  Cancelled: 'বাতিল (Cancelled)',
};

export interface Category {
  id: string;
  name: string;
  nameBn: string;
  description: string;
  image: string;
  subCategories: string[];
  sortOrder: number;
}

export interface Supplier {
  id: string;
  name: string;
  shopName: string;
  mobile: string;
  address: string;
  marketArea: string;
  notes: string;
  active: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  nameEn: string;
  categoryId: string;
  subCategory: string;
  brand: string;
  unit: string;
  price: number;
  compareAtPrice?: number;
  purchasePrice: number;
  stock: number;
  supplierId: string;
  image: string;
  description: string;
  featured: boolean;
  bestSeller: boolean;
  isLocalSpecial: boolean;
  active: boolean;
  createdAt: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  charge: number;
  estimatedTime: string;
  active: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'fixed' | 'percent';
  value: number;
  minOrder: number;
  active: boolean;
  usageCount: number;
}

export interface BannerSettings {
  announcementText: string;
  announcementActive: boolean;
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  heroBadge: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  unit: string;
  image: string;
  quantity: number;
  price: number;
  purchasePrice: number;
  supplierId: string;
  supplierName: string;
  collected: boolean;
  qcPassed: boolean;
  isCustom?: boolean;
  customNote?: string;
}

export interface OrderHistoryEntry {
  status: OrderStatus;
  timestamp: string;
  note: string;
}

export interface OrderFulfillment {
  supplierListGenerated: boolean;
  collectionCompleted: boolean;
  qualityCheckPassed: boolean;
  consolidated: boolean;
  packed: boolean;
  deliveryRiderName: string;
  deliveryRiderPhone: string;
  history: OrderHistoryEntry[];
}

export interface Order {
  id: string;
  orderNumber: string;
  orderType?: 'catalog' | 'manual' | 'mixed';
  userId?: string;
  customerName: string;
  customerMobile: string;
  area: string;
  deliveryZoneId: string;
  deliveryAddress: string;
  orderNote: string;
  paymentMethod: 'COD' | 'ONLINE_PENDING';
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  deliveryCharge: number;
  totalAmount: number;
  status: OrderStatus;
  fulfillment: OrderFulfillment;
  createdAt: string;
  updatedAt: string;
}

export interface SavedAddress {
  id: string;
  label: string;
  area: string;
  deliveryZoneId: string;
  address: string;
  mobile: string;
}

export interface User {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  role: 'customer' | 'admin';
  savedAddresses: SavedAddress[];
  wishlist: string[];
  createdAt: string;
}

export interface Review {
  id: string;
  customerName: string;
  location: string;
  rating: number;
  comment: string;
  orderSummary: string;
  createdAt: string;
}

export interface StorePublicData {
  categories: Category[];
  products: Product[];
  deliveryZones: DeliveryZone[];
  banner: BannerSettings;
  reviews: Review[];
}

export interface AdminOverviewStats {
  totalOrders: number;
  totalSales: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockProducts: Product[];
  estimatedProfit: number;
}

export type SellerListingStatus = 'Pending' | 'Approved' | 'Rejected';

export interface SellerListing {
  id: string;
  userId?: string;
  sellerName: string;
  shopName: string;
  sellerMobile: string;
  marketArea: string;
  productName: string;
  categoryId: string;
  subCategory: string;
  brand: string;
  unit: string;
  askingPrice: number;
  suggestedSellingPrice: number;
  stock: number;
  description: string;
  image: string;
  status: SellerListingStatus;
  adminNote?: string;
  publishedProductId?: string;
  createdAt: string;
  updatedAt: string;
}

export type ParcelStatus =
  | 'Booked'
  | 'Picked Up'
  | 'In Transit'
  | 'Delivered'
  | 'Cancelled';

export const PARCEL_STATUS_FLOW: ParcelStatus[] = [
  'Booked',
  'Picked Up',
  'In Transit',
  'Delivered',
  'Cancelled',
];

export const PARCEL_STATUS_BN: Record<ParcelStatus, string> = {
  Booked: 'বুকিং গৃহীত (Booked)',
  'Picked Up': 'পার্সেল রিসিভ সম্পন্ন (Picked Up)',
  'In Transit': 'ডেলিভারির পথে (In Transit)',
  Delivered: 'ডেলিভারি সম্পন্ন (Delivered)',
  Cancelled: 'বাতিলকৃত (Cancelled)',
};

export interface ParcelBooking {
  id: string;
  parcelCode: string;
  userId?: string;
  senderName: string;
  senderMobile: string;
  pickupArea: string;
  pickupAddress: string;
  receiverName: string;
  receiverMobile: string;
  deliveryZoneId: string;
  deliveryArea: string;
  deliveryAddress: string;
  parcelType: string;
  weight: string;
  codAmount: number;
  deliveryCharge: number;
  note: string;
  status: ParcelStatus;
  riderName: string;
  riderPhone: string;
  createdAt: string;
  updatedAt: string;
}


