export default function dbfs(fft) {
    let sumOfSquares = 0
    for (let i = 0; i < fft.length; i++) {
        const normalized = fft[i] / 255
        sumOfSquares += normalized * normalized
    }
    const rmsValue = Math.sqrt(sumOfSquares / fft.length)
    if (rmsValue === 0) return 0
    // 20 * log10(rms) gives dBFS, range is -Infinity to 0
    // Normalize to 0-1: silence = 0, full scale = 1
    // Clamp at -100 dB as practical floor
    const db = 20 * Math.log10(rmsValue)
    return Math.max(0, (db + 100) / 100)
}
