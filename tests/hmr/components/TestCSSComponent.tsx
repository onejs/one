import './TestCSSComponent.css'
import './css-a.css'
import './css-b.css'
import './css-c.css'

export function TestCSSComponent() {
  return (
    <div style={{ display: 'flex', gap: 8, padding: 8 }}>
      <div
        data-testid="css-test-a"
        className="css-test-a"
        style={{ width: 50, height: 50 }}
      />
      <div
        data-testid="css-test-b"
        className="css-test-b"
        style={{ width: 50, height: 50 }}
      />
      <div
        data-testid="css-test-c"
        className="css-test-c"
        style={{ width: 50, height: 50 }}
      />
    </div>
  )
}
