#!/bin/bash
# Lowers the pitch of all voice clips in audio/praise and audio/encourage
# by a fixed amount, keeping speech speed/tempo unchanged.
#
# IMPORTANT: only run this ONCE per fresh batch of clips. It edits the
# files in place, so running it twice on the same files stacks the pitch
# shift and makes the voice sound wrong. Workflow: run
# scripts/generate-voice-lines.sh first (produces fresh, unshifted
# clips), then run this script once.
#
# Requires ffmpeg (brew install ffmpeg).
#
# SHIFT controls how much lower: 0.891 ≈ -2 semitones (current default).
# Smaller number = deeper voice. 0.944 ≈ -1 semitone, 0.841 ≈ -3 semitones.

set -e
SHIFT="0.944"
TEMPO=$(python3 -c "print(1/${SHIFT})")
DIR="$(dirname "$0")/../audio"

for f in "$DIR"/praise/*.mp3 "$DIR"/encourage/*.mp3; do
  echo "Lowering pitch: $f"
  ffmpeg -y -loglevel error -i "$f" \
    -af "asetrate=44100*${SHIFT},aresample=44100,atempo=${TEMPO}" \
    "$f.tmp.mp3"
  mv "$f.tmp.mp3" "$f"
done

echo "Done."
