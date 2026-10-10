import { useState } from 'react'
import { One } from 'one'

export default function OneNativeAndroidChips() {
  const [assistClicks, setAssistClicks] = useState(0)
  const [inputSelected, setInputSelected] = useState(false)
  const [suggestionClicks, setSuggestionClicks] = useState(0)
  const [disabledClicks, setDisabledClicks] = useState(0)

  return (
    <One.Android.Column
      testID="one-native-android-chips-screen"
      style={{ flex: 1 }}
      spacing={16}
      composeStyle={{ padding: 16, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.AssistChip
        testID="one-native-android-assist-chip"
        colors={{ containerColor: '#d5e8ff', labelColor: '#102030' }}
        elevation={2}
        border={{ width: 2, color: '#1c4587' }}
        onClick={() => setAssistClicks((value) => value + 1)}
      >
        <One.Android.AssistChip.Label>
          <One.Android.Text text="Assist chip" testID="one-native-android-assist-chip-label" />
        </One.Android.AssistChip.Label>
        <One.Android.AssistChip.LeadingIcon>
          <One.Android.Icon name="add" accessibilityLabel="Add icon" testID="one-native-android-assist-chip-leading" />
        </One.Android.AssistChip.LeadingIcon>
        <One.Android.AssistChip.TrailingIcon>
          <One.Android.Icon name="arrow_forward" accessibilityLabel="Forward icon" testID="one-native-android-assist-chip-trailing" />
        </One.Android.AssistChip.TrailingIcon>
      </One.Android.AssistChip>
      <One.Android.InputChip
        testID="one-native-android-input-chip"
        selected={inputSelected}
        colors={{ selectedContainerColor: '#b6e7cc', selectedLabelColor: '#123524' }}
        onClick={() => setInputSelected((value) => !value)}
      >
        <One.Android.InputChip.Label>
          <One.Android.Text text="Input chip" testID="one-native-android-input-chip-label" />
        </One.Android.InputChip.Label>
        <One.Android.InputChip.Avatar>
          <One.Android.Icon name="person" accessibilityLabel="Person avatar" testID="one-native-android-input-chip-avatar" />
        </One.Android.InputChip.Avatar>
        <One.Android.InputChip.TrailingIcon>
          <One.Android.Icon name="close" accessibilityLabel="Close icon" testID="one-native-android-input-chip-trailing" />
        </One.Android.InputChip.TrailingIcon>
      </One.Android.InputChip>
      <One.Android.SuggestionChip
        testID="one-native-android-suggestion-chip"
        colors={{ containerColor: '#fff1cb', labelColor: '#503d00' }}
        onClick={() => setSuggestionClicks((value) => value + 1)}
      >
        <One.Android.SuggestionChip.Label>
          <One.Android.Text text="Suggestion chip" testID="one-native-android-suggestion-chip-label" />
        </One.Android.SuggestionChip.Label>
        <One.Android.SuggestionChip.Icon>
          <One.Android.Icon name="lightbulb" accessibilityLabel="Suggestion icon" testID="one-native-android-suggestion-chip-icon" />
        </One.Android.SuggestionChip.Icon>
      </One.Android.SuggestionChip>
      <One.Android.SuggestionChip
        testID="one-native-android-suggestion-chip-disabled"
        enabled={false}
        onClick={() => setDisabledClicks((value) => value + 1)}
      >
        <One.Android.SuggestionChip.Label>
          <One.Android.Text text="Disabled suggestion" />
        </One.Android.SuggestionChip.Label>
      </One.Android.SuggestionChip>
      <One.Android.Text
        testID="one-native-android-chips-status"
        text={`Assist: ${assistClicks} · Input: ${inputSelected ? 'selected' : 'off'} · Suggestion: ${suggestionClicks} · Disabled: ${disabledClicks}`}
      />
    </One.Android.Column>
  )
}
