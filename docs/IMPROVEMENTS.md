# Proposed Improvements

## 1. Consistent Output Normalization (0-1)

Different features currently use wildly different scales: `energy` divides by 1000 (can exceed 1.0), `spectralCrest` is multiplied by 100, `spectralFlux` and `spectralRoughness` divide by 100,000. This makes features hard to compare or feed into downstream systems (ML, visualizations). Standardize all features to the 0-1 range.

## 2. Configurable Sample Rate

44100 Hz is hardcoded across `bass.js`, `mids.js`, `treble.js`, and `pitchClass.js`. Browsers commonly use 48000 Hz, and pro audio uses 96000 Hz. Accept `sampleRate` as an optional parameter in all frequency-dependent features.

## 3. Float32Array Input Support

The library assumes `Uint8Array` input from `getByteFrequencyData()`. But `getFloatFrequencyData()` returns `Float32Array` with dB values offering higher precision, and offline analysis pipelines also produce float data. Detect input type and handle both automatically.

## 4. Configurable Frequency Bands

`bass` (0-400 Hz), `mids` (400-4000 Hz), and `treble` (4000-20000 Hz) have hardcoded ranges. Add a generic `bandEnergy(fft, lowHz, highHz, sampleRate?)` function, and make bass/mids/treble thin wrappers over it.

## 5. RMS and dBFS

The library has `energy` (sum of squares) but no perceptual loudness measures. RMS (root-mean-square amplitude) and dBFS (decibels relative to full scale) are fundamental for audio metering and level detection. Both are cheap to compute and widely useful.

**Status: Implemented**

## 6. Onset / Transient Detection

`spectralFlux` is already computed but the library doesn't surface onset detection - the most common real-time analysis use case (beat detection, rhythm sync). Combine spectral flux with adaptive thresholding using the existing stats infrastructure.

## 7. Chromagram / Pitch Class Distribution

`pitchClass` returns only the dominant pitch class. For harmonic analysis, chord detection, or key detection, users need the full distribution across all 12 pitch classes. Add `chromagram(fft)` returning energy per pitch class.

## 8. Configurable Stats History Window

`makeCalculateStats()` defaults to 500 samples. At 60 fps that's ~8 seconds; at 10 fps it's ~50 seconds. Expose `historySize` as a constructor option on `AudioProcessor`.

## 9. Spectral Flatness (Tonality Coefficient)

Distinguishes tonal (music) from noisy (percussion, speech) content. Geometric mean / arithmetic mean of the power spectrum. Returns 0 (pure tone) to 1 (white noise).

## 10. Zero-Crossing Rate (Time Domain)

All current features are frequency-domain. ZCR is a simple time-domain feature for distinguishing voiced/unvoiced speech and percussive vs tonal content. Accepts raw PCM samples.
