'use client'

/**
 * TryOnWorkflow Component
 * 
 * Main interface for AI Virtual Try-On workflow that handles:
 * - Clothes and people selection from existing collections
 * - AI try-on generation with progress tracking
 * - Real-time results display and management
 * - Batch processing for multiple combinations
 */

import React, { useState, useCallback, useEffect } from 'react'

// Client-side types for processing status
interface ProcessingStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number // 0-100
  message: string
  estimatedTimeRemaining?: number // seconds
  creditsUsed: number
}

// ============================================================================
// TYPES
// ============================================================================

interface ClothingItem {
  _id: string
  name: string
  imageUrl: string
  thumbnailUrl?: string
  category: {
    id: string
    name: string
  }
  tags: Array<{
    id: string
    name: string
    color?: string
  }>
  lightxUrl?: string
}

interface Person {
  _id: string
  name: string
  nickname?: string
  imageUrl: string
  thumbnailUrl?: string
  tags: Array<{
    id: string
    name: string
    color?: string
  }>
  lightxUrl?: string
}

interface TryOnResult {
  _id?: string
  clothingItem: ClothingItem
  person: Person
  generatedImageUrl: string
  requestId: string
  creditsUsed: number
  processingTimeMs: number
  createdAt: Date
  isFavorite?: boolean
}

