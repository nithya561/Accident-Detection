'use server';

/**
 * @fileOverview Accident Analysis AI agent.
 *
 * - analyzeAccident - A function that analyzes sensor data to determine if an accident has occurred.
 * - AccidentAnalysisInput - The input type for the analyzeAccident function.
 * - AccidentAnalysisOutput - The return type for the analyzeAccident function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AccidentAnalysisInputSchema = z.object({
  accelerometerData: z.string().describe('Accelerometer data as a JSON string.'),
  gyroscopeData: z.string().describe('Gyroscope data as a JSON string.'),
  locationData: z.string().optional().describe('Location data as a JSON string, if available.'),
});
export type AccidentAnalysisInput = z.infer<typeof AccidentAnalysisInputSchema>;

const AccidentAnalysisOutputSchema = z.object({
  isAccident: z.boolean().describe('Whether or not an accident has occurred.'),
  confidence: z.number().describe('The confidence level of the accident detection (0-1).'),
  reason: z.string().describe('The reason for the accident determination.'),
});
export type AccidentAnalysisOutput = z.infer<typeof AccidentAnalysisOutputSchema>;

export async function analyzeAccident(input: AccidentAnalysisInput): Promise<AccidentAnalysisOutput> {
  return analyzeAccidentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'accidentAnalysisPrompt',
  input: {schema: AccidentAnalysisInputSchema},
  output: {schema: AccidentAnalysisOutputSchema},
  prompt: `You are an expert in analyzing sensor data to detect car accidents.

  You will receive accelerometer and gyroscope data, and optionally location data.
  Your task is to determine whether an accident has occurred based on this data.

  Consider the magnitude and sudden changes in accelerometer and gyroscope readings.
  If available, use location data to cross-validate the accident (e.g., sudden stop).

  Output a boolean value indicating whether an accident occurred, a confidence level (0-1), and a reason for your determination.

  Accelerometer Data: {{{accelerometerData}}}
  Gyroscope Data: {{{gyroscopeData}}}
  Location Data (optional): {{{locationData}}}
  \nOutput in JSON format:
  { 
    "isAccident": true|false,
    "confidence": number (0-1),
    "reason": string
  }
  `,
});

const analyzeAccidentFlow = ai.defineFlow(
  {
    name: 'analyzeAccidentFlow',
    inputSchema: AccidentAnalysisInputSchema,
    outputSchema: AccidentAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
