import { describe, it, expect } from 'vitest'
import mu from '../src/utils/mu.js'
import { applyKaiserWindow } from '../src/utils/applyKaiserWindow.js'

describe('mu (spectral moment)', () => {
    it('returns null for all-zero spectrum (division by zero)', () => {
        expect(mu(1, new Uint8Array(10))).toBe(null)
    })

    it('first moment of single-bin spectrum equals that bin index', () => {
        const spectrum = new Float32Array(10).fill(0)
        spectrum[5] = 1
        expect(mu(1, spectrum)).toBeCloseTo(5, 5)
    })

    it('first moment of uniform spectrum is center index', () => {
        const spectrum = new Float32Array(10).fill(1)
        // mean index = (0+1+...+9)/10 = 4.5
        expect(mu(1, spectrum)).toBeCloseTo(4.5, 5)
    })

    it('zeroth moment is always 1 for non-zero spectrum', () => {
        const spectrum = new Float32Array([1, 2, 3, 4, 5])
        // mu(0) = sum(k^0 * |spec[k]|) / sum(spec[k]) = sum(spec) / sum(spec) = 1
        expect(mu(0, spectrum)).toBeCloseTo(1, 5)
    })

    it('second moment is higher for wider spectrum', () => {
        // Energy at edges
        const wide = new Float32Array(100).fill(0)
        wide[0] = 1
        wide[99] = 1

        // Energy at center
        const narrow = new Float32Array(100).fill(0)
        narrow[49] = 1
        narrow[50] = 1

        expect(mu(2, wide)).toBeGreaterThan(mu(2, narrow))
    })

    it('handles negative values via Math.abs', () => {
        const spectrum = new Float32Array([-3, -2, -1])
        // numerator uses |spectrum[k]|, but denominator uses raw spectrum[k]
        // denominator = -3 + -2 + -1 = -6
        // numerator = 0*3 + 1*2 + 2*1 = 4
        // result = 4 / -6 (note: denominator uses raw values)
        const result = mu(1, spectrum)
        expect(result).toBeCloseTo(4 / -6, 5)
    })
})

describe('applyKaiserWindow', () => {
    it('returns Float32Array of same length', () => {
        const input = new Float32Array(100).fill(1)
        const result = applyKaiserWindow(input)
        expect(result).toBeInstanceOf(Float32Array)
        expect(result.length).toBe(100)
    })

    it('center sample is unattenuated (window peak)', () => {
        const n = 101
        const input = new Float32Array(n).fill(1)
        const result = applyKaiserWindow(input)
        // Center of Kaiser window should be 1.0
        expect(result[50]).toBeCloseTo(1.0, 3)
    })

    it('edge samples are attenuated', () => {
        const input = new Float32Array(100).fill(1)
        const result = applyKaiserWindow(input)
        expect(result[0]).toBeLessThan(result[50])
        expect(result[99]).toBeLessThan(result[50])
    })

    it('is symmetric', () => {
        const n = 100
        const input = new Float32Array(n).fill(1)
        const result = applyKaiserWindow(input)
        for (let i = 0; i < n / 2; i++) {
            expect(result[i]).toBeCloseTo(result[n - 1 - i], 5)
        }
    })

    it('higher beta gives more attenuation at edges', () => {
        const input = new Float32Array(100).fill(1)
        const lowBeta = applyKaiserWindow(input, 2)
        const highBeta = applyKaiserWindow(input, 10)
        // Higher beta = more sidelobe suppression = more edge attenuation
        expect(highBeta[0]).toBeLessThan(lowBeta[0])
    })

    it('beta=0 gives rectangular window (no attenuation)', () => {
        const input = new Float32Array(50).fill(1)
        const result = applyKaiserWindow(input, 0)
        for (let i = 0; i < 50; i++) {
            expect(result[i]).toBeCloseTo(1.0, 3)
        }
    })

    it('preserves zero input', () => {
        const input = new Float32Array(100).fill(0)
        const result = applyKaiserWindow(input)
        for (let i = 0; i < 100; i++) {
            expect(result[i]).toBe(0)
        }
    })

    it('scales input values by window coefficients', () => {
        const n = 50
        const input = new Float32Array(n).fill(2)
        const ones = new Float32Array(n).fill(1)
        const resultOnes = applyKaiserWindow(ones)
        const resultTwos = applyKaiserWindow(input)
        for (let i = 0; i < n; i++) {
            expect(resultTwos[i]).toBeCloseTo(resultOnes[i] * 2, 5)
        }
    })
})
