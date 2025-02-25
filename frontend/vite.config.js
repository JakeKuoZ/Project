import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({ plugins: [react()], server: { proxy: { '/api': 'http://192.168.86.34:5000' } } })
