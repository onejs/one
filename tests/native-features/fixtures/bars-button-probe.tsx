import { Stack } from 'one'

/**
 * The probe toolbar, shared verbatim by the in-tab probe screen and the
 * outside-tabs control route so the captures compare the same bar.
 */
export function ProbeToolbar({
  withSpacer,
  onAction,
}: {
  withSpacer: boolean
  onAction: (action: string) => void
}) {
  return (
    <Stack.Toolbar>
      {withSpacer ? <Stack.Toolbar.Spacer /> : null}
      <Stack.Toolbar.Button
        icon="plus"
        variant="prominent"
        tintColor="#ff2d55"
        accessibilityLabel="Probe action"
        onPress={() => onAction('probe')}
      >
        New
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  )
}
