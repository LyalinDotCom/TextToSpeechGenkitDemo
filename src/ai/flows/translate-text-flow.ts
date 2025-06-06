
'use server';
/**
 * @fileOverview A text translation AI agent.
 *
 * - translateText - A function that handles text translation.
 * - TranslateTextInput - The input type for the translateText function.
 * - TranslateTextOutput - The return type for the translateText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslateTextInputSchema = z.object({
  textToTranslate: z.string().describe('The English text to be translated.'),
  targetLanguageCode: z.string().describe('The BCP-47 code of the target language (e.g., "es-US", "fr-FR").'),
  targetLanguageName: z.string().describe('The name of the target language (e.g., "Spanish (US)", "French (France)").'),
});
export type TranslateTextInput = z.infer<typeof TranslateTextInputSchema>;

const TranslateTextOutputSchema = z.object({
  translatedText: z.string().describe('The translated text.'),
});
export type TranslateTextOutput = z.infer<typeof TranslateTextOutputSchema>;

export async function translateText(input: TranslateTextInput): Promise<TranslateTextOutput> {
  return translateTextFlow(input);
}

const translatePrompt = ai.definePrompt({
  name: 'translateTextPrompt',
  input: {schema: TranslateTextInputSchema},
  output: {schema: TranslateTextOutputSchema},
  prompt: `You are an expert translation assistant. Your task is to translate the provided English text into {{targetLanguageName}} ({{targetLanguageCode}}).
  Focus solely on providing an accurate and natural-sounding translation of the input text.
  Do NOT add any extra commentary, explanations, apologies, or conversational filler in your response.
  Output only the translated text itself.

  English text to translate:
  {{{textToTranslate}}}
  `,
  config: {
    temperature: 0.3, // Lower temperature for more deterministic translation
  }
});

const translateTextFlow = ai.defineFlow(
  {
    name: 'translateTextFlow',
    inputSchema: TranslateTextInputSchema,
    outputSchema: TranslateTextOutputSchema,
  },
  async (input: TranslateTextInput) => {
    const {output} = await translatePrompt(input);
    if (!output) {
      throw new Error('Translation prompt failed to return an output.');
    }
    return output;
  }
);
