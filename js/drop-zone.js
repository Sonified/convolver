/**
 * Drop zone setup for audio file loading
 */

import { decodeFile } from './audio.js';
import { drawWaveform } from './waveform.js';

export function setupDropZone(dropEl, fileInput, nameEl, canvas, playBtn, onLoaded) {
    dropEl.addEventListener('click', () => fileInput.click());

    dropEl.addEventListener('dragover', e => {
        e.preventDefault();
        dropEl.classList.add('dragover');
    });

    dropEl.addEventListener('dragleave', () => {
        dropEl.classList.remove('dragover');
    });

    dropEl.addEventListener('drop', e => {
        e.preventDefault();
        dropEl.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) handleFile(fileInput.files[0]);
    });

    async function handleFile(file) {
        nameEl.textContent = file.name;
        dropEl.classList.add('loaded');
        dropEl.querySelector('.label').textContent = 'Loaded';

        const audioBuf = await decodeFile(file);
        drawWaveform(canvas, audioBuf);
        playBtn.disabled = false;

        if (onLoaded) onLoaded(audioBuf);
    }
}
