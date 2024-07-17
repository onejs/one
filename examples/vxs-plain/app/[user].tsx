import { Text, View } from 'react-native'
import { Link, useGlobalSearchParams, useLoader } from 'vxs'

type UserPath = {
  user: string
}

type UserProps = {
  hello: string
}

export async function generateStaticParams(): Promise<UserPath[]> {
  return [{ user: 'unique-string-hi' }, { user: 'two' }, { user: 'other' }]
}

export async function loader({ params }: { params: UserPath }) {
  console.info('user loader params', params)
  return {
    hello: `${params.user}`,
  }
}

export default function User(props: UserProps) {
  const params = useGlobalSearchParams()
  const data = useLoader(loader)

  return (
    <View>
      <Text>User: {params?.user}</Text>
      <Text>props: {JSON.stringify(props || null)}</Text>
      <Text>data: {JSON.stringify(data || null)}</Text>

      <Link href="/">Go home</Link>

      <Link
        href={{
          pathname: '/[...spread]',
          params: { spread: [Date.now(), 'other'] },
        }}
      >
        Go to multi-level user
      </Link>
      <Link
        href={{
          pathname: '/[user]',
          params: { user: params.user },
        }}
      >
        Go to same user
      </Link>
      <Link
        href={{
          pathname: '/[user]',
          params: { user: Date.now() },
        }}
      >
        Go to posts
      </Link>
      <Link
        replace
        href={{
          pathname: '/[user]',
          params: { user: Date.now() },
        }}
      >
        Go to posts (replace)
      </Link>
      <Link
        href={{
          pathname: '/other',
        }}
      >
        Go to "other"
      </Link>
    </View>
  )
}
