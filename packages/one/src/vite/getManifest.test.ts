import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { getManifest } from './getManifest'

describe('getManifest', () => {
  let testDir: string

  beforeEach(() => {
    // Create a temporary test directory
    testDir = join(tmpdir(), `getManifest-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    // Clean up test directory
    rmSync(testDir, { recursive: true, force: true })
  })

  it('should include all routes when no ignoredRouteFiles is provided', () => {
    // Create test route files
    mkdirSync(join(testDir, 'routes'), { recursive: true })
    writeFileSync(join(testDir, 'routes', 'index.tsx'), 'export default function Index() { return null }')
    writeFileSync(join(testDir, 'routes', 'about.tsx'), 'export default function About() { return null }')
    writeFileSync(join(testDir, 'routes', 'contact.test.tsx'), 'export default function ContactTest() { return null }')

    const manifest = getManifest({ routerRoot: join(testDir, 'routes') })

    expect(manifest).toBeDefined()
    expect(manifest?.pageRoutes).toBeDefined()
    
    const routePaths = manifest?.pageRoutes.map(route => route.page) || []
    expect(routePaths).toContain('/index')
    expect(routePaths).toContain('/about')
    expect(routePaths).toContain('/contact.test')
  })

  it('should filter out routes matching ignoredRouteFiles patterns', () => {
    // Create test route files
    mkdirSync(join(testDir, 'routes'), { recursive: true })
    writeFileSync(join(testDir, 'routes', 'index.tsx'), 'export default function Index() { return null }')
    writeFileSync(join(testDir, 'routes', 'about.tsx'), 'export default function About() { return null }')
    writeFileSync(join(testDir, 'routes', 'contact.test.tsx'), 'export default function ContactTest() { return null }')
    writeFileSync(join(testDir, 'routes', 'utils.test.ts'), 'export const utils = {}')

    const manifest = getManifest({ 
      routerRoot: join(testDir, 'routes'), 
      ignoredRouteFiles: ['**/*.test.*'] 
    })

    expect(manifest).toBeDefined()
    expect(manifest?.pageRoutes).toBeDefined()
    
    const routePaths = manifest?.pageRoutes.map(route => route.page) || []
    expect(routePaths).toContain('/index')
    expect(routePaths).toContain('/about')
    expect(routePaths).not.toContain('/contact.test')
    expect(routePaths).not.toContain('/utils.test')
  })

  it('should filter out routes matching multiple ignoredRouteFiles patterns', () => {
    // Create test route files
    mkdirSync(join(testDir, 'routes'), { recursive: true })
    mkdirSync(join(testDir, 'routes', 'admin'), { recursive: true })
    writeFileSync(join(testDir, 'routes', 'index.tsx'), 'export default function Index() { return null }')
    writeFileSync(join(testDir, 'routes', 'about.tsx'), 'export default function About() { return null }')
    writeFileSync(join(testDir, 'routes', 'contact.test.tsx'), 'export default function ContactTest() { return null }')
    writeFileSync(join(testDir, 'routes', 'types.ts'), 'export type User = {}')
    writeFileSync(join(testDir, 'routes', 'admin', 'types.ts'), 'export type Admin = {}')
    writeFileSync(join(testDir, 'routes', 'admin', 'dashboard.tsx'), 'export default function Dashboard() { return null }')

    const manifest = getManifest({ 
      routerRoot: join(testDir, 'routes'), 
      ignoredRouteFiles: ['**/*.test.*', '**/types.ts'] 
    })

    expect(manifest).toBeDefined()
    expect(manifest?.pageRoutes).toBeDefined()
    
    const routePaths = manifest?.pageRoutes.map(route => route.page) || []
    expect(routePaths).toContain('/index')
    expect(routePaths).toContain('/about')
    expect(routePaths).toContain('/admin/dashboard')
    expect(routePaths).not.toContain('/contact.test')
    expect(routePaths).not.toContain('/types')
    expect(routePaths).not.toContain('/admin/types')
  })

  it('should handle nested directory structures with ignored patterns', () => {
    // Create test route files in nested structure
    mkdirSync(join(testDir, 'routes', '(auth)', 'login'), { recursive: true })
    mkdirSync(join(testDir, 'routes', '(auth)', 'register'), { recursive: true })
    mkdirSync(join(testDir, 'routes', '(dashboard)', 'admin'), { recursive: true })

    writeFileSync(join(testDir, 'routes', 'index.tsx'), 'export default function Index() { return null }')
    writeFileSync(join(testDir, 'routes', '(auth)', 'login', 'index.tsx'), 'export default function Login() { return null }')
    writeFileSync(join(testDir, 'routes', '(auth)', 'login', 'E2E.test.tsx'), 'export default function LoginE2E() { return null }')
    writeFileSync(join(testDir, 'routes', '(auth)', 'register', 'index.tsx'), 'export default function Register() { return null }')
    writeFileSync(join(testDir, 'routes', '(auth)', 'register', 'E2E.test.tsx'), 'export default function RegisterE2E() { return null }')
    writeFileSync(join(testDir, 'routes', '(dashboard)', 'admin', 'index.tsx'), 'export default function Admin() { return null }')

    const manifest = getManifest({ 
      routerRoot: join(testDir, 'routes'), 
      ignoredRouteFiles: ['**/E2E.test.*'] 
    })

    expect(manifest).toBeDefined()
    expect(manifest?.pageRoutes).toBeDefined()
    
    const routePaths = manifest?.pageRoutes.map(route => route.page) || []
    expect(routePaths).toContain('/index')
    expect(routePaths).toContain('/(auth)/login/index')
    expect(routePaths).toContain('/(auth)/register/index')
    expect(routePaths).toContain('/(dashboard)/admin/index')
    expect(routePaths).not.toContain('/(auth)/login/E2E.test')
    expect(routePaths).not.toContain('/(auth)/register/E2E.test')
  })

  it('should handle empty ignoredRouteFiles array', () => {
    // Create test route files
    mkdirSync(join(testDir, 'routes'), { recursive: true })
    writeFileSync(join(testDir, 'routes', 'index.tsx'), 'export default function Index() { return null }')
    writeFileSync(join(testDir, 'routes', 'test.test.tsx'), 'export default function Test() { return null }')

    const manifest = getManifest({ 
      routerRoot: join(testDir, 'routes'), 
      ignoredRouteFiles: [] 
    })

    expect(manifest).toBeDefined()
    expect(manifest?.pageRoutes).toBeDefined()
    
    const routePaths = manifest?.pageRoutes.map(route => route.page) || []
    expect(routePaths).toContain('/index')
    expect(routePaths).toContain('/test.test')
  })
})