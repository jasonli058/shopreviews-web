'use client';

import { useState, useEffect } from 'react';
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';

export default function FilterPanel({ filters, onFilterChange, onApplyFilters }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    price: false,
    rating: false,
    reviews: false,
    results: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleReset = () => {
    onFilterChange({
      priceMin: 0,
      priceMax: 1000,
      minRating: 4.0,
      minReviews: 50,
      maxResults: 5
    });
  };

  const hasActiveFilters = 
    filters.priceMin !== 0 || 
    filters.priceMax !== 1000 || 
    filters.minRating !== 4.0 || 
    filters.minReviews !== 50 || 
    filters.maxResults !== 5;

  return (
    <div className="relative">
      
      {/* filter button  */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-400 border-2 border-gray-300 rounded-lg hover:border-orange-500 transition-colors hover:cursor-pointer"
      >
        <SlidersHorizontal className="w-5 h-5" />
        <span className="font-medium text-gray-400 "> Filters </span>
        {hasActiveFilters && (
          <span className="ml-1 px-2 py-0.5 text-xs bg-orange-500 text-white rounded-full">
            Active
          </span>
        )}
      </button>

      {/* filter Panel */}
      {isOpen && (
        <>

          {/* backdrop */}
          <div 
            className="fixed inset-0 bg-white/20 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* filter panel */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border-2 border-gray-300 z-50 overflow-hidden">

            {/* header of the panel */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-orange-50 to-blue-50">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-gray-900"> Filters </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* filter content */}
            <div className="max-h-[70vh] overflow-y-auto">

              {/* price range */}
              <div className="border-b border-gray-300">
                <button
                  onClick={() => toggleSection('price')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900"> $ Price Range </span>
                  {expandedSections.price ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                
                {expandedSections.price && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-gray-600 mb-1 block">Min Price</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"> $ </span>
                          <input
                            type="number"
                            value={filters.priceMin}
                            onChange={(e) => onFilterChange({ ...filters, priceMin: Number(e.target.value) })}
                            onClick={(e) => e.target.select()}
                            onBlur={(e) => {
                              if (e.target.value === '' || Number(e.target.value) < 0) {
                                onFilterChange({ ...filters, priceMin: 0 });
                              }
                            }}
                            className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-400 focus:outline-none"
                            min="0"
                          />
                        </div>
                      </div>
                      <span className="text-gray-400 mt-5">—</span>
                      <div className="flex-1">
                        <label className="text-xs text-gray-600 mb-1 block">Max Price</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                          <input
                            type="number"
                            value={filters.priceMax}
                            onChange={(e) => onFilterChange({ ...filters, priceMax: Number(e.target.value) })}
                            onClick={(e) => e.target.select()}
                            onBlur={(e) => {
                              if (e.target.value === '' || Number(e.target.value) < 0) {
                                onFilterChange({ ...filters, priceMax: 1000 });
                              }
                            }}
                            className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-400 focus:outline-none"
                            min="0"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      ${filters.priceMin} - ${filters.priceMax}
                    </div>
                  </div>
                )}
              </div>

              {/* rating filter */}
              <div className="border-b border-gray-300">
                <button
                  onClick={() => toggleSection('rating')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900">★ Minimum Rating</span>
                  {expandedSections.rating ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                
                {expandedSections.rating && (
                  <div className="px-4 pb-4 space-y-3">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.1"
                      value={filters.minRating}
                      onChange={(e) => onFilterChange({ ...filters, minRating: Number(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-orange-600">
                        {filters.minRating.toFixed(1)} ★
                      </span>
                      <span className="text-sm text-gray-600">and above</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-xs text-gray-500">
                      {[1, 2, 3, 4, 5].map(num => (
                        <button
                          key={num}
                          onClick={() => onFilterChange({ ...filters, minRating: num })}
                          className={`py-1 rounded ${filters.minRating === num ? 'bg-orange-100 text-orange-700 font-semibold' : 'hover:bg-gray-100'}`}
                        >
                          {num}★
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* reviews filter */}
              <div className="border-b border-gray-300">
                <button
                  onClick={() => toggleSection('reviews')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900">✎﹏ Minimum Reviews</span>
                  {expandedSections.reviews ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                
                {expandedSections.reviews && (
                  <div className="px-4 pb-4 space-y-3">
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="50"
                      value={filters.minReviews}
                      onChange={(e) => onFilterChange({ ...filters, minReviews: Number(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-orange-600">
                        {filters.minReviews.toLocaleString()}+
                      </span>
                      <span className="text-sm text-gray-600">reviews</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
                      {[0, 50, 100, 300, 500, 1000].map(num => (
                        <button
                          key={num}
                          onClick={() => onFilterChange({ ...filters, minReviews: num })}
                          className={`py-1.5 rounded ${filters.minReviews === num ? 'bg-orange-100 text-orange-700 font-semibold' : 'bg-gray-50 hover:bg-gray-100'}`}
                        >
                          {num === 0 ? 'Any' : `${num}+`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* number of results fitler */}
              <div>
                <button
                  onClick={() => toggleSection('results')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                    <span className="font-semibold text-gray-900">
                        <span className='text-xl'>⌯⌲ </span>
                        Results to Show
                    </span>
                  {expandedSections.results ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                
                {expandedSections.results && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="flex items-center justify-center">
                      <span className="text-4xl font-bold text-orange-600">
                        {filters.maxResults}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-gray-400">
                      {[3, 5, 8, 10, 15].map(num => (
                        <button
                          key={num}
                          onClick={() => onFilterChange({ ...filters, maxResults: num })}
                          className={`py-2 rounded-lg font-semibold transition-all ${
                            filters.maxResults === num 
                              ? 'bg-orange-500 text-white shadow-lg scale-105' 
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      Top {filters.maxResults} products will be displayed
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* footer Actions */}
            <div className="p-4 border-t bg-gray-50 flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold text-gray-400 hover:bg-gray-100 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => {
                  onApplyFilters();
                  setIsOpen(false);
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg"
              >
                Apply Filters
              </button>
            </div>
          </div>
          
        </>
      )}
    </div>
  );
}