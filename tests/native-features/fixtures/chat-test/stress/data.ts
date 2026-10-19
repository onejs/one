const names = [
  'Ada Lovelace',
  'Grace Hopper',
  'Alan Turing',
  'Linus Torvalds',
  'Margaret Hamilton',
  'Dennis Ritchie',
  'Barbara Liskov',
  'Ken Thompson',
  'Radia Perlman',
  'Donald Knuth',
]
const lines = [
  'Are we still on for lunch tomorrow?',
  'Sent you the photos from the trip.',
  'That build finally went green, thank you!',
  'Can you review my pull request when you get a chance? It touches the router and the loader cache.',
  'Haha, exactly what I was thinking.',
  'Running ten minutes late, start without me.',
  'Did you see the news this morning? Pretty wild.',
  'ok',
  'Let me know what time works for the call and I will block it out on my calendar for the whole afternoon.',
  'Happy birthday! Hope it is a great one.',
]

export type Chat = {
  id: string
  name: string
  preview: string
  time: string
  unread: number
  pinned: boolean
  muted: boolean
}

export const initialChats: Chat[] = Array.from({ length: 200 }, (_, index) => ({
  id: `c${index}`,
  name: `${names[index % names.length]}${index >= names.length ? ` ${Math.floor(index / names.length) + 1}` : ''}`,
  preview: lines[(index * 7) % lines.length],
  time: `${((index * 5) % 12) + 1}:${String((index * 13) % 60).padStart(2, '0')} ${index % 3 ? 'PM' : 'AM'}`,
  unread: index % 6 === 0 ? (index % 4) + 1 : 0,
  pinned: index < 2,
  muted: false,
}))

export type Message = { id: string; mine: boolean; text: string }

export function makeMessages(chatId: string): Message[] {
  const seed = Number(chatId.slice(1))
  return Array.from({ length: 300 }, (_, index) => ({
    id: `m${index}`,
    mine: (index + seed) % 3 === 0,
    text: lines[(index * 3 + seed) % lines.length],
  }))
}

export const calls = Array.from({ length: 12 }, (_, index) => ({
  id: `call${index}`,
  name: names[(index * 3) % names.length],
  detail:
    index % 4 === 0
      ? 'Missed, 2 min ago'
      : index % 2
        ? 'Outgoing, 14 min'
        : 'Incoming, 3 min',
}))

export const contacts = names.map((name, index) => ({
  id: `p${index}`,
  name,
  phone: `+1 555 01${String(index).padStart(2, '0')}`,
}))
