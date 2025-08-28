'use client'

/**
 * Clothes Management Page
 * 
 * Full CRUD interface for managing clothing items
 */

import React, { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import Navigation from '../components/layout/Navigation'
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal'
import TagManager, { Tag } from '../components/ui/TagManager'

// ============================================================================
// TYPES
// ============================================================================

interface ClothingItem {
  _id: string
  name: string
  description?: string
  imageUrl: string
  thumbnailUrl?: string
  lightxUrl?: string
  imgbbId: string
  category: {
    id: string
    name: string
    slug: string
    description?: string
  }
  tags: Tag[]
  color?: string
  size?: string
  brand?: string
  season: 'spring' | 'summer' | 'autumn' | 'winter' | 'all-season'
  isFavorite: boolean
  isActive: boolean
  uploadedAt: string
  updatedAt: string
}

interface EditFormData {
  name: string
  description: string
  color: string
  size: string
  brand: string
  season: 'spring' | 'summer' | 'autumn' | 'winter' | 'all-season'
  tags: Tag[]
  isFavorite: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ManageClothesPage() {
  const [clothes, setClothes] = useState<ClothingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [hasPrevPage, setHasPrevPage] = useState(false)
  
  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [seasonFilter, setSeasonFilter] = useState('')
  const [favoriteFilter, setFavoriteFilter] = useState(false)
  
  // Edit modal
  const [editItem, setEditItem] = useState<ClothingItem | null>(null)
  const [editForm, setEditForm] = useState<EditFormData>({
    name: '',
    description: '',
    color: '',
    size: '',
    brand: '',
    season: 'all-season',
    tags: [],
    isFavorite: false
  })
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Delete modal
  const [deleteItem, setDeleteItem] = useState<ClothingItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadClothes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12'
      })
      
      if (search) params.append('search', search)
      if (categoryFilter) params.append('category', categoryFilter)
      if (seasonFilter) params.append('season', seasonFilter)
      if (favoriteFilter) params.append('favorite', 'true')
      
      const response = await fetch(`/api/clothes?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setClothes(data.data)
        setTotalPages(data.pagination.totalPages)
        setHasNextPage(data.pagination.hasNextPage)
        setHasPrevPage(data.pagination.hasPrevPage)
      } else {
        setError('Failed to load clothes')
      }
    } catch (err) {
      setError('Error loading clothes')
      console.error('Load clothes error:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, categoryFilter, seasonFilter, favoriteFilter])

  useEffect(() => {
    loadClothes()
  }, [loadClothes])

  // ============================================================================
  // EDIT OPERATIONS
  // ============================================================================

  const openEditModal = (item: ClothingItem) => {
    setEditItem(item)
    setEditForm({
      name: item.name,
      description: item.description || '',
      color: item.color || '',
      size: item.size || '',
      brand: item.brand || '',
      season: item.season,
      tags: item.tags,
      isFavorite: item.isFavorite
    })
  }

  const closeEditModal = () => {
    setEditItem(null)
    setEditForm({
      name: '',
      description: '',
      color: '',
      size: '',
      brand: '',
      season: 'all-season',
      tags: [],
      isFavorite: false
    })
  }

  const handleEditSubmit = async () => {
    if (!editItem) return
    
    try {
      setIsUpdating(true)
      
      const response = await fetch(`/api/clothes?id=${editItem._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description || undefined,
          color: editForm.color || undefined,
          size: editForm.size || undefined,
          brand: editForm.brand || undefined,
          season: editForm.season,
          tags: editForm.tags,
          isFavorite: editForm.isFavorite
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Update the item in the local state
        setClothes(prev => prev.map(item => 
          item._id === editItem._id 
            ? { ...item, ...result.data }
            : item
        ))
        closeEditModal()
      } else {
        setError(result.message || 'Failed to update item')
      }
    } catch (err) {
      setError('Error updating item')
      console.error('Update error:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  // ============================================================================
  // DELETE OPERATIONS
  // ============================================================================

  const openDeleteModal = (item: ClothingItem) => {
    setDeleteItem(item)
  }

  const closeDeleteModal = () => {
    setDeleteItem(null)
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    
    try {
      setIsDeleting(true)
      
      const response = await fetch(`/api/clothes?id=${deleteItem._id}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Remove the item from local state
        setClothes(prev => prev.filter(item => item._id !== deleteItem._id))
        closeDeleteModal()
      } else {
        setError(result.message || 'Failed to delete item')
      }
    } catch (err) {
      setError('Error deleting item')
      console.error('Delete error:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  // ============================================================================
  // FAVORITE TOGGLE
  // ============================================================================

  const toggleFavorite = async (item: ClothingItem) => {
    try {
      const response = await fetch(`/api/clothes?id=${item._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isFavorite: !item.isFavorite
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setClothes(prev => prev.map(clothingItem => 
          clothingItem._id === item._id 
            ? { ...clothingItem, isFavorite: !item.isFavorite }
            : clothingItem
        ))
      }
    } catch (err) {
      console.error('Toggle favorite error:', err)
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manage Clothes</h1>
              <p className="text-gray-600">View, edit, and delete your clothing items</p>
            </div>
            <Link
              href="/upload-clothes"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add New Item</span>
            </Link>
          </div>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search clothes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Categories</option>
              <option value="tops">Tops</option>
              <option value="bottoms">Bottoms</option>
              <option value="dresses">Dresses</option>
              <option value="outerwear">Outerwear</option>
              <option value="shoes">Shoes</option>
              <option value="accessories">Accessories</option>
            </select>
            <select
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Seasons</option>
              <option value="spring">Spring</option>
              <option value="summer">Summer</option>
              <option value="autumn">Autumn</option>
              <option value="winter">Winter</option>
              <option value="all-season">All Season</option>
            </select>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={favoriteFilter}
                onChange={(e) => setFavoriteFilter(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mr-2"
              />
              <span className="text-sm text-gray-700">Favorites only</span>
            </label>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 text-sm mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {/* Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {clothes.map(item => (
                <div key={item._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="relative">
                    <img
                      src={item.thumbnailUrl || item.imageUrl}
                      alt={item.name}
                      className="w-full h-48 object-cover"
                    />
                    <button
                      onClick={() => toggleFavorite(item)}
                      className={`absolute top-2 right-2 p-2 rounded-full ${
                        item.isFavorite ? 'bg-red-500 text-white' : 'bg-white text-gray-400'
                      } hover:bg-red-500 hover:text-white transition-colors`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    </button>
                    {!item.lightxUrl && (
                      <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                        Legacy
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{item.category.name}</p>
                    {item.description && (
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">{item.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.tags.slice(0, 3).map(tag => (
                        <span 
                          key={tag.id}
                          className="text-xs px-2 py-1 rounded-full"
                          style={{ backgroundColor: tag.color + '20', color: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                      {item.tags.length > 3 && (
                        <span className="text-xs text-gray-500">+{item.tags.length - 3}</span>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        {item.size && <span className="mr-2">Size: {item.size}</span>}
                        <span className="capitalize">{item.season}</span>
                      </div>
                      
                      <div className="flex space-x-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDeleteModal(item)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={!hasPrevPage}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!hasNextPage}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Edit Clothing Item</h2>
                <button
                  onClick={closeEditModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <img
                    src={editItem.thumbnailUrl || editItem.imageUrl}
                    alt={editItem.name}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                      <input
                        type="text"
                        value={editForm.color}
                        onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                      <select
                        value={editForm.size}
                        onChange={(e) => setEditForm(prev => ({ ...prev, size: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select size</option>
                        <option value="XXS">XXS</option>
                        <option value="XS">XS</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                        <option value="XXL">XXL</option>
                        <option value="XXXL">XXXL</option>
                        <option value="One Size">One Size</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                      <input
                        type="text"
                        value={editForm.brand}
                        onChange={(e) => setEditForm(prev => ({ ...prev, brand: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Season</label>
                      <select
                        value={editForm.season}
                        onChange={(e) => setEditForm(prev => ({ ...prev, season: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="all-season">All Season</option>
                        <option value="spring">Spring</option>
                        <option value="summer">Summer</option>
                        <option value="autumn">Autumn</option>
                        <option value="winter">Winter</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <TagManager
                      selectedTags={editForm.tags}
                      onTagsChange={(tags) => setEditForm(prev => ({ ...prev, tags }))}
                      availableTags={[
                        { id: 'casual', name: 'Casual', color: '#3B82F6' },
                        { id: 'formal', name: 'Formal', color: '#1F2937' },
                        { id: 'vintage', name: 'Vintage', color: '#D97706' },
                        { id: 'trendy', name: 'Trendy', color: '#EC4899' },
                        { id: 'comfortable', name: 'Comfortable', color: '#10B981' },
                        { id: 'elegant', name: 'Elegant', color: '#8B5CF6' }
                      ]}
                      placeholder="Search or add tags..."
                      label="Tags"
                      allowNew={true}
                      maxTags={10}
                    />
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editForm.isFavorite}
                        onChange={(e) => setEditForm(prev => ({ ...prev, isFavorite: e.target.checked }))}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mr-2"
                      />
                      <span className="text-sm text-gray-700">Mark as favorite</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button
                  onClick={closeEditModal}
                  disabled={isUpdating}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={isUpdating || !editForm.name.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center"
                >
                  {isUpdating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    'Update Item'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteItem}
        title="Delete Clothing Item"
        message="Are you sure you want to delete this clothing item?"
        itemName={deleteItem?.name || ''}
        onConfirm={handleDelete}
        onCancel={closeDeleteModal}
        isDeleting={isDeleting}
      />
    </div>
  )
}
