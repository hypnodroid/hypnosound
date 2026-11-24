import { describe, it, expect } from 'vitest'
import { makeCalculateStats } from '../src/utils/calculateStats.js'

const bruteMedian = (window) => {
    const sorted = [...window].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// Deterministic PRNG so a failure reproduces exactly
const mulberry32 = (seed) => () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// Feeds the stream and returns the frames whose median differs from brute force
const mismatches = (values, historySize) => {
    const calc = makeCalculateStats(historySize)
    const window = []
    const bad = []
    values.forEach((value, frame) => {
        const { median } = calc(value)
        window.push(value)
        if (window.length > historySize) window.shift()
        const expected = bruteMedian(window)
        if (Math.abs(median - expected) > 1e-9) bad.push({ frame, median, expected })
    })
    return bad
}

const randomStream = (seed, length, quantize) => {
    const rand = mulberry32(seed)
    return Array.from({ length }, () => (quantize ? Math.floor(rand() * quantize) : rand() * 100))
}

describe('rolling median matches a brute-force sorted-window median', () => {
    it('2000 random frames, window 50', () => {
        expect(mismatches(randomStream(1, 2000), 50)).toEqual([])
    })

    it('random streams across window sizes and seeds', () => {
        for (const historySize of [1, 2, 3, 4, 7, 16, 100, 500]) {
            for (const seed of [2, 3, 4]) {
                expect(mismatches(randomStream(seed, 1500, 0), historySize), `window ${historySize} seed ${seed}`).toEqual([])
            }
        }
    })

    it('many duplicates (values drawn from 0..4)', () => {
        for (const historySize of [1, 2, 5, 10, 64]) {
            expect(mismatches(randomStream(9, 1500, 5), historySize), `window ${historySize}`).toEqual([])
        }
    })

    it('window not yet full', () => {
        expect(mismatches([5, 1, 9, 3, 7, 2], 100)).toEqual([])
    })

    it('window size 1 tracks the latest value', () => {
        expect(mismatches([3, 8, 1, 1, 9, 4, 4, 0], 1)).toEqual([])
    })

    it('window size 2 averages the last two values', () => {
        expect(mismatches([3, 8, 1, 1, 9, 4, 4, 0], 2)).toEqual([])
    })

    it('values leaving the window that equal the median', () => {
        // 5 is the median of each window and keeps leaving it
        expect(mismatches([5, 1, 9, 5, 2, 8, 5, 5, 0, 10, 5, 3, 7, 5], 3)).toEqual([])
        expect(mismatches([5, 5, 5, 1, 9, 5, 5, 2, 8, 5], 4)).toEqual([])
    })

    it('monotonic ramps up and down', () => {
        const up = Array.from({ length: 300 }, (_, i) => i)
        expect(mismatches([...up, ...up.reverse()], 37)).toEqual([])
    })

    it('median stays correct when every value in the window is equal', () => {
        expect(mismatches([...Array(20).fill(4), 1, 9, ...Array(20).fill(4)], 6)).toEqual([])
    })
})
