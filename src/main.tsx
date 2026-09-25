import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@flaticon/flaticon-uicons/css/regular/rounded.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
