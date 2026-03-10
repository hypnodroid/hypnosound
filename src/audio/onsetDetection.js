export function makeOnsetDetector(options = {}) {
    const {
        historySize = 43,     // ~0.7 seconds at 60fps
        multiplier = 1.5,     // threshold multiplier above mean
        cooldownFrames = 5,   // minimum frames between onsets
    } = options

    const history = []
    let previousFft = null
    let cooldown = 0

    return function detectOnset(fft) {
        // Calculate spectral flux
        if (!previousFft) {
            previousFft = new Float32Array(fft.length)
        }

        let flux = 0
        for (let i = 0; i < fft.length; i++) {
            const diff = fft[i] - previousFft[i]
            if (diff > 0) flux += diff
        }
        previousFft = new Float32Array(fft)

        // Update history
        history.push(flux)
        if (history.length > historySize) history.shift()

        // Calculate adaptive threshold
        const mean = history.reduce((a, b) => a + b, 0) / history.length

        const threshold = mean * multiplier

        // Cooldown logic
        if (cooldown > 0) {
            cooldown--
            return { onset: false, flux, threshold, mean }
        }

        const onset = flux > threshold && history.length >= 3
        if (onset) cooldown = cooldownFrames

        return { onset, flux, threshold, mean }
    }
}

export default function onsetDetection(fft, prevFft) {
    // Simple spectral flux - can be used with the stats infrastructure
    if (!prevFft) return 0
    let flux = 0
    for (let i = 0; i < fft.length; i++) {
        const diff = fft[i] - prevFft[i]
        if (diff > 0) flux += diff
    }
    // Normalize to 0-1 range
    return flux / (255 * fft.length)
}
