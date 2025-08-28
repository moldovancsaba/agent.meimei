'use client'

/**
 * PeopleUpload Component
 * 
 * Comprehensive people/person upload interface that handles:
 * - Person photo upload with drag-and-drop
 * - Demographic metadata form (age, gender, body type, etc.)
 * - Dual CDN upload integration (ImgBB + LightX)
 * - Progress tracking and error handling
 * - Tag system for organization
 */

import React, { useState, useCallback } from 'react'
import ImageUpload from '../upload/ImageUpload'
import TagManager, { Tag } from '../ui/TagManager'
import { validateImageFile } from '../../lib/api'

// ============================================================================
// TYPES
// ============================================================================

// Using Tag interface from TagManager component

interface PeopleUploadData {
  name: string
  nickname: string
  description: string
  tags: Tag[]
  age: string
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say' | ''
  bodyType: 'slim' | 'average' | 'curvy' | 'athletic' | 'plus-size' | ''
  skinTone: 'fair' | 'medium' | 'olive' | 'dark' | ''
  hairColor: string
  eyeColor: string
}

// ============================================================================
// DEFAULT DATA
// ============================================================================

const defaultTags: Tag[] = [
  { id: 'family', name: 'Family', color: '#EF4444' },
  { id: 'friend', name: 'Friend', color: '#3B82F6' },
  { id: 'model', name: 'Model', color: '#8B5CF6' },
  { id: 'celebrity', name: 'Celebrity', color: '#F59E0B' },
  { id: 'reference', name: 'Reference', color: '#10B981' },
  { id: 'favorite', name: 'Favorite', color: '#EC4899' },
  { id: 'colleague', name: 'Colleague', color: '#6366F1' },
  { id: 'influencer', name: 'Influencer', color: '#EC4899' },
  { id: 'customer', name: 'Customer', color: '#10B981' },
  { id: 'test-subject', name: 'Test Subject', color: '#F59E0B' }
]

const genderOptions = [
  { value: '', label: 'Prefer not to specify' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' }
]

const bodyTypeOptions = [
  { value: '', label: 'Not specified' },
  { value: 'slim', label: 'Slim' },
  { value: 'average', label: 'Average' },
  { value: 'curvy', label: 'Curvy' },
  { value: 'athletic', label: 'Athletic' },
  { value: 'plus-size', label: 'Plus Size' }
]

const skinToneOptions = [
  { value: '', label: 'Not specified' },
  { value: 'fair', label: 'Fair' },
  { value: 'medium', label: 'Medium' },
  { value: 'olive', label: 'Olive' },
  { value: 'dark', label: 'Dark' }
]

const commonHairColors = [
  'Black', 'Brown', 'Blonde', 'Red', 'Auburn', 'Gray', 'White', 'Blue', 'Green', 'Purple', 'Pink'
]

const commonEyeColors = [
  'Brown', 'Blue', 'Green', 'Hazel', 'Gray', 'Amber', 'Violet'
]

// ============================================================================
// COMPONENT
// ============================================================================

interface PeopleUploadProps {
  onUploadComplete?: (person: any) => void
  onCancel?: () => void
}

export default function PeopleUpload({ onUploadComplete, onCancel }: PeopleUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [errors, setErrors] = useState<string[]>([])

  const [formData, setFormData] = useState<PeopleUploadData>({
    name: '',
    nickname: '',
    description: '',
    tags: [],
    age: '',
    gender: '',
    bodyType: '',
    skinTone: '',
    hairColor: '',
    eyeColor: ''
  })

  // ============================================================================
  // FORM HANDLERS
  // ============================================================================

  const handleInputChange = useCallback((field: keyof PeopleUploadData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors.length > 0) {
      setErrors([])
    }
  }, [errors.length])

  const handleTagsChange = useCallback((tags: Tag[]) => {
    setFormData(prev => ({ ...prev, tags }))
    if (errors.length > 0) {
      setErrors([])
    }
  }, [errors.length])

  // ============================================================================
  // FILE UPLOAD HANDLERS
  // ============================================================================

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files)
    setErrors([])
    
    // Auto-generate name from first file if empty
    if (!formData.name && files.length > 0) {
      const fileName = files[0].name.split('.')[0]
      const cleanName = fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      handleInputChange('name', cleanName)
    }
  }, [formData.name, handleInputChange])

  const uploadPerson = useCallback(async (file: File, personData: PeopleUploadData) => {
    const fileReader = new FileReader()
    
    return new Promise<any>((resolve, reject) => {
      fileReader.onload = async () => {
        try {
          const base64Data = fileReader.result as string
          
          const payload = {
            ...personData,
            imageData: base64Data,
            fileName: file.name,
            // Convert age to number if provided
            age: personData.age ? parseInt(personData.age) : undefined
          }

          console.log('🔄 Uploading person:', payload.name)
          setUploadProgress(prev => ({ ...prev, [file.name]: 0 }))

          const response = await fetch('/api/people', {
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
          
          console.log('✅ Person uploaded successfully:', result.data._id)
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
    // Validate form
    const validationErrors: string[] = []
    
    if (!formData.name.trim()) {
      validationErrors.push('Name is required')
    }
    
    if (selectedFiles.length === 0) {
      validationErrors.push('At least one image is required')
    }
    
    if (selectedFiles.length > 1) {
      validationErrors.push('Only one image per person is allowed')
    }

    // Validate files
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
      const file = selectedFiles[0]
      const result = await uploadPerson(file, formData)
      
      console.log('✅ Successfully uploaded person')
      
      if (onUploadComplete) {
        onUploadComplete(result)
      }

      // Reset form
      setSelectedFiles([])
      setFormData({
        name: '',
        nickname: '',
        description: '',
        tags: [],
        age: '',
        gender: '',
        bodyType: '',
        skinTone: '',
        hairColor: '',
        eyeColor: ''
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setErrors([errorMessage])
      console.error('❌ Person upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }, [formData, selectedFiles, uploadPerson, onUploadComplete])

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload People</h1>
        <p className="text-gray-600">
          Add people to your collection for virtual try-on sessions
        </p>
      </div>

      {/* Error Messages */}
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
        {/* Left Column: Image Upload */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Photo</h2>
            <p className="text-sm text-gray-600 mb-4">
              Upload a clear, well-lit photo with the person facing the camera for best AI try-on results.
            </p>
            <ImageUpload
              onFilesSelected={handleFilesSelected}
              multiple={false}
              maxFiles={1}
              maxFileSize={50}
              acceptedFormats={['image/jpeg', 'image/png', 'image/webp']}
              disabled={isUploading}
              showPreview={true}
            />
          </div>
        </div>

        {/* Right Column: Person Details Form */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Person Details</h2>
          
          {/* Name & Nickname */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Sarah Johnson"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={isUploading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nickname
              </label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => handleInputChange('nickname', e.target.value)}
                placeholder="e.g., Sarah"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={isUploading}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description or notes about this person..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={isUploading}
            />
          </div>

          {/* Tags */}
          <TagManager
            selectedTags={formData.tags}
            onTagsChange={handleTagsChange}
            availableTags={defaultTags}
            placeholder="Search categories or create new ones..."
            label="Categories"
            maxTags={10}
            allowNew={true}
            disabled={isUploading}
          />

          {/* Demographics Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Demographics (Optional)</h3>
            <p className="text-sm text-gray-600 mb-4">
              This information helps improve AI try-on accuracy and is kept private.
            </p>

            {/* Age & Gender */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  placeholder="25"
                  min="1"
                  max="120"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={isUploading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={isUploading}
                >
                  {genderOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Body Type & Skin Tone */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Body Type
                </label>
                <select
                  value={formData.bodyType}
                  onChange={(e) => handleInputChange('bodyType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={isUploading}
                >
                  {bodyTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skin Tone
                </label>
                <select
                  value={formData.skinTone}
                  onChange={(e) => handleInputChange('skinTone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={isUploading}
                >
                  {skinToneOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hair & Eye Color */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hair Color
                </label>
                <input
                  list="hair-colors"
                  value={formData.hairColor}
                  onChange={(e) => handleInputChange('hairColor', e.target.value)}
                  placeholder="Brown"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={isUploading}
                />
                <datalist id="hair-colors">
                  {commonHairColors.map(color => (
                    <option key={color} value={color} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Eye Color
                </label>
                <input
                  list="eye-colors"
                  value={formData.eyeColor}
                  onChange={(e) => handleInputChange('eyeColor', e.target.value)}
                  placeholder="Brown"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={isUploading}
                />
                <datalist id="eye-colors">
                  {commonEyeColors.map(color => (
                    <option key={color} value={color} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
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

      {/* Action Buttons */}
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              <span>Upload Person</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
