import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import router from './router'
import { AuthProvider } from './contexts/AuthContext'
import { getImageUrl } from './utils/cdnPaths'
import './index.css'

// Set body background image from CDN
document.body.style.backgroundImage = `url('${getImageUrl('background.jpg')}')`

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
)

