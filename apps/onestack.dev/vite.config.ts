import { tamaguiPlugin } from '@tamagui/vite-plugin'
import type { UserConfig } from 'vite'
import { getAllFrontmatter } from '@vxrn/mdx-rust'
import { one, resolvePath } from 'one/vite'

// drafts stay reachable by url but out of the blog index, rss and sitemap
const draftPosts = getAllFrontmatter('data/blog')
  .filter((x) => x.draft)
  .map((x) => `/blog/${x.slug}`)

export default {
  resolve: {
    alias: [
      {
        find: '@docsearch/react',
        replacement: resolvePath('@docsearch/react'),
      },
      {
        // use lightweight svg for web (~2KB vs ~50KB)
        find: 'react-native-svg',
        replacement: '@tamagui/react-native-svg',
      },
    ],
  },

  optimizeDeps: {
    include: [
      'react-dom',
      '@react-native/normalize-color',
      '@tamagui/web',
      '@tamagui/core',
      'tamagui',
    ],
  },

  ssr: {
    noExternal: true,
    external: ['@vxrn/mdx-rust', 'satteri', 'satteri-expressive-code'],
  },

  define: {
    'process.env.TAMAGUI_DISABLE_NO_THEME_WARNING': '"1"',
  },

  plugins: [
    one({
      react: {
        compiler: process.env.NODE_ENV === 'production',
      },

      alias: {
        web: {
          'react-native-web': '@tamagui/react-native-web-lite',
        },
      },

      web: {
        inlineLayoutCSS: true,
        deploy: 'cloudflare',
        sitemap: {
          baseUrl: 'https://onestack.dev',
          exclude: ['/test', ...draftPosts],
        },
        redirects: [
          {
            source: '/docs',
            destination: '/docs/introduction',
            permanent: true,
          },
          {
            source: '/blog/version-one-rc1',
            destination: '/blog/version-one',
            permanent: true,
          },
          {
            source: '/docs/native-features',
            destination: '/native',
            permanent: true,
          },
        ],
      },

      router: {
        experimental: {
          typedRoutesGeneration: 'runtime',
        },
      },
    }),

    // options live in tamagui.build.ts
    tamaguiPlugin(),
  ],
} satisfies UserConfig
