#!/usr/bin/env bash
# Called only after both signed APKs pass the Android launch check.
set -euo pipefail
: "${RELEASE_VERSION:?}" "${GITHUB_SHA:?}"
[[ "$RELEASE_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
[[ "$GITHUB_SHA" =~ ^[0-9a-f]{40}$ ]]
ref="refs/tags/v${RELEASE_VERSION}"
previous=$(git ls-remote --refs origin "$ref" | cut -f1)
# A lease rejects an unexpected concurrent change; never silently replace it.
git push --force-with-lease="$ref:$previous" origin "$GITHUB_SHA:$ref"
# Repair the known stale 1.1.4 source tag without changing its published APKs.
legacy_ref=refs/tags/v1.1.4
legacy_previous=$(git ls-remote --refs origin "$legacy_ref" | cut -f1)
if [[ "$legacy_previous" == 382c5a96114c6d8ed34fce25f3b899e3df1bb889 ]]; then
  legacy_source=8d0ac229f0d4ff2ac30531fb8262f80a3e655bb0
  git fetch --no-tags origin "$legacy_source"
  git push --force-with-lease="$legacy_ref:$legacy_previous" origin "$legacy_source:$legacy_ref"
fi
