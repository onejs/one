import { useState } from 'react'
import { Platform, ScrollView, Text, View } from 'react-native'
import { One } from 'one'
import { Action, Boundary, Results, useResults } from './realapps-api-report'

export default function Menus() {
  const ios = Platform.OS === 'ios'
  const menuAPI = ios ? 'One.iOS.Menu' : 'One.Android.Menu'
  const contextAPI = ios ? 'One.iOS.ContextMenu' : 'One.Android.ContextMenu'
  const alertAPI = ios ? 'One.iOS.Alert' : 'One.Android.AlertDialog'
  const { results, report } = useResults([menuAPI, contextAPI, alertAPI])
  const [shown, setShown] = useState(false)
  const Menu = ios ? One.iOS.Menu : One.Android.Menu
  const ContextMenu = ios ? One.iOS.ContextMenu : One.Android.ContextMenu
  const items = [{ type: 'action' as const, id: 'hit', title: 'Matrix menu hit' }]
  const selected = (api: string, id: string) =>
    report(api, id === 'hit' ? 'passed' : 'failed', { id })
  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 20 }}>
      <Results results={results} />
      <Boundary api={menuAPI} report={report}>
        <Menu
          accessibilityLabel="Open matrix menu"
          items={items}
          onAction={(id) => selected(menuAPI, id)}
        >
          <View testID="realapps-api-menu-open" style={{ padding: 20 }}>
            <Text>Open matrix menu</Text>
          </View>
        </Menu>
      </Boundary>
      <Boundary api={contextAPI} report={report}>
        <ContextMenu items={items} onAction={(id) => selected(contextAPI, id)}>
          <View testID="realapps-api-context-open" style={{ padding: 20 }}>
            <Text>Hold matrix context</Text>
          </View>
        </ContextMenu>
      </Boundary>
      <Action id="alert-open" onPress={() => setShown(true)}>
        Open matrix alert
      </Action>
      <Boundary api={alertAPI} report={report}>
        {ios ? (
          <One.iOS.Alert
            isPresented={shown}
            onIsPresentedChange={setShown}
            title="Matrix alert"
            message="Exercise native confirmation"
            actions={[{ id: 'hit', label: 'Matrix confirm' }]}
            onAction={(id) => selected(alertAPI, id)}
          />
        ) : (
          <One.Android.AlertDialog
            visible={shown}
            title="Matrix alert"
            message="Exercise native confirmation"
            confirmLabel="Matrix confirm"
            dismissLabel="Cancel"
            onConfirm={() => {
              setShown(false)
              selected(alertAPI, 'hit')
            }}
            onDismiss={() => {
              setShown(false)
              report(alertAPI, 'failed', { dismissed: true })
            }}
          />
        )}
      </Boundary>
    </ScrollView>
  )
}
