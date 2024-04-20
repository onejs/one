import { Head, Link } from '@vxrn/expo-router'
import { Text, View } from '@tamagui/core'
import { useEffect } from 'react'

export default () => {
  useEffect(() => {
    fetch('/hello')
      .then((res) => res.text())
      .then((x) => console.log('got', x))
  }, [])

  return (
    <>
      <Head>
        <meta name="description" content="This is my blog." />
      </Head>

      <View>
        <Text color="blue">Hi from home</Text>
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

export function generateStaticProps() {
  return {
    hello: 'world',
  }
}
