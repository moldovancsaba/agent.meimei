'use client'

import { useState, useEffect } from 'react'
import Navigation from '../components/layout/Navigation'
import Image from 'next/image'

interface GalleryItem {
  id: string
  generatedImageUrl: string
  person: {
    name: string
    imageUrl: string
  }
  clothingItem: {
    name: string
    imageUrl: string
    category?: string
  }
  processingTimeMs?: number
  quality: string
  style: string
  isFavorite: boolean
  createdAt: string
}

interface GalleryResponse {
  success: boolean
  data: GalleryItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export default function GalleryPage() {
  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<GalleryResponse['pagination'] | null>(null)
  const [showFavorites, setShowFavorites] = useState(false)

  const fetchGallery = async (pageNum = 1, favorites = false) => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '12'
      })
      
      if (favorites) {
        params.append('favorites', 'true')
      }
      
      const response = await fetch(`/api/gallery?${params}`)
      const data: GalleryResponse = await response.json()
      
      if (data.success) {
        setGallery(data.data)
        setPagination(data.pagination)
      } else {
        setError('Failed to load gallery')
      }
    } catch (err) {
      setError('Failed to load gallery')
      console.error('Gallery fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = async (id: string, currentFavorite: boolean) => {
    try {
      const response = await fetch('/api/gallery', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id,
          isFavorite: !currentFavorite
        })
      })
      
      if (response.ok) {
        // Update local state
        setGallery(prev => prev.map(item => 
          item.id === id ? { ...item, isFavorite: !currentFavorite } : item
        ))
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }

  useEffect(() => {
    fetchGallery(page, showFavorites)
  }, [page, showFavorites])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatProcessingTime = (ms?: number) => {
    if (!ms) return 'Unknown'
    const seconds = Math.round(ms / 1000)
    return seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)}m`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Results Gallery
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Your generated try-on images
          </p>
          
          {/* Filter Controls */}
          <div className="flex justify-center mb-8">
            <div className="flex bg-white rounded-lg shadow p-1">
              <button
                onClick={() => setShowFavorites(false)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  !showFavorites 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                All Results
              </button>
              <button
                onClick={() => setShowFavorites(true)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  showFavorites 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                ⭐ Favorites
              </button>
            </div>
          </div>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mx-auto max-w-md">
            {error}
          </div>
        )}
        
        {/* Empty State */}
        {!loading && !error && gallery.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {showFavorites ? 'No favorites yet' : 'No images yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {showFavorites 
                ? 'Mark some generated images as favorites to see them here'
                : 'Generate your first try-on to see results here'
              }
            </p>
            <a 
              href="/try-on"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Start Try-On
            </a>
          </div>
        )}
        
        {/* Gallery Grid */}
        {!loading && !error && gallery.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {gallery.map((item) => (
                <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Generated Image */}
                  <div className="relative aspect-square">
                    <Image
                      src={item.generatedImageUrl}
                      alt={`${item.person.name} wearing ${item.clothingItem.name}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    
                    {/* Favorite Button */}
                    <button
                      onClick={() => toggleFavorite(item.id, item.isFavorite)}
                      className={`absolute top-2 right-2 p-2 rounded-full transition-colors ${
                        item.isFavorite 
                          ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                          : 'bg-white bg-opacity-80 text-gray-600 hover:bg-opacity-100'
                      }`}
                    >
                      ⭐
                    </button>
                  </div>
                  
                  {/* Details */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {item.person.name} + {item.clothingItem.name}
                    </h3>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                      <span className="capitalize">{item.quality}</span>
                      <span className="capitalize">{item.style}</span>
                      <span>{formatProcessingTime(item.processingTimeMs)}</span>
                    </div>
                    
                    <p className="text-xs text-gray-400">
                      {formatDate(item.createdAt)}
                    </p>
                    
                    {/* Original Images */}
                    <div className="flex space-x-2 mt-3">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200">
                        <Image
                          src={item.person.imageUrl}
                          alt={item.person.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200">
                        <Image
                          src={item.clothingItem.imageUrl}
                          alt={item.clothingItem.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center mt-8 space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                
                <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
            
            {/* Stats */}
            {pagination && (
              <div className="text-center mt-4 text-sm text-gray-500">
                Showing {gallery.length} of {pagination.total} results
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
