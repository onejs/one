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
  console.log('render home')
  const data = useLoader(loader)
  console.log('got data', data)

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

const TestPerformance = () => {
  return new Array(2000).fill(0).map((_, i) => {
    return <View key={i} bg="green" w={10} h={10} />
  })
}
