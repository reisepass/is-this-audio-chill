let analyzer = null;
let visualizer = null;
let currentFile = null;
let audioPlayer = null;

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
