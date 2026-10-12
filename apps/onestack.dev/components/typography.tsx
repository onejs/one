import { Paragraph, styled } from 'tamagui'

export const PrettyText = styled(Paragraph, {
  // @ts-ignore web css prop
  textWrap: 'balanced',
  wordWrap: 'normal',
  color: 'color11',
  fontSize: '6',
  lineHeight: '7',
})

export const PrettyTextMedium = styled(PrettyText, {
  fontFamily: 'mono',
  fontSize: '5',
  lineHeight: '5',
})

export const PrettyTextBigger = styled(PrettyText, {
  fontFamily: 'body',
  // fontFamily: '$mono',
  size: '8 gtSm:9',
  fontWeight: '300',
  marginVertical: 5,
  color: 'gray11',

  textWrap: 'web:balanced',
  className: '',
  variants: {
    intro: {
      true: {
        color: 'color11 dark:color11',
      },
    },

    subtle: {
      true: {
        color: 'color11',
      },
    },
  } as const,
})

export const PrettyTextBiggest = styled(PrettyText, {
  fontFamily: 'mono',
  // @ts-ignore web css prop
  textWrap: 'pretty',
  fontSize: '60px sm:50px xs:40px',
  lineHeight: '80px sm:70px xs:55px',
  fontWeight: '500',
  letterSpacing: -4,
  color: 'color11',
  paddingBottom: 25,
})
