import { Link, useGlobalSearchParams, useLoader } from '@vxrn/router'
import { Text, View } from 'tamagui'

type UserPath = {
  user: string
}

type UserProps = {
  hello: string
}

export async function generateStaticParams(): Promise<UserPath[]> {
  return [{ user: 'one' }, { user: 'two' }]
}

export async function loader({ params }: { params: UserPath }) {
  console.log('retunring', params)
  return {
    hello: `${params.user}`,
  }
}

export default function User(props: UserProps) {
  console.log('load user')
  const params = useGlobalSearchParams()
  console.log('params', params)
  const data = useLoader(loader)
  console.log('data', data)

  return (
    <View>
      <View>
        <Text>User: {params?.user}</Text>
        <Text>props: ${JSON.stringify(props || null)}</Text>
        <Text>data: ${JSON.stringify(data || null)}</Text>
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
    </View>
  )
}
