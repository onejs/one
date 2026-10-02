import { ChevronRight } from '~/features/icons/lucide'
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
import { Notice } from './Notice'
import { PropsTable } from './PropsTable'
import { RouteTree } from './RouteTree'
import { unwrapText } from './unwrapText'

const IntroParagraph = ({ children, disableUnwrapText, ...props }: any) => {
  return (
    <Paragraph
      render="p"
      size="8 sm:7"
      mt="2"
      mb="2"
      {...props}
      lh="39px sm:32px"
      fontWeight="400"
    >
      {disableUnwrapText ? children : unwrapText(children)}
    </Paragraph>
  )
}

const LI = styled(Paragraph, {
  display: 'list-item' as any,
  size: '5',
  pb: '1',
  render: 'li',
})

const UL = styled(YStack, {
  render: 'ul',
  my: '1',
  ml: '4',
  mr: '2',
})

const TableBase = styled(View, {
  render: 'table',
  display: 'table' as any,
  width: '100%',
  my: '4',
})

const TableWrapper = styled(View, {
  width: '100%',
  overflowX: 'auto' as any,
  my: '4',
})

const Table = (props: any) => (
  <TableWrapper>
    <TableBase
      className="mdx-table"
      my={0}
      style={{ borderCollapse: 'collapse' }}
      {...props}
    />
  </TableWrapper>
)

const Thead = styled(View, {
  render: 'thead',
  display: 'table-header-group' as any,
})

const Tbody = styled(View, {
  render: 'tbody',
  display: 'table-row-group' as any,
})

const Tr = styled(View, {
  render: 'tr',
  display: 'table-row' as any,
})

const Th = styled(Text, {
  render: 'th',
  display: 'table-cell' as any,
  py: '2-5',
  px: '3',
  fontWeight: '600',
  fontSize: '4',
  lineHeight: '25px',
  color: 'color11',
  textAlign: 'left' as any,
  verticalAlign: 'bottom' as any,
  borderBottomWidth: 1,
  borderColor: 'color7',
})

const Td = styled(Text, {
  render: 'td',
  display: 'table-cell' as any,
  py: '2-5',
  px: '3',
  fontSize: '4',
  lineHeight: '25px',
  fontWeight: '600',
  color: 'color12',
  textAlign: 'left' as any,
  verticalAlign: 'top' as any,
  borderBottomWidth: 1,
  borderColor: 'color4',
})

const HR = () => (
  <YStack
    mt="9"
    mb="5"
    mx="auto"
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
    lineHeight="32px"
    px="1-5"
    py="0-5"
    bg="green5"
    color="green11"
    textTransform="uppercase"
    letterSpacing={1}
    br="2"
  >
    new
  </Text>
)

const componentsIn = {
  New,
  IntroParagraph,
  Spacer,
  Text,
  Theme,
  Code,
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
        bg="color2 hover:color3 press:color1"
        paddingRight="6"
        paddingLeft="6"
        py="6"
        className="text-underline-none"
        f={1}
        br="4"
      >
        <XStack alignItems="center" justifyContent="space-between" f={1} w="100%">
          <YStack flexShrink={1}>
            <Heading size="4" color="color7" {...(!!category && { mt: '-2' })}>
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

  CardCol: (props) => <YStack mt="6" mb="6" gap="3" {...props} />,

  h1: (props) => <H1 width="max-content" mb="2" {...props} pos="relative" />,

  h2: ({ children, ...props }) => (
    <H2
      pos="relative"
      width={`fit-content` as any}
      pt="6"
      mt="2"
      w="100%"
      pb="4"
      {...props}
      bbw={1}
      bbc="color4"
      data-heading
    >
      {children}
    </H2>
  ),

  h3: ({ children, id, ...props }) => (
    <LinkHeading pt="4" mb="1" id={id}>
      <H3
        fontFamily="mono"
        size="5"
        letterSpacing={-0.5}
        width={`fit-content` as any}
        {...props}
        pos="relative"
        id={id}
        data-heading
      >
        {children}
      </H3>
    </LinkHeading>
  ),

  h4: (props) => (
    <H4
      pos="relative"
      width={`fit-content` as any}
      mt="6"
      mb="3"
      {...props}
      fontWeight="400"
    />
  ),

  h5: (props) => <H5 mt="4" {...props} />,

  p: (props) => (
    <Paragraph
      className="docs-paragraph"
      display="block"
      size="6"
      my="3"
      {...props}
      lh="30px"
    />
  ),

  hr: HR,

  ul: ({ children }) => {
    return (
      <UL my="2">
        {React.Children.toArray(children).map((x) => (typeof x === 'string' ? null : x))}
      </UL>
    )
  },

  ol: (props) => <YStack {...props} mb="3" render="ol" />,

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
          {/* {href.startsWith('http') ? (
            <>
              &nbsp;
              <Text
                // @ts-ignore
                fontSize="inherit"
                display="inline-flex"
                y={2}
                ml={-1}
              >
                <ExternalIcon />
              </Text>
            </>
          ) : null} */}
        </Paragraph>
      </Link>
    )
  },

  // hr: HR,

  // ul: ({ children }) => {
  //   return (
  //     <UL my="4">
  //       {React.Children.toArray(children).map((x) => (typeof x === 'string' ? null : x))}
  //     </UL>
  //   )
  // },

  // ol: (props) => <YStack {...props} render="ol" mb="3" />,

  // li: (props) => {
  //   return (
  //     <LI size="6" my="1-5" className="docs-paragraph">
  //       {props.children}
  //     </LI>
  //   )
  // },

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
    <View render="span" my="6">
      {/* TODO make this a proper <Image /> component */}
      <View render="img" {...props} maxWidth="100%" />
    </View>
  ),

  // Expressive Code owns the <pre>; render it natively so its styles apply
  pre: (props) => <pre {...props} />,

  code,

  blockquote: ({ children, ...props }) => {
    return (
      <View
        my="4"
        px="6"
        ml="3"
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
          lh="9"
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
