/**
 * Audio context, playback, and convolution
 */

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let currentSource = null;

export function getAudioContext() {
    return audioCtx;
}

export async function decodeFile(file) {
    const arrayBuf = await file.arrayBuffer();
    return audioCtx.decodeAudioData(arrayBuf);
}

export function playBuffer(buffer, onStart, onEnd) {
    if (currentSource) {
        currentSource.stop();
        currentSource = null;
    }
    if (!buffer) return;

    audioCtx.resume();
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(audioCtx.destination);
    src.start();
    currentSource = src;

    if (onStart) onStart();
    src.onended = () => {
        currentSource = null;
        if (onEnd) onEnd();
    };
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

    return offline.startRendering();
}
