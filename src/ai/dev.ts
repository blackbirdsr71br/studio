
// IMPORTANT: This line MUST be the first thing executed to ensure env vars are loaded for the server.
import { config } from 'dotenv';
config();

// The rest of your imports that might depend on environment variables can go here.
import '@/ai/flows/generate-compose-code.ts';
import '@/ai/flows/generate-image-from-hint-flow.ts';
import '@/ai/flows/convert-canvas-to-custom-json-flow.ts'; 
import '@/ai/flows/generate-dynamic-ui-component.ts';
    
