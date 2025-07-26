'use server';
/**
 * @fileOverview A flow for making a voice call using Twilio.
 * 
 * - makeCall - A function that initiates a voice call.
 * - MakeCallInput - The input type for the makeCall function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import twilio from 'twilio';

const MakeCallInputSchema = z.object({
  to: z.string().describe('The recipient\'s phone number in E.164 format.'),
  from: z.string().describe('The Twilio phone number to use for the call in E.164 format.'),
  message: z.string().describe('The message to be read out during the call.'),
});
export type MakeCallInput = z.infer<typeof MakeCallInputSchema>;

export async function makeCall(input: MakeCallInput): Promise<{ sid: string }> {
  return makeCallFlow(input);
}

const makeCallFlow = ai.defineFlow(
  {
    name: 'makeCallFlow',
    inputSchema: MakeCallInputSchema,
    outputSchema: z.object({ sid: z.string() }),
  },
  async (input) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials are not configured in environment variables.');
    }

    const client = twilio(accountSid, authToken);

    try {
      const call = await client.calls.create({
        twiml: `<Response><Say>${input.message}</Say></Response>`,
        to: input.to,
        from: input.from,
      });
      console.log('Call initiated with SID:', call.sid);
      return { sid: call.sid };
    } catch (error: any) {
      console.error('Failed to make call:', error);
      throw new Error(`Failed to initiate call via Twilio: ${error.message}`);
    }
  }
);
