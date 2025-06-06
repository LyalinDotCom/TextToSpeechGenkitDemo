"use client";

import React, { useState, useRef, useEffect } from 'react';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Play, Pause, Download, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function VocalizePage() {
  const [text, setText] = useState<string>('');
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!text.trim()) {
      setError("Please enter some text to generate speech.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAudioSrc(null);
    setIsPlaying(false);

    try {
      const result = await textToSpeech({ text });
      if (result.audioDataUri) {
        setAudioSrc(result.audioDataUri);
        toast({
          title: "Speech Generated",
          description: "Your audio is ready to play and download.",
        });
      } else {
        throw new Error("Audio generation failed to return data.");
      }
    } catch (err) {
      console.error("Error generating speech:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to generate speech: ${errorMessage}`);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to generate speech: ${errorMessage}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(playError => {
          console.error("Error playing audio:", playError);
          setError("Could not play audio. Please try generating again.");
           toast({
            variant: "destructive",
            title: "Playback Error",
            description: "Could not play audio. Please try generating again.",
          });
        });
      }
    }
  };

  const handleDownload = () => {
    if (audioSrc) {
      const link = document.createElement('a');
      link.href = audioSrc;
      
      let extension = 'wav'; // Default as requested by user for filename
      try {
        const mimeTypeMatch = audioSrc.match(/data:(audio\/.*?);/);
        if (mimeTypeMatch && mimeTypeMatch[1]) {
          const mimeType = mimeTypeMatch[1];
          if (mimeType === 'audio/wav' || mimeType === 'audio/x-wav') extension = 'wav';
          else if (mimeType === 'audio/mpeg') extension = 'mp3';
          else if (mimeType === 'audio/ogg') extension = 'ogg';
          else if (mimeType === 'audio/webm') extension = 'webm';
          // Add more types if needed, or keep it simple
        }
      } catch (e) {
        console.warn("Could not determine audio MIME type from data URI for extension, defaulting to .wav");
      }
      
      link.download = `vocalize_speech.${extension}`;
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
          <CardTitle className="text-2xl font-headline text-center">Generate Speech</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="text-input" className="block text-sm font-medium text-foreground mb-1">
                Enter your text
              </Label>
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
            <Button
              type="submit"
              disabled={isLoading || !text.trim()}
              className="w-full text-base py-3 rounded-md"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Speech"
              )}
            </Button>
          </form>

          {error && (
            <Alert variant="destructive" className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {audioSrc && (
            <div className="mt-8 pt-6 border-t border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4 text-center">Generated Audio</h3>
              <audio ref={audioRef} src={audioSrc} className="hidden" />
              <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <Button
                  onClick={togglePlayPause}
                  variant="outline"
                  className="w-full sm:w-auto flex items-center justify-center text-base py-3 rounded-md"
                  aria-label={isPlaying ? "Pause audio" : "Play audio"}
                >
                  {isPlaying ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="w-full sm:w-auto flex items-center justify-center text-base py-3 rounded-md"
                  aria-label="Download audio as WAV file"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Download Audio
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <footer className="mt-auto pt-8 pb-4 text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} Vocalize. All rights reserved.</p>
      </footer>
    </div>
  );
}
