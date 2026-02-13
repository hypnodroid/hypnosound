import { describe, it, expect } from 'vitest'
import spectralCentroid from '../src/audio/spectralCentroid.js'
import spectralSpread from '../src/audio/spectralSpread.js'
import spectralRolloff from '../src/audio/spectralRolloff.js'
import spectralCrest from '../src/audio/spectralCrest.js'
import spectralFlux from '../src/audio/spectralFlux.js'
import { silence, uniform, singleBin, risingSpectrum, fallingSpectrum, fullScale } from './helpers.js'

describe('spectralCentroid', () => {
    it('returns null-based 0 for silence (all zeros)', () => {
        // denominator is 0, returns null * 1.5 which is 0 via coercion
        const val = spectralCentroid(silence())
        expect(val).toBe(0)
    })

    it('returns ~0.5 * 1.5 for uniform spectrum (center of mass at middle)', () => {
        const val = spectralCentroid(uniform())
        // Uniform spectrum: centroid is at (n-1)/2 / (n-1) = 0.5, * 1.5 = 0.75
        expect(val).toBeCloseTo(0.75, 1)
    })

    it('is low for energy concentrated in low bins', () => {
        const fft = singleBin(1024, 1, 255) // bin 1
        const val = spectralCentroid(fft)
        expect(val).toBeLessThan(0.1)
    })

    it('is high for energy concentrated in high bins', () => {
        const fft = singleBin(1024, 1000, 255)
        const val = spectralCentroid(fft)
        expect(val).toBeGreaterThan(1.0) // ~1.5 * (1000/1023) ≈ 1.47
    })

    it('rising spectrum has higher centroid than falling spectrum', () => {
        const rising = spectralCentroid(risingSpectrum())
        const falling = spectralCentroid(fallingSpectrum())
        expect(rising).toBeGreaterThan(falling)
    })

    it('returns 0 for empty array', () => {
        expect(spectralCentroid(new Uint8Array(0))).toBe(0)
    })
})

describe('spectralSpread', () => {
    it('returns 0 for single-bin signal (no spread)', () => {
        const fft = singleBin(1024, 512, 255)
        expect(spectralSpread(fft)).toBeCloseTo(0, 1)
    })

    it('is maximum when energy is at both extremes', () => {
        const fft = new Uint8Array(1024).fill(0)
        fft[0] = 255
        fft[1023] = 255
        const val = spectralSpread(fft)
        expect(val).toBeCloseTo(1, 1) // normalized by max spread
    })

    it('is moderate for uniform spectrum', () => {
        const val = spectralSpread(uniform())
        expect(val).toBeGreaterThan(0)
        expect(val).toBeLessThan(1)
    })

    it('narrow spectrum has less spread than wide spectrum', () => {
        // Narrow: energy in bins 500-524
        const narrow = new Uint8Array(1024).fill(0)
        for (let i = 500; i < 525; i++) narrow[i] = 200

        // Wide: energy in bins 200-800
        const wide = new Uint8Array(1024).fill(0)
        for (let i = 200; i < 800; i++) wide[i] = 200

        expect(spectralSpread(narrow)).toBeLessThan(spectralSpread(wide))
    })
})

describe('spectralRolloff', () => {
    it('returns 0 for silence', () => {
        expect(spectralRolloff(silence())).toBe(0)
    })

    it('falling spectrum rolloff is earlier than rising spectrum', () => {
        const falling = spectralRolloff(fallingSpectrum())
        const rising = spectralRolloff(risingSpectrum())
        expect(falling).toBeLessThan(rising)
    })

    it('returns late index for rising spectrum', () => {
        const val = spectralRolloff(risingSpectrum())
        expect(val).toBeGreaterThan(0.5) // most energy in later bins
    })

    it('is in [0, 1] range', () => {
        const val = spectralRolloff(uniform())
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThanOrEqual(1)
    })

    it('single bin at start returns 0 (bin 0 / length)', () => {
        const fft = singleBin(1024, 0, 255)
        expect(spectralRolloff(fft)).toBeCloseTo(0, 3)
    })

    it('85% threshold: uniform signal rolls off at ~85% of length', () => {
        const val = spectralRolloff(uniform())
        // For uniform, cumulative reaches 85% at bin ~0.85 * length
        expect(val).toBeCloseTo(0.85, 0.05)
    })
})

describe('spectralCrest', () => {
    it('is high for peaky spectrum (single bin)', () => {
        // Single bin: max/sum = 255/255 = 1, * 100 = 100
        const fft = singleBin(1024, 512, 255)
        expect(spectralCrest(fft)).toBeCloseTo(100, 1)
    })

    it('is low for uniform spectrum (flat)', () => {
        // Uniform: max/sum = 128 / (1024*128) = 1/1024, * 100
        const val = spectralCrest(uniform())
        expect(val).toBeLessThan(1)
    })

    it('returns 0 for silence', () => {
        expect(spectralCrest(silence())).toBe(0)
    })

    it('peaky signal > flat signal', () => {
        const peaky = spectralCrest(singleBin(1024, 512, 255))
        const flat = spectralCrest(uniform())
        expect(peaky).toBeGreaterThan(flat)
    })
})

describe('spectralFlux', () => {
    it('returns 0 when current and previous are the same', () => {
        const fft = uniform()
        expect(spectralFlux(fft, fft)).toBe(0)
    })

    it('returns 0 when previous is undefined (treated as zeros) and current is silence', () => {
        expect(spectralFlux(silence())).toBe(0)
    })

    it('returns positive value when signal appears', () => {
        const val = spectralFlux(fullScale(), silence())
        expect(val).toBeGreaterThan(0)
    })

    it('returns 0 when signal disappears (half-wave rectified)', () => {
        // spectralFlux uses half-wave rectification: (diff + |diff|) / 2
        // When signal decreases, diff is negative, so contribution is 0
        const val = spectralFlux(silence(), fullScale())
        expect(val).toBe(0)
    })

    it('is proportional to magnitude of increase', () => {
        const small = spectralFlux(uniform(1024, 50), silence())
        const large = spectralFlux(uniform(1024, 200), silence())
        expect(large).toBeGreaterThan(small)
    })

    it('only positive changes contribute (onset detection behavior)', () => {
        const prev = uniform(1024, 100)
        const curr = new Uint8Array(1024).fill(100)
        // Make half the bins increase, half decrease
        for (let i = 0; i < 512; i++) curr[i] = 200
        for (let i = 512; i < 1024; i++) curr[i] = 50

        const val = spectralFlux(curr, prev)
        // Should only reflect the increases, not the decreases
        expect(val).toBeGreaterThan(0)
    })
})
