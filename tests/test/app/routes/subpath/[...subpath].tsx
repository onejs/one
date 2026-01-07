import { Link, Slot, usePathname } from 'one'
import { View, Text } from 'tamagui'

export async function generateStaticParams() {
  return [
    {
      subpath: '/routes/subpath/some-path',
    },
    {
      subpath: '/routes/subpath/other-path',
    },
    {
      subpath: '/routes/subpath/nested/path',
    },
  ]
}

export default function SubPathPage() {
  return (
    <View>
      <Link href="/routes/subpath/some-path">
        <Text>Go to some-path</Text>
      </Link>
      <Link href="/routes/subpath/other-path">
        <Text>Go to other-path</Text>
      </Link>
      <Link href="/routes/subpath/nested/path">
        <Text>Go to nested/path</Text>
      </Link>
    </View>
  )
}
