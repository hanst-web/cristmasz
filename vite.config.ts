import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Tambahkan baris base di bawah ini sesuai nama repositori Anda
  base: '/cristmasz/', 
})
