# Android Calendar reminders

The standalone harness compiles the production reminder store and receiver,
plus the generated Nitro value types, directly from their source locations.
It adds no mock task store or alarm implementation. It does not compile the
Nitro adapter or establish React Native bridge acceptance.

Run with an Android SDK and Java 17:

```sh
tm window run heavy -- gradle -p packages/one/android/Tests/CalendarReminders/harness testDebugUnitTest assembleDebug
```

The seven Robolectric tests exercise actual SQLite, AlarmManager and
NotificationManager paths: CRUD cancellation, early/stale/duplicate delivery,
permission revocation, invalid input, recurring completion, month/date bounds,
and reboot rescheduling. The APK's `NativeHarness` also creates one active,
one completed and one deleted dated task with `--es operation schedule`.
After moving it to the background, kill its process with `am kill`, preserving
alarms. Force-stop cancels alarms and cannot prove cold delivery. An OS
broadcast must start a new process and post only the active task's notification.

RAN on API 37, 2026-10-12: the production-source harness built; seven tests
passed. ActivityManager killed PID 3776 at 10:56:01.509 and started PID 3913
for OneCalendarReminderReceiver at 10:56:14.959. The notification dump contains
only the active task's identifier and title, `Cold reminder proof`; completed
and deleted controls did not post. A subsequent permission revoke produced
`E_REMINDERS_PERMISSION` when listing. This is native emulator proof, with
full Nitro/React and physical-device acceptance remaining under the lane owner.

Android has no standalone reminder-list provider corresponding to EventKit.
These are app-private tasks. Each incomplete dated task has one inexact OS
alarm; neither a running React instance nor JS polling is needed for delivery.
Undated tasks have no alarm. Notifications use their own channel and Android
13 notification authorization. Recurrence advances when completed, preserves
completed history and respects count/date bounds. Tasks do not sync with Google
Tasks or other apps. Uninstall or clearing app data removes them. System power
policy may delay alarms. No exact-alarm permission is requested.
