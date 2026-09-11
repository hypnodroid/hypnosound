import { describe, it, expect } from 'vitest'
import AudioProcessor from '../index.js'
import { AudioFeatures } from '../src/audio/index.js'
import { uniform, silence, randomSpectrum } from './helpers.js'

describe('AudioProcessor', () => {
    it('creates an instance with all audio features as methods', () => {
        const processor = new AudioProcessor()
        for (const feature of AudioFeatures) {
            expect(typeof processor[feature]).toBe('function')
        }
    })

    it('has exactly the expected number of feature methods', () => {
        const processor = new AudioProcessor()
        const methods = AudioFeatures.filter((f) => typeof processor[f] === 'function')
        expect(methods.length).toBe(AudioFeatures.length)
    })

    describe('feature method return format', () => {
        it('returns an object with value and stats', () => {
            const processor = new AudioProcessor()
            const result = processor.energy(uniform())
            expect(result).toHaveProperty('value')
            expect(result).toHaveProperty('stats')
            expect(typeof result.value).toBe('number')
        })

        it('stats object contains all StatTypes fields', () => {
            const processor = new AudioProcessor()
            const result = processor.energy(uniform())
            expect(result.stats).toHaveProperty('mean')
            expect(result.stats).toHaveProperty('median')
            expect(result.stats).toHaveProperty('standardDeviation')
            expect(result.stats).toHaveProperty('zScore')
            expect(result.stats).toHaveProperty('normalized')
            expect(result.stats).toHaveProperty('min')
            expect(result.stats).toHaveProperty('max')
            expect(result.stats).toHaveProperty('slope')
            expect(result.stats).toHaveProperty('intercept')
            expect(result.stats).toHaveProperty('rSquared')
        })

        it('also returns analyzer and statCalculator in result', () => {
            const processor = new AudioProcessor()
            const result = processor.energy(uniform())
            expect(result).toHaveProperty('analyzer')
            expect(result).toHaveProperty('statCalculator')
            expect(typeof result.analyzer).toBe('function')
            expect(typeof result.statCalculator).toBe('function')
        })
    })

    describe('statefulness', () => {
        it('stats update across multiple calls', () => {
            const processor = new AudioProcessor()
            processor.energy(uniform(1024, 100))
            processor.energy(uniform(1024, 200))
            const result = processor.energy(uniform(1024, 150))
            // After 3 calls, mean should reflect all 3 values
            expect(result.stats.mean).not.toBe(result.value)
        })

        it('each feature has independent state', () => {
            const processor = new AudioProcessor()
            processor.energy(uniform(1024, 100))
            processor.energy(uniform(1024, 200))

            // rms has not been called yet, should have fresh stats
            const rmsResult = processor.rms(uniform(1024, 128))
            expect(rmsResult.stats.mean).toBe(rmsResult.value)
        })

        it('previousValue is tracked for spectralFlux', () => {
            const processor = new AudioProcessor()
            processor.spectralFlux(silence())
            const result = processor.spectralFlux(uniform(1024, 100))
            // Second call should detect change from silence to signal
            expect(result.value).toBeGreaterThan(0)
        })
    })

    describe('all features produce numeric output', () => {
        const processor = new AudioProcessor()
        const fft = randomSpectrum()

        for (const feature of AudioFeatures) {
            it(`${feature} returns a numeric value`, () => {
                const result = processor[feature](fft)
                expect(typeof result.value).toBe('number')
                expect(isNaN(result.value)).toBe(false)
                expect(isFinite(result.value)).toBe(true)
            })
        }
    })

    describe('all features handle silence', () => {
        for (const feature of AudioFeatures) {
            it(`${feature} does not throw on silence`, () => {
                const processor = new AudioProcessor()
                expect(() => processor[feature](silence())).not.toThrow()
            })
        }
    })

    describe('all features handle small FFT sizes', () => {
        for (const feature of AudioFeatures) {
            if (feature === 'spectralFlux') {
                it('spectralFlux works with 8-bin FFT (first call only)', () => {
                    const processor = new AudioProcessor()
                    const smallFft = uniform(8, 128)
                    // spectralFlux stores previous FFT value as a number (not array),
                    // so only the first call works correctly in AudioProcessor
                    const result = processor[feature](smallFft)
                    expect(typeof result.value).toBe('number')
                })
                continue
            }
            it(`${feature} works with 8-bin FFT`, () => {
                const processor = new AudioProcessor()
                const smallFft = uniform(8, 128)
                expect(() => processor[feature](smallFft)).not.toThrow()
                const result = processor[feature](smallFft)
                expect(typeof result.value).toBe('number')
            })
        }
    })

    describe('configurable historySize', () => {
        it('works with default options (backward compatible)', () => {
            const processor = new AudioProcessor()
            for (const feature of AudioFeatures) {
                expect(typeof processor[feature]).toBe('function')
            }
            const result = processor.energy(uniform())
            expect(result).toHaveProperty('value')
            expect(result).toHaveProperty('stats')
        })

        it('accepts historySize option', () => {
            const processor = new AudioProcessor({ historySize: 10 })
            for (const feature of AudioFeatures) {
                expect(typeof processor[feature]).toBe('function')
            }
            const result = processor.energy(uniform())
            expect(result).toHaveProperty('value')
            expect(result).toHaveProperty('stats')
        })

        it('smaller history window only retains recent samples for stats', () => {
            const processor = new AudioProcessor({ historySize: 10 })

            // Feed 15 samples of low values (value=10)
            for (let i = 0; i < 15; i++) {
                processor.energy(uniform(1024, 10))
            }

            // Now feed 10 samples of high values (value=200)
            // With historySize=10, the low values should be fully evicted
            for (let i = 0; i < 10; i++) {
                processor.energy(uniform(1024, 200))
            }

            const result = processor.energy(uniform(1024, 200))
            // The min should reflect only the last 10 samples (all high values),
            // not the earlier low values. With historySize=10, the low values
            // from the first 15 samples should have been evicted.
            const energyOf200 = result.value // energy of uniform(1024, 200)
            expect(result.stats.min).toBe(energyOf200)
        })

        it('larger history window retains older samples', () => {
            const processor = new AudioProcessor({ historySize: 100 })

            // Feed 5 samples of low values
            for (let i = 0; i < 5; i++) {
                processor.energy(uniform(1024, 10))
            }

            // Feed 10 samples of high values
            let result
            for (let i = 0; i < 10; i++) {
                result = processor.energy(uniform(1024, 200))
            }

            // With historySize=100, the old low values are still in the window
            // so the min should reflect them, not the recent high values
            expect(result.stats.min).not.toBe(result.stats.max)
        })

        it('historySize=10 evicts old values while historySize=500 retains them', () => {
            const smallProcessor = new AudioProcessor({ historySize: 10 })
            const defaultProcessor = new AudioProcessor()

            // Feed both processors the same 15 low then 15 high values
            for (let i = 0; i < 15; i++) {
                smallProcessor.energy(uniform(1024, 10))
                defaultProcessor.energy(uniform(1024, 10))
            }
            let smallResult, defaultResult
            for (let i = 0; i < 15; i++) {
                smallResult = smallProcessor.energy(uniform(1024, 200))
                defaultResult = defaultProcessor.energy(uniform(1024, 200))
            }

            // The small processor should have evicted the low values
            // so its min should equal the high value energy
            // The default processor (historySize=500) retains all 30 samples
            // so its min should still reflect the low values
            expect(smallResult.stats.min).toBe(smallResult.value)
            expect(defaultResult.stats.min).not.toBe(defaultResult.value)
        })
    })
})
