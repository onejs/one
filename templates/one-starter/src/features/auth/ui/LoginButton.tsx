import { useAuth } from '~/features/auth/client/authClient'
import { Link } from '~/interface/app/Link'
import { Button } from '~/interface/buttons/Button'
export const LoginButton = ({ listItem }: { listItem?: boolean }) => {
  const { loginText, loginLink } = useAuth()
  return (
    <Link href={loginLink} asChild>
      <Button>{loginText}</Button>
    </Link>
  )
}
