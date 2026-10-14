// helper for SEO/social meta attributes

import { Fragment } from 'react'

// absolute in production (ONE_SERVER_URL is set by the deploy), relative in
// dev, which crawlers never see. never "undefined/..." either way.
export const ogImageUrl = (path: string) => `${process.env.ONE_SERVER_URL || ''}${path}`

const DEFAULT_IMAGE = { url: '/og.jpg', width: 1200, height: 630 }

export function HeadInfo({
  title,
  description,
  excerpt,
  openGraph,
}: {
  title?: string
  description?: string
  // meta-only description for pages without one, kept out of the title
  excerpt?: string
  openGraph?: {
    type?: string
    locale?: string
    url?: string
    images?: { url: string; width?: number; height?: number }[]
  }
}) {
  const fullTitle = title?.includes('One') ? title : `${title} | One`
  const metaDescription = description ?? excerpt
  // every page gets a card image: its own when given, else the site default
  const images = openGraph?.images ?? [DEFAULT_IMAGE]

  return (
    <>
      {title && (
        <>
          <title>{description ? `${fullTitle} | ${description}` : fullTitle}</title>
          <meta property="og:title" content={fullTitle} />
        </>
      )}

      {metaDescription && (
        <>
          <meta name="description" content={metaDescription} />
          <meta property="og:description" content={metaDescription} />
        </>
      )}

      {title &&
        images.map((image) => {
          const url = image.url.startsWith('http') ? image.url : ogImageUrl(image.url)
          return (
            <Fragment key={image.url}>
              <meta property="og:image" content={url} />
              <meta property="twitter:image" content={url} />
              {image.width && (
                <meta property="og:image:width" content={`${image.width}`} />
              )}
              {image.height && (
                <meta property="og:image:height" content={`${image.height}`} />
              )}
            </Fragment>
          )
        })}

      {openGraph && (
        <>
          {openGraph.url && (
            <>
              <meta property="og:url" content={openGraph.url} />
              <meta property="og:type" content="website" />
            </>
          )}

          <meta property="og:locale" content={openGraph.locale ?? 'en_US'} />
        </>
      )}
    </>
  )
}
