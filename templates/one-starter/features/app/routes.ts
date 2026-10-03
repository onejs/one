/**
 * @agent-rule
 * route contract source of truth. update these constants before updating the
 * components that import them. every exported href should be non-empty; after
 * removing a route, grep for old paths in redirects, tabs, headers, and links.
 * keep this module ui-free: the project server evaluates it.
 */
import type { Href } from 'one'

export const APP_TABS_ROUTE_NAME = '(tabs)'
export const APP_FEED_ROUTE_NAME = 'feed'
export const APP_PROFILE_ROUTE_NAME = 'profile'
export const APP_FEED_HREF = '/home/feed' satisfies Href
export const APP_PROFILE_HREF = '/home/profile' satisfies Href
export const APP_SETTINGS_HREF = '/home/settings' satisfies Href
export const APP_SETTINGS_EDIT_PROFILE_HREF = '/home/settings/edit-profile' satisfies Href
export const APP_SETTINGS_NOTIFICATIONS_HREF = '/home/settings/notifications' satisfies Href
// the feed's create/edit entry: one dialog on web, the system form sheet on
// native, the same file under soft and hard navigation alike.
export const APP_FEED_MAKE_HREF = '/home/feed/make' satisfies Href
// the post-login landing, declared after every href it can alias: a constant
// read before its declaration throws when the module loads. the feed's own
// chrome (its tab and create actions) targets APP_FEED_HREF, so pointing the
// landing at another screen moves only the landing.
export const APP_HOME_HREF = APP_FEED_HREF

export function postDetailHref<T extends string>(postId: T) {
  return `/home/feed/post/${postId}` satisfies Href
}

// the tab set itself lives in ./tabs.ts, which imports these hrefs. this file
// is also read by the project server (seed and notification destinations), so
// it must stay free of ui imports such as icons.
