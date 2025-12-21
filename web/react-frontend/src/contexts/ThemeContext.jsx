import React, { createContext, useContext, useState } from 'react'

const ThemeContext = createContext(null)

export const THEMES = {
  DEFAULT: 'default',
  FANTASY: 'fantasy'
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(THEMES.DEFAULT)

  const toggleTheme = () => {
    setTheme(prevTheme => 
      prevTheme === THEMES.DEFAULT ? THEMES.FANTASY : THEMES.DEFAULT
    )
  }

  const isFantasy = theme === THEMES.FANTASY
  const isDefault = theme === THEMES.DEFAULT

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isFantasy,
    isDefault
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export default ThemeContext

