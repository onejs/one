#!/usr/bin/env bash
# generate commit-based release notes for a v* tag.
# github's built-in note generation only lists merged PRs, so releases cut from
# direct-to-main commits come out empty. this lists the actual commits instead.
# usage: scripts/gen-release-notes.sh <tag> [output-file]
set -euo pipefail

tag="${1:?usage: gen-release-notes.sh <tag> [output-file]}"
out="${2:-}"
repo_url="https://github.com/onejs/one"

# previous v* tag reachable from this tag's parent
prev="$(git describe --tags --match 'v*' --abbrev=0 "${tag}^" 2>/dev/null || true)"

if [ -n "$prev" ]; then
  range="${prev}..${tag}"
else
  range="$tag"
fi

# non-merge commits in range, dropping the version-bump commits (subject "vX.Y.Z")
commits="$(git log --no-merges --reverse --pretty=format:'* %s (%h)' "$range" \
  | grep -vE '^\* v[0-9]+\.[0-9]+\.[0-9]+' || true)"

body="## What's Changed"$'\n\n'
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
