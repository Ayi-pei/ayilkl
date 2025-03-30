import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    root: resolve(__dirname, './'),
    publicDir: resolve(__dirname, './public'),
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      // 增加块大小警告限制
      chunkSizeWarningLimit: 1000,
      // 配置代码分割策略
      rollupOptions: {
        output: {
          manualChunks: {
            // 将 React 相关库打包到一个块中
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // 将 Ant Design 相关库打包到一个块中
            'vendor-antd': ['antd', '@ant-design/icons'],
            // 将其他第三方库打包到一个块中
            'vendor-other': [
              'emoji-picker-react', 
              'date-fns', 
              'nanoid', 
              'qrcode.react', 
              'react-qrcode-logo',
              'zustand',
              'immer',
              '@supabase/supabase-js',
              'crypto-js'
            ]
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src')
      }
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    css: {
      postcss: {
        // 内联 PostCSS 配置，不使用外部配置文件
        plugins: []
      }
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true
        }
      }
    },
    // 定义环境变量替换
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    }
  };
});