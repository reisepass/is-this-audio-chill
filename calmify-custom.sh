#!/bin/bash

# calmify-custom.sh - Make audio files calmer with customizable parameters
# Usage: ./calmify-custom.sh input.mp3 [options]

set -e

INPUT_FILE=""
OUTPUT_FILE=""

COMPRESS_THRESHOLD="-28dB"
COMPRESS_RATIO="3"
COMPRESS_ATTACK="10"
COMPRESS_RELEASE="500"
LIMIT_DB="-2dB"
LOUDNESS_I="-23"
LOUDNESS_TP="-2"
LOUDNESS_LRA="11"
LOWPASS_FREQ="4500"
HIGHPASS_FREQ="80"

show_help() {
    cat << EOF
Usage: $0 <input_file> [options]

Options:
  -o, --output FILE           Output file (default: input_calmified.ext)
  -t, --threshold DB          Compressor threshold (default: -28dB)
  -r, --ratio RATIO           Compressor ratio (default: 3)
  -a, --attack MS             Compressor attack (default: 10ms)
  -e, --release MS            Compressor release (default: 500ms)
  -l, --limit DB              Limiter ceiling (default: -2dB)
  -i, --loudness-i LUFS       Target integrated loudness (default: -23 LUFS)
  --loudness-tp DB            True peak limit (default: -2dB)
  --loudness-lra LU           Loudness range (default: 11 LU)
  --lowpass FREQ              Low-pass filter frequency (default: 4500 Hz)
  --highpass FREQ             High-pass filter frequency (default: 80 Hz)
  -h, --help                  Show this help

Presets:
  --gentle                    Very gentle processing (less compression)
  --moderate                  Moderate processing (default)
  --aggressive                Strong processing (heavy compression)

Examples:
  $0 input.mp3
  $0 input.mp3 -o output.mp3
  $0 input.mp3 --gentle
  $0 input.mp3 --aggressive --lowpass 3000
  $0 input.mp3 -t -32dB -r 4 --lowpass 4000

Processing steps:
  1. Compression - Reduces dynamic range, prevents sudden volume changes
  2. Limiting - Hard ceiling to prevent peaks
  3. Loudness normalization - Consistent perceived volume
  4. Low-pass filter - Removes harsh high frequencies
  5. High-pass filter - Removes low rumble
EOF
}

apply_preset() {
    case "$1" in
        gentle)
            COMPRESS_THRESHOLD="-32dB"
            COMPRESS_RATIO="2"
            COMPRESS_ATTACK="20"
            COMPRESS_RELEASE="800"
            LOWPASS_FREQ="6000"
            ;;
        moderate)
            # Default values
            ;;
        aggressive)
            COMPRESS_THRESHOLD="-24dB"
            COMPRESS_RATIO="4"
            COMPRESS_ATTACK="5"
            COMPRESS_RELEASE="300"
            LOWPASS_FREQ="3500"
            HIGHPASS_FREQ="100"
            ;;
    esac
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --gentle)
            apply_preset "gentle"
            shift
            ;;
        --moderate)
            apply_preset "moderate"
            shift
            ;;
        --aggressive)
            apply_preset "aggressive"
            shift
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        -t|--threshold)
            COMPRESS_THRESHOLD="$2"
            shift 2
            ;;
        -r|--ratio)
            COMPRESS_RATIO="$2"
            shift 2
            ;;
        -a|--attack)
            COMPRESS_ATTACK="$2"
            shift 2
            ;;
        -e|--release)
            COMPRESS_RELEASE="$2"
            shift 2
            ;;
        -l|--limit)
            LIMIT_DB="$2"
            shift 2
            ;;
        -i|--loudness-i)
            LOUDNESS_I="$2"
            shift 2
            ;;
        --loudness-tp)
            LOUDNESS_TP="$2"
            shift 2
            ;;
        --loudness-lra)
            LOUDNESS_LRA="$2"
            shift 2
            ;;
        --lowpass)
            LOWPASS_FREQ="$2"
            shift 2
            ;;
        --highpass)
            HIGHPASS_FREQ="$2"
            shift 2
            ;;
        *)
            if [ -z "$INPUT_FILE" ]; then
                INPUT_FILE="$1"
            else
                echo "Error: Unknown option: $1"
                exit 1
            fi
            shift
            ;;
    esac
done

if [ -z "$INPUT_FILE" ]; then
    echo "Error: No input file specified"
    echo ""
    show_help
    exit 1
fi

if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file '$INPUT_FILE' not found"
    exit 1
fi

if [ -z "$OUTPUT_FILE" ]; then
    FILENAME=$(basename "$INPUT_FILE")
    EXTENSION="${FILENAME##*.}"
    NAME="${FILENAME%.*}"
    OUTPUT_FILE="${NAME}_calmified.${EXTENSION}"
fi

echo "============================================"
echo "Calmifying Audio (Custom Settings)"
echo "============================================"
echo "Input:  $INPUT_FILE"
echo "Output: $OUTPUT_FILE"
echo ""
echo "Settings:"
echo "  Compressor: threshold=$COMPRESS_THRESHOLD, ratio=$COMPRESS_RATIO:1"
echo "              attack=${COMPRESS_ATTACK}ms, release=${COMPRESS_RELEASE}ms"
echo "  Limiter:    limit=$LIMIT_DB"
echo "  Loudness:   I=$LOUDNESS_I LUFS, TP=$LOUDNESS_TP dB, LRA=$LOUDNESS_LRA LU"
echo "  Filters:    lowpass=${LOWPASS_FREQ}Hz, highpass=${HIGHPASS_FREQ}Hz"
echo ""
echo "Processing..."
echo ""

ffmpeg -i "$INPUT_FILE" \
  -af "acompressor=threshold=$COMPRESS_THRESHOLD:ratio=$COMPRESS_RATIO:attack=$COMPRESS_ATTACK:release=$COMPRESS_RELEASE, \
       alimiter=limit=$LIMIT_DB, \
       loudnorm=I=$LOUDNESS_I:TP=$LOUDNESS_TP:LRA=$LOUDNESS_LRA, \
       lowpass=f=$LOWPASS_FREQ, \
       highpass=f=$HIGHPASS_FREQ" \
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
    echo ""
    echo "Tip: Run './is-this-audio-chill' analyzer to verify calmness score!"
else
    echo ""
    echo "Error: ffmpeg processing failed"
    exit 1
fi
