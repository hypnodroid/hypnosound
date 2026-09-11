import { describe, it, expect } from 'vitest'
import normalizeInput from '../src/utils/normalizeInput.js'

describe('normalizeInput', () => {
    describe('Uint8Array input (0-255)', () => {
        it('normalizes 0 to 0', () => {
            const result = normalizeInput(new Uint8Array([0]))
            expect(result[0]).toBe(0)
        })

        it('normalizes 255 to 1', () => {
            const result = normalizeInput(new Uint8Array([255]))
            expect(result[0]).toBeCloseTo(1, 5)
        })

        it('normalizes 128 to ~0.502', () => {
            const result = normalizeInput(new Uint8Array([128]))
            expect(result[0]).toBeCloseTo(128 / 255, 5)
        })

        it('returns a Float32Array', () => {
            const result = normalizeInput(new Uint8Array([0, 128, 255]))
            expect(result).toBeInstanceOf(Float32Array)
        })

        it('preserves length', () => {
            const input = new Uint8Array(1024).fill(100)
            const result = normalizeInput(input)
            expect(result.length).toBe(1024)
        })

        it('all values are in [0, 1]', () => {
            const input = new Uint8Array(256)
            for (let i = 0; i < 256; i++) input[i] = i
            const result = normalizeInput(input)
            for (let i = 0; i < result.length; i++) {
                expect(result[i]).toBeGreaterThanOrEqual(0)
                expect(result[i]).toBeLessThanOrEqual(1)
            }
        })
    })

    describe('Float32Array input (dB values)', () => {
        it('normalizes 0 dB to 1 (full scale)', () => {
            const result = normalizeInput(new Float32Array([0]))
            expect(result[0]).toBeCloseTo(1, 5)
        })

        it('normalizes -20 dB to 0.1', () => {
            const result = normalizeInput(new Float32Array([-20]))
            expect(result[0]).toBeCloseTo(0.1, 5)
        })

        it('normalizes -40 dB to 0.01', () => {
            const result = normalizeInput(new Float32Array([-40]))
            expect(result[0]).toBeCloseTo(0.01, 5)
        })

        it('normalizes -100 dB to near 0', () => {
            const result = normalizeInput(new Float32Array([-100]))
            expect(result[0]).toBeCloseTo(0.00001, 5)
        })

        it('clamps positive dB values to 1', () => {
            const result = normalizeInput(new Float32Array([10]))
            expect(result[0]).toBe(1)
        })

        it('clamps very negative dB values to near 0 (not negative)', () => {
            const result = normalizeInput(new Float32Array([-200]))
            expect(result[0]).toBeGreaterThanOrEqual(0)
        })

        it('returns a Float32Array', () => {
            const result = normalizeInput(new Float32Array([-20, -40, 0]))
            expect(result).toBeInstanceOf(Float32Array)
        })

        it('preserves length', () => {
            const input = new Float32Array(1024).fill(-30)
            const result = normalizeInput(input)
            expect(result.length).toBe(1024)
        })

        it('all values are in [0, 1]', () => {
            const input = new Float32Array(101)
            for (let i = 0; i < 101; i++) input[i] = -100 + i // -100 to 0
            const result = normalizeInput(input)
            for (let i = 0; i < result.length; i++) {
                expect(result[i]).toBeGreaterThanOrEqual(0)
                expect(result[i]).toBeLessThanOrEqual(1)
            }
        })
    })

    describe('regular Array input', () => {
        it('treats regular arrays as Uint8Array-style (0-255)', () => {
            const result = normalizeInput([0, 128, 255])
            expect(result[0]).toBe(0)
            expect(result[1]).toBeCloseTo(128 / 255, 5)
            expect(result[2]).toBeCloseTo(1, 5)
        })

        it('returns a Float32Array', () => {
            const result = normalizeInput([100, 200])
            expect(result).toBeInstanceOf(Float32Array)
        })
    })
})
