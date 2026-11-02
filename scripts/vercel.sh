#!/usr/bin/env bash
set -euo pipefail
exec env -u VERCEL_TOKEN npm exec --yes --package vercel@59.11.7 -- vercel --global-config "${HOME}/.config/vercel-teamricercatvg" --scope tor-vergata-igiene "$@"
