#!/bin/bash
# One real Cauldron brief build (PeNtA, Silver Screen, Claude Code). Usage: run.sh
set -u
S=/Users/habibi/.hermes/profiles/claudia/cache/scratch/penta-enriched
APP=/Users/habibi/hermes/apps-codebases/cauldron/out/Cauldron-darwin-arm64/Cauldron.app/Contents/MacOS/Cauldron
export CAULDRON_E2E_SITE="$S/sites/penta-cauldron"
export CAULDRON_TEST_USER_DATA="$S/userdata/claude"
export CAULDRON_BRIEF_TEST=1
export CAULDRON_BRIEF_FILE="$S/briefs/B-penta.txt"
export CAULDRON_BRIEF_DIRECTION="silver-screen"
export CAULDRON_AGENT_TOOL="claude"
export CAULDRON_BRIEF_TIMEOUT=900000
export CAULDRON_BRIEF_MEASURE=1
export CAULDRON_QUALITY_PAGES="/,/gallery,/contact"
export CAULDRON_BRIEF_REPORT="$S/measure/penta-quality.json"
export NODE_ENV=development
"$APP" > "$S/logs/claude-cauldron.log" 2>&1
echo "exit=$?" | tee "$S/logs/claude-exit.txt"
