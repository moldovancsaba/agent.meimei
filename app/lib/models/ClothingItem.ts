/**
 * Mongoose Schema for Clothing Items
 * 
 * Defines the structure and validation rules for clothing items stored in MongoDB.
 * Includes proper indexing for search functionality and performance optimization.
 */

import mongoose, { Schema, Model } from 'mongoose'
import { ClothingItemDocument } from '../../types/models'

// Category subdocument schema
const ClothingCategorySchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true },
  description: { type: String }
}, { _id: false })

// Tag subdocument schema
const ClothingTagSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  color: { type: String, match: /^#[0-9A-Fa-f]{6}$/ } // Hex color validation
}, { _id: false })

// Main ClothingItem schema
const ClothingItemSchema = new Schema<ClothingItemDocument>({
  name: {
    type: String,
    required: [true, 'Clothing item name is required'],
    trim: true,
    maxLength: [100, 'Name cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    trim: true,
    maxLength: [500, 'Description cannot exceed 500 characters']
  },
  
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(v)
      },
      message: 'Please provide a valid image URL'
    }
  },
  
  thumbnailUrl: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(v)
      },
      message: 'Please provide a valid thumbnail URL'
    }
  },
  
  lightxUrl: {
    type: String,
    required: false // LightX URL for AI processing
  },
  
  imgbbId: {
    type: String,
    required: [true, 'ImgBB ID is required for image management'],
    trim: true
  },
  
  category: {
    type: ClothingCategorySchema,
    required: [true, 'Category is required']
  },
  
  tags: {
    type: [ClothingTagSchema],
    default: [],
    validate: {
      validator: function(v: any[]) {
        return v.length <= 20 // Maximum 20 tags
      },
      message: 'Cannot have more than 20 tags'
    }
  },
  
  color: {
    type: String,
    trim: true,
    maxLength: [50, 'Color name cannot exceed 50 characters']
  },
  
  size: {
    type: String,
    trim: true,
    enum: {
      values: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size', 'Custom'],
      message: 'Invalid size option'
    }
  },
  
  brand: {
    type: String,
    trim: true,
    maxLength: [100, 'Brand name cannot exceed 100 characters']
  },
  
  season: {
    type: String,
    enum: {
      values: ['spring', 'summer', 'autumn', 'winter', 'all-season'],
      message: 'Invalid season option'
    },
    default: 'all-season'
  },
  
  isFavorite: {
    type: Boolean,
    default: false
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: {
    createdAt: 'uploadedAt',
    updatedAt: true
  },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// ============================================================================
// INDEXES
// ============================================================================

// Text search index for name and description
ClothingItemSchema.index({ 
  name: 'text', 
  description: 'text' 
}, {
  weights: { name: 10, description: 5 },
  name: 'clothing_text_search'
})

// Compound indexes for common queries
ClothingItemSchema.index({ 'category.slug': 1, isActive: 1 })
ClothingItemSchema.index({ isFavorite: 1, isActive: 1 })
ClothingItemSchema.index({ uploadedAt: -1, isActive: 1 })
ClothingItemSchema.index({ 'tags.name': 1, isActive: 1 })

// Unique index for ImgBB ID
ClothingItemSchema.index({ imgbbId: 1 }, { unique: true })

// ============================================================================
// VIRTUAL PROPERTIES
// ============================================================================

// Full image info virtual
ClothingItemSchema.virtual('imageInfo').get(function() {
  return {
    url: this.imageUrl,
    thumbnail: this.thumbnailUrl || this.imageUrl,
    imgbbId: this.imgbbId
  }
})

// Tag names array virtual for easy searching
ClothingItemSchema.virtual('tagNames').get(function() {
  return this.tags.map(tag => tag.name)
})

// ============================================================================
// INSTANCE METHODS
// ============================================================================

ClothingItemSchema.methods.addTag = function(tag: { id: string, name: string, color?: string }) {
  // Check if tag already exists
  const existingTag = this.tags.find((t: any) => t.id === tag.id)
  if (!existingTag) {
    this.tags.push(tag)
  }
  return this
}

ClothingItemSchema.methods.removeTag = function(tagId: string) {
  this.tags = this.tags.filter((tag: any) => tag.id !== tagId)
  return this
}

ClothingItemSchema.methods.toggleFavorite = function() {
  this.isFavorite = !this.isFavorite
  return this
}

// ============================================================================
// STATIC METHODS
// ============================================================================

ClothingItemSchema.statics.findByCategory = function(categorySlug: string) {
  return this.find({ 'category.slug': categorySlug, isActive: true })
}

ClothingItemSchema.statics.findByTags = function(tagNames: string[]) {
  return this.find({ 
    'tags.name': { $in: tagNames },
    isActive: true 
  })
}

ClothingItemSchema.statics.searchByText = function(query: string) {
  return this.find({ 
    $text: { $search: query },
    isActive: true 
  })
  .sort({ score: { $meta: 'textScore' } })
}

ClothingItemSchema.statics.findFavorites = function() {
  return this.find({ isFavorite: true, isActive: true })
    .sort({ uploadedAt: -1 })
}

// ============================================================================
// PRE/POST MIDDLEWARE
// ============================================================================

// Ensure thumbnail URL is set before saving
ClothingItemSchema.pre('save', function(next) {
  if (this.isNew && !this.thumbnailUrl) {
    this.thumbnailUrl = this.imageUrl // Use main image as thumbnail fallback
  }
  next()
})

// Log when items are deleted (soft delete)
ClothingItemSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() as any
  if (update && update.isActive === false) {
    console.log(`🗑️ Soft deleting clothing item: ${this.getFilter()._id}`)
  }
  next()
})

// ============================================================================
// MODEL COMPILATION
// ============================================================================

// Prevent re-compilation in development
let ClothingItem: Model<ClothingItemDocument>

try {
  ClothingItem = mongoose.model<ClothingItemDocument>('ClothingItem')
} catch (error) {
  ClothingItem = mongoose.model<ClothingItemDocument>('ClothingItem', ClothingItemSchema)
}

export default ClothingItem

// Export schema for testing purposes
export { ClothingItemSchema }
