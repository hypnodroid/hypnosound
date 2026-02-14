import { StatTypes, makeCalculateStats } from './src/utils/calculateStats.js'
export * from './src/audio/index.js'
export { applyKaiserWindow } from './src/utils/applyKaiserWindow.js'
export { StatTypes, makeCalculateStats } from './src/utils/calculateStats.js'
import * as audio from './src/audio/index.js'

class AudioProcessor {
    constructor(options = {}) {
        const { historySize = 500 } = options
        const { AudioFeatures } = audio
        this.state = AudioFeatures.reduce((acc, feature) => {
            acc[feature] = {
                analyzer: audio[feature],
                statCalculator: makeCalculateStats(historySize),
            }
            return acc
        }, {})
        for (const feature of AudioFeatures) {
            this[feature] = (fft) => {
                const { previousValue = 0, statCalculator, analyzer } = this.state[feature]
                const value = analyzer(fft, previousValue)
                this.state[feature].previousValue = value
                this.state[feature].statCalculator = statCalculator
                this.state[feature].stats = statCalculator(value, previousValue)
                return { value, ...this.state[feature] }
            }
        }
    }
}
export default AudioProcessor
