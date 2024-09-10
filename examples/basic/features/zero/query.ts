import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Schema } from 'zql/src/zql/query/schema.js'
import type { Query, QueryResultRow, Smash } from 'zql/src/zql/query/query'
import type { TypedView } from 'zql/src/zql/query/typed-view'
import { deepClone } from 'shared/src/deep-clone'
import { curId } from './client'
import { isWeb } from 'tamagui'

export function useQueryOrig<TSchema extends Schema, TReturn extends Array<QueryResultRow>>(
  q: Query<TSchema, TReturn> | undefined,
  dependencies: readonly unknown[] = [],
  enabled = true
): Smash<TReturn> {
  const [snapshot, setSnapshot] = useState<Smash<TReturn>>()
  const [, setView] = useState<TypedView<Smash<TReturn>> | undefined>(undefined)

  const uid = useRef({})
  if (!rootUID) {
    rootUID = uid
  }

  if (isWeb && typeof window === 'undefined' && curId) {
    const found = cachedData.find((x) => x.id === curId) as any
    return found ? [found] : []
  }

  useLayoutEffect(() => {
    if (enabled && q) {
      const view = q.materialize()
      setView(view)
      const unsubscribe = view.addListener((snapshot) => {
        setSnapshot(deepClone(snapshot) as Smash<TReturn>)
      })
      view.hydrate()
      return () => {
        unsubscribe()
        view.destroy()
      }
    }
    return () => {
      //
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  if (!snapshot && uid === rootUID) {
    return cachedData as any
  }

  return snapshot || []
}

// A wrapper of the original useQuery to avoid flickering
export function useQuery<TSchema extends Schema, TReturn extends Array<QueryResultRow>>(
  q: Query<TSchema, TReturn> | undefined,
  dependencies: readonly unknown[] = [],
  enabled = true
): Smash<TReturn> {
  const result = useQueryOrig(q, dependencies, enabled)

  // Do not need to avoid flickering on the server, not sure what will happen if we do this on server (TODO)
  if (typeof window === 'undefined') return result

  const [debouncedResult, setDebouncedResult] = useState(result)
  const resultRef = useRef(debouncedResult)

  const shouldUpdateImmediately = (() => {
    // Update anyway if the previous result is nullish
    if (!resultRef.current) return true

    // If the result is an array, we need to make sure the new result has at least more items than the previous one to avoid flickering due to less items are
    if (Array.isArray(resultRef.current)) {
      if ((result?.length || 0) >= (resultRef.current?.length || 0)) return true
    } else {
      // Else, we just need to check if the new result is not nullish
      return !!result
    }
  })()
  if (shouldUpdateImmediately) {
    resultRef.current = result
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      resultRef.current = result
      setDebouncedResult(result) // to trigger re-render
    }, 500)
    return () => clearTimeout(timeout)
  }, [result])

  return resultRef.current
}

let rootUID

