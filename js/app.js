/**
 * Main application - wires everything together
 */

import { setupDropZone } from './drop-zone.js';
import { playBuffer, convolve } from './audio.js';
import { drawWaveform } from './waveform.js';
import { downloadWav } from './wav-export.js';

const state = { a: null, b: null, result: null };

// --- Drop zones ---

setupDropZone(
    document.getElementById('dropA'),
    document.getElementById('fileA'),
    document.getElementById('nameA'),
    document.getElementById('waveA'),
    document.getElementById('playA'),
    buf => { state.a = buf; checkReady(); }
);

setupDropZone(
    document.getElementById('dropB'),
    document.getElementById('fileB'),
    document.getElementById('nameB'),
    document.getElementById('waveB'),
    document.getElementById('playB'),
    buf => { state.b = buf; checkReady(); }
);

// --- Play buttons ---

function wirePlay(btnId, getBuffer) {
    const btn = document.getElementById(btnId);
    btn.addEventListener('click', () => {
        playBuffer(
            getBuffer(),
            () => { btn.textContent = '⏹ Stop'; },
            () => { btn.textContent = '▶ Play'; }
        );
    });
}

wirePlay('playA', () => state.a);
wirePlay('playB', () => state.b);
wirePlay('playR', () => state.result);

// --- Convolve ---

function checkReady() {
    document.getElementById('convolveBtn').disabled = !(state.a && state.b);
}

document.getElementById('convolveBtn').addEventListener('click', async () => {
    const btn = document.getElementById('convolveBtn');
    const statusEl = document.getElementById('status');
    btn.disabled = true;
    btn.textContent = 'Processing...';
    statusEl.textContent = '';

    const t0 = performance.now();
    const rendered = await convolve(state.a, state.b);
    const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

    state.result = rendered;

    const panel = document.getElementById('resultPanel');
    panel.classList.add('visible');
    drawWaveform(document.getElementById('waveR'), rendered);
    document.getElementById('playR').disabled = false;
    document.getElementById('downloadR').disabled = false;
    statusEl.textContent = `Convolved in ${elapsed}s | ${rendered.length} samples | ${rendered.duration.toFixed(2)}s`;

    btn.textContent = 'Convolve';
    btn.disabled = false;
});

// --- Download ---

document.getElementById('downloadR').addEventListener('click', () => {
    if (state.result) downloadWav(state.result);
});
