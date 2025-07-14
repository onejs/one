# One.js Framework - Complete API Reference

## Overview

One.js is a universal React Native framework that enables building cross-platform applications for web, iOS, and Android from a single codebase. It provides file-based routing, server-side rendering, and a comprehensive development toolchain.

**Repository**: https://github.com/onejs/one  
**Documentation**: https://onestack.dev

## Core Framework (`one`)

### Installation
```bash
npm install one
# or
yarn add one
```

### Router API

#### Navigation Object
```typescript
import { router } from 'one'

// Navigation methods
router.navigate(href, options?)    // Navigate to route
router.push(href, options?)        // Push to history stack
router.replace(href, options?)     // Replace current route
router.back()                      // Go back
router.dismiss(count?)             // Dismiss modal/stack
router.dismissAll()                // Dismiss all modals

// State methods
router.setParams(params)           // Update route params
router.canGoBack()                 // Check if can go back
router.canDismiss()                // Check if can dismiss

// Subscriptions
router.subscribe(listener)         // Subscribe to route changes
router.onLoadState(listener)       // Subscribe to loading state
```

#### Navigation Hooks
```typescript
import { 
  useRouter,
  usePathname,
  useParams,
  useActiveParams,
  useSegments,
  useNavigation,
  useNavigationContainerRef,
  useFocusEffect,
  useIsFocused,
  useLinkTo
} from 'one'

// Basic navigation
const router = useRouter()
const pathname = usePathname()        // Current pathname
const params = useParams<{id: string}>()  // Route params (focused route)
const activeParams = useActiveParams()     // Global params (always updated)
const segments = useSegments()        // Route segments array

// React Navigation integration
const navigation = useNavigation()
const navRef = useNavigationContainerRef()

// Focus effects
useFocusEffect(
  useCallback(() => {
    // Do something when screen is focused
    return () => {
      // Cleanup when unfocused
    }
  }, [])
)

// Check if screen is focused
const isFocused = useIsFocused()

// Programmatic linking
const linkTo = useLinkTo()
linkTo('/profile/123')
```

#### Route Creation
```typescript
import { createRoute, route } from 'one'

// Create typed routes
const userRoute = createRoute('/user/[id]', {
  loader: ({ params }) => fetchUser(params.id)
})

// Simple route helper
export default route({
  loader: async ({ params, request }) => {
    // Server-side data loading
    return { data: await fetchData(params) }
  }
})
```

### Layout Components

#### Stack Navigator
```typescript
import { Stack } from 'one'

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ title: "Home" }} 
      />
      <Stack.Screen 
        name="profile" 
        options={{ 
          title: "Profile",
          headerShown: false 
        }} 
      />
    </Stack>
  )
}
```

#### Tabs Navigator
```typescript
import { Tabs } from 'one'

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: "Home",
          tabBarIcon: ({ color }) => <HomeIcon color={color} />
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: "Profile",
          href: "/profile",  // Custom href
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />
        }} 
      />
    </Tabs>
  )
}
```

#### Custom Navigator
```typescript
import { Navigator, Slot } from 'one'

export default function CustomLayout() {
  return (
    <Navigator>
      <Slot />  {/* Renders current route */}
    </Navigator>
  )
}
```

### Components

#### Link Component
```typescript
import { Link } from 'one'

// Basic link
<Link href="/profile">Go to Profile</Link>

// Typed link with params
<Link href={{ pathname: '/user/[id]', params: { id: '123' } }}>
  User Profile
</Link>

// Custom component as link
<Link href="/profile" asChild>
  <Pressable>
    <Text>Custom Button</Text>
  </Pressable>
</Link>

// Link with options
<Link 
  href="/profile" 
  replace={true}
  className="link-style"
>
  Replace Navigation
</Link>
```

#### Other Components
```typescript
import { 
  Redirect,
  SafeAreaView,
  ErrorBoundary,
  ScrollBehavior,
  LoadProgressBar
} from 'one'

// Redirect
function ProtectedRoute() {
  if (!user) {
    return <Redirect href="/login" />
  }
  return <ProfileContent />
}

// Safe area wrapper
<SafeAreaView style={{ flex: 1 }}>
  <App />
</SafeAreaView>

// Error boundary
<ErrorBoundary fallback={<ErrorScreen />}>
  <App />
</ErrorBoundary>

// Loading indicator
<LoadProgressBar />
```

### Data Loading

```typescript
import { useLoader } from 'one'

// Use loader data in component
function ProfilePage() {
  const { user } = useLoader(profileLoader)
  return <Text>{user.name}</Text>
}

// Loader function
export const profileLoader = async ({ params }) => {
  return { user: await fetchUser(params.id) }
}
```

### Server-Side Features

