import { useState } from 'react'

interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  label?: string
  size?: 'small' | 'medium' | 'large'
}

export function NumberInput({ 
  value, 
  onChange, 
  min = 1, 
  max = 10, 
  step = 1, 
  disabled = false,
  label,
  size = 'medium'
}: NumberInputProps) {
  const [isFocused, setIsFocused] = useState(false)

  const handleIncrement = () => {
    if (!disabled && value < max) {
      onChange(value + step)
    }
  }

  const handleDecrement = () => {
    if (!disabled && value > min) {
      onChange(value - step)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || min
    if (newValue >= min && newValue <= max) {
      onChange(newValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      handleIncrement()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      handleDecrement()
    }
  }

  const canIncrement = !disabled && value < max
  const canDecrement = !disabled && value > min

  return (
    <div className={`number-input-container ${size}`}>
      {label && (
        <label className="number-input-label">{label}</label>
      )}
      <div className={`number-input-wrapper ${isFocused ? 'focused' : ''}`}>
        <button
          type="button"
          className={`number-input-btn decrement ${canDecrement ? '' : 'disabled'}`}
          onClick={handleDecrement}
          disabled={!canDecrement}
          aria-label="Decrease value"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        
        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="number-input-field"
          aria-label={label || "Number input"}
        />
        
        <button
          type="button"
          className={`number-input-btn increment ${canIncrement ? '' : 'disabled'}`}
          onClick={handleIncrement}
          disabled={!canIncrement}
          aria-label="Increase value"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
    </div>
  )
} 
