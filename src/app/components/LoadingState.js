import { Loader2 } from 'lucide-react';

//loading animation plays when user submits input
export default function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="w-16 h-16 text-orange-500 animate-spin mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Finding the best products for you...
      </h3>
      <p className="text-gray-600">
        Analyzing thousands of products and reviews
      </p>
      <div className="flex gap-2 mt-6">
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
}