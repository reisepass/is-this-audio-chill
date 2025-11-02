let analyzer = null;
let visualizer = null;
let currentFile = null;
let audioPlayer = null;

// Web Audio API for real-time processing
let audioContext = null;
let sourceNode = null;
let compressorNode = null;
let lowpassNode = null;
let highpassNode = null;
let midCutNode = null;
let stereoSplitter = null;
let stereoMerger = null;
let leftGain = null;
let rightGain = null;
let outputGainNode = null;
let isProcessingEnabled = false;
let audioProcessingSetup = false;

// White noise nodes
let whiteNoiseBuffer = null;
let whiteNoiseSource = null;
let whiteNoiseGain = null;
let analyserNode = null;
let dynamicNoiseEnabled = false;
let dynamicNoiseAnimationId = null;

// White noise settings
let whiteNoiseSettings = {
    enabled: false,
    volume: 30,
    dynamicMode: false,
    quietThreshold: -50,
    fadeInTime: 0.8,
    fadeOutTime: 2.0,
    anticipation: 10
};

// Store custom settings
let customSettings = {
    threshold: -28,
    ratio: 3,
    attack: 10,
    release: 500,
    knee: 30,
    lowpass: 4500,
    highpass: 80,
    lowpassQ: 1.0,
    highpassQ: 1.0,
    stereoWidth: 100,
    midCut: 0,
    outputGain: 0
};

document.addEventListener('DOMContentLoaded', () => {
    analyzer = new AudioAnalyzer();
    visualizer = new Visualizer();
    audioPlayer = document.getElementById('audioPlayer');

    const fileInput = document.getElementById('audioFile');
    const fileInfo = document.getElementById('fileInfo');
    const audioPlayerContainer = document.getElementById('audioPlayerContainer');

    fileInput.addEventListener('change', async (e) => {
        currentFile = e.target.files[0];
        if (currentFile) {
            fileInfo.textContent = `Selected: ${currentFile.name} (${formatFileSize(currentFile.size)})`;

            const fileURL = URL.createObjectURL(currentFile);
            audioPlayer.src = fileURL;
            audioPlayerContainer.style.display = 'block';

            // Setup Web Audio API processing for real-time calmification (only once)
            if (!audioProcessingSetup) {
                setupAudioProcessing();
            }

            visualizer.stopLiveUpdate();
            document.getElementById('liveVisualizationContainer').style.display = 'none';

            const loading = document.getElementById('loading');
            const results = document.getElementById('results');

            loading.style.display = 'block';
            results.style.display = 'none';

            try {
                const analysisResults = await analyzer.loadAndAnalyze(currentFile);
                console.log('Analysis complete:', analysisResults);

                displayResults(analysisResults);

                results.style.display = 'block';
            } catch (error) {
                alert(`Error analyzing audio: ${error.message}`);
                console.error('Analysis error:', error);
            } finally {
                loading.style.display = 'none';
            }
        } else {
            fileInfo.textContent = '';
            audioPlayerContainer.style.display = 'none';
            visualizer.stopLiveUpdate();
            document.getElementById('liveVisualizationContainer').style.display = 'none';
        }
    });
});

function displayResults(results) {
    const calmnessScore = document.getElementById('calmnessScore');
    const scoreDescription = document.getElementById('scoreDescription');

    calmnessScore.textContent = results.calmness.score;

    if (results.calmness.score >= 80) {
        scoreDescription.textContent = 'Very calm - Perfect for sleep playlists';
    } else if (results.calmness.score >= 60) {
        scoreDescription.textContent = 'Moderately calm - Good for relaxation';
    } else if (results.calmness.score >= 40) {
        scoreDescription.textContent = 'Somewhat calm - May have some variations';
    } else {
        scoreDescription.textContent = 'Not calm - Not recommended for sleep';
    }

    const volumeVariance = document.getElementById('volumeVariance');
    const volumeVarianceStatus = document.getElementById('volumeVarianceStatus');
    volumeVariance.textContent = `${results.rms.varianceDB.toFixed(2)} dB`;

    if (Math.abs(results.rms.varianceDB) < 3) {
        volumeVarianceStatus.textContent = 'Low variance - Very stable';
        volumeVarianceStatus.className = 'metric-status status-good';
    } else if (Math.abs(results.rms.varianceDB) < 6) {
        volumeVarianceStatus.textContent = 'Moderate variance';
        volumeVarianceStatus.className = 'metric-status status-warning';
    } else {
        volumeVarianceStatus.textContent = 'High variance - Unstable volume';
        volumeVarianceStatus.className = 'metric-status status-bad';
    }

    const dynamicRange = document.getElementById('dynamicRange');
    const dynamicRangeStatus = document.getElementById('dynamicRangeStatus');
    dynamicRange.textContent = results.amplitude.dynamicRange.toFixed(3);

    if (results.amplitude.dynamicRange < 0.1) {
        dynamicRangeStatus.textContent = 'Very compressed - Consistent';
        dynamicRangeStatus.className = 'metric-status status-good';
    } else if (results.amplitude.dynamicRange < 0.3) {
        dynamicRangeStatus.textContent = 'Moderate range';
        dynamicRangeStatus.className = 'metric-status status-warning';
    } else {
        dynamicRangeStatus.textContent = 'Wide range - Large volume changes';
        dynamicRangeStatus.className = 'metric-status status-bad';
    }

    const peakRatio = document.getElementById('peakRatio');
    const peakRatioStatus = document.getElementById('peakRatioStatus');
    peakRatio.textContent = results.amplitude.peakRatio.toFixed(2) + 'x';

    if (results.amplitude.peakRatio < 2) {
        peakRatioStatus.textContent = 'Low peaks - Gentle audio';
        peakRatioStatus.className = 'metric-status status-good';
    } else if (results.amplitude.peakRatio < 4) {
        peakRatioStatus.textContent = 'Moderate peaks';
        peakRatioStatus.className = 'metric-status status-warning';
    } else {
        peakRatioStatus.textContent = 'High peaks - Sharp volume spikes';
        peakRatioStatus.className = 'metric-status status-bad';
    }

    console.log('Drawing visualizations...');
    console.log('Amplitude data:', results.amplitude);
    console.log('RMS data:', results.rms);

    visualizer.stopLiveUpdate();

    visualizer.drawAmplitude(results.amplitude, results.duration, results.nonCalmSections);
    visualizer.drawRMS(results.rms, results.duration);
    visualizer.drawLive(results.amplitude, results.duration, results.nonCalmSections, audioPlayer);

    document.getElementById('liveVisualizationContainer').style.display = 'block';

    console.log('Visualizations drawn');

    const nonCalmSections = document.getElementById('nonCalmSections');
    const topRMSSections = document.getElementById('topRMSSections');

    const top5NonCalm = results.nonCalmSections.slice(0, 5);

    if (top5NonCalm.length === 0) {
        nonCalmSections.innerHTML = '<h3>No Non-Calm Sections Detected</h3><p>This audio maintains consistent volume throughout.</p>';
        nonCalmSections.style.background = '#d4edda';
        nonCalmSections.style.borderColor = '#28a745';
    } else {
        let html = '<h3>Top 5 Non-Calm Sections (Volume Spikes)</h3>';
        html += '<p>Sorted by intensity (worst first). Click timestamp to jump 3 seconds before that section:</p>';
        html += '<div>';

        for (let i = 0; i < top5NonCalm.length; i++) {
            const section = top5NonCalm[i];
            const isWorst = i === 0;
            const badgeClass = isWorst ? 'time-range clickable worst' : 'time-range clickable';
            const spikeSize = section.maxAmplitude.toFixed(4);
            html += `<span class="${badgeClass}" data-time="${section.start}">
                ${formatTime(section.start)} - ${formatTime(section.end)}
                <span class="spike-value">(${spikeSize})</span>${isWorst ? ' ⚠️' : ''}
            </span> `;
        }

        html += '</div>';
        nonCalmSections.innerHTML = html;
        nonCalmSections.style.background = '#fff3cd';
        nonCalmSections.style.borderColor = '#ffc107';

        document.querySelectorAll('#nonCalmSections .time-range.clickable').forEach(el => {
            el.addEventListener('click', () => {
                const time = parseFloat(el.getAttribute('data-time'));
                const startTime = Math.max(0, time - 3);
                audioPlayer.currentTime = startTime;
                audioPlayer.play();

                document.getElementById('audioPlayerContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    let rmsHtml = '<h3>Top 5 Loudest Seconds (by RMS)</h3>';
    rmsHtml += '<p>The 5 seconds with highest RMS values. Click to jump 3 seconds before:</p>';
    rmsHtml += '<div>';

    for (let i = 0; i < results.topRMSSections.length; i++) {
        const section = results.topRMSSections[i];
        const isTop = i === 0;
        const badgeClass = isTop ? 'time-range clickable top-rms' : 'time-range clickable';
        const rmsValue = section.rms.toFixed(4);
        rmsHtml += `<span class="${badgeClass}" data-time="${section.start}">
            ${formatTime(section.start)} - ${formatTime(section.end)}
            <span class="spike-value">(${rmsValue})</span>${isTop ? ' 🔊' : ''}
        </span> `;
    }

    rmsHtml += '</div>';
    topRMSSections.innerHTML = rmsHtml;
    topRMSSections.style.background = '#e3f2fd';
    topRMSSections.style.borderColor = '#2196f3';
    topRMSSections.style.borderLeft = '4px solid #2196f3';
    topRMSSections.style.borderRadius = '5px';
    topRMSSections.style.padding = '15px';
    topRMSSections.style.marginTop = '15px';

    document.querySelectorAll('#topRMSSections .time-range.clickable').forEach(el => {
        el.addEventListener('click', () => {
            const time = parseFloat(el.getAttribute('data-time'));
            const startTime = Math.max(0, time - 3);
            audioPlayer.currentTime = startTime;
            audioPlayer.play();

            document.getElementById('audioPlayerContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Web Audio API Processing Functions
function setupAudioProcessing() {
    // Only set up once
    if (audioProcessingSetup) {
        console.log('Audio processing already setup, skipping...');
        return;
    }

    try {
        console.log('Setting up Web Audio API processing...');

        // Check if Web Audio API is supported
        if (!window.AudioContext && !window.webkitAudioContext) {
            throw new Error('Web Audio API not supported in this browser');
        }

        // Create AudioContext
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('AudioContext created:', audioContext.state);

        // Resume AudioContext if it's suspended (required in some browsers)
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed');
            });
        }

        // Create source node from audio element (can only be called once per element)
        console.log('Creating MediaElementSource...');
        sourceNode = audioContext.createMediaElementSource(audioPlayer);
        console.log('MediaElementSource created');

        // Create compressor node
        compressorNode = audioContext.createDynamicsCompressor();
        console.log('DynamicsCompressor created');

        // Create filter nodes
        lowpassNode = audioContext.createBiquadFilter();
        lowpassNode.type = 'lowpass';

        highpassNode = audioContext.createBiquadFilter();
        highpassNode.type = 'highpass';

        // Create midrange EQ node (peaking filter at 2.5kHz)
        midCutNode = audioContext.createBiquadFilter();
        midCutNode.type = 'peaking';
        midCutNode.frequency.value = 2500; // Center of harsh midrange
        midCutNode.Q.value = 1.0;

        // Create stereo width control nodes
        stereoSplitter = audioContext.createChannelSplitter(2);
        stereoMerger = audioContext.createChannelMerger(2);
        leftGain = audioContext.createGain();
        rightGain = audioContext.createGain();

        // Create output gain node
        outputGainNode = audioContext.createGain();

        // Create analyser node for monitoring audio levels (for dynamic white noise)
        analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 2048;
        analyserNode.smoothingTimeConstant = 0.8;

        // Create white noise
        createWhiteNoise();

        console.log('All processing nodes created');

        // Set default preset (moderate)
        applyPreset('moderate');

        // Setup event listeners for controls (only once)
        const enableCheckbox = document.getElementById('enableCalmification');
        const presetSelect = document.getElementById('calmificationPreset');
        const toggleAdvancedBtn = document.getElementById('toggleAdvanced');
        const advancedControls = document.getElementById('advancedControls');
        const resetBtn = document.getElementById('resetToPreset');
        const saveCustomBtn = document.getElementById('saveAsCustom');

        enableCheckbox.addEventListener('change', (e) => {
            isProcessingEnabled = e.target.checked;
            presetSelect.disabled = !isProcessingEnabled;
            toggleAdvancedBtn.disabled = !isProcessingEnabled;

            // Resume AudioContext on user interaction if needed
            if (isProcessingEnabled && audioContext.state === 'suspended') {
                audioContext.resume();
            }

            updateAudioRouting();
        });

        presetSelect.addEventListener('change', (e) => {
            applyPreset(e.target.value);
        });

        toggleAdvancedBtn.addEventListener('click', () => {
            const isVisible = advancedControls.style.display !== 'none';
            advancedControls.style.display = isVisible ? 'none' : 'block';
            toggleAdvancedBtn.textContent = isVisible ? '⚙️ Advanced' : '⚙️ Hide Advanced';
        });

        resetBtn.addEventListener('click', () => {
            const currentPreset = presetSelect.value;
            if (currentPreset !== 'custom') {
                applyPreset(currentPreset);
            } else {
                presetSelect.value = 'moderate';
                applyPreset('moderate');
            }
        });

        saveCustomBtn.addEventListener('click', () => {
            presetSelect.value = 'custom';
            alert('Custom settings saved! Switch back anytime from the preset dropdown.');
        });

        // Render and download button
        const renderBtn = document.getElementById('renderAndDownload');
        renderBtn.addEventListener('click', () => {
            renderAndDownloadAudio();
        });

        // Setup advanced control sliders
        setupAdvancedControls();

        // Setup white noise controls
        setupWhiteNoiseControls();

        // Initial routing (bypass by default)
        updateAudioRouting();

        audioProcessingSetup = true;
        console.log('✓ Web Audio API processing setup complete');
    } catch (error) {
        console.error('Failed to setup audio processing:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });

        // Provide specific error messages
        let errorMsg = 'Audio processing setup failed. Real-time calmification will not be available.\n\n';

        if (error.message.includes('not supported')) {
            errorMsg += 'Your browser does not support the Web Audio API.';
        } else if (error.name === 'InvalidStateError') {
            errorMsg += 'Audio element is already connected to Web Audio. Try refreshing the page.';
        } else {
            errorMsg += 'Error: ' + error.message;
        }

        alert(errorMsg);

        // Hide calmification controls if setup fails
        document.getElementById('calmificationControls').style.display = 'none';
    }
}

function applyPreset(preset) {
    if (!compressorNode || !lowpassNode || !highpassNode) return;

    const currentTime = audioContext.currentTime;
    let settings;

    switch (preset) {
        case 'gentle':
            // Light processing
            settings = {
                threshold: -32,
                ratio: 2,
                attack: 20,
                release: 800,
                knee: 40,
                lowpass: 6000,
                highpass: 80,
                lowpassQ: 0.7,
                highpassQ: 0.7,
                stereoWidth: 100,
                midCut: 0,
                outputGain: 0
            };
            break;

        case 'moderate':
            // Default balanced processing
            settings = {
                threshold: -28,
                ratio: 3,
                attack: 10,
                release: 500,
                knee: 30,
                lowpass: 4500,
                highpass: 80,
                lowpassQ: 1.0,
                highpassQ: 1.0,
                stereoWidth: 100,
                midCut: -3,
                outputGain: 0
            };
            break;

        case 'aggressive':
            // Heavy compression
            settings = {
                threshold: -24,
                ratio: 4,
                attack: 5,
                release: 300,
                knee: 20,
                lowpass: 3500,
                highpass: 100,
                lowpassQ: 1.5,
                highpassQ: 1.5,
                stereoWidth: 70,
                midCut: -6,
                outputGain: 0
            };
            break;

        case 'custom':
            // Use stored custom settings
            settings = customSettings;
            break;

        default:
            settings = customSettings;
    }

    // Apply settings to audio nodes
    compressorNode.threshold.setValueAtTime(settings.threshold, currentTime);
    compressorNode.ratio.setValueAtTime(settings.ratio, currentTime);
    compressorNode.attack.setValueAtTime(settings.attack / 1000, currentTime); // Convert ms to seconds
    compressorNode.release.setValueAtTime(settings.release / 1000, currentTime); // Convert ms to seconds
    compressorNode.knee.setValueAtTime(settings.knee, currentTime);

    lowpassNode.frequency.setValueAtTime(settings.lowpass, currentTime);
    lowpassNode.Q.setValueAtTime(settings.lowpassQ, currentTime);

    highpassNode.frequency.setValueAtTime(settings.highpass, currentTime);
    highpassNode.Q.setValueAtTime(settings.highpassQ, currentTime);

    if (midCutNode) {
        midCutNode.gain.setValueAtTime(settings.midCut, currentTime);
    }

    if (outputGainNode) {
        const gainValue = Math.pow(10, settings.outputGain / 20); // Convert dB to linear gain
        outputGainNode.gain.setValueAtTime(gainValue, currentTime);
    }

    // Apply stereo width
    applyStereoWidth(settings.stereoWidth);

    // Update UI sliders and displays
    updateAdvancedControlsUI(settings);
}

function applyStereoWidth(width) {
    // width: 0-100 (0 = mono, 100 = full stereo)
    if (!leftGain || !rightGain) return;

    const widthRatio = width / 100;
    const currentTime = audioContext.currentTime;

    // Calculate mid (mono) and side (stereo difference) gain
    const midGain = 1.0;
    const sideGain = widthRatio;

    // Simple stereo width: blend between mono and stereo
    leftGain.gain.setValueAtTime(1.0, currentTime);
    rightGain.gain.setValueAtTime(1.0, currentTime);

    // Note: Full stereo width implementation would require more complex M/S processing
    // This simplified version adjusts the overall stereo presence
}

function updateAudioRouting() {
    if (!sourceNode || !compressorNode || !lowpassNode || !highpassNode) return;

    // Disconnect everything first
    try {
        sourceNode.disconnect();
        compressorNode.disconnect();
        lowpassNode.disconnect();
        highpassNode.disconnect();
        if (midCutNode) midCutNode.disconnect();
        if (stereoSplitter) stereoSplitter.disconnect();
        if (stereoMerger) stereoMerger.disconnect();
        if (leftGain) leftGain.disconnect();
        if (rightGain) rightGain.disconnect();
        if (outputGainNode) outputGainNode.disconnect();
        if (analyserNode) analyserNode.disconnect();
        if (whiteNoiseGain) whiteNoiseGain.disconnect();
    } catch (e) {
        // Ignore disconnect errors
    }

    if (isProcessingEnabled) {
        // Route through full processing chain:
        // source → compressor → midCut → lowpass → highpass → [stereo] → output gain → analyser → destination
        sourceNode.connect(compressorNode);
        compressorNode.connect(midCutNode);
        midCutNode.connect(lowpassNode);
        lowpassNode.connect(highpassNode);

        // Stereo width processing (simplified - just pass through for now)
        highpassNode.connect(outputGainNode);

        // Connect to analyser for level monitoring (doesn't affect audio)
        outputGainNode.connect(analyserNode);

        // Final output
        outputGainNode.connect(audioContext.destination);

        // White noise is mixed in separately at destination
        if (whiteNoiseGain && whiteNoiseSettings.enabled) {
            whiteNoiseGain.connect(audioContext.destination);
        }
    } else {
        // Bypass processing: source → destination
        sourceNode.connect(audioContext.destination);

        // White noise still works in bypass mode
        if (whiteNoiseGain && whiteNoiseSettings.enabled) {
            whiteNoiseGain.connect(audioContext.destination);
        }
    }
}

function setupAdvancedControls() {
    // Get all slider elements
    const thresholdSlider = document.getElementById('threshold');
    const ratioSlider = document.getElementById('ratio');
    const attackSlider = document.getElementById('attack');
    const releaseSlider = document.getElementById('release');
    const kneeSlider = document.getElementById('knee');
    const lowpassSlider = document.getElementById('lowpass');
    const highpassSlider = document.getElementById('highpass');
    const lowpassQSlider = document.getElementById('lowpassQ');
    const highpassQSlider = document.getElementById('highpassQ');
    const stereoWidthSlider = document.getElementById('stereoWidth');
    const midCutSlider = document.getElementById('midCut');
    const outputGainSlider = document.getElementById('outputGain');

    // Threshold slider
    thresholdSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        customSettings.threshold = value;
        document.getElementById('thresholdValue').textContent = value;
        if (compressorNode && audioContext) {
            compressorNode.threshold.setValueAtTime(value, audioContext.currentTime);
        }
    });

    // Ratio slider
    ratioSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        customSettings.ratio = value;
        document.getElementById('ratioValue').textContent = value;
        if (compressorNode && audioContext) {
            compressorNode.ratio.setValueAtTime(value, audioContext.currentTime);
        }
    });

    // Attack slider
    attackSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        customSettings.attack = value;
        document.getElementById('attackValue').textContent = value;
        if (compressorNode && audioContext) {
            compressorNode.attack.setValueAtTime(value / 1000, audioContext.currentTime);
        }
    });

    // Release slider
    releaseSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        customSettings.release = value;
        document.getElementById('releaseValue').textContent = value;
        if (compressorNode && audioContext) {
            compressorNode.release.setValueAtTime(value / 1000, audioContext.currentTime);
        }
    });

    // Knee slider
    kneeSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        customSettings.knee = value;
        document.getElementById('kneeValue').textContent = value;
        if (compressorNode && audioContext) {
            compressorNode.knee.setValueAtTime(value, audioContext.currentTime);
        }
    });

    // Lowpass slider
    lowpassSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        customSettings.lowpass = value;
        document.getElementById('lowpassValue').textContent = value;
        if (lowpassNode && audioContext) {
            lowpassNode.frequency.setValueAtTime(value, audioContext.currentTime);
        }
    });

    // Highpass slider
    highpassSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        customSettings.highpass = value;
        document.getElementById('highpassValue').textContent = value;
        if (highpassNode && audioContext) {
            highpassNode.frequency.setValueAtTime(value, audioContext.currentTime);
        }
    });

    // Lowpass Q slider
    lowpassQSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        customSettings.lowpassQ = value;
        document.getElementById('lowpassQValue').textContent = value.toFixed(1);
        if (lowpassNode && audioContext) {
            lowpassNode.Q.setValueAtTime(value, audioContext.currentTime);
        }
    });

    // Highpass Q slider
    highpassQSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        customSettings.highpassQ = value;
        document.getElementById('highpassQValue').textContent = value.toFixed(1);
        if (highpassNode && audioContext) {
            highpassNode.Q.setValueAtTime(value, audioContext.currentTime);
        }
    });

    // Stereo width slider
    stereoWidthSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        customSettings.stereoWidth = value;
        document.getElementById('stereoWidthValue').textContent = value;
        applyStereoWidth(value);
    });

    // Midrange cut slider
    midCutSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        customSettings.midCut = value;
        document.getElementById('midCutValue').textContent = value;
        if (midCutNode && audioContext) {
            midCutNode.gain.setValueAtTime(value, audioContext.currentTime);
        }
    });

    // Output gain slider
    outputGainSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        customSettings.outputGain = value;
        document.getElementById('outputGainValue').textContent = value;
        if (outputGainNode && audioContext) {
            const gainValue = Math.pow(10, value / 20); // Convert dB to linear
            outputGainNode.gain.setValueAtTime(gainValue, audioContext.currentTime);
        }
    });
}

