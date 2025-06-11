
import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-ui-improvements.ts';
import '@/ai/flows/generate-compose-code.ts';
import '@/ai/flows/generate-image-from-hint-flow.ts';
import '@/ai/flows/generate-json-from-compose-commands.ts';
import '@/ai/flows/generate-custom-command-json.ts'; // New import

    