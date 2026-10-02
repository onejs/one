import { SizableText, styled, View, YStack, type SizableTextProps } from 'tamagui'
import { type LinkProps, useLinkTo } from 'one'
import { GithubIcon } from '~/features/icons/GithubIcon'
import { DiscordIcon } from '~/features/icons/DiscordIcon'

export const SocialLinksRow = ({ large }: { large?: boolean }) => {
  const scale = large ? 1.5 : 1

  return (
    <>
      <HoverableLink
        mr={-3}
        target="_blank"
        href="https://x.com/one__js"
        aria-label="X (formerly Twitter)"
      >
        <Container miw={large ? 60 : 45}>
          <svg
            style={{
              width: 44 * scale,
              height: 44 * scale,
              marginBottom: -10 * scale,
              marginTop: -6 * scale,
              marginLeft: -11 * scale,
              marginRight: -11 * scale,
            }}
            fillRule="evenodd"
            clipRule="evenodd"
            viewBox="0 0 512 509.64"
            aria-hidden="true"
          >
            <path
              fill="var(--logoColor)"
              fillRule="nonzero"
              d="M323.74 148.35h36.12l-78.91 90.2 92.83 122.73h-72.69l-56.93-74.43-65.15 74.43h-36.14l84.4-96.47-89.05-116.46h74.53l51.46 68.04 59.53-68.04zm-12.68 191.31h20.02l-129.2-170.82H180.4l130.66 170.82z"
            />
          </svg>
          <SubTitle display={large ? 'flex' : 'none'}>X</SubTitle>
        </Container>
      </HoverableLink>

      <HoverableLink
        target="_blank"
        href="https://github.com/onejs/one"
        aria-label="GitHub"
      >
        <Container miw={large ? 60 : 45} y={-1}>
          <GithubIcon width={28 * scale} height={28 * scale} aria-hidden="true" />
          <SubTitle display={large ? 'flex' : 'none'}>Github</SubTitle>
        </Container>
      </HoverableLink>

      <View display={`${large ? 'flex' : 'none'} @gtXs/card:inline-flex`}>
        <HoverableLink
          target="_blank"
          href="https://discord.gg/YpUKRqaFtm"
          aria-label="Discord"
        >
          <Container miw={large ? 60 : 45}>
            <DiscordIcon width={25 * scale} height={25 * scale} aria-hidden="true" />
            <SubTitle display={large ? 'flex' : 'none'}>Discord</SubTitle>
          </Container>
        </HoverableLink>
      </View>
    </>
  )
}

const Container = styled(YStack, {
  gap: '4',
  mx: -5,
  alignItems: 'center',
})

const SubTitle = styled(SizableText, {
  size: '4',
  als: 'center',
})

const HoverableLink = (props: SizableTextProps & LinkProps) => {
  const linkProps = useLinkTo({ href: props.href as any, replace: props.replace })

  return (
    <SizableText
      render="a"
      cur="pointer"
      paddingTop="2"
      paddingBottom="2"
      px="3"
      textDecorationColor="transparent"
      {...(linkProps as any)}
      {...props}
      opacity={`${props.opacity ?? 0.66} hover:1`}
      alignItems="center"
      justifyContent="center"
      display="inline-flex"
    />
  )
}
