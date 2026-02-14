import { describe, it, expect } from 'vitest'
import energy from '../src/audio/energy.js'
import { silence, fullScale, uniform, singleBin, risingSpectrum } from './helpers.js'

describe('energy', () => {
    it('returns 0 for silence', () => {
        expect(energy(silence())).toBe(0)
    })

    it('returns a positive value for non-silent input', () => {
        expect(energy(fullScale())).toBeGreaterThan(0)
    })

    it('returns a consistent value for uniform signal', () => {
        const val = energy(uniform(1024, 100))
        expect(val).toBeCloseTo((100 / 255) ** 2, 5)
    })

    it('scales with amplitude: louder signal has more energy', () => {
        const low = energy(uniform(1024, 50))
        const high = energy(uniform(1024, 200))
        expect(high).toBeGreaterThan(low)
    })

    it('is independent of FFT size for uniform signal (per-sample normalization)', () => {
        const short = energy(uniform(256, 100))
        const long = energy(uniform(2048, 100))
        expect(short).toBeCloseTo(long, 5)
    })

    it('single bin contributes proportionally to length', () => {
        const fft = singleBin(1024, 50, 200)
        const expected = (200 / 255) ** 2 / 1024
        expect(energy(fft)).toBeCloseTo(expected, 5)
    })

    it('rising spectrum has more energy than silence', () => {
        expect(energy(risingSpectrum())).toBeGreaterThan(0)
    })
})
