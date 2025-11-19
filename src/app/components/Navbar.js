'use client';

import Link from "next/link";
import { Star, TrendingUp } from 'lucide-react';
import Image from "next/image";
import BurgerMenu from './BurgerMenu';
import { useEffect } from "react";

export default function Navbar({ onReset }) {
  const handleLogoClick = (e) => {
    e.preventDefault();
    onReset();
  };

  useEffect(() => {
  const header = document.querySelector('header');
  let lastScroll = 0;

  const handleScroll = () => {
    const currentScroll = window.scrollY;

    if (currentScroll <= 0) {
      header.style.transform = 'translateY(0)';
      return;
    }

    if (currentScroll > lastScroll && currentScroll > 50) {
      // Scrolling down - hide navbar
      header.style.transform = 'translateY(-100%)';
    } else if (currentScroll < lastScroll) {
      // Scrolling up - show navbar
      header.style.transform = 'translateY(0)';
    }

    lastScroll = currentScroll;
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 transition-transform duration-300">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center gap-2">
          <Link
            href="/" 
            onClick={handleLogoClick}
            className="flex items-center"
          >
            <div className="p-2 rounded-lg">
              <Image
                src="/logo.jpg"
                alt="logo"
                width={70}
                height={70}
                className="rounded-lg w-20"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
              ShopReviews
            </h1>
          </Link>
        </div>

        {/* Desktop Menu - Hidden on mobile */}
        <div className="hidden medd:flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-orange-400 text-orange-400" />
            <span>Top Rated</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <span>Best Sellers</span>
          </div>
        </div>

        {/* Burger Menu Component - Only visible on mobile */}
        <BurgerMenu onReset={onReset} />
      </div>
    </header>
  );
}