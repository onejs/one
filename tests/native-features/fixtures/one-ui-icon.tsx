import { Component, useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { One } from 'one'

class Rejection extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: '' }
  static getDerivedStateFromError(error: Error) {
    return { error: error.message }
  }
  render() {
    return this.state.error ? (
      <Text>{`Rejected: ${this.state.error}`}</Text>
    ) : (
      this.props.children
    )
  }
}

const image = (label: string, swiftStyle = {}) => (
  <One.iOS.Image
    systemName="square.fill"
    accessibilityLabel={label}
    swiftStyle={swiftStyle}
  />
)
const icons = (ios: ReactNode) => ({
  ios: ios as ReturnType<typeof image>,
  android: <One.Android.Icon name="home" />,
})

export default function OneUIIcon() {
  const [invalid, setInvalid] = useState(false)
  return (
    <View
      testID="one-ui-icon-screen"
      style={{ flex: 1, padding: 20, gap: 16, backgroundColor: '#fff' }}
    >
      <Text>One UI Icon runtime</Text>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <One.UI.Icon icons={icons(image('Icon default'))} />
        <One.UI.Icon icons={icons(image('Icon font', { fontSize: 36 }))} />
        <One.UI.Icon
          icons={icons(image('Icon frame', { width: 48, height: 32, fontSize: 24 }))}
        />
        <One.UI.Icon
          icons={icons(
            <One.iOS.Image
              systemName="square.fill"
              accessibilityLabel="Icon style"
              style={[{ width: 44 }, { height: 28 }]}
            />
          )}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <One.UI.Icon
          icons={icons(image('Icon danger', { fontSize: 40 }))}
          colorRole="danger"
        />
        <One.iOS.Image
          systemName="square.fill"
          accessibilityLabel="Reference danger"
          colorRole="danger"
          swiftStyle={{ fontSize: 40, width: 40, height: 40 }}
          style={{ width: 40, height: 40 }}
        />
        <One.UI.Icon
          icons={icons(image('Icon explicit', { fontSize: 40 }))}
          color="#12B85A"
        />
      </View>
      <View testID="icon-decoration-frame" style={{ width: 24, height: 24 }}>
        <One.UI.Icon
          icons={icons(
            <One.iOS.Image systemName="square.fill" testID="icon-decoration" />
          )}
        />
      </View>
      <Pressable
        testID="one-ui-icon-invalid"
        accessibilityRole="button"
        onPress={() => setInvalid(true)}
        style={{ padding: 10, backgroundColor: '#eee' }}
      >
        <Text>Reject invalid element</Text>
      </Pressable>
      {invalid ? (
        <Rejection>
          <One.UI.Icon icons={icons(<View />)} />
        </Rejection>
      ) : null}
    </View>
  )
}
