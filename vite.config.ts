import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss() // این خط موتور گرافیکی را روشن می‌کند
  ],
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // اجازه دسترسی از دامنه پیش‌نمایش محیط توسعه (پروکسی e2b)
    allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1']
  }
})