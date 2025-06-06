
'use server';

/**
 * @fileOverview A text-to-speech AI agent that converts PCM audio to WAV.
 *
 * - textToSpeech - A function that handles the single-speaker text-to-speech process.
 * - TextToSpeechInput - The input type for the textToSpeech function.
 * - TextToSpeechOutput - The return type for the textToSpeech function.
 * - multiSpeakerTextToSpeech - A function that handles multi-speaker text-to-speech.
 * - MultiSpeakerTextToSpeechInput - The input type for multiSpeakerTextToSpeech.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { Buffer } from 'buffer';
import { Writer as WavWriter } from 'wav';
import { PassThrough } from 'stream';

const TextToSpeechInputSchema = z.object({
  text: z.string().describe('The text to convert to speech.'),
  voiceName: z.string().optional().describe('The voice name to use for speech generation. Defaults to Algenib if not provided.'),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

const TextToSpeechOutputSchema = z.object({
  audioDataUri: z.string().describe('The audio data URI of the generated speech in WAV format.'),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;

export async function textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechOutput> {
  return textToSpeechFlow(input);
}

const MultiSpeakerTextToSpeechInputSchema = z.object({
    text: z.string().describe('The text to convert to speech, formatted with <speaker="Speaker1">...</speaker> and <speaker="Speaker2">...</speaker> tags.'),
    voiceName1: z.string().describe('The voice name for Speaker1.'),
    voiceName2: z.string().describe('The voice name for Speaker2.'),
});
export type MultiSpeakerTextToSpeechInput = z.infer<typeof MultiSpeakerTextToSpeechInputSchema>;

export async function multiSpeakerTextToSpeech(input: MultiSpeakerTextToSpeechInput): Promise<TextToSpeechOutput> {
    return multiSpeakerTextToSpeechFlow(input);
}

const VoiceNameToolInputSchema = z.object({
  text: z.string().describe('The text to be converted to speech.'),
});
type VoiceNameToolInput = z.infer<typeof VoiceNameToolInputSchema>;

const voiceNameToolHandler = async (input: VoiceNameToolInput): Promise<string> => {
  return 'Algenib'; // Default voice
};

const voiceNameTool = ai.defineTool(
  {
    name: 'getVoiceName',
    description: 'Determine the appropriate voice name for text-to-speech generation if no specific voice is requested.',
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

  const base64StartIndex = audioPart.url.indexOf(';base64,');
  if (base64StartIndex === -1) {
      throw new Error('Invalid audio data URI format from Genkit: missing ;base64, tag.');
  }
  const base64PcmData = audioPart.url.substring(base64StartIndex + ';base64,'.length);
  const pcmBuffer = Buffer.from(base64PcmData, 'base64');
  const wavDataUri = await pcmToWavDataUri(pcmBuffer, 1, 24000, 16);
  return wavDataUri;
}

async function generateAndStreamMultiSpeakerAudio(text: string, voiceName1: string, voiceName2: string): Promise<string> {
    // Input 'text' is expected to be in the format:
    // <speaker="Speaker1">Text for speaker 1.</speaker> <speaker="Speaker2">Text for speaker 2.</speaker>
    // The speaker tags "Speaker1" and "Speaker2" in the text will be mapped to voiceName1 and voiceName2.

    const response = await ai.generate({
        model: 'googleai/gemini-2.5-flash-preview-tts',
        prompt: text, // Pass the text directly, expecting speaker tags
        config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        {
                            speaker: 'Speaker1', // This identifier must match the tag in the prompt text
                            voiceConfig: {
                                prebuiltVoiceConfig: { voiceName: voiceName1 },
                            },
                        },
                        {
                            speaker: 'Speaker2', // This identifier must match the tag in the prompt text
                            voiceConfig: {
                                prebuiltVoiceConfig: { voiceName: voiceName2 },
                            },
                        },
                    ],
                },
            },
        },
    });

    const audioPart = response.media;
    if (!audioPart?.url) {
        throw new Error('Multi-speaker audio generation failed: No media URL in response.');
    }
    const base64StartIndex = audioPart.url.indexOf(';base64,');
    if (base64StartIndex === -1) {
        throw new Error('Invalid audio data URI format from Genkit: missing ;base64, tag.');
    }
    const base64PcmData = audioPart.url.substring(base64StartIndex + ';base64,'.length);
    const pcmBuffer = Buffer.from(base64PcmData, 'base64');
    const wavDataUri = await pcmToWavDataUri(pcmBuffer, 1, 24000, 16);
    return wavDataUri;
}

const textToSpeechFlow = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: TextToSpeechOutputSchema,
  },
  async (input: TextToSpeechInput) => {
    let voiceToUse: string;
    if (input.voiceName && input.voiceName.trim() !== '') {
      voiceToUse = input.voiceName;
    } else {
      voiceToUse = await voiceNameTool({ text: input.text });
    }
    const audioDataUri = await generateAndStreamAudio(input.text, voiceToUse);
    return {audioDataUri: audioDataUri};
  }
);

const multiSpeakerTextToSpeechFlow = ai.defineFlow(
    {
        name: 'multiSpeakerTextToSpeechFlow',
        inputSchema: MultiSpeakerTextToSpeechInputSchema,
        outputSchema: TextToSpeechOutputSchema,
    },
    async (input: MultiSpeakerTextToSpeechInput) => {
        const audioDataUri = await generateAndStreamMultiSpeakerAudio(input.text, input.voiceName1, input.voiceName2);
        return { audioDataUri: audioDataUri };
    }
);
