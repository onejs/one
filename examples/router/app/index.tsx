import { Head, Link, useLoader } from '@vxrn/router'
import { Text, View } from 'tamagui'
import { useEffect } from 'react'
import fs from 'node:fs'

export function loader() {
  // testing import shaking:
  fs.read

  return {
    hello: 'world',
  }
}

export default () => {
  const data = useLoader(loader)

  useEffect(() => {
    fetch('/hello')
      .then((res) => res.text())
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
        <Text color="blue">Hi from home</Text>
      </View>

      <View>
        <Text fontSize={30} color="blue">
          data: {JSON.stringify(data, null, 2)}
        </Text>
      </View>

      <Link
        href={{
          pathname: '/[user]',
          params: { user: 'abc' },
        }}
      >
        <Text>Go to "other"</Text>
      </Link>
    </>
  )
}
