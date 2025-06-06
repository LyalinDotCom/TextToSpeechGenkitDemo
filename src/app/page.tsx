
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { textToSpeech, TextToSpeechInput } from '@/ai/flows/text-to-speech';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, Pause, Download, Loader2, AlertCircle, Info } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

const availableVoices = [
  { value: 'Algenib', label: 'Algenib -- Gravelly (Default)' },
  { value: 'Zephyr', label: 'Zephyr -- Bright' },
  { value: 'Puck', label: 'Puck -- Upbeat' },
  { value: 'Charon', label: 'Charon -- Informative' },
  { value: 'Kore', label: 'Kore -- Firm' },
  { value: 'Fenrir', label: 'Fenrir -- Excitable' },
  { value: 'Leda', label: 'Leda -- Youthful' },
  { value: 'Orus', label: 'Orus -- Firm' },
  { value: 'Aoede', label: 'Aoede -- Breezy' },
  { value: 'Callirrhoe', label: 'Callirrhoe -- Easy-going' },
  { value: 'Autonoe', label: 'Autonoe -- Bright' },
  { value: 'Enceladus', label: 'Enceladus -- Breathy' },
  { value: 'Iapetus', label: 'Iapetus -- Clear' },
  { value: 'Umbriel', label: 'Umbriel -- Easy-going' },
  { value: 'Algieba', label: 'Algieba -- Smooth' },
  { value: 'Despina', label: 'Despina -- Smooth' },
  { value: 'Erinome', label: 'Erinome -- Clear' },
  { value: 'Rasalgethi', label: 'Rasalgethi -- Informative' },
  { value: 'Laomedeia', label: 'Laomedeia -- Upbeat' },
  { value: 'Achernar', label: 'Achernar -- Soft' },
  { value: 'Alnilam', label: 'Alnilam -- Firm' },
  { value: 'Schedar', label: 'Schedar -- Even' },
  { value: 'Gacrux', label: 'Gacrux -- Mature' },
  { value: 'Pulcherrima', label: 'Pulcherrima -- Forward' },
  { value: 'Achird', label: 'Achird -- Friendly' },
  { value: 'Zubenelgenubi', label: 'Zubenelgenubi -- Casual' },
  { value: 'Vindemiatrix', label: 'Vindemiatrix -- Gentle' },
  { value: 'Sadachbia', label: 'Sadachbia -- Lively' },
  { value: 'Sadaltager', label: 'Sadaltager -- Knowledgeable' },
  { value: 'Sulafat', label: 'Sulafat -- Warm' },
];

const supportedLanguages = [
  { name: 'Arabic (Egyptian)', code: 'ar-EG' }, { name: 'German (Germany)', code: 'de-DE' },
  { name: 'English (US)', code: 'en-US' }, { name: 'Spanish (US)', code: 'es-US' },
  { name: 'French (France)', code: 'fr-FR' }, { name: 'Hindi (India)', code: 'hi-IN' },
  { name: 'Indonesian (Indonesia)', code: 'id-ID' }, { name: 'Italian (Italy)', code: 'it-IT' },
  { name: 'Japanese (Japan)', code: 'ja-JP' }, { name: 'Korean (Korea)', code: 'ko-KR' },
  { name: 'Portuguese (Brazil)', code: 'pt-BR' }, { name: 'Russian (Russia)', code: 'ru-RU' },
  { name: 'Dutch (Netherlands)', code: 'nl-NL' }, { name: 'Polish (Poland)', code: 'pl-PL' },
  { name: 'Thai (Thailand)', code: 'th-TH' }, { name: 'Turkish (Turkey)', code: 'tr-TR' },
  { name: 'Vietnamese (Vietnam)', code: 'vi-VN' }, { name: 'Romanian (Romania)', code: 'ro-RO' },
  { name: 'Ukrainian (Ukraine)', code: 'uk-UA' }, { name: 'Bengali (Bangladesh)', code: 'bn-BD' },
  { name: 'English (India)', code: 'en-IN & hi-IN bundle' }, { name: 'Marathi (India)', code: 'mr-IN' },
  { name: 'Tamil (India)', code: 'ta-IN' }, { name: 'Telugu (India)', code: 'te-IN' },
];


