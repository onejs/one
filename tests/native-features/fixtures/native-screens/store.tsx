import { createContext, use, useState, type ReactNode } from 'react'
import type { Entry } from './views'

// the screens' state: plain JavaScript, passed down to native views as props
interface Store {
  entries: Entry[]
  order: string
  setOrder: (order: string) => void
  update: (entry: Entry) => void
  add: (title: string, notes: string) => void
}

const StoreContext = createContext<Store | null>(null)

const seed: Entry[] = ['Groceries', 'Taxes', 'Gym', 'Birthday gift', 'Dentist'].map((title, index) => ({
  id: String(index + 1),
  title,
  notes: index % 2 === 0 ? `Notes for ${title.toLowerCase()}` : '',
  done: index === 2,
}))

export function NativeScreensStore({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState(seed)
  const [order, setOrder] = useState('title')
  const store: Store = {
    entries: [...entries].sort((a, b) =>
      order === 'done' && a.done !== b.done ? Number(a.done) - Number(b.done) : a.title.localeCompare(b.title)
    ),
    order,
    setOrder,
    update: (entry) => setEntries((all) => all.map((item) => (item.id === entry.id ? entry : item))),
    add: (title, notes) => {
      setEntries((all) => [...all, { id: String(Date.now()), title, notes, done: false }])
    },
  }
  return <StoreContext value={store}>{children}</StoreContext>
}

export function useNativeScreensStore(): Store {
  const store = use(StoreContext)
  if (!store) throw new Error('missing NativeScreensStore')
  return store
}
