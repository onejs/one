export default function SSGFlickerTestPage() {
  return (
    <div id="ssg-flicker-test-root">
      <h1>SSG Flicker Test</h1>
      <p id="ssg-content-marker">This content should not flicker after hydration</p>
    </div>
  )
}