const cachedData = [
  {
    id: '14698bbf-b3bc-4686-808b-c92e22c0bde4',
    user_id: '2f8e3e74-e366-4e76-b6bc-f5f63d3f7107',
    content:
      'Day 47 of Dark mode: accidentally designing for light mode at 3 AM. Send help... or coffee. #ProgrammerHumor',
    created_at: 1725827752.743,
    user: [
      {
        id: '2f8e3e74-e366-4e76-b6bc-f5f63d3f7107',
        username: 'SonarQubeSorcerer',
        email: 'sonarqubesorcerer@example.com',
        password_hash: 'P66pOpsQZyYRyTS',
        bio: '',
        avatar_url: 'https://i.pravatar.cc/150?u=SonarQubeSorcerer',
        created_at: null,
      },
    ],
  },
  {
    id: 'a2ee8368-8243-43f0-8422-7e7491a6000c',
    user_id: '2f8e3e74-e366-4e76-b6bc-f5f63d3f7107',
    content:
      'In my Code reviews era: leaving comments on my own PR because no one else will and loving every minute of it. #DevProblems',
    created_at: 1725826175.575,
    user: [
      {
        id: '2f8e3e74-e366-4e76-b6bc-f5f63d3f7107',
        username: 'SonarQubeSorcerer',
        email: 'sonarqubesorcerer@example.com',
        password_hash: 'P66pOpsQZyYRyTS',
        bio: '',
        avatar_url: 'https://i.pravatar.cc/150?u=SonarQubeSorcerer',
        created_at: null,
      },
    ],
  },
  {
    id: '80ce1354-4af4-4df6-87c6-6a3d300b599d',
    user_id: '2ceae642-6f56-4d7b-a10d-3465571426ae',
    content:
      'My love letter to TypeScript: Roses are red, violets are blue, feeling smug about catching a type error, then spending hours fixing it, and I still love you. #ProgrammerHumor',
    created_at: 1725824398.93,
    user: [
      {
        id: '2ceae642-6f56-4d7b-a10d-3465571426ae',
        username: 'WebSocketWizard',
        email: 'websocketwizard@example.com',
        password_hash: 'WMH_beY94eOqlOo',
        bio: '',
        avatar_url: 'https://i.pravatar.cc/150?u=WebSocketWizard',
        created_at: null,
      },
    ],
  },
  {
    id: '409fc8cd-a3b7-4232-989c-41a4dabb0fb4',
    user_id: '535b53ce-bc3e-4979-ae74-1661c750a0e6',
    content:
      "Confession: I thought GraphQL would cure my imposter syndrome. Now I'm just over-fetching data out of habit anyway. Progress? #SoftwareEngineering",
    created_at: 1725821259.901,
    user: [
      {
        id: '535b53ce-bc3e-4979-ae74-1661c750a0e6',
        username: 'TravisTrooper',
        email: 'travistrooper@example.com',
        password_hash: '8CLuSz80WJwny_Y',
        bio: '',
        avatar_url: 'https://i.pravatar.cc/150?u=TravisTrooper',
        created_at: null,
      },
    ],
  },
  {
    id: 'fcdddeee-8e82-4a37-ac47-9cd00c76b666',
    user_id: 'fe9d5a12-957f-4c8d-a3c6-4fe5efc9c11f',
    content:
      "Confession: I thought Cross-platform development would cure my imposter syndrome. Now I'm just celebrating when it works on two platforms out of five. Progress? #ProgrammerHumor",
    created_at: 1725820566.531,
    user: [
      {
        id: 'fe9d5a12-957f-4c8d-a3c6-4fe5efc9c11f',
        username: 'SomeRandomDevWeb',
        email: 'somerandomdevweb@example.com',
        password_hash: 'TeyIz5vdIj_EERf',
        bio: '',
        avatar_url: 'https://i.pravatar.cc/150?u=SomeRandomDevWeb',
        created_at: null,
      },
    ],
  },
  {
    id: 'c5c1f856-98e3-4fff-926c-a3fb02c06b1b',
    user_id: '292e2bfb-31aa-4ea3-9235-88e44c632ad6',
    content:
      'AI-driven development has taught me that realizing the AI writes better comments than I do is a valuable life skill. Thanks, I guess? #DeveloperProblems',
    created_at: 1725819927.768,
    user: [
      {
        id: '292e2bfb-31aa-4ea3-9235-88e44c632ad6',
        username: 'GraphQLGuru',
        email: 'graphqlguru@example.com',
        password_hash: 'UIvaSZuVHjyDbbn',
        bio: '',
        avatar_url: 'https://i.pravatar.cc/150?u=GraphQLGuru',
        created_at: null,
      },
    ],
  },
  {
    id: '53519bfd-4857-40c1-8bff-3d9163918de6',
    user_id: '9bc9ed10-67ac-4b72-827c-202a37b8e5f0',
    content:
      'TIL that GraphQL is less about syntax and more about over-fetching data out of habit anyway. The more you know! #DevJokes',
    created_at: 1725819640.188,
    user: [
      {
        id: '9bc9ed10-67ac-4b72-827c-202a37b8e5f0',
        username: 'ByteMaster',
        email: 'bytemaster@example.com',
        password_hash: 'lvGDM6B9a1goFip',
        bio: '',
        avatar_url: 'https://i.pravatar.cc/150?u=ByteMaster',
        created_at: null,
      },
    ],
  },
  {
    id: '71a104c8-dbd4-435f-be38-35a28dc99b94',
    user_id: '2ceae642-6f56-4d7b-a10d-3465571426ae',
    content:
      'My love letter to JavaScript frameworks: Roses are red, violets are blue, learning a new one every time I start a project, and I still love you. #WebDevelopment',
    created_at: 1725818873.208,
    user: [
      {
        id: '2ceae642-6f56-4d7b-a10d-3465571426ae',
        username: 'WebSocketWizard',
        email: 'websocketwizard@example.com',
        password_hash: 'WMH_beY94eOqlOo',
        bio: '',
        avatar_url: 'https://i.pravatar.cc/150?u=WebSocketWizard',
        created_at: null,
      },
    ],
  },
  {
    id: 'f8e7924e-4302-4d1a-b1c2-413206453a19',
    user_id: '535b53ce-bc3e-4979-ae74-1661c750a0e6',
    content:
      "They said AI-driven development would be fun. They didn't mention realizing the AI writes better comments than I do. Still, I'm having a blast! #WebDevelopment",
    created_at: 1725816909.473,
    user: [
      {
        id: '535b53ce-bc3e-4979-ae74-1661c750a0e6',
        username: 'TravisTrooper',
        email: 'travistrooper@example.com',
        password_hash: '8CLuSz80WJwny_Y',
        bio: '',
        avatar_url: 'https://i.pravatar.cc/150?u=TravisTrooper',
        created_at: null,
      },
    ],
  },
  {
    id: 'be010d3d-da7b-465c-b31e-b4bb71a61ebb',
    user_id: '535b53ce-bc3e-4979-ae74-1661c750a0e6',
    content:
      "Me: I'm a AI-driven development expert. Also me: realizing the AI writes better comments than I do. Fake it till you make it, right? #SoftwareEngineering",
    created_at: 1725816606.733,
    user: [
      {
        id: '535b53ce-bc3e-4979-ae74-1661c750a0e6',
        username: 'TravisTrooper',
        email: 'travistrooper@example.com',
        password_hash: '8CLuSz80WJwny_Y',
        bio: '',
        avatar_url: 'https://i.pravatar.cc/150?u=TravisTrooper',
        created_at: null,
      },
    ],
  },
  {
    id: '66636cc8-6d2b-48b7-bac0-8b9bd1a0315f',
    user_id: '2f8e3e74-e366-4e76-b6bc-f5f63d3f7107',
    content:
      'Dear future self, remember when JavaScript frameworks meant learning a new one every time I start a project? Good times. #DevProblems',
    created_at: 1725816484.984,
    user: [
      {
        id: '2f8e3e74-e366-4e76-b6bc-f5f63d3f7107',
        username: 'SonarQubeSorcerer',
        email: 'sonarqubesorcerer@example.com',
        password_hash: 'P66pOpsQZyYRyTS',
        bio: '',
        avatar_url: 'https://i.pravatar.cc/150?u=SonarQubeSorcerer',
        created_at: null,
      },
    ],
  },
  {
    id: 'a86e7fff-1a7d-45bd-8b93-b130fdc33223',
    user_id: 'a4811731-4207-4a4e-8c9f-9c66d93a0a16',
    content:
      'My Content personalization journey: 10% inspiration, 90% realizing the algorithm knows me better than I know myself. #ProgrammerHumor',
    created_at: 1725816126.867,
    user: [
      {
        id: 'a4811731-4207-4a4e-8c9f-9c66d93a0a16',
        username: 'ScalabilityScientist',
        email: 'scalabilityscientist@example.com',
        password_hash: 'XAu27yl9bk9Ukfn',
        bio: '',
        avatar_url: 'https://i.pravatar.cc/150?u=ScalabilityScientist',
        created_at: null,
      },
    ],
  },
  {
    id: '5fcb8d12-ee26-4fdf-95b1-db4cc51be3b7',
    user_id: 'fe9d5a12-957f-4c8d-a3c6-4fe5efc9c11f',
    content:
      'Dear future self, remember when Cross-browser compatibility meant feeling nostalgic for the days when we only had to support one browser? Good times. #DevProblems',
    created_at: 1725815731.037,
    user: [
      {
        id: 'fe9d5a12-957f-4c8d-a3c6-4fe5efc9c11f',
        username: 'SomeRandomDevWeb',
        email: 'somerandomdevweb@example.com',
        password_hash: 'TeyIz5vdIj_EERf',
        bio: '',
        avatar_url: 'https://i.pravatar.cc/150?u=SomeRandomDevWeb',
        created_at: null,
      },
    ],
  },
  {
    id: '5055aaa9-6cb6-4390-a091-5957c661517a',
    user_id: 'a4811731-4207-4a4e-8c9f-9c66d93a0a16',
    content:
      'My love letter to React: Roses are red, violets are blue, creating 47 components for a simple landing page, and I still love you. #CodeHumor',
    created_at: 1725815623.181,
    user: [
      {
        id: 'a4811731-4207-4a4e-8c9f-9c66d93a0a16',
        username: 'ScalabilityScientist',
        email: 'scalabilityscientist@example.com',
        password_hash: 'XAu27yl9bk9Ukfn',
        bio: '',
        avatar_url: 'https://i.pravatar.cc/150?u=ScalabilityScientist',
        created_at: null,
      },
    ],
  },
  {
    id: '1ffb042e-44d5-44e3-a6be-3994a3b6507f',
    user_id: '535b53ce-bc3e-4979-ae74-1661c750a0e6',
    content:
      "Me: I'm a Low-code platforms expert. Also me: spending more time customizing than I would have spent coding. Fake it till you make it, right? #WebDevelopment",
    created_at: 1725813624.429,
    user: [
      {
        id: '535b53ce-bc3e-4979-ae74-1661c750a0e6',
        username: 'TravisTrooper',
        email: 'travistrooper@example.com',
        password_hash: '8CLuSz80WJwny_Y',
        bio: '',
        avatar_url: 'https://i.pravatar.cc/150?u=TravisTrooper',
        created_at: null,
      },
    ],
  },
  {
    id: 'b9c7793d-33a4-4218-a944-b9f0dd0a8192',
    user_id: '63eb2845-f55c-4d26-9011-80065c475342',
    content:
      'Pro tip: Master CSS-in-JS by forgetting where I put that one crucial style. Works 60% of the time, every time. #DeveloperProblems',
    created_at: 1725813402.746,
    user: [
      {
        id: '63eb2845-f55c-4d26-9011-80065c475342',
        username: 'DuckDebugger',
        email: 'duckdebugger@example.com',
        password_hash: 'wUMwcmiOqXfBgGk',
        bio: '',
        avatar_url: 'https://i.pravatar.cc/150?u=DuckDebugger',
        created_at: null,
      },
    ],
  },
  {
    id: '64ffd4b1-028c-4bad-9fb9-01f98236c4d2',
    user_id: 'a4811731-4207-4a4e-8c9f-9c66d93a0a16',
    content:
      'My Responsive design journey: 10% inspiration, 90% spending more time adjusting margins than coding actual features. #DevProblems',
    created_at: 1725812171.622,
    user: [
      {
        id: 'a4811731-4207-4a4e-8c9f-9c66d93a0a16',
        username: 'ScalabilityScientist',
        email: 'scalabilityscientist@example.com',
        password_hash: 'XAu27yl9bk9Ukfn',
        bio: '',
        avatar_url: 'https://i.pravatar.cc/150?u=ScalabilityScientist',
        created_at: null,
      },
    ],
  },
  {
    id: 'b0d04829-254f-418d-b72e-cd83e3854cbc',
    user_id: 'f58711f5-0b6e-454d-9e4c-a97d321cb1e0',
    content:
      'My TypeScript journey: 10% inspiration, 90% feeling smug about catching a type error, then spending hours fixing it. #DeveloperProblems',
    created_at: 1725811702.628,
    user: [
      {
        id: 'f58711f5-0b6e-454d-9e4c-a97d321cb1e0',
        username: 'CloudCrusader',
        email: 'cloudcrusader@example.com',
        password_hash: 'McoEUzjCROc8BOX',
        bio: '',
        avatar_url: 'https://i.pravatar.cc/150?u=CloudCrusader',
        created_at: null,
      },
    ],
  },
  {
    id: '6b8fc8e5-5489-4771-9c71-0950fec8ef18',
    user_id: '40c3b42e-ac46-48a9-85b4-8b4daf886b40',
    content:
      'My Cross-browser compatibility journey: 10% inspiration, 90% feeling nostalgic for the days when we only had to support one browser. #DevProblems',
    created_at: 1725811582.515,
    user: [
      {
        id: '40c3b42e-ac46-48a9-85b4-8b4daf886b40',
        username: 'KotlinKing',
        email: 'kotlinking@example.com',
        password_hash: 'Yrv7EtAjupKatTp',
        bio: '',
        avatar_url: 'https://i.pravatar.cc/150?u=KotlinKing',
        created_at: null,
      },
    ],
  },
  {
    id: '12a15e38-12a7-4348-bb98-17d2d47f078f',
    user_id: '40c3b42e-ac46-48a9-85b4-8b4daf886b40',
    content:
      "To all my WebAssembly folks out there pretending I understand how it works, you're not alone. We're in this together! #DevProblems",
    created_at: 1725810400.757,
    user: [
      {
        id: '40c3b42e-ac46-48a9-85b4-8b4daf886b40',
        username: 'KotlinKing',
        email: 'kotlinking@example.com',
        password_hash: 'Yrv7EtAjupKatTp',
        bio: '',
        avatar_url: 'https://i.pravatar.cc/150?u=KotlinKing',
        created_at: null,
      },
    ],
  },
]