interface GenerationProgress {
  clothingId: string
  personId: string
  status: ProcessingStatus
  result?: TryOnResult
  error?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

interface TryOnWorkflowProps {
  onResultGenerated?: (result: TryOnResult) => void
}

export default function TryOnWorkflow({ onResultGenerated }: TryOnWorkflowProps) {
  // State management
  const [clothes, setClothes] = useState<ClothingItem[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [selectedClothes, setSelectedClothes] = useState<ClothingItem[]>([])
  const [selectedPeople, setSelectedPeople] = useState<Person[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress[]>([])
  const [results, setResults] = useState<TryOnResult[]>([])
  const [errors, setErrors] = useState<string[]>([])

  // Settings
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium')
  const [preserveFace, setPreserveFace] = useState(true)
  const [batchMode, setBatchMode] = useState(false)
  const [confirmFullBody, setConfirmFullBody] = useState(false)

  // Backend priority hint for LightX fallback
  const backendPriority = (process.env.NEXT_PUBLIC_TRYON_BACKEND_PRIORITY || 'replicate,lightx').toLowerCase()
  const includesLightX = backendPriority.includes('lightx')

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadClothes = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/clothes?limit=50')
      const data = await response.json()
      
      if (data.success) {
        setClothes(data.data)
      } else {
        setErrors(prev => [...prev, 'Failed to load clothes'])
      }
    } catch (error) {
      setErrors(prev => [...prev, 'Error loading clothes'])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadPeople = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/people?limit=50')
      const data = await response.json()
      
      if (data.success) {
        setPeople(data.data)
      } else {
        setErrors(prev => [...prev, 'Failed to load people'])
      }
    } catch (error) {
      setErrors(prev => [...prev, 'Error loading people'])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load data on mount
  useEffect(() => {
    loadClothes()
    loadPeople()
  }, [loadClothes, loadPeople])

  // ============================================================================
  // SELECTION HANDLERS
  // ============================================================================

  const handleClothingSelect = useCallback((clothing: ClothingItem) => {
    setSelectedClothes(prev => {
      const isSelected = prev.some(c => c._id === clothing._id)
      if (isSelected) {
        return prev.filter(c => c._id !== clothing._id)
      } else {
        return batchMode ? [...prev, clothing] : [clothing]
      }
    })
  }, [batchMode])

  const handlePersonSelect = useCallback((person: Person) => {
    setSelectedPeople(prev => {
      const isSelected = prev.some(p => p._id === person._id)
      if (isSelected) {
        return prev.filter(p => p._id !== person._id)
      } else {
        return batchMode ? [...prev, person] : [person]
      }
    })
  }, [batchMode])

  // ============================================================================
  // TRY-ON GENERATION
  // ============================================================================

  const isCoverallsCategory = useCallback((label?: string) => {
    if (!label) return false
    const v = label.trim().toLowerCase()
    const synonyms = ['coveralls','coverall','overalls','overall','jumpsuit','jump-suit','jump suit']
    return synonyms.includes(v)
  }, [])

  const isCoverallsSelected = selectedClothes.some(c => isCoverallsCategory((c as any).category?.slug || (c as any).category?.name))

  const generateTryOns = useCallback(async () => {
    if (selectedClothes.length === 0 || selectedPeople.length === 0) {
      setErrors(['Please select at least one clothing item and one person'])
      return
    }

    if (isCoverallsSelected && !confirmFullBody) {
      setErrors(['Coveralls require a full-body person photo confirmation'])
      return
    }

    setIsGenerating(true)
    setErrors([])
    setGenerationProgress([])
    
    try {
      const combinations = []
      
      // Create all combinations
      for (const clothing of selectedClothes) {
        for (const person of selectedPeople) {
          combinations.push({ clothing, person })
        }
      }

      console.log(`🎭 Starting ${combinations.length} try-on generations`)

      // Initialize progress tracking
      const initialProgress: GenerationProgress[] = combinations.map(({ clothing, person }) => ({
        clothingId: clothing._id,
        personId: person._id,
        status: {
          status: 'pending',
          progress: 0,
          message: 'Queued for processing...',
          creditsUsed: 0
        }
      }))
      
      setGenerationProgress(initialProgress)

      // Process combinations sequentially to respect rate limits
      const newResults: TryOnResult[] = []
      
      for (let i = 0; i < combinations.length; i++) {
        const { clothing, person } = combinations[i]
        
        try {
          console.log(`🔄 Processing ${i + 1}/${combinations.length}: ${clothing.name} on ${person.name}`)
          
          // Check if we have LightX URLs
          if (!clothing.lightxUrl || !person.lightxUrl) {
            const missingItems = []
            if (!clothing.lightxUrl) missingItems.push(`clothing "${clothing.name}"`)
            if (!person.lightxUrl) missingItems.push(`person "${person.name}"`)
            
            throw new Error(
              `CDN processing required: ${missingItems.join(' and ')} ${missingItems.length === 1 ? 'was' : 'were'} uploaded before CDN integration. ` +
              `Please re-upload ${missingItems.length === 1 ? 'this item' : 'these items'} to enable AI try-on functionality.`
            )
          }

          // Update status to processing
          setGenerationProgress(prev => 
            prev.map(p => 
              p.clothingId === clothing._id && p.personId === person._id
                ? { ...p, status: { status: 'processing', progress: 10, message: 'Submitting to AI...', creditsUsed: 0 } }
                : p
            )
          )

          // Generate try-on via server-side API route
          const response = await fetch('/api/try-on', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              person: {
                _id: person._id,
                name: person.name,
                nickname: person.nickname,
                imageUrl: person.imageUrl,
                lightxUrl: person.lightxUrl
              },
              clothing: {
                _id: clothing._id,
                name: clothing.name,
                imageUrl: clothing.imageUrl,
                lightxUrl: clothing.lightxUrl,
                category: clothing.category
              }
            })
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || `Server error: ${response.status}`)
          }

          const result = await response.json()

          // Create result object
          const tryOnResult: TryOnResult = {
            clothingItem: clothing,
            person: person,
            generatedImageUrl: result.generatedImageUrl,
            requestId: result.requestId,
            creditsUsed: result.creditsUsed,
            processingTimeMs: result.processingTimeMs,
            createdAt: new Date(),
            isFavorite: false
          }

          newResults.push(tryOnResult)
          
          // Update progress with result
          setGenerationProgress(prev => 
            prev.map(p => 
              p.clothingId === clothing._id && p.personId === person._id
                ? { 
                    ...p, 
                    status: { 
                      status: 'completed',
                      progress: 100,
                      message: 'Generation complete!',
                      creditsUsed: result.creditsUsed
                    },
                    result: tryOnResult
                  }
                : p
            )
          )

          // Notify parent component
          if (onResultGenerated) {
            onResultGenerated(tryOnResult)
          }

          // Add delay between generations
          if (i < combinations.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000))
          }

        } catch (error) {
          console.error(`❌ Generation failed for ${clothing.name} on ${person.name}:`, error)
          
          const errorMessage = error instanceof Error ? error.message : 'Generation failed'
          
          setGenerationProgress(prev => 
            prev.map(p => 
              p.clothingId === clothing._id && p.personId === person._id
                ? { 
                    ...p, 
                    status: { 
                      status: 'failed',
                      progress: 0,
                      message: errorMessage,
                      creditsUsed: 2 // Estimate credits charged on failure
                    },
                    error: errorMessage
                  }
                : p
            )
          )
        }
      }

      setResults(prev => [...prev, ...newResults])
      console.log(`✅ Completed ${newResults.length}/${combinations.length} generations`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed'
      setErrors([errorMessage])
      console.error('❌ Try-on generation error:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [selectedClothes, selectedPeople, onResultGenerated])

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const clearSelections = useCallback(() => {
    setSelectedClothes([])
    setSelectedPeople([])
    setErrors([])
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
    setGenerationProgress([])
  }, [])

  const totalCreditsUsed = generationProgress.reduce((total, p) => total + p.status.creditsUsed, 0)
  const completedGenerations = generationProgress.filter(p => p.status.status === 'completed').length
  const failedGenerations = generationProgress.filter(p => p.status.status === 'failed').length

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Virtual Try-On</h1>
        <p className="text-gray-600">
          Select clothes and people to generate AI-powered try-on images
        </p>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-800 mb-2">Errors:</h3>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Settings Panel */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Generation Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as 'low' | 'medium' | 'high')}
              disabled={isGenerating}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="low">Low (Fast)</option>
              <option value="medium">Medium (Balanced)</option>
              <option value="high">High (Best Quality)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Face Preservation</label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={preserveFace}
                onChange={(e) => setPreserveFace(e.target.checked)}
                disabled={isGenerating}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">Preserve original face</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Selection Mode</label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={batchMode}
                onChange={(e) => setBatchMode(e.target.checked)}
                disabled={isGenerating}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">Batch mode (multiple selections)</span>
            </div>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={clearSelections}
              disabled={isGenerating}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Clear Selections
            </button>
          </div>
        </div>
      </div>

      {/* Selection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Clothes Selection */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Select Clothes ({selectedClothes.length})
            </h2>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {clothes.map(clothing => (
                <div
                  key={clothing._id}
                  onClick={() => handleClothingSelect(clothing)}
                  className={`cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                    selectedClothes.some(c => c._id === clothing._id)
                      ? 'border-primary-500 ring-2 ring-primary-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={clothing.thumbnailUrl || clothing.imageUrl}
                    alt={clothing.name}
                    className="w-full h-24 object-cover"
                  />
                  <div className="p-2">
                    <p className="text-xs font-medium truncate">{clothing.name}</p>
                    <p className="text-xs text-gray-500">{clothing.category.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Friends Selection */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Select People ({selectedPeople.length})
            </h2>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {people.map(person => (
                <div
                  key={person._id}
                  onClick={() => handlePersonSelect(person)}
                  className={`cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                    selectedPeople.some(p => p._id === person._id)
                      ? 'border-primary-500 ring-2 ring-primary-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={person.thumbnailUrl || person.imageUrl}
                    alt={person.name}
                    className="w-full h-24 object-cover"
                  />
                  <div className="p-2">
                    <p className="text-xs font-medium truncate">{person.nickname || person.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Coveralls Guidance */}
      {isCoverallsSelected && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 4.93l14.14 14.14M12 2a10 10 0 100 20 10 10 0 000-20z"/></svg>
            <div>
              <p className="text-sm text-amber-800 font-medium">Coveralls selected</p>
              <p className="text-sm text-amber-700">Full-body person photo required (head-to-toe). Garment image should show the complete one-piece suit.</p>
              <label className="mt-2 inline-flex items-center gap-2 text-sm text-amber-900">
                <input type="checkbox" className="rounded border-amber-300 text-amber-600 focus:ring-amber-500" checked={confirmFullBody} onChange={(e) => setConfirmFullBody(e.target.checked)} />
                I confirm my person photo is full-body
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Generation Controls */}
      <div className="flex justify-center">
        <button
          onClick={generateTryOns}
          disabled={isGenerating || selectedClothes.length === 0 || selectedPeople.length === 0 || (isCoverallsSelected && !confirmFullBody)}
          className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3 text-lg font-semibold"
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>
                Generate {selectedClothes.length * selectedPeople.length} Try-On
                {selectedClothes.length * selectedPeople.length > 1 ? 's' : ''}
              </span>
            </>
          )}
        </button>
      </div>

      {/* LightX fallback hint */}
      {includesLightX && (
        <div className="flex justify-center mt-2">
          { (selectedPeople.some(p => !p.lightxUrl) || selectedClothes.some(c => !c.lightxUrl)) && (
            <p className="text-xs text-gray-500">LightX fallback may be unavailable for this selection; Replicate will be attempted first.</p>
          )}
        </div>
      )}

      {/* Generation Progress */}
      {generationProgress.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-blue-900">Generation Progress</h3>
            <div className="text-sm text-blue-700">
              {completedGenerations}/{generationProgress.length} completed
              {failedGenerations > 0 && `, ${failedGenerations} failed`}
              {totalCreditsUsed > 0 && ` • ${totalCreditsUsed} credits used`}
            </div>
          </div>
          
          <div className="space-y-3">
            {generationProgress.map((progress, index) => {
              const clothing = selectedClothes.find(c => c._id === progress.clothingId)
              const person = selectedPeople.find(p => p._id === progress.personId)
              
              return (
                <div key={`${progress.clothingId}-${progress.personId}`} className="bg-white rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {clothing?.name} on {person?.nickname || person?.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {progress.status.status} - {progress.status.progress}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        progress.status.status === 'failed' ? 'bg-red-500' :
                        progress.status.status === 'completed' ? 'bg-green-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${progress.status.progress}%` }}
                    />
                  </div>
                  
                  <p className="text-xs text-gray-600">{progress.status.message}</p>
                  
                  {progress.error && (
                    <p className="text-xs text-red-600 mt-1">Error: {progress.error}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Results Gallery */}
      {results.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Generated Results ({results.length})</h2>
            <button
              onClick={clearResults}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear Results
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((result, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                <img
                  src={result.generatedImageUrl}
                  alt={`${result.clothingItem.name} on ${result.person.name}`}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {result.clothingItem.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    on {result.person.nickname || result.person.name}
                  </p>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{result.processingTimeMs}ms</span>
                    <span>{result.creditsUsed} credits</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
