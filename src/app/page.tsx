
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { textToSpeech, TextToSpeechInput, multiSpeakerTextToSpeech, MultiSpeakerTextToSpeechInput } from '@/ai/flows/text-to-speech';
import { translateText, TranslateTextInput } from '@/ai/flows/translate-text-flow';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, Pause, Download, Loader2, AlertCircle, Info, Languages, Users } from 'lucide-react';
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
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Single speaker state
  const [selectedVoice, setSelectedVoice] = useState<string>(availableVoices[0].value); // Default for single speaker
  
  // Multi-speaker state
  const [enableMultiSpeaker, setEnableMultiSpeaker] = useState<boolean>(false);
  const [selectedVoice1, setSelectedVoice1] = useState<string>(availableVoices[0].value);
  const [selectedVoice2, setSelectedVoice2] = useState<string>(availableVoices.length > 1 ? availableVoices[1].value : availableVoices[0].value);

  // State to track what the current audio was generated for
  const [generatedForText, setGeneratedForText] = useState<string | null>(null);
  const [generatedForVoice, setGeneratedForVoice] = useState<string | null>(null); // For single speaker mode
  const [generatedForVoice1, setGeneratedForVoice1] = useState<string | null>(null); // For multi-speaker mode
  const [generatedForVoice2, setGeneratedForVoice2] = useState<string | null>(null); // For multi-speaker mode
  const [generatedForMultiSpeakerMode, setGeneratedForMultiSpeakerMode] = useState<boolean | null>(null);
  
  const [generatedForOriginalText, setGeneratedForOriginalText] = useState<string | null>(null);
  const [generatedForTargetLanguage, setGeneratedForTargetLanguage] = useState<string | null>(null);

  const [enableTranslation, setEnableTranslation] = useState<boolean>(false);
  const [selectedTargetLanguage, setSelectedTargetLanguage] = useState<string>('es-US');

  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
  };

  // Voice change handlers
  const handleSingleVoiceChange = (value: string) => setSelectedVoice(value);
  const handleVoice1Change = (value: string) => setSelectedVoice1(value);
  const handleVoice2Change = (value: string) => setSelectedVoice2(value);
  
  const handleTargetLanguageChange = (value: string) => setSelectedTargetLanguage(value);
  const handleEnableMultiSpeakerChange = (checked: boolean) => {
    setEnableMultiSpeaker(checked);
    // Reset generated audio state when switching modes, as settings are incompatible
    setAudioSrc(null);
    setGeneratedForText(null);
    setGeneratedForVoice(null);
    setGeneratedForVoice1(null);
    setGeneratedForVoice2(null);
    setGeneratedForMultiSpeakerMode(null);
  };


  const handlePrimaryAction = async () => {
    if (!text.trim()) {
      setError("Please enter some text.");
      toast({ variant: "destructive", title: "Input Required", description: "Please enter some text." });
      return;
    }

    setError(null);
    setIsPlaying(false); // Stop current playback if any

    let needsGeneration = false;
    if (enableMultiSpeaker) {
        needsGeneration = !audioSrc ||
            text !== generatedForText ||
            selectedVoice1 !== generatedForVoice1 ||
            selectedVoice2 !== generatedForVoice2 ||
            enableMultiSpeaker !== generatedForMultiSpeakerMode ||
            (enableTranslation && (text !== generatedForOriginalText || selectedTargetLanguage !== generatedForTargetLanguage));

    } else { // Single speaker mode
        needsGeneration = !audioSrc ||
            text !== generatedForText ||
            selectedVoice !== generatedForVoice ||
            enableMultiSpeaker !== generatedForMultiSpeakerMode ||
            (enableTranslation && (text !== generatedForOriginalText || selectedTargetLanguage !== generatedForTargetLanguage));
    }
    
    if (audioRef.current && audioSrc && !needsGeneration) {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(playError => {
                console.error("Error playing audio:", playError);
                setError("Could not play audio. Please try generating again.");
                toast({ variant: "destructive", title: "Playback Error", description: "Could not play the audio." });
            });
        }
        return;
    }

    setIsLoading(true);
    let textToSpeak = text;

    try {
      if (enableTranslation) {
        toast({ title: "Translating Text", description: "Please wait..." });
        const targetLangObj = supportedLanguages.find(lang => lang.code === selectedTargetLanguage);
        if (!targetLangObj) throw new Error("Selected target language not found.");
        const translationInput: TranslateTextInput = { textToTranslate: text, targetLanguageCode: selectedTargetLanguage, targetLanguageName: targetLangObj.name };
        const translationResult = await translateText(translationInput);
        textToSpeak = translationResult.translatedText;
        toast({ title: "Translation Complete", description: "Now generating speech." });
      }

      let ttsResult: TextToSpeechOutput;
      if (enableMultiSpeaker) {
        const msInput: MultiSpeakerTextToSpeechInput = { text: textToSpeak, voiceName1: selectedVoice1, voiceName2: selectedVoice2 };
        ttsResult = await multiSpeakerTextToSpeech(msInput);
      } else {
        const ttsInput: TextToSpeechInput = { text: textToSpeak, voiceName: selectedVoice };
        ttsResult = await textToSpeech(ttsInput);
      }

      if (ttsResult.audioDataUri) {
        setAudioSrc(ttsResult.audioDataUri);
        setGeneratedForText(textToSpeak); // This is the text that was actually vocalized
        setGeneratedForMultiSpeakerMode(enableMultiSpeaker);
        if (enableMultiSpeaker) {
            setGeneratedForVoice1(selectedVoice1);
            setGeneratedForVoice2(selectedVoice2);
            setGeneratedForVoice(null); // Clear single voice tracking
        } else {
            setGeneratedForVoice(selectedVoice);
            setGeneratedForVoice1(null); // Clear multi-voice tracking
            setGeneratedForVoice2(null);
        }
        
        if (enableTranslation) {
          setGeneratedForOriginalText(text);
          setGeneratedForTargetLanguage(selectedTargetLanguage);
        } else {
          setGeneratedForOriginalText(null);
          setGeneratedForTargetLanguage(null);
        }
        
        toast({ title: "Speech Generated", description: "Audio is ready and will play shortly." });
        
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
      console.error("Error in primary action:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Operation failed: ${errorMessage}`);
      toast({ variant: "destructive", title: "Operation Error", description: `Failed: ${errorMessage}` });
      setAudioSrc(null); 
      setGeneratedForText(null);
      setGeneratedForVoice(null);
      setGeneratedForVoice1(null);
      setGeneratedForVoice2(null);
      setGeneratedForMultiSpeakerMode(null);
      setGeneratedForOriginalText(null);
      setGeneratedForTargetLanguage(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDownload = () => {
    if (audioSrc) {
      const link = document.createElement('a');
      link.href = audioSrc;
      let extension = 'wav'; // default
      try {
        const mimeTypeMatch = audioSrc.match(/data:(audio\/.*?);/);
        if (mimeTypeMatch && mimeTypeMatch[1]) {
          const mimeType = mimeTypeMatch[1];
          if (mimeType === 'audio/wav' || mimeType === 'audio/x-wav') extension = 'wav';
          else if (mimeType === 'audio/mpeg') extension = 'mp3';
        }
      } catch (e) { console.warn("Could not determine audio MIME type, defaulting to .wav"); }
      link.download = `vocalize_speech_${Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Download Started", description: `Speech audio is downloading as ${link.download}.`});
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

  // Determine if current audio matches all relevant settings
  const isAudioCurrent = () => {
    if (!audioSrc) return false;
    if (enableTranslation && (text !== generatedForOriginalText || selectedTargetLanguage !== generatedForTargetLanguage)) return false;
    if (enableMultiSpeaker) {
        return text === generatedForText && 
               selectedVoice1 === generatedForVoice1 && 
               selectedVoice2 === generatedForVoice2 &&
               enableMultiSpeaker === generatedForMultiSpeakerMode;
    }
    return text === generatedForText && 
           selectedVoice === generatedForVoice &&
           enableMultiSpeaker === generatedForMultiSpeakerMode;
  };

  const playButtonText = () => {
    const current = isAudioCurrent();
    if (isPlaying) return "Pause";
    if (current) return "Play"; // Audio exists for current settings and is paused
    return "Generate & Play"; // Needs generation or settings changed
  };


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
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="enable-multispeaker"
                    checked={enableMultiSpeaker}
                    onCheckedChange={(checked) => handleEnableMultiSpeakerChange(Boolean(checked))}
                />
                <Label htmlFor="enable-multispeaker" className="text-sm font-medium text-foreground flex items-center">
                    <Users className="mr-2 h-4 w-4" /> Enable Multi-Speaker
                </Label>
            </div>

            {enableMultiSpeaker ? (
              <>
                <div>
                  <Label htmlFor="voice1-select" className="block text-sm font-medium text-foreground mb-1">
                    Choose Voice for Speaker 1
                  </Label>
                  <Select onValueChange={handleVoice1Change} defaultValue={selectedVoice1}>
                    <SelectTrigger id="voice1-select" className="w-full rounded-md shadow-sm">
                      <SelectValue placeholder="Select Speaker 1 voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVoices.map((voice) => (
                        <SelectItem key={`v1-${voice.value}`} value={voice.value}>
                          {voice.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="voice2-select" className="block text-sm font-medium text-foreground mb-1">
                    Choose Voice for Speaker 2
                  </Label>
                  <Select onValueChange={handleVoice2Change} defaultValue={selectedVoice2}>
                    <SelectTrigger id="voice2-select" className="w-full rounded-md shadow-sm">
                      <SelectValue placeholder="Select Speaker 2 voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVoices.map((voice) => (
                        <SelectItem key={`v2-${voice.value}`} value={voice.value}>
                          {voice.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="voice-select" className="block text-sm font-medium text-foreground mb-1">
                  Choose a voice
                </Label>
                <Select onValueChange={handleSingleVoiceChange} defaultValue={selectedVoice}>
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
            )}

            <div className="space-y-2">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="enable-translation"
                        checked={enableTranslation}
                        onCheckedChange={(checked) => setEnableTranslation(Boolean(checked))}
                    />
                    <Label htmlFor="enable-translation" className="text-sm font-medium text-foreground flex items-center">
                       <Languages className="mr-2 h-4 w-4" /> Translate English text before generating speech
                    </Label>
                </div>
                {enableTranslation && (
                    <div>
                        <Label htmlFor="target-language-select" className="block text-sm font-medium text-foreground mb-1">
                            Target Language for Translation
                        </Label>
                        <Select onValueChange={handleTargetLanguageChange} defaultValue={selectedTargetLanguage}>
                            <SelectTrigger id="target-language-select" className="w-full rounded-md shadow-sm">
                                <SelectValue placeholder="Select target language" />
                            </SelectTrigger>
                            <SelectContent>
                            {supportedLanguages.filter(lang => lang.code !== 'en-US' && lang.code !== 'en-IN & hi-IN bundle').map((lang) => (
                                <SelectItem key={lang.code} value={lang.code}>
                                    {lang.name} ({lang.code})
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            <div>
              <div className="flex items-center mb-1">
                <Label htmlFor="text-input" className="block text-sm font-medium text-foreground">
                  {enableTranslation ? "Enter English text to translate & vocalize" : "Enter your text"}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="ml-2 h-5 w-5 p-0">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md" side="top">
                      <p className="font-semibold mb-2 text-base">Supported Languages for TTS (auto-detected):</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        {supportedLanguages.map(lang => (<div key={lang.code}><span className="font-medium">{lang.name}</span> ({lang.code})</div>))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Textarea
                id="text-input"
                value={text}
                onChange={handleTextChange}
                placeholder={enableTranslation ? "Type English text here..." : "Type or paste your text here..."}
                rows={6}
                className="w-full rounded-md shadow-sm focus:ring-primary focus:border-primary"
                aria-label="Text to convert to speech"
              />
              {enableMultiSpeaker && (
                <p className="mt-2 text-xs text-muted-foreground">
                  For multi-speaker, use format: <code className="bg-muted px-1 py-0.5 rounded">Speaker1: Their line. Speaker2: Their line.</code> Fixed tags 'Speaker1' and 'Speaker2' will be mapped to selected voices.
                </p>
              )}
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
                {isAudioCurrent() ? "Audio Controls" : "Generate & Play"}
            </h3>
            <audio ref={audioRef} src={audioSrc ?? undefined} className="hidden" />
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Button
                onClick={handlePrimaryAction}
                disabled={isLoading || !text.trim()}
                className="w-full sm:w-auto flex items-center justify-center text-base py-3 rounded-md min-w-[180px]"
                aria-label={isLoading ? "Processing..." : playButtonText()}
              >
                {isLoading ? (
                  <> <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing... </>
                ) : isPlaying ? (
                  <> <Pause className="mr-2 h-5 w-5" /> Pause </>
                ) : (
                  <> <Play className="mr-2 h-5 w-5" /> {playButtonText()} </>
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

    