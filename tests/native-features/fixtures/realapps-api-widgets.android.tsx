import { Results } from './realapps-api-report'
const apis = ['One.Widgets', 'One.iOS.WidgetUI', 'One.LiveActivities']
export default function WidgetsUnsupported() {
  return (
    <Results
      results={Object.fromEntries(
        apis.map((api) => [
          api,
          {
            api,
            status: 'unsupported' as const,
            scope: 'iOS widget/live activity extension API; no Android substitute',
          },
        ])
      )}
    />
  )
}
