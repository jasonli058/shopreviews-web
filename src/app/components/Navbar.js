'use client'

import Link from "next/link";
import { useEffect } from "react";
import { Search, Star, TrendingUp} from 'lucide-react';
import Image from "next/image";

export default function Navbar({ onReset }) {


  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg">
              {/* <Search className="w-6 h-6 text-white" /> */}
              <Image 
                src="/logo.jpg" 
                alt="Logo" 
                width={70}
                height={70}
                className="rounded-lg"
              />
            </div>
            <Link 
                href="/" 
                onClick={(e) => {
                e.preventDefault();
                onReset();
                }}
            >
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                ShopReviews
              </h1>
            </Link>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-orange-400 text-orange-400" />
              <span>Top Rated</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span>Best Sellers</span>
            </div>
          </div>
        </div>
    </header>
  )
}
