import React from 'react'
import { createLogger } from '../utils/logger'
import { useTheme, THEMES } from '../contexts/ThemeContext'

const logger = createLogger('ThemeToggleButton');

const ThemeToggleButton = () => {
  const { theme, toggleTheme } = useTheme()
  const isFantasy = theme === THEMES.FANTASY

  logger.debug('Current theme:', theme)

  return (
    <button
      onClick={() => {
        toggleTheme()
      }}
      style={{
        position: 'fixed',
        top: '8px',
        left: '8px',
        zIndex: 99999,
        padding: '8px',
        borderRadius: '50%',
        border: '2px solid',
        borderColor: isFantasy ? '#f59e0b' : '#a855f7',
        backgroundColor: isFantasy ? '#92400e' : '#7c3aed',
        color: 'white',
        fontSize: '16px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.target.style.transform = 'scale(1.1)'
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'scale(1)'
      }}
      title={isFantasy ? 'Switch to Default' : 'Switch to Fantasy'}
    >
      {isFantasy ? '⬅️' : '✨'}
    </button>
  )
}

export default ThemeToggleButton
