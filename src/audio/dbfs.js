import normalizeInput from '../utils/normalizeInput.js'

export default function dbfs(fft) {
    const normalized = normalizeInput(fft)
    let sumOfSquares = 0
    for (let i = 0; i < normalized.length; i++) {
        sumOfSquares += normalized[i] * normalized[i]
    }
    const rmsValue = Math.sqrt(sumOfSquares / normalized.length)
    if (rmsValue === 0) return 0
    // 20 * log10(rms) gives dBFS, range is -Infinity to 0
    // Normalize to 0-1: silence = 0, full scale = 1
    // Clamp at -100 dB as practical floor
    const db = 20 * Math.log10(rmsValue)
    return Math.max(0, (db + 100) / 100)
}
