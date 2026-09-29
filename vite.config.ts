import { defineConfig, Plugin } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

/**
 * Strips Make-specific version suffixes from import specifiers.
 * e.g. 'sonner@2.0.3' → 'sonner', '@radix-ui/react-slot@1.1.2' → '@radix-ui/react-slot'
 */
function makeCompatPlugin(): Plugin {
  const versionedImport = /^((?:@[^/@]+\/)?[^/@]+)@[\d.]+(.*)$/;

  return {
    name: 'make-compat',
    enforce: 'pre',
    resolveId(id) {
      // Strip version suffix: pkg@x.y.z or @scope/pkg@x.y.z
      const m = id.match(versionedImport);
      if (m) return this.resolve(m[1] + (m[2] || ''));

      // Stub out Make-only virtual modules
      if (id === 'figma:foundry-client-api') return '\0figma-stub';
      if (id.startsWith('figma:asset/')) return '\0figma-asset:' + id;
    },
    load(id) {
      if (id === '\0figma-stub') return 'export default {}';
      // figma:asset/ imports — return empty string so image simply doesn't render
      if (id.startsWith('\0figma-asset:')) return 'export default ""';
    },
  };
}

/**
 * Serve /embed/<id> from embed.html in dev, mirroring the Netlify rewrite in
 * public/_redirects. (/embed.js is a different path and is left alone.)
 */
function embedDevRewrite(): Plugin {
  return {
    name: 'embed-dev-rewrite',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url && /^\/embed\/[^/?]+/.test(req.url)) {
          const q = req.url.indexOf('?');
          req.url = '/embed.html' + (q >= 0 ? req.url.slice(q) : '');
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    makeCompatPlugin(),
    embedDevRewrite(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/app'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        // The embeddable widget: its own tiny page, no app shell
        embed: path.resolve(__dirname, 'embed.html'),
      },
    },
  },
})
