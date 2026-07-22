import { Link, Tabs, useTabs } from 'one'

// a non-config child replaces the headless default on web, and is ignored on
// native where react-navigation renders its own tab bar
function WebTabs() {
  const { tabs, focused } = useTabs()

  return (
    <>
      <nav data-testid="tab-bar">
        {tabs.map((tab) => (
          <Link
            key={tab.name}
            href={tab.href}
            data-testid={`tab-${tab.name}`}
            aria-current={tab.isFocused ? 'page' : undefined}
          >
            {String(tab.options.title ?? tab.name)}
          </Link>
        ))}
      </nav>
      {focused.element}
    </>
  )
}

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <WebTabs />
    </Tabs>
  )
}
