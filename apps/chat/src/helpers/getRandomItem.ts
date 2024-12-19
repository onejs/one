export const getRandomItem = <T>(items: T[]): T | undefined => {
  if (items.length === 0) return
  const randomIndex = Math.floor(Math.random() * items.length)
  return items[randomIndex]
}
