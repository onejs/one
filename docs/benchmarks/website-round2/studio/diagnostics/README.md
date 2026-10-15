# Studio investigation

These runs explore causes under ordinary host load. Their timings and Lighthouse scores do not establish a performance improvement and must remain separate from earlier comparisons.

The router subscription probe found no extra link render during navigation. Development memory grew mainly when dependency optimization started. Importing the framework libraries alone did not reproduce that growth. Reducing initial dependencies and discovering them at runtime caused server errors and increased memory after visiting pages; that experiment is rejected.

Scanning actual page imports preserved the checked headings but logged invalid React hook calls after reoptimization. Memory after visiting pages remained close to the control. That approach is also rejected. A smaller experiment now removes unused vendored React entries from the initial optimizer list while preserving existing dependency behavior.
