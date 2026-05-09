import { usePathname } from 'one'

// the test clicks #gate-login-btn to flip auth state to 'logged-in'.
// mirrors takeout's "Login as Demo" button.
export default function GateLoginPage() {
  const pathname = usePathname()
  return (
    <div id="gate-login-page">
      <h1>Gate Login</h1>
      <span id="gate-login-pathname">{pathname}</span>
      <button
        id="gate-login-btn"
        onClick={() => {
          ;(window as any).__setAuth?.('logged-in')
        }}
      >
        Login
      </button>
    </div>
  )
}
