// helper for SEO/social meta attributes

import { Fragment } from 'react'

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

      {openGraph && (
        <>
          {openGraph.url && (
            <>
              <meta property="og:url" content={openGraph.url} />
              <meta property="og:type" content="website" />
            </>
          )}

          {openGraph.images?.map((image) => {
            return (
              <Fragment key={image.url}>
                <meta property="og:image" content={image.url} />
                <meta property="twitter:image" content={image.url} />
                {image.width && (
                  <meta property="og:image:width" content={`${image.width}`} />
                )}
                {image.height && (
                  <meta property="og:image:height" content={`${image.height}`} />
                )}
              </Fragment>
            )
          })}

          <meta property="og:locale" content={openGraph.locale ?? 'en_US'} />
        </>
      )}
    </>
  )
}
