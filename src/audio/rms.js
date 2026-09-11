import normalizeInput from '../utils/normalizeInput.js'

export default function rms(fft) {
    const normalized = normalizeInput(fft)
    let sumOfSquares = 0
    for (let i = 0; i < normalized.length; i++) {
        sumOfSquares += normalized[i] * normalized[i]
    }
    return Math.sqrt(sumOfSquares / normalized.length)
}
