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
  }
})