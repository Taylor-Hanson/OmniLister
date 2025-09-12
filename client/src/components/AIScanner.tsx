import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface AIScannerProps {
  onAnalysisComplete: (analysis: any) => void;
}

export default function AIScanner({ onAnalysisComplete }: AIScannerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const analyzeImageMutation = useMutation({
    mutationFn: async (base64Image: string) => {
      const response = await apiRequest("POST", "/api/ai/analyze-image", { image: base64Image });
      return response.json();
    },
    onSuccess: (data) => {
      setAnalysis(data);
      onAnalysisComplete(data);
      toast({
        title: "Analysis complete",
        description: "Product details have been identified from your image.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeBackgroundMutation = useMutation({
    mutationFn: async (base64Image: string) => {
      const response = await apiRequest("POST", "/api/ai/remove-background", { image: base64Image });
      return response.json();
    },
    onSuccess: (data) => {
      setSelectedImage(data.image);
      toast({
        title: "Background removed",
        description: "Image background has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Background removal failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        const base64Data = base64.split(',')[1]; // Remove data:image/jpeg;base64, prefix
        setSelectedImage(base64);
        setAnalysis(null);
        
        // Auto-analyze the image
        analyzeImageMutation.mutate(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBackground = () => {
    if (selectedImage) {
      const base64Data = selectedImage.split(',')[1];
      removeBackgroundMutation.mutate(base64Data);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setAnalysis(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <i className="fas fa-camera-retro text-secondary mr-2"></i>
            AI Product Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <i className="fas fa-info-circle h-4 w-4"></i>
            <AlertDescription>
              Upload a clear photo of your product and our AI will automatically identify the brand, 
              condition, category, and suggest an optimal price.
            </AlertDescription>
          </Alert>

          {/* Image Upload */}
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-image-upload"
            />

            {!selectedImage ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-64 border-2 border-dashed border-border hover:border-primary transition-colors rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:text-foreground"
                data-testid="button-upload-image"
              >
                <i className="fas fa-cloud-upload-alt text-4xl mb-4"></i>
                <p className="text-lg font-medium">Click to upload product image</p>
                <p className="text-sm">Supports JPG, PNG, WebP up to 10MB</p>
              </button>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={selectedImage}
                    alt="Product"
                    className="w-full h-64 object-contain bg-muted rounded-lg border"
                  />
                  <button
                    onClick={clearImage}
                    className="absolute top-2 right-2 w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
                    data-testid="button-remove-image"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-change-image"
                  >
                    <i className="fas fa-exchange-alt mr-2"></i>
                    Change Image
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRemoveBackground}
                    disabled={removeBackgroundMutation.isPending}
                    data-testid="button-remove-background"
                  >
                    {removeBackgroundMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Removing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-cut mr-2"></i>
                        Remove Background
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Analysis Loading */}
          {analyzeImageMutation.isPending && (
            <div className="text-center py-8">
              <div className="inline-flex items-center space-x-2 text-secondary">
                <i className="fas fa-brain fa-2x animate-pulse"></i>
                <div>
                  <p className="font-medium">Analyzing product...</p>
                  <p className="text-sm text-muted-foreground">This may take a few seconds</p>
                </div>
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">AI Analysis Results</h4>
                <Badge className={getConfidenceColor(analysis.confidence)}>
                  {Math.round(analysis.confidence * 100)}% Confidence
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-xs font-medium text-muted-foreground">PRODUCT TITLE</label>
                    <p className="font-medium">{analysis.title || 'Not detected'}</p>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-xs font-medium text-muted-foreground">BRAND</label>
                    <p className="font-medium">{analysis.brand || 'Unknown'}</p>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-xs font-medium text-muted-foreground">CATEGORY</label>
                    <p className="font-medium capitalize">{analysis.category || 'Other'}</p>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-xs font-medium text-muted-foreground">CONDITION</label>
                    <p className="font-medium capitalize">{analysis.condition || 'Unknown'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-xs font-medium text-muted-foreground">SUGGESTED PRICE</label>
                    <p className="font-medium text-lg text-accent">
                      ${analysis.suggestedPrice?.toFixed(2) || '0.00'}
                    </p>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-xs font-medium text-muted-foreground">COLOR</label>
                    <p className="font-medium">{analysis.color || 'Not specified'}</p>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-xs font-medium text-muted-foreground">SIZE</label>
                    <p className="font-medium">{analysis.size || 'Not specified'}</p>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-xs font-medium text-muted-foreground">MATERIAL</label>
                    <p className="font-medium">{analysis.material || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {analysis.description && (
                <div className="p-4 bg-muted rounded-lg">
                  <label className="text-xs font-medium text-muted-foreground">AI GENERATED DESCRIPTION</label>
                  <p className="text-sm mt-1">{analysis.description}</p>
                </div>
              )}

              {analysis.tags && analysis.tags.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">SUGGESTED TAGS</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {analysis.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tips */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2 text-sm">Photo Tips for Best Results:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Use good lighting and avoid shadows</li>
              <li>• Show the product clearly with minimal background</li>
              <li>• Include any brand labels or tags if visible</li>
              <li>• Take multiple angles if needed</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
