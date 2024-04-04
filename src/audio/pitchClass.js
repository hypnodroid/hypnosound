export default function pitchClass(fft) {
  // Constants for the FFT processing
  const sampleRate = 44100; // This could vary
  const fftSize = fft.length; // This is an example, adjust based on your FFT setup
  const freqResolution = sampleRate / fftSize;

  // Finding the dominant frequency in the FFT data
  let maxIndex = 0;
  let maxValue = 0;
  for (let i = 0; i < fft.length; i++) {
    if (fft[i] > maxValue) {
      maxValue = fft[i];
      maxIndex = i;
    }
  }
  const dominantFreq = maxIndex * freqResolution;

  // Convert to MIDI note then to pitch class
  const midiNote = 69 + 12 * Math.log2(dominantFreq / 440);
  const pitchClass = midiNote % 12;

  // Normalize to a 0-1 range
  const normalizedPitchClass = pitchClass / 12;

  return normalizedPitchClass;
}