export default function VocalizePage() {
  const [text, setText] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>('Algenib');
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [generatedForText, setGeneratedForText] = useState<string | null>(null);
  const [generatedForVoice, setGeneratedForVoice] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
  };

  const handleVoiceChange = (value: string) => {
    setSelectedVoice(value);
  };

  const handlePrimaryAction = async () => {
    if (!text.trim()) {
      setError("Please enter some text to generate speech.");
      toast({
        variant: "destructive",
        title: "Input Required",
        description: "Please enter some text.",
      });
      return;
    }

    const needsGeneration = !audioSrc || text !== generatedForText || selectedVoice !== generatedForVoice;

    if (needsGeneration) {
      setIsLoading(true);
      setError(null);
      setIsPlaying(false); 

      try {
        const input: TextToSpeechInput = { text, voiceName: selectedVoice };
        const result = await textToSpeech(input);
        if (result.audioDataUri) {
          setAudioSrc(result.audioDataUri);
          setGeneratedForText(text);
          setGeneratedForVoice(selectedVoice);
          
          toast({
            title: "Speech Generated",
            description: "Audio is ready and will play shortly.",
          });
          
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.play().catch(playError => {
                console.error("Error auto-playing generated audio:", playError);
                setError("Could not automatically play audio. Click Play to try again.");
                toast({ variant: "destructive", title: "Playback Error", description: "Could not auto-play audio." });
              });
            }
          }, 100); 
        } else {
          throw new Error("Audio generation failed to return data.");
        }
      } catch (err) {
        console.error("Error generating speech:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(`Failed to generate speech: ${errorMessage}`);
        toast({
          variant: "destructive",
          title: "Generation Error",
          description: `Failed to generate speech: ${errorMessage}`,
        });
        setAudioSrc(null);
        setGeneratedForText(null);
        setGeneratedForVoice(null);
      } finally {
        setIsLoading(false);
      }
    } else if (audioRef.current) { 
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(playError => {
          console.error("Error playing audio:", playError);
          setError("Could not play audio. Please try generating again or check console.");
           toast({
            variant: "destructive",
            title: "Playback Error",
            description: "Could not play the audio.",
          });
        });
      }
    }
  };
  
  const handleDownload = () => {
    if (audioSrc) {
      const link = document.createElement('a');
      link.href = audioSrc;
      
      let extension = 'wav'; 
      try {
        const mimeTypeMatch = audioSrc.match(/data:(audio\/.*?);/);
        if (mimeTypeMatch && mimeTypeMatch[1]) {
          const mimeType = mimeTypeMatch[1];
          if (mimeType === 'audio/wav' || mimeType === 'audio/x-wav') extension = 'wav';
          else if (mimeType === 'audio/mpeg') extension = 'mp3';
        }
      } catch (e) {
        console.warn("Could not determine audio MIME type, defaulting to .wav");
      }
      
      link.download = `vocalize_speech_${Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "Download Started",
        description: `Speech audio is downloading as ${link.download}.`,
      });
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleEnded = () => setIsPlaying(false);

      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);
      
      return () => {
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [audioSrc]); 


  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen font-body">
      <header className="mb-8 md:mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary">Vocalize</h1>
        <p className="text-lg text-muted-foreground mt-2">Turn your text into speech effortlessly.</p>
      </header>

      <Card className="w-full max-w-2xl shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-center">Create Your Audio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <Label htmlFor="voice-select" className="block text-sm font-medium text-foreground mb-1">
                Choose a voice
              </Label>
              <Select onValueChange={handleVoiceChange} defaultValue={selectedVoice}>
                <SelectTrigger id="voice-select" className="w-full rounded-md shadow-sm">
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {availableVoices.map((voice) => (
                    <SelectItem key={voice.value} value={voice.value}>
                      {voice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center mb-1">
                <Label htmlFor="text-input" className="block text-sm font-medium text-foreground">
                  Enter your text
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="ml-2 h-5 w-5 p-0">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md" side="top">
                      <p className="font-semibold mb-2 text-base">Supported Languages (auto-detected):</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        {supportedLanguages.map(lang => (
                          <div key={lang.code}>
                            <span className="font-medium">{lang.name}</span> ({lang.code})
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Textarea
                id="text-input"
                value={text}
                onChange={handleTextChange}
                placeholder="Type or paste your text here..."
                rows={6}
                className="w-full rounded-md shadow-sm focus:ring-primary focus:border-primary"
                aria-label="Text to convert to speech"
              />
            </div>
           
          </div>

          {error && (
            <Alert variant="destructive" className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mt-8 pt-6 border-t border-border">
             <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
                {audioSrc && text === generatedForText && selectedVoice === generatedForVoice ? "Audio Controls" : "Generate & Play"}
            </h3>
            <audio ref={audioRef} src={audioSrc} className="hidden" />
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Button
                onClick={handlePrimaryAction}
                disabled={isLoading || !text.trim()}
                className="w-full sm:w-auto flex items-center justify-center text-base py-3 rounded-md min-w-[150px]"
                aria-label={isLoading ? "Generating speech" : (isPlaying ? "Pause audio" : "Play audio")}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : isPlaying ? (
                  <>
                    <Pause className="mr-2 h-5 w-5" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5" /> Play
                  </>
                )}
              </Button>
              <Button
                onClick={handleDownload}
                variant="outline"
                disabled={!audioSrc || isLoading}
                className="w-full sm:w-auto flex items-center justify-center text-base py-3 rounded-md min-w-[180px]"
                aria-label="Download audio"
              >
                <Download className="mr-2 h-5 w-5" />
                Download Audio
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <footer className="mt-auto pt-8 pb-4 text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} Vocalize. All rights reserved.</p>
      </footer>
    </div>
  );
}

