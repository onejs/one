import { usePathname } from 'one'

export default function LoginPage() {
  const pathname = usePathname()
  return (
    <div id="login-page">
      <h1>Login</h1>
      <span id="page-pathname">{pathname}</span>
    </div>
  )
}
