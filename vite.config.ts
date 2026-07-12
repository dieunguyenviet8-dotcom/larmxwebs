import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
declare const process: { env: Record<string, string | undefined> };
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  // The BAT launcher supplies a fresh temp directory on every run. This
  // avoids EPERM errors when Windows keeps stale optimizer files locked.
  cacheDir: process.env.LARMX_VITE_CACHE || '.vite-cache',
});
