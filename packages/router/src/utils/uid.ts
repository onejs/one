let id = 0

export function uid() {
  id = (id + 1) % Number.MAX_SAFE_INTEGER
  return `${id}`
}
