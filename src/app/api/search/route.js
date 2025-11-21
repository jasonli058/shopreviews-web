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

    //max 1000 products
    const topProducts = sortedProducts.slice(0, MAX_RESULTS * 200);

    console.log(`✅ Returning ${topProducts.length} products (requested ${MAX_RESULTS})`);

    // Step 7: Cache results
    await cacheResults(query, topProducts);

    return NextResponse.json({ 
      products: topProducts,
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