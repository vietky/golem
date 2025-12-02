import React, { createContext, useContext, useState } from 'react'

const MobileLayoutContext = createContext()

export const useMobileLayout = () => {
  const context = useContext(MobileLayoutContext)
  if (!context) {
    throw new Error('useMobileLayout must be used within MobileLayoutProvider')
  }
  return context
}

export const MobileLayoutProvider = ({ children }) => {
  const [activePanel, setActivePanel] = useState(null) // 'hand', 'resources', 'opponents', null
  const [isHandExpanded, setIsHandExpanded] = useState(false)
  const [isResourceExpanded, setIsResourceExpanded] = useState(false)

  const togglePanel = (panelName) => {
    if (activePanel === panelName) {
      setActivePanel(null)
    } else {
      setActivePanel(panelName)
    }
  }

  const closeAllPanels = () => {
    setActivePanel(null)
    setIsHandExpanded(false)
    setIsResourceExpanded(false)
  }

  const value = {
    activePanel,
    setActivePanel,
    togglePanel,
    isHandExpanded,
    setIsHandExpanded,
    isResourceExpanded,
    setIsResourceExpanded,
    closeAllPanels,
  }

  return (
    <MobileLayoutContext.Provider value={value}>
      {children}
    </MobileLayoutContext.Provider>
  )
}