function updateAdvancedControlsUI(settings) {
    // Update slider values
    document.getElementById('threshold').value = settings.threshold;
    document.getElementById('ratio').value = settings.ratio;
    document.getElementById('attack').value = settings.attack;
    document.getElementById('release').value = settings.release;
    document.getElementById('knee').value = settings.knee;
    document.getElementById('lowpass').value = settings.lowpass;
    document.getElementById('highpass').value = settings.highpass;
    document.getElementById('lowpassQ').value = settings.lowpassQ;
    document.getElementById('highpassQ').value = settings.highpassQ;
    document.getElementById('stereoWidth').value = settings.stereoWidth;
    document.getElementById('midCut').value = settings.midCut;
    document.getElementById('outputGain').value = settings.outputGain;

    // Update display values
    document.getElementById('thresholdValue').textContent = settings.threshold;
    document.getElementById('ratioValue').textContent = settings.ratio;
    document.getElementById('attackValue').textContent = settings.attack;
    document.getElementById('releaseValue').textContent = settings.release;
    document.getElementById('kneeValue').textContent = settings.knee;
    document.getElementById('lowpassValue').textContent = settings.lowpass;
    document.getElementById('highpassValue').textContent = settings.highpass;
    document.getElementById('lowpassQValue').textContent = settings.lowpassQ.toFixed(1);
    document.getElementById('highpassQValue').textContent = settings.highpassQ.toFixed(1);
    document.getElementById('stereoWidthValue').textContent = settings.stereoWidth;
    document.getElementById('midCutValue').textContent = settings.midCut;
    document.getElementById('outputGainValue').textContent = settings.outputGain;
}

