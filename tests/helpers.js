// Shared test helpers and fixtures for audio analysis tests

// Simulate a Uint8Array FFT output (0-255 range) from Web Audio API
export function makeFft(length, fill = 0) {
    return new Uint8Array(length).fill(fill)
}

// Silence: all zeros
export function silence(length = 1024) {
    return makeFft(length, 0)
}

// Full-scale: all 255
export function fullScale(length = 1024) {
    return makeFft(length, 255)
}

// Uniform: all bins at the same mid-level value
export function uniform(length = 1024, value = 128) {
    return makeFft(length, value)
}

// Single bin spike at a given index
export function singleBin(length = 1024, index = 0, value = 255) {
    const fft = makeFft(length, 0)
    fft[index] = value
    return fft
}

// Linearly rising spectrum: bin i = floor(255 * i / (length-1))
export function risingSpectrum(length = 1024) {
    const fft = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
        fft[i] = Math.floor((255 * i) / (length - 1))
    }
    return fft
}

// Linearly falling spectrum: bin i = floor(255 * (1 - i / (length-1)))
export function fallingSpectrum(length = 1024) {
    const fft = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
        fft[i] = Math.floor(255 * (1 - i / (length - 1)))
    }
    return fft
}

// Random spectrum (deterministic via seed)
export function randomSpectrum(length = 1024, seed = 42) {
    const fft = new Uint8Array(length)
    let s = seed
    for (let i = 0; i < length; i++) {
        s = (s * 1103515245 + 12345) & 0x7fffffff
        fft[i] = s % 256
    }
    return fft
}

// Bass-heavy spectrum: high values in low bins, low elsewhere
export function bassHeavy(length = 1024) {
    const fft = new Uint8Array(length)
    const bassBins = Math.floor(length * (400 / 44100)) // bass cutoff at 400 Hz
    for (let i = 0; i < length; i++) {
        fft[i] = i < bassBins ? 200 : 10
    }
    return fft
}

// Treble-heavy spectrum: high values in high-frequency bins
export function trebleHeavy(length = 1024) {
    const fft = new Uint8Array(length)
    const trebleStart = Math.floor(length * (4000 / 44100))
    for (let i = 0; i < length; i++) {
        fft[i] = i >= trebleStart ? 200 : 10
    }
    return fft
}
