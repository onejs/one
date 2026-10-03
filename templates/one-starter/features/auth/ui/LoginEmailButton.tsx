import { Link } from '~/interface/app/Link'
import { Button } from '~/interface/buttons/Button'
import { Icons } from '~/interface/icons'
import type { Href } from 'one'

// one brands route hrefs, but this static route is backed by app/auth/signup/[method].tsx.
const emailSignupHref = '/auth/signup/email' as Href

export function LoginEmailButton() {
  return (
    <Link href={emailSignupHref} asChild>
      <Button render="a" size="lg" width="100%" icon={<Icons.Mail size={18} />}>
        Continue with Email
      </Button>
    </Link>
  )
}
