import { makeCalculateStats } from './src/utils/calculateStats.js'

import energy from './src/audio/energy.js'
import spectralCentroid from './src/audio/spectralCentroid.js'
import spectralCrest from './src/audio/spectralCrest.js'
import spectralEntropy from './src/audio/spectralEntropy.js'
import spectralFlux from './src/audio/spectralFlux.js'
import spectralKurtosis from './src/audio/spectralKurtosis.js'
import spectralRolloff from './src/audio/spectralRolloff.js'
import spectralRoughness from './src/audio/spectralRoughness.js'
import spectralSkew from './src/audio/spectralSkew.js'
import spectralSpread from './src/audio/spectralSpread.js'

class AudioProcessor {
    constructor() {
        this.statCalculators = {}
        this.previousValue = {}

        this.statCalculators.energy = makeCalculateStats()
        this.statCalculators.spectralCentroid = makeCalculateStats()
        this.statCalculators.spectralCrest = makeCalculateStats()
        this.statCalculators.spectralEntropy = makeCalculateStats()

        this.statCalculators.spectralFlux = makeCalculateStats()
        this.previousValue.spectralFlux = null

        this.statCalculators.spectralKurtosis = makeCalculateStats()

        this.statCalculators.spectralRolloff = makeCalculateStats()

        this.statCalculators.spectralSkew = makeCalculateStats()
        this.previousValue.spectralSkew = 0

        this.statCalculators.spectralRoughness = makeCalculateStats()
        this.previousValue.spectralRoughness = 0

        this.statCalculators.spectralSpread = makeCalculateStats()
        this.previousValue.spectralSpread = 0
    }

    energy = (fft) => {
        const value = energy(fft)
        const stats = this.statCalculators.energy(value)
        return { value, stats }
    }

    spectralCentroid = (fft) => {
        const value = spectralCentroid(fft)
        const stats = this.statCalculators.spectralCentroid(value)
        return { value, stats }
    }

    spectralCrest = (fft) => {
        const value = spectralCrest(fft)
        const stats = this.statCalculators.spectralCentroid(value)
        return { value, stats }
    }

    spectralEntropy = (fft) => {
        const value = spectralEntropy(fft)
        const stats = this.statCalculators.spectralEntropy(value)
        return { value, stats }
    }

    spectralFlux = (fft) => {
        const value = spectralFlux(fft, this.previousValue.spectralFlux)
        this.previousValue.spectralFlux = new Uint8Array(fft)
        const stats = this.statCalculators.spectralFlux(value)
        return { value, stats }
    }
    spectralKurtosis = (fft) => {
        const value = spectralKurtosis(fft)
        const stats = this.statCalculators.spectralKurtosis(value)
        return { value, stats }
    }

    spectralRolloff = (fft) => {
        const value = spectralRolloff(fft)
        const stats = this.statCalculators.spectralRolloff(value)
        return { value, stats }
    }

    spectralRoughness = (fft) => {
        const { value, stats } = spectralRoughness(this.previousValue.spectralRoughness, this.statCalculators.spectralRoughness, fft)
        this.previousValue.spectralRoughness = value
        return { value, stats }
    }

    spectralSkew = (fft) => {
        const { value, stats } = spectralSkew(this.previousValue.spectralSkew, this.statCalculators.spectralSkew, fft)
        this.previousValue.spectralSkew = value
        return { value, stats }
    }

    spectralSpread = (fft) => {
        const { value, stats } = spectralSpread(this.previousValue.spectralSpread, this.statCalculators.spectralSpread, fft)
        this.previousValue.spectralSpread = value
        return { value, stats }
    }
}
export default AudioProcessor
export {
    energy,
    spectralCentroid,
    spectralCrest,
    spectralEntropy,
    spectralFlux,
    spectralKurtosis,
    spectralRolloff,
    spectralRoughness,
    spectralSkew,
    spectralSpread,
    makeCalculateStats,
}
