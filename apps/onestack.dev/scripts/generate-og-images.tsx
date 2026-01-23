#!/usr/bin/env bun

/**
 * generates og images for blog posts at build time
 * design: yellow decorative stripe at top, logo top-right, title/subtitle bottom-left
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, parse } from 'node:path'

import satori from 'satori'
import sharp from 'sharp'

const cwd = process.cwd()
const blogDir = join(cwd, 'data', 'blog')
const publicDir = join(cwd, 'public')
const ogDir = join(publicDir, 'og')

const OG_WIDTH = 1200
const OG_HEIGHT = 630
// render at 2x for retina quality
const RENDER_SCALE = 2

// one brand colors
const YELLOW = '#F5CA05'
const BLACK = '#000000'
const WHITE = '#FFFFFF'

// extract frontmatter from mdx
function getFrontmatter(content: string): Record<string, string> {
  if (!content.startsWith('---')) return {}
  const endIndex = content.indexOf('---', 3)
  if (endIndex === -1) return {}
  const frontmatter = content.slice(3, endIndex)
  const result: Record<string, string> = {}
  for (const line of frontmatter.split('\n')) {
    const match = line.match(/^(\w+):\s*['"]?([^'"]+)['"]?$/)
    if (match?.[1] && match[2]) {
      result[match[1]] = match[2]
    }
  }
  return result
}

let interRegular: Buffer | null = null
let interBold: Buffer | null = null
let interSemiBold: Buffer | null = null

async function loadFonts() {
  if (!interRegular) {
    const res = await fetch(
      'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.1/files/inter-latin-400-normal.woff'
    )
    interRegular = Buffer.from(await res.arrayBuffer())
  }
  if (!interSemiBold) {
    const res = await fetch(
      'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.1/files/inter-latin-600-normal.woff'
    )
    interSemiBold = Buffer.from(await res.arrayBuffer())
  }
  if (!interBold) {
    const res = await fetch(
      'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.1/files/inter-latin-700-normal.woff'
    )
    interBold = Buffer.from(await res.arrayBuffer())
  }
  return { interRegular, interSemiBold, interBold }
}

// generate the decorative stripe clip path - matches LayoutDecorativeStripe exactly
function getStripeClipPath(amplitude = 0.05) {
  const N = 300
  const cx = 0.5
  const r = 0.5
  const points: string[] = []

  // start from top-left
  points.push('0% 0%')
  // top-right
  points.push('100% 0%')

  // generate curved bottom from right to left (circular arc, same as site)
  for (let i = N - 1; i >= 0; i--) {
    const x = i / (N - 1)
    const dx = x - cx
    const dy = Math.sqrt(Math.max(r * r - dx * dx, 0))
    const dyScaled = (dy / r) * amplitude
    // concave: middle curves up (higher y% = lower on screen in this context)
    const y = 1 - dyScaled
    points.push(`${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`)
  }

  return `polygon(${points.join(', ')})`
}

// one ball svg as data url for satori
const oneBallSvg = `<svg width="590" height="590" viewBox="0 0 590 590" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter x="-93.3%" y="-81.2%" width="286.7%" height="262.4%" filterUnits="objectBoundingBox" id="filter-1">
      <feGaussianBlur stdDeviation="22" in="SourceGraphic"></feGaussianBlur>
    </filter>
    <filter x="-13.5%" y="-46.9%" width="126.9%" height="193.8%" filterUnits="objectBoundingBox" id="filter-2">
      <feGaussianBlur stdDeviation="20" in="SourceGraphic"></feGaussianBlur>
    </filter>
    <filter x="-23.9%" y="-22.5%" width="147.8%" height="145.1%" filterUnits="objectBoundingBox" id="filter-3">
      <feGaussianBlur stdDeviation="41" in="SourceGraphic"></feGaussianBlur>
    </filter>
  </defs>
  <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
    <g fill-rule="nonzero">
      <circle fill="#F5CA05" cx="295" cy="295" r="295"></circle>
      <circle fill="#FFFFFF" cx="311" cy="230" r="110"></circle>
      <path d="M299.32294,286 L339.7951,281.25 C342.598367,279.138889 344,276.324074 344,272.805556 C344,269.287037 342.247958,267 338.743875,265.944444 L329.282851,265.944444 L321.398664,178.333333 C320.347439,173.055556 318.244989,172 312.988864,172 C307.732739,172 305.63029,173.583333 304.053452,175.166667 C302.476615,176.75 302.476615,182.555556 301.951002,183.611111 C301.42539,184.666667 291.438753,188.361111 287.759465,189.944444 C284.080178,191.527778 284.080178,201.555556 287.759465,203.666667 C291.438753,205.777778 298.271715,202.083333 301.42539,204.722222 L307.207127,267.527778 C299.339925,268.871363 294.784617,270.102844 293.541203,271.222222 C291.676081,272.901289 290.91314,274.388889 291.438753,279.666667 C291.789161,283.185185 294.417223,285.296296 299.32294,286 Z" fill="#000000"></path>
      <ellipse fill="#FFFFFF" opacity="0.453031994" filter="url(#filter-1)" transform="translate(200.0089, 137.737) rotate(46) translate(-200.0089, -137.737)" cx="200.008945" cy="137.73703" rx="35.3577818" ry="40.6350626"></ellipse>
      <path d="M521,138 C482.503431,98.2196247 448.723549,71.1799277 419.660355,56.880909 C376.065564,35.432381 347.543959,28.4841486 295.097041,26.8563104 C242.650124,25.2284722 225.598176,37.942459 183.728994,56.880909 C155.816206,69.5065424 119.573208,92.6834255 75,126.411558 C102.798028,89.5392443 133.411045,63.0262947 166.839053,46.8727095 C216.981065,22.6423316 259.733728,10 295.097041,10 C330.460355,10 373.740828,20.0085949 428.633136,46.8727095 C465.228008,64.7821192 496.016963,95.1578827 521,138 Z" fill="#FFFFFF" opacity="0.773065476" filter="url(#filter-2)"></path>
      <path d="M361.057245,44 C431.694309,123.939704 467.935264,174.984191 469.780109,197.133462 C472.547375,230.357369 482.654123,254.819372 459.752272,321.224371 C436.85042,387.629371 415.418677,407.823985 383.224042,440.562863 C361.760952,462.388781 259.019605,478.230174 75,488.087041 C207.883501,556.029014 286.171,590 309.862498,590 C333.553996,590 368.739389,581.727273 415.418677,565.181818 C481.196175,535.021945 525.881624,499.994866 549.475024,460.10058 C584.865123,400.259152 591.955643,340.867492 589.586372,292.181818 C587.2171,243.496144 582.366118,196.314838 555.280613,172.31528 C537.223611,156.315576 472.482488,113.543815 361.057245,44 Z" fill="#000000" opacity="0.0963076637" filter="url(#filter-3)"></path>
    </g>
  </g>
</svg>`

const oneBallDataUrl = `data:image/svg+xml;base64,${Buffer.from(oneBallSvg).toString('base64')}`

// the "one" text logo paths (from Logo.tsx)
const oneLogoTextSvg = `<svg viewBox="0 0 1356 470" xmlns="http://www.w3.org/2000/svg">
  <g fill="#000000" transform="translate(-686, -511) translate(686, 511)">
    <path d="M1153.88676,0 C1289.53097,-0.00598487498 1339.37168,84.9945999 1356.97345,141.995028 C1374.57522,198.995456 1366.29204,281.995998 1238.93805,281.995998 L1238.93805,281.995998 L1052,282 C1073.33333,322 1103.33333,342 1142,342 C1180.66667,342 1224,330.333333 1272,307 L1272,307 L1334,410 C1269,446 1226.77907,462 1145.24503,462 C985.75637,462 921,352.035259 921,232.01763 C921,112 996.510066,0.00694375263 1153.88676,0 Z M1152.25624,112 C1087.51247,112 1059.72682,164.642495 1060.0034,176.93048 C1065.71931,177.101513 1124.38484,176.956964 1236,176.496832 C1236,150.497005 1217,112 1152.25624,112 Z"></path>
    <path d="M618,453.002692 L478,453.002692 L478,452.999429 L476,452.999429 L476,8.99942948 L584,8.99942948 L584,8.99942948 C611.084277,8.99942948 612.779589,30.0927846 615.960519,66.0132312 L634,67.0026924 C670,23 714,9.00000001 765,8.99942934 C839,8.99942948 893,67 893,180.999429 L892.777605,453.810647 L750.792347,453.810647 L751,236.002692 C751,160.002692 719.91488,148.133654 688.870971,148.614649 C665.47564,148.977136 620.72958,149.001026 617.999275,232.238226 L618,453.002692 Z"></path>
    <path d="M225.5,3.99942952 C356.533784,3.99942952 451,108.755636 451,232.979649 C451,357.203662 356.533784,464.99943 225.5,464.99943 C94.4662162,464.99943 0,357.203662 0,232.979649 C0,108.755636 94.4662162,3.99942952 225.5,3.99942952 Z M225,127.49943 C172.532949,127.49943 130,174.509531 130,232.49943 C130,290.489328 172.532949,337.49943 225,337.49943 C277.467051,337.49943 320,290.489328 320,232.49943 C320,174.509531 277.467051,127.49943 225,127.49943 Z"></path>
  </g>
</svg>`

const oneLogoTextDataUrl = `data:image/svg+xml;base64,${Buffer.from(oneLogoTextSvg).toString('base64')}`

async function generateOgImage(
  slug: string,
  frontmatter: Record<string, string>
): Promise<boolean> {
  const ogPath = join(ogDir, `${slug}.png`)
  const force = process.argv.includes('--force')

  // skip if already exists (unless --force)
  if (!force && existsSync(ogPath)) {
    return false
  }

  const fonts = await loadFonts()

  // scale factor for all pixel values (rendered at 2x, then downscaled)
  const s = RENDER_SCALE

  const svg = await satori(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: WHITE,
        fontFamily: 'Inter',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* decorative yellow stripe at top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 100 * s,
          backgroundColor: YELLOW,
        }}
      />
      {/* white oval overlaid to create the curve */}
      <div
        style={{
          position: 'absolute',
          top: 50 * s,
          left: -100 * s,
          right: -100 * s,
          height: 120 * s,
          backgroundColor: WHITE,
          borderRadius: '50%',
        }}
      />

      {/* logo area - top right, below the stripe */}
      <div
        style={{
          position: 'absolute',
          top: 120 * s,
          right: 48 * s,
          display: 'flex',
          alignItems: 'center',
          gap: 16 * s,
        }}
      >
        {/* one ball */}
        <img
          src={oneBallDataUrl}
          width={64 * s}
          height={64 * s}
          style={{
            borderRadius: '50%',
          }}
        />
        {/* one text - using actual logo SVG (viewBox 1356x470, ratio 2.88:1) */}
        <img src={oneLogoTextDataUrl} width={145 * s} height={50 * s} />
      </div>

      {/* content area - bottom left */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          flex: 1,
          padding: 48 * s,
          paddingBottom: 56 * s,
          gap: 12 * s,
        }}
      >
        {/* title */}
        <div
          style={{
            fontSize: 64 * s,
            fontWeight: 700,
            color: BLACK,
            lineHeight: 1.1,
            maxWidth: 900 * s,
            letterSpacing: '-0.5px',
          }}
        >
          {frontmatter.title}
        </div>

        {/* subtitle - narrower for earlier wrap, bumped size */}
        {frontmatter.description && (
          <div
            style={{
              fontSize: 32 * s,
              fontWeight: 400,
              color: 'rgba(0,0,0,0.55)',
              lineHeight: 1.35,
              maxWidth: 700 * s,
            }}
          >
            {frontmatter.description}
          </div>
        )}

        {/* author | date - bumped size */}
        <div
          style={{
            display: 'flex',
            fontSize: 26 * s,
            fontWeight: 500,
            color: 'rgba(0,0,0,0.35)',
            gap: 16 * s,
            marginTop: 12 * s,
          }}
        >
          {frontmatter.by && <span>Nate Wienert</span>}
          {frontmatter.by && frontmatter.publishedAt && <span>·</span>}
          {frontmatter.publishedAt && (
            <span>
              {new Date(frontmatter.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>
    </div>,
    {
      width: OG_WIDTH * RENDER_SCALE,
      height: OG_HEIGHT * RENDER_SCALE,
      fonts: [
        {
          name: 'Inter',
          data: fonts.interRegular!,
          weight: 400,
          style: 'normal' as const,
        },
        {
          name: 'Inter',
          data: fonts.interSemiBold!,
          weight: 600,
          style: 'normal' as const,
        },
        {
          name: 'Inter',
          data: fonts.interBold!,
          weight: 700,
          style: 'normal' as const,
        },
      ],
    }
  )

  // render at 2x then resize to final dimensions for retina quality
  const pngBuffer = await sharp(Buffer.from(svg))
    .resize(OG_WIDTH, OG_HEIGHT)
    .png({ quality: 100 })
    .toBuffer()
  writeFileSync(ogPath, pngBuffer)
  return true
}

console.info()
console.info('🖼️  Generate OG Images')
console.info()

if (!existsSync(blogDir)) {
  console.info('No blog directory found')
  process.exit(0)
}

// ensure directory exists
if (!existsSync(ogDir)) mkdirSync(ogDir, { recursive: true })

const posts = readdirSync(blogDir).filter((f) => f.endsWith('.mdx'))
let ogGenerated = 0

for (const file of posts) {
  const content = readFileSync(join(blogDir, file), 'utf-8')
  const frontmatter = getFrontmatter(content)
  const slug = parse(file).name

  // skip drafts
  const isDraft = frontmatter.draft === 'true'
  if (isDraft) {
    console.info(`  ⊘ ${slug} - draft, skipped`)
    continue
  }

  const generated = await generateOgImage(slug, frontmatter)
  if (generated) {
    ogGenerated++
    console.info(`  ✓ ${slug} - generated`)
  } else {
    console.info(`  ✓ ${slug} - already exists`)
  }
}

console.info()
console.info(`✓ ${ogGenerated} og images generated`)
console.info()
