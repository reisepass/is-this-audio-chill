class AudioAnalyzer {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioBuffer = null;
        this.sampleRate = 44100;
        this.results = null;
    }

    async loadAndAnalyze(file) {
        const arrayBuffer = await file.arrayBuffer();
        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.sampleRate = this.audioBuffer.sampleRate;

        const channelData = this.audioBuffer.getChannelData(0);

        const results = {
            duration: this.audioBuffer.duration,
            sampleRate: this.sampleRate,
            amplitude: this.analyzeAmplitude(channelData),
            rms: this.analyzeRMS(channelData),
        };

        results.calmness = this.calculateCalmness(results);
        results.nonCalmSections = this.findNonCalmSections(results);
        results.topRMSSections = this.findTopRMSSections(results);

        this.results = results;
        return results;
    }

    analyzeAmplitude(channelData) {
        const windowSize = Math.floor(this.sampleRate * 1.0);
        const numWindows = Math.floor(channelData.length / windowSize);

        const loudness = [];
        let maxLoudness = 0;
        let sumLoudness = 0;

        for (let i = 0; i < numWindows; i++) {
            const start = i * windowSize;
            const end = Math.min(start + windowSize, channelData.length);

            let sumSquares = 0;
            for (let j = start; j < end; j++) {
                sumSquares += channelData[j] * channelData[j];
            }
            const rms = Math.sqrt(sumSquares / (end - start));

            loudness.push(rms);

            if (rms > maxLoudness) {
                maxLoudness = rms;
            }
            sumLoudness += rms;
        }

        const avgLoudness = sumLoudness / loudness.length;

        let varianceSum = 0;
        for (let i = 0; i < loudness.length; i++) {
            varianceSum += Math.pow(loudness[i] - avgLoudness, 2);
        }
        const variance = varianceSum / loudness.length;
        const stdDev = Math.sqrt(variance);

        const sortedLoudness = [...loudness].sort((a, b) => a - b);
        const p95 = sortedLoudness[Math.floor(sortedLoudness.length * 0.95)];
        const p5 = sortedLoudness[Math.floor(sortedLoudness.length * 0.05)];
        const dynamicRange = p95 - p5;

        return {
            values: loudness,
            fullValues: loudness,
            max: maxLoudness,
            avg: avgLoudness,
            stdDev: stdDev,
            variance: variance,
            dynamicRange: dynamicRange,
            peakRatio: maxLoudness / (avgLoudness || 1),
            windowDuration: 1.0
        };
    }

    analyzeRMS(channelData) {
        const windowSize = Math.floor(this.sampleRate * 0.1);
        const hopSize = Math.floor(windowSize / 2);
        const numWindows = Math.floor((channelData.length - windowSize) / hopSize);

        const rmsValues = [];

        for (let i = 0; i < numWindows; i++) {
            const start = i * hopSize;
            const end = start + windowSize;

            let sumSquares = 0;
            for (let j = start; j < end; j++) {
                sumSquares += channelData[j] * channelData[j];
            }
            const rms = Math.sqrt(sumSquares / windowSize);
            rmsValues.push(rms);
        }

        const avgRMS = rmsValues.reduce((a, b) => a + b, 0) / rmsValues.length;

        let varianceSum = 0;
        for (let i = 0; i < rmsValues.length; i++) {
            varianceSum += Math.pow(rmsValues[i] - avgRMS, 2);
        }
        const variance = varianceSum / rmsValues.length;
        const stdDev = Math.sqrt(variance);

        const varianceDB = 10 * Math.log10(variance + 1e-10);

        return {
            values: this.downsampleForVisualization(rmsValues, 500),
            fullValues: rmsValues,
            avg: avgRMS,
            stdDev: stdDev,
            variance: variance,
            varianceDB: varianceDB
        };
    }

    downsampleForVisualization(data, targetPoints) {
        if (data.length <= targetPoints) return data;

        const result = [];
        const step = data.length / targetPoints;

        for (let i = 0; i < targetPoints; i++) {
            const start = Math.floor(i * step);
            const end = Math.floor((i + 1) * step);
            let sum = 0;
            for (let j = start; j < end; j++) {
                sum += data[j];
            }
            result.push(sum / (end - start));
        }

        return result;
    }

    calculateCalmness(results) {
        const amp = results.amplitude;
        const rms = results.rms;

        const varianceScore = Math.max(0, 1 - Math.abs(rms.varianceDB) / 10);

        const drScore = Math.max(0, 1 - amp.dynamicRange / 0.5);

        const peakScore = Math.max(0, 1 - (amp.peakRatio - 1) / 5);

        const w1 = 0.4;
        const w2 = 0.3;
        const w3 = 0.3;

        const calmnessScore = w1 * varianceScore + w2 * drScore + w3 * peakScore;

        return {
            score: Math.round(calmnessScore * 100),
            normalized: calmnessScore,
            components: {
                varianceScore: varianceScore,
                dynamicRangeScore: drScore,
                peakScore: peakScore
            }
        };
    }

    findNonCalmSections(results) {
        const amp = results.amplitude;
        const fullValues = amp.fullValues;
        const threshold = amp.avg + amp.stdDev;
        const duration = results.duration;

        console.log(`Finding non-calm sections: ${fullValues.length} bins, windowDuration=${amp.windowDuration}, total duration=${duration}`);

        const sections = [];
        let inSection = false;
        let sectionStart = 0;

        for (let i = 0; i < fullValues.length; i++) {
            if (fullValues[i] > threshold && !inSection) {
                inSection = true;
                sectionStart = i;
            } else if (fullValues[i] <= threshold && inSection) {
                inSection = false;
                const startTime = (sectionStart / fullValues.length) * duration;
                const endTime = (i / fullValues.length) * duration;
                sections.push({
                    start: startTime,
                    end: endTime,
                    maxAmplitude: Math.max(...fullValues.slice(sectionStart, i))
                });
            }
        }

        if (inSection) {
            const startTime = (sectionStart / fullValues.length) * duration;
            const endTime = duration;
            sections.push({
                start: startTime,
                end: endTime,
                maxAmplitude: Math.max(...fullValues.slice(sectionStart))
            });
        }

        console.log(`Found ${sections.length} sections before filtering`);
        const filtered = sections.filter(s => (s.end - s.start) > 0.5);
        console.log(`${filtered.length} sections after filtering (>0.5s)`);

        filtered.sort((a, b) => b.maxAmplitude - a.maxAmplitude);
        console.log('Sorted by maxAmplitude (worst first)');

        return filtered;
    }

    findTopRMSSections(results) {
        const amp = results.amplitude;
        const duration = results.duration;
        const values = amp.fullValues;

        const sections = values.map((rms, index) => ({
            start: (index / values.length) * duration,
            end: ((index + 1) / values.length) * duration,
            rms: rms
        }));

        sections.sort((a, b) => b.rms - a.rms);

        return sections.slice(0, 5);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}
