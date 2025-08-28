'use client'

import React, { useState, useCallback } from 'react'
import ImageUpload from '../upload/ImageUpload'
import TagManager, { Tag } from '../ui/TagManager'
import { validateImageFile } from '../../lib/api'

interface ClothingCategory {
  id: string
  name: string
  slug: string
  description?: string
}

// Using Tag interface from TagManager component

interface ClothesUploadData {
  name: string
  description: string
  category: ClothingCategory
  tags: Tag[]
  color: string
  size: string
  brand: string
  season: 'spring' | 'summer' | 'autumn' | 'winter' | 'all-season'
}

const defaultCategories: ClothingCategory[] = [
  { id: 'tops', name: 'Tops', slug: 'tops', description: 'T-shirts, shirts, blouses, sweaters' },
  { id: 'bottoms', name: 'Bottoms', slug: 'bottoms', description: 'Pants, jeans, shorts, skirts' },
  { id: 'dresses', name: 'Dresses', slug: 'dresses', description: 'Casual and formal dresses' },
  { id: 'outerwear', name: 'Outerwear', slug: 'outerwear', description: 'Jackets, coats, blazers' },
  { id: 'shoes', name: 'Shoes', slug: 'shoes', description: 'Sneakers, boots, heels, sandals' },
  { id: 'accessories', name: 'Accessories', slug: 'accessories', description: 'Bags, jewelry, hats, belts' }
]

const defaultTags: Tag[] = [
  { id: 'casual', name: 'Casual', color: '#3B82F6' },
  { id: 'formal', name: 'Formal', color: '#1F2937' },
  { id: 'vintage', name: 'Vintage', color: '#D97706' },
  { id: 'trendy', name: 'Trendy', color: '#EC4899' },
  { id: 'comfortable', name: 'Comfortable', color: '#10B981' },
  { id: 'elegant', name: 'Elegant', color: '#8B5CF6' },
  { id: 'sporty', name: 'Sporty', color: '#F59E0B' },
  { id: 'chic', name: 'Chic', color: '#EF4444' },
  { id: 'bohemian', name: 'Bohemian', color: '#84CC16' },
  { id: 'minimalist', name: 'Minimalist', color: '#6B7280' },
  { id: 'party', name: 'Party', color: '#F97316' },
  { id: 'business', name: 'Business', color: '#475569' }
]

const sizeOptions = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size', 'Custom']
const seasonOptions = [
  { value: 'all-season', label: 'All Season' },
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'autumn', label: 'Autumn' },
  { value: 'winter', label: 'Winter' }
]

interface ClothesUploadProps {
  onUploadComplete?: (clothingItem: any) => void
  onCancel?: () => void
}

