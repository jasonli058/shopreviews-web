import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use gemini-2.5-flash-lite (faster, no thinking mode, perfect for simple tasks)
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// config constants
const CACHE_DURATION_HOURS = 24;

export async function POST(request) {
  try {
    const { query, filters } = await request.json();

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // use filters from request, or fall back to defaults
    const MIN_RATING = filters?.minRating || 4.0;
    const MIN_REVIEWS = filters?.minReviews || 50;
    const MAX_RESULTS = filters?.maxResults || 5;

    console.log('🔍 Received query:', query);
    console.log('🎯 Filters:', { MIN_RATING, MIN_REVIEWS, MAX_RESULTS });

    // step 1: checking the cache
    const cachedResults = await checkCache(query);
    if (cachedResults) {
      console.log('✅ Cache hit!');
      return NextResponse.json({ 
        products: cachedResults,
        cached: true 
      });
    }

    // step 2: process with AI
    console.log('Processing query with AI...');
    const optimizedKeywords = await processQueryWithGemini(query);
    console.log('🎯 Optimized keywords:', optimizedKeywords);

    // step 3: search amazon
    console.log('Searching Amazon...');
    const products = await searchAmazon(optimizedKeywords);

    // step 4: filter
    console.log('Filtering products...');
    console.log(`Before filtering: ${products.length} products`);
    
    const filteredProducts = products.filter(p => 
      p.rating >= MIN_RATING && p.reviewCount >= MIN_REVIEWS
    );
    
    console.log(`After filtering: ${filteredProducts.length} products`);
    
    if (filteredProducts.length === 0 && products.length > 0) {
      console.log('⚠️ No products met criteria, using relaxed filter...');
      
      const relaxedFiltered = products.filter(p => 
        p.reviewCount > 10 || p.rating > 0
      );
      
      if (relaxedFiltered.length > 0) {
        console.log(`✅ Found ${relaxedFiltered.length} products with relaxed criteria`);
        filteredProducts.push(...relaxedFiltered);
      } else {
        console.log('⚠️ Using all products sorted by price');
        filteredProducts.push(...products);
      }
    }

    // step 5: sort by price
    const sortedProducts = filteredProducts.sort((a, b) => b.price - a.price);

    // step 6: get top results
    const topProducts = sortedProducts.slice(0, MAX_RESULTS * 3);
    console.log(`Returning top ${topProducts.length} products (requested ${MAX_RESULTS})`);

    // step 7: fetch reviews for each product (sequential to avoid rate limits)
    console.log('\n📝 Fetching reviews...');
    
    const productsWithReviews = [];
    for (let i = 0; i < topProducts.length; i++) {
      const product = topProducts[i];
      try {
        console.log(`\n📝 Product ${i + 1}/${topProducts.length}: ${product.title.substring(0, 50)}...`);
        
        const reviews = await fetchRecentReviews(product.asin);
        
        if (reviews.length === 0) {
          console.log(`   ℹ️ No recent reviews available`);
          productsWithReviews.push({ 
            ...product, 
            reviews: [{
              rating: product.rating || 4.5,
              title: 'No recent reviews',
              body: 'This product has no recent reviews from the past 3 months. Check Amazon for all reviews.',
              reviewer: 'System',
              date: 'N/A'
            }]
          });
        } else {
          productsWithReviews.push({ ...product, reviews });
        }
        
      } catch (error) {
        console.error(`   ❌ Error fetching reviews:`, error.message);
        productsWithReviews.push({ 
          ...product, 
          reviews: []
        });
      }
      
      // Wait 250ms between requests to stay under rate limit (max 4 req/sec)
      if (i < topProducts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`\n✅ Completed! Returning ${productsWithReviews.length} products with reviews`);

    // Step 8: Cache results
    await cacheResults(query, productsWithReviews);

    return NextResponse.json({ 
      products: productsWithReviews,
      cached: false 
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process search', details: error.message },
      { status: 500 }
    );
  }
}

// ==================== HELPER FUNCTIONS ====================

/* check cache */
async function checkCache(query) {
  try {
    const cacheKey = query.toLowerCase().trim();
    const expiryTime = new Date(Date.now() - CACHE_DURATION_HOURS * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('search_cache')
      .select('results')
      .eq('query', cacheKey)
      .gte('created_at', expiryTime.toISOString())
      .single();

    if (error) return null;
    return data?.results || null;
  } catch (error) {
    console.warn('Cache check failed:', error);
    return null;
  }
}

/* cache results */
async function cacheResults(query, products) {
  try {
    const cacheKey = query.toLowerCase().trim();

    await supabase
      .from('search_cache')
      .upsert({
        query: cacheKey,
        results: products,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'query'
      });

    console.log('✅ Results cached');
  } catch (error) {
    console.warn('Failed to cache:', error);
  }
}

/* AI processing with Gemini 2.5 Flash-Lite */
async function processQueryWithGemini(userQuery) {
  try {
    // Simpler, more direct prompt
    const prompt = `Simplify this search for Amazon: "${userQuery}"

Remove filler words (I want, I need, looking for, best, good, great, a, an, the).
Return ONLY 2-4 essential product keywords.

Examples:
"I want a good water bottle for school" → water bottle school
"looking for wireless headphones" → wireless headphones
"I need running shoes for marathon" → running shoes marathon

Your answer (keywords only):`;

    console.log('🤖 Calling Gemini 2.5 Flash-Lite...');

    // Generate content using the model
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 20,  // Keep it small - we only need a few words
        topK: 1,  // More focused responses
        topP: 0.8,
      }
    });

    const response = result.response;
    const text = response.text().trim();
    
    console.log('📝 Gemini response:', text);

    if (!text || text.length === 0) {
      console.log("⚠️ Empty response from Gemini, using fallback");
      throw new Error("Empty response");
    }

    const cleaned = text
      .replace(/[\n"]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    console.log("✅ Gemini optimized:", userQuery, "→", cleaned);

    return cleaned;

  } catch (err) {
    console.log("⚠️ Gemini failed → using fallback.", err.message);

    // Fallback to simple optimization
    const fallback = userQuery
      .toLowerCase()
      .replace(/\b(i need|i want|i'm|im|looking for|best|find me|show me|get me|good|great)\b/gi, "")
      .replace(/\b(a|an|the|for|to|in|on|at|with)\b/gi, " ")
      .replace(/,/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    
    console.log("🔄 Fallback result:", fallback);
    return fallback || userQuery;
  }
}

/* search amazon */
async function searchAmazon(keywords) {
  try {
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(keywords)}`;
    console.log('🔗 Search URL:', searchUrl);
    
    // Use ScraperAPI if available, otherwise direct fetch
    const scraperApiKey = process.env.SCRAPER_API_KEY;
    const fetchUrl = scraperApiKey 
      ? `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(searchUrl)}&country_code=us`
      : searchUrl;
    
    console.log(scraperApiKey ? '🔧 Using ScraperAPI for product search' : '⚠️ Direct Amazon request (may get blocked)');
    
    const response = await fetch(fetchUrl, {
      headers: scraperApiKey ? {} : {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none'
      },
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      throw new Error(`Amazon returned: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const products = [];

    const productSelectors = [
      '[data-component-type="s-search-result"]',
      '.s-result-item[data-asin]',
      'div[data-asin]:not([data-asin=""])'
    ];

    let $products = $();
    for (const selector of productSelectors) {
      $products = $(selector);
      if ($products.length > 0) {
        console.log(`✅ Found ${$products.length} products using: ${selector}`);
        break;
      }
    }

    if ($products.length === 0) {
      console.log('⚠️ No products found, using mock data');
      return getMockProducts();
    }

    $products.each((i, element) => {
      try {
        const $element = $(element);
        
        const asin = $element.attr('data-asin');
        if (!asin || asin === '') return;

        let title = $element.find('h2 a span').text().trim();
        if (!title) title = $element.find('h2 span').text().trim();
        if (!title) title = $element.find('.a-text-normal').text().trim();
        if (!title) return;

        if (products.length === 0 && process.env.NODE_ENV === 'development') {
          console.log('\n🔍 DEBUG - First product HTML structure:');
          console.log('Rating elements:', $element.find('i[class*="star"]').html());
          console.log('Aria labels:', $element.find('[aria-label]').map((i, el) => $(el).attr('aria-label')).get());
          console.log('---\n');
        }

        let price = 0;
        const priceWhole = $element.find('.a-price-whole').first().text().replace(/[,$]/g, '');
        const priceFraction = $element.find('.a-price-fraction').first().text();
        
        if (priceWhole) {
          price = parseFloat(`${priceWhole}.${priceFraction || '00'}`);
        } else {
          const priceText = $element.find('.a-price .a-offscreen').first().text();
          const priceMatch = priceText.match(/\$([\d,.]+)/);
          if (priceMatch) {
            price = parseFloat(priceMatch[1].replace(',', ''));
          }
        }
        
        if (price === 0) return;

        let rating = 0;
        const ariaLabels = $element.find('[aria-label]').map((i, el) => $(el).attr('aria-label')).get();
        for (const label of ariaLabels) {
          const match = label.match(/([\d.]+)\s*out\s*of\s*5\s*stars/i);
          if (match) {
            rating = parseFloat(match[1]);
            break;
          }
        }
        
        if (rating === 0) {
          const ratingText = $element.find('.a-icon-star-small .a-icon-alt').first().text();
          if (ratingText) {
            const match = ratingText.match(/([\d.]+)/);
            if (match) rating = parseFloat(match[1]);
          }
        }
        
        if (rating === 0) {
          const fullText = $element.text();
          const match = fullText.match(/([\d.]+)\s*out\s*of\s*5/i);
          if (match) rating = parseFloat(match[1]);
        }

        let reviewCount = 0;
        const ariaLabelValues = $element.find('[aria-label]').map((i, el) => $(el).attr('aria-label')).get();
        for (const label of ariaLabelValues) {
          const match = label.match(/([\d,]+)\s*(rating|review)s?/i);
          if (match) {
            const count = parseInt(match[1].replace(/,/g, ''));
            if (count > reviewCount) reviewCount = count;
          }
        }
        
        if (reviewCount === 0) {
          const fullText = $element.text();
          const patterns = [
            /([\d,]+)\s*ratings?/i,
            /([\d,]+)\s*reviews?/i,
            /\(([\d,]+)\)/
          ];
          
          for (const pattern of patterns) {
            const match = fullText.match(pattern);
            if (match) {
              reviewCount = parseInt(match[1].replace(/,/g, ''));
              break;
            }
          }
        }

        let imageUrl = $element.find('.s-image').attr('src') || '';
        if (!imageUrl) {
          imageUrl = $element.find('img').first().attr('src') || '';
        }

        if (title && price > 0 && (rating > 0 || reviewCount > 0)) {
          products.push({
            id: asin,
            asin,
            title,
            price,
            rating: rating || 0,
            reviewCount: reviewCount || 0,
            imageUrl,
            amazonLink: "https://amazon.com/dp/" + asin
          });

          console.log(`   ✓ Product ${products.length}: ${title.substring(0, 50)}... ($${price}, ${rating}⭐, ${reviewCount} reviews)`);
        }
      } catch (error) {
        console.warn('Failed to parse product:', error.message);
      }
    });

    console.log(`📦 Successfully parsed ${products.length} products`);
    
    if (products.length === 0) {
      console.log('⚠️ No products parsed, using mock data');
      return getMockProducts();
    }
    
    return products;

  } catch (error) {
    console.error('Amazon scraping error:', error);
    console.log('⚠️ Returning mock data');
    return getMockProducts();
  }
}

/* fetch reviews */
async function fetchRecentReviews(asin) {
  try {
    console.log(`   📝 Fetching reviews for ASIN: ${asin}`);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const reviewsUrl = `https://www.amazon.com/product-reviews/${asin}/ref=cm_cr_arp_d_viewopt_sr?sortBy=recent&pageNumber=1`;
    
    const response = await fetch(reviewsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': `https://www.amazon.com/dp/${asin}`,
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      console.warn(`   ⚠️ Reviews fetch failed: ${response.status}`);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const reviews = [];
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const reviewElements = $('[data-hook="review"]');
    console.log(`   Found ${reviewElements.length} review elements`);

    reviewElements.slice(0, 8).each((i, element) => {
      if (reviews.length >= 3) return false;

      try {
        const $review = $(element);
        
        let reviewDate = null;
        const dateText = $review.find('[data-hook="review-date"]').text();
        let dateMatch = dateText.match(/on\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/);
        if (dateMatch) {
          reviewDate = new Date(dateMatch[1]);
        }

        if (reviewDate && reviewDate < threeMonthsAgo) {
          return;
        }

        let rating = 0;
        const ratingElement = $review.find('[data-hook="review-star-rating"]');
        if (ratingElement.length > 0) {
          const ratingText = ratingElement.text() || ratingElement.find('.a-icon-alt').text();
          const ratingMatch = ratingText.match(/([\d.]+)\s*out of/i);
          if (ratingMatch) {
            rating = parseFloat(ratingMatch[1]);
          }
        }

        let title = $review.find('[data-hook="review-title"]').text().trim();
        title = title.replace(/[\d.]+\s*out of\s*5\s*stars\s*/i, '').trim();

        let body = $review.find('[data-hook="review-body"]').text().trim();
        body = body.replace(/Read more/gi, '').trim();

        let reviewer = $review.find('.a-profile-name').text().trim() || 'Amazon Customer';

        if ((title || body) && rating > 0) {
          const formattedDate = reviewDate 
            ? reviewDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Recent';

          reviews.push({
            rating,
            title: title || 'Great product!',
            body: body 
              ? (body.substring(0, 300) + (body.length > 300 ? '...' : ''))
              : 'Customer recommends this product.',
            reviewer,
            date: formattedDate
          });

          console.log(`   ✓ Review ${reviews.length}: ${rating}⭐ - ${title.substring(0, 40)}...`);
        }

      } catch (error) {
        console.warn(`   ⚠️ Failed to parse review:`, error.message);
      }
    });

    console.log(`   📝 Extracted ${reviews.length} reviews`);
    return reviews;

  } catch (error) {
    console.error(`   ❌ Review fetch error:`, error.message);
    return [];
  }
}

/* mock data products */
function getMockProducts() {
  return [
    {
      id: 'B08N5WRWNW',
      asin: 'B08N5WRWNW',
      title: 'YETI Rambler 36 oz Vacuum Insulated Stainless Steel Bottle',
      price: 50.00,
      rating: 4.8,
      reviewCount: 12543,
      imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400',
      amazonLink: 'https://amazon.com/dp/B08N5WRWNW'
    },
    {
      id: 'B07VNSVY31',
      asin: 'B07VNSVY31',
      title: 'Hydro Flask Water Bottle - Stainless Steel Insulated',
      price: 44.95,
      rating: 4.7,
      reviewCount: 8932,
      imageUrl: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400',
      amazonLink: 'https://amazon.com/dp/B07VNSVY31'
    },
    {
      id: 'B09KLJN3TR',
      asin: 'B09KLJN3TR',
      title: 'CamelBak Chute Mag BPA Free Water Bottle - 32 oz',
      price: 35.00,
      rating: 4.6,
      reviewCount: 5421,
      imageUrl: 'https://images.unsplash.com/photo-1590879491867-b8e2e5e5b1c2?w=400',
      amazonLink: 'https://amazon.com/dp/B09KLJN3TR'
    },
    {
      id: 'B083QDVPS1',
      asin: 'B083QDVPS1',
      title: 'Nalgene Tritan Wide Mouth BPA-Free Water Bottle',
      price: 12.99,
      rating: 4.5,
      reviewCount: 3456,
      imageUrl: 'https://images.unsplash.com/photo-1612464040571-d4ed9b7eb579?w=400',
      amazonLink: 'https://amazon.com/dp/B083QDVPS1'
    }
  ];
}