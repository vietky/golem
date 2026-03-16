import React from 'react'
import ReactDOM from 'react-dom/client'
import SinglePlayerApp from './SinglePlayerApp.jsx'
import { getImageUrl } from './utils/cdnPaths'
import './index.css'

// Set body background image from CDN
document.body.style.backgroundImage = `url('${getImageUrl('background.jpg')}')`

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SinglePlayerApp />
  </React.StrictMode>,
)

