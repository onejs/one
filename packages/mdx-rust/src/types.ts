export type ImageMeta = {
  width: number
  height: number
  blurDataURL: string
}

export type Heading = { title: string; priority: number; id: string }

export type Frontmatter = {
  title: string
  headings?: Heading[]
  description?: string
  name?: string
  versions?: string[]
  version?: string
  by?: string
  publishedAt?: string
  draft?: boolean
  relatedIds?: string[]
  type?: 'changelog' | string
  readingTime?: { text: string; minutes: number; time: number; words: number }
  poster?: string
  slug: string
  image?: string
  /** image dimensions and blur placeholder, populated if `image` exists and sharp is installed */
  imageMeta?: ImageMeta
  component?: string
  package?: string
  demoName?: string
}