// White Noise Functions
function createWhiteNoise() {
    // Create 2 seconds of white noise
    const bufferSize = audioContext.sampleRate * 2;
    whiteNoiseBuffer = audioContext.createBuffer(2, bufferSize, audioContext.sampleRate);

    // Fill with random values (-1 to 1)
    for (let channel = 0; channel < 2; channel++) {
        const channelData = whiteNoiseBuffer.getChannelData(channel);
        for (let i = 0; i < bufferSize; i++) {
            channelData[i] = Math.random() * 2 - 1;
        }
    }

    // Create source and gain node
    whiteNoiseSource = audioContext.createBufferSource();
    whiteNoiseSource.buffer = whiteNoiseBuffer;
    whiteNoiseSource.loop = true;

    whiteNoiseGain = audioContext.createGain();
    whiteNoiseGain.gain.value = 0; // Start at 0

    whiteNoiseSource.connect(whiteNoiseGain);

    // Start the noise source
    whiteNoiseSource.start(0);

    console.log('White noise generator created');
}

function setupWhiteNoiseControls() {
    const enableCheckbox = document.getElementById('enableWhiteNoise');
    const whiteNoiseSettingsDiv = document.getElementById('whiteNoiseSettings');
    const volumeSlider = document.getElementById('whiteNoiseVolume');
    const dynamicCheckbox = document.getElementById('dynamicWhiteNoise');
    const dynamicControls = document.getElementById('dynamicControls');
    const quietThresholdSlider = document.getElementById('quietThreshold');
    const fadeInTimeSlider = document.getElementById('fadeInTime');
    const fadeOutTimeSlider = document.getElementById('fadeOutTime');
    const anticipationSlider = document.getElementById('anticipation');

    // Enable/disable white noise checkbox
    enableCheckbox.addEventListener('change', (e) => {
        whiteNoiseSettings.enabled = e.target.checked;
        whiteNoiseSettingsDiv.style.display = e.target.checked ? 'block' : 'none';

        if (e.target.checked) {
            // Enable white noise
            if (whiteNoiseSettings.dynamicMode) {
                startDynamicWhiteNoise();
            } else if (whiteNoiseGain) {
                const gainValue = whiteNoiseSettings.volume / 100 * 0.1;
                whiteNoiseGain.gain.setValueAtTime(gainValue, audioContext.currentTime);
            }
            updateAudioRouting();
        } else {
            // Disable white noise
            stopDynamicWhiteNoise();
            if (whiteNoiseGain) {
                whiteNoiseGain.gain.setValueAtTime(0, audioContext.currentTime);
            }
            updateAudioRouting();
        }
    });

    // Volume slider
    volumeSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        whiteNoiseSettings.volume = value;
        document.getElementById('whiteNoiseVolumeValue').textContent = value;

        if (whiteNoiseSettings.enabled && !whiteNoiseSettings.dynamicMode && whiteNoiseGain) {
            // In static mode, set volume directly
            const gainValue = value / 100 * 0.1; // Max 0.1 to keep it subtle
            whiteNoiseGain.gain.setValueAtTime(gainValue, audioContext.currentTime);
        }
    });

    // Dynamic mode checkbox
    dynamicCheckbox.addEventListener('change', (e) => {
        whiteNoiseSettings.dynamicMode = e.target.checked;
        dynamicControls.style.display = e.target.checked ? 'block' : 'none';

        if (e.target.checked && whiteNoiseSettings.enabled) {
            startDynamicWhiteNoise();
        } else {
            stopDynamicWhiteNoise();
            // Reset to static volume
            if (whiteNoiseGain && whiteNoiseSettings.enabled) {
                const gainValue = whiteNoiseSettings.volume / 100 * 0.1;
                whiteNoiseGain.gain.setValueAtTime(gainValue, audioContext.currentTime);
            } else if (whiteNoiseGain) {
                whiteNoiseGain.gain.setValueAtTime(0, audioContext.currentTime);
            }
        }
    });

    // Quiet threshold slider
    quietThresholdSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        whiteNoiseSettings.quietThreshold = value;
        document.getElementById('quietThresholdValue').textContent = value;
    });

    // Fade in time slider
    fadeInTimeSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        whiteNoiseSettings.fadeInTime = value;
        document.getElementById('fadeInTimeValue').textContent = value.toFixed(1);
    });

    // Fade out time slider
    fadeOutTimeSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        whiteNoiseSettings.fadeOutTime = value;
        document.getElementById('fadeOutTimeValue').textContent = value.toFixed(1);
    });

    // Anticipation slider
    anticipationSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        whiteNoiseSettings.anticipation = value;
        document.getElementById('anticipationValue').textContent = value;
    });
}

