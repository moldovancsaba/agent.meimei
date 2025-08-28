/**
 * Person Model - MongoDB Schema for Person Photos
 * 
 * Defines the structure for storing person/model photos with demographics
 * and metadata for AI virtual try-on processing.
 */

import mongoose, { Schema } from 'mongoose'
import { PersonDocument } from '../../types/models'

// Person tag schema for categorization
const PersonTagSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: false,
    default: '#3B82F6'
  }
}, { _id: false })

// Main Person schema
const PersonSchema = new Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  nickname: {
    type: String,
    required: false,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    required: false,
    trim: true,
    maxlength: 500
  },

  // Image URLs and CDN References
  imageUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String,
    required: false
  },
  lightxUrl: {
    type: String,
    required: false // LightX URL for AI processing
  },
  imgbbId: {
    type: String,
    required: true,
    unique: true
  },

  // Organization and Metadata
  tags: [PersonTagSchema],
  
  // Demographics (Optional for AI accuracy)
  age: {
    type: Number,
    required: false,
    min: 1,
    max: 120
  },
  gender: {
    type: String,
    required: false,
    enum: ['male', 'female', 'other', 'prefer-not-to-say']
  },
  bodyType: {
    type: String,
    required: false,
    enum: ['slim', 'average', 'curvy', 'athletic', 'plus-size']
  },
  skinTone: {
    type: String,
    required: false,
    enum: ['fair', 'medium', 'olive', 'dark']
  },
  hairColor: {
    type: String,
    required: false,
    trim: true,
    maxlength: 30
  },
  eyeColor: {
    type: String,
    required: false,
    trim: true,
    maxlength: 30
  },

  // User Preferences
  isFavorite: {
    type: Boolean,
    default: false,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // Timestamps
  uploadedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false, // We manage timestamps manually for consistency
  collection: 'people'
})

// Indexes for efficient querying
PersonSchema.index({ name: 1 })
PersonSchema.index({ nickname: 1 })
PersonSchema.index({ uploadedAt: -1 })
PersonSchema.index({ 'tags.id': 1 })
PersonSchema.index({ gender: 1 })
PersonSchema.index({ bodyType: 1 })
PersonSchema.index({ skinTone: 1 })
PersonSchema.index({ isFavorite: 1, isActive: 1 })

// Update the updatedAt field before saving
PersonSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date()
  }
  next()
})

// Create and export the model
const Person = mongoose.models.Person || mongoose.model<PersonDocument>('Person', PersonSchema)

export default Person
