import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AuraTrace',
  description: 'AI-powered application observability',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-2xl">🔍</span>
                <span className="text-xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                  AuraTrace
                </span>
              </Link>
              <div className="flex items-center gap-6">
                <Link href="/" className="text-sm font-medium text-gray-600 hover:text-red-600 transition">
                  Dashboard
                </Link>
                <Link href="/incidents" className="text-sm font-medium text-gray-600 hover:text-red-600 transition">
                  Incidents
                </Link>
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-gray-600 hover:text-red-600 transition"
                >
                  API Docs
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
