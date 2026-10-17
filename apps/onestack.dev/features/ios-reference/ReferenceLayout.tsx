import './reference.css'
import { Link, Slot, usePathname } from 'one'
import { useState } from 'react'
import { Button, Input, Paragraph, SizableText, View, XStack, YStack } from 'tamagui'
import { TopNav } from '~/components/TopNav'
import { OneLogo } from '~/features/brand/Logo'
import index from '~/data/ios-reference/index.json'

export const referenceURL = (framework: string, type?: string) =>
  `/ios-reference/${encodeURIComponent(framework)}${type ? `/${encodeURIComponent(type)}` : ''}`
const groups = index.groups
let searchRequest: Promise<[string, string][]> | undefined

export function ReferenceLayout() {
  const pathname = usePathname()
  const [query, setQuery] = useState('')
  const [names, setNames] = useState<[string, string][]>([])
  const [error, setError] = useState(false)
  const [searching, setSearching] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const loadNames = async () => {
    if (names.length) return
    setSearching(true)
    setError(false)
    try {
      searchRequest ??= fetch('/ios-reference/search.json').then((r) => {
        if (!r.ok) throw new Error('Search unavailable')
        return r
          .json()
          .then((data: Record<string, string[]>) =>
            Object.entries(data).flatMap(([framework, names]) =>
              names.map((name): [string, string] => [framework, name])
            )
          )
      })
      setNames(await searchRequest)
    } catch {
      searchRequest = undefined
      setError(true)
    } finally {
      setSearching(false)
    }
  }
  const matches = query.trim()
    ? names
        .filter(([, name]) => name.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 30)
    : []
  return (
    <>
      <TopNav />
      <div className="ios-reference-shell">
        <aside className="ios-reference-sidebar" aria-label="iOS API reference">
          <div className="ios-reference-logo">
            <Link href="/" aria-label="One home">
              <OneLogo size={0.55} />
            </Link>
          </div>
          <YStack gap="3">
            <SizableText size="2" fontWeight="700" color="color10">
              IOS API REFERENCE
            </SizableText>
            <Link href="/ios-reference">All frameworks</Link>
            <Link href="/docs/guides-ios-apis">Calling iOS APIs ↗</Link>
            <Input
              aria-label="Search iOS type names"
              placeholder="Search type names…"
              value={query}
              onFocus={loadNames}
              onChangeText={(value) => {
                setQuery(value)
                void loadNames()
              }}
              size="3"
            />
            <div aria-live="polite">
              {query &&
                (error ? (
                  <Paragraph size="2">
                    Search could not load. Focus the field to try again.
                  </Paragraph>
                ) : searching ? (
                  <Paragraph size="2">Loading type names…</Paragraph>
                ) : (
                  <>
                    <Paragraph size="2" color="color10">
                      {matches.length
                        ? `${matches.length === 30 ? 'First 30' : matches.length} matches`
                        : 'No types found'}
                    </Paragraph>
                    <YStack gap="2" marginTop="2">
                      {matches.map(([framework, name]) => (
                        <Link
                          key={`${framework}.${name}`}
                          href={referenceURL(framework, name) as any}
                        >
                          <span className="ios-search-name">{name}</span>
                          <small className="ios-search-framework">{framework}</small>
                        </Link>
                      ))}
                    </YStack>
                  </>
                ))}
            </div>
            <div className="ios-framework-navigation">
              <Button
                className="ios-framework-toggle"
                aria-expanded={expanded}
                aria-controls="ios-frameworks"
                onPress={() => setExpanded(!expanded)}
              >
                Browse frameworks {expanded ? '−' : '+'}
              </Button>
              <nav
                id="ios-frameworks"
                className={expanded ? 'is-expanded' : ''}
                aria-label="Frameworks"
              >
                {groups.map((group) => (
                  <details
                    key={group}
                    open={index.frameworks.some(
                      (f) => f.group === group && pathname.includes(`/${f.name}`)
                    )}
                  >
                    <summary>{group}</summary>
                    <YStack gap="2" paddingLeft="3" paddingVertical="2">
                      {index.frameworks
                        .filter((f) => f.group === group)
                        .map((f) => (
                          <Link
                            key={f.name}
                            href={referenceURL(f.name) as any}
                            aria-current={
                              pathname === referenceURL(f.name) ? 'page' : undefined
                            }
                          >
                            {f.name}
                          </Link>
                        ))}
                    </YStack>
                  </details>
                ))}
              </nav>
            </div>
            <Paragraph className="ios-reference-snapshot" size="2" color="color10">
              Generated from iOS SDK {index.sdk}. Coverage reflects the bindings in this
              SDK snapshot.
            </Paragraph>
          </YStack>
        </aside>
        <main className="ios-reference-main">
          <Slot />
        </main>
      </div>
    </>
  )
}

export function ReferenceHeader({
  title,
  summary,
  group,
}: {
  title: string
  summary?: string
  group?: string
}) {
  return (
    <YStack gap="3" marginBottom="7">
      <SizableText color="color10" size="2" fontWeight="700">
        {group || 'ONE NATIVE'} · IOS API REFERENCE
      </SizableText>
      <View render="h1" className="ios-reference-title">
        {title}
      </View>
      {summary && (
        <Paragraph size="5" color="color11" maxWidth={720}>
          {summary}
        </Paragraph>
      )}
    </YStack>
  )
}

export function Coverage({
  entries,
  skipped,
  types,
}: {
  entries: number
  skipped: number
  types?: number
}) {
  const total = entries + skipped
  return (
    <XStack gap="5" flexWrap="wrap" marginBottom="5">
      {types !== undefined && (
        <Paragraph>
          <b>{types.toLocaleString()}</b> types
        </Paragraph>
      )}
      <Paragraph>
        <b>{entries.toLocaleString()}</b> callable entries
      </Paragraph>
      <Paragraph color="color10">{skipped.toLocaleString()} skipped</Paragraph>
      <Paragraph color="color10">
        {total ? Math.round((entries / total) * 100) : 0}% entry coverage
      </Paragraph>
    </XStack>
  )
}
