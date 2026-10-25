import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { One, router } from 'one'
import { Pressable, Text, View } from 'react-native'

const ShellContext = createContext({ commands: 0, last: 'none', tabPresses: 0, countTabPress: () => {}, blocked: false, toggleBlocked: () => {} })

export function ShellProvider({ children }: { children: ReactNode }) {
  const [commands, setCommands] = useState(0)
  const [last, setLast] = useState('none')
  const [tabPresses, setTabPresses] = useState(0)
  const [blocked, setBlocked] = useState(false)
  useEffect(() => {
    One.linux.AppCommands.configure({
      bindings: [
        { id: 'increment', key: 'ctrl-k', context: '!Input' },
        { id: 'input', key: 'ctrl-k', context: 'Input' },
      ],
      menus: [{ label: 'Actions', items: [
        { kind: 'action', id: 'increment', label: 'Count command' },
        { kind: 'separator' },
        { kind: 'submenu', label: 'Navigate', items: [{ kind: 'action', id: 'detail', label: 'Open detail' }] },
      ] }],
    })
    return One.linux.AppCommands.addListener((id) => {
      setLast(id)
      setCommands((count) => count + 1)
      if (id === 'detail') router.push('/detail')
    })
  }, [])
  return <ShellContext.Provider value={{ commands, last, tabPresses, countTabPress: () => setTabPresses((count) => count + 1), blocked, toggleBlocked: () => setBlocked((value) => !value) }}>{children}</ShellContext.Provider>
}

export function useShell() { return useContext(ShellContext) }

export function ShellStatus() {
  const { commands, last, tabPresses } = useContext(ShellContext)
  return <Text style={text}>{`Window commands ${commands}; last ${last}\nTab presses ${tabPresses}`}</Text>
}

export function Page({ title, children }: { title: string; children?: ReactNode }) {
  return <View style={{ flex: 1, padding: 28, gap: 18, backgroundColor: '#fff' }}>
    <Text style={{ ...text, fontSize: 30 }}>{title}</Text>
    <ShellStatus />
    {children}
  </View>
}

export function Action({ title, onPress }: { title: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={{ alignSelf: 'flex-start', backgroundColor: '#e1edfc', padding: 12 }}>
    <Text style={text}>{title}</Text>
  </Pressable>
}

export const text = { fontSize: 18, color: '#182739' }
