// Initialize debug logger FIRST to set up console filtering
import './utils/debugLogger.js';

import React from 'react'
import ReactDOM from 'react-dom/client'
import AppRouter from './AppRouter.jsx'
import './styles/index.css'
import './styles/modal-base.css'  // After Tailwind for proper cascade priority

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
)