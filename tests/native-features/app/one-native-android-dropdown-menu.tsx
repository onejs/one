import { useState } from 'react'
import { One } from 'one'

export default function OneNativeAndroidDropdownMenu() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [picked, setPicked] = useState('none')
  const [boxOpen, setBoxOpen] = useState(false)
  const [size, setSize] = useState('Medium')

  const pick = (next: string) => {
    setPicked(next)
    setMenuOpen(false)
  }

  const chooseSize = (next: string) => {
    setSize(next)
    setBoxOpen(false)
  }

  return (
    <One.Android.Column
      testID="one-native-android-dropdown-menu-screen"
      style={{ flex: 1 }}
      spacing={8}
      composeStyle={{ padding: 16, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.Text
        testID="one-native-android-dropdown-menu-status"
        text={`Menu: ${menuOpen ? 'open' : 'shut'} · Picked: ${picked}`}
      />
      <One.Android.Text
        testID="one-native-android-dropdown-menu-box-status"
        text={`Box: [${size}] · ${boxOpen ? 'open' : 'shut'}`}
      />
      <One.Android.Row spacing={8}>
        <One.Android.Button
          testID="one-native-android-dropdown-menu-decoy"
          label="Decoy"
          variant="text"
        />
      </One.Android.Row>
      <One.Android.Box testID="one-native-android-dropdown-menu-anchor">
        <One.Android.Button
          testID="one-native-android-dropdown-menu-open"
          label="Open menu"
          variant="tonal"
          onPress={() => setMenuOpen(true)}
        />
        <One.Android.DropdownMenu
          testID="one-native-android-dropdown-menu"
          expanded={menuOpen}
          onDismissRequest={() => setMenuOpen(false)}
        >
          <One.Android.DropdownMenuItem
            testID="one-native-android-dropdown-menu-edit"
            text="Edit"
            onClick={() => pick('edit')}
            leadingIcon="edit"
          />
          <One.Android.DropdownMenuItem
            testID="one-native-android-dropdown-menu-share"
            text="Share"
            onClick={() => pick('share')}
            leadingIcon="share"
            trailingIcon="chevron_right"
          />
          <One.Android.DropdownMenuItem
            testID="one-native-android-dropdown-menu-delete"
            text="Delete"
            onClick={() => pick('delete')}
            leadingIcon="delete"
            enabled={false}
          />
        </One.Android.DropdownMenu>
      </One.Android.Box>
      <One.Android.ExposedDropdownMenuBox
        testID="one-native-android-dropdown-menu-box"
        expanded={boxOpen}
        onExpandedChange={setBoxOpen}
        value={size}
        placeholder="Size"
        composeStyle={{ fillMaxWidth: true }}
      >
        {['Small', 'Medium', 'Large'].map((option) => (
          <One.Android.DropdownMenuItem
            key={option}
            testID={`one-native-android-dropdown-menu-size-${option.toLowerCase()}`}
            text={option}
            onClick={() => chooseSize(option)}
          />
        ))}
      </One.Android.ExposedDropdownMenuBox>
    </One.Android.Column>
  )
}
