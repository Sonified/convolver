/**
 * Main application - wires everything together
 */

import { setupDropZone } from './drop-zone.js';
import { playBuffer, convolve, crossCorrelate, ringMod, sampleMin, sampleMax, decodeUrl } from './audio.js';
import { drawWaveform, createPlayhead } from './waveform.js';
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

// --- Preset dropdowns ---

async function loadPreset(select, nameEl, canvas, playBtn, dropZone, onLoaded) {
    const url = select.value;
    if (!url) return;

    const name = select.options[select.selectedIndex].text;
    nameEl.textContent = name;
    dropZone.classList.add('loaded');
    dropZone.querySelector('.label').textContent = 'Loaded';

    select.disabled = true;
    const buf = await decodeUrl(url);
    select.disabled = false;

    drawWaveform(canvas, buf);
    playBtn.disabled = false;
    onLoaded(buf);
}

function setupPreset(selectId, storageKey, nameEl, canvas, playBtn, dropZone, onLoaded) {
    const select = document.getElementById(selectId);
    select.addEventListener('change', () => {
        localStorage.setItem(storageKey, select.value);
        loadPreset(select, nameEl, canvas, playBtn, dropZone, onLoaded);
    });
}

const presetArgs = {
    a: ['presetA', 'convolver_presetA',
        document.getElementById('nameA'),
        document.getElementById('waveA'),
        document.getElementById('playA'),
        document.getElementById('dropA'),
        buf => { state.a = buf; checkReady(); }
    ],
    b: ['presetB', 'convolver_presetB',
        document.getElementById('nameB'),
        document.getElementById('waveB'),
        document.getElementById('playB'),
        document.getElementById('dropB'),
        buf => { state.b = buf; checkReady(); }
    ]
};

setupPreset(...presetArgs.a);
setupPreset(...presetArgs.b);

// --- Restore last selections ---

for (const [key, args] of Object.entries(presetArgs)) {
    const [selectId, storageKey, nameEl, canvas, playBtn, dropZone, onLoaded] = args;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
        const select = document.getElementById(selectId);
        select.value = saved;
        if (select.value === saved) {
            loadPreset(select, nameEl, canvas, playBtn, dropZone, onLoaded);
        }
    }
}

// --- Playheads ---

const playheadA = createPlayhead(document.getElementById('waveA'));
const playheadB = createPlayhead(document.getElementById('waveB'));
const playheadR = createPlayhead(document.getElementById('waveR'));

// --- Play buttons ---

function wirePlay(btnId, getBuffer, playhead) {
    const btn = document.getElementById(btnId);
    let playback = null;

    function startFrom(ratio) {
        if (playback) {
            playback.stop();
            playhead.stop();
        }
        playback = playBuffer(
            getBuffer(),
            () => { btn.textContent = '⏹ Stop'; },
            () => {
                btn.textContent = '▶ Play';
                playhead.stop();
                playback = null;
            },
            ratio
        );
        if (playback) {
            playhead.start(() => playback ? playback.getProgress() : 1);
        }
    }

    btn.addEventListener('click', () => {
        if (playback) {
            playback.stop();
            playhead.stop();
            playback = null;
            btn.textContent = '▶ Play';
        } else {
            startFrom(0);
        }
    });

    playhead.onClick((ratio) => {
        if (!getBuffer()) return;
        if (playback) {
            playback.seek(ratio);
        } else {
            startFrom(ratio);
        }
    });
}

wirePlay('playA', () => state.a, playheadA);
wirePlay('playB', () => state.b, playheadB);
wirePlay('playR', () => state.result, playheadR);

// --- Convolve ---

function checkReady() {
    const ready = !!(state.a && state.b);
    document.getElementById('convolveBtn').disabled = !ready;
    document.getElementById('xcorrBtn').disabled = !ready;
    document.getElementById('ringModBtn').disabled = !ready;
    document.getElementById('minBtn').disabled = !ready;
    document.getElementById('maxBtn').disabled = !ready;
}

async function runProcess(btn, label, processFn) {
    const statusEl = document.getElementById('status');
    btn.disabled = true;
    btn.textContent = 'Processing...';
    statusEl.textContent = '';

    const t0 = performance.now();
    const rendered = await processFn(state.a, state.b);
    const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

    state.result = rendered;

    const panel = document.getElementById('resultPanel');
    panel.classList.add('visible');
    drawWaveform(document.getElementById('waveR'), rendered);
    document.getElementById('playR').disabled = false;
    document.getElementById('downloadR').disabled = false;
    statusEl.textContent = `${label} in ${elapsed}s | ${rendered.length} samples | ${rendered.duration.toFixed(2)}s`;

    btn.textContent = label;
    btn.disabled = false;
}

document.getElementById('convolveBtn').addEventListener('click', () => {
    runProcess(document.getElementById('convolveBtn'), 'Convolve', convolve);
});

document.getElementById('xcorrBtn').addEventListener('click', () => {
    runProcess(document.getElementById('xcorrBtn'), 'Cross-Correlate', crossCorrelate);
});

document.getElementById('ringModBtn').addEventListener('click', () => {
    runProcess(document.getElementById('ringModBtn'), 'Ring Mod', ringMod);
});

document.getElementById('minBtn').addEventListener('click', () => {
    runProcess(document.getElementById('minBtn'), 'Min', sampleMin);
});

document.getElementById('maxBtn').addEventListener('click', () => {
    runProcess(document.getElementById('maxBtn'), 'Max', sampleMax);
});

// --- Download ---

document.getElementById('downloadR').addEventListener('click', () => {
    if (state.result) downloadWav(state.result);
});
