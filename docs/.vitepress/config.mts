import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'vxrn',
  description: 'React Native, on Vite',
  // base: '/vite-react-native/',

  themeConfig: {
    logo: '/vite-react-native.svg',
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Docs', link: '/get-started' },
    ],

    // sidebar: [
    //   {
    //     text: 'Examples',
    //     items: [
    //       { text: 'Markdown Examples', link: '/markdown-examples' },
    //       { text: 'Runtime API Examples', link: '/api-examples' },
    //     ],
    //   },
    // ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/natew/vite-react-native' }],
  },

  ignoreDeadLinks: 'localhostLinks',
})
