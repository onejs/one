import { H1 } from 'tamagui'
import { UserGuard, useUser } from '~/features/user/useUser'

export default function AccountPage() {
  const { data } = useUser()

  return (
    <>
      <UserGuard>
        <H1>Welcome</H1>
      </UserGuard>
    </>
  )
}
