#!/bin/bash
# Build minified version of Planner.js
# Usage: ./build.sh
#
# Produces Planner.min.js — copy this to Scriptable on iPhone
# Source of truth: Planner.js (always edit this one)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$SCRIPT_DIR/Planner.js"
OUT="$SCRIPT_DIR/Planner.min.js"

# Preserve the Scriptable header (must be at the very top)
head -3 "$SRC" > "$OUT"

# Minify the rest (skip first 3 lines)
# --module enables top-level await (Scriptable supports it)
tail -n +4 "$SRC" | npx terser \
  --module \
  --compress passes=2,drop_console=false \
  --mangle toplevel=false \
  --format quote_style=1 \
  >> "$OUT"

ORIG=$(wc -c < "$SRC" | tr -d ' ')
MIN=$(wc -c < "$OUT" | tr -d ' ')
SAVED=$((ORIG - MIN))
PCT=$((SAVED * 100 / ORIG))

echo "✅ Planner.min.js created"
echo "   Original:  ${ORIG} bytes"
echo "   Minified:  ${MIN} bytes"
echo "   Saved:     ${SAVED} bytes (${PCT}%)"
