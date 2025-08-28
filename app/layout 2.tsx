import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ChangeMass - AI Virtual Outfit Try-On',
  description: 'Upload your favorite clothes and see how they look on your friends using AI-powered virtual try-on technology.',
  keywords: ['AI', 'virtual try-on', 'fashion', 'outfit', 'clothes', 'LightX'],
  authors: [{ name: 'Narimato' }],
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-gray-50 min-h-screen`}>
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-50 bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-primary-600">
                    ChangeMass
                  </h1>
                  <p className="ml-3 text-sm text-gray-600 hidden sm:block">
                    AI Virtual Outfit Try-On
                  </p>
                </div>
                <nav className="flex space-x-4">
                  {/* Navigation will be added later */}
                </nav>
              </div>
            </div>
          </header>
          
          <main className="flex-1">
            {children}
          </main>
          
          <footer className="bg-white border-t">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <p className="text-center text-sm text-gray-600">
                © 2024 ChangeMass. Powered by LightX AI and ImgBB CDN.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
