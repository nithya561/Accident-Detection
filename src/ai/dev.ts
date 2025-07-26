import { config } from 'dotenv';
config();

import '@/ai/flows/accident-analysis.ts';
import '@/ai/flows/send-sms-flow.ts';
import '@/ai/flows/make-call-flow.ts';
