import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'

type AuthState = 'loading' | 'logged-in' | 'logged-out'

const AuthContext = createContext<AuthState>('loading')

export function useAuth() {
  return useContext(AuthContext)
}

export function recordLayoutMount(name: string) {
  if (typeof window === 'undefined') return
  const target = window as typeof window & {
    __oneSpaShellLayoutMounts?: string[]
  }
  target.__oneSpaShellLayoutMounts ??= []
  target.__oneSpaShellLayoutMounts.push(name)
}

// real provider that resolves auth state. mounts later, AFTER the loading
// shell. structurally different from the loading shell so React replaces
// the subtree (mimics 3pc's pattern of swapping the loading
// AuthStatusContext.Provider for a ClerkProvider once dynamically
// imported, which forces the navigation tree to remount).
function ResolvedAuthProvider({
  state,
  children,
}: {
  state: AuthState
  children: ReactNode
}) {
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [Provider, setProvider] = useState<ComponentType<{
    children: ReactNode
  }> | null>(null)
  // runtime state for the auth-gate transition test (see (gate) routes).
  // tests can call window.__setAuth('logged-in') to flip the state at runtime,
  // mimicking takeout's "Login as Demo" button → Redirect → /home/feed flow.
  const [runtimeAuth, setRuntimeAuth] = useState<AuthState>('loading')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as typeof window & {
      __setAuth?: (next: AuthState) => void
    }
    w.__setAuth = (next: AuthState) => setRuntimeAuth(next)

    const url = new URL(window.location.href)
    const target = url.searchParams.get('auth')
    // only swap providers when ?auth= is set -- otherwise this fixture
    // would remount every test and is only meant to expose the spa-shell
    // remount path used by the sibling-route-group regression test.
    if (target !== 'logged-in' && target !== 'logged-out') return
    const state: AuthState = target

    // small async delay so the loading shell hydrates first, then gets
    // replaced by a structurally different provider -- same shape as the
    // ClerkProvider lazy-import in 3pc.
    Promise.resolve().then(() => {
      setProvider(() => (props: { children: ReactNode }) => (
        <ResolvedAuthProvider state={state}>{props.children}</ResolvedAuthProvider>
      ))
    })

    return () => {
      delete w.__setAuth
    }
  }, [])

  if (Provider) {
    return <Provider>{children}</Provider>
  }

  // loading shell -- different element type from ResolvedAuthProvider above,
  // so React unmounts/remounts the children when Provider is set.
  return <AuthContext.Provider value={runtimeAuth}>{children}</AuthContext.Provider>
}
