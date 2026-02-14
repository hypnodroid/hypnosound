/**
 * Detects the input type and normalizes FFT data to a Float32Array of values in [0, 1].
 *
 * - Uint8Array (from getByteFrequencyData): values 0-255, divided by 255
 * - Float32Array (from getFloatFrequencyData): dB values (typically -100 to 0),
 *   converted to linear magnitude via Math.pow(10, dB / 20), clamped to [0, 1]
 * - Regular Array / other typed arrays: treated as Uint8Array-style (0-255)
 *
 * @param {Uint8Array|Float32Array|number[]} fft - Raw FFT data
 * @returns {Float32Array} Normalized values in [0, 1]
 */
export default function normalizeInput(fft) {
    const result = new Float32Array(fft.length)

    if (fft instanceof Float32Array) {
        // Assume dB values (typically -100 to 0 from getFloatFrequencyData)
        for (let i = 0; i < fft.length; i++) {
            const linear = Math.pow(10, fft[i] / 20)
            result[i] = Math.min(1, Math.max(0, linear))
        }
    } else {
        // Uint8Array or regular Array: assume 0-255 range
        for (let i = 0; i < fft.length; i++) {
            result[i] = fft[i] / 255
        }
    }

    return result
}
