import { memo, useState } from 'react'
import { PlatformColor, Text, View } from 'react-native'
import { One, type SFSymbolName } from 'one'

const Symbols = memo(function Symbols({
  large,
  changed,
  tinted,
}: {
  large: boolean
  changed: number
  tinted: boolean
}) {
  return (
    <View
      testID="symbol-row"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 24, height: 60 }}
    >
      <One.macOS.Image
        testID="symbol-folder"
        systemName={
          changed === 2
            ? ('one.invalid.symbol' as SFSymbolName)
            : changed
              ? 'star.fill'
              : 'folder'
        }
        size={large ? 32 : 16}
        tintColor={tinted ? '#cc3300' : undefined}
        accessibilityLabel="Project folder"
      />
      <One.macOS.Image
        testID="symbol-branch"
        systemName="arrow.triangle.branch"
        size={12}
        tintColor={PlatformColor('secondaryLabelColor')}
      />
      <One.macOS.Image
        testID="symbol-model"
        systemName="cpu"
        size={14}
        tintColor="#3366cc"
        accessibilityLabel="Model"
      />
      <One.macOS.Image
        testID="symbol-feed"
        systemName="bubble.left.and.bubble.right"
        size={16}
        tintColor={PlatformColor('labelColor')}
      />
      {(
        ['terminal', 'sidebar.left', 'paperclip', 'xmark', 'chevron.right'] as const
      ).map((systemName) => (
        <One.macOS.Image
          key={systemName}
          testID={`symbol-${systemName}`}
          systemName={systemName}
          size={large ? 32 : 16}
        />
      ))}
      <One.macOS.Image
        testID="symbol-transparent"
        systemName="square.fill"
        tintColor="transparent"
      />
      <One.macOS.Image
        testID="symbol-fit"
        systemName="folder.fill"
        size={16}
        style={{ width: large ? 64 : 40, height: 20 }}
        tintColor="#cc3300"
      />
    </View>
  )
})

export function SymbolImages() {
  const [mounted, setMounted] = useState(true)
  const [large, setLarge] = useState(false)
  const [tinted, setTinted] = useState(false)
  const [changed, setChanged] = useState(0)
  return (
    <View
      style={{
        padding: 16,
        gap: 8,
        backgroundColor: PlatformColor('windowBackgroundColor'),
      }}
    >
      <Text style={{ color: PlatformColor('labelColor') }}>
        AFTER Native SF Symbol images
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <One.macOS.Button
          testID="symbol-mount"
          title={mounted ? 'Unmount images' : 'Mount images'}
          onPress={() => setMounted(!mounted)}
        />
        <One.macOS.Button
          testID="symbol-size"
          title="Resize images"
          onPress={() => setLarge(!large)}
        />
        <One.macOS.Button
          testID="symbol-change"
          title="Change symbol"
          onPress={() => setChanged((changed + 1) % 3)}
        />
        <One.macOS.Button
          testID="symbol-tint"
          title="Change tint"
          onPress={() => setTinted(!tinted)}
        />
      </View>
      {mounted && <Symbols large={large} changed={changed} tinted={tinted} />}
      <Text
        testID="symbol-state"
        style={{ color: PlatformColor('labelColor') }}
      >{`mounted ${mounted} large ${large} changed ${changed}`}</Text>
    </View>
  )
}
