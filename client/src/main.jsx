import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.jsx'
import { StoreProvider } from './store.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
