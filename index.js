import {makeCalculateStats} from './src/utils/calculateStats.js'
import energy from './src/audio/energy.js'
import spectralCentroid from './src/audio/spectralCentroid.js'
import spectralCrest from './src/audio/spectralCrest.js'
class AudioProcessor {
    constructor() {
      this.statCalculators = {}
      this.previousValue = {}
      this.analyzers = {}

      this.statCalculators.energy = makeCalculateStats()
      this.previousValue.energy = 0

      this.statCalculators.spectralCentroid = makeCalculateStats()
      this.previousValue.spectralCentroid = 0

      this.statCalculators.spectralCrest = makeCalculateStats()
      this.previousValue.spectralCrest = 0


    }
    energy = (fft) => {
        const {value, stats} = energy(this.previousValue.energy, this.statCalculators.energy, fft)
        this.previousValue.energy = value
        return {value, stats}
    }

    spectralCentroid = (fft) => {
        const {value, stats} = spectralCentroid(this.previousValue.spectralCentroid, this.statCalculators.spectralCentroid, fft)
        this.previousValue.spectralCentroid = value
        return {value, stats}
    }

    spectralCrest = (fft) => {
        const {value, stats} = spectralCrest(this.previousValue.spectralCrest, this.statCalculators.spectralCrest, fft)
        this.previousValue.spectralCrest = value
        return {value, stats}
    }
}
export default AudioProcessor
