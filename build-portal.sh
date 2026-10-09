#!/usr/bin/env bash
# Package a game for a web portal: ./build-portal.sh <game-folder> <crazygames|poki>
# Output: dist/<portal>/<game>.zip — upload the zip in the portal's developer dashboard.
set -euo pipefail
cd "$(dirname "$0")"
game="${1:?game folder, e.g. one-line}"; portal="${2:?crazygames or poki}"
case "$portal" in
  crazygames) sdk='https://sdk.crazygames.com/crazygames-sdk-v3.js' ;;
  poki)       sdk='https://game-cdn.poki.com/scripts/v2/poki-sdk.js' ;;
  *) echo "unknown portal: $portal" >&2; exit 1 ;;
esac
out="dist/$portal/$game"
rm -rf "$out" "$out.zip"; mkdir -p "$out"
cp -R "$game"/. "$out"/
cp portal.js "$out"/portal.js
# SDK + portal flag go first in <head>; the game then loads the local portal.js copy
python3 - "$out/index.html" "$portal" "$sdk" <<'PY'
import sys
p, portal, sdk = sys.argv[1:]
s = open(p).read()
head = f'<head>\n<script>window.PORTAL = "{portal}";</script>\n<script src="{sdk}"></script>'
s = s.replace('<head>', head, 1).replace('src="../portal.js"', 'src="portal.js"')
assert 'href="../"' not in s.replace('web-only" href="../"', '').replace('web-only"><a href="../"', ''), 'unguarded link back to the hub'
open(p, 'w').write(s)
PY
(cd "$out" && zip -qr "../$game.zip" .)
echo "built dist/$portal/$game.zip ($(du -h "dist/$portal/$game.zip" | cut -f1))"
