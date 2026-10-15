import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { expressiveCodeConfig, fileNameToTitle } from '~/features/docs/mdxPlugins'

const sections = ['docs', 'native', 'plans', 'blog'] as const
type Section = (typeof sections)[number]

export const loadDocument = createServerFn({ method: 'GET' })
  .validator((input: { section: Section; slug: string }) => {
    if (!input || typeof input !== 'object' || !sections.includes(input.section) || !/^[a-zA-Z0-9-]+$/.test(input.slug)) {
      throw notFound()
    }
    return input
  })
  .handler(async ({ data }) => {
    const { existsSync } = await import('node:fs')
    const base = `data/${data.section}`
    if (!existsSync(`${base}/${data.slug}.mdx`)) throw notFound()
    const { getMDXBySlug } = await import('@vxrn/mdx-rust')
    const { frontmatter, code } = await getMDXBySlug(base, data.slug, {
      mdastPlugins: [fileNameToTitle],
      expressiveCode: expressiveCodeConfig,
    })
    const { getExcerpt } = await import('~/features/docs/getExcerpt')
    return {
      frontmatter,
      code,
      slug: data.slug,
      excerpt: frontmatter.description ? undefined : getExcerpt(base, data.slug),
    }
  })

export const loadPosts = createServerFn({ method: 'GET' }).handler(async () => {
  const { getAllFrontmatter } = await import('@vxrn/mdx-rust')
  const frontmatters = getAllFrontmatter('data/blog')
    .filter((post) => !post.draft)
    .sort((a, b) => Number(new Date(b.publishedAt || '')) - Number(new Date(a.publishedAt || '')))
  return { frontmatters }
})
