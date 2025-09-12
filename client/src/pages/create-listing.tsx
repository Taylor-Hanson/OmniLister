import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";
import { ObjectUploader } from "@/components/ObjectUploader";
import VoiceRecorder from "@/components/VoiceRecorder";
import AIScanner from "@/components/AIScanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

const listingSchema = z.object({
  title: z.string().min(1, "Title is required").max(80, "Title must be 80 characters or less"),
  description: z.string().min(1, "Description is required").max(1000, "Description must be 1000 characters or less"),
  price: z.string().min(1, "Price is required"),
  condition: z.string().min(1, "Condition is required"),
  category: z.string().min(1, "Category is required"),
  brand: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  material: z.string().optional(),
  quantity: z.string().default("1"),
});

type ListingForm = z.infer<typeof listingSchema>;

const conditions = [
  { value: "new", label: "New with tags" },
  { value: "like new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

const categories = [
  { value: "clothing", label: "Clothing" },
  { value: "shoes", label: "Shoes" },
  { value: "accessories", label: "Accessories" },
  { value: "electronics", label: "Electronics" },
  { value: "home", label: "Home & Garden" },
  { value: "books", label: "Books" },
  { value: "toys", label: "Toys & Games" },
  { value: "sports", label: "Sports & Outdoors" },
  { value: "other", label: "Other" },
];

export default function CreateListing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [isAIMode, setIsAIMode] = useState(false);

  const form = useForm<ListingForm>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: "",
      description: "",
      price: "",
      condition: "",
      category: "",
      brand: "",
      size: "",
      color: "",
      material: "",
      quantity: "1",
    },
  });

  const { data: marketplaces = [] } = useQuery({
    queryKey: ['/api/marketplaces'],
    enabled: !!user,
  });

  const createListingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/listings", data);
      return response.json();
    },
    onSuccess: (listing) => {
      if (selectedMarketplaces.length > 0) {
        postListingMutation.mutate({ listingId: listing.id, marketplaces: selectedMarketplaces });
      } else {
        toast({
          title: "Listing created",
          description: "Your listing has been saved as a draft.",
        });
        form.reset();
        setImages([]);
        queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error creating listing",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const postListingMutation = useMutation({
    mutationFn: async ({ listingId, marketplaces }: { listingId: string; marketplaces: string[] }) => {
      const response = await apiRequest("POST", "/api/jobs/post-listing", { listingId, marketplaces });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Listing posted",
        description: `Your listing is being posted to ${selectedMarketplaces.length} marketplace(s).`,
      });
      form.reset();
      setImages([]);
      setSelectedMarketplaces([]);
      queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error posting listing",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadImagesMutation = useMutation({
    mutationFn: async (imageURLs: string[]) => {
      const response = await apiRequest("PUT", "/api/objects/listing-images", { imageURLs });
      return response.json();
    },
  });

  const onSubmit = async (data: ListingForm) => {
    try {
      let imageURLs = images;
      
      if (images.length > 0) {
        const uploadResult = await uploadImagesMutation.mutateAsync(images);
        imageURLs = uploadResult.objectPaths;
      }

      const listingData = {
        ...data,
        price: parseFloat(data.price).toString(),
        quantity: parseInt(data.quantity),
        images: imageURLs,
      };

      createListingMutation.mutate(listingData);
    } catch (error: any) {
      toast({
        title: "Error processing images",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = (uploadURL: string) => {
    setImages(prev => [...prev, uploadURL]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleMarketplaceToggle = (marketplace: string) => {
    setSelectedMarketplaces(prev => 
      prev.includes(marketplace) 
        ? prev.filter(m => m !== marketplace)
        : [...prev, marketplace]
    );
  };

  const handleAIAnalysis = (analysis: any) => {
    form.setValue("title", analysis.title || "");
    form.setValue("description", analysis.description || "");
    form.setValue("brand", analysis.brand || "");
    form.setValue("category", analysis.category || "");
    form.setValue("condition", analysis.condition || "");
    form.setValue("size", analysis.size || "");
    form.setValue("color", analysis.color || "");
    form.setValue("material", analysis.material || "");
    if (analysis.suggestedPrice > 0) {
      form.setValue("price", analysis.suggestedPrice.toString());
    }
    toast({
      title: "AI Analysis Complete",
      description: "Product details have been filled automatically.",
    });
  };

  const handleVoiceInput = (transcript: any) => {
    if (transcript.title) form.setValue("title", transcript.title);
    if (transcript.description) form.setValue("description", transcript.description);
    if (transcript.brand) form.setValue("brand", transcript.brand);
    if (transcript.category) form.setValue("category", transcript.category);
    if (transcript.condition) form.setValue("condition", transcript.condition);
    if (transcript.size) form.setValue("size", transcript.size);
    if (transcript.color) form.setValue("color", transcript.color);
    if (transcript.suggestedPrice) form.setValue("price", transcript.suggestedPrice.toString());
    
    toast({
      title: "Voice Input Processed",
      description: "Your voice description has been converted to listing details.",
    });
  };

  const connectedMarketplaces = marketplaces.filter((m: any) => m.isConnected);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Create New Listing</h1>
        <p className="text-muted-foreground mt-2">
          Create a product listing and post it to multiple marketplaces
        </p>
      </div>

      <Tabs defaultValue="manual" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manual" data-testid="tab-manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="ai" data-testid="tab-ai">AI Scanner</TabsTrigger>
          <TabsTrigger value="voice" data-testid="tab-voice">Voice Input</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Form */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        data-testid="input-title"
                        {...form.register("title")}
                        placeholder="Enter product title"
                        className={form.formState.errors.title ? "border-destructive" : ""}
                      />
                      {form.formState.errors.title && (
                        <p className="text-destructive text-sm mt-1">{form.formState.errors.title.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        data-testid="textarea-description"
                        {...form.register("description")}
                        placeholder="Describe your product in detail"
                        rows={4}
                        className={form.formState.errors.description ? "border-destructive" : ""}
                      />
                      {form.formState.errors.description && (
                        <p className="text-destructive text-sm mt-1">{form.formState.errors.description.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price">Price ($) *</Label>
                        <Input
                          id="price"
                          data-testid="input-price"
                          type="number"
                          step="0.01"
                          min="0"
                          {...form.register("price")}
                          placeholder="0.00"
                          className={form.formState.errors.price ? "border-destructive" : ""}
                        />
                        {form.formState.errors.price && (
                          <p className="text-destructive text-sm mt-1">{form.formState.errors.price.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          data-testid="input-quantity"
                          type="number"
                          min="1"
                          {...form.register("quantity")}
                          placeholder="1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Condition *</Label>
                        <Select onValueChange={(value) => form.setValue("condition", value)}>
                          <SelectTrigger data-testid="select-condition">
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                          <SelectContent>
                            {conditions.map((condition) => (
                              <SelectItem key={condition.value} value={condition.value}>
                                {condition.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.condition && (
                          <p className="text-destructive text-sm mt-1">{form.formState.errors.condition.message}</p>
                        )}
                      </div>

                      <div>
                        <Label>Category *</Label>
                        <Select onValueChange={(value) => form.setValue("category", value)}>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.category && (
                          <p className="text-destructive text-sm mt-1">{form.formState.errors.category.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="brand">Brand</Label>
                        <Input
                          id="brand"
                          data-testid="input-brand"
                          {...form.register("brand")}
                          placeholder="Enter brand name"
                        />
                      </div>

                      <div>
                        <Label htmlFor="size">Size</Label>
                        <Input
                          id="size"
                          data-testid="input-size"
                          {...form.register("size")}
                          placeholder="Enter size"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="color">Color</Label>
                        <Input
                          id="color"
                          data-testid="input-color"
                          {...form.register("color")}
                          placeholder="Enter color"
                        />
                      </div>

                      <div>
                        <Label htmlFor="material">Material</Label>
                        <Input
                          id="material"
                          data-testid="input-material"
                          {...form.register("material")}
                          placeholder="Enter material"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Product Images</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <ObjectUploader
                        maxNumberOfFiles={10}
                        maxFileSize={10485760}
                        onGetUploadParameters={async () => {
                          const response = await apiRequest("POST", "/api/objects/upload");
                          const data = await response.json();
                          return {
                            method: "PUT" as const,
                            url: data.uploadURL,
                          };
                        }}
                        onComplete={(result) => {
                          if (result.successful && result.successful.length > 0) {
                            const uploadURL = result.successful[0].uploadURL;
                            handleImageUpload(uploadURL);
                          }
                        }}
                        buttonClassName="w-full h-32 border-2 border-dashed border-border hover:border-primary transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <i className="fas fa-cloud-upload-alt text-2xl mb-2"></i>
                          <span>Click to upload images</span>
                          <span className="text-xs">Up to 10 images, max 10MB each</span>
                        </div>
                      </ObjectUploader>

                      {images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {images.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={image}
                                alt={`Product ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-border"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                data-testid={`button-remove-image-${index}`}
                              >
                                <i className="fas fa-times text-xs"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Select Marketplaces</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {connectedMarketplaces.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          <p className="text-sm">No marketplaces connected</p>
                          <Button variant="outline" size="sm" className="mt-2">
                            Connect Marketplaces
                          </Button>
                        </div>
                      ) : (
                        connectedMarketplaces.map((marketplace: any) => (
                          <div key={marketplace.marketplace} className="flex items-center space-x-3">
                            <Checkbox
                              id={marketplace.marketplace}
                              checked={selectedMarketplaces.includes(marketplace.marketplace)}
                              onCheckedChange={() => handleMarketplaceToggle(marketplace.marketplace)}
                              data-testid={`checkbox-marketplace-${marketplace.marketplace}`}
                            />
                            <Label htmlFor={marketplace.marketplace} className="flex-1 capitalize">
                              {marketplace.marketplace}
                            </Label>
                          </div>
                        ))
                      )}
                    </div>

                    {selectedMarketplaces.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm font-medium mb-2">Selected:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedMarketplaces.map((marketplace) => (
                            <Badge key={marketplace} variant="secondary" className="capitalize">
                              {marketplace}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createListingMutation.isPending || postListingMutation.isPending}
                        data-testid="button-save-draft"
                      >
                        {createListingMutation.isPending || postListingMutation.isPending ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            {selectedMarketplaces.length > 0 ? "Posting..." : "Saving..."}
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save mr-2"></i>
                            {selectedMarketplaces.length > 0 ? "Post to Marketplaces" : "Save as Draft"}
                          </>
                        )}
                      </Button>

                      <Separator />

                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>• Drafts are saved automatically</p>
                        <p>• Select marketplaces to post immediately</p>
                        <p>• You can edit and post drafts later</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <AIScanner onAnalysisComplete={handleAIAnalysis} />
        </TabsContent>

        <TabsContent value="voice" className="space-y-6">
          <VoiceRecorder onTranscriptComplete={handleVoiceInput} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
