import { Geist, Geist_Mono, Quicksand } from "next/font/google";
import "./globals.css";
import { Metadata } from 'next'

//conf the main body font
const quicksand = Quicksand ({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'], // Choose weights you need
  variable: '--font-quicksand',
  display: 'swap',
});

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata = {
  title: 'ShopReviews',
  description: 'AI-powered search for the highest-rated Amazon products',
  icons: {
    icon: '/icon0.svg',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className= {quicksand.className}
      >
        {children}
      </body>
    </html>
  );
}
