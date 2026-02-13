import { describe, it, expect } from 'vitest'
import AudioProcessor, * as hypnosound from '../index.js'
import { AudioFeatures } from '../src/audio/index.js'

describe('module exports', () => {
    it('default export is AudioProcessor class', () => {
        expect(typeof AudioProcessor).toBe('function')
        const instance = new AudioProcessor()
        expect(instance).toBeInstanceOf(AudioProcessor)
    })

    it('exports all audio features as named exports', () => {
        for (const feature of AudioFeatures) {
            expect(typeof hypnosound[feature]).toBe('function')
        }
    })

    it('exports makeCalculateStats', () => {
        expect(typeof hypnosound.makeCalculateStats).toBe('function')
    })

    it('exports StatTypes array', () => {
        expect(Array.isArray(hypnosound.StatTypes)).toBe(true)
        expect(hypnosound.StatTypes.length).toBe(10)
    })

    it('exports applyKaiserWindow', () => {
        expect(typeof hypnosound.applyKaiserWindow).toBe('function')
    })

    it('exports AudioFeatures array', () => {
        expect(Array.isArray(hypnosound.AudioFeatures)).toBe(true)
        expect(hypnosound.AudioFeatures.length).toBe(16)
    })

    it('all AudioFeatures entries correspond to exported functions', () => {
        for (const name of hypnosound.AudioFeatures) {
            expect(typeof hypnosound[name]).toBe('function')
        }
    })
})
