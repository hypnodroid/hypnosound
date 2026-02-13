import { describe, it, expect } from 'vitest'
import spectralEntropy from '../src/audio/spectralEntropy.js'
import spectralKurtosis from '../src/audio/spectralKurtosis.js'
import spectralSkew from '../src/audio/spectralSkew.js'
import spectralRoughness from '../src/audio/spectralRoughness.js'
import { silence, uniform, singleBin, randomSpectrum, risingSpectrum } from './helpers.js'

describe('spectralEntropy', () => {
    it('returns 0 for silence', () => {
        expect(spectralEntropy(silence())).toBe(0)
    })

    it('returns ~1 for uniform spectrum (maximum disorder)', () => {
        // Use a regular Array so toPowerSpectrum (which uses .map()) returns
        // proper squared values. Uint8Array.map() clamps to 0-255, truncating squares.
        const fft = Array.from({ length: 1024 }, () => 10)
        const val = spectralEntropy(fft)
        expect(val).toBeCloseTo(1, 1)
    })

    it('returns low value for single-bin signal (highly ordered)', () => {
        const val = spectralEntropy(singleBin(1024, 512, 255))
        expect(val).toBeLessThan(0.1)
    })

    it('is in [0, 1] range', () => {
        const val = spectralEntropy(randomSpectrum())
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThanOrEqual(1)
    })

    it('random spectrum has higher entropy than peaky spectrum', () => {
        const random = spectralEntropy(randomSpectrum())
        const peaky = spectralEntropy(singleBin(1024, 100, 255))
        expect(random).toBeGreaterThan(peaky)
    })
})

describe('spectralKurtosis', () => {
    it('returns ~0.5 for uniform signal (logistic of ~0)', () => {
        // Uniform distribution has kurtosis -1.2 (platykurtic), logistic maps near 0.5
        const val = spectralKurtosis(uniform())
        expect(val).toBeCloseTo(0.5, 0)
    })

    it('is in (0, 1) range (logistic output)', () => {
        const val = spectralKurtosis(randomSpectrum())
        expect(val).toBeGreaterThan(0)
        expect(val).toBeLessThan(1)
    })

    it('peaky spectrum has higher kurtosis than flat spectrum', () => {
        // A single spike has high kurtosis (leptokurtic)
        const peaky = spectralKurtosis(singleBin(1024, 512, 255))
        const flat = spectralKurtosis(uniform())
        expect(peaky).toBeGreaterThan(flat)
    })

    it('returns value for silence', () => {
        // Should not throw; logistic of 0 = 0.5
        const val = spectralKurtosis(silence())
        expect(val).toBeCloseTo(0.5, 1)
    })
})

describe('spectralSkew', () => {
    it('returns ~0.5 for symmetric spectrum (zero skew)', () => {
        const val = spectralSkew(uniform())
        expect(val).toBeCloseTo(0.5, 1)
    })

    it('is in (0, 1) range (logistic output)', () => {
        const val = spectralSkew(randomSpectrum())
        expect(val).toBeGreaterThan(0)
        expect(val).toBeLessThan(1)
    })

    it('rising spectrum is positively skewed (> 0.5)', () => {
        const val = spectralSkew(risingSpectrum())
        expect(val).toBeGreaterThan(0.5)
    })

    it('returns 0.5 for silence (zero std dev)', () => {
        // skewness = 0, logistic(0) = 0.5
        const val = spectralSkew(silence())
        expect(val).toBeCloseTo(0.5, 5)
    })

    it('returns 0.5 for empty array', () => {
        expect(spectralSkew(new Uint8Array(0))).toBeCloseTo(0.5, 5)
    })
})

describe('spectralRoughness', () => {
    it('returns 0 for silence', () => {
        expect(spectralRoughness(silence())).toBe(0)
    })

    it('returns 0 for uniform spectrum (no adjacent differences)', () => {
        expect(spectralRoughness(uniform())).toBe(0)
    })

    it('is positive for non-uniform spectrum', () => {
        expect(spectralRoughness(randomSpectrum())).toBeGreaterThan(0)
    })

    it('alternating high/low has high roughness', () => {
        const fft = new Uint8Array(1024)
        for (let i = 0; i < 1024; i++) {
            fft[i] = i % 2 === 0 ? 255 : 0
        }
        const val = spectralRoughness(fft)
        expect(val).toBeGreaterThan(0)
    })

    it('smooth spectrum has low roughness', () => {
        // Linearly rising is smooth
        const smooth = spectralRoughness(risingSpectrum())
        // Alternating is rough
        const rough = new Uint8Array(1024)
        for (let i = 0; i < 1024; i++) rough[i] = i % 2 === 0 ? 255 : 0
        const roughVal = spectralRoughness(rough)
        expect(smooth).toBeLessThan(roughVal)
    })

    it('single bin has non-zero roughness (edges contribute)', () => {
        const val = spectralRoughness(singleBin(1024, 512, 255))
        expect(val).toBeGreaterThan(0)
    })
})
