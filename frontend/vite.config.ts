import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '');

  return {
    envDir: '..',
    plugins: [vue()],
    server: {
      port: Number(env.VITE_PORT) || 5173,
      proxy: {
        '/api': {
          target: `http://localhost:${Number(env.PORT) || 3001}`,
          changeOrigin: true
        }
      }
    }
  };
});
