import { makeCalculateStats } from "./src/utils/calculateStats.js";

import energy from "./src/audio/energy.js";
import spectralCentroid from "./src/audio/spectralCentroid.js";
import spectralCrest from "./src/audio/spectralCrest.js";
import spectralEntropy from "./src/audio/spectralEntropy.js";
import spectralFlux from "./src/audio/spectralFlux.js";
import spectralKurtosis from "./src/audio/spectralKurtosis.js";
import spectralRolloff from "./src/audio/spectralRolloff.js";
import spectralRoughness from "./src/audio/spectralRoughness.js";
import spectralSkew from "./src/audio/spectralSkew.js";
import spectralSpread from "./src/audio/spectralSpread.js";

class AudioProcessor {
  constructor() {
    this.statCalculators = {};
    this.previousValue = {};
    this.analyzers = {};

    this.statCalculators.energy = makeCalculateStats();
    this.previousValue.energy = 0;

    this.statCalculators.spectralCentroid = makeCalculateStats();
    this.previousValue.spectralCentroid = 0;

    this.statCalculators.spectralCrest = makeCalculateStats();
    this.previousValue.spectralCrest = 0;

    this.statCalculators.spectralEntropy = makeCalculateStats();
    this.previousValue.spectralEntropy = 0;

    this.statCalculators.spectralFlux = makeCalculateStats();
    this.previousValue.spectralFlux = null;

    this.statCalculators.spectralKurtosis = makeCalculateStats();
    this.previousValue.spectralKurtosis = 0;

    this.statCalculators.spectralRolloff = makeCalculateStats();
    this.previousValue.spectralRolloff = 0;

    this.statCalculators.spectralSkew = makeCalculateStats();
    this.previousValue.spectralSkew = 0;

    this.statCalculators.spectralRoughness = makeCalculateStats();
    this.previousValue.spectralRoughness = 0;

    this.statCalculators.spectralSpread = makeCalculateStats();
    this.previousValue.spectralSpread = 0;
  }

  energy = (fft) => {
    const { value, stats } = energy(this.previousValue.energy, this.statCalculators.energy, fft);
    this.previousValue.energy = value;
    return { value, stats };
  };

  spectralCentroid = (fft) => {
    const { value, stats } = spectralCentroid(this.previousValue.spectralCentroid, this.statCalculators.spectralCentroid, fft);
    this.previousValue.spectralCentroid = value;
    return { value, stats };
  };

  spectralCrest = (fft) => {
    const { value, stats } = spectralCrest(this.previousValue.spectralCrest, this.statCalculators.spectralCrest, fft);
    this.previousValue.spectralCrest = value;
    return { value, stats };
  };

  spectralEntropy = (fft) => {
    const { value, stats } = spectralEntropy(this.previousValue.spectralEntropy, this.statCalculators.spectralEntropy, fft);
    this.previousValue.spectralEntropy = value;
    return { value, stats };
  };

  spectralFlux = (fft) => {
    const { value, stats } = spectralFlux(this.previousValue.spectralFlux, this.statCalculators.spectralFlux, fft);
    this.previousValue.spectralFlux = new Uint8Array(fft);
    return { value, stats };
  };
  spectralKurtosis = (fft) => {
    const { value, stats } = spectralKurtosis(this.previousValue.spectralKurtosis, this.statCalculators.spectralKurtosis, fft);
    this.previousValue.spectralKurtosis = value;
    return { value, stats };
  };

  spectralRolloff = (fft) => {
    const { value, stats } = spectralRolloff(this.previousValue.spectralRolloff, this.statCalculators.spectralRolloff, fft);
    this.previousValue.spectralRolloff = value;
    return { value, stats };
  };

  spectralRoughness = (fft) => {
    const { value, stats } = spectralRoughness(this.previousValue.spectralRoughness, this.statCalculators.spectralRoughness, fft);
    this.previousValue.spectralRoughness = value;
    return { value, stats };
  };

  spectralSkew = (fft) => {
    const { value, stats } = spectralSkew(this.previousValue.spectralSkew, this.statCalculators.spectralSkew, fft);
    this.previousValue.spectralSkew = value;
    return { value, stats };
  };

  spectralSpread = (fft) => {
    const { value, stats } = spectralSpread(this.previousValue.spectralSpread, this.statCalculators.spectralSpread, fft);
    this.previousValue.spectralSpread = value;
    return { value, stats };
  };
}
export default AudioProcessor;
