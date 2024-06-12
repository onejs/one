import fs from 'node:fs'
import { useEffect } from 'react'
import { Text, View } from '@tamagui/core'
import { Link, useLoader } from 'vxs'

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
      <meta name="description" content="This is my blog." />

      {/* <TestPerformance /> */}

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
          params: { user: 'other' },
        }}
      >
        <Text>Go to "other" user</Text>
      </Link>

      <View height={2000} width={20} bg="red" />
    </>
  )
}

const TestPerformance = () => {
  return new Array(2000).fill(0).map((_, i) => {
    return <View key={i} bg="green" w={10} h={10} />
  })
}
