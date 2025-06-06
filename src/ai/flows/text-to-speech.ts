
'use server';

/**
 * @fileOverview A text-to-speech AI agent that converts PCM audio to WAV.
 *
 * - textToSpeech - A function that handles the text-to-speech process.
 * - TextToSpeechInput - The input type for the textToSpeech function.
 * - TextToSpeechOutput - The return type for the textToSpeech function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { Buffer } from 'buffer';
import { Writer as WavWriter } from 'wav';
import { PassThrough } from 'stream';


const TextToSpeechInputSchema = z.object({
  text: z.string().describe('The text to convert to speech.'),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

const TextToSpeechOutputSchema = z.object({
  audioDataUri: z.string().describe('The audio data URI of the generated speech in WAV format.'),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;

export async function textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechOutput> {
  return textToSpeechFlow(input);
}

const VoiceNameToolInputSchema = z.object({
  text: z.string().describe('The text to be converted to speech.'),
});
type VoiceNameToolInput = z.infer<typeof VoiceNameToolInputSchema>;

const voiceNameToolHandler = async (input: VoiceNameToolInput): Promise<string> => {
  // For now, always return 'Algenib'.  In a real application, this
  // could use an LLM to determine the best voice based on the input text.
  return 'Algenib';
};

const voiceNameTool = ai.defineTool(
  {
    name: 'getVoiceName',
    description: 'Determine the appropriate voice name for text-to-speech generation.',
    inputSchema: VoiceNameToolInputSchema,
    outputSchema: z.string(),
  },
  voiceNameToolHandler
);

async function pcmToWavDataUri(pcmData: Buffer, channels = 1, sampleRate = 24000, bitDepth = 16): Promise<string> {
  return new Promise((resolve, reject) => {
    const wavBufferChunks: Buffer[] = [];
    const passThrough = new PassThrough();

    passThrough.on('data', (chunk) => {
      wavBufferChunks.push(chunk as Buffer);
    });
    passThrough.on('end', () => {
      const wavBuffer = Buffer.concat(wavBufferChunks);
      const wavDataUri = `data:audio/wav;base64,${wavBuffer.toString('base64')}`;
      resolve(wavDataUri);
    });
    passThrough.on('error', (err) => {
      console.error("Error during WAV conversion stream:", err);
      reject(err);
    });

    const writer = new WavWriter({
      channels: channels,
      sampleRate: sampleRate,
      bitDepth: bitDepth,
    });

    writer.on('error', (err) => {
        console.error("Error in WAV Writer:", err);
        // Propagate error to PassThrough, which will reject the promise
        passThrough.emit('error', err);
    });

    writer.pipe(passThrough);
    writer.write(pcmData);
    writer.end();
  });
}


async function generateAndStreamAudio(text: string, voiceName: string): Promise<string> {
  const response = await ai.generate({
    model: 'googleai/gemini-2.5-flash-preview-tts',
    prompt: text,
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName },
        },
      },
    },
  });
  const audioPart = response.media;
  if (!audioPart?.url) {
    throw new Error('Audio generation failed: No media URL in response.');
  }

  const parts = audioPart.url.split(',');
  if (parts.length < 2 || !parts[0].startsWith('data:audio/') || !parts[0].includes(';base64')) {
    // Gemini TTS might return 'data:audio/l16;rate=24000;channels=1;base64,....' or similar
    // We are mostly interested in the base64 part.
     const base64StartIndex = audioPart.url.indexOf(';base64,');
     if (base64StartIndex === -1) {
        throw new Error('Invalid audio data URI format from Genkit: missing ;base64, tag.');
     }
     const base64PcmData = audioPart.url.substring(base64StartIndex + ';base64,'.length);
     const pcmBuffer = Buffer.from(base64PcmData, 'base64');
     // Assuming Gemini TTS outputs 24kHz, 16-bit, mono PCM
     const wavDataUri = await pcmToWavDataUri(pcmBuffer, 1, 24000, 16);
     return wavDataUri;
  }
  // If format was simpler like 'data:audio/mpeg;base64,..."
  const base64PcmData = parts[1];
  const pcmBuffer = Buffer.from(base64PcmData, 'base64');
  // Assuming Gemini TTS outputs 24kHz, 16-bit, mono PCM
  const wavDataUri = await pcmToWavDataUri(pcmBuffer, 1, 24000, 16);
  return wavDataUri;
}

const textToSpeechFlow = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: TextToSpeechOutputSchema,
  },
  async input => {
    const voiceName = await voiceNameTool(input);
    const audioDataUri = await generateAndStreamAudio(input.text, voiceName);
    return {audioDataUri: audioDataUri};
  }
);
