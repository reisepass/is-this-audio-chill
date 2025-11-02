class Visualizer {
    constructor() {
        this.amplitudeCanvas = document.getElementById('amplitudeCanvas');
        this.rmsCanvas = document.getElementById('rmsCanvas');
        this.liveCanvas = document.getElementById('liveCanvas');
        this.animationFrameId = null;
        this.amplitudeData = null;
        this.duration = 0;
        this.nonCalmSections = [];
    }

    drawAmplitude(amplitudeData, duration, nonCalmSections) {
        const canvas = this.amplitudeCanvas;
        const ctx = canvas.getContext('2d');

        const width = canvas.clientWidth || 800;
        const height = 200;

        canvas.width = width;
        canvas.height = height;

        const padding = 40;

        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = '#f9f9f9';
        ctx.fillRect(0, 0, width, height);

        const values = amplitudeData.values;
        const max = Math.max(...values);
        const avg = amplitudeData.avg;
        const threshold = avg + amplitudeData.stdDev;

        console.log(`Loudness: ${values.length} seconds, max=${max.toFixed(4)}, avg=${avg.toFixed(4)}, threshold=${threshold.toFixed(4)}`);

        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        const barWidth = chartWidth / values.length;
        const yScale = chartHeight / (max * 1.1);

        for (let section of nonCalmSections) {
            const startX = padding + (section.start / duration) * chartWidth;
            const endX = padding + (section.end / duration) * chartWidth;
            ctx.fillStyle = 'rgba(255, 193, 7, 0.15)';
            ctx.fillRect(startX, padding, endX - startX, chartHeight);
        }

        for (let i = 0; i < values.length; i++) {
            const x = padding + i * barWidth;
            const loudness = values[i];
            const barHeight = loudness * yScale;
            const y = padding + chartHeight - barHeight;

            const isLoud = loudness > threshold;
            ctx.fillStyle = isLoud ? 'rgba(255, 100, 100, 0.8)' : 'rgba(102, 126, 234, 0.8)';
            ctx.fillRect(x, y, barWidth, barHeight);
        }

        ctx.strokeStyle = 'rgba(102, 126, 234, 0.6)';
        ctx.lineWidth = 2;
        const avgY = padding + chartHeight - (avg * yScale);
        ctx.beginPath();
        ctx.moveTo(padding, avgY);
        ctx.lineTo(width - padding, avgY);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 193, 7, 0.8)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        const thresholdY = padding + chartHeight - (threshold * yScale);
        ctx.beginPath();
        ctx.moveTo(padding, thresholdY);
        ctx.lineTo(width - padding, thresholdY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(padding, padding, chartWidth, chartHeight);

        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(max.toFixed(3), padding - 5, padding + 10);
        ctx.fillText((max / 2).toFixed(3), padding - 5, padding + chartHeight / 2);
        ctx.fillText('0.000', padding - 5, padding + chartHeight);

        ctx.textAlign = 'center';
        const numLabels = 5;
        for (let i = 0; i <= numLabels; i++) {
            const time = (duration / numLabels) * i;
            const x = padding + (chartWidth / numLabels) * i;
            ctx.fillText(this.formatTime(time), x, height - 10);
        }

        ctx.textAlign = 'left';
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#667eea';
        ctx.fillText('Average', padding + 5, avgY - 5);
        ctx.fillStyle = '#ffc107';
        ctx.fillText('Threshold (avg + σ)', padding + 5, thresholdY - 5);
    }

    drawRMS(rmsData, duration) {
        const canvas = this.rmsCanvas;
        const ctx = canvas.getContext('2d');

        const width = canvas.clientWidth || 800;
        const height = 200;

        canvas.width = width;
        canvas.height = height;

        const padding = 40;

        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = '#f9f9f9';
        ctx.fillRect(0, 0, width, height);

        const values = rmsData.values;
        const max = Math.max(...values);
        const avg = rmsData.avg;

        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        const xScale = chartWidth / values.length;
        const yScale = chartHeight / max;

        ctx.strokeStyle = 'rgba(102, 126, 234, 0.5)';
        ctx.lineWidth = 1;
        const avgY = padding + chartHeight - (avg * yScale);
        ctx.beginPath();
        ctx.moveTo(padding, avgY);
        ctx.lineTo(width - padding, avgY);
        ctx.stroke();

        ctx.fillStyle = 'rgba(102, 126, 234, 0.2)';
        ctx.beginPath();
        ctx.moveTo(padding, padding + chartHeight);

        for (let i = 0; i < values.length; i++) {
            const x = padding + i * xScale;
            const y = padding + chartHeight - (values[i] * yScale);
            ctx.lineTo(x, y);
        }

        ctx.lineTo(padding + chartWidth, padding + chartHeight);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = 0; i < values.length; i++) {
            const x = padding + i * xScale;
            const y = padding + chartHeight - (values[i] * yScale);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(padding, padding, chartWidth, chartHeight);

        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(max.toFixed(3), padding - 5, padding + 10);
        ctx.fillText((max / 2).toFixed(3), padding - 5, padding + chartHeight / 2);
        ctx.fillText('0.000', padding - 5, padding + chartHeight);

        ctx.textAlign = 'center';
        const numLabels = 5;
        for (let i = 0; i <= numLabels; i++) {
            const time = (duration / numLabels) * i;
            const x = padding + (chartWidth / numLabels) * i;
            ctx.fillText(this.formatTime(time), x, height - 10);
        }

        ctx.textAlign = 'left';
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#667eea';
        ctx.fillText('Average RMS', padding + 5, avgY - 5);
    }

    drawLive(amplitudeData, duration, nonCalmSections, audioPlayer) {
        this.amplitudeData = amplitudeData;
        this.duration = duration;
        this.nonCalmSections = nonCalmSections;

        const canvas = this.liveCanvas;
        const ctx = canvas.getContext('2d');

        const width = canvas.clientWidth || 800;
        const height = 200;

        canvas.width = width;
        canvas.height = height;

        const updateLive = () => {
            ctx.clearRect(0, 0, width, height);

            const padding = 40;
            const chartWidth = width - 2 * padding;
            const chartHeight = height - 2 * padding;

            ctx.fillStyle = '#f9f9f9';
            ctx.fillRect(0, 0, width, height);

            const values = amplitudeData.values;
            const max = Math.max(...values);
            const avg = amplitudeData.avg;
            const threshold = avg + amplitudeData.stdDev;
            const barWidth = chartWidth / values.length;
            const yScale = chartHeight / (max * 1.1);

            for (let section of nonCalmSections) {
                const startX = padding + (section.start / duration) * chartWidth;
                const endX = padding + (section.end / duration) * chartWidth;
                ctx.fillStyle = 'rgba(255, 193, 7, 0.15)';
                ctx.fillRect(startX, padding, endX - startX, chartHeight);
            }

            for (let i = 0; i < values.length; i++) {
                const x = padding + i * barWidth;
                const loudness = values[i];
                const barHeight = loudness * yScale;
                const y = padding + chartHeight - barHeight;

                const isLoud = loudness > threshold;
                ctx.fillStyle = isLoud ? 'rgba(255, 100, 100, 0.8)' : 'rgba(102, 126, 234, 0.8)';
                ctx.fillRect(x, y, barWidth, barHeight);
            }

            ctx.strokeStyle = 'rgba(102, 126, 234, 0.6)';
            ctx.lineWidth = 2;
            const avgY = padding + chartHeight - (avg * yScale);
            ctx.beginPath();
            ctx.moveTo(padding, avgY);
            ctx.lineTo(width - padding, avgY);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 193, 7, 0.8)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            const thresholdY = padding + chartHeight - (threshold * yScale);
            ctx.beginPath();
            ctx.moveTo(padding, thresholdY);
            ctx.lineTo(width - padding, thresholdY);
            ctx.stroke();
            ctx.setLineDash([]);

            if (audioPlayer && duration > 0) {
                const currentTime = audioPlayer.currentTime;
                const playheadX = padding + (currentTime / duration) * chartWidth;

                const isPlaying = !audioPlayer.paused;
                ctx.strokeStyle = isPlaying ? '#ff0000' : '#999';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(playheadX, padding);
                ctx.lineTo(playheadX, padding + chartHeight);
                ctx.stroke();

                ctx.fillStyle = isPlaying ? '#ff0000' : '#999';
                ctx.font = 'bold 12px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(this.formatTime(currentTime), playheadX, padding - 5);
            }

            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(padding, padding, chartWidth, chartHeight);

            ctx.fillStyle = '#666';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(max.toFixed(3), padding - 5, padding + 10);
            ctx.fillText((max / 2).toFixed(3), padding - 5, padding + chartHeight / 2);
            ctx.fillText('0.000', padding - 5, padding + chartHeight);

            ctx.textAlign = 'center';
            const numLabels = 5;
            for (let i = 0; i <= numLabels; i++) {
                const time = (duration / numLabels) * i;
                const x = padding + (chartWidth / numLabels) * i;
                ctx.fillText(this.formatTime(time), x, height - 10);
            }

            this.animationFrameId = requestAnimationFrame(updateLive);
        };

        updateLive();
    }

    stopLiveUpdate() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}
