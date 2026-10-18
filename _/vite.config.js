import { defineConfig } from 'vite'
import { resolve } from 'path'

const projectRoot = resolve(__dirname, '..')

export default defineConfig({
  base: '/sudoku/',
  root: projectRoot,
  publicDir: resolve(projectRoot, 'public'),  
  build: {
    target: 'es2020',
    outDir: resolve(projectRoot, '_/dist'),
    assetsDir: 'assets',
    copyPublicDir: true,
    rollupOptions: {
      input: {
        main: resolve(projectRoot, 'index.html')
      },
      output: {
      }
    }
  },
  resolve: {
    alias: {
      'lit': resolve(projectRoot, '_/node_modules/lit/index.js'),
      '@stripe/stripe-js': resolve(projectRoot, '_/node_modules/@stripe/stripe-js/dist/index.js')
    }
  },
  optimizeDeps: {
    include: ['lit', '@stripe/stripe-js']
  }
})
