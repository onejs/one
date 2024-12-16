export const AppTab = () => {
  return (
    <>
      {/* biome-ignore lint/a11y/useIframeTitle: <explanation> */}
      <iframe
        style={{
          borderWidth: 0,
          height: '100%',
          width: '100%',
        }}
        src="http://localhost:1421/_devtools/app"
      />
    </>
  )
}
