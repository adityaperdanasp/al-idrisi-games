#!/bin/bash
# Generates:
#   - 30 generic praise clips   -> ../audio/praise/praise-NN.mp3
#   - 30 generic encourage clips -> ../audio/encourage/encourage-NN.mp3
#   - 26 name-only clips         -> ../audio/names/{id}.mp3
# All using the ElevenLabs "Bella" voice (free tier), so every clip shares
# the same voice/tone. Praise/encourage lines never mention a name — the
# matching name clip is played first and chained in by script.js at runtime.
#
# Re-run this only if you want to regenerate the voice lines (e.g. after
# switching voices, or to add a new player's name clip).

set -e

API_KEY="sk_7248faa782c9158512b54fef4581bfbc3412760575be7e8f"
VOICE_ID="EXAVITQu4vr4xnSDxMaL"   # ElevenLabs "Bella"
MODEL_ID="eleven_multilingual_v2"
OUT_DIR="$(dirname "$0")/../audio"

mkdir -p "$OUT_DIR/praise" "$OUT_DIR/encourage" "$OUT_DIR/names"

PRAISE=(
  "Awesome! You got it!"
  "Brilliant work!"
  "You're a math star!"
  "Perfect! You're on fire!"
  "Great job! Keep going!"
  "Yes! Nailed it!"
  "Amazing! You're so smart!"
  "Correct! You're unstoppable!"
  "Fantastic! Well done!"
  "You rock!"
  "Way to go! That's right!"
  "Woohoo! You got it right!"
  "Incredible! You're crushing it!"
  "That's exactly right!"
  "Super job! You're a genius!"
  "Yay! You figured it out!"
  "You're on a roll!"
  "Bravo! Spot on!"
  "Excellent! Keep it up!"
  "You nailed that one!"
  "Outstanding work!"
  "You're a champion!"
  "Sharp thinking! Correct!"
  "That's the spirit!"
  "Wow, that's impressive!"
)

ENCOURAGE=(
  "Almost there! Try again!"
  "Good try! You'll get the next one!"
  "Keep going! You're learning!"
  "Don't give up! You've got this!"
  "Close one! Let's keep practicing!"
  "Nice effort! Next one's yours!"
  "You're getting better!"
  "Stay strong! Try again!"
  "That's okay! Champions keep trying!"
  "Not quite, but you'll shine on the next one!"
  "Nice thinking! Let's try the next question!"
  "That's alright! Mistakes help us learn!"
  "So close! You'll get it next time!"
  "It's okay! Every try makes you smarter!"
  "Take your time, you'll figure it out!"
)

# id -> spoken name (as said aloud, e.g. teachers get their title)
NAME_IDS=(sofhie euis rachel bram azka aikara alesha annisa ludens aysha enzo india izzan kaisa kala kimikeira kinan hana maisa arsya neil nara skyela tareq anya rigel)
NAME_TEXT=("Ms. Sofhie!" "Mrs. Euis!" "Ms. Rachel!" "Bram!" "Azka!" "Aikara!" "Alesha!" "Annisa!" "Ludens!" "Aysha!" "Enzo!" "India!" "Izzan!" "Kaisa!" "Kala!" "Kimikeira!" "Kinan!" "Hana!" "Maisa!" "Arsya!" "Neil!" "Nara!" "Skyela!" "Tareq!" "Anya!" "Rigel!")

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

i=1
for text in "${PRAISE[@]}"; do
  n=$(printf "%02d" $i)
  generate "$text" "$OUT_DIR/praise/praise-$n.mp3"
  i=$((i+1))
done

i=1
for text in "${ENCOURAGE[@]}"; do
  n=$(printf "%02d" $i)
  generate "$text" "$OUT_DIR/encourage/encourage-$n.mp3"
  i=$((i+1))
done

for idx in "${!NAME_IDS[@]}"; do
  id="${NAME_IDS[$idx]}"
  text="${NAME_TEXT[$idx]}"
  generate "$text" "$OUT_DIR/names/$id.mp3"
done

echo "Done. Generated ${#PRAISE[@]} praise, ${#ENCOURAGE[@]} encourage, ${#NAME_IDS[@]} name clips."
