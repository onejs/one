#!/usr/bin/env bash
# generate commit-based release notes for a v* tag.
# github's built-in note generation only lists merged PRs, so releases cut from
# direct-to-main commits come out empty. this lists the actual commits instead.
# usage: scripts/gen-release-notes.sh <tag> [output-file]
set -euo pipefail

tag="${1:?usage: gen-release-notes.sh <tag> [output-file]}"
out="${2:-}"
repo_url="https://github.com/onejs/one"

# previous v* tag by version. main pushes tag a version commit that lives only
# on its tag, so the last release is not reachable from this one's parent.
prev="$(git tag --list 'v*' --sort=v:refname | awk -v t="$tag" '$0 == t { print p; exit } { p = $0 }')"

if [ -n "$prev" ]; then
  range="${prev}..${tag}"
else
  range="$tag"
fi

# non-merge commits in range, dropping version-bump commits (stable "vX.Y.Z" and canary)
commits="$(git log --no-merges --reverse --pretty=format:'* %s (%h)' "$range" \
  | grep -vE '^\* (v[0-9]+\.[0-9]+\.[0-9]+|canary[0-9])' || true)"

# github rejects release bodies over 125000 characters; keep the newest
# commits that fit and point at the full compare for the rest
total="$(printf '%s\n' "$commits" | grep -c . || true)"
rev() { awk '{ l[NR] = $0 } END { for (i = NR; i > 0; i--) print l[i] }'; }
commits="$(printf '%s\n' "$commits" | rev | awk '{ n += length($0) + 1 } n <= 110000' | rev)"
kept="$(printf '%s\n' "$commits" | grep -c . || true)"

body="## What's Changed"$'\n\n'
if [ "$kept" -lt "$total" ]; then
  body+="_$((total - kept)) older commits omitted; see the full changelog below._"$'\n\n'
fi
if [ -n "$commits" ]; then
  body+="$commits"
else
  body+="_No notable changes._"
fi
if [ -n "$prev" ]; then
  body+=$'\n\n'"**Full Changelog**: ${repo_url}/compare/${prev}...${tag}"
fi

if [ -n "$out" ]; then
  printf '%s\n' "$body" >"$out"
else
  printf '%s\n' "$body"
fi
