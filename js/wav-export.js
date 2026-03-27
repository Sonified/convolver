/**
 * WAV file export (normalized 16-bit mono)
 */

export function downloadWav(buffer, filename = 'convolution-result.wav') {
    const ch = buffer.getChannelData(0);

    // Find peak for normalization
    let peak = 0;
    for (let i = 0; i < ch.length; i++) {
        const abs = Math.abs(ch[i]);
        if (abs > peak) peak = abs;
    }
    const gain = peak > 0 ? 0.95 / peak : 1;

    const numSamples = ch.length;
    const wavBuf = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(wavBuf);

    function writeStr(offset, str) {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    }

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);  // PCM
    view.setUint16(22, 1, true);  // mono
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    for (let i = 0; i < numSamples; i++) {
        const s = Math.max(-1, Math.min(1, ch[i] * gain));
        view.setInt16(44 + i * 2, s * 32767, true);
    }

    const blob = new Blob([wavBuf], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
