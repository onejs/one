# Studio investigation

These runs explore causes under ordinary host load. Their timings and Lighthouse scores do not establish a performance improvement and remain separate from earlier comparisons.

The router subscription probe found no extra link render during navigation. Development memory grew mainly when dependency optimization started. Importing the framework libraries alone did not reproduce that growth. Reducing initial dependencies and discovering them at runtime caused server errors and increased memory after visiting pages. Scanning actual page imports also logged invalid React hook calls and left memory close to the control. Both approaches are rejected.

Removing unused vendored React entries showed a small diagnostic memory reduction and passed focused optimizer tests. Confirmation stopped because the unchanged baseline itself emitted warnings. No memory improvement is accepted.

The investigation found that loading One in another Vite environment could replace the server context reader with one bound to another React instance. A separate fix passes its regression, nearby router tests, six development and production page checks, and live updates that preserve the document and theme. An independent large model approved it, and its pull request is ready with automatic merging enabled. Production client and server bundles emitted no native code.

A separate Tamagui configuration warning remains during style extraction and blocks the memory comparison. It is tracked for an upstream fix. The strict warning checks remain in place.
