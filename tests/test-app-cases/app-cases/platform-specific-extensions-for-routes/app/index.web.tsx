import { useState, useEffect } from 'react'
import { View, Text } from 'react-native'

export default function Page() {
  const [foo, setFoo] = useState('')

  // Something that will break native at build time!
  const fileName = (() => {
    return ['some', 'module'].join('-')
  })()
  // Metro will error with `Invalid call at line x: import(importPath)`
  const importPath = `../src/${fileName}`

  useEffect(() => {
    import(importPath)
      .then((mod) => {
        console.info(`Foo from ${importPath} is`, mod.FOO)
        setFoo(mod.FOO)
      })
      .catch((err) => {
        console.error('Error loading module:', err)
      })
  }, [importPath])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ backgroundColor: 'white', color: 'black' }}>
        This is index. web.tsx
      </Text>
      {!!foo && (
        <Text style={{ backgroundColor: 'white', color: 'black' }}>
          Foo from {importPath} is {foo}
        </Text>
      )}
    </View>
  )
}
