import type {
  AdminOverviewStats,
  BannerSettings,
  Category,
  Coupon,
  DeliveryZone,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  Review,
  SavedAddress,
  StorePublicData,
  Supplier,
  User,
} from '../types/marketplace';

const TOKEN_KEY = 'bazarmate_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'অনুরোধ সম্পন্ন করা যায়নি।');
  }
  return data as T;
}

export const api = {
  getStorefront: () => request<StorePublicData>('/api/storefront'),

  submitReview: (payload: {
    customerName: string;
    location: string;
    rating: number;
    comment: string;
    orderSummary?: string;
  }) =>
    request<Review>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  register: (payload: { name: string; mobile: string; email?: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { identifier: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => request<{ user: User }>('/api/auth/me'),

  updateProfile: (payload: {
    name?: string;
    email?: string;
    savedAddresses?: SavedAddress[];
    newAddress?: Omit<SavedAddress, 'id'>;
  }) =>
    request<{ user: User }>('/api/account/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  toggleWishlist: (productId: string) =>
    request<{ wishlist: string[] }>(`/api/account/wishlist/${productId}`, {
      method: 'POST',
    }),

  validateCoupon: (code: string, subtotal: number) =>
    request<{ coupon: Coupon; discount: number }>('/api/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal }),
    }),

  createOrder: (payload: {
    customerName: string;
    customerMobile: string;
    area: string;
    deliveryZoneId: string;
    deliveryAddress: string;
    orderNote: string;
    couponCode?: string;
    items: { productId: string; quantity: number }[];
  }) =>
    request<Order>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMyOrders: () => request<Order[]>('/api/orders/my'),

  trackOrder: (orderNumber: string, mobile?: string) => {
    const params = new URLSearchParams({ orderNumber });
    if (mobile) params.set('mobile', mobile);
    return request<Order>(`/api/orders/track?${params.toString()}`);
  },

  // Admin APIs
  getAdminDashboard: () =>
    request<{
      stats: AdminOverviewStats;
      categories: Category[];
      products: Product[];
      suppliers: Supplier[];
      orders: Order[];
      deliveryZones: DeliveryZone[];
      coupons: Coupon[];
      banner: BannerSettings;
      customers: User[];
    }>('/api/admin/dashboard'),

  createProduct: (payload: Partial<Product>) =>
    request<Product>('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateProduct: (id: string, payload: Partial<Product>) =>
    request<Product>(`/api/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteProduct: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/products/${id}`, {
      method: 'DELETE',
    }),

  createCategory: (payload: Partial<Category>) =>
    request<Category>('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateCategory: (id: string, payload: Partial<Category>) =>
    request<Category>(`/api/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteCategory: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/categories/${id}`, {
      method: 'DELETE',
    }),

  createSupplier: (payload: Partial<Supplier>) =>
    request<Supplier>('/api/admin/suppliers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateSupplier: (id: string, payload: Partial<Supplier>) =>
    request<Supplier>(`/api/admin/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteSupplier: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/suppliers/${id}`, {
      method: 'DELETE',
    }),

  updateOrder: (
    id: string,
    payload: {
      status?: OrderStatus;
      note?: string;
      items?: OrderItem[];
      fulfillment?: Partial<Order['fulfillment']>;
    },
  ) =>
    request<Order>(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  updateDeliveryZones: (zones: DeliveryZone[]) =>
    request<DeliveryZone[]>('/api/admin/delivery-zones', {
      method: 'PUT',
      body: JSON.stringify(zones),
    }),

  updateBanner: (banner: Partial<BannerSettings>) =>
    request<BannerSettings>('/api/admin/banner', {
      method: 'PUT',
      body: JSON.stringify(banner),
    }),

  createCoupon: (coupon: Partial<Coupon>) =>
    request<Coupon>('/api/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(coupon),
    }),

  updateCoupon: (id: string, payload: Partial<Coupon>) =>
    request<Coupon>(`/api/admin/coupons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteCoupon: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/coupons/${id}`, {
      method: 'DELETE',
    }),
};
