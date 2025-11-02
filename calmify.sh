#!/bin/bash

# calmify.sh - Make audio files calmer for sleep playlists
# Usage: ./calmify.sh input.mp3 [output.mp3]

set -e

if [ $# -lt 1 ]; then
    echo "Usage: $0 <input_file> [output_file]"
    echo ""
    echo "Example: $0 input.mp3"
    echo "Example: $0 input.mp3 output.mp3"
    echo ""
    echo "This script applies audio processing to make files calmer:"
    echo "  - Compression to reduce volume spikes"
    echo "  - Limiting to prevent peaks"
    echo "  - Loudness normalization"
    echo "  - Low-pass filter to reduce harsh high frequencies"
    echo "  - High-pass filter to remove rumble"
    exit 1
fi

INPUT_FILE="$1"

if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file '$INPUT_FILE' not found"
    exit 1
fi

if [ $# -eq 2 ]; then
    OUTPUT_FILE="$2"
else
    FILENAME=$(basename "$INPUT_FILE")
    EXTENSION="${FILENAME##*.}"
    NAME="${FILENAME%.*}"
    OUTPUT_FILE="${NAME}_calmified.${EXTENSION}"
fi

echo "============================================"
echo "Calmifying Audio"
echo "============================================"
echo "Input:  $INPUT_FILE"
echo "Output: $OUTPUT_FILE"
echo ""
echo "Processing..."
echo ""

ffmpeg -i "$INPUT_FILE" \
  -af "acompressor=threshold=-28dB:ratio=3:attack=10:release=500, \
       alimiter=limit=-2dB, \
       loudnorm=I=-23:TP=-2:LRA=11, \
       lowpass=f=4500, \
       highpass=f=80" \
  "$OUTPUT_FILE" \
  -y

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================"
    echo "✓ Calmified audio saved to: $OUTPUT_FILE"
    echo "============================================"

    INPUT_SIZE=$(du -h "$INPUT_FILE" | cut -f1)
    OUTPUT_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    echo "Input size:  $INPUT_SIZE"
    echo "Output size: $OUTPUT_SIZE"
else
    echo ""
    echo "Error: ffmpeg processing failed"
    exit 1
fi
