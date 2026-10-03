// synced image rows reference this app's upload route or its bundled fixture.
export function validateImage(value: string | null | undefined) {
  if (!value) return
  if (!/^\/(api\/file\/image|seed-media)\/[a-zA-Z0-9_-]+\.(jpg|png|webp|gif)$/.test(value)) {
    throw new Error('image must reference an app upload')
  }
}

export function validateText(value: string | null | undefined, max: number) {
  if (value && value.length > max) throw new Error(`text exceeds ${max} characters`)
}
