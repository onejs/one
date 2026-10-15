# Studio continuation

The build-memory fix is ready for owner review. It saves memory by avoiding redundant data transfers from workers, while retaining useful build parallelism. The recorded build times do not support a broad speed claim.

Both later navigation attempts are closed. Loading page code sooner did not reproduce a reliable gain. The second attempt improved repeated navigation slightly but made first production navigation slower. Neither implementation is retained.

Continue from the baseline: profile navigation for a different cause, then investigate page loading and Lighthouse, then measure fresh development memory. Keep Studio measurements separate from the earlier hosts. Framework fixes get independent large-model approval before merging by pull request. Public site changes and fixes with large tradeoffs go to the owner.

The preparation script installs locked dependencies in the isolated source tree and both preserved website fixtures, pins the same React compiler in both, builds the source package family once, and installs the shared family into both fixtures. It verifies shared versions, MDX bytes and the compiler each framework resolves. The existing navigation profiler is reused without changing its behavior. Resource admission is required before running the setup and profiling commands.
