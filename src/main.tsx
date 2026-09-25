import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css' // این خط فایل استایل‌ها را به کل برنامه تزریق می‌کند
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)