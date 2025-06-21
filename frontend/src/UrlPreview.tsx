import { useState, useEffect } from 'react'
import type { MusicService } from './utils/musicServices'
import { getMusicService } from './utils/musicServices'

interface TrackMetadata {
    title: string;
    artist?: string;
    thumbnail?: string;
    service: string;
}

interface UrlPreviewProps {
  url: string
  onUrlChange: (url: string) => void
  placeholder?: string
  disabled?: boolean
}

export function UrlPreview({ url, onUrlChange, placeholder = "Paste a music track URL...", disabled = false }: UrlPreviewProps) {
  const [detectedService, setDetectedService] = useState<MusicService | null>(null)
  const [isValid, setIsValid] = useState(false)
  const [metadata, setMetadata] = useState<TrackMetadata | null>(null)
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false)

  useEffect(() => {
    if (!url) {
      setDetectedService(null)
      setIsValid(false)
      setMetadata(null)
      return
    }

    try {
      new URL(url)
      setIsValid(true)
    } catch {
      setIsValid(false)
      setDetectedService(null)
      setMetadata(null)
      return
    }

    const service = getMusicService(url)
    setDetectedService(service)

    // Fetch metadata if we have a valid URL
    if (service) {
      fetchMetadata(url)
    }
  }, [url])

  const fetchMetadata = async (url: string) => {
    setIsLoadingMetadata(true)
    try {
      // For now, we'll fetch metadata from the backend
      // In a real implementation, you might want to add an endpoint for this
      const response = await fetch(`/api/track-metadata?url=${encodeURIComponent(url)}`)
      if (response.ok) {
        const data = await response.json()
        setMetadata(data)
      }
    } catch (error) {
      console.error('Error fetching metadata:', error)
    } finally {
      setIsLoadingMetadata(false)
    }
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUrlChange(e.target.value)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text')
    if (pastedText && pastedText.startsWith('http')) {
      onUrlChange(pastedText)
    }
  }

  return (
    <div className="url-preview-container">
      <div className="url-input-wrapper">
        <input
          type="text"
          value={url}
          onChange={handleUrlChange}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          className={`url-input ${detectedService ? 'has-service' : ''} ${isValid ? 'valid' : url ? 'invalid' : ''}`}
        />
        {detectedService && (
          <div className="service-indicator" style={{ backgroundColor: detectedService.color }}>
            <img 
              src={detectedService.logo} 
              alt={detectedService.name}
              className="service-logo"
            />
            <span className="service-name">{detectedService.name}</span>
          </div>
        )}
      </div>
      
      {url && !isValid && (
        <div className="url-error">
          Please enter a valid URL
        </div>
      )}
      
      {detectedService && isValid && (
        <div className="url-preview">
          <div className="preview-header">
            <img 
              src={detectedService.logo} 
              alt={detectedService.name}
              className="preview-logo"
            />
            <div className="preview-info">
              {isLoadingMetadata ? (
                <div className="track-info">
                  <div className="track-title">Loading track info...</div>
                </div>
              ) : metadata ? (
                <div className="track-info">
                  <div className="track-title">{metadata.title}</div>
                  {metadata.artist && (
                    <div className="track-artist">{metadata.artist}</div>
                  )}
                </div>
              ) : (
                <div className="track-url">{url}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
