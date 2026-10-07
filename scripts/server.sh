#!/usr/bin/env bash
set -euo pipefail
exec ssh -F /Users/stefanolaptop/.ssh/config_cdp_netcup cdp-netcup "$@"
