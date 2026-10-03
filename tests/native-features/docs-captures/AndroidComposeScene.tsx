import { One } from 'one'

const filters = [
  { label: 'Beaches', selected: true },
  { label: 'Hiking', selected: false },
  { label: 'Food', selected: true },
]

// a material 3 card built only from compose nodes: a switch, a slider, filter chips,
// buttons, and a determinate progress bar.
export function AndroidComposeScene() {
  return (
    <One.Android.Card
      style={{ width: 340 }}
      colors={{ containerColor: '#FFFFFF' }}
      composeStyle={{ cornerRadius: 28 }}
    >
      <One.Android.Column spacing={14} composeStyle={{ padding: 20 }}>
        <One.Android.Text text="Trip alerts" fontSize={22} fontWeight="semiBold" />
        <One.Android.Switch label="Price drops" isOn onIsOnChange={() => {}} />
        <One.Android.Slider value={0.6} onValueChange={() => {}} />
        <One.Android.FlowRow horizontalArrangement={{ spacedBy: 8 }}>
          {filters.map((filter) => (
            <One.Android.FilterChip key={filter.label} selected={filter.selected} onClick={() => {}}>
              <One.Android.FilterChip.Label>
                <One.Android.Text text={filter.label} />
              </One.Android.FilterChip.Label>
              {filter.selected ? (
                <One.Android.FilterChip.LeadingIcon>
                  <One.Android.Icon name="check" size={18} />
                </One.Android.FilterChip.LeadingIcon>
              ) : null}
            </One.Android.FilterChip>
          ))}
        </One.Android.FlowRow>
        <One.Android.LinearProgressIndicator progress={0.7} composeStyle={{ fillMaxWidth: true }} />
        <One.Android.Row spacing={8} horizontalArrangement="end" composeStyle={{ fillMaxWidth: true }}>
          <One.Android.Button label="Later" variant="text" onPress={() => {}} />
          <One.Android.Button label="Save" icon="check" onPress={() => {}} />
        </One.Android.Row>
      </One.Android.Column>
    </One.Android.Card>
  )
}
