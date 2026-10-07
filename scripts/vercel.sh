#!/usr/bin/env bash
set -euo pipefail
exec env -u VERCEL_TOKEN npm --cache /Users/stefanolaptop/.cache/cdp-npm exec --yes --package vercel@59.11.7 -- vercel --global-config /Users/stefanolaptop/.config/vercel-teamricercatvg --scope tor-vergata-igiene "$@"
