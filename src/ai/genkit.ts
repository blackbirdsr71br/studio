import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// By leaving the googleAI() plugin configuration empty, we allow Genkit to use
// its default, stable settings for API version and endpoint resolution.
// Model selection will be handled explicitly in each flow to avoid ambiguity.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
});
