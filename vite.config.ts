import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';
import ssrPlugin from 'vite-ssr-components/plugin';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    cloudflare({
      configPath: process.env.WRANGLER_CONFIG || './wrangler.jsonc'
    }),
    ssrPlugin(),
    tailwindcss()
  ],
  publicDir: 'public',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    fs: { allow: ['..'] }
  }
});