#### Server Context
```typescript
import { 
  setServerData,
  getServerData,
  setResponseHeaders,
  getServerContext
} from 'one'

// Server-only functions
export async function loader({ request }) {
  // Set data to pass to client
  setServerData('user', await getUser())
  
  // Set response headers
  setResponseHeaders((headers) => {
    headers.set('Cache-Control', 'max-age=3600')
  })
  
  return { data: 'server data' }
}

// Client-side access
function Component() {
  const userData = getServerData('user')
  return <div>{userData?.name}</div>
}
```

#### Head Management
```typescript
import { Head } from 'one'

function Page() {
  return (
    <>
      <Head>
        <title>Page Title</title>
        <meta name="description" content="Page description" />
      </Head>
      <div>Page content</div>
    </>
  )
}
```

#### App Creation
```typescript
import { createApp } from 'one'

export default createApp({
  routes: import.meta.glob('./app/**/*.tsx'),
  routerRoot: 'app',
  flags: {
    // Framework flags
  }
})
```

### Specialized Imports

```typescript
// Vite plugin
import { one } from 'one/vite'

// Server setup
import { serve } from 'one/serve'

// Zero (data fetching)
import { useQuery } from 'one/zero'

// Setup
import 'one/setup'
```


## Build Tooling (`vxrn`)

### Installation
```bash
npm install vxrn
# or
yarn add vxrn
```

### CLI Commands

#### Development Server
```bash
vxrn dev [options]
```
**Options:**
- `--clean` - Clean cache before starting
- `--host <host>` - Development server host
- `--port <port>` - Development server port  
- `--debug-bundle <path>` - Output bundle to temp file for debugging

#### Build
```bash
vxrn build [options]
```
**Options:**
- `--step <step>` - Limit build to specific step
- `--only <pages>` - Limit pages to build
- `--analyze` - Generate bundle analysis report
- `--platform <platform>` - Target platform (web, ios, android)

#### Production Server
```bash
vxrn serve [options]
```
**Options:**
- `--host <host>` - Server host
- `--port <port>` - Server port

#### Native Development
```bash
vxrn prebuild [options]    # Generate native projects
vxrn run:ios              # Run iOS app
vxrn run:android          # Run Android app
```

#### Utilities
```bash
vxrn clean                # Clean build folders
vxrn patch                # Apply package patches
```

### Programmatic API

```typescript
import { 
  build, dev, serve, prebuild, 
  runIos, runAndroid, clean, patch,
  loadEnv, serveStaticAssets 
} from 'vxrn'

// Configuration utilities
import { 
  VXRNOptionsFilled, getOptionsFilled, fillOptions,
  getOptimizeDeps, getBaseViteConfigOnly, getBaseVitePlugins
} from 'vxrn'

// Vite plugin
import { vxrn } from 'vxrn/vite-plugin'
```

### Configuration

```typescript
interface VXRNOptions {
  // Project configuration
  root?: string                    // Project root directory
  mode?: 'development' | 'production'
  
  // Entry points
  entries?: {
    native?: string               // Default: './src/entry-native.tsx'
    web?: string                 // Uses index.html by default
  }
  
  // Build configuration
  build?: {
    server?: boolean | VXRNBuildOptions  // Server-side build settings
    analyze?: boolean                    // Bundle analysis
  }
  
  // Development server
  server?: {
    host?: string
    port?: number
    compress?: boolean
    loadEnv?: boolean             // Load .env files
  }
  
  // Development options
  clean?: boolean | 'vite'        // Clean cache on startup
  debugBundle?: string            // Debug bundle output path
  debug?: string                  // Vite debug options
}
```

### Vite Plugin Integration
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { vxrn } from 'vxrn/vite-plugin'

export default defineConfig({
  plugins: [
    vxrn({
      metro: {
        // Metro bundler options for React Native
      }
    })
  ]
})
```

## Utility Packages

### Safe Area (`@vxrn/safe-area`)

```typescript
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from '@vxrn/safe-area'

// Wrap app with provider
<SafeAreaProvider>
  <App />
</SafeAreaProvider>

// Use safe area view
<SafeAreaView edges={['top', 'bottom']}>
  <Content />
</SafeAreaView>

// Use hook
const insets = useSafeAreaInsets()
```

**Types:**
```typescript
interface EdgeInsets {
  top: number
  right: number
  bottom: number
  left: number
}

type Edge = 'top' | 'right' | 'bottom' | 'left'
type EdgeMode = 'off' | 'additive' | 'maximum'
```

### Color Scheme (`@vxrn/color-scheme`)

```typescript
import { SchemeProvider, useColorScheme, setSchemeSetting } from '@vxrn/color-scheme'

<SchemeProvider>
  <App />
</SchemeProvider>

