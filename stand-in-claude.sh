#!/bin/sh
# Evidence stand-in for the Claude CLI: fakes the version and the update,
# passes everything else to the real CLI. Never runs the real updater.
state="$(dirname "$0")/fake-version"
case "$1" in
  --version|-v) echo "$(cat "$state") (Claude Code)" ;;
  update) sleep 15; echo "2.1.287" > "$state"; echo "Successfully updated to 2.1.287" ;;
  install|doctor|migrate-installer) echo "disabled in evidence sandbox" >&2; exit 1 ;;
  *) DISABLE_AUTOUPDATER=1 exec /home/haywan/.local/bin/claude "$@" ;;
esac
