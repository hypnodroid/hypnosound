import { describe, it, expect } from 'vitest'
import pitchClass from '../src/audio/pitchClass.js'
import { silence, singleBin, uniform } from './helpers.js'

describe('pitchClass', () => {
    it('returns 0 for silence (NaN guard)', () => {
        expect(pitchClass(silence())).toBe(0)
    })

    it('is in [0, 1) range', () => {
        const val = pitchClass(uniform())
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThan(1)
    })

    it('returns a quantized value (multiple of 1/12)', () => {
        // pitchClass should be one of 0/12, 1/12, ..., 11/12
        const fft = singleBin(1024, 100, 255)
        const val = pitchClass(fft)
        const pitchClassIndex = Math.round(val * 12)
        expect(val).toBeCloseTo(pitchClassIndex / 12, 5)
    })

    it('different dominant frequencies map to different pitch classes', () => {
        // Put energy at different bins to get different dominant frequencies
        const fft1 = singleBin(4096, 40, 255) // ~430 Hz (close to A4)
        const fft2 = singleBin(4096, 50, 255) // ~538 Hz (close to C5)
        const pc1 = pitchClass(fft1)
        const pc2 = pitchClass(fft2)
        // These should differ since the frequencies are different pitch classes
        expect(pc1).not.toBeCloseTo(pc2, 1)
    })

    it('A440 maps to pitch class A (9/12 = 0.75)', () => {
        // At 44100 Hz sample rate, 4096 FFT size:
        // freq resolution = 44100/4096 ≈ 10.77 Hz
        // 440 Hz ≈ bin 41
        const fft = singleBin(4096, 41, 255)
        const val = pitchClass(fft)
        // A = MIDI 69, 69 % 12 = 9, 9/12 = 0.75
        expect(val).toBeCloseTo(0.75, 1)
    })

    it('handles bin 0 (DC) without crashing', () => {
        const fft = singleBin(1024, 0, 255)
        // bin 0 = 0 Hz, log2(0/440) = -Infinity, should return 0 via NaN guard
        const val = pitchClass(fft)
        expect(typeof val).toBe('number')
        expect(isNaN(val)).toBe(false)
    })
})