export default function ClothesUpload({ onUploadComplete, onCancel }: ClothesUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [errors, setErrors] = useState<string[]>([])
  
  const [formData, setFormData] = useState<ClothesUploadData>({
    name: '',
    description: '',
    category: defaultCategories[0],
    tags: [],
    color: '',
    size: '',
    brand: '',
    season: 'all-season'
  })

  const handleInputChange = useCallback((field: keyof ClothesUploadData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors.length > 0) {
      setErrors([])
    }
  }, [errors.length])

  const handleCategoryChange = useCallback((categoryId: string) => {
    const category = defaultCategories.find(c => c.id === categoryId)
    if (category) {
      handleInputChange('category', category)
    }
  }, [handleInputChange])

  const handleTagsChange = useCallback((tags: Tag[]) => {
    setFormData(prev => ({ ...prev, tags }))
    if (errors.length > 0) {
      setErrors([])
    }
  }, [errors.length])

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files)
    setErrors([])
    
    if (!formData.name && files.length > 0) {
      const fileName = files[0].name.split('.')[0]
      const cleanName = fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      handleInputChange('name', cleanName)
    }
  }, [formData.name, handleInputChange])

  const uploadClothingItem = useCallback(async (file: File, itemData: ClothesUploadData) => {
    const fileReader = new FileReader()
    
    return new Promise<any>((resolve, reject) => {
      fileReader.onload = async () => {
        try {
          const base64Data = fileReader.result as string
          
          const payload = {
            ...itemData,
            imageData: base64Data,
            fileName: file.name
          }

          console.log('🔄 Uploading clothing item:', payload.name)
          setUploadProgress(prev => ({ ...prev, [file.name]: 0 }))

          const response = await fetch('/api/clothes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || `HTTP ${response.status}`)
          }

          const result = await response.json()
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
          
          console.log('✅ Clothing item uploaded successfully:', result.data._id)
          resolve(result.data)
          
        } catch (error) {
          console.error('❌ Upload failed:', error)
          reject(error)
        }
      }
      
      fileReader.onerror = () => reject(new Error('Failed to read file'))
      fileReader.readAsDataURL(file)
    })
  }, [])

  const handleUpload = useCallback(async () => {
    const validationErrors: string[] = []
    
    if (!formData.name.trim()) {
      validationErrors.push('Name is required')
    }
    
    if (selectedFiles.length === 0) {
      validationErrors.push('At least one image is required')
    }

    selectedFiles.forEach(file => {
      const validation = validateImageFile(file)
      if (!validation.valid) {
        validationErrors.push(`${file.name}: ${validation.errors.join(', ')}`)
      }
    })

    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsUploading(true)
    setErrors([])
    setUploadProgress({})

    try {
      const uploadPromises = selectedFiles.map(file => 
        uploadClothingItem(file, {
          ...formData,
          name: selectedFiles.length > 1 ? `${formData.name} ${selectedFiles.indexOf(file) + 1}` : formData.name
        })
      )

      const results = await Promise.all(uploadPromises)
      
      console.log(`✅ Successfully uploaded ${results.length} clothing items`)
      
      if (onUploadComplete) {
        onUploadComplete(results.length === 1 ? results[0] : results)
      }

      // Reset form
      setSelectedFiles([])
      setFormData({
        name: '',
        description: '',
        category: defaultCategories[0],
        tags: [],
        color: '',
        size: '',
        brand: '',
        season: 'all-season'
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setErrors([errorMessage])
      console.error('❌ Batch upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }, [formData, selectedFiles, uploadClothingItem, onUploadComplete])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Clothing Items</h1>
        <p className="text-gray-600">
          Add your favorite clothes to your collection for virtual try-on
        </p>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-800 mb-2">Please fix these errors:</h3>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Images</h2>
            <ImageUpload
              onFilesSelected={handleFilesSelected}
              multiple={true}
              maxFiles={5}
              maxFileSize={5}
              acceptedFormats={['image/jpeg', 'image/png', 'image/webp']}
              disabled={isUploading}
              showPreview={true}
            />
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Clothing Details</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Blue Denim Jacket"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={isUploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the style, fit, or any special features..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={isUploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
            <select
              value={formData.category.id}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={isUploading}
            >
              {defaultCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {formData.category.description && (
              <p className="text-xs text-gray-500 mt-1">{formData.category.description}</p>
            )}
          </div>

          {/* Style Tags */}
          <TagManager
            selectedTags={formData.tags}
            onTagsChange={handleTagsChange}
            availableTags={defaultTags}
            placeholder="Search style tags or create new ones..."
            label="Style Tags"
            maxTags={15}
            allowNew={true}
            disabled={isUploading}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) => handleInputChange('color', e.target.value)}
                placeholder="e.g., Blue"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={isUploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
              <select
                value={formData.size}
                onChange={(e) => handleInputChange('size', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={isUploading}
              >
                <option value="">Select size</option>
                {sizeOptions.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                placeholder="e.g., Nike"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={isUploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Season</label>
              <select
                value={formData.season}
                onChange={(e) => handleInputChange('season', e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={isUploading}
              >
                {seasonOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {isUploading && Object.keys(uploadProgress).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-800 mb-3">Upload Progress</h3>
          <div className="space-y-2">
            {Object.entries(uploadProgress).map(([fileName, progress]) => (
              <div key={fileName}>
                <div className="flex justify-between text-sm text-blue-700 mb-1">
                  <span className="truncate">{fileName}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={isUploading}
          className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        
        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading || selectedFiles.length === 0 || !formData.name.trim()}
          className="px-8 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Upload {selectedFiles.length > 1 ? `${selectedFiles.length} Items` : 'Item'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
