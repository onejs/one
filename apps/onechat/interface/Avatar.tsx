export const Avatar = ({ image, size = 20 }: { image: string; size?: number }) => {
  return <img style={{ width: size, height: size, borderRadius: 100 }} src={image} />
}
