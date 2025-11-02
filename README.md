# Is This Audio Chill?

A fast, browser-based utility to analyze audio files and determine if they're suitable for sleep playlists. Scores audio "calmness" based on volume variance, dynamic range, and peak detection.

## Features

### V1 (Current Implementation)

- **Local File Analysis**: Select audio files from your local filesystem
- **Fast Processing**: Uses Web Audio API for efficient in-browser analysis
- **Zero Dependencies**: Pure JavaScript implementation with no external libraries
- **Memory Efficient**: Streaming analysis that doesn't scale memory usage with file size

### Analysis Methods

1. **Amplitude Analysis**
   - Moving window amplitude detection (100ms windows)
   - Standard deviation-based variance detection
   - Identifies sections exceeding average + 1σ threshold

2. **RMS Energy Analysis**
   - Root Mean Square energy calculation over time
   - Variance in dB for loudness stability measurement
   - Smooth energy profile visualization

3. **Dynamic Range Detection**
   - 95th vs 5th percentile amplitude comparison
   - Measures overall "compression" level
   - Lower range = more consistent audio

4. **Peak Ratio Analysis**
   - Maximum volume vs average volume comparison
   - Detects sharp volume spikes
   - Ideal ratio < 2x for calm audio

### Visualizations

- **Loudness Over Time**: Static histogram showing RMS loudness per second with average and threshold lines
- **Live Playback Visualization**: Real-time synced visualization with moving playhead (red when playing, gray when paused)
- **RMS Energy**: Smooth energy profile with average line over time
- **Top 5 Non-Calm Sections**: Sorted by spike intensity with amplitude values displayed. Click to jump 3s before
- **Top 5 Loudest Seconds**: Ranked by RMS value. Shows the exact loudest moments in the audio

## Usage

1. Open `index.html` in a modern web browser
2. Click "Choose Audio File" and select an audio file (MP3, WAV, OGG, OPUS, etc.)
3. **Analysis starts automatically** - audio player appears at the bottom as a floating footer
4. Scroll through the visualizations and metrics while audio player follows you
5. **Click any timestamp** (non-calm or top RMS) to jump 3 seconds before that section
6. Watch the **Live Playback Visualization** in the footer to see the playhead move in sync with audio
7. **Enable real-time calmification** to apply audio processing on-the-fly (compression, filtering)
8. Choose between **Gentle**, **Moderate**, or **Aggressive** presets to control processing intensity
9. View the overall **Calmness Score** at the bottom after reviewing all details

## Scoring System

The calmness score (0-100) is calculated from:

```
calmness = 0.4 × variance_score + 0.3 × dynamic_range_score + 0.3 × peak_score
```

Where each component is normalized 0-1:
- **Variance Score**: Based on RMS variance in dB (target < 3 dB)
- **Dynamic Range Score**: Based on amplitude range (target < 0.1)
- **Peak Score**: Based on max/avg ratio (target < 2x)

### Score Interpretation

- **80-100**: Very calm - Perfect for sleep playlists
- **60-79**: Moderately calm - Good for relaxation
- **40-59**: Somewhat calm - May have variations
- **0-39**: Not calm - Not recommended for sleep

## Real-Time Audio Calmification

The web app includes real-time audio processing using the Web Audio API, allowing you to hear the effects of calmification immediately without re-encoding files.

### Features

- **Toggle on/off**: Enable or disable processing in real-time
- **Three presets**: Quick access to predefined settings (Gentle, Moderate, Aggressive)
- **Advanced controls**: Fine-tune all processing parameters individually
- **Custom preset**: Save your own custom settings
- **Zero latency**: Instant audio processing in the browser
- **Compare easily**: Switch between original and processed audio on-the-fly

### Presets

**Gentle** - Light processing for already calm audio:
- Compressor: threshold=-32dB, ratio=2:1, attack=20ms, release=800ms
- Low-pass filter: 6000 Hz
- High-pass filter: 80 Hz

**Moderate** (Default) - Balanced processing:
- Compressor: threshold=-28dB, ratio=3:1, attack=10ms, release=500ms
- Low-pass filter: 4500 Hz
- High-pass filter: 80 Hz

