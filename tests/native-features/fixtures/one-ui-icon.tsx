import { Component, useState, type ComponentProps, type ReactNode } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
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
type IconElements = ComponentProps<typeof One.UI.Icon>['icons']

const androidIcon = (
  testID: string | undefined,
  label: string | undefined,
  size = 24,
  width = size,
  height = size
) => (
  <One.Android.Icon
    name="home"
    size={size}
    testID={testID}
    accessibilityLabel={label}
    style={{ width, height }}
    composeStyle={{ width, height }}
  />
)

const icons = (ios: ReactNode, android: ReactNode) => ({
  ios: ios as IconElements['ios'],
  android: android as IconElements['android'],
})

export default function OneUIIcon() {
  const [invalid, setInvalid] = useState(false)
  const [rejected, setRejected] = useState('')
  return (
    <View
      testID="one-ui-icon-screen"
      style={{ flex: 1, padding: 20, gap: 16, backgroundColor: '#fff' }}
    >
      <Text>One UI Icon runtime</Text>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <One.UI.Icon
          icons={icons(
            image('Icon default'),
            androidIcon('icon-default', 'Icon default')
          )}
        />
        <One.UI.Icon
          icons={icons(
            image('Icon font', { fontSize: 36 }),
            androidIcon('icon-font', 'Icon font', 36)
          )}
        />
        <One.UI.Icon
          icons={icons(
            image('Icon frame', { width: 48, height: 32, fontSize: 24 }),
            androidIcon('icon-frame', 'Icon frame', 24, 48, 32)
          )}
        />
        <One.UI.Icon
          icons={icons(
            <One.iOS.Image
              systemName="square.fill"
              accessibilityLabel="Icon style"
              style={[{ width: 44 }, { height: 28 }]}
            />,
            androidIcon('icon-style', 'Icon style', 24, 44, 28)
          )}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <One.UI.Icon
          icons={icons(
            image('Icon danger', { fontSize: 40 }),
            androidIcon('icon-danger', 'Icon danger', 40)
          )}
          colorRole="danger"
        />
        {Platform.OS === 'android' ? (
          <One.Android.Icon
            name="home"
            size={40}
            testID="icon-reference-danger"
            accessibilityLabel="Reference danger"
            style={{ width: 40, height: 40 }}
            composeStyle={{ width: 40, height: 40, foregroundColor: '#B3261E' }}
          />
        ) : (
          <One.iOS.Image
            systemName="square.fill"
            accessibilityLabel="Reference danger"
            colorRole="danger"
            swiftStyle={{ fontSize: 40, width: 40, height: 40 }}
            style={{ width: 40, height: 40 }}
          />
        )}
        <One.UI.Icon
          icons={icons(
            image('Icon explicit', { fontSize: 40 }),
            androidIcon('icon-explicit', 'Icon explicit', 40)
          )}
          color="#12B85A"
        />
      </View>
      <View
        testID="icon-decoration-frame"
        collapsable={false}
        style={{ width: 24, height: 24 }}
      >
        <One.UI.Icon
          icons={icons(
            <One.iOS.Image systemName="square.fill" testID="icon-decoration" />,
            androidIcon(undefined, undefined)
          )}
        />
      </View>
      <Pressable
        testID="one-ui-icon-invalid"
        accessibilityRole="button"
        onPress={() => {
          if (Platform.OS === 'android') {
            // the android component validates its element before rendering a host.
            try {
              One.UI.Icon({
                icons: {
                  ios: image('Icon invalid'),
                  android: (<View />) as unknown as IconElements['android'],
                },
              })
              setRejected('accepted invalid element')
            } catch (error) {
              setRejected(error instanceof Error ? error.message : String(error))
            }
          } else {
            setInvalid(true)
          }
        }}
        style={{ padding: 10, backgroundColor: '#eee' }}
      >
        <Text>Reject invalid element</Text>
      </Pressable>
      {rejected ? <Text>{`Rejected: ${rejected}`}</Text> : null}
      {invalid ? (
        <Rejection>
          <One.UI.Icon
            icons={
              Platform.OS === 'android'
                ? {
                    ios: image('Icon invalid'),
                    android: (<View />) as unknown as IconElements['android'],
                  }
                : {
                    ios: (<View />) as unknown as IconElements['ios'],
                    android: androidIcon('icon-invalid', 'Icon invalid'),
                  }
            }
          />
        </Rejection>
      ) : null}
    </View>
  )
}
