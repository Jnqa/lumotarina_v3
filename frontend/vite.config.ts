import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],

  server: {
    // listen on all addresses so the app is reachable by other devices on the LAN
    host: true
  },
  preview: {
    // same for `npm run preview` after a build
    host: true
  }
})
