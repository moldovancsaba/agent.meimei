'use client'

/**
 * ImageUpload Component
 * 
 * A comprehensive drag-and-drop image upload component with:
 * - Multiple file selection support
 * - Drag and drop interface
 * - File validation (type, size)
 * - Image preview with thumbnails
 * - Upload progress tracking
 * - Error handling and retry functionality
 */

import React, { useState, useCallback, useRef } from 'react'
import { validateImageFile, formatFileSize } from '../../lib/api'

// ============================================================================
// TYPES
// ============================================================================

interface FileWithPreview extends File {
  preview?: string
  id: string
  status: 'pending' | 'uploading' | 'completed' | 'error'
  progress?: number
  error?: string
}

interface ImageUploadProps {
  onFilesSelected: (files: File[]) => void
  onUpload?: (files: FileWithPreview[]) => Promise<void>
  multiple?: boolean
  maxFiles?: number
  maxFileSize?: number // in MB
  acceptedFormats?: string[]
  disabled?: boolean
  className?: string
  showPreview?: boolean
  autoUpload?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ImageUpload({
  onFilesSelected,
  onUpload,
  multiple = true,
  maxFiles = 999999,
  maxFileSize = 50,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp'],
  disabled = false,
  className = '',
  showPreview = true,
  autoUpload = false
}: ImageUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ============================================================================
  // FILE HANDLING
  // ============================================================================

  const createFileWithPreview = useCallback((file: File): FileWithPreview => {
    const fileWithPreview = Object.assign(file, {
      preview: URL.createObjectURL(file),
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      status: 'pending' as const
    })

    return fileWithPreview
  }, [])

  const validateAndProcessFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const validFiles: FileWithPreview[] = []
    const errors: string[] = []

    // Skip file count check - allow unlimited files

    fileArray.forEach((file) => {
      const validation = validateImageFile(file)
      
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.errors.join(', ')}`)
        return
      }

      // Additional size check based on component props
      if (file.size > maxFileSize * 1024 * 1024) {
        errors.push(`${file.name}: File too large (${formatFileSize(file.size)}). Maximum: ${maxFileSize}MB`)
        return
      }

      // Format check
      if (!acceptedFormats.includes(file.type)) {
        errors.push(`${file.name}: Unsupported format. Allowed: ${acceptedFormats.map(f => f.split('/')[1]).join(', ')}`)
        return
      }

      validFiles.push(createFileWithPreview(file))
    })

    return { validFiles, errors }
  }, [maxFileSize, acceptedFormats, createFileWithPreview])

  const handleFileSelection = useCallback((files: FileList | File[]) => {
    const { validFiles, errors } = validateAndProcessFiles(files)

    if (errors.length > 0) {
      console.error('File validation errors:', errors)
      // You can show these errors in a toast notification
      alert(errors.join('\n')) // Simple error display for now
    }

    if (validFiles.length > 0) {
      const newFiles = multiple ? [...selectedFiles, ...validFiles] : validFiles
      setSelectedFiles(newFiles)
      onFilesSelected(validFiles)

      if (autoUpload && onUpload) {
        // Call handleUpload directly without dependency to avoid circular reference
        const uploadFiles = async (filesToUpload: typeof validFiles) => {
          try {
            setSelectedFiles(prev => 
              prev.map(file => 
                filesToUpload.find(f => f.id === file.id) 
                  ? { ...file, status: 'uploading' as const, progress: 0 }
                  : file
              )
            )
            await onUpload(filesToUpload)
            setSelectedFiles(prev => 
              prev.map(file => 
                filesToUpload.find(f => f.id === file.id)
                  ? { ...file, status: 'completed' as const, progress: 100 }
                  : file
              )
            )
          } catch (error) {
            setSelectedFiles(prev => 
              prev.map(file => 
                filesToUpload.find(f => f.id === file.id)
                  ? { 
                      ...file, 
                      status: 'error' as const, 
                      error: error instanceof Error ? error.message : 'Upload failed'
                    }
                  : file
              )
            )
          }
        }
        uploadFiles(newFiles)
      }
    }
  }, [validateAndProcessFiles, selectedFiles, multiple, onFilesSelected, autoUpload, onUpload])

  // ============================================================================
  // DRAG & DROP HANDLERS
  // ============================================================================

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelection(files)
    }
  }, [disabled, handleFileSelection])

  // ============================================================================
  // UPLOAD HANDLING
  // ============================================================================

  const handleUpload = useCallback(async (filesToUpload?: FileWithPreview[]) => {
    const files = filesToUpload || selectedFiles.filter(f => f.status === 'pending')
    
    if (!onUpload || files.length === 0) return

    setIsUploading(true)

    try {
      // Update status to uploading
      setSelectedFiles(prev => 
        prev.map(file => 
          files.find(f => f.id === file.id) 
            ? { ...file, status: 'uploading' as const, progress: 0 }
            : file
        )
      )

      await onUpload(files)

      // Mark as completed
      setSelectedFiles(prev => 
        prev.map(file => 
          files.find(f => f.id === file.id)
            ? { ...file, status: 'completed' as const, progress: 100 }
            : file
        )
      )

    } catch (error) {
      console.error('Upload failed:', error)
      
      // Mark as error
      setSelectedFiles(prev => 
        prev.map(file => 
          files.find(f => f.id === file.id)
            ? { 
                ...file, 
                status: 'error' as const, 
                error: error instanceof Error ? error.message : 'Upload failed'
              }
            : file
        )
      )
    } finally {
      setIsUploading(false)
    }
  }, [selectedFiles, onUpload])

  // ============================================================================
  // UI ACTIONS
  // ============================================================================

  const handleFileInputClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [disabled])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      handleFileSelection(files)
    }
    // Reset input value to allow selecting the same file again
    if (e.target) {
      e.target.value = ''
    }
  }, [handleFileSelection])

  const removeFile = useCallback((fileId: string) => {
    setSelectedFiles(prev => {
      const file = prev.find(f => f.id === fileId)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.id !== fileId)
    })
  }, [])

  const retryUpload = useCallback((fileId: string) => {
    const file = selectedFiles.find(f => f.id === fileId)
    if (file) {
      handleUpload([file])
    }
  }, [selectedFiles, handleUpload])

  // Cleanup previews on unmount
  React.useEffect(() => {
    return () => {
      selectedFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview)
        }
      })
    }
  }, [selectedFiles])

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        multiple={multiple}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Drop zone */}
      <div
        onClick={handleFileInputClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${disabled 
            ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
            : isDragOver
              ? 'border-primary-500 bg-primary-50 scale-[1.02]'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }
        `}
      >
        <div className="space-y-4">
          {/* Upload icon */}
          <div className={`mx-auto w-12 h-12 ${disabled ? 'text-gray-400' : 'text-gray-500'}`}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 48 48" aria-hidden="true">
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Upload text */}
          <div>
            <p className={`text-lg font-medium ${disabled ? 'text-gray-400' : 'text-gray-900'}`}>
              {isDragOver ? 'Drop files here' : 'Upload images'}
            </p>
            <p className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>
              Drag and drop or click to select files
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')} • Max {maxFileSize}MB • 
              {multiple ? ` Up to ${maxFiles} files` : ' Single file'}
            </p>
          </div>
        </div>
      </div>

      {/* File preview section */}
      {showPreview && selectedFiles.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Selected Files ({selectedFiles.length})</h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {selectedFiles.map((file) => (
              <div key={file.id} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {file.preview && (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* File info overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 text-white text-center space-y-1">
                    <p className="text-xs font-medium truncate px-2">{file.name}</p>
                    <p className="text-xs">{formatFileSize(file.size)}</p>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="absolute top-2 right-2">
                  {file.status === 'pending' && (
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  )}
                  {file.status === 'uploading' && (
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  )}
                  {file.status === 'completed' && (
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  )}
                  {file.status === 'error' && (
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  )}
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removeFile(file.id)}
                  className="absolute top-2 left-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                  disabled={file.status === 'uploading'}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Retry button for failed uploads */}
                {file.status === 'error' && (
                  <button
                    onClick={() => retryUpload(file.id)}
                    className="absolute bottom-2 right-2 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                  >
                    Retry
                  </button>
                )}

                {/* Progress bar for uploading */}
                {file.status === 'uploading' && file.progress !== undefined && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Upload button */}
          {!autoUpload && onUpload && selectedFiles.some(f => f.status === 'pending') && (
            <div className="flex justify-center">
              <button
                onClick={() => handleUpload()}
                disabled={isUploading || disabled}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading...' : `Upload ${selectedFiles.filter(f => f.status === 'pending').length} files`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
