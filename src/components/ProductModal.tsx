import { useState } from 'react';
import { Check, Heart, Minus, Plus, ShieldCheck, ShoppingBag, X } from 'lucide-react';
import type { Category, Product } from '../types/marketplace';
import { ResilientImage } from './ResilientImage';

interface ProductModalProps {
  product: Product | null;
  category?: Category;
  relatedProducts: Product[];
  isWishlisted: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow: (product: Product, quantity: number) => void;
  onToggleWishlist: (productId: string) => void;
}

export function ProductModal({
  product,
  category,
  relatedProducts,
  isWishlisted,
  onClose,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
}: ProductModalProps) {
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const maxQty = Math.max(1, product.stock);
  const outOfStock = product.stock <= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      <div className="relative w-full max-w-4xl bg-white sm:rounded-2xl border border-[#E5E4DF] shadow-2xl max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="বন্ধ করুন"
          className="sticky top-3 float-right mr-3 mt-3 z-10 w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-[#E5E4DF] text-[#18181B] hover:bg-[#F3F2EE]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 sm:p-8 clear-both">
          {/* Sticky Gallery Left */}
          <div className="space-y-3">
            <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-[#F3F2EE] border border-[#E5E4DF]">
              <ResilientImage
                src={product.image}
                alt={product.name}
                fallbackLabel={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-[#52525B] pt-1">
              <ShieldCheck className="w-4 h-4 text-[#0F6B46] shrink-0" />
              <span>Bazar Mate দ্বারা মান যাচাইকৃত ও নিরাপদ প্যাকিং গ্যারান্টি</span>
            </div>
          </div>

          {/* Contiguous Purchase Module Right */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-xs text-[#52525B]">
              <span>{category?.nameBn || product.categoryId}</span>
              <span aria-hidden="true">/</span>
              <span>{product.subCategory}</span>
              <span aria-hidden="true">·</span>
              <span>ব্র্যান্ড: {product.brand}</span>
            </div>

            <h2 className="mt-2 text-2xl font-bold text-[#18181B] leading-snug">
              {product.name}
            </h2>
            <p className="mt-1 text-sm text-[#52525B]">
              পরিমাণ / ওজন: <span className="font-medium text-[#18181B]">{product.unit}</span>
            </p>

            <div className="mt-4 flex items-baseline gap-3 tabular-nums">
              <span className="text-3xl font-bold text-[#0F6B46]">
                ৳{product.price.toLocaleString('en-US')}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-base text-[#71717A] line-through">
                  ৳{product.compareAtPrice.toLocaleString('en-US')}
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center gap-2 text-sm">
              {outOfStock ? (
                <span className="text-[#DC2626] font-medium">বর্তমানে স্টক শেষ</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[#0F6B46] font-medium">
                  <Check className="w-4 h-4" />
                  <span>স্টকে আছে ({product.stock}টি)</span>
                </span>
              )}
            </div>

            <p className="mt-4 text-sm text-[#3F3F46] leading-relaxed border-t border-[#F0EFEA] pt-4">
              {product.description}
            </p>

            {/* Quantity & Actions */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-[#18181B]">পরিমাণ:</span>
                <div className="inline-flex items-center border border-[#E5E4DF] rounded-lg bg-[#FAF9F6]">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center text-[#18181B] hover:bg-[#EFECE6] rounded-l-lg"
                    aria-label="পরিমাণ কমান"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-semibold tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    className="w-10 h-10 flex items-center justify-center text-[#18181B] hover:bg-[#EFECE6] rounded-r-lg"
                    aria-label="পরিমাণ বাড়ান"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={() => {
                    onAddToCart(product, quantity);
                    onClose();
                  }}
                  className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-lg border border-[#0F6B46] text-[#0F6B46] hover:bg-[#0F6B46]/5 disabled:opacity-50 min-h-[44px] whitespace-nowrap"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>কার্টে যোগ করুন</span>
                </button>
                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={() => {
                    onBuyNow(product, quantity);
                    onClose();
                  }}
                  className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235] disabled:opacity-50 min-h-[44px] whitespace-nowrap"
                >
                  <span>এখনই কিনুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleWishlist(product.id)}
                  aria-label="উইশলিস্ট"
                  className={`w-11 h-11 flex items-center justify-center rounded-lg border border-[#E5E4DF] ${
                    isWishlisted ? 'text-[#DC2626] bg-[#FEF2F2]' : 'text-[#52525B] hover:bg-[#F3F2EE]'
                  }`}
                >
                  <Heart className="w-4 h-4" fill={isWishlisted ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="border-t border-[#E5E4DF] bg-[#FAF9F6] px-5 sm:px-8 py-6">
            <h3 className="text-base font-semibold text-[#18181B] mb-4">সম্পর্কিত পণ্য</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {relatedProducts.map((rel) => (
                <button
                  key={rel.id}
                  type="button"
                  onClick={() => {
                    setQuantity(1);
                    onSelectProduct(rel);
                  }}
                  className="text-left bg-white border border-[#E5E4DF] rounded-lg p-3 hover:border-[#0F6B46] transition-colors"
                >
                  <div className="aspect-[4/3] rounded-md overflow-hidden bg-[#F3F2EE] mb-2">
                    <ResilientImage
                      src={rel.image}
                      alt={rel.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-xs font-medium text-[#18181B] line-clamp-1">{rel.name}</div>
                  <div className="text-sm font-bold text-[#0F6B46] tabular-nums mt-0.5">
                    ৳{rel.price.toLocaleString('en-US')}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
