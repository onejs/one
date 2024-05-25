import { Head, Link, useLoader } from 'vxs'
import { Text, View } from 'tamagui'
import { useEffect } from 'react'
import fs from 'node:fs'

export async function loader() {
  // testing import shaking:
  fs.read

  return {
    hello: 'world',
  }
}

export default function HomePage() {
  const data = useLoader(loader)

  useEffect(() => {
    fetch('/hello')
      .then((res) => res.json())
      .then((x) => console.log('got', x))
  }, [])

  return (
    <>
      {/* TODO breaking in ssr */}
      {typeof window !== 'undefined' && (
        <Head>
          <meta name="description" content="This is my blog." />
        </Head>
      )}

      <View>
        <Text color="blue">Hi from home222</Text>
      </View>

      <View>
        <Text fontSize={30} color="blue">
          data: {JSON.stringify(data, null, 2)}
        </Text>
      </View>

      <Link
        href={{
          pathname: '/[user]',
          params: { user: 'other' },
        }}
      >
        <Text>Go to "other"</Text>
      </Link>
    </>
  )
}
