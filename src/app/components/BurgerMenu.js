'use client';

import { useState, useEffect } from 'react';
import { Menu, X, Star, TrendingUp } from 'lucide-react';

export default function BurgerMenu({ onReset }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleNewSearch = () => {
    onReset();
    setIsMenuOpen(false);
  };

  // Close menu when scrolling
  useEffect(() => {
    const handleScroll = () => {
      setIsMenuOpen(false);
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <>
      {/* Burger Menu Button - Only visible on mobile */}
      <div className="medd:hidden">
        <button
          onClick={toggleMenu}
          className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <X className="w-7 h-7" />
          ) : (
            <Menu className="w-7 h-7" />
          )}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMenuOpen && (
        <div className="xs:block hidden border-t bg-white absolute top-full left-0 right-0">
          <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
            <div className="flex items-center gap-2 py-2 border-b">
              <Star className="w-5 h-5 fill-orange-400 text-orange-400" />
              <span className="text-gray-700 font-medium">Top Rated Products</span>
            </div>
            <div className="flex items-center gap-2 py-2 border-b">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <span className="text-gray-700 font-medium">Best Sellers</span>
            </div>
            <button
              onClick={handleNewSearch}
              className="w-full py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              New Search
            </button>
          </div>
        </div>
      )}
    </>
  );
}