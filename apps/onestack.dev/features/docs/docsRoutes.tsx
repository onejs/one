export const docsRoutes = [
  {
    pages: [
      { title: 'Introduction', route: '/docs/introduction' },
      { title: 'Installation', route: '/docs/installation' },
      { title: 'Configuration', route: '/docs/configuration' },
      { title: 'Deployment', route: '/docs/guides-deployment' },
      { title: 'Features', route: '/docs/features' },
      { title: 'Status', route: '/docs/status' },
      { title: 'FAQ', route: '/docs/faq' },
      { title: 'Common Issues', route: '/docs/common-issues' },
    ],
  },

  {
    title: 'Development',
    pages: [
      { title: 'Environment', route: '/docs/environment' },
      { title: 'Metro Mode', route: '/docs/metro-mode' },
      { title: 'CLI', route: '/docs/cli' },
    ],
  },

  {
    title: 'Routing',
    pages: [
      { title: 'Overview', route: '/docs/routing' },
      { title: 'Render Modes', route: '/docs/render-modes' },
      { title: 'Exports', route: '/docs/routing-exports' },
      { title: 'Navigation', route: '/docs/routing-navigation' },
      { title: 'Layouts', route: '/docs/routing-layouts' },
      { title: 'Loaders', route: '/docs/routing-loader' },
      { title: 'Middlewares', route: '/docs/routing-middlewares' },
      { title: 'Typed Routes', route: '/docs/routing-typed-routes' },
    ],
  },

  {
    title: 'Layout',
    pages: [
      { title: 'Slot', route: '/docs/components-Slot' },
      { title: 'Stack', route: '/docs/components-Stack' },
      { title: 'Tabs', route: '/docs/components-Tabs' },
      { title: 'Drawer', route: '/docs/components-Drawer' },
      { title: 'Protected', route: '/docs/components-Protected' },
      { title: 'withLayoutContext', route: '/docs/exports-withLayoutContext' },
    ],
  },

  {
    title: 'Components',
    pages: [
      { title: 'Link', route: '/docs/components-Link' },
      { title: 'Head', route: '/docs/components-Head' },
      { title: 'Redirect', route: '/docs/components-Redirect' },
      { title: 'LoadProgressBar', route: '/docs/components-LoadProgressBar' },
      { title: 'ScrollBehavior', route: '/docs/components-ScrollBehavior' },
      { title: 'SafeAreaView', route: '/docs/components-SafeAreaView' },
    ],
  },

  {
    title: 'Hooks',
    pages: [
      { title: 'useRouter', route: '/docs/hooks-useRouter' },
      { title: 'useParams', route: '/docs/hooks-useParams' },
      { title: 'useActiveParams', route: '/docs/hooks-useActiveParams' },
      { title: 'usePathname', route: '/docs/hooks-usePathname' },
      { title: 'useSegments', route: '/docs/hooks-useSegments' },
      { title: 'useLoader', route: '/docs/hooks-useLoader' },
      { title: 'useLoaderState', route: '/docs/hooks-useLoaderState' },
      { title: 'useMatches', route: '/docs/hooks-useMatches' },
      { title: 'useBlocker', route: '/docs/hooks-useBlocker' },
      { title: 'useFocusEffect', route: '/docs/hooks-useFocusEffect' },
      { title: 'useScrollGroup', route: '/docs/hooks-useScrollGroup' },
      { title: 'useNavigation', route: '/docs/hooks-useNavigation' },
      { title: 'useLinkTo', route: '/docs/hooks-useLinkTo' },
      { title: 'useIsFocused', route: '/docs/hooks-useIsFocused' },
    ],
  },

  {
    title: 'Guides',
    pages: [
      { title: 'Authentication', route: '/docs/guides-authentication' },
      { title: 'Build or Run iOS', route: '/docs/guides-ios-native' },
      { title: 'Ship with EAS', route: '/docs/guides-eas' },
      { title: 'MDX for web', route: '/docs/guides-mdx' },
      { title: 'Light and Dark mode', route: '/docs/guides-dark-mode' },
      { title: 'Tamagui', route: '/docs/guides-tamagui' },
      {
        title: 'Migrate from CRA',
        route: '/docs/guides-migrating-create-react-app-cra-to-vite-with-one',
      },
      { title: 'OpenGraph Images', route: '/docs/guides-open-graph' },
    ],
  },

  {
    title: 'Helpers',
    pages: [
      { title: 'redirect', route: '/docs/helpers-redirect' },
      { title: 'getURL', route: '/docs/helpers-getURL' },
      { title: 'isResponse', route: '/docs/helpers-isResponse' },
      { title: 'href', route: '/docs/helpers-href' },
      { title: 'setServerData', route: '/docs/helpers-serverData' },
      { title: 'setResponseHeaders', route: '/docs/helpers-setResponseHeaders' },
      { title: 'watchFile', route: '/docs/helpers-watchFile' },
    ],
  },
]

export const allDocsRoutes = docsRoutes.flatMap((x) => x.pages || [])
export const allNotPending = allDocsRoutes.filter((x) => !x['pending'])
