import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  createOrderNumber,
  createSavedAddress,
  getDb,
  hashPassword,
  sanitizeUser,
  saveDb,
  signToken,
  verifyPassword,
  verifyToken,
} from './server/db.ts';
import type {
  BannerSettings,
  Category,
  Coupon,
  DeliveryZone,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  Review,
  SellerListing,
  SellerListingStatus,
  Supplier,
} from './src/types/marketplace.ts';

interface AuthRequest extends Request {
  authUser?: { userId: string; role: 'customer' | 'admin' };
}

function attachAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7).trim();
    const verified = verifyToken(token);
    if (verified) {
      req.authUser = verified;
    }
  }
  next();
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.authUser) {
    res.status(401).json({ error: 'অনুগ্রহ করে আগে লগইন করুন।' });
    return;
  }
  next();
}

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.authUser || req.authUser.role !== 'admin') {
    res.status(403).json({ error: 'শুধুমাত্র অ্যাডমিন এই অ্যাক্সেস করতে পারবেন।' });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use(attachAuth);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, brand: 'Bazar Mate', location: 'Barlekha, Sylhet' });
  });

  // Public Storefront Bootstrap
  app.get('/api/storefront', (_req, res) => {
    const db = getDb();
    res.json({
      categories: [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder),
      products: db.products.filter((p) => p.active),
      deliveryZones: db.deliveryZones.filter((z) => z.active),
      banner: db.banner,
      reviews: db.reviews,
    });
  });

  // Public Reviews submission
  app.post('/api/reviews', (req, res) => {
    const db = getDb();
    const { customerName, location, rating, comment, orderSummary } = req.body as Partial<Review>;
    if (!customerName || !comment) {
      res.status(400).json({ error: 'নাম এবং মতামত লিখুন।' });
      return;
    }
    const review: Review = {
      id: `rev-${Date.now()}`,
      customerName: customerName.trim().slice(0, 80),
      location: (location || 'বড়লেখা, সিলেট').trim().slice(0, 80),
      rating: Math.min(5, Math.max(1, Number(rating) || 5)),
      comment: comment.trim().slice(0, 400),
      orderSummary: (orderSummary || 'Bazar Mate অর্ডার').trim().slice(0, 80),
      createdAt: new Date().toISOString(),
    };
    db.reviews.unshift(review);
    saveDb(db);
    res.status(201).json(review);
  });

  // Auth: Register
  app.post('/api/auth/register', (req, res) => {
    const db = getDb();
    const { name, mobile, email, password } = req.body as {
      name?: string;
      mobile?: string;
      email?: string;
      password?: string;
    };
    if (!name || !mobile || !password) {
      res.status(400).json({ error: 'নাম, মোবাইল নম্বর এবং পাসওয়ার্ড দিন।' });
      return;
    }
    const cleanMobile = mobile.trim();
    const existing = db.users.find(
      (u) => u.mobile === cleanMobile || (email && u.email && u.email.toLowerCase() === email.toLowerCase()),
    );
    if (existing) {
      res.status(409).json({ error: 'এই মোবাইল নম্বর বা ইমেইল দিয়ে আগেই অ্যাকাউন্ট তৈরি করা আছে।' });
      return;
    }
    const newUser = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      mobile: cleanMobile,
      email: email?.trim() || undefined,
      role: 'customer' as const,
      passwordHash: hashPassword(password),
      savedAddresses: [],
      wishlist: [],
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    saveDb(db);
    const token = signToken({ userId: newUser.id, role: newUser.role });
    res.status(201).json({ token, user: sanitizeUser(newUser) });
  });

  // Auth: Login (supports mobile or email)
  app.post('/api/auth/login', (req, res) => {
    const db = getDb();
    const { identifier, password } = req.body as { identifier?: string; password?: string };
    if (!identifier || !password) {
      res.status(400).json({ error: 'মোবাইল নম্বর/ইমেইল এবং পাসওয়ার্ড দিন।' });
      return;
    }
    const idClean = identifier.trim().toLowerCase();
    const user = db.users.find(
      (u) => u.mobile.toLowerCase() === idClean || (u.email && u.email.toLowerCase() === idClean),
    );
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'মোবাইল নম্বর/ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।' });
      return;
    }
    const token = signToken({ userId: user.id, role: user.role });
    res.json({ token, user: sanitizeUser(user) });
  });

  // Auth: Current User
  app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.authUser?.userId);
    if (!user) {
      res.status(404).json({ error: 'ইউজার পাওয়া যায়নি।' });
      return;
    }
    res.json({ user: sanitizeUser(user) });
  });

  // Customer Profile, Addresses, Wishlist
  app.patch('/api/account/profile', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.authUser?.userId);
    if (!user) {
      res.status(404).json({ error: 'ইউজার পাওয়া যায়নি।' });
      return;
    }
    const { name, email, savedAddresses, newAddress } = req.body as {
      name?: string;
      email?: string;
      savedAddresses?: typeof user.savedAddresses;
      newAddress?: {
        label: string;
        area: string;
        deliveryZoneId: string;
        address: string;
        mobile: string;
      };
    };
    if (name) user.name = name.trim();
    if (email !== undefined) user.email = email.trim() || undefined;
    if (Array.isArray(savedAddresses)) user.savedAddresses = savedAddresses;
    if (newAddress && newAddress.address) {
      user.savedAddresses.unshift(
        createSavedAddress(
          newAddress.label || 'ঠিকানা',
          newAddress.area || 'বড়লেখা',
          newAddress.deliveryZoneId || 'zone-barlekha',
          newAddress.address,
          newAddress.mobile || user.mobile,
        ),
      );
    }
    saveDb(db);
    res.json({ user: sanitizeUser(user) });
  });

  app.post('/api/account/wishlist/:productId', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.authUser?.userId);
    if (!user) {
      res.status(404).json({ error: 'ইউজার পাওয়া যায়নি।' });
      return;
    }
    const productId = String(req.params.productId);
    if (user.wishlist.includes(productId)) {
      user.wishlist = user.wishlist.filter((id) => id !== productId);
    } else {
      user.wishlist.push(productId);
    }
    saveDb(db);
    res.json({ wishlist: user.wishlist });
  });

  // Validate Coupon
  app.post('/api/coupons/validate', (req, res) => {
    const db = getDb();
    const { code, subtotal } = req.body as { code?: string; subtotal?: number };
    if (!code) {
      res.status(400).json({ error: 'কুপন কোড লিখুন।' });
      return;
    }
    const coupon = db.coupons.find(
      (c) => c.active && c.code.toUpperCase() === code.trim().toUpperCase(),
    );
    if (!coupon) {
      res.status(404).json({ error: 'দুঃখিত, কুপন কোডটি সঠিক নয় বা মেয়াদ শেষ।' });
      return;
    }
    const sub = Number(subtotal) || 0;
    if (sub < coupon.minOrder) {
      res.status(400).json({
        error: `এই কুপনটি ব্যবহার করতে কমপক্ষে ৳${coupon.minOrder} টাকার অর্ডার করতে হবে।`,
      });
      return;
    }
    const discount =
      coupon.type === 'fixed' ? coupon.value : Math.round((sub * coupon.value) / 100);
    res.json({ coupon, discount: Math.min(sub, discount) });
  });

  // Create Order (Guest or Authenticated - supports catalog items and/or manual custom items)
  app.post('/api/orders', (req: AuthRequest, res) => {
    const db = getDb();
    const {
      customerName,
      customerMobile,
      area,
      deliveryZoneId,
      deliveryAddress,
      orderNote,
      couponCode,
      items,
      customItems,
    } = req.body as {
      customerName?: string;
      customerMobile?: string;
      area?: string;
      deliveryZoneId?: string;
      deliveryAddress?: string;
      orderNote?: string;
      couponCode?: string;
      items?: { productId: string; quantity: number }[];
      customItems?: { name: string; unit?: string; quantity?: number; note?: string }[];
    };

    const validCatalogItems = Array.isArray(items) ? items : [];
    const validCustomItems = Array.isArray(customItems)
      ? customItems.filter((c) => c && typeof c.name === 'string' && c.name.trim().length > 0)
      : [];

    if (
      !customerName ||
      !customerMobile ||
      !deliveryAddress ||
      (validCatalogItems.length === 0 && validCustomItems.length === 0)
    ) {
      res.status(400).json({
        error: 'অনুগ্রহ করে নাম, মোবাইল নম্বর, ঠিকানা এবং অন্তত একটি পণ্য লিখুন বা যোগ করুন।',
      });
      return;
    }

    const zone =
      db.deliveryZones.find((z) => z.id === deliveryZoneId && z.active) || db.deliveryZones[0];
    if (!zone) {
      res.status(400).json({ error: 'ডেলিভারি জোন পাওয়া যায়নি।' });
      return;
    }

    const orderItems: OrderItem[] = [];
    let subtotal = 0;

    for (const reqItem of validCatalogItems) {
      const product = db.products.find((p) => p.id === reqItem.productId && p.active);
      if (!product) {
        res.status(400).json({ error: `পণ্যটি পাওয়া যায়নি (${reqItem.productId})।` });
        return;
      }
      const qty = Math.max(1, Math.floor(Number(reqItem.quantity) || 1));
      if (product.stock < qty) {
        res.status(400).json({ error: `"${product.name}" বর্তমানে ${product.stock}টি স্টকে আছে।` });
        return;
      }
      const supplier = db.suppliers.find((s) => s.id === product.supplierId);
      orderItems.push({
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        image: product.image,
        quantity: qty,
        price: product.price,
        purchasePrice: product.purchasePrice,
        supplierId: product.supplierId,
        supplierName: supplier ? supplier.shopName : 'Bazar Mate Partner',
        collected: false,
        qcPassed: false,
      });
      subtotal += product.price * qty;
      product.stock -= qty;
    }

    const defaultSupplier = db.suppliers[0];
    validCustomItems.forEach((cItem, idx) => {
      const qty = Math.max(1, Math.floor(Number(cItem.quantity) || 1));
      orderItems.push({
        productId: `manual-${Date.now()}-${idx}`,
        productName: cItem.name.trim().slice(0, 140),
        unit: (cItem.unit || '১ পিস / প্রয়োজন অনুযায়ী').trim().slice(0, 60),
        image: '/src/assets/images/cat_grocery_essentials_1794993131782.jpg',
        quantity: qty,
        price: 0,
        purchasePrice: 0,
        supplierId: defaultSupplier?.id || 'sup-1',
        supplierName: 'ম্যানুয়াল সংগ্রহ (স্থানীয় বাজার)',
        collected: false,
        qcPassed: false,
        isCustom: true,
        customNote: cItem.note?.trim().slice(0, 140) || undefined,
      });
    });

    let discount = 0;
    let appliedCoupon: string | undefined;
    if (couponCode) {
      const coupon = db.coupons.find(
        (c) => c.active && c.code.toUpperCase() === couponCode.trim().toUpperCase(),
      );
      if (coupon && subtotal >= coupon.minOrder) {
        discount =
          coupon.type === 'fixed' ? coupon.value : Math.round((subtotal * coupon.value) / 100);
        discount = Math.min(subtotal, discount);
        coupon.usageCount += 1;
        appliedCoupon = coupon.code;
      }
    }

    const now = new Date().toISOString();
    const orderNumber = createOrderNumber(db);
    const totalAmount = Math.max(0, subtotal - discount) + zone.charge;
    const orderType: Order['orderType'] =
      validCatalogItems.length > 0 && validCustomItems.length > 0
        ? 'mixed'
        : validCustomItems.length > 0
          ? 'manual'
          : 'catalog';

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      orderType,
      userId: req.authUser?.userId,
      customerName: customerName.trim(),
      customerMobile: customerMobile.trim(),
      area: (area || zone.name).trim(),
      deliveryZoneId: zone.id,
      deliveryAddress: deliveryAddress.trim(),
      orderNote: (orderNote || '').trim(),
      paymentMethod: 'COD',
      items: orderItems,
      subtotal,
      discount,
      couponCode: appliedCoupon,
      deliveryCharge: zone.charge,
      totalAmount,
      status: 'Pending',
      fulfillment: {
        supplierListGenerated: true,
        collectionCompleted: false,
        qualityCheckPassed: false,
        consolidated: false,
        packed: false,
        deliveryRiderName: '',
        deliveryRiderPhone: '',
        history: [
          {
            status: 'Pending',
            timestamp: now,
            note:
              orderType === 'manual'
                ? 'ম্যানুয়াল বাজার তালিকা (ফর্দ) অর্ডার গ্রহণ করা হয়েছে — মূল্য যাচাইয়ের অপেক্ষায়'
                : 'অনলাইনে অর্ডার গ্রহণ করা হয়েছে (Cash on Delivery)',
          },
        ],
      },
      createdAt: now,
      updatedAt: now,
    };

    // Save address automatically for logged-in user if they don't have it yet
    if (req.authUser?.userId) {
      const user = db.users.find((u) => u.id === req.authUser?.userId);
      if (user && !user.savedAddresses.some((a) => a.address === newOrder.deliveryAddress)) {
        user.savedAddresses.unshift(
          createSavedAddress(
            area || zone.name,
            newOrder.area,
            zone.id,
            newOrder.deliveryAddress,
            newOrder.customerMobile,
          ),
        );
      }
    }

    db.orders.unshift(newOrder);
    saveDb(db);
    res.status(201).json(newOrder);
  });

  // Customer Orders (My Orders)
  app.get('/api/orders/my', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.authUser?.userId);
    const myOrders = db.orders.filter(
      (o) => o.userId === req.authUser?.userId || (user && o.customerMobile === user.mobile),
    );
    res.json(myOrders);
  });

  // Public Order Tracking (Order Number + Mobile or Order Number alone for quick demo lookup)
  app.get('/api/orders/track', (req, res) => {
    const db = getDb();
    const orderNumber = String(req.query.orderNumber || '').trim().toUpperCase();
    const mobile = String(req.query.mobile || '').trim();
    if (!orderNumber) {
      res.status(400).json({ error: 'অর্ডার নম্বর দিন (যেমন: BM-1001)।' });
      return;
    }
    const order = db.orders.find(
      (o) =>
        o.orderNumber.toUpperCase() === orderNumber &&
        (!mobile || o.customerMobile === mobile),
    );
    if (!order) {
      res.status(404).json({ error: 'এই নম্বর ও মোবাইলে কোনো অর্ডার পাওয়া যায়নি।' });
      return;
    }
    res.json(order);
  });

  // ================= SELLER PRODUCT LISTINGS API =================
  app.post('/api/seller-listings', (req: AuthRequest, res) => {
    const db = getDb();
    const body = req.body as Partial<SellerListing>;
    if (
      !body.sellerName?.trim() ||
      !body.sellerMobile?.trim() ||
      !body.productName?.trim() ||
      !body.categoryId ||
      !body.unit?.trim() ||
      !body.askingPrice ||
      Number(body.askingPrice) <= 0
    ) {
      res.status(400).json({
        error: 'বিক্রেতার নাম, মোবাইল নম্বর, পণ্যের নাম, ক্যাটাগরি, পরিমাণ/ইউনিট এবং সঠিক দাম দিন।',
      });
      return;
    }

    const cat = db.categories.find((c) => c.id === body.categoryId) || db.categories[0];
    const now = new Date().toISOString();
    const askingPrice = Math.max(1, Math.round(Number(body.askingPrice)));
    const suggestedSellingPrice = body.suggestedSellingPrice
      ? Math.max(askingPrice, Math.round(Number(body.suggestedSellingPrice)))
      : askingPrice;

    const listing: SellerListing = {
      id: `sell-${Date.now()}`,
      userId: req.authUser?.userId,
      sellerName: body.sellerName.trim().slice(0, 80),
      shopName: (body.shopName || body.sellerName).trim().slice(0, 100),
      sellerMobile: body.sellerMobile.trim().slice(0, 20),
      marketArea: (body.marketArea || 'বড়লেখা, সিলেট').trim().slice(0, 100),
      productName: body.productName.trim().slice(0, 120),
      categoryId: cat?.id || 'cat-grocery',
      subCategory: (body.subCategory || cat?.subCategories[0] || 'অন্যান্য').trim(),
      brand: (body.brand || 'স্থানীয় বিক্রেতা').trim().slice(0, 60),
      unit: body.unit.trim().slice(0, 40),
      askingPrice,
      suggestedSellingPrice,
      stock: Math.max(1, Math.round(Number(body.stock) || 10)),
      description: (
        body.description || 'স্থানীয় বিক্রেতার মাধ্যমে Bazar Mate-এ সরাসরি যুক্ত পণ্য।'
      )
        .trim()
        .slice(0, 500),
      image:
        (body.image && body.image.trim()) ||
        cat?.image ||
        '/src/assets/images/cat_grocery_essentials_1794993131782.jpg',
      status: 'Pending',
      createdAt: now,
      updatedAt: now,
    };

    db.sellerListings.unshift(listing);
    saveDb(db);
    res.status(201).json(listing);
  });

  app.get('/api/seller-listings/my', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.authUser?.userId);
    const mine = db.sellerListings.filter(
      (s) => s.userId === req.authUser?.userId || (user && s.sellerMobile === user.mobile),
    );
    res.json(mine);
  });

  app.get('/api/seller-listings/lookup', (req, res) => {
    const db = getDb();
    const mobile = String(req.query.mobile || '').trim();
    if (!mobile) {
      res.status(400).json({ error: 'মোবাইল নম্বর দিন।' });
      return;
    }
    const matches = db.sellerListings.filter((s) => s.sellerMobile === mobile);
    res.json(matches);
  });

  // ================= ADMIN API ROUTES =================
  app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
    const db = getDb();
    const activeOrders = db.orders.filter((o) => o.status !== 'Cancelled');
    const totalSales = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingOrders = db.orders.filter(
      (o) => !['Delivered', 'Cancelled'].includes(o.status),
    ).length;
    const deliveredOrders = db.orders.filter((o) => o.status === 'Delivered').length;
    const totalCustomers = db.users.filter((u) => u.role === 'customer').length;
    const lowStockProducts = db.products.filter((p) => p.stock <= 10);

    let totalPurchaseCost = 0;
    for (const o of activeOrders) {
      for (const item of o.items) {
        totalPurchaseCost += (item.purchasePrice || 0) * item.quantity;
      }
    }
    const subtotalSum = activeOrders.reduce((s, o) => s + o.subtotal - o.discount, 0);

    res.json({
      stats: {
        totalOrders: db.orders.length,
        totalSales,
        pendingOrders,
        deliveredOrders,
        totalCustomers,
        totalProducts: db.products.length,
        lowStockProducts,
        estimatedProfit: Math.max(0, subtotalSum - totalPurchaseCost),
      },
      categories: db.categories,
      products: db.products,
      suppliers: db.suppliers,
      orders: db.orders,
      deliveryZones: db.deliveryZones,
      coupons: db.coupons,
      banner: db.banner,
      customers: db.users.filter((u) => u.role === 'customer').map(sanitizeUser),
      sellerListings: db.sellerListings,
    });
  });

  // Admin: Products CRUD
  app.post('/api/admin/products', requireAdmin, (req, res) => {
    const db = getDb();
    const body = req.body as Partial<Product>;
    if (!body.name || !body.categoryId || body.price === undefined) {
      res.status(400).json({ error: 'পণ্যের নাম, ক্যাটাগরি এবং বিক্রয় মূল্য আবশ্যক।' });
      return;
    }
    const cat = db.categories.find((c) => c.id === body.categoryId);
    const product: Product = {
      id: `prod-${Date.now()}`,
      name: body.name.trim(),
      nameEn: (body.nameEn || body.name).trim(),
      categoryId: body.categoryId,
      subCategory: body.subCategory || cat?.subCategories[0] || 'অন্যান্য',
      brand: (body.brand || 'Bazar Mate').trim(),
      unit: (body.unit || '১ পিস').trim(),
      price: Number(body.price) || 0,
      compareAtPrice: body.compareAtPrice ? Number(body.compareAtPrice) : undefined,
      purchasePrice: Number(body.purchasePrice) || 0,
      stock: Number(body.stock) || 0,
      supplierId: body.supplierId || db.suppliers[0]?.id || 'sup-1',
      image: body.image || cat?.image || '/src/assets/images/cat_grocery_essentials_1794993131782.jpg',
      description: (body.description || 'স্থানীয় বাজার থেকে যাচাইকৃত মানসম্মত পণ্য।').trim(),
      featured: Boolean(body.featured),
      bestSeller: Boolean(body.bestSeller),
      isLocalSpecial: Boolean(body.isLocalSpecial),
      active: body.active !== undefined ? Boolean(body.active) : true,
      createdAt: new Date().toISOString(),
    };
    db.products.unshift(product);
    saveDb(db);
    res.status(201).json(product);
  });

  app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
    const db = getDb();
    const idx = db.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'পণ্য পাওয়া যায়নি।' });
      return;
    }
    db.products[idx] = { ...db.products[idx], ...req.body, id: db.products[idx].id };
    saveDb(db);
    res.json(db.products[idx]);
  });

  app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    const db = getDb();
    db.products = db.products.filter((p) => p.id !== req.params.id);
    saveDb(db);
    res.json({ ok: true });
  });

  // Admin: Categories CRUD
  app.post('/api/admin/categories', requireAdmin, (req, res) => {
    const db = getDb();
    const body = req.body as Partial<Category>;
    if (!body.name) {
      res.status(400).json({ error: 'ক্যাটাগরির নাম দিন।' });
      return;
    }
    const category: Category = {
      id: `cat-${Date.now()}`,
      name: body.name.trim(),
      nameBn: (body.nameBn || body.name).trim(),
      description: (body.description || '').trim(),
      image: body.image || '/src/assets/images/cat_grocery_essentials_1794993131782.jpg',
      subCategories: Array.isArray(body.subCategories) ? body.subCategories : [],
      sortOrder: body.sortOrder || db.categories.length + 1,
    };
    db.categories.push(category);
    saveDb(db);
    res.status(201).json(category);
  });

  app.put('/api/admin/categories/:id', requireAdmin, (req, res) => {
    const db = getDb();
    const idx = db.categories.findIndex((c) => c.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ক্যাটাগরি পাওয়া যায়নি।' });
      return;
    }
    db.categories[idx] = { ...db.categories[idx], ...req.body, id: db.categories[idx].id };
    saveDb(db);
    res.json(db.categories[idx]);
  });

  app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
    const db = getDb();
    db.categories = db.categories.filter((c) => c.id !== req.params.id);
    saveDb(db);
    res.json({ ok: true });
  });

  // Admin: Suppliers CRUD
  app.post('/api/admin/suppliers', requireAdmin, (req, res) => {
    const db = getDb();
    const body = req.body as Partial<Supplier>;
    if (!body.name || !body.shopName || !body.mobile) {
      res.status(400).json({ error: 'সাপ্লায়ারের নাম, দোকানের নাম এবং মোবাইল নম্বর দিন।' });
      return;
    }
    const supplier: Supplier = {
      id: `sup-${Date.now()}`,
      name: body.name.trim(),
      shopName: body.shopName.trim(),
      mobile: body.mobile.trim(),
      address: (body.address || 'বড়লেখা, সিলেট').trim(),
      marketArea: (body.marketArea || 'বড়লেখা বাজার').trim(),
      notes: (body.notes || '').trim(),
      active: body.active !== undefined ? Boolean(body.active) : true,
      createdAt: new Date().toISOString(),
    };
    db.suppliers.unshift(supplier);
    saveDb(db);
    res.status(201).json(supplier);
  });

  app.put('/api/admin/suppliers/:id', requireAdmin, (req, res) => {
    const db = getDb();
    const idx = db.suppliers.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'সাপ্লায়ার পাওয়া যায়নি।' });
      return;
    }
    db.suppliers[idx] = { ...db.suppliers[idx], ...req.body, id: db.suppliers[idx].id };
    saveDb(db);
    res.json(db.suppliers[idx]);
  });

  app.delete('/api/admin/suppliers/:id', requireAdmin, (req, res) => {
    const db = getDb();
    db.suppliers = db.suppliers.filter((s) => s.id !== req.params.id);
    saveDb(db);
    res.json({ ok: true });
  });

  // Admin: Order Status & 9-Stage Fulfillment Update
  app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
    const db = getDb();
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি।' });
      return;
    }
    const { status, note, items, fulfillment } = req.body as {
      status?: OrderStatus;
      note?: string;
      items?: OrderItem[];
      fulfillment?: Partial<Order['fulfillment']>;
    };
    const now = new Date().toISOString();
    if (Array.isArray(items)) {
      order.items = items;
      order.subtotal = items.reduce(
        (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
        0,
      );
      order.totalAmount =
        Math.max(0, order.subtotal - (order.discount || 0)) + order.deliveryCharge;
    }
    if (fulfillment) {
      order.fulfillment = {
        ...order.fulfillment,
        ...fulfillment,
        history: order.fulfillment.history,
      };
    }
    if (status && status !== order.status) {
      order.status = status;
      order.fulfillment.history.push({
        status,
        timestamp: now,
        note: note || `অর্ডার স্ট্যাটাস পরিবর্তন: ${status}`,
      });
    }
    order.updatedAt = now;
    saveDb(db);
    res.json(order);
  });

  // Admin: Delivery Zones & Banner Settings
  app.put('/api/admin/delivery-zones', requireAdmin, (req, res) => {
    const db = getDb();
    const zones = req.body as DeliveryZone[];
    if (!Array.isArray(zones)) {
      res.status(400).json({ error: 'সঠিক ডেলিভারি জোন তালিকা দিন।' });
      return;
    }
    db.deliveryZones = zones;
    saveDb(db);
    res.json(db.deliveryZones);
  });

  app.put('/api/admin/banner', requireAdmin, (req, res) => {
    const db = getDb();
    db.banner = { ...db.banner, ...(req.body as Partial<BannerSettings>) };
    saveDb(db);
    res.json(db.banner);
  });

  // Admin: Coupons
  app.post('/api/admin/coupons', requireAdmin, (req, res) => {
    const db = getDb();
    const body = req.body as Partial<Coupon>;
    if (!body.code || !body.value) {
      res.status(400).json({ error: 'কুপন কোড এবং ডিসকাউন্টের পরিমাণ দিন।' });
      return;
    }
    const coupon: Coupon = {
      id: `cpn-${Date.now()}`,
      code: body.code.trim().toUpperCase(),
      type: body.type === 'percent' ? 'percent' : 'fixed',
      value: Number(body.value),
      minOrder: Number(body.minOrder) || 0,
      active: body.active !== undefined ? Boolean(body.active) : true,
      usageCount: 0,
    };
    db.coupons.unshift(coupon);
    saveDb(db);
    res.status(201).json(coupon);
  });

  app.patch('/api/admin/coupons/:id', requireAdmin, (req, res) => {
    const db = getDb();
    const c = db.coupons.find((x) => x.id === req.params.id);
    if (!c) {
      res.status(404).json({ error: 'কুপন পাওয়া যায়নি।' });
      return;
    }
    Object.assign(c, req.body);
    saveDb(db);
    res.json(c);
  });

  app.delete('/api/admin/coupons/:id', requireAdmin, (req, res) => {
    const db = getDb();
    db.coupons = db.coupons.filter((c) => c.id !== req.params.id);
    saveDb(db);
    res.json({ ok: true });
  });

  // Admin: Review & Publish Seller Product Listings
  app.patch('/api/admin/seller-listings/:id', requireAdmin, (req, res) => {
    const db = getDb();
    const listing = db.sellerListings.find((s) => s.id === req.params.id);
    if (!listing) {
      res.status(404).json({ error: 'বিক্রেতার পণ্যের আবেদন পাওয়া যায়নি।' });
      return;
    }
    const {
      status,
      sellingPrice,
      purchasePrice,
      stock,
      categoryId,
      subCategory,
      adminNote,
    } = req.body as {
      status?: SellerListingStatus;
      sellingPrice?: number;
      purchasePrice?: number;
      stock?: number;
      categoryId?: string;
      subCategory?: string;
      adminNote?: string;
    };

    if (categoryId) listing.categoryId = categoryId;
    if (subCategory) listing.subCategory = subCategory;
    if (purchasePrice !== undefined) listing.askingPrice = Math.max(1, Number(purchasePrice));
    if (sellingPrice !== undefined) listing.suggestedSellingPrice = Math.max(1, Number(sellingPrice));
    if (stock !== undefined) listing.stock = Math.max(0, Number(stock));
    if (adminNote !== undefined) listing.adminNote = adminNote.trim();
    if (status) listing.status = status;
    listing.updatedAt = new Date().toISOString();

    let publishedProduct: Product | undefined;

    if (listing.status === 'Approved') {
      // Ensure a supplier record exists for this seller
      let supplier = db.suppliers.find((sup) => sup.mobile === listing.sellerMobile);
      if (!supplier) {
        supplier = {
          id: `sup-${Date.now()}`,
          name: listing.sellerName,
          shopName: listing.shopName || listing.sellerName,
          mobile: listing.sellerMobile,
          address: listing.marketArea || 'বড়লেখা, সিলেট',
          marketArea: listing.marketArea || 'বড়লেখা',
          notes: 'স্ব-নিবন্ধিত স্থানীয় বিক্রেতা',
          active: true,
          createdAt: listing.updatedAt,
        };
        db.suppliers.unshift(supplier);
      }

      if (listing.publishedProductId) {
        const existingIdx = db.products.findIndex((p) => p.id === listing.publishedProductId);
        if (existingIdx !== -1) {
          db.products[existingIdx] = {
            ...db.products[existingIdx],
            categoryId: listing.categoryId,
            subCategory: listing.subCategory,
            price: listing.suggestedSellingPrice,
            purchasePrice: listing.askingPrice,
            stock: listing.stock,
            active: true,
          };
          publishedProduct = db.products[existingIdx];
        }
      }

      if (!publishedProduct) {
        publishedProduct = {
          id: `prod-${Date.now()}`,
          name: listing.productName,
          nameEn: listing.productName,
          categoryId: listing.categoryId,
          subCategory: listing.subCategory,
          brand: listing.brand || listing.shopName || 'স্থানীয় বিক্রেতা',
          unit: listing.unit,
          price: listing.suggestedSellingPrice,
          purchasePrice: listing.askingPrice,
          stock: listing.stock,
          supplierId: supplier.id,
          image: listing.image,
          description: listing.description,
          featured: true,
          bestSeller: false,
          isLocalSpecial: true,
          active: true,
          createdAt: listing.updatedAt,
        };
        db.products.unshift(publishedProduct);
        listing.publishedProductId = publishedProduct.id;
      }
    }

    saveDb(db);
    res.json({ listing, product: publishedProduct });
  });

  app.delete('/api/admin/seller-listings/:id', requireAdmin, (req, res) => {
    const db = getDb();
    db.sellerListings = db.sellerListings.filter((s) => s.id !== req.params.id);
    saveDb(db);
    res.json({ ok: true });
  });

  // Vite / Static Frontend Serving
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bazar Mate server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Bazar Mate server:', err);
  process.exit(1);
});