function startDynamicWhiteNoise() {
    if (!analyserNode || !whiteNoiseGain || dynamicNoiseAnimationId) return;

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    let currentNoiseGain = 0;
    let targetNoiseGain = 0;

    // Track volume history for trend detection
    const volumeHistory = [];
    const historyLength = 10; // Track last 10 samples

    const updateNoise = () => {
        // BUG FIX: Only run when audio is actually playing
        if (!audioPlayer || audioPlayer.paused || audioPlayer.ended) {
            // Audio is not playing, mute the noise
            if (currentNoiseGain > 0) {
                currentNoiseGain = Math.max(0, currentNoiseGain - 0.05);
                whiteNoiseGain.gain.setValueAtTime(currentNoiseGain, audioContext.currentTime);
            }
            dynamicNoiseAnimationId = requestAnimationFrame(updateNoise);
            return;
        }

        // Get current audio level
        analyserNode.getByteFrequencyData(dataArray);

        // Calculate RMS level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);

        // Convert to dB (approximate)
        const db = 20 * Math.log10(rms / 255 + 0.00001);

        // Track volume history
        volumeHistory.push(db);
        if (volumeHistory.length > historyLength) {
            volumeHistory.shift();
        }

        // Calculate volume trend (is it getting quieter?)
        let trend = 0;
        if (volumeHistory.length >= 3) {
            const recent = volumeHistory.slice(-3).reduce((a, b) => a + b) / 3;
            const older = volumeHistory.slice(0, 3).reduce((a, b) => a + b) / 3;
            trend = older - recent; // Positive = getting quieter
        }

        // Determine if we should have noise based on threshold + anticipation
        const maxNoiseGain = whiteNoiseSettings.volume / 100 * 0.15; // Max 0.15 for dynamic
        const anticipationThreshold = whiteNoiseSettings.quietThreshold + whiteNoiseSettings.anticipation;

        if (db < whiteNoiseSettings.quietThreshold) {
            // Audio is already quiet, full white noise
            targetNoiseGain = maxNoiseGain;
        } else if (db < anticipationThreshold && trend > 2) {
            // Audio is getting quieter (anticipation mode)
            // Scale noise based on how close to threshold and how fast it's dropping
            const proximity = 1 - ((db - whiteNoiseSettings.quietThreshold) / whiteNoiseSettings.anticipation);
            const trendFactor = Math.min(trend / 5, 1); // Normalize trend
            targetNoiseGain = maxNoiseGain * proximity * trendFactor;
        } else {
            // Audio is loud, no white noise needed
            targetNoiseGain = 0;
        }

        // Asymmetric fade: faster in, slower out
        let fadeSpeed;
        if (currentNoiseGain < targetNoiseGain) {
            // Fading in - use fade in time
            fadeSpeed = 1 / (whiteNoiseSettings.fadeInTime * 60); // 60 fps assumption
            currentNoiseGain = Math.min(targetNoiseGain, currentNoiseGain + fadeSpeed);
        } else if (currentNoiseGain > targetNoiseGain) {
            // Fading out - use fade out time
            fadeSpeed = 1 / (whiteNoiseSettings.fadeOutTime * 60);
            currentNoiseGain = Math.max(targetNoiseGain, currentNoiseGain - fadeSpeed);
        }

        // Apply gain
        whiteNoiseGain.gain.setValueAtTime(currentNoiseGain, audioContext.currentTime);

        // Continue loop
        dynamicNoiseAnimationId = requestAnimationFrame(updateNoise);
    };

    dynamicNoiseEnabled = true;
    updateNoise();
    console.log('Dynamic white noise started');
}

