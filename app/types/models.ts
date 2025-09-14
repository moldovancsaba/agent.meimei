/**
 * TypeScript Type Definitions for ChangeMass Data Models
 * 
 * These interfaces define the structure of data stored in MongoDB Atlas
 * and used throughout the application for type safety and consistency.
 */

import { Document, Types } from 'mongoose'

// ============================================================================
// CLOTHING ITEM TYPES
// ============================================================================

export interface ClothingCategory {
  id: string
  name: string
  slug: string
  description?: string
}

export interface ClothingTag {
  id: string
  name: string
  color?: string
}

export interface ClothingItem {
  _id?: Types.ObjectId
  name: string
  description?: string
  imageUrl: string
  thumbnailUrl?: string
  lightxUrl?: string // LightX CDN URL for AI processing
  imgbbId: string // ImgBB image ID for management
  category: ClothingCategory
  tags: ClothingTag[]
  color?: string
  size?: string
  brand?: string
  season?: 'spring' | 'summer' | 'autumn' | 'winter' | 'all-season'
  isFavorite: boolean
  isActive: boolean
  uploadedAt: Date
  updatedAt: Date
}

export interface ClothingItemDocument extends Omit<ClothingItem, '_id'>, Document {}

// ============================================================================
// PERSON PROFILE TYPES
// ============================================================================

export interface PersonTag {
  id: string
  name: string
  color?: string
}

export interface Person {
  _id?: Types.ObjectId
  name: string
  nickname?: string
  description?: string
  imageUrl: string
  thumbnailUrl?: string
  lightxUrl?: string // LightX CDN URL for AI processing
  imgbbId: string // ImgBB image ID for management
  tags: PersonTag[]
  age?: number
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say'
  bodyType?: 'slim' | 'average' | 'curvy' | 'athletic' | 'plus-size'
  skinTone?: 'fair' | 'medium' | 'olive' | 'dark'
  hairColor?: string
  eyeColor?: string
  isFavorite: boolean
  isActive: boolean
  uploadedAt: Date
  updatedAt: Date
}

export interface PersonDocument extends Omit<Person, '_id'>, Document {}

// ============================================================================
// TRY-ON GENERATION TYPES
// ============================================================================

export interface TryOnStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress?: number // 0-100
  message?: string
  error?: string
  startedAt: Date
  completedAt?: Date
}

export interface LightXApiResponse {
  uploadImage?: string
  imageUrl?: string
  generatedImageUrl?: string
  requestId?: string
  credits?: number
  processingTime?: number
}

export interface TryOnGeneration {
  _id?: Types.ObjectId
  clothingItem: Types.ObjectId | ClothingItem
  person: Types.ObjectId | Person
  generatedImageUrl?: string
  generatedThumbnailUrl?: string
  imgbbId?: string // ImgBB ID for the generated image
  lightxRequestId?: string
  lightxResponse?: {
    predictionId?: string
    generatedImageUrl?: string
    processingTimeMs?: number
    requestId?: string
    metadata?: any
  }
  replicateResponse?: {
    predictionId?: string
    generatedImageUrl?: string
    processingTimeMs?: number
    requestId?: string
    metadata?: any
  }
  status: TryOnStatus
  quality?: 'standard' | 'high'
  style?: 'realistic' | 'fashion' | 'casual'
  generationModel?: string
  engine?: 'replicate' | 'lightx'
  processingTimeMs?: number
  notes?: string
  isPublic: boolean
  isFavorite: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TryOnGenerationDocument extends Omit<TryOnGeneration, '_id'>, Document {}

// ============================================================================
// COLLECTION/ALBUM TYPES
// ============================================================================

export interface Collection {
  _id?: Types.ObjectId
  name: string
  description?: string
  coverImageUrl?: string
  clothingItems: Types.ObjectId[]
  people: Types.ObjectId[]
  tryOnGenerations: Types.ObjectId[]
  tags: string[]
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CollectionDocument extends Omit<Collection, '_id'>, Document {}

// ============================================================================
// USER PREFERENCES TYPES
// ============================================================================

export interface UserPreferences {
  _id?: Types.ObjectId
  defaultClothingCategory?: string
  autoGenerateThumbnails: boolean
  maxImageSize: number // in MB
  preferredImageFormat: 'jpeg' | 'png' | 'webp'
  enableNotifications: boolean
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  createdAt: Date
  updatedAt: Date
}

export interface UserPreferencesDocument extends Omit<UserPreferences, '_id'>, Document {}

// ============================================================================
// API INTEGRATION TYPES
// ============================================================================

export interface ImgBBUploadResponse {
  data: {
    id: string
    title: string
    url_viewer: string
    url: string
    display_url: string
    size: number
    time: string
    expiration: string
    image: {
      filename: string
      name: string
      mime: string
      extension: string
      url: string
    }
    thumb: {
      filename: string
      name: string
      mime: string
      extension: string
      url: string
    }
    medium?: {
      filename: string
      name: string
      mime: string
      extension: string
      url: string
    }
    delete_url: string
  }
  success: boolean
  status: number
}

export interface LightXImageUploadResponse {
  statusCode: number
  message: string
  body: {
    uploadImage: string
    imageUrl: string
    size: number
  }
}

export interface LightXTryOnResponse {
  statusCode: number
  message: string
  body?: {
    generatedImageUrl: string
    requestId: string
    creditsUsed: number
    processingTimeMs: number
  }
  error?: {
    code: string
    message: string
    details?: any
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  statusCode?: number
}

export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export interface FilterParams {
  category?: string
  tags?: string[]
  dateFrom?: Date
  dateTo?: Date
  isFavorite?: boolean
  isActive?: boolean
  search?: string
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

export interface ImageUploadProps {
  accept?: string
  multiple?: boolean
  maxSize?: number
  onUpload: (files: File[]) => Promise<void>
  loading?: boolean
  disabled?: boolean
  className?: string
}

export interface GalleryProps<T> {
  items: T[]
  loading?: boolean
  onSelect?: (item: T) => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  selectedItems?: T[]
  multiSelect?: boolean
  className?: string
}

export interface SearchFilterProps {
  onSearch: (query: string) => void
  onFilter: (filters: FilterParams) => void
  categories?: ClothingCategory[]
  tags?: (ClothingTag | PersonTag)[]
  placeholder?: string
  className?: string
}

// Export utility type helpers
export type WithoutDocument<T> = Omit<T, keyof Document>
export type CreateInput<T extends Document> = Omit<WithoutDocument<T>, '_id' | 'createdAt' | 'updatedAt'>
export type UpdateInput<T extends Document> = Partial<CreateInput<T>>
