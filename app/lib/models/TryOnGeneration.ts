/**
 * TryOnGeneration MongoDB Schema
 * 
 * Stores results from virtual try-on generations for the gallery
 */

import mongoose, { Schema, Model } from 'mongoose'
import { TryOnGenerationDocument } from '@/app/types/models'

// Try-On Status schema
const tryOnStatusSchema = new Schema({
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    required: true,
    default: 'pending'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  message: String,
  error: String,
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  completedAt: Date
}, { _id: false })

// Replicate API Response schema
const replicateResponseSchema = new Schema({
  predictionId: String,
  generatedImageUrl: String,
  processingTimeMs: Number,
  requestId: String,
  metadata: Schema.Types.Mixed
}, { _id: false })

// Try-On Generation schema
const tryOnGenerationSchema = new Schema<TryOnGenerationDocument>({
  // References to person and clothing
  person: {
    type: Schema.Types.ObjectId,
    ref: 'Person',
    required: true
  },
  clothingItem: {
    type: Schema.Types.ObjectId,
    ref: 'ClothingItem',
    required: true
  },

  // Generated results
  generatedImageUrl: {
    type: String,
    required: false // Will be set when generation completes
  },
  generatedThumbnailUrl: String,
  imgbbId: String, // If we re-upload to ImgBB for permanent storage

  // API response data
  replicateResponse: replicateResponseSchema,

  // Legacy LightX support (deprecated)
  lightxRequestId: String,
  lightxResponse: Schema.Types.Mixed,

  // Generation status
  status: {
    type: tryOnStatusSchema,
    required: true,
    default: () => ({
      status: 'pending',
      startedAt: new Date()
    })
  },

  // Generation settings
  quality: {
    type: String,
    enum: ['standard', 'high'],
    default: 'standard'
  },
  style: {
    type: String,
    enum: ['realistic', 'fashion', 'casual'],
    default: 'realistic'
  },

  // User interaction
  notes: String,
  isPublic: {
    type: Boolean,
    default: true
  },
  isFavorite: {
    type: Boolean,
    default: false
  },

  // Additional metadata
  generationModel: {
    type: String,
    default: 'replicate-idm-vton'
  },
  engine: {
    type: String,
    enum: ['replicate', 'lightx'],
    required: false
  },
  processingTimeMs: Number,

}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  toJSON: { 
    virtuals: true,
    transform: function(doc: any, ret: any) {
      ret.id = ret._id
      delete ret.__v
      return ret
    }
  },
  toObject: { virtuals: true }
})

// Indexes for efficient queries
tryOnGenerationSchema.index({ person: 1, createdAt: -1 })
tryOnGenerationSchema.index({ clothingItem: 1, createdAt: -1 })
tryOnGenerationSchema.index({ 'status.status': 1, createdAt: -1 })
tryOnGenerationSchema.index({ isPublic: 1, isFavorite: 1, createdAt: -1 })
tryOnGenerationSchema.index({ createdAt: -1 }) // For gallery pagination

// Virtual for populated person data
tryOnGenerationSchema.virtual('personData', {
  ref: 'Person',
  localField: 'person',
  foreignField: '_id',
  justOne: true
})

// Virtual for populated clothing data  
tryOnGenerationSchema.virtual('clothingData', {
  ref: 'ClothingItem',
  localField: 'clothingItem',
  foreignField: '_id',
  justOne: true
})

// Pre-save middleware for status updates
tryOnGenerationSchema.pre('save', function(next) {
  if (this.isModified('status.status')) {
    if (this.status.status === 'completed' && !this.status.completedAt) {
      this.status.completedAt = new Date()
      this.status.progress = 100
    } else if (this.status.status === 'failed' && !this.status.completedAt) {
      this.status.completedAt = new Date()
    }
  }
  next()
})

// Static methods
tryOnGenerationSchema.statics = {
  /**
   * Get recent public generations for gallery
   */
  async getGalleryItems(page = 1, limit = 12) {
    return this.find({ 
      isPublic: true, 
      'status.status': 'completed' 
    })
      .populate('person', 'name imageUrl')
      .populate('clothingItem', 'name imageUrl category')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean()
  },

  /**
   * Get user's generations
   */
  async getUserGenerations(personIds: string[], page = 1, limit = 12) {
    return this.find({
      person: { $in: personIds },
      'status.status': 'completed'
    })
      .populate('person', 'name imageUrl')
      .populate('clothingItem', 'name imageUrl category')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean()
  },

  /**
   * Create a new generation record
   */
  async createGeneration(data: {
    person: string
    clothingItem: string
    quality?: 'standard' | 'high'
    style?: 'realistic' | 'fashion' | 'casual'
  }) {
    return this.create({
      ...data,
      status: {
        status: 'processing',
        startedAt: new Date()
      }
    })
  },

  /**
   * Complete a generation with results
   */
  async completeGeneration(id: string, data: {
    generatedImageUrl: string
    replicateResponse?: any
    processingTimeMs?: number
  }) {
    return this.findByIdAndUpdate(
      id,
      {
        ...data,
        status: {
          status: 'completed',
          progress: 100,
          completedAt: new Date()
        }
      },
      { new: true }
    )
  },

  /**
   * Mark generation as failed
   */
  async failGeneration(id: string, error: string) {
    return this.findByIdAndUpdate(
      id,
      {
        status: {
          status: 'failed',
          error,
          completedAt: new Date()
        }
      },
      { new: true }
    )
  }
}

// Create model
const TryOnGeneration: Model<TryOnGenerationDocument> = 
  mongoose.models.TryOnGeneration || 
  mongoose.model<TryOnGenerationDocument>('TryOnGeneration', tryOnGenerationSchema)

export default TryOnGeneration
