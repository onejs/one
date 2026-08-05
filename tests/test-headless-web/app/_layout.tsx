import { Presentations, Stack, type SheetPresentationProps } from 'one'

// a presentation component is an ordinary component, so hooks work inside it
function TestSheet({
  open,
  onOpenChange,
  options,
  screen,
  children,
}: SheetPresentationProps) {
  return (
    <aside data-testid="sheet-chrome" data-open={String(open)} data-screen={screen.name}>
      <header data-testid="sheet-title">{String(options.title ?? '')}</header>
      <button type="button" data-testid="sheet-close" onClick={() => onOpenChange(false)}>
        close
      </button>
      {children}
    </aside>
  )
}

export default function Layout() {
  return (
    <Presentations web={{ sheet: TestSheet }}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Home' }} />
        <Stack.Screen name="about" options={{ title: 'About' }} />
        <Stack.Screen name="(tabs)" options={{ title: 'Tabs' }} />
        <Stack.Screen name="(kept)" options={{ title: 'Kept' }} />
        <Stack.Screen
          name="compose"
          options={{ title: 'Compose', presentation: 'sheet' }}
        />
      </Stack>
    </Presentations>
  )
}
