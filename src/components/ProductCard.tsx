import { Heart, Plus } from 'lucide-react';
import type { Category, Product } from '../types/marketplace';
import { ResilientImage } from './ResilientImage';

interface ProductCardProps {
  product: Product;
  category?: Category;
  isWishlisted: boolean;
  onSelect: (product: Product) => void;
  onAddToCart: (product: Product, quantity?: number) => void;
  onToggleWishlist: (productId: string) => void;
}

export function ProductCard({
  product,
  category,
  isWishlisted,
  onSelect,
  onAddToCart,
  onToggleWishlist,
}: ProductCardProps) {
  const outOfStock = product.stock <= 0;

  return (
    <article className="group flex flex-col bg-white border border-[#E5E4DF] rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* 4:3 Uniform Media Surface (65-75% of visual weight) */}
      <div className="relative aspect-[4/3] w-full bg-[#F3F2EE] overflow-hidden">
        <button
          type="button"
          onClick={() => onSelect(product)}
          className="block w-full h-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6B46]"
          aria-label={product.name}
        >
          <ResilientImage
            src={product.image}
            alt={product.name}
            fallbackLabel={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </button>

        <button
          type="button"
          onClick={() => onToggleWishlist(product.id)}
          aria-label={isWishlisted ? 'উইশলিস্ট থেকে সরান' : 'উইশলিস্টে যোগ করুন'}
          className={`absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm border border-[#E5E4DF] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6B46] ${
            isWishlisted ? 'text-[#DC2626]' : 'text-[#52525B] hover:text-[#18181B]'
          }`}
        >
          <Heart className="w-4 h-4" fill={isWishlisted ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Clean Metadata & Purchase Action */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <div className="flex items-center gap-1.5 text-xs text-[#52525B] truncate">
          <span className="truncate">{category?.nameBn || product.subCategory}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{product.unit}</span>
          {outOfStock ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#DC2626] font-medium shrink-0">স্টক শেষ</span>
            </>
          ) : product.stock <= 5 ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#D97706] font-medium shrink-0">সীমিত স্টক</span>
            </>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onSelect(product)}
          className="text-left text-[15px] sm:text-base font-semibold text-[#18181B] leading-snug line-clamp-2 hover:text-[#0F6B46] transition-colors"
        >
          {product.name}
        </button>

        <div className="mt-auto pt-3 flex items-center justify-between gap-3 border-t border-[#F0EFEA]">
          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="text-base sm:text-lg font-bold text-[#18181B]">
              ৳{product.price.toLocaleString('en-US')}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-xs text-[#71717A] line-through">
                ৳{product.compareAtPrice.toLocaleString('en-US')}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={outOfStock}
            onClick={() => onAddToCart(product, 1)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#0F6B46] text-white hover:bg-[#0B5235] disabled:bg-[#E5E4DF] disabled:text-[#71717A] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{outOfStock ? 'নেই' : 'কার্টে যোগ'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