const [colorScheme, setScheme] = useColorScheme()
setSchemeSetting('dark') // or 'light' or 'system'
```

**Types:**
```typescript
type Scheme = 'light' | 'dark'
type SchemeSetting = 'system' | 'light' | 'dark'
```

### Universal Color Scheme (`@vxrn/universal-color-scheme`)

```typescript
import { useColorScheme, setColorScheme, onColorSchemeChange } from '@vxrn/universal-color-scheme'

const [scheme] = useColorScheme()
setColorScheme('dark')

const unsubscribe = onColorSchemeChange((setting, current) => {
  console.log('Scheme changed:', current)
})
```

### Isomorphic Layout Effect (`@vxrn/use-isomorphic-layout-effect`)

```typescript
import { useIsomorphicLayoutEffect } from '@vxrn/use-isomorphic-layout-effect'

useIsomorphicLayoutEffect(() => {
  // This will be useLayoutEffect on client/native, useEffect on SSR
}, [])
```

### Query String (`@vxrn/query-string`)

```typescript
import { parse, stringify } from '@vxrn/query-string'
// or
import qs from '@vxrn/query-string'

const parsed = parse('?foo=bar&baz=qux')
// { foo: 'bar', baz: 'qux' }

const stringified = stringify({ foo: 'bar', baz: ['qux', 'quux'] })
// 'foo=bar&baz=qux&baz=quux'
```

### URL Parse (`@vxrn/url-parse`)

```typescript
import URL from '@vxrn/url-parse'

const url = new URL('https://example.com/path?query=value')
```

### Resolve (`@vxrn/resolve`)

```typescript
import { resolvePath } from '@vxrn/resolve'

const resolved = resolvePath('some-module', process.cwd())
```


## Build System Packages

### Vite Plugin Metro (`@vxrn/vite-plugin-metro`)

```typescript
import { metroPlugin, type MetroPluginOptions } from '@vxrn/vite-plugin-metro'

// vite.config.ts
export default {
  plugins: [
    metroPlugin({
      mainModuleName: 'src/app',
      babelConfig: {
        presets: ['@babel/preset-react']
      }
    })
  ]
}
```

**Configuration:**
```typescript
type MetroPluginOptions = {
  argv?: MetroYargArguments
  defaultConfigOverrides?: MetroInputConfig | ((defaultConfig: MetroInputConfig) => MetroInputConfig)
  babelConfig?: TransformOptions
  mainModuleName?: string // Override main module name from package.json
}
```

### Vite Native Client (`@vxrn/vite-native-client`)

```typescript
import { client, log } from '@vxrn/vite-native-client'

// Automatically imported in development builds
import '@vxrn/vite-native-client'

// Manual usage
log('info', ['Custom log message', { data: 'value' }])
```

### Vite Native HMR (`@vxrn/vite-native-hmr`)

```typescript
// Automatically imported in development
import '@vxrn/vite-native-hmr'

// The client automatically handles:
// - WebSocket connection to dev server
// - HMR update processing
// - Error overlay display
// - Live reload functionality
```

### Vite Flow (`@vxrn/vite-flow`)

```typescript
import createFlowPlugin from '@vxrn/vite-flow'

// vite.config.ts
export default {
  plugins: [
    createFlowPlugin({
      include: ['**/*.flow.js', '**/*.js'],
      exclude: ['node_modules/**']
    })
  ]
}

// Direct transformation
import { transformFlow } from '@vxrn/vite-flow'
const result = await transformFlow(flowCode, { development: true })
```

### Compiler (`@vxrn/compiler`)

```typescript
import { 
  createVXRNCompilerPlugin,
  configureVXRNCompilerPlugin,
  clearCompilerCache
} from '@vxrn/compiler'

// Configure compiler features
configureVXRNCompilerPlugin({
  enableNativewind: true,
  enableReanimated: true,
  enableCompiler: ['ios', 'android']
})

// vite.config.ts
export default {
  plugins: [
    ...(await createVXRNCompilerPlugin({
      environment: 'ios',
      mode: 'serve',
      production: false,
      transform: ({ id, code, environment }) => {
        if (id.includes('.native.')) {
          return 'babel'  // Use Babel for native files
        }
        return 'swc'  // Use SWC for others
      }
    }))
  ]
}
```

**Configuration:**
```typescript
type Options = {
  environment: Environment  // 'ios' | 'android' | 'ssr' | 'client'
  mode: 'serve' | 'serve-cjs' | 'build'
  forceJSX?: boolean
  noHMR?: boolean
  production?: boolean
  fixNonTypeSpecificImports?: boolean
  transform?: GetTransform
}

