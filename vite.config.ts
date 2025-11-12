import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

// Read package.json to get version
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path for deployment - change this to your IIS alias name
  base: '/', // Use absolute paths for SPA routing
  define: {
    // Inject version info into the app
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      '@mui/material', 
      '@mui/icons-material',
      'react-swipeable-views'
    ]
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  build: {
    assetsDir: 'assets',
    outDir: 'dist',
    // Cache busting strategies
    rollupOptions: {
      external: [],
      output: {
        // Generate unique filenames for each build
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Better module format for compatibility
        format: 'es',
        // Manual chunks to avoid large bundle
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          router: ['react-router-dom']
        }
      }
    },
    // Clear output directory before build
    emptyOutDir: true,
    // Generate source maps for debugging
    sourcemap: false,
    // Minify for production
    minify: 'esbuild',
    // Fix module resolution issues
    target: 'es2015',
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
  server: {
    port: 5173,
    strictPort: true, // Fail if port is not available instead of trying next port
    open: true, // Auto open browser
    host: true, // Allow external connections
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '387ae8fec03e.ngrok-free.app', // Your ngrok host
      '.ngrok-free.app', // Allow any ngrok-free.app subdomain
      '.ngrok.io', // Allow any ngrok.io subdomain (in case you use paid ngrok)
    ],
  },
})
