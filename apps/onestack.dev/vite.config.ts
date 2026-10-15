import { tamaguiPlugin } from '@tamagui/vite-plugin'
import { getAllFrontmatter } from '@vxrn/mdx-rust'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { auditWebBundle } from './scripts/audit-web-bundle.ts'

const pages = ['/', '/blog', '/native', '/test', ...['docs', 'native', 'plans', 'blog'].flatMap(section =>
  getAllFrontmatter(`data/${section}`).map(({ slug }) => `/${section}/${slug.replace(new RegExp(`^${section}/`), '')}`)
)]
const drafts = getAllFrontmatter('data/blog').filter(post => post.draft).map(post => `/blog/${post.slug.replace(/^blog\//, '')}`)

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    dedupe: ['react', 'react-dom'],
    alias: [{ find: 'react-native-svg', replacement: '@tamagui/react-native-svg' }],
  },
  optimizeDeps: {
    include: ['react-native-svg', '@vxrn/mdx-rust/client', '@docsearch/react', 'react-dom', '@react-native/normalize-color', '@tamagui/web', '@tamagui/core', 'tamagui'],
  },
  ssr: {
    noExternal: [/^@tamagui\//, 'tamagui', '@vxrn/color-scheme'],
    external: ['@vxrn/mdx-rust', 'satteri', 'satteri-expressive-code'],
  },
  define: {
    'process.env.TAMAGUI_DISABLE_NO_THEME_WARNING': '"1"',
    'process.env.TAMAGUI_TARGET': '"web"',
    'process.env.ONE_SERVER_URL': JSON.stringify(process.env.ONE_SERVER_URL || ''),
  },
  environments: {
    client: { define: { 'process.env.VITE_ENVIRONMENT': '"client"' } },
    ssr: { define: { 'process.env.VITE_ENVIRONMENT': '"ssr"' } },
  },
  plugins: [
    auditWebBundle(),
    tanstackStart({
      pages: pages.map(path => ({ path, sitemap: { exclude: path === '/test' || drafts.includes(path) } })),
      prerender: { enabled: true, crawlLinks: false, autoStaticPathsDiscovery: false, failOnError: true, retryCount: 0, concurrency: 1 },
      sitemap: { host: 'https://onestack.dev' },
      server: { build: { inlineCss: { enabled: true } } },
    }),
    react({ compiler: process.env.NODE_ENV === 'production' }),
    tamaguiPlugin(),
  ],
})
