'use server';

/**
 * @fileOverview Accident Analysis AI agent.
 *
 * - analyzeAccident - A function that analyzes a photo to determine if an accident has occurred.
 * - AccidentAnalysisInput - The input type for the analyzeAccident function.
 * - AccidentAnalysisOutput - The return type for the analyzeAccident function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AccidentAnalysisInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a potential accident scene, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AccidentAnalysisInput = z.infer<typeof AccidentAnalysisInputSchema>;

const AccidentAnalysisOutputSchema = z.object({
  isAccident: z.boolean().describe('Whether or not a car accident is depicted in the photo.'),
  confidence: z.number().describe('The confidence level of the accident detection (0-1).'),
  reason: z.string().describe('The reasoning behind the determination, describing what is seen in the photo.'),
});
export type AccidentAnalysisOutput = z.infer<typeof AccidentAnalysisOutputSchema>;

export async function analyzeAccident(input: AccidentAnalysisInput): Promise<AccidentAnalysisOutput> {
  return analyzeAccidentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'accidentAnalysisPrompt',
  input: {schema: AccidentAnalysisInputSchema},
  output: {schema: AccidentAnalysisOutputSchema},
  prompt: `You are an expert in analyzing images to detect car accidents.

  You will receive a photo. Your task is to determine whether a car accident has occurred based on the visual evidence in the photo.
  
  Look for signs of a crash, such as damaged vehicles, debris on the road, emergency vehicles, or smoke.

  Output a boolean value indicating whether an accident occurred, a confidence level (0-1), and a reason for your determination based on what you see.

  Photo: {{media url=photoDataUri}}

  You MUST output a valid JSON object that conforms to the output schema. Do not include any text outside of the JSON object.
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
    if (!output) {
      throw new Error('AI model did not return a valid response.');
    }
    return output;
  }
);
