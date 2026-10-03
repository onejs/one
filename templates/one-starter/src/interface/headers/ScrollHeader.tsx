import { useEffect, useState } from 'react'
import { XStack, YStack, isClient } from 'tamagui'
import type { ReactNode } from 'react'
export const ScrollHeader = ({ children }: { children: ReactNode }) => {
  const [isScrolled, setIsScrolled] = useState(false)
  useEffect(() => {
    if (!isClient) return
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, {
      passive: true,
    })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  return (
    <XStack
      t={0}
      l={0}
      r={0}
      z={50}
      items="center"
      justify="center"
      w="100%"
      flexShrink={0}
      position={{
        web: 'sticky',
      }}
      maxW={{
        web: '100vw',
      }}
    >
      <XStack w="100%" position="relative" maxW={1200}>
        <XStack
          transition="medium"
          flex={1}
          overflow="hidden"
          contain="paint"
          rounded={{
            md: '10',
          }}
          y={{
            md: isScrolled ? 6 : 0,
          }}
          boxShadow={{
            md: isScrolled ? '0 2px 8px shadow-4' : 'none',
          }}
        >
          <YStack
            position="absolute"
            transition="medium"
            inset={0}
            style={{
              ...(isScrolled && {
                backdropFilter: `blur(16px)`,
                WebkitBackdropFilter: `blur(16px)`,
              }),
            }}
          />

          <YStack
            opacity={isScrolled ? 0.85 : 0}
            position="absolute"
            inset={0}
            bg="color-2"
            rounded={{
              md: '10',
            }}
          />

          <XStack z={1} w="100%" items="center">
            {children}
          </XStack>
        </XStack>
      </XStack>
    </XStack>
  )
}
