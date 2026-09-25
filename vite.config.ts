import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // relative asset paths: deployable anywhere (Cloudflare/Netlify/GitHub Pages/subfolder)
  base: './',
  plugins: [react(), tailwindcss()],
})