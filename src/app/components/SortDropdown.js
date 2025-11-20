'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, TrendingUp, DollarSign, Star, MessageSquare, Target } from 'lucide-react';

export default function SortDropdown({ currentSort, onSortChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const sortOptions = [

    //added a relevance option (deafult)
    { 
      value: 'relevance', 
      label: 'Relevance', 
      icon: Target,
      description: 'Best match for your search'
    },
    { 
      value: 'price-high', 
      label: 'Price (High to Low)', 
      icon: DollarSign,
      description: 'Most expensive first'
    },
    { 
      value: 'price-low', 
      label: 'Price (Low to High)', 
      icon: DollarSign,
      description: 'Cheapest first'
    },
    { 
      value: 'rating-high', 
      label: 'Rating (High to Low)', 
      icon: Star,
      description: 'Best rated first'
    },
    { 
      value: 'rating-low', 
      label: 'Rating (Low to High)', 
      icon: Star,
      description: 'Lowest rated first'
    },
    { 
      value: 'reviews-high', 
      label: 'Reviews (Most to Least)', 
      icon: MessageSquare,
      description: 'Most reviewed first'
    },
    { 
      value: 'reviews-low', 
      label: 'Reviews (Least to Most)', 
      icon: MessageSquare,
      description: 'Least reviewed first'
    }
  ];

  const currentOption = sortOptions.find(opt => opt.value === currentSort) || sortOptions[0];
  const Icon = currentOption.icon;

  // close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (value) => {
    onSortChange(value);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>

      {/* dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg hover:border-orange-500 transition-colors min-w-[280px]"
      >
        <Icon className="w-5 h-5 text-gray-600" />
        <div className="flex-1 text-left">
          <div className="text-sm text-gray-500">Sorted by:</div>
          <div className="font-semibold text-gray-900">{currentOption.label}</div>
        </div>
        <ChevronDown 
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border-2 border-gray-200 z-50 overflow-hidden">
          <div className="p-2">
            {sortOptions.map((option) => {
              const OptionIcon = option.icon;
              const isSelected = option.value === currentSort;
              
              return (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all ${
                    isSelected 
                      ? 'bg-orange-50 border-2 border-orange-500' 
                      : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <OptionIcon 
                    className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                      isSelected ? 'text-orange-600' : 'text-gray-400'
                    }`}
                  />
                  <div className="flex-1 text-left">
                    <div className={`font-semibold ${
                      isSelected ? 'text-orange-900' : 'text-gray-900'
                    }`}>
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {option.description}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}