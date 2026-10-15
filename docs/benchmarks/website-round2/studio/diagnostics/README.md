# Studio investigation

These runs explore causes under ordinary host load. Their timings and Lighthouse scores do not establish a performance improvement and must remain separate from earlier comparisons.

The router subscription probe found no extra link render during navigation. Development memory grew mainly when dependency optimization started. Importing the framework libraries alone did not reproduce that growth. Reducing initial dependencies and discovering them at runtime caused server errors and increased memory after visiting pages; that experiment is rejected.

The next experiment scans actual page imports before serving. It must preserve server-rendered content and live updates before any memory improvement can be considered.
