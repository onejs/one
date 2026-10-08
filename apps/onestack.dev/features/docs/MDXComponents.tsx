import { ChevronRight } from '~/components/icons'
import { Link } from 'one'
import React from 'react'
import {
  H1,
  H2,
  H3,
  H4,
  H5,
  Heading,
  Paragraph,
  Spacer,
  Text,
  Theme,
  View,
  XStack,
  YStack,
  styled,
} from 'tamagui'
import { Status } from '../../components/Status'
import { SubTitle } from '../site/SubTitle'
import { Badge } from './Badge'
import { Code, CodeInline } from './Code'
import { LinkHeading } from './LinkHeading'
import { NativeHero } from './NativeHero'
import { Notice } from './Notice'
import { PropsTable } from './PropsTable'
import { RouteTree } from './RouteTree'
import { Table, Tbody, Td, Th, Thead, Tr } from './Table'
import { unwrapText } from './unwrapText'

const IntroParagraph = ({ children, disableUnwrapText, ...props }: any) => {
  return (
    <Paragraph
      render="p"
      size="8 sm:7"
      marginTop="2"
      marginBottom="2"
      {...props}
      lineHeight="39px"
      fontWeight="400"
    >
      {disableUnwrapText ? children : unwrapText(children)}
    </Paragraph>
  )
}

const LI = styled(Paragraph, {
  display: 'list-item' as any,
  size: '5',
  paddingBottom: '1',
  render: 'li',
})

const UL = styled(YStack, {
  render: 'ul',
  marginVertical: '1',
  marginLeft: '4',
  marginRight: '2',
})

const HR = () => (
  <YStack
    marginTop="9"
    marginBottom="5"
    marginHorizontal="auto"
    width="50%"
    borderBottomColor="color5"
    borderBottomWidth={1}
  />
)

// code blocks are fully rendered by Expressive Code (a self-contained
// <figure class="expressive-code">…</figure> tree), so here we only style
// inline code. inline code has a plain string child and no language class;
// Expressive Code's inner <code> has element children and is passed through.
const code = (props) => {
  const { className, children, ...rest } = props
  const isInline =
    !className && React.Children.toArray(children).every((c) => typeof c === 'string')
  if (isInline) {
    return <CodeInline>{unwrapText(children)}</CodeInline>
  }
  return (
    <code className={className} {...rest}>
      {children}
    </code>
  )
}

const New = () => (
  <Text
    fontFamily="mono"
    fontSize={11}
    paddingHorizontal="1-5"
    paddingVertical="0-5"
    backgroundColor="green5"
    color="green11"
    textTransform="uppercase"
    letterSpacing={1}
    borderRadius="2"
  >
    new
  </Text>
)

const startedScripts = new Set<string>()

const MDXScript = (props: React.ComponentProps<'script'>) => {
  const ref = React.useRef<HTMLScriptElement>(null)
  React.useEffect(() => {
    const placeholder = ref.current
    if (!placeholder) return
    const key = `${props.type ?? ''}:${placeholder.src}:${placeholder.textContent}`
    if (startedScripts.has(key)) return
    const script = placeholder.cloneNode(true)
    if (!(script instanceof HTMLScriptElement)) return
    startedScripts.add(key)
    script.type = props.type ?? ''
    script.addEventListener('load', () => script.remove(), { once: true })
    document.head.append(script)
  }, [props.type, props.src, props.children])

  // code-block modules mutate accessibility attributes, so start after hydration.
  return <script {...props} ref={ref} type="text/plain" />
}

