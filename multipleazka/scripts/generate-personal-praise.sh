#!/bin/bash
# Generates 3 FULLY recorded (not spliced) praise clips per player, name
# spoken naturally in the middle of the sentence — sounds smoother than the
# name-clip + generic-line splice used for everyone else. Excludes Azka
# (he already has his own original full recordings, see audio/azka-original).
#
# Output: ../audio/praise-personal/{id}-01.mp3, {id}-02.mp3, {id}-03.mp3
# Same ElevenLabs "Bella" voice as every other clip.
# ~2,300 characters total across 75 clips — safe within a small credit budget.

set -e

API_KEY="sk_7248faa782c9158512b54fef4581bfbc3412760575be7e8f"
VOICE_ID="EXAVITQu4vr4xnSDxMaL"   # ElevenLabs "Bella"
MODEL_ID="eleven_multilingual_v2"
OUT_DIR="$(dirname "$0")/../audio/praise-personal"

mkdir -p "$OUT_DIR"

# id -> spoken name (title kept for teachers)
IDS=(sofhie euis rachel bram aikara alesha annisa ludens aysha enzo india izzan kaisa kala kimikeira kinan hana maisa arsya neil nara skyela tareq anya rigel)
NAMES=("Ms. Sofhie" "Mrs. Euis" "Ms. Rachel" "Bram" "Aikara" "Alesha" "Annisa" "Ludens" "Aysha" "Enzo" "India" "Izzan" "Kaisa" "Kala" "Kimikeira" "Kinan" "Hana" "Maisa" "Arsya" "Neil" "Nara" "Skyela" "Tareq" "Anya" "Rigel")

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

for idx in "${!IDS[@]}"; do
  id="${IDS[$idx]}"
  name="${NAMES[$idx]}"
  generate "Awesome, ${name}! You got it!" "$OUT_DIR/$id-01.mp3"
  generate "Wow ${name}, that's exactly right!" "$OUT_DIR/$id-02.mp3"
  generate "Great job, ${name}! You're a star!" "$OUT_DIR/$id-03.mp3"
done

echo "Done. Generated $((${#IDS[@]} * 3)) personal praise clips for ${#IDS[@]} players."
