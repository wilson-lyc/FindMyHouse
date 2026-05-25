import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '');
  const isTauri = process.env.TAURI === 'true';

  return {
    envDir: '..',
    base: isTauri ? './' : '/',
    plugins: [vue()],
    server: {
      port: Number(env.VITE_PORT) || 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: `http://localhost:${Number(env.PORT) || 3001}`,
          changeOrigin: true
        }
      }
    },
    build: {
      target: isTauri ? 'es2021' : 'modules',
      minify: !isTauri ? 'esbuild' : 'terser',
    }
  };
});
