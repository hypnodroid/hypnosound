import { describe, it, expect } from 'vitest'
import energy from '../src/audio/energy.js'
import { silence, fullScale, uniform, singleBin, risingSpectrum } from './helpers.js'

describe('energy', () => {
    it('returns 0 for silence', () => {
        expect(energy(silence())).toBe(0)
    })

    it('returns 1 for full-scale signal', () => {
        expect(energy(fullScale())).toBeCloseTo(1, 5)
    })

    it('returns correct value for uniform signal', () => {
        // uniform(1024, 100): each sample = 100/255, squared = (100/255)^2
        const expected = (100 / 255) ** 2
        expect(energy(uniform(1024, 100))).toBeCloseTo(expected, 5)
    })

    it('scales with amplitude: louder signal has more energy', () => {
        const low = energy(uniform(1024, 50))
        const high = energy(uniform(1024, 200))
        expect(high).toBeGreaterThan(low)
    })

    it('is independent of FFT size for uniform signal', () => {
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

    it('is always in [0, 1] range', () => {
        expect(energy(silence())).toBeGreaterThanOrEqual(0)
        expect(energy(fullScale())).toBeLessThanOrEqual(1)
        expect(energy(risingSpectrum())).toBeLessThanOrEqual(1)
    })
})
