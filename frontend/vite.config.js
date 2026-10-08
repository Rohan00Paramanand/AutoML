import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isDev = command === 'serve';

  return {
    plugins: [react()],

    server: {
      port: 5173,
      host: true,
      // Dev-only proxy: forwards /api calls to the local FastAPI server
      proxy: isDev
        ? {
            '/api': {
              target: 'http://127.0.0.1:8000',
              changeOrigin: true,
              secure: false,
              ws: true,
            },
          }
        : undefined,
      warmup: {
        clientFiles: [
          './src/main.jsx',
          './src/App.jsx',
          './src/components/Header.jsx',
          './src/components/DataSetupTab.jsx',
          './src/components/ResultsTab.jsx',
          './src/components/ChatTab.jsx',
        ],
      },
    },

    // Expose VITE_API_URL to the client bundle (set in Render's env vars)
    // In development it falls back to '' which causes /api to be proxied above.
    define: {
      __API_BASE__: JSON.stringify(process.env.VITE_API_URL || ''),
    },

    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'framer-motion',
        'recharts',
        'lucide-react',
        'canvas-confetti',
        'clsx',
        'tailwind-merge',
      ],
    },

    build: {
      target: 'esnext',
      minify: 'esbuild',
      // Emit source maps for production debugging (optional — remove to keep bundle smaller)
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'ui-motion': ['framer-motion', 'canvas-confetti'],
            'charts-vendor': ['recharts'],
            'icons-vendor': ['lucide-react'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
  };
})
