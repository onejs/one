import { serverWhere, zql } from 'on-zero'
const permission = serverWhere('userPublic', () => {
  return true
})
export const userById = (props: { userId: string }) => {
  return zql.userPublic.where(permission).where('id', props.userId).one()
}
export const userWithState = (props: { userId: string }) => {
  return zql.userPublic
    .where(permission)
    .where('id', props.userId)
    .one()
    .related('state', (q) => q.where('userId', props.userId).one())
}
