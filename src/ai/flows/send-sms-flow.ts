'use server';
/**
 * @fileOverview A flow for sending SMS messages using Twilio.
 * 
 * - sendSms - A function that sends an SMS message.
 * - SendSmsInput - The input type for the sendSms function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import twilio from 'twilio';

const SendSmsInputSchema = z.object({
  to: z.string().describe('The recipient\'s phone number in E.164 format.'),
  from: z.string().describe('The Twilio phone number to use for sending the SMS in E.164 format.'),
  body: z.string().describe('The content of the SMS message.'),
});
export type SendSmsInput = z.infer<typeof SendSmsInputSchema>;

export async function sendSms(input: SendSmsInput): Promise<{ sid: string }> {
  return sendSmsFlow(input);
}

const sendSmsFlow = ai.defineFlow(
  {
    name: 'sendSmsFlow',
    inputSchema: SendSmsInputSchema,
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
      const message = await client.messages.create({
        body: input.body,
        from: input.from,
        to: input.to,
      });
      console.log('Message sent with SID:', message.sid);
      return { sid: message.sid };
    } catch (error) {
      console.error('Failed to send SMS:', error);
      throw new Error('Failed to send SMS via Twilio.');
    }
  }
);
