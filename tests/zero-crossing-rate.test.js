import { describe, it, expect } from 'vitest'
import zeroCrossingRate from '../src/audio/zeroCrossingRate.js'

describe('zeroCrossingRate', () => {
    it('returns 0 for a constant signal (all same value)', () => {
        const signal = new Float32Array(1024).fill(0.5)
        expect(zeroCrossingRate(signal)).toBe(0)
    })

    it('returns 0 for very short input (length < 2)', () => {
        expect(zeroCrossingRate(new Float32Array([1]))).toBe(0)
        expect(zeroCrossingRate(new Float32Array([]))).toBe(0)
        expect(zeroCrossingRate(null)).toBe(0)
        expect(zeroCrossingRate(undefined)).toBe(0)
    })

    it('returns 1.0 for a maximally alternating signal', () => {
        const length = 100
        const signal = new Float32Array(length)
        for (let i = 0; i < length; i++) {
            signal[i] = i % 2 === 0 ? 1 : -1
        }
        expect(zeroCrossingRate(signal)).toBeCloseTo(1.0, 5)
    })

    it('returns approximately 0.5 for a signal that crosses zero about half the time', () => {
        // Build a signal: first half positive, second half alternating
        const length = 200
        const signal = new Float32Array(length)
        // First half: constant positive (no crossings)
        for (let i = 0; i < length / 2; i++) {
            signal[i] = 1
        }
        // Second half: alternating (every sample crosses)
        for (let i = length / 2; i < length; i++) {
            signal[i] = i % 2 === 0 ? 1 : -1
        }
        const zcr = zeroCrossingRate(signal)
        // Should be roughly 0.5 (half the transitions are crossings)
        expect(zcr).toBeGreaterThan(0.3)
        expect(zcr).toBeLessThan(0.7)
    })

    it('works with Uint8Array input (centered around 128)', () => {
        // [0, 255, 0, 255, ...] should give high ZCR since
        // 0-128 = -128 and 255-128 = 127 alternate signs
        const length = 100
        const signal = new Uint8Array(length)
        for (let i = 0; i < length; i++) {
            signal[i] = i % 2 === 0 ? 0 : 255
        }
        expect(zeroCrossingRate(signal)).toBeCloseTo(1.0, 5)
    })

    it('works with Float32Array input', () => {
        const signal = new Float32Array([-1, 1, -1, 1])
        expect(zeroCrossingRate(signal)).toBeCloseTo(1.0, 5)
    })

    it('returns a value between 0 and 1 for random data', () => {
        const length = 1024
        const signal = new Float32Array(length)
        for (let i = 0; i < length; i++) {
            signal[i] = Math.random() * 2 - 1
        }
        const zcr = zeroCrossingRate(signal)
        expect(zcr).toBeGreaterThanOrEqual(0)
        expect(zcr).toBeLessThanOrEqual(1)
    })
})
