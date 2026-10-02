import { View, styled } from 'tamagui'

export const ContainerDocs = styled(View, {
  py: '8',
  paddingLeft: '5 gtSm:8',
  pr: '5 gtSm:8 gtLg:10',
  mx: 'auto',
  width: '100%',
  maxWidth: '900px gtSm:760px gtMd:calc(100vw - 425px) gtLg:840px',
  mt: 'gtSm:20px',
  ml: 'gtMd:225px gtLg:auto',
  mr: 'gtMd:0px gtLg:auto',
  pos: 'relative',
  br: '5',
})

export const ContainerSm = styled(View, {
  // className: 'container-sm-shadow',
  mx: 'auto',
  // '$theme-dark': {
  //   // background: '#000',
  //   background: 'rgba(20,20,20, 0.88)',
  // },
  px: '5 gtSm:10',
  py: '3 gtSm:6',
  width: '100%',
  maxWidth: 900,
  pos: 'relative',
  // background: '#fff',
  // background: 'rgba(255,255,255,0.5)',
  // backdropFilter: 'blur(20px)',
  br: '10',
})

export const Container = styled(View, {
  mx: 'auto',
  paddingLeft: '4',
  pr: '4 gtSm:2 gtMd:2 gtLg:10',
  width: '100%',
  maxWidth: 'gtSm:760px gtMd:760px gtLg:840px',
  pos: 'relative',
})
