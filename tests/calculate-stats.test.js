import { describe, it, expect } from 'vitest'
import { makeCalculateStats, StatTypes } from '../src/utils/calculateStats.js'

describe('StatTypes', () => {
    it('contains all expected stat names', () => {
        expect(StatTypes).toContain('normalized')
        expect(StatTypes).toContain('mean')
        expect(StatTypes).toContain('median')
        expect(StatTypes).toContain('standardDeviation')
        expect(StatTypes).toContain('zScore')
        expect(StatTypes).toContain('min')
        expect(StatTypes).toContain('max')
        expect(StatTypes).toContain('slope')
        expect(StatTypes).toContain('intercept')
        expect(StatTypes).toContain('rSquared')
    })

    it('has exactly 10 stat types', () => {
        expect(StatTypes).toHaveLength(10)
    })
})

describe('makeCalculateStats', () => {
    it('returns a function', () => {
        const calc = makeCalculateStats()
        expect(typeof calc).toBe('function')
    })

    it('throws on NaN input', () => {
        const calc = makeCalculateStats()
        expect(() => calc(NaN)).toThrow('Input must be a valid number')
    })

    it('throws on non-number input', () => {
        const calc = makeCalculateStats()
        expect(() => calc('hello')).toThrow('Input must be a valid number')
        expect(() => calc(undefined)).toThrow('Input must be a valid number')
    })

    describe('single value', () => {
        it('mean equals the value', () => {
            const calc = makeCalculateStats()
            const stats = calc(42)
            expect(stats.mean).toBe(42)
        })

        it('min and max equal the value', () => {
            const calc = makeCalculateStats()
            const stats = calc(42)
            expect(stats.min).toBe(42)
            expect(stats.max).toBe(42)
        })

        it('stddev is 0', () => {
            const calc = makeCalculateStats()
            const stats = calc(42)
            expect(stats.standardDeviation).toBe(0)
        })

        it('median equals the value', () => {
            const calc = makeCalculateStats()
            const stats = calc(42)
            expect(stats.median).toBe(42)
        })

        it('normalized is 0.5 when min equals max', () => {
            const calc = makeCalculateStats()
            const stats = calc(42)
            expect(stats.normalized).toBe(0.5)
        })

        it('zScore is 1 when min equals max', () => {
            const calc = makeCalculateStats()
            const stats = calc(42)
            expect(stats.zScore).toBe(1)
        })

        it('current equals input value', () => {
            const calc = makeCalculateStats()
            const stats = calc(42)
            expect(stats.current).toBe(42)
        })
    })

    describe('mean', () => {
        it('calculates correct mean for multiple values', () => {
            const calc = makeCalculateStats()
            calc(10)
            calc(20)
            const stats = calc(30)
            expect(stats.mean).toBeCloseTo(20, 5)
        })

        it('updates as new values come in', () => {
            const calc = makeCalculateStats()
            calc(0)
            calc(100)
            const stats = calc(50)
            expect(stats.mean).toBeCloseTo(50, 5)
        })
    })

    describe('min and max', () => {
        it('tracks min across values', () => {
            const calc = makeCalculateStats()
            calc(50)
            calc(10)
            calc(30)
            const stats = calc(20)
            expect(stats.min).toBe(10)
        })

        it('tracks max across values', () => {
            const calc = makeCalculateStats()
            calc(10)
            calc(50)
            calc(30)
            const stats = calc(20)
            expect(stats.max).toBe(50)
        })

        it('min and max update correctly when values are evicted', () => {
            const calc = makeCalculateStats(3) // small window
            calc(100) // [100]
            calc(50)  // [100, 50]
            calc(75)  // [100, 50, 75]
            const stats = calc(60) // [50, 75, 60] - 100 evicted
            expect(stats.min).toBe(50)
            expect(stats.max).toBe(75)
        })
    })

    describe('median', () => {
        it('returns middle value for odd count', () => {
            const calc = makeCalculateStats()
            calc(1)
            calc(3)
            const stats = calc(2)
            expect(stats.median).toBe(2)
        })

        it('returns average of two middle values for even count', () => {
            const calc = makeCalculateStats()
            calc(1)
            calc(2)
            calc(3)
            const stats = calc(4)
            expect(stats.median).toBe(2.5)
        })

        it('handles repeated values', () => {
            const calc = makeCalculateStats()
            calc(5)
            calc(5)
            calc(5)
            const stats = calc(5)
            expect(stats.median).toBe(5)
        })
    })

    describe('standardDeviation', () => {
        it('is 0 for constant values', () => {
            const calc = makeCalculateStats()
            calc(7)
            calc(7)
            const stats = calc(7)
            expect(stats.standardDeviation).toBe(0)
        })

        it('is correct for known values', () => {
            const calc = makeCalculateStats()
            // values: 2, 4, 4, 4, 5, 5, 7, 9
            const values = [2, 4, 4, 4, 5, 5, 7, 9]
            let stats
            for (const v of values) stats = calc(v)
            // population std dev = 2.0
            expect(stats.standardDeviation).toBeCloseTo(2.0, 1)
        })
    })

    describe('normalized', () => {
        it('is 0 for minimum value', () => {
            const calc = makeCalculateStats()
            calc(0)
            calc(100)
            const stats = calc(0)
            expect(stats.normalized).toBe(0)
        })

        it('is 1 for maximum value', () => {
            const calc = makeCalculateStats()
            calc(0)
            calc(100)
            const stats = calc(100)
            expect(stats.normalized).toBe(1)
        })

        it('is 0.5 for midpoint', () => {
            const calc = makeCalculateStats()
            calc(0)
            calc(100)
            const stats = calc(50)
            expect(stats.normalized).toBe(0.5)
        })
    })

    describe('zScore', () => {
        it('is 0 for value at mean', () => {
            const calc = makeCalculateStats()
            calc(10)
            calc(20)
            calc(30)
            // mean is 20 after these, add 20 to get zScore of 0
            const stats = calc(20)
            expect(stats.zScore).toBeCloseTo(0, 1)
        })

        it('is positive for value above mean', () => {
            const calc = makeCalculateStats()
            calc(0)
            calc(10)
            const stats = calc(100)
            expect(stats.zScore).toBeGreaterThan(0)
        })

        it('is negative for value below mean', () => {
            const calc = makeCalculateStats()
            calc(100)
            calc(90)
            const stats = calc(0)
            expect(stats.zScore).toBeLessThan(0)
        })
    })

    describe('linear regression', () => {
        it('slope is 0 for constant values', () => {
            const calc = makeCalculateStats()
            calc(5)
            calc(5)
            const stats = calc(5)
            expect(stats.slope).toBeCloseTo(0, 5)
        })

        it('detects positive trend', () => {
            const calc = makeCalculateStats()
            for (let i = 0; i < 10; i++) calc(i)
            const stats = calc(10)
            expect(stats.slope).toBeGreaterThan(0)
        })

        it('detects negative trend', () => {
            const calc = makeCalculateStats()
            for (let i = 10; i >= 0; i--) calc(i)
            const stats = calc(-1)
            expect(stats.slope).toBeLessThan(0)
        })

        it('rSquared is 1 for perfect linear data', () => {
            const calc = makeCalculateStats()
            for (let i = 0; i < 10; i++) calc(i * 2 + 3)
            const stats = calc(10 * 2 + 3)
            expect(stats.rSquared).toBeCloseTo(1, 5)
        })

        it('slope is correct for y = 2x + 1', () => {
            const calc = makeCalculateStats()
            let stats
            for (let i = 0; i < 20; i++) stats = calc(2 * i + 1)
            expect(stats.slope).toBeCloseTo(2, 3)
            expect(stats.intercept).toBeCloseTo(1, 3)
        })

        it('rSquared is lower for noisy data', () => {
            const calcPerfect = makeCalculateStats()
            const calcNoisy = makeCalculateStats()
            let statsPerfect, statsNoisy
            let seed = 42
            for (let i = 0; i < 50; i++) {
                statsPerfect = calcPerfect(i)
                seed = (seed * 1103515245 + 12345) & 0x7fffffff
                const noise = (seed % 100) - 50
                statsNoisy = calcNoisy(i + noise)
            }
            expect(statsPerfect.rSquared).toBeGreaterThan(statsNoisy.rSquared)
        })
    })

    describe('history window', () => {
        it('respects history size limit', () => {
            const calc = makeCalculateStats(5)
            for (let i = 0; i < 10; i++) calc(i)
            // After 10 values with window 5, queue should have 5 elements
            expect(calc.queue.length).toBe(5)
        })

        it('evicts oldest values when window is full', () => {
            const calc = makeCalculateStats(3)
            calc(100) // [100]
            calc(1)   // [100, 1]
            calc(1)   // [100, 1, 1]
            const stats = calc(1) // [1, 1, 1] — 100 evicted
            expect(stats.mean).toBeCloseTo(1, 5)
            expect(stats.min).toBe(1)
        })

        it('default history size is 500', () => {
            const calc = makeCalculateStats()
            for (let i = 0; i < 600; i++) calc(i)
            expect(calc.queue.length).toBe(500)
        })
    })
})
