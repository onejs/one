/**
 * @agent-rule
 * every notification an app can send is one workflow declared here. a workflow
 * owns its user-facing copy, the presentations it supports, and its defaults.
 * add a workflow by adding a `NOTIFICATION_WORKFLOWS` entry and one arm of
 * `composeNotification`; nothing else needs to change.
 */
import { storeNotificationDestination } from './destinations'
import type { StoredNotificationDestination } from './destinations'

export type NotificationWorkflowId = 'postComment'

export type NotificationWorkflowDefinition = Readonly<{
  id: NotificationWorkflowId
  // the label and description the notification settings list renders.
  label: string
  description: string
  // presentations this workflow can use at all. a workflow the product never
  // pushes leaves `systemPush` false and its preference row hides that switch.
  supportsForegroundToast: boolean
  supportsSystemPush: boolean
  defaultForegroundToastEnabled: boolean
  defaultSystemPushEnabled: boolean
}>

export const NOTIFICATION_WORKFLOWS: Record<
  NotificationWorkflowId,
  NotificationWorkflowDefinition
> = {
  postComment: {
    id: 'postComment',
    label: 'Comments on your posts',
    description: 'When someone comments on something you posted.',
    supportsForegroundToast: true,
    supportsSystemPush: true,
    defaultForegroundToastEnabled: true,
    defaultSystemPushEnabled: true,
  },
}

// the order the settings list renders. an explicit list keeps the settings
// screen stable instead of depending on object key order.
export const NOTIFICATION_WORKFLOW_ORDER: readonly NotificationWorkflowId[] = ['postComment']

export function notificationWorkflow(workflow: string): NotificationWorkflowDefinition | null {
  for (const id of NOTIFICATION_WORKFLOW_ORDER) {
    if (id === workflow) return NOTIFICATION_WORKFLOWS[id]
  }
  return null
}

// the input each workflow needs to write one event, discriminated by workflow
// so a sender cannot pass the wrong fields.
export type NotificationEventInput = {
  workflow: 'postComment'
  commenterName: string
  postId: string
}

export type NotificationContent = Readonly<
  {
    workflow: NotificationWorkflowId
    title: string
    body: string
  } & StoredNotificationDestination
>

// turn one product event into the row the inbox stores and the payload a
// system notification carries. copy lives here, not at the call site, so web,
// native, and the server all say the same thing.
export function composeNotification(input: NotificationEventInput): NotificationContent {
  switch (input.workflow) {
    case 'postComment':
      return {
        workflow: 'postComment',
        title: 'New comment',
        body: `${input.commenterName} commented on your post`,
        ...storeNotificationDestination({ kind: 'post', id: input.postId }),
      }
  }
}
