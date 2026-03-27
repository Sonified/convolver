/**
 * Waveform drawing utilities
 */

export function drawWaveform(canvas, buffer) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const data = buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / w));

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i < w; i++) {
        const idx = i * step;
        let min = 1, max = -1;
        for (let j = 0; j < step && idx + j < data.length; j++) {
            const v = data[idx + j];
            if (v < min) min = v;
            if (v > max) max = v;
        }
        const y1 = ((1 - max) / 2) * h;
        const y2 = ((1 - min) / 2) * h;
        ctx.moveTo(i, y1);
        ctx.lineTo(i, y2);
    }
    ctx.stroke();
}
