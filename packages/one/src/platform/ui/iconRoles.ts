export const iconColorRoles = [
  'primary',
  'secondary',
  'tertiary',
  'accent',
  'danger',
] as const

export type IconColorRole = (typeof iconColorRoles)[number]
