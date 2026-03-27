# Convolver

A web-based tool for convolving two audio signals and exploring the results.

## Step 1 (Current): Web Convolution
- Drop or browse two audio files (any format the browser supports)
- Hit Convolve — uses Web Audio API's `ConvolverNode` via `OfflineAudioContext`
- Waveform visualization for both inputs and the result
- Play any of the three signals
- Download the result as a normalized 16-bit WAV

## Step 2 (Planned): Spectrogram + Minimap
Building on spaceweather.now.audio's display mechanics:
- Spectrogram (FFT) view for each signal (input A, input B, result)
- Waveform viewer with minimap navigation (zoomed overview + detail)
- Time-linked playback cursor across all views
- Colormap options

## Usage
Just open `index.html` in a browser. No build step, no dependencies.

```bash
open index.html
# or
python3 -m http.server 8080
```

## License
MIT