**Aggressive** - Heavy compression for very dynamic audio:
- Compressor: threshold=-24dB, ratio=4:1, attack=5ms, release=300ms
- Low-pass filter: 3500 Hz
- High-pass filter: 100 Hz

**Custom** - Your own saved settings

### Advanced Controls

Click the "⚙️ Advanced" button to access detailed parameter controls:

#### Compressor Settings
- **Threshold** (-60dB to -10dB): Volume level where compression starts. Lower = more compression kicks in.
- **Ratio** (1:1 to 20:1): How much compression is applied. Higher = stronger compression.
- **Attack** (0-100ms): How quickly compression starts when threshold is exceeded.
- **Release** (10-2000ms): How quickly compression stops after level drops below threshold.

#### Filter Settings
- **Low-pass Filter** (1000-10000 Hz): Removes high frequencies above this point. Lower = more muffled/calmer.
- **High-pass Filter** (20-300 Hz): Removes low frequencies below this point. Higher = less bass rumble.

#### White Noise Masking (Fill Silent Moments)
Adds white noise to prevent jarring silences that could startle during sleep.

**Enable White Noise:**
- Toggle the "Enable White Noise" checkbox to turn masking on/off
- All settings appear when enabled

**Basic Mode:**
- **White Noise Volume** (5-100%, default 30%): Amount of constant white noise
- Set to desired level for consistent background sound

**Dynamic Mode:**
- **Dynamic Mode Checkbox**: Enables intelligent noise that only appears during quiet sections
- **Anticipation** (0-20 dB): How early to start fading in (higher = earlier)
- **Quiet Threshold** (-70 to -20 dB): Determines what counts as "quiet"
  - Lower = more sensitive (activates more often)
  - Higher = less sensitive (only during very quiet moments)
- **Fade In Speed** (0.2-3 seconds): How quickly noise appears
  - Shorter = faster response, fills silences immediately
  - Default: 0.8s for quick response
- **Fade Out Speed** (0.5-5 seconds): How gradually noise disappears
  - Longer = smoother transitions
  - Default: 2s for gradual fade

**How Dynamic Mode Works:**
1. Continuously monitors audio levels in real-time (~60fps)
2. Detects when volume is trending downward (getting quieter)
3. **Anticipates** silence and starts fading in BEFORE it becomes quiet
4. When volume rises above threshold, white noise gradually fades out
5. Prevents sudden silences that could wake you up

#### Workflow
1. Start with a preset (Gentle/Moderate/Aggressive)
2. Click "Advanced" to fine-tune parameters
3. Adjust sliders in real-time while listening
4. Enable white noise to fill quiet moments
5. Try Dynamic Mode for automatic quiet section filling
6. Click "Save as Custom" to store your settings
7. Click "Reset to Preset" to return to the selected preset
8. Click "💾 Render & Download" to export processed audio as a WAV file

### Processing Chain

```
Audio Element → DynamicsCompressor → MidrangeCut → LowPassFilter → HighPassFilter → OutputGain → Analyser → Destination
                                                                                                    ↓
White Noise Generator → WhiteNoiseGain (static or dynamic) ────────────────────────────────────→ Destination
```

### How It Works

