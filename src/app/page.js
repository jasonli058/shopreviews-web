'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import ProductCard from './components/ProductCard';
import LoadingState from './components/LoadingState';
import EmptyState from './components/EmptyState';
import Navbar from './components/Navbar';
import FilterPanel from './components/FilterPanel';
import SortDropdown from './components/SortDropdown';

export default function Home() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]); // store unfiltered results
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState('relevance'); // changed default to relevance
  
  // filter states for the new filter system
  const [filters, setFilters] = useState({
    priceMin: 0,
    priceMax: 1000,
    minRating: 4.0,
    minReviews: 50,
    maxResults: 5
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          filters: {
            minRating: filters.minRating,
            minReviews: filters.minReviews,
            maxResults: filters.maxResults
          }
        })
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      
      // store all products for client-side filtering
      setAllProducts(data.products);
      
      // apply filters
      const filtered = applyClientFilters(data.products, filters);
      setProducts(filtered);
      
      if (data.cached) {
        console.log('✅ Results loaded from cache');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Failed to search. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // apply client-side filters (price filtering happens here)
  const applyClientFilters = (productList, currentFilters) => {
    let filtered = [...productList];

    // price filter
    filtered = filtered.filter(p => 
      p.price >= currentFilters.priceMin && 
      p.price <= currentFilters.priceMax
    );

    // apply sorting
    filtered = applySorting(filtered, sortBy);

    // limit results (FIXED: Now uses filter value!)
    filtered = filtered.slice(0, currentFilters.maxResults);

    return filtered;
  };

  // apply sorting based on current sort option (with relevance as secondary factor)
  const applySorting = (productList, sortOption) => {
    const sorted = [...productList];
    
    switch (sortOption) {
      case 'relevance':
        // Sort by relevance score first, then rating, then reviews
        return sorted.sort((a, b) => {
          if (b.relevanceScore !== a.relevanceScore) {
            return b.relevanceScore - a.relevanceScore;
          }
          if (b.rating !== a.rating) {
            return b.rating - a.rating;
          }
          return b.reviewCount - a.reviewCount;
        });
        
      case 'price-high':
        return sorted.sort((a, b) => {
          if (b.price !== a.price) {
            return b.price - a.price;
          }
          // relevance as tiebreaker
          return b.relevanceScore - a.relevanceScore;
        });
        
      case 'price-low':
        return sorted.sort((a, b) => {
          if (a.price !== b.price) {
            return a.price - b.price;
          }
          // relevance as tiebreaker
          return b.relevanceScore - a.relevanceScore;
        });
        
      case 'rating-high':
        return sorted.sort((a, b) => {
          if (b.rating !== a.rating) {
            return b.rating - a.rating;
          }
          // Relevance as tiebreaker
          return b.relevanceScore - a.relevanceScore;
        });
        
      case 'rating-low':
        return sorted.sort((a, b) => {
          if (a.rating !== b.rating) {
            return a.rating - b.rating;
          }
          // Relevance as tiebreaker
          return b.relevanceScore - a.relevanceScore;
        });
        
      case 'reviews-high':
        return sorted.sort((a, b) => {
          if (b.reviewCount !== a.reviewCount) {
            return b.reviewCount - a.reviewCount;
          }
          // Relevance as tiebreaker
          return b.relevanceScore - a.relevanceScore;
        });
        
      case 'reviews-low':
        return sorted.sort((a, b) => {
          if (a.reviewCount !== b.reviewCount) {
            return a.reviewCount - b.reviewCount;
          }
          // Relevance as tiebreaker
          return b.relevanceScore - a.relevanceScore;
        });
        
      default:
        // Default to relevance
        return sorted.sort((a, b) => {
          if (b.relevanceScore !== a.relevanceScore) {
            return b.relevanceScore - a.relevanceScore;
          }
          if (b.rating !== a.rating) {
            return b.rating - a.rating;
          }
          return b.reviewCount - a.reviewCount;
        });
    }
  };

  // handle sort change
  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    
    // apply filters immediately with the new sort
    if (allProducts.length > 0) {
      let filtered = [...allProducts];
      
      // apply price filter
      filtered = filtered.filter(p => 
        p.price >= filters.priceMin && 
        p.price <= filters.priceMax
      );
      
      // apply sorting with NEW sort value
      filtered = applySorting(filtered, newSort);
      
      // limit results
      filtered = filtered.slice(0, filters.maxResults);
      
      setProducts(filtered);
    }
  };

  // handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // apply filters to existing results
  const handleApplyFilters = () => {
    if (allProducts.length > 0) {
      const filtered = applyClientFilters(allProducts, filters);
      setProducts(filtered);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleReset = () => {
    setQuery('');
    setProducts([]);
    setAllProducts([]);
    setHasSearched(false);
    setSortBy('relevance'); // Reset to relevance
    setFilters({
      priceMin: 0,
      priceMax: 1000,
      minRating: 4.0,
      minReviews: 50,
      maxResults: 5
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      
      {/* navbar */}
      <Navbar onReset={handleReset}/>

      {/* main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* search section */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">
              Find Your Perfect Product
            </h2>
            <p className="text-lg text-gray-600">
              AI-powered search for the highest-rated Amazon products
            </p>
          </div>

          {/* search bar with a filter */}
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 focus-within:border-orange-500 transition-colors">
              <div className="flex items-end gap-3 p-4">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What are you looking for? (e.g., 'durable water bottle for hiking')"
                  className="flex-1 resize-none outline-none text-gray-900 placeholder-gray-400 min-h-[60px] max-h-[200px]"
                  rows="2"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!query.trim() || isLoading}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-300 disabled:to-gray-400 text-white p-3 rounded-xl transition-all duration-200 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Search className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>

            {/* filter button row */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Press Enter to search • AI will find products with your perfect requirements!
              </p>
              <FilterPanel 
                filters={filters}
                onFilterChange={handleFilterChange}
                onApplyFilters={handleApplyFilters}
              />
            </div>

            {/* active filters display */}
            {(filters.priceMin > 0 || filters.priceMax < 1000000 || filters.minRating > 4.0 || filters.minReviews > 50 || filters.maxResults !== 5) && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-gray-600 font-medium">Active filters:</span>
                {filters.priceMin > 0 || filters.priceMax < 1000000 ? (
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                    ${filters.priceMin} - ${filters.priceMax}
                  </span>
                ) : null}
                {filters.minRating > 4.0 && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                    {filters.minRating}★ Min.
                  </span>
                )}
                {filters.minReviews > 50 && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                    {filters.minReviews}+ Reviews.
                  </span>
                )}
                {filters.maxResults !== 5 && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                    Top {filters.maxResults}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* results section */}
        <div className="mt-12">
          {isLoading ? (
            <LoadingState />
          ) : products.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  Top {products.length} Results
                </h3>
                {/* dropdown sort here */}
                <SortDropdown 
                  currentSort={sortBy}
                  onSortChange={handleSortChange}
                />
              </div>
              <div className="space-y-4">
                {products.map((product, index) => (
                  <ProductCard 
                    key={`${product.id}-${index}`} 
                    product={product} 
                    rank={index + 1}
                  />
                ))}
              </div>

              {/* show msg if filters excluded products */}
              {allProducts.length > products.length && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <p className="text-sm text-blue-800">
                    Showing {products.length} of {allProducts.length} products. 
                    <button 
                      onClick={() => {
                        setFilters({
                          priceMin: 0,
                          priceMax: 1000,
                          minRating: 4.0,
                          minReviews: 50,
                          maxResults: allProducts.length
                        });
                        setProducts(allProducts);
                      }}
                      className="ml-2 font-semibold underline hover:text-blue-900"
                    >
                      Clear filters to see all
                    </button>
                  </p>
                </div>
              )}
            </>
          ) : hasSearched ? (
            <div className="text-center py-20">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                No products found
              </h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your filters or search query
              </p>
              <button
                onClick={handleReset}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
              >
                Start New Search
              </button>
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </main>

      {/* footer section */}
      <footer className="border-t mt-20 py-8 bg-white">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-600">
          <p>As an Amazon Associate, we earn from qualifying purchases.</p>
          <p className="mt-2">Prices and availability subject to change.</p>
        </div>
      </footer>
    </div>
  );
}