type Props = {
  name?: string | null
  imageUrl?: string | null
  size?: number
}

export default function UserAvatar({ name, imageUrl, size = 36 }: Props) {
  const initial = name ? name.charAt(0).toUpperCase() : '?'

  return (
    <div
      className="si-avatar"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={name || ''} />
      ) : (
        initial
      )}
    </div>
  )
}
