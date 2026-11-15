// shared schema for generated reference data.
export type DocMember = {
  name: string
  kind: string
  signature: string
  typescript?: string
  comment?: string
  availability?: string
  out?: string[]
}
export type DocType = DocMember & { members: DocMember[]; skipped: DocSkipped[] }
export type DocSkipped = { name: string; reason: string }
export type FrameworkSummary = {
  name: string
  group: string
  summary: string
  types: number
  entries: number
  skipped: number
}
export type FrameworkDoc = FrameworkSummary & {
  sdk: string
  declarations: DocType[]
  globals: DocMember[]
  omissions: DocSkipped[]
}
