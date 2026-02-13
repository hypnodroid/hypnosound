import { describe, it, expect } from 'vitest'
import dbfs from '../src/audio/dbfs.js'
import { silence, fullScale, uniform } from './helpers.js'

describe('dbfs', () => {
    it('returns 0 for silence', () => {
        expect(dbfs(silence())).toBe(0)
    })

    it('returns 1 for full-scale signal', () => {
        // rms = 1.0, 20*log10(1) = 0 dB, (0+100)/100 = 1
        expect(dbfs(fullScale())).toBeCloseTo(1, 5)
    })

    it('is in [0, 1] range for typical signals', () => {
        const val = dbfs(uniform(1024, 100))
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThanOrEqual(1)
    })

    it('louder signal has higher dbfs', () => {
        expect(dbfs(uniform(1024, 200))).toBeGreaterThan(dbfs(uniform(1024, 50)))
    })

    it('very quiet signal returns near-zero', () => {
        const val = dbfs(uniform(1024, 1))
        expect(val).toBeGreaterThan(0)
        expect(val).toBeLessThan(0.6) // ~-48 dB mapped
    })

    it('mid-level signal returns mid-range value', () => {
        const val = dbfs(uniform(1024, 128))
        expect(val).toBeGreaterThan(0.5)
        expect(val).toBeLessThan(1)
    })
})
