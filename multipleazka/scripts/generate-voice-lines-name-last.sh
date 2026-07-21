#!/bin/bash
# Adds variety to the cheer voice: these lines are phrased to end right
# before a name, so the name clip chains in AFTER the line instead of
# before it — e.g. "That's exactly right, Arsya!"
#
# Continues the existing numbering:
#   praise-26..40.mp3    (15 new "name-last" clips, after the 25 existing
#                         "name-first" praise-01..25.mp3)
#   encourage-16..25.mp3 (10 new "name-last" clips, after the 15 existing
#                         "name-first" encourage-01..15.mp3)
#
# script.js/voice.js decide play order from the clip NUMBER: <= the
# name-first count plays name-then-line, otherwise line-then-name.
# Same ElevenLabs "Bella" voice as every other clip.

set -e

API_KEY="sk_7248faa782c9158512b54fef4581bfbc3412760575be7e8f"
VOICE_ID="EXAVITQu4vr4xnSDxMaL"   # ElevenLabs "Bella"
MODEL_ID="eleven_multilingual_v2"
OUT_DIR="$(dirname "$0")/../audio"

mkdir -p "$OUT_DIR/praise" "$OUT_DIR/encourage"

# Phrased to read naturally right before a name is spoken next.
PRAISE_NAME_LAST=(
  "That's exactly right,"
  "Awesome job today,"
  "You really nailed that one,"
  "Great thinking there,"
  "Correct answer,"
  "Well done,"
  "Fantastic work,"
  "You're on fire today,"
  "Perfect answer,"
  "You got it,"
  "Bravo,"
  "Sharp thinking,"
  "That's the spirit,"
  "Excellent work,"
  "Impressive,"
)

ENCOURAGE_NAME_LAST=(
  "Keep trying,"
  "You'll get it next time,"
  "Don't worry,"
  "Good effort,"
  "Almost there,"
  "Stay positive,"
  "Nice attempt,"
  "You're learning fast,"
  "Keep your head up,"
  "That's okay,"
)

generate() {
  local text="$1"
  local outfile="$2"
  local status
  status=$(curl -s -o "$outfile" -w "%{http_code}" -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}" \
    -H "xi-api-key: ${API_KEY}" \
    -H "Content-Type: application/json" \
    -H "Accept: audio/mpeg" \
    -d "{\"text\": \"${text}\", \"model_id\": \"${MODEL_ID}\", \"voice_settings\": {\"stability\": 0.5, \"similarity_boost\": 0.75}}")
  if [ "$status" != "200" ]; then
    echo "FAILED ($status): $outfile — $(cat "$outfile")"
    rm -f "$outfile"
    return 1
  fi
  echo "OK: $outfile"
}

i=26
for text in "${PRAISE_NAME_LAST[@]}"; do
  n=$(printf "%02d" $i)
  generate "$text" "$OUT_DIR/praise/praise-$n.mp3"
  i=$((i+1))
done

i=16
for text in "${ENCOURAGE_NAME_LAST[@]}"; do
  n=$(printf "%02d" $i)
  generate "$text" "$OUT_DIR/encourage/encourage-$n.mp3"
  i=$((i+1))
done

echo "Done. Generated ${#PRAISE_NAME_LAST[@]} name-last praise, ${#ENCOURAGE_NAME_LAST[@]} name-last encourage clips."
