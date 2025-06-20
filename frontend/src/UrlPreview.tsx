import { useState, useEffect } from 'react'
import type { MusicService } from './utils/musicServices'
import { getMusicService } from './utils/musicServices'

interface UrlPreviewProps {
  url: string
  onUrlChange: (url: string) => void
  placeholder?: string
  disabled?: boolean
}

export function UrlPreview({ url, onUrlChange, placeholder = "Paste a music track URL...", disabled = false }: UrlPreviewProps) {
  const [detectedService, setDetectedService] = useState<MusicService | null>(null)
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    if (!url) {
      setDetectedService(null)
      setIsValid(false)
      return
    }

    try {
      new URL(url)
      setIsValid(true)
    } catch {
      setIsValid(false)
      setDetectedService(null)
      return
    }

    const service = getMusicService(url)
    setDetectedService(service)
  }, [url])

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
              <div className="service-name">{detectedService.name}</div>
              <div className="track-url">{url}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
