import { describe, it, expect } from 'vitest'
import bass from '../src/audio/bass.js'
import mids from '../src/audio/mids.js'
import treble from '../src/audio/treble.js'
import { silence, uniform, singleBin } from './helpers.js'

// Helper: compute the bin index for a given frequency at a given sample rate and FFT size
function binForFreq(freq, sampleRate, fftSize) {
    return Math.round(freq / (sampleRate / fftSize))
}

describe('configurable sample rate', () => {
    describe('default behavior unchanged (backward compatibility)', () => {
        it('bass returns the same result when sampleRate is omitted vs explicitly 44100', () => {
            const fft = uniform(1024, 128)
            expect(bass(fft)).toBe(bass(fft, 44100))
        })

        it('mids returns the same result when sampleRate is omitted vs explicitly 44100', () => {
            const fft = uniform(1024, 128)
            expect(mids(fft)).toBe(mids(fft, 44100))
        })

        it('treble returns the same result when sampleRate is omitted vs explicitly 44100', () => {
            const fft = uniform(1024, 128)
            expect(treble(fft)).toBe(treble(fft, 44100))
        })

        it('silence still returns 0 regardless of sampleRate', () => {
            expect(bass(silence(), 48000)).toBe(0)
            expect(mids(silence(), 48000)).toBe(0)
            expect(treble(silence(), 48000)).toBe(0)
        })
    })

    describe('different sampleRate shifts frequency band boundaries', () => {
        // The frequency of each FFT bin = bin_index * (sampleRate / fftSize).
        // At a higher sample rate, the same bin index corresponds to a higher frequency.
        // So a bin that falls in the bass range at 44100 Hz may fall in the mids range at 96000 Hz.

        it('a bin near 400 Hz boundary is bass at 44100 but not at higher sample rates', () => {
            const fftSize = 1024
            // At 44100 Hz, freq resolution = 44100/1024 ~= 43.07 Hz/bin
            // Bin 9 ~= 387 Hz (bass range: 0-400 Hz) -> should be bass
            // At 96000 Hz, freq resolution = 96000/1024 ~= 93.75 Hz/bin
            // Bin 9 ~= 843 Hz (mids range: 400-4000 Hz) -> should be mids

            const fft = singleBin(fftSize, 9, 255)

            // At 44100, this bin is in bass range
            const bassAt44100 = bass(fft, 44100)
            expect(bassAt44100).toBe(1) // all energy is in bass

            // At 96000, this bin should NOT be in bass range
            const bassAt96000 = bass(fft, 96000)
            expect(bassAt96000).toBe(0) // energy has moved out of bass range

            // At 96000, this bin should be in mids range
            const midsAt96000 = mids(fft, 96000)
            expect(midsAt96000).toBeGreaterThan(0.9)
        })

        it('a bin in the mids range at 44100 moves to treble at higher sample rate', () => {
            const fftSize = 1024
            // At 44100 Hz: bin 80 ~= 3445 Hz (mids range: 400-4000 Hz)
            // At 96000 Hz: bin 80 ~= 7500 Hz (treble range: 4000-20000 Hz)

            const fft = singleBin(fftSize, 80, 255)

            const midsAt44100 = mids(fft, 44100)
            expect(midsAt44100).toBeGreaterThan(0.9) // in mids at 44100

            const midsAt96000 = mids(fft, 96000)
            expect(midsAt96000).toBe(0) // not in mids at 96000

            const trebleAt96000 = treble(fft, 96000)
            expect(trebleAt96000).toBeGreaterThan(0.9) // in treble at 96000
        })

        it('bass covers more bins at higher sample rates because frequency resolution increases', () => {
            // At higher sample rate, each bin spans more Hz, so fewer bins fall in 0-400 Hz.
            // With uniform energy, bass fraction should decrease at higher sample rates.
            const fft = uniform(1024, 128)

            const bassAt44100 = bass(fft, 44100)
            const bassAt48000 = bass(fft, 48000)
            const bassAt96000 = bass(fft, 96000)

            // Higher sample rate -> fewer bins in bass range -> lower bass fraction
            expect(bassAt44100).toBeGreaterThan(bassAt48000)
            expect(bassAt48000).toBeGreaterThan(bassAt96000)
        })

        it('treble covers more bins at higher sample rates for uniform signal', () => {
            // At higher sample rate, the Nyquist frequency is higher, so the treble band
            // (4000-20000 Hz) captures a smaller proportion of the total bins.
            // But also the frequency per bin increases. For uniform energy, the treble
            // fraction with respect to total should shift.
            const fft = uniform(1024, 128)

            const trebleAt44100 = treble(fft, 44100)
            const trebleAt96000 = treble(fft, 96000)

            // The results should differ when sample rate changes
            expect(trebleAt44100).not.toBeCloseTo(trebleAt96000, 2)
        })
    })

    describe('frequency bands adjust correctly for common sample rates', () => {
        it('48000 Hz: bass band still captures energy at 200 Hz', () => {
            const fftSize = 2048
            const bin = binForFreq(200, 48000, fftSize)
            const fft = singleBin(fftSize, bin, 255)
            expect(bass(fft, 48000)).toBe(1) // 200 Hz is firmly in bass range
        })

        it('48000 Hz: 2000 Hz is in mids', () => {
            const fftSize = 2048
            const bin = binForFreq(2000, 48000, fftSize)
            const fft = singleBin(fftSize, bin, 255)
            expect(mids(fft, 48000)).toBeGreaterThan(0.9)
        })

        it('48000 Hz: 10000 Hz is in treble', () => {
            const fftSize = 2048
            const bin = binForFreq(10000, 48000, fftSize)
            const fft = singleBin(fftSize, bin, 255)
            expect(treble(fft, 48000)).toBeGreaterThan(0.9)
        })

        it('96000 Hz: bass band still captures energy at 100 Hz', () => {
            const fftSize = 4096
            const bin = binForFreq(100, 96000, fftSize)
            const fft = singleBin(fftSize, bin, 255)
            expect(bass(fft, 96000)).toBe(1)
        })

        it('96000 Hz: 2000 Hz is in mids', () => {
            const fftSize = 4096
            const bin = binForFreq(2000, 96000, fftSize)
            const fft = singleBin(fftSize, bin, 255)
            expect(mids(fft, 96000)).toBeGreaterThan(0.9)
        })

        it('96000 Hz: 15000 Hz is in treble', () => {
            const fftSize = 4096
            const bin = binForFreq(15000, 96000, fftSize)
            const fft = singleBin(fftSize, bin, 255)
            expect(treble(fft, 96000)).toBeGreaterThan(0.9)
        })
    })
})
