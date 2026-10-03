import type { NotificationPermissionStatus } from '~/features/notifications/helpers'

// what each authorization actually gets the user. quiet authorization is its
// own row rather than a shade of "on", because a provisionally authorized app
// delivers to the notification center and never shows a banner or plays a
// sound, and telling the user it is off is just as wrong as telling them it is
// fully on.
export const PERMISSION_COPY: Record<
  NotificationPermissionStatus,
  { title: string; description: string }
> = {
  granted: {
    title: 'Allowed',
    description: 'Reminders can appear while the app is closed.',
  },
  provisional: {
    title: 'Quiet notifications',
    description: 'Reminders arrive silently in Notification Center, with no banner or sound.',
  },
  ephemeral: {
    title: 'Allowed for this session',
    description: 'Reminders stop when this session ends.',
  },
  undetermined: {
    title: 'Not allowed',
    description: 'Without this, reminders only appear inside the app.',
  },
  denied: {
    title: 'Not allowed',
    description: 'Without this, reminders only appear inside the app.',
  },
  unsupported: { title: '', description: '' },
}
