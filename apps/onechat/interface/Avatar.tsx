export const Avatar = ({ image, size = 32 }: { image: string; size?: number }) => {
  return <img style={{ width: size, height: size, borderRadius: 100 }} src={image} />
}
