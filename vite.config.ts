import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  
  // Debug: Log loaded environment variables
  console.log('Loaded environment variables:', {
    STRIPE_KEY: env.VITE_STRIPE_PUBLISHABLE_KEY ? 'set' : 'not set',
    SUPABASE_URL: env.VITE_SUPABASE_URL ? 'set' : 'not set',
    SUPABASE_KEY: env.VITE_SUPABASE_ANON_KEY ? 'set' : 'not set'
  });
  
  return {
  server: {
    host: "::",
    port: 8091
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Ensure that all chunks are included in the build
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // Ensure tree-shaking doesn't remove needed routes
      output: {
        manualChunks: undefined
      },
      // Copy netlify.toml to the dist folder
      copy: {
        targets: [
          { src: 'netlify.toml', dest: 'dist' }
        ]
      }
    }
  },
  define: {
    // Make environment variables available to the client
      'import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY': JSON.stringify(env.VITE_STRIPE_PUBLISHABLE_KEY || ''),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
    'import.meta.env.SUPABASE_SERVICE_KEY': JSON.stringify(env.SUPABASE_SERVICE_KEY || '')
  }
};
});
