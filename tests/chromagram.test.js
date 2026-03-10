import { describe, it, expect } from 'vitest'
import chromagram from '../src/audio/chromagram.js'
import { silence, singleBin, uniform } from './helpers.js'

describe('chromagram', () => {
    it('returns a Float32Array of length 12', () => {
        const result = chromagram(uniform())
        expect(result).toBeInstanceOf(Float32Array)
        expect(result.length).toBe(12)
    })

    it('all values are between 0 and 1', () => {
        const result = chromagram(uniform())
        for (let i = 0; i < 12; i++) {
            expect(result[i]).toBeGreaterThanOrEqual(0)
            expect(result[i]).toBeLessThanOrEqual(1)
        }
    })

    it('returns all zeros for silence', () => {
        const result = chromagram(silence())
        for (let i = 0; i < 12; i++) {
            expect(result[i]).toBe(0)
        }
    })

    it('a single-frequency spike maps to the correct pitch class', () => {
        // At 44100 Hz sample rate, 4096 FFT size:
        // freq resolution = 44100/4096 ≈ 10.77 Hz
        // bin 41 ≈ 441.7 Hz, closest to A4 (440 Hz)
        // A = MIDI 69, 69 % 12 = 9 → chroma index 9
        const fft = singleBin(4096, 41, 255)
        const result = chromagram(fft, 44100)
        expect(result[9]).toBe(1) // A should be the strongest (and only non-zero)
    })

    it('the strongest pitch class has value 1.0 due to normalization', () => {
        // Use a random-ish spectrum that isn't silence
        const fft = uniform(1024, 128)
        const result = chromagram(fft)
        const maxVal = Math.max(...result)
        // At least one bin should have energy, and the max should be 1
        expect(maxVal).toBe(1)
    })

    it('distributes energy across multiple pitch classes for broadband signal', () => {
        const fft = uniform(1024, 200)
        const result = chromagram(fft)
        let nonZeroCount = 0
        for (let i = 0; i < 12; i++) {
            if (result[i] > 0) nonZeroCount++
        }
        // A uniform spectrum should excite multiple pitch classes
        expect(nonZeroCount).toBeGreaterThan(1)
    })

    it('handles very small FFT sizes without crashing', () => {
        const fft = singleBin(64, 10, 255)
        const result = chromagram(fft, 44100)
        expect(result).toBeInstanceOf(Float32Array)
        expect(result.length).toBe(12)
    })
})
