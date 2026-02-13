import { describe, it, expect } from 'vitest'
import rms from '../src/audio/rms.js'
import { silence, fullScale, uniform, singleBin } from './helpers.js'

describe('rms', () => {
    it('returns 0 for silence', () => {
        expect(rms(silence())).toBe(0)
    })

    it('returns 1 for full-scale signal', () => {
        expect(rms(fullScale())).toBeCloseTo(1, 5)
    })

    it('returns correct value for uniform signal', () => {
        // rms = sqrt(mean(normalized^2)) where normalized = value/255
        const value = 128
        const normalized = value / 255
        const expected = normalized // sqrt(normalized^2) for uniform
        expect(rms(uniform(1024, value))).toBeCloseTo(expected, 5)
    })

    it('is in [0, 1] range', () => {
        const val = rms(uniform(1024, 100))
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThanOrEqual(1)
    })

    it('louder signal has higher rms', () => {
        expect(rms(uniform(1024, 200))).toBeGreaterThan(rms(uniform(1024, 50)))
    })

    it('is independent of FFT size for uniform input', () => {
        expect(rms(uniform(256, 128))).toBeCloseTo(rms(uniform(2048, 128)), 5)
    })

    it('single bin contributes proportionally', () => {
        const fft = singleBin(1024, 0, 255)
        const expected = Math.sqrt(1 / 1024) // one bin at 1.0, rest 0
        expect(rms(fft)).toBeCloseTo(expected, 5)
    })
})
