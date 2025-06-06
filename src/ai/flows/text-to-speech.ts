
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

// Helper to escape XML special characters for SSML
function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

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
    text: z.string().describe('The text to convert to speech, potentially with Speaker1: and Speaker2: tags.'),
    voiceName1: z.string().describe('The voice name for Speaker1 or the primary voice.'),
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
  return 'Algenib';
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
    // Basic parsing for Speaker1: and Speaker2:
    // This is a simplified parser. Assumes "Speaker1: ... Speaker2: ..." or just "Speaker1: ..." or plain text.
    let ssmlText = '';
    const speaker1Regex = /Speaker1:\s*(.*?)(?=\s*Speaker2:|$)/is;
    const speaker2Regex = /Speaker2:\s*(.*)/is;

    const speaker1Match = text.match(speaker1Regex);
    const speaker2Match = text.match(speaker2Regex);

    const speaker1Content = speaker1Match ? speaker1Match[1].trim() : null;
    const speaker2Content = speaker2Match ? speaker2Match[1].trim() : null;

    const ssmlParts = [];
    if (speaker1Content) {
        ssmlParts.push(`<voice name="${voiceName1}">${escapeXml(speaker1Content)}</voice>`);
    }
    if (speaker2Content) {
        ssmlParts.push(`<voice name="${voiceName2}">${escapeXml(speaker2Content)}</voice>`);
    }

    if (ssmlParts.length > 0) {
        ssmlText = `<speak>${ssmlParts.join(' ')}</speak>`;
    } else {
        // Fallback: if no speaker tags, use voiceName1 for the whole text.
        ssmlText = `<speak><voice name="${voiceName1}">${escapeXml(text)}</voice></speak>`;
    }

    const response = await ai.generate({
        model: 'googleai/gemini-2.5-flash-preview-tts',
        prompt: ssmlText,
        config: {
            responseModalities: ['AUDIO'],
            speechConfig: { // Provide a default voice config; SSML should override per segment
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName1 },
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
      // If no voice is provided, use the tool to determine one (e.g., default 'Algenib')
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
        outputSchema: TextToSpeechOutputSchema, // Reuses the same output schema
    },
    async (input: MultiSpeakerTextToSpeechInput) => {
        const audioDataUri = await generateAndStreamMultiSpeakerAudio(input.text, input.voiceName1, input.voiceName2);
        return { audioDataUri: audioDataUri };
    }
);
    

    