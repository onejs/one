import { Text, View } from 'react-native'
import { Link } from 'vxs'

export async function loader() {
  return {
    hello: 'world',
  }
}

export default function HomePage() {
  // suspending here is breaking native
  // const data = useLoader(loader)

  // useEffect(() => {
  //   fetch('/hello')
  //     .then((res) => res.json())
  //     .then((x) => console.log('got', x))
  // }, [])

  return (
    <>
      <View>{/* <Text>Hello {data.hello}</Text> */}</View>

      <Link
        href={{
          pathname: '/user/[user]',
          params: { user: 'other' },
        }}
      >
        <Text>Go to "other" user</Text>
      </Link>
    </>
  )
}
