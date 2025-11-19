import { Package } from 'lucide-react';

//state when the website is ready for input
export default function EmptyState() {
  return (
    <div className="text-center py-20">
      <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
      <h3 className="text-2xl font-semibold text-gray-900 mb-2">
        Ready to find your perfect product?
      </h3>
      <p className="text-gray-600 max-w-md mx-auto">
        Describe what you're looking for, and we'll find the best-rated products on Amazon with verified reviews.
      </p>
    </div>
  );
}