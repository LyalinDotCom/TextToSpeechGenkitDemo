'use server';

/**
 * @fileOverview A text-to-speech AI agent.
 *
 * - textToSpeech - A function that handles the text-to-speech process.
 * - TextToSpeechInput - The input type for the textToSpeech function.
 * - TextToSpeechOutput - The return type for the textToSpeech function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {Readable} from 'stream';
import * as wav from 'wav';

const TextToSpeechInputSchema = z.object({
  text: z.string().describe('The text to convert to speech.'),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

const TextToSpeechOutputSchema = z.object({
  audioDataUri: z.string().describe('The audio data URI of the generated speech.'),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;

export async function textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechOutput> {
  return textToSpeechFlow(input);
}

const voiceNameTool = ai.defineTool({
  name: 'getVoiceName',
  description: 'Determine the appropriate voice name for text-to-speech generation.',
  inputSchema: z.object({
    text: z.string().describe('The text to be converted to speech.'),
  }),
  outputSchema: z.string(),
  async resolve(input: { text: string }) {
    // For now, always return 'Algenib'.  In a real application, this
    // could use an LLM to determine the best voice based on the input text.
    return 'Algenib';
  },
});

const prompt = ai.definePrompt({
  name: 'textToSpeechPrompt',
  tools: [voiceNameTool],
  input: {schema: TextToSpeechInputSchema},
  output: {schema: TextToSpeechOutputSchema},
  prompt: `You are a text-to-speech converter. The user will provide text, and you will convert it to speech.  

  Use the getVoiceName tool to select the voice, and then return the audio data URI.

  Text: {{{text}}}`,
});

async function generateAndStreamAudio(text: string, voiceName: string): Promise<string> {
  const response = await ai.generate({
    model: 'googleai/gemini-2.0-flash',
    prompt: text,
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {voiceName: voiceName},
        },
      },
    },
  });
  const audioPart = response.media;
  if (!audioPart?.url) {
    throw new Error('Audio generation failed: No media URL in response.');
  }
  return audioPart.url;
}

const textToSpeechFlow = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: TextToSpeechOutputSchema,
  },
  async input => {
    const voiceName = await voiceNameTool.resolve(input);
    const audioDataUri = await generateAndStreamAudio(input.text, voiceName);
    return {audioDataUri: audioDataUri};
  }
);
