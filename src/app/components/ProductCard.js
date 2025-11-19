import { Star, ArrowRight } from 'lucide-react';

export default function ProductCard({ product, rank }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 overflow-hidden group">
      <div className="flex flex-col md:flex-row">

        {/* product img */}
        <div className="relative md:w-48 h-48 bg-gray-50 flex-shrink-0">
          <div className="absolute top-3 left-3 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold z-10">
            #{rank}
          </div>
          <img 
            src={product.imageUrl} 
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* product info */}
        <div className="flex-1 p-5">
          <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
            {product.title}
          </h3>
          
          {/* ratings from reviews */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(product.rating) 
                      ? 'fill-yellow-400 text-yellow-400' 
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-gray-700">
              {product.rating}
            </span>
            <span className="text-sm text-gray-500">
              ({product.reviewCount.toLocaleString()} reviews)
            </span>
          </div>

          {/* pricing and link */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-3xl font-bold text-gray-900">
              ${product.price.toFixed(2)}
            </div>

            <a
              href={product.amazonLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200 group/btn"
            >
              View on Amazon
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </a>
          </div>

        </div>
        
      </div>
    </div>
  );
}