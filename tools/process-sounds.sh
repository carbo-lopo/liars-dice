#!/usr/bin/env bash
# Prepares the game's sounds: trims leading silence, sets each effect's average
# loudness to a target for its role, limits peaks, and encodes MP3.
# Usage: process.sh <input dir> <output dir>
set -euo pipefail
IN="$1"; OUT="$2"; mkdir -p "$OUT"

mean_db() { ffmpeg -hide_banner -i "$1" -af volumedetect -f null - 2>&1 | awk '/mean_volume/ {print $5}'; }

# source file : output name : target mean dB
EFFECTS=(
  "click5.ogg:click.mp3:-26"
  "click1.ogg:click-strong.mp3:-24"
  "toggle_002.ogg:counted.mp3:-24"
  "dice-throw-1.ogg:die-land.mp3:-27"
  "dice-shake-1.ogg:dice-shake-1.mp3:-27"
  "dice-shake-2.ogg:dice-shake-2.mp3:-27"
  "dice-shake-3.ogg:dice-shake-3.mp3:-27"
  "stamp.mp3:stamp.mp3:-19"
)

for spec in "${EFFECTS[@]}"; do
  IFS=: read -r src dst target <<<"$spec"
  trimmed="$OUT/.trim-$dst.wav"
  ffmpeg -hide_banner -loglevel error -y -i "$IN/$src" \
    -af "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.005" -ar 44100 "$trimmed"
  gain=$(awk -v t="$target" -v m="$(mean_db "$trimmed")" 'BEGIN { printf "%.1f", t - m }')
  ffmpeg -hide_banner -loglevel error -y -i "$trimmed" \
    -af "volume=${gain}dB,alimiter=limit=0.89:level=false" -c:a libmp3lame -b:a 128k "$OUT/$dst"
  rm "$trimmed"
  echo "$dst: gain ${gain} dB"
done

# Music: trim silence at both ends, fade the edges so the loop joins smoothly.
music_in="$IN/vibing-over-venus.mp3"
ffmpeg -hide_banner -loglevel error -y -i "$music_in" \
  -af "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse" \
  "$OUT/.music.wav"
len=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/.music.wav")
fade_start=$(awk -v l="$len" 'BEGIN { printf "%.2f", l - 3 }')
ffmpeg -hide_banner -loglevel error -y -i "$OUT/.music.wav" \
  -af "afade=t=in:d=0.5,afade=t=out:st=${fade_start}:d=3" -c:a libmp3lame -b:a 96k "$OUT/vibing-over-venus.mp3"
rm "$OUT/.music.wav"
echo "vibing-over-venus.mp3: ${len}s"
