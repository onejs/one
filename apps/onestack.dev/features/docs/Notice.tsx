import { Text, View, styled } from 'tamagui'
import { unwrapText } from './unwrapText'

export const Notice = ({ children, theme = 'yellow', disableUnwrap, ...props }: any) => {
  return (
    <NoticeFrame theme={theme} {...props}>
      <Text
        color="color11"
        fontSize="5"
        lineHeight="5"
        paddingVertical="2"
        marginTop={-3}
        marginBottom={-3}
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
  paddingVertical: '3',
  backgroundColor: 'color3',
  gap: '3',
  marginVertical: '4',
  borderRadius: '4',
  position: 'relative',
})