const componentsIn = {
  script: MDXScript,
  New,
  IntroParagraph,
  Spacer,
  Text,
  Theme,
  Code,
  NativeHero,
  Notice,
  SubTitle,
  RouteTree,
  PropsTable,
  Status,
  Badge,
  XStack,
  YStack,

  Card: ({ category, title, href }) => {
    const content = (
      <YStack
        render="a"
        transition="quickest"
        y="0 hover:-2px press:2px"
        backgroundColor="color2 hover:color3 press:color1"
        paddingRight="6"
        paddingLeft="6"
        paddingVertical="6"
        flex={1}
        borderRadius="4"
        className="text-underline-none"
      >
        <XStack alignItems="center" justifyContent="space-between" flex={1} width="100%">
          <YStack flexShrink={1}>
            <Heading size="4" color="color7" {...(!!category && { marginTop: '-2' })}>
              {category}
            </Heading>
            <Paragraph size="7" color="color11">
              {title}
            </Paragraph>
          </YStack>

          <Spacer flex={1} />

          <ChevronRight color="color11" />
        </XStack>
      </YStack>
    )

    if (href) {
      return (
        <Link asChild href={href}>
          {content}
        </Link>
      )
    }

    return content
  },

  CardCol: (props) => <YStack marginTop="6" marginBottom="6" gap="3" {...props} />,

  h1: (props) => (
    <H1 width="max-content" marginBottom="2" {...props} position="relative" />
  ),

  h2: ({ children, ...props }) => (
    <H2
      position="relative"
      width="100%"
      paddingTop="6"
      marginTop="2"
      paddingBottom="4"
      {...props}
      borderBottomWidth={1}
      borderBottomColor="color4"
      data-heading
    >
      {children}
    </H2>
  ),

  h3: ({ children, id, ...props }) => (
    <LinkHeading paddingTop="4" marginBottom="1" id={id}>
      <H3
        fontFamily="mono"
        size="5"
        letterSpacing={-0.5}
        width={`fit-content` as any}
        {...props}
        position="relative"
        id={id}
        data-heading
      >
        {children}
      </H3>
    </LinkHeading>
  ),

  h4: (props) => (
    <H4
      position="relative"
      width={`fit-content` as any}
      marginTop="6"
      marginBottom="3"
      {...props}
      fontWeight="400"
    />
  ),

  h5: (props) => <H5 marginTop="4" {...props} />,

  p: (props) => (
    <Paragraph
      className="docs-paragraph"
      display="block"
      size="6"
      marginVertical="3"
      {...props}
      lineHeight="30px"
    />
  ),

  hr: HR,

  ul: ({ children }) => {
    return (
      <UL marginVertical="2">
        {React.Children.toArray(children).map((x) => (typeof x === 'string' ? null : x))}
      </UL>
    )
  },

  ol: (props) => <YStack {...props} marginBottom="3" render="ol" />,

  li: (props) => {
    return (
      <LI size="6" className="docs-paragraph">
        {props.children}
      </LI>
    )
  },

  a: ({ href = '', children, ...props }) => {
    return (
      <Link className="link" href={href as any} asChild>
        {/* @ts-ignore */}
        <Paragraph
          render="a"
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

  strong: (props) => (
    <Paragraph render="strong" fontSize="inherit" {...props} fontWeight="700" />
  ),

  table: Table,
  thead: Thead,
  tbody: Tbody,
  tr: Tr,
  th: Th,
  td: Td,

  img: ({ ...props }) => (
    <View render="span" marginVertical="6">
      <View render="img" {...props} maxWidth="100%" />
    </View>
  ),

  // Expressive Code owns the <pre>; render it natively so its styles apply
  pre: (props) => <pre {...props} />,

  code,

  blockquote: ({ children, ...props }) => {
    return (
      <View
        marginVertical="4"
        paddingHorizontal="6"
        marginLeft="3"
        borderLeftWidth={1}
        borderColor="borderColor"
        {...props}
        justifyContent="center"
      >
        <Paragraph
          fontFamily="body"
          whiteSpace="revert"
          size="8 sm:7"
          color="color"
          opacity={0.65}
          lineHeight="9"
          fontWeight="300"
        >
          {unwrapText(children)}
        </Paragraph>
      </View>
    )
  },
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
  Object.entries(componentsIn).map(([key, Component]) => {
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

const getNonTextChildren = (children) => {
  return React.Children.map(children, (x) => {
    if (typeof x === 'string') return null
    if (x['type'] === code) return null
    return x
  }).flat()
}
