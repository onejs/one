Rote collection only. No diagnosis, no architecture opinions, no correctness verdicts. Report the collected facts to your parent session and stop. Do not edit any file, do not commit, do not spawn.

TASK
Build a caller inventory for the package `@vxrn/native` (source at /Users/n8/.worktrees/one-native/packages/native). I need to know who actually imports each export and how, because a replacement package is being written and each surface must be migrated by caller behavior.

STEP 1 - list the exports
Read /Users/n8/.worktrees/one-native/packages/native/src (use its index/entry file) and list every public export name with the file:line where it is defined and a one-line description of what it is (component, hook, constant object, type).

STEP 2 - find the callers
Search these roots ONLY, and prune node_modules, dist, .git, ios/build, and any generated output:
  /Users/n8/.worktrees/one-native
  /Users/n8/one
  /Users/n8/chat
  /Users/n8/takeout
  /Users/n8/soot
  /Users/n8/takeout-free
  /Users/n8/orez
Search for: the module specifier `@vxrn/native`, and separately each exported identifier name.

For every hit that is a real import or usage (not a definition inside the package itself, not a lockfile, not a changelog), record one row:
  repo | file:line | which export | how it is used (props passed / call shape, one line)

STEP 3 - report
Output a markdown table of the rows, grouped by export name, then a short list of exports with ZERO callers found.

RULES
- Do NOT search /Users/n8 itself, ~/.worktrees broadly, or ~/github.
- If a repo directory does not exist, say so and move on.
- Quote the exact ripgrep commands you ran.
- Label claims RAN / INFERRED. An empty result means "no hit under the roots and prunes I searched", not "no callers exist"; say it that way.
- You do NOT own: any edit, any migration decision, any recommendation about what to build.

REVIEW: none
