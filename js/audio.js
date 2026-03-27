/**
 * Audio context, playback, and convolution
 */

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let currentPlayback = null;

export function getAudioContext() {
    return audioCtx;
}

export async function decodeFile(file) {
    const arrayBuf = await file.arrayBuffer();
    return audioCtx.decodeAudioData(arrayBuf);
}

export async function decodeUrl(url) {
    const resp = await fetch(url);
    const arrayBuf = await resp.arrayBuffer();
    return audioCtx.decodeAudioData(arrayBuf);
}

const FADE_TIME = 0.025;

export function playBuffer(buffer, onStart, onEnd, startRatio) {
    if (currentPlayback) {
        currentPlayback.stop();
        currentPlayback = null;
    }
    if (!buffer) return null;

    audioCtx.resume();

    const gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);

    let src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(gainNode);

    const initialOffset = (startRatio || 0) * buffer.duration;
    let startTime = audioCtx.currentTime;
    let startOffset = initialOffset;
    let stopped = false;

    src.start(0, initialOffset);
    if (onStart) onStart();

    src.onended = () => {
        if (!stopped) {
            currentPlayback = null;
            if (onEnd) onEnd();
        }
    };

    const playback = {
        getProgress() {
            if (stopped) return 0;
            const elapsed = audioCtx.currentTime - startTime + startOffset;
            return Math.min(elapsed / buffer.duration, 1);
        },
        seek(ratio) {
            if (stopped) return;
            const offset = Math.max(0, Math.min(ratio, 1)) * buffer.duration;
            const now = audioCtx.currentTime;

            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.linearRampToValueAtTime(0, now + FADE_TIME);

            setTimeout(() => {
                if (stopped) return;
                src.onended = null;
                src.stop();

                src = audioCtx.createBufferSource();
                src.buffer = buffer;
                src.connect(gainNode);

                startTime = audioCtx.currentTime;
                startOffset = offset;
                src.start(0, offset);

                const t = audioCtx.currentTime;
                gainNode.gain.setValueAtTime(0, t);
                gainNode.gain.linearRampToValueAtTime(1, t + FADE_TIME);

                src.onended = () => {
                    if (!stopped) {
                        currentPlayback = null;
                        if (onEnd) onEnd();
                    }
                };
            }, FADE_TIME * 1000);
        },
        stop() {
            if (stopped) return;
            stopped = true;
            src.onended = null;
            try { src.stop(); } catch (e) {}
            currentPlayback = null;
        }
    };

    currentPlayback = playback;
    return playback;
}

export async function convolve(bufferA, bufferB) {
    const outLength = bufferA.length + bufferB.length - 1;
    const sampleRate = bufferA.sampleRate;

    const offline = new OfflineAudioContext(1, outLength, sampleRate);

    const convolver = offline.createConvolver();
    convolver.normalize = false;
    convolver.buffer = bufferB;
    convolver.connect(offline.destination);

    const source = offline.createBufferSource();
    source.buffer = bufferA;
    source.connect(convolver);
    source.start(0);

    const rendered = await offline.startRendering();
    return normalizeBuffer(rendered);
}

export async function crossCorrelate(bufferA, bufferB) {
    const reversed = reverseBuffer(bufferB);
    return convolve(bufferA, reversed);
}

function reverseBuffer(buffer) {
    const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    const reversed = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const src = buffer.getChannelData(ch);
        const dst = reversed.getChannelData(ch);
        for (let i = 0; i < src.length; i++) {
            dst[i] = src[src.length - 1 - i];
        }
    }
    return reversed;
}

function sampleOp(bufferA, bufferB, fn) {
    const len = Math.max(bufferA.length, bufferB.length);
    const sampleRate = bufferA.sampleRate;
    const ctx = new OfflineAudioContext(1, len, sampleRate);
    const out = ctx.createBuffer(1, len, sampleRate);
    const a = bufferA.getChannelData(0);
    const b = bufferB.getChannelData(0);
    const dst = out.getChannelData(0);
    for (let i = 0; i < len; i++) {
        const va = i < a.length ? a[i] : 0;
        const vb = i < b.length ? b[i] : 0;
        dst[i] = fn(va, vb);
    }
    return normalizeBuffer(out);
}

export function ringMod(bufferA, bufferB) {
    return sampleOp(bufferA, bufferB, (a, b) => a * b);
}

export function sampleMin(bufferA, bufferB) {
    return sampleOp(bufferA, bufferB, Math.min);
}

export function sampleMax(bufferA, bufferB) {
    return sampleOp(bufferA, bufferB, Math.max);
}

function normalizeBuffer(buffer) {
    let peak = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
            const abs = Math.abs(data[i]);
            if (abs > peak) peak = abs;
        }
    }

    if (peak === 0 || peak === 1) return buffer;

    const gain = 1 / peak;
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
            data[i] *= gain;
        }
    }
    return buffer;
}