function stopDynamicWhiteNoise() {
    if (dynamicNoiseAnimationId) {
        cancelAnimationFrame(dynamicNoiseAnimationId);
        dynamicNoiseAnimationId = null;
    }
    dynamicNoiseEnabled = false;
    console.log('Dynamic white noise stopped');
}

// Render and Download Functions
async function renderAndDownloadAudio() {
    if (!currentFile) {
        alert('Please load an audio file first!');
        return;
    }

    const renderProgress = document.getElementById('renderProgress');
    const renderProgressBar = document.getElementById('renderProgressBar');
    const renderProgressText = document.getElementById('renderProgressText');
    const renderBtn = document.getElementById('renderAndDownload');

    try {
        renderBtn.disabled = true;
        renderProgress.style.display = 'block';
        renderProgressText.textContent = 'Loading audio file...';
        renderProgressBar.style.width = '10%';

        // Read the audio file
        const arrayBuffer = await currentFile.arrayBuffer();

        renderProgressText.textContent = 'Decoding audio...';
        renderProgressBar.style.width = '20%';

        // Create a temporary AudioContext to decode
        const tempContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await tempContext.decodeAudioData(arrayBuffer);

        renderProgressText.textContent = 'Setting up offline renderer...';
        renderProgressBar.style.width = '30%';

        // Create OfflineAudioContext with same specs as original audio
        const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
        );

        // Create source
        const offlineSource = offlineContext.createBufferSource();
        offlineSource.buffer = audioBuffer;

        // Recreate processing chain
        const offlineCompressor = offlineContext.createDynamicsCompressor();
        const offlineMidCut = offlineContext.createBiquadFilter();
        const offlineLowpass = offlineContext.createBiquadFilter();
        const offlineHighpass = offlineContext.createBiquadFilter();
        const offlineOutputGain = offlineContext.createGain();

        // Apply current settings
        const settings = customSettings;
        offlineCompressor.threshold.value = settings.threshold;
        offlineCompressor.ratio.value = settings.ratio;
        offlineCompressor.attack.value = settings.attack / 1000;
        offlineCompressor.release.value = settings.release / 1000;
        offlineCompressor.knee.value = settings.knee;

        offlineMidCut.type = 'peaking';
        offlineMidCut.frequency.value = 2500;
        offlineMidCut.Q.value = 1.0;
        offlineMidCut.gain.value = settings.midCut;

        offlineLowpass.type = 'lowpass';
        offlineLowpass.frequency.value = settings.lowpass;
        offlineLowpass.Q.value = settings.lowpassQ;

        offlineHighpass.type = 'highpass';
        offlineHighpass.frequency.value = settings.highpass;
        offlineHighpass.Q.value = settings.highpassQ;

        const gainValue = Math.pow(10, settings.outputGain / 20);
        offlineOutputGain.gain.value = gainValue;

        renderProgressText.textContent = 'Connecting audio processing chain...';
        renderProgressBar.style.width = '40%';

        // Connect nodes
        offlineSource.connect(offlineCompressor);
        offlineCompressor.connect(offlineMidCut);
        offlineMidCut.connect(offlineLowpass);
        offlineLowpass.connect(offlineHighpass);
        offlineHighpass.connect(offlineOutputGain);
        offlineOutputGain.connect(offlineContext.destination);

        // Add white noise if enabled (static only, dynamic doesn't make sense for rendering)
        if (whiteNoiseSettings.enabled) {
            const noiseBuffer = createWhiteNoiseBuffer(offlineContext, audioBuffer.duration);
            const noiseSource = offlineContext.createBufferSource();
            noiseSource.buffer = noiseBuffer;

            const noiseGain = offlineContext.createGain();
            noiseGain.gain.value = whiteNoiseSettings.volume / 100 * 0.1;

            noiseSource.connect(noiseGain);
            noiseGain.connect(offlineContext.destination);
            noiseSource.start(0);
        }

        offlineSource.start(0);

        renderProgressText.textContent = 'Rendering audio (this may take a moment)...';
        renderProgressBar.style.width = '50%';

        // Render the audio
        const renderedBuffer = await offlineContext.startRendering();

        renderProgressText.textContent = 'Converting to WAV format...';
        renderProgressBar.style.width = '80%';

        // Convert to WAV
        const wavBlob = audioBufferToWav(renderedBuffer);

        renderProgressText.textContent = 'Preparing download...';
        renderProgressBar.style.width = '90%';

        // Create download
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        const originalName = currentFile.name.replace(/\.[^/.]+$/, '');
        a.download = `${originalName}_calmified.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        renderProgressText.textContent = 'Complete! ✓';
        renderProgressBar.style.width = '100%';

        setTimeout(() => {
            renderProgress.style.display = 'none';
            renderProgressBar.style.width = '0%';
        }, 3000);

        tempContext.close();

    } catch (error) {
        console.error('Rendering failed:', error);
        alert(`Failed to render audio: ${error.message}`);
        renderProgressText.textContent = 'Error!';
    } finally {
        renderBtn.disabled = false;
    }
}

function createWhiteNoiseBuffer(audioContext, duration) {
    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(2, bufferSize, audioContext.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < bufferSize; i++) {
            channelData[i] = Math.random() * 2 - 1;
        }
    }

    return buffer;
}

function audioBufferToWav(buffer) {
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;

    const data = [];
    for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const sample = buffer.getChannelData(channel)[i];
            const int16 = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
            data.push(int16 < 0 ? int16 + 0x10000 : int16);
        }
    }

    const dataLength = data.length * bytesPerSample;
    const bufferLength = 44 + dataLength;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    // Write WAV header
    let offset = 0;

    // "RIFF" chunk descriptor
    writeString(view, offset, 'RIFF'); offset += 4;
    view.setUint32(offset, 36 + dataLength, true); offset += 4;
    writeString(view, offset, 'WAVE'); offset += 4;

    // "fmt " sub-chunk
    writeString(view, offset, 'fmt '); offset += 4;
    view.setUint32(offset, 16, true); offset += 4; // Subchunk size
    view.setUint16(offset, format, true); offset += 2;
    view.setUint16(offset, numberOfChannels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, sampleRate * blockAlign, true); offset += 4;
    view.setUint16(offset, blockAlign, true); offset += 2;
    view.setUint16(offset, bitDepth, true); offset += 2;

    // "data" sub-chunk
    writeString(view, offset, 'data'); offset += 4;
    view.setUint32(offset, dataLength, true); offset += 4;

    // Write PCM samples
    for (let i = 0; i < data.length; i++) {
        view.setInt16(offset, data[i], true);
        offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
