import { useState } from 'react'
import { One } from 'one'
import { View } from 'react-native'

// swiftui grouping views stacked in a card: a group box of labeled rows, an expanded
// disclosure group, and a control group.
export function IosGroupsScene() {
  const [open, setOpen] = useState(true)
  return (
    <View
      style={{
        width: 300,
        borderRadius: 36,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: 'white',
        padding: 18,
      }}
    >
      <One.iOS.VStack spacing={16} style={{ width: 264 }}>
        <One.iOS.GroupBox label="Storage">
          <One.iOS.LabeledContent label="Photos" value="48 GB" systemImage="photo" />
          <One.iOS.LabeledContent label="Apps" value="21 GB" systemImage="square.grid.2x2" />
        </One.iOS.GroupBox>
        <One.iOS.DisclosureGroup label="Advanced" isExpanded={open} onIsExpandedChange={setOpen}>
          <One.iOS.LabeledContent label="Last backup" value="2:00 AM" />
          <One.iOS.LabeledContent label="Keep" value="30 days" />
        </One.iOS.DisclosureGroup>
        <One.iOS.ControlGroup>
          <One.iOS.Button label="Copy" systemImage="doc.on.doc" />
          <One.iOS.Button label="Share" systemImage="square.and.arrow.up" />
        </One.iOS.ControlGroup>
      </One.iOS.VStack>
    </View>
  )
}
