import React from 'react'
import { Text } from 'react-native'
import { Slot } from 'one'

// import CSS at layout level so it's included in SSR CSS bundle
import '../components/css-a.css'
import '../components/css-b.css'
import '../components/css-c.css'

const text = 'Some text'

export default function Layout() {
  return (
    <>
      <Text testID="layout-text-content">{text}</Text>
      <Slot />
    </>
  )
}
