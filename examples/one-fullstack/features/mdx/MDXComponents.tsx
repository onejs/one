import React from 'react'
import {
  Button,
  H1,
  H2,
  H3,
  H4,
  H5,
  Paragraph,
  ScrollView,
  Separator,
  Spacer,
  Text,
  Theme,
  XStack,
  YStack,
} from 'tamagui'
import { Code } from '~/components/Code'
import { LI } from '~/components/LI'
import { Link } from '~/components/Link'
import { UL } from '~/components/UL'

const componentsIn = {
  Spacer,
  ScrollView,
  Text,
  Paragraph,
  YStack,
  XStack,
  Theme,
  Separator,
  Button,
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  h5: H5,
  p: Paragraph,

  a: ({ href = '', children, ...props }) => {
    return (
      <Link className="link" href={href as any} asChild>
        {/* @ts-ignore */}
        <Paragraph
          tag="a"
          // @ts-ignore
          fontSize="inherit"
          display="inline"
          cursor="pointer"
          {...props}
        >
          {children}
        </Paragraph>
      </Link>
    )
  },

  ul: ({ children }) => {
    return (
      <UL my="$4">
        {React.Children.toArray(children).map((x) => (typeof x === 'string' ? null : x))}
      </UL>
    )
  },

  ol: (props) => <YStack {...props} tag="ol" mb="$3" />,

  li: (props) => {
    return (
      <LI size="$6" my="$1.5" className="docs-paragraph">
        {props.children}
      </LI>
    )
  },

  strong: (props) => <Paragraph tag="strong" fontSize="inherit" {...props} fontWeight="bold" />,

  pre: ({ children }) => <>{children}</>,

  code: Code,
}

export class ErrorBoundary extends React.Component<{ children: any; name: string }> {
  state = { hasError: false }

  static getDerivedStateFromError(error) {
    console.error('MDXComponent.error', error)
    // Update state so the next render will show the fallback UI.
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Example "componentStack":
    //   in ComponentThatThrows (created by App)
    //   in ErrorBoundary (created by App)
    //   in div (created by App)
    //   in App
    console.error('MDXComponent.error', this.props.name, error, info)
  }

  render() {
    if (this.state.hasError) {
      return null
    }
    return this.props.children
  }
}

export const components = Object.fromEntries(
  Object.entries(componentsIn as Record<string, React.FC<any>>).map(([key, Component]) => {
    const out = (props) => {
      // adds error boundary here as these errors are stupid to debug
      return (
        <ErrorBoundary name={key}>
          <Component {...props} />
        </ErrorBoundary>
      )
    }

    // inherit static props
    for (const cKey in Component) {
      out[cKey] = Component[cKey]
    }

    return [key, out]
  })
)
