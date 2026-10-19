// deterministic fake chats and messages, so every run scrolls the same content

const first = [
  'Ava',
  'Ben',
  'Chloe',
  'Dev',
  'Elena',
  'Felix',
  'Gia',
  'Hugo',
  'Iris',
  'Jonah',
  'Kira',
  'Leo',
  'Maya',
  'Noah',
  'Olive',
  'Priya',
  'Quinn',
  'Rosa',
  'Sam',
  'Tara',
]
const last = [
  'Adams',
  'Brooks',
  'Chen',
  'Diaz',
  'Evans',
  'Fischer',
  'Garcia',
  'Hart',
  'Ito',
  'Jones',
  'Kim',
  'Lopez',
  'Moreau',
  'Nguyen',
  'Okafor',
  'Patel',
]
const groups = [
  'Design crit',
  'Weekend hikes',
  'Family',
  'Release train',
  'Book club',
  'Climbing',
  'Apartment 4B',
  'Launch war room',
]
const phrases = [
  'are we still on for tomorrow?',
  'sent the photos from saturday',
  'I pushed a fix, can you take a look when you get a sec',
  'haha yes',
  'running ten minutes late, sorry!',
  'the build is green again',
  'did anyone grab the keys from the front desk? I think I left them on the counter next to the coffee machine',
  'ok',
  'let me check and get back to you',
  'that restaurant was incredible, we have to go back with everyone before the season ends',
  'voice message',
  'can you send me the doc',
  'thanks!!',
  'what time does it start',
  'I disagree a little, the second option scales better once we add more rooms, and it keeps the cost flat',
]
export const palette = [
  '#f97316',
  '#0ea5e9',
  '#22c55e',
  '#a855f7',
  '#ef4444',
  '#eab308',
  '#14b8a6',
  '#ec4899',
]

// a small linear congruential generator, seeded per list
function random(seed: number) {
  let state = seed % 2147483647 || 1
  return () => {
    state = (state * 48271) % 2147483647
    return state / 2147483647
  }
}

export interface Chat {
  id: number
  name: string
  preview: string
  time: string
  unread: number
  muted: boolean
  pinned: boolean
  color: string
}

export interface Message {
  id: number
  mine: boolean
  text: string
  time: string
  // first of a run of messages from the same side
  head: boolean
}

function clock(minutes: number) {
  const hour = Math.floor(minutes / 60) % 24
  const minute = minutes % 60
  return `${hour}:${String(minute).padStart(2, '0')}`
}

export function chats(count: number): Chat[] {
  const next = random(7)
  return Array.from({ length: count }, (_, index) => {
    const group = next() < 0.15
    const name = group
      ? groups[Math.floor(next() * groups.length)]!
      : `${first[Math.floor(next() * first.length)]} ${last[Math.floor(next() * last.length)]}`
    return {
      id: index + 1,
      name,
      preview: phrases[Math.floor(next() * phrases.length)]!,
      time:
        index < 30 ? clock(1439 - index * 37) : `${(index % 28) + 1}/${(index % 12) + 1}`,
      unread: next() < 0.3 ? Math.floor(next() * 120) + 1 : 0,
      muted: next() < 0.12,
      pinned: index < 3,
      color: palette[index % palette.length]!,
    }
  })
}

export function messages(chat: number, count: number): Message[] {
  const next = random(chat * 7919)
  let mine = false
  return Array.from({ length: count }, (_, index) => {
    const switched = next() < 0.4
    if (switched) mine = !mine
    const text =
      next() < 0.2
        ? `${phrases[Math.floor(next() * phrases.length)]} ${phrases[Math.floor(next() * phrases.length)]}`
        : phrases[Math.floor(next() * phrases.length)]!
    return {
      id: index + 1,
      mine,
      text,
      time: clock(480 + index),
      head: switched || index === 0,
    }
  })
}

export function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
}
