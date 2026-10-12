import { View, styled } from 'tamagui'

export const ContainerDocs = styled(View, {
  paddingVertical: '8',
  paddingLeft: '5 gtSm:8',
  paddingRight: '5 gtSm:8 gtLg:10',
  marginHorizontal: 'auto',
  width: '100%',
  maxWidth: '900px gtSm:760px gtMd:calc(100vw - 425px) gtLg:840px',
  marginTop: 'gtSm:20px',
  marginLeft: 'gtMd:225px gtLg:auto',
  marginRight: 'gtMd:0px gtLg:auto',
  position: 'relative',
  borderRadius: '5',
})

export const ContainerSm = styled(View, {
  // className: 'container-sm-shadow',
  marginHorizontal: 'auto',
  // '$theme-dark': {
  //   // background: '#000',
  //   background: 'rgba(20,20,20, 0.88)',
  // },
  paddingHorizontal: '5 gtSm:10',
  paddingVertical: '3 gtSm:6',
  width: '100%',
  maxWidth: 900,
  position: 'relative',
  // background: '#fff',
  // background: 'rgba(255,255,255,0.5)',
  // backdropFilter: 'blur(20px)',
  borderRadius: '10',
})

export const Container = styled(View, {
  marginHorizontal: 'auto',
  paddingLeft: '4',
  paddingRight: '4 gtSm:2 gtMd:2 gtLg:10',
  width: '100%',
  maxWidth: 'gtSm:760px gtMd:760px gtLg:840px',
  position: 'relative',
})
