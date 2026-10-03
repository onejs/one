import { serverWhere, zql } from 'on-zero'

export const notificationPreferencePermission = serverWhere('notificationPreference', (q, auth) =>
  q.cmp('userId', auth?.id ?? ''),
)

// one row per workflow the user has actually changed. a workflow with no row
// uses its registry defaults, so this stays small as workflows are added.
export const notificationPreferences = () => {
  return zql.notificationPreference.where(notificationPreferencePermission)
}
