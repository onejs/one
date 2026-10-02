import { Text, View, styled } from 'tamagui'
import { unwrapText } from './unwrapText'

export const Notice = ({ children, theme = 'yellow', disableUnwrap, ...props }: any) => {
  return (
    <NoticeFrame theme={theme} {...props}>
      <Text
        color="color11"
        fontSize="5"
        lineHeight="5"
        py="2"
        mt={-3}
        mb={-3}
        className="text-parent"
      >
        {disableUnwrap ? children : unwrapText(children)}
      </Text>
    </NoticeFrame>
  )
}

export const NoticeFrame = styled(View, {
  className: 'no-opacity-fade',
  borderWidth: 2,
  borderColor: 'color6',
  paddingRight: '4',
  paddingLeft: '4',
  py: '3',
  bg: 'color3',
  gap: '3',
  my: '4',
  br: '4',
  pos: 'relative',
})
