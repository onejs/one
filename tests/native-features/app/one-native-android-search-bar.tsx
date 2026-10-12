import { useState } from 'react'
import { One } from 'one'

const results = ['Apple', 'Banana', 'Cherry']

export default function OneNativeAndroidSearchBar() {
  const [mode, setMode] = useState<'full' | 'docked'>('full')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [searches, setSearches] = useState(0)
  const [dockedQuery, setDockedQuery] = useState('')
  const [dockedExpanded, setDockedExpanded] = useState(false)

  return (
    <One.Android.Column
      testID="one-native-android-search-bar-screen"
      style={{ flex: 1 }}
      spacing={8}
      composeStyle={{ padding: 16, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.Text
        testID="one-native-android-search-bar-status"
        text={`Mode: ${mode} · Query: [${query}] · Expanded: ${expanded ? 'yes' : 'no'} · Searches: ${searches}`}
      />
      <One.Android.Text
        testID="one-native-android-search-bar-docked-status"
        text={`Docked: [${dockedQuery}] · ${dockedExpanded ? 'open' : 'shut'}`}
      />
      <One.Android.Row spacing={8}>
        <One.Android.Button
          testID="one-native-android-search-bar-toggle"
          label={mode === 'full' ? 'Show docked' : 'Show full'}
          variant="tonal"
          onPress={() => setMode(mode === 'full' ? 'docked' : 'full')}
        />
        <One.Android.Button
          testID="one-native-android-search-bar-decoy"
          label="Decoy"
          variant="text"
        />
      </One.Android.Row>
      {mode === 'docked' ? (
        <One.Android.DockedSearchBar
          testID="one-native-android-search-bar-docked"
          query={dockedQuery}
          onQueryChange={setDockedQuery}
          expanded={dockedExpanded}
          onExpandedChange={setDockedExpanded}
          placeholder="Search docked"
          composeStyle={{ fillMaxWidth: true }}
        >
          <One.Android.DockedSearchBar.LeadingIcon>
            <One.Android.Icon name="search" />
          </One.Android.DockedSearchBar.LeadingIcon>
          {results.map((fruit) => (
            <One.Android.Text
              key={fruit}
              testID={`one-native-android-search-bar-docked-result-${fruit.toLowerCase()}`}
              text={fruit}
            />
          ))}
        </One.Android.DockedSearchBar>
      ) : (
        <One.Android.SearchBar
          testID="one-native-android-search-bar"
          query={query}
          onQueryChange={setQuery}
          expanded={expanded}
          onExpandedChange={setExpanded}
          placeholder="Search items"
          onSearch={() => setSearches((count) => count + 1)}
          composeStyle={{ fillMaxWidth: true }}
        >
          {expanded ? (
            <One.Android.SearchBar.LeadingIcon>
              <One.Android.IconButton
                testID="one-native-android-search-bar-back"
                onClick={() => setExpanded(false)}
              >
                <One.Android.Icon name="arrow_back" />
              </One.Android.IconButton>
            </One.Android.SearchBar.LeadingIcon>
          ) : (
            <One.Android.SearchBar.LeadingIcon>
              <One.Android.Icon name="search" />
            </One.Android.SearchBar.LeadingIcon>
          )}
          <One.Android.SearchBar.TrailingIcon>
            <One.Android.IconButton
              testID="one-native-android-search-bar-clear"
              onClick={() => setQuery('')}
            >
              <One.Android.Icon name="close" />
            </One.Android.IconButton>
          </One.Android.SearchBar.TrailingIcon>
          {results.map((fruit) => (
            <One.Android.Text
              key={fruit}
              testID={`one-native-android-search-bar-result-${fruit.toLowerCase()}`}
              text={fruit}
            />
          ))}
        </One.Android.SearchBar>
      )}
    </One.Android.Column>
  )
}