type CompilerConfig = {
  enableNativewind?: boolean     // Enable Nativewind CSS
  enableReanimated?: boolean     // Enable Reanimated support
  enableCompiler?: boolean | Environment[]  // Enable React Compiler
  enableNativeCSS?: boolean      // Enable native CSS processing
}
```

## Content and Documentation

### MDX (`@vxrn/mdx`)

```typescript
import { 
  getAllFrontmatter,
  getMDX,
  getMDXBySlug,
  createCodeHighlighter
} from '@vxrn/mdx'

const mdxSource = `
---
title: "My Article"
description: "Article description"
---

# Hello World

This is **bold** text.
`

const { frontmatter, code } = await getMDX(mdxSource)
console.log(frontmatter.title) // "My Article"
console.log(frontmatter.readingTime) // { text: "1 min read", ... }
```

**Types:**
```typescript
type Frontmatter = {
  title: string
  description?: string
  publishedAt?: string
  draft?: boolean
  readingTime?: { text: string; minutes: number; time: number; words: number }
  headings?: { title: string; priority: number; id: string }[]
  // ... additional metadata
}
```

## Project Creation

### Create VXRN (`create-vxrn`)

```bash
# Create new project
npx create-vxrn my-app

# With specific template
npx create-vxrn my-app --template=tamagui

# Show template info
npx create-vxrn --info --template=router
```

**Available Templates:**
- `bare` - Minimal React Native setup
- `tamagui` - With Tamagui UI components
- `router` - With file-based routing

**Programmatic Usage:**
```typescript
import { create } from 'create-vxrn/create'

await create({
  name: 'my-app',
  template: 'tamagui'
})
```

## TypeScript Support

The framework provides comprehensive TypeScript support:

### Route Typing
```typescript
// Auto-generated types based on file structure
type Routes = {
  '/': {}
  '/user/[id]': { id: string }
  '/posts/[...slug]': { slug: string[] }
}

// Typed navigation
router.push('/user/123')  // ✅ Valid
router.push('/invalid')   // ❌ TypeScript error
```

### Loader Typing
```typescript
type LoaderProps<T = {}> = {
  params: T
  request: Request
  context: ServerContext
}

export const loader = async ({ params }: LoaderProps<{ id: string }>) => {
  return { user: await fetchUser(params.id) }
}
```

### Component Props
```typescript
type LinkProps = {
  href: Href
  replace?: boolean
  asChild?: boolean
  className?: string
  children: React.ReactNode
}

type StackScreenOptions = {
  title?: string
  headerShown?: boolean
  presentation?: 'card' | 'modal' | 'transparentModal'
  // ... more options
}
```

## Common Patterns

### File-based Routing Structure
```
app/
├── _layout.tsx          # Root layout
├── index.tsx            # Home page (/)
├── about.tsx            # About page (/about)
├── user/
│   ├── _layout.tsx      # User layout
│   ├── [id].tsx         # User profile (/user/123)
│   └── settings.tsx     # User settings (/user/settings)
├── (auth)/              # Route group
│   ├── _layout.tsx      # Auth layout
│   ├── login.tsx        # Login (/login)
│   └── register.tsx     # Register (/register)
└── +not-found.tsx       # 404 page
```

### Typical Vite Configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { one } from 'one/vite'
import { createVXRNCompilerPlugin } from '@vxrn/compiler'
import { metroPlugin } from '@vxrn/vite-plugin-metro'
import createFlowPlugin from '@vxrn/vite-flow'

export default defineConfig({
  plugins: [
    one(),
    metroPlugin(),
    createFlowPlugin({ include: ['**/*.flow.js'] }),
    ...(await createVXRNCompilerPlugin({
      environment: 'ios',
      mode: 'serve'
    }))
  ]
})
```

### App Entry Point
```typescript
// app/_layout.tsx
import { Stack } from 'one'
import { SafeAreaProvider } from '@vxrn/safe-area'
import { SchemeProvider } from '@vxrn/color-scheme'

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SchemeProvider>
        <Stack>
          <Stack.Screen name="index" options={{ title: "Home" }} />
          <Stack.Screen name="about" options={{ title: "About" }} />
          <Stack.Screen name="user" options={{ headerShown: false }} />
        </Stack>
      </SchemeProvider>
    </SafeAreaProvider>
  )
}
```

### Data Loading Pattern
```typescript
// app/user/[id].tsx
import { useLoader } from 'one'

export const loader = async ({ params }: { params: { id: string } }) => {
  const user = await fetchUser(params.id)
  return { user }
}

export default function UserProfile() {
  const { user } = useLoader(loader)
  
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  )
}
```

This comprehensive API reference covers all the main packages and functionality in the One.js framework. The framework provides a complete solution for building universal React Native applications with strong TypeScript support, modern development tooling, and cross-platform compatibility.
