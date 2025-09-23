import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface VoiceRecorderProps {
  onTranscriptComplete: (transcript: any) => void;
}

export default function VoiceRecorder({ onTranscriptComplete }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const processVoiceMutation = useMutation({
    mutationFn: async (transcript: string) => {
      const response = await apiRequest("POST", "/api/ai/voice-to-listing", { transcript });
      return response.json();
    },
    onSuccess: (data) => {
      onTranscriptComplete(data);
      toast({
        title: "Voice processed",
        description: "Your voice input has been converted to listing details.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Processing failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        
        // For demo purposes, simulate speech recognition
        // In a real implementation, you would use Web Speech API or send audio to a service
        simulateSpeechRecognition();
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Recording failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const simulateSpeechRecognition = () => {
    // Simulate speech recognition for demo purposes
    const demoTranscript = "I have a Nike hoodie, size large, gray color, excellent condition, bought for 80 dollars but willing to sell for 45 dollars";
    setTranscript(demoTranscript);
  };

  const processTranscript = () => {
    if (transcript.trim()) {
      processVoiceMutation.mutate(transcript);
    }
  };

  const clearRecording = () => {
    setAudioURL(null);
    setTranscript("");
    audioChunksRef.current = [];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <i className="fas fa-microphone text-accent mr-2"></i>
            Voice to Listing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <i className="fas fa-info-circle h-4 w-4"></i>
            <AlertDescription>
              Describe your product out loud and our AI will convert it into a structured listing. 
              Include details like brand, condition, size, color, and price.
            </AlertDescription>
          </Alert>

          {/* Recording Controls */}
          <div className="text-center space-y-4">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-accent/20 to-accent/10 rounded-full flex items-center justify-center border-4 border-accent/20">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                isRecording ? 'bg-red-500 animate-pulse' : 'bg-accent'
              }`}>
                <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'} text-white text-2xl`}></i>
              </div>
            </div>

            <div className="space-y-2">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  data-testid="button-start-recording"
                >
                  <i className="fas fa-microphone mr-2"></i>
                  Start Recording
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  data-testid="button-stop-recording"
                >
                  <i className="fas fa-stop mr-2"></i>
                  Stop Recording
                </Button>
              )}

              {audioURL && (
                <div className="space-y-2">
                  <audio controls src={audioURL} className="w-full" />
                  <div className="flex space-x-2 justify-center">
                    <Button
                      variant="outline"
                      onClick={clearRecording}
                      data-testid="button-clear-recording"
                    >
                      <i className="fas fa-trash mr-2"></i>
                      Clear
                    </Button>
                    <Button
                      onClick={startRecording}
                      data-testid="button-record-again"
                    >
                      <i className="fas fa-redo mr-2"></i>
                      Record Again
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {isRecording && (
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center justify-center space-x-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span>Recording... Speak clearly about your product</span>
                </div>
              </div>
            )}
          </div>

          {/* Transcript */}
          {transcript && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Transcript:</h4>
                <div className="p-4 bg-muted rounded-lg border">
                  <p className="text-sm text-foreground">{transcript}</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={processTranscript}
                  disabled={processVoiceMutation.isPending}
                  className="flex-1"
                  data-testid="button-process-transcript"
                >
                  {processVoiceMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-magic mr-2"></i>
                      Convert to Listing
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setTranscript("")}
                  data-testid="button-clear-transcript"
                >
                  <i className="fas fa-times"></i>
                </Button>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2 text-sm">Recording Tips:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Speak clearly and at a normal pace</li>
              <li>• Include brand name, condition, size, and color</li>
              <li>• Mention the price you want to sell for</li>
              <li>• Describe any notable features or flaws</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
