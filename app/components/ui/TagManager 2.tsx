'use client'

/**
 * TagManager Component
 * 
 * Provides a hashtag/category management interface with:
 * - Predictive search with dropdown suggestions
 * - Add new tags if they don't exist
 * - Remove tags with (x) button
 * - Real-time filtering and search
 * - Customizable appearance and behavior
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export interface Tag {
  id: string
  name: string
  color?: string
}

interface TagManagerProps {
  selectedTags: Tag[]
  onTagsChange: (tags: Tag[]) => void
  availableTags?: Tag[]
  placeholder?: string
  maxTags?: number
  allowNew?: boolean
  className?: string
  disabled?: boolean
  label?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function TagManager({
  selectedTags = [],
  onTagsChange,
  availableTags = [],
  placeholder = "Search or add tags...",
  maxTags = 20,
  allowNew = true,
  className = "",
  disabled = false,
  label = "Tags"
}: TagManagerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [filteredTags, setFilteredTags] = useState<Tag[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ============================================================================
  // SEARCH AND FILTERING
  // ============================================================================

  const filterTags = useCallback((query: string) => {
    if (!query.trim()) {
      setFilteredTags([])
      return
    }

    const queryLower = query.toLowerCase().trim()
    const alreadySelected = selectedTags.map(t => t.id)
    
    // Filter available tags that match the query and aren't already selected
    const filtered = availableTags
      .filter(tag => 
        !alreadySelected.includes(tag.id) && 
        tag.name.toLowerCase().includes(queryLower)
      )
      .slice(0, 10) // Limit to 10 suggestions

    // If allowing new tags and query doesn't exactly match any existing tag
    const exactMatch = availableTags.find(tag => 
      tag.name.toLowerCase() === queryLower
    )
    
    if (allowNew && query.trim() && !exactMatch && !alreadySelected.includes(queryLower)) {
      const newTag: Tag = {
        id: queryLower.replace(/\s+/g, '-'),
        name: query.trim(),
        color: '#3B82F6' // Default blue color
      }
      filtered.unshift(newTag) // Add "Create new" option at the top
    }

    setFilteredTags(filtered)
    setHighlightedIndex(filtered.length > 0 ? 0 : -1)
  }, [availableTags, selectedTags, allowNew])

  useEffect(() => {
    filterTags(searchQuery)
  }, [searchQuery, filterTags])

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleAddTag = useCallback((tag: Tag) => {
    if (selectedTags.length >= maxTags) {
      return
    }

    if (!selectedTags.find(t => t.id === tag.id)) {
      onTagsChange([...selectedTags, tag])
    }
    
    setSearchQuery('')
    setShowDropdown(false)
    setHighlightedIndex(-1)
    
    // Focus back on input
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [selectedTags, onTagsChange, maxTags])

  const handleRemoveTag = useCallback((tagId: string) => {
    onTagsChange(selectedTags.filter(tag => tag.id !== tagId))
  }, [selectedTags, onTagsChange])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    setShowDropdown(true)
  }, [])

  const handleInputFocus = useCallback(() => {
    setShowDropdown(true)
    filterTags(searchQuery)
  }, [searchQuery, filterTags])

  const handleInputBlur = useCallback(() => {
    // Delay hiding dropdown to allow clicking on suggestions
    setTimeout(() => {
      setShowDropdown(false)
      setHighlightedIndex(-1)
    }, 150)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown || filteredTags.length === 0) {
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < filteredTags.length - 1 ? prev + 1 : 0
        )
        break
      
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredTags.length - 1
        )
        break
      
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && filteredTags[highlightedIndex]) {
          handleAddTag(filteredTags[highlightedIndex])
        }
        break
      
      case 'Escape':
        setShowDropdown(false)
        setHighlightedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }, [showDropdown, filteredTags, highlightedIndex, handleAddTag])

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {selectedTags.length > 0 && (
            <span className="text-gray-500">({selectedTags.length}/{maxTags})</span>
          )}
        </label>
      )}

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedTags.map(tag => (
            <div
              key={tag.id}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 border border-primary-200"
            >
              <span>{tag.name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag.id)}
                  className="ml-2 w-4 h-4 rounded-full bg-primary-200 hover:bg-primary-300 flex items-center justify-center text-primary-600 hover:text-primary-800 transition-colors"
                  title={`Remove ${tag.name}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled || selectedTags.length >= maxTags}
          placeholder={
            selectedTags.length >= maxTags 
              ? `Maximum ${maxTags} tags reached` 
              : placeholder
          }
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500 ${
            selectedTags.length >= maxTags ? 'cursor-not-allowed' : ''
          }`}
        />

        {/* Search/Add Icon */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Dropdown Suggestions */}
        {showDropdown && filteredTags.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          >
            {filteredTags.map((tag, index) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleAddTag(tag)}
                className={`w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center justify-between ${
                  index === highlightedIndex ? 'bg-primary-50' : ''
                }`}
              >
                <div className="flex items-center">
                  <span className="text-sm font-medium">{tag.name}</span>
                  {!availableTags.find(t => t.id === tag.id) && (
                    <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                      Create new
                    </span>
                  )}
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-gray-500">
        {allowNew ? 'Type to search existing tags or create new ones. ' : 'Type to search existing tags. '}
        Use ↑↓ arrow keys to navigate, Enter to select.
      </p>
    </div>
  )
}