1. **DynamicsCompressor**: Reduces dynamic range by compressing loud sections based on threshold/ratio/knee
2. **Midrange Cut**: Reduces harsh frequencies around 2.5kHz that can cause listening fatigue
3. **Low-pass Filter**: Removes harsh high frequencies above cutoff with adjustable Q factor
4. **High-pass Filter**: Removes low rumble below cutoff with adjustable Q factor
5. **Output Gain**: Final volume adjustment to compensate for processing
6. **Analyser**: Monitors audio levels for dynamic white noise (doesn't affect audio)
7. **White Noise**: Mixed separately, either constant or dynamically responding to quiet sections
8. All processing happens in real-time with no file modification
9. All parameters update instantly as you adjust them

### Render & Download Processed Audio

Export your calmified audio as a permanent file that can be used anywhere!

**Features:**
- Renders all current processing settings into a new audio file
- Uses OfflineAudioContext for fast, high-quality rendering
- Includes white noise (static mode only) if enabled
- **Two export formats:**
  - **WebM (Default)**: Compressed format (~128 kbps), much smaller file size, good quality
  - **WAV**: Lossless format, larger file size, perfect quality
- Progress bar shows rendering status
- File named automatically as `original_name_calmified.webm` or `.wav`

**How to use:**
1. Load an audio file and adjust all settings to your liking
2. Select your preferred export format (WebM for smaller size, WAV for lossless)
3. Click the "💾 Render & Download Processed Audio" button
4. Wait for rendering to complete (usually a few seconds)
5. File downloads automatically to your downloads folder
6. Use the processed file in any audio player or sleep app!

**Note:** Dynamic white noise mode is not included in renders (only static white noise), since dynamic mode requires real-time analysis. Set white noise to a constant level if you want it in your exported file.

**Format Comparison:**
- **WebM**: 10-20x smaller files, good for most use cases, compatible with modern players
- **WAV**: No quality loss, larger files, universal compatibility

## Technical Details

### Architecture

```
index.html          - Main interface
├── style.css       - Styling
├── audio-analyzer.js - Core analysis engine
├── visualizer.js    - Canvas-based visualizations
└── main.js         - UI coordination
```

### Key Algorithms

**Amplitude Windows**:
- Window size: 100ms (0.1s)
- Hop size: 50ms (50% overlap)
- Analysis: Mean absolute amplitude per window

**RMS Calculation**:
```javascript
rms = sqrt(sum(samples^2) / window_size)
```

**FFT for Spectrogram**:
- FFT size: 2048 samples
- Hop size: 1024 samples
- Window: Hann window
- Implementation: Cooley-Tukey radix-2 FFT

### Performance Characteristics

- **Memory**: O(1) with respect to file size (streaming analysis)
- **Time Complexity**: O(n) where n = number of samples
- **File Size Support**: Tested up to 100MB+ files
- **Processing Speed**: ~1-3 seconds for typical 3-5 minute songs

## Future Enhancements (Roadmap)

### V2 - Advanced Analysis
- Spectral flux detection
- Spectral centroid for frequency brightness
- Zero-crossing rate for noise detection
- Onset rate for rhythmic activity detection
- Tempo estimation

### V3 - Input Methods
- Remote HTTP file fetching
- YouTube audio analysis
- Playlist analysis (YouTube, podcast RSS)

### V4 - Optimizations
- Rust + WASM for 10-100x speedup
- Web Workers for background processing
- Batch file analysis

## Audio Calmification Scripts

Two bash scripts are included to process audio files and make them calmer:

### `calmify.sh` - Simple Processing

Basic script with sensible defaults:

```bash
./calmify.sh input.mp3                    # Creates input_calmified.mp3
./calmify.sh input.mp3 output.mp3         # Custom output name
```

### `calmify-custom.sh` - Advanced Processing

Customizable parameters and presets:

```bash
# Presets
./calmify-custom.sh input.mp3 --gentle        # Light processing
./calmify-custom.sh input.mp3 --moderate      # Default (balanced)
./calmify-custom.sh input.mp3 --aggressive    # Heavy compression

# Custom parameters
./calmify-custom.sh input.mp3 \
  --threshold -32dB \
  --ratio 4 \
  --lowpass 3000 \
  --highpass 100

# See all options
./calmify-custom.sh --help
```

### Processing Steps

Both scripts apply:
1. **Compression** - Reduces dynamic range and volume spikes
2. **Limiting** - Hard ceiling to prevent peaks
3. **Loudness normalization** - Consistent perceived volume
4. **Low-pass filter** - Removes harsh high frequencies (default: 4500Hz)
5. **High-pass filter** - Removes low rumble (default: 80Hz)

### Requirements

- `ffmpeg` installed (install via `brew install ffmpeg`)

### Workflow

1. Analyze original file: Select in web interface
2. If score is low, calmify it: `./calmify.sh audio.mp3`
3. Re-analyze calmified version: Select `audio_calmified.mp3`
4. Compare scores!

## Browser Compatibility

Requires modern browser with:
- Web Audio API (for analysis and real-time processing)
- Canvas 2D (for visualizations)
- ES6+ JavaScript
- FileReader API
- AudioContext and DynamicsCompressor support

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

See LICENSE file for details.

## Contributing

This is a V1 implementation focused on core functionality. Future versions will expand analysis methods and input sources.
