import process from 'node:process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import svgr from 'vite-plugin-svgr';
import { visualizer } from "rollup-plugin-visualizer";

// The following are known larger packages or packages that can be loaded asynchronously.
// const individuallyPackages = ['activities', 'github.svg', 'grid.svg'];

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteTsconfigPaths(),
    svgr({
      include: ['**/*.svg'],
      svgrOptions: {
        exportType: 'named',
        namedExport: 'ReactComponent',
        plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
        svgoConfig: {
          floatPrecision: 2,
          plugins: [
            {
              name: 'preset-default',
              params: {
                overrides: {
                  removeTitle: false,
                  removeViewBox: false,
                },
              },
            },
          ],
        },
      },
    }),
    // visualizer({
    //   gzipSize: true,
    //   brotliSize: true,
    //   emitFile: false,
    //   filename: "test.html", //分析图生成的文件名
    //   open:true //如果存在本地服务端口，将在打包后自动展示
    // }),
  ],
  base: process.env.PATH_PREFIX || '/',
  build: {
    manifest: true,
    outDir: './dist', // for user easy to use, vercel use default dir -> dist
    rollupOptions: {
      output: {
        manualChunks: () => {
          // if (id.includes('node_modules')) {
          //   return 'vendors';
          //   // If there will be more and more external packages referenced in the future,
          //   // the following approach can be considered.
          //   // const name = id.split('node_modules/')[1].split('/');
          //   // return name[0] == '.pnpm' ? name[1] : name[0];
          // } else {
          //   for (const item of individuallyPackages) {
          //     if (id.includes(item)) {
          //       return item;
          //     }
          //   }
          // }
          return  {
            // 'react-vendor': ['react', 'react-dom', 'react-router'],
            'mapbox': ['mapbox-gl'],
          }
        },
      },
    },
  },
});
