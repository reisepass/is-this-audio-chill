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
7. View the overall **Calmness Score** at the bottom after reviewing all details

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

## Browser Compatibility

Requires modern browser with:
- Web Audio API
- Canvas 2D
- ES6+ JavaScript
- FileReader API

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

See LICENSE file for details.

## Contributing

This is a V1 implementation focused on core functionality. Future versions will expand analysis methods and input sources.
