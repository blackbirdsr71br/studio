import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1', // Force stable v1 API
    }),
  ],
  model: 'googleai/gemini-1.5-flash', // Set a stable, known-good model
});
