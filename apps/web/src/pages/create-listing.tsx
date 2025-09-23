import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";
import { insertListingSchema, EBAY_CONDITIONS, LISTING_FORMATS, LISTING_DURATIONS } from "@shared/schema";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Minus, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Use the comprehensive shared schema with conditional auction validation
const listingFormSchema = insertListingSchema.refine(
  (data) => {
    if (data.listingFormat === "AUCTION") {
      return data.startPrice !== undefined && data.startPrice > 0;
    }
    return true;
  },
  {
    message: "Starting price is required for auction listings",
    path: ["startPrice"],
  }
);

type ListingForm = z.infer<typeof listingFormSchema>;

// eBay conditions with descriptions
const ebayConditions = Object.values(EBAY_CONDITIONS);
const listingFormats = Object.values(LISTING_FORMATS);
const listingDurations = Object.values(LISTING_DURATIONS);

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
  const [packageUnit, setPackageUnit] = useState<"inches" | "cm">("inches");
  const [selectedCondition, setSelectedCondition] = useState<string>("");

  const form = useForm<ListingForm>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      // Basic Product Information
      title: "",
      description: "",
      subtitle: "",
      listingDescription: "",
      price: "0",
      quantity: 1,
      
      // Enhanced Condition System
      condition: undefined,
      conditionDescription: "",
      conditionId: undefined,
      
      // Product Identification
      gtin: "",
      upc: "",
      ean: "",
      isbn: "",
      mpn: "",
      epid: "",
      
      // Product Details
      category: "",
      brand: "",
      size: "",
      color: "",
      material: "",
      itemSpecifics: [],
      
      // Shipping & Package Information
      packageWeight: undefined,
      packageDimensions: undefined,
      
      // eBay Listing Policies
      fulfillmentPolicyId: "",
      paymentPolicyId: "",
      returnPolicyId: "",
      merchantLocationKey: "",
      
      // Advanced Listing Options
      listingFormat: "FIXED_PRICE",
      listingDuration: "GTC",
      startPrice: undefined,
      reservePrice: undefined,
      buyItNowPrice: undefined,
      
      // Store Categories
      storeCategoryNames: [],
    },
  });

  const { fields: itemSpecificFields, append: appendItemSpecific, remove: removeItemSpecific } = useFieldArray({
    control: form.control,
    name: "itemSpecifics"
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

  const onSubmit = async (data: any) => {
    try {
      let imageURLs = images;
      
      if (images.length > 0) {
        const uploadResult = await uploadImagesMutation.mutateAsync(images);
        imageURLs = uploadResult.objectPaths;
      }

      // Normalize package weight and dimensions to consistent units
      let normalizedData = { ...data };
      
      // Normalize package weight to pounds (lbs)
      if (normalizedData.packageWeight && packageUnit === "cm") {
        // Convert kg to lbs (1 kg = 2.20462 lbs)
        normalizedData.packageWeight = normalizedData.packageWeight * 2.20462;
      }
      
      // Normalize package dimensions to inches
      if (normalizedData.packageDimensions && normalizedData.packageDimensions.unit === "cm") {
        // Convert cm to inches (1 cm = 0.393701 inches)
        const factor = 0.393701;
        normalizedData.packageDimensions = {
          ...normalizedData.packageDimensions,
          length: normalizedData.packageDimensions.length * factor,
          width: normalizedData.packageDimensions.width * factor,
          height: normalizedData.packageDimensions.height * factor,
          unit: "inches"
        };
      }

      const listingData = {
        ...normalizedData,
        price: parseFloat(normalizedData.price) || 0, // Convert string to number
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

  const connectedMarketplaces = (marketplaces as any[]).filter((m: any) => m.isConnected);

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
                      <Label htmlFor="subtitle">Subtitle (Optional)</Label>
                      <Input
                        id="subtitle"
                        data-testid="input-subtitle"
                        {...form.register("subtitle")}
                        placeholder="Optional subtitle (55 chars max)"
                        maxLength={55}
                        className={form.formState.errors.subtitle ? "border-destructive" : ""}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {form.watch("subtitle")?.length || 0}/55 characters
                      </p>
                      {form.formState.errors.subtitle && (
                        <p className="text-destructive text-sm mt-1">{form.formState.errors.subtitle.message}</p>
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
                          {...form.register("quantity", { valueAsNumber: true })}
                          placeholder="1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Condition *</Label>
                        <Select onValueChange={(value: any) => {
                          form.setValue("condition", value);
                          setSelectedCondition(value);
                          // Auto-set condition ID when condition is selected
                          const condition = ebayConditions.find(c => c.value === value);
                          if (condition) {
                            form.setValue("conditionId", condition.id);
                          }
                        }}>
                          <SelectTrigger data-testid="select-condition">
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                          <SelectContent>
                            {ebayConditions.map((condition) => (
                              <SelectItem key={condition.value} value={condition.value}>
                                <div className="flex flex-col">
                                  <span>{condition.label}</span>
                                  <span className="text-xs text-muted-foreground">{condition.description}</span>
                                </div>
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
                        <Select onValueChange={(value: any) => form.setValue("category", value)}>
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

                    {/* Condition Description */}
                    {selectedCondition && (
                      <div>
                        <Label htmlFor="conditionDescription">Condition Description (Optional)</Label>
                        <Textarea
                          id="conditionDescription"
                          data-testid="textarea-condition-description"
                          {...form.register("conditionDescription")}
                          placeholder="Provide additional details about the item's condition..."
                          rows={2}
                          maxLength={1000}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {form.watch("conditionDescription")?.length || 0}/1000 characters
                        </p>
                      </div>
                    )}

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
                            if (uploadURL) {
                              handleImageUpload(uploadURL);
                            }
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

                {/* Enhanced eBay Fields */}
                <Card>
                  <CardHeader>
                    <CardTitle>Enhanced eBay Features</CardTitle>
                    <p className="text-sm text-muted-foreground">Additional eBay-specific fields for better listing optimization</p>
                  </CardHeader>
                  <CardContent>
                    <TooltipProvider>
                      <Accordion type="multiple" className="w-full">
                        {/* Product Identification */}
                        <AccordionItem value="identification">
                          <AccordionTrigger className="text-left">
                            <div className="flex items-center gap-2">
                              <span>Product Identification Codes</span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Product codes help eBay identify your item and improve search visibility. EPID is preferred if available.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="epid">eBay Product ID (EPID) - Preferred</Label>
                                <Input
                                  id="epid"
                                  data-testid="input-epid"
                                  {...form.register("epid")}
                                  placeholder="Enter eBay Product ID"
                                />
                                <p className="text-xs text-muted-foreground mt-1">Most accurate for eBay matching</p>
                              </div>
                              <div>
                                <Label htmlFor="upc">UPC (12 digits)</Label>
                                <Input
                                  id="upc"
                                  data-testid="input-upc"
                                  {...form.register("upc")}
                                  placeholder="123456789012"
                                  maxLength={12}
                                />
                                {form.formState.errors.upc && (
                                  <p className="text-destructive text-sm mt-1">{form.formState.errors.upc.message}</p>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="ean">EAN (13 digits)</Label>
                                <Input
                                  id="ean"
                                  data-testid="input-ean"
                                  {...form.register("ean")}
                                  placeholder="1234567890123"
                                  maxLength={13}
                                />
                                {form.formState.errors.ean && (
                                  <p className="text-destructive text-sm mt-1">{form.formState.errors.ean.message}</p>
                                )}
                              </div>
                              <div>
                                <Label htmlFor="gtin">GTIN (14 digits)</Label>
                                <Input
                                  id="gtin"
                                  data-testid="input-gtin"
                                  {...form.register("gtin")}
                                  placeholder="12345678901234"
                                  maxLength={14}
                                />
                                {form.formState.errors.gtin && (
                                  <p className="text-destructive text-sm mt-1">{form.formState.errors.gtin.message}</p>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="isbn">ISBN (for books)</Label>
                                <Input
                                  id="isbn"
                                  data-testid="input-isbn"
                                  {...form.register("isbn")}
                                  placeholder="9781234567890"
                                />
                                {form.formState.errors.isbn && (
                                  <p className="text-destructive text-sm mt-1">{form.formState.errors.isbn.message}</p>
                                )}
                              </div>
                              <div>
                                <Label htmlFor="mpn">Manufacturer Part Number</Label>
                                <Input
                                  id="mpn"
                                  data-testid="input-mpn"
                                  {...form.register("mpn")}
                                  placeholder="Enter MPN"
                                  maxLength={65}
                                />
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {/* Item Specifics */}
                        <AccordionItem value="specifics">
                          <AccordionTrigger className="text-left">
                            <div className="flex items-center gap-2">
                              <span>Item Specifics</span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Add specific product attributes like "Style", "Fit", "Features" etc. that help buyers find your item.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div className="space-y-3">
                              {itemSpecificFields.map((field, index) => (
                                <div key={field.id} className="flex gap-2 items-start">
                                  <div className="flex-1">
                                    <Input
                                      placeholder="Name (e.g., Style)"
                                      {...form.register(`itemSpecifics.${index}.name`)}
                                      data-testid={`input-specific-name-${index}`}
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <Input
                                      placeholder="Value (e.g., Casual)"
                                      {...form.register(`itemSpecifics.${index}.value`)}
                                      data-testid={`input-specific-value-${index}`}
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => removeItemSpecific(index)}
                                    data-testid={`button-remove-specific-${index}`}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => appendItemSpecific({ name: "", value: "" })}
                                className="w-full"
                                data-testid="button-add-specific"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item Specific
                              </Button>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {/* Shipping & Package Information */}
                        <AccordionItem value="shipping">
                          <AccordionTrigger className="text-left">
                            <div className="flex items-center gap-2">
                              <span>Shipping & Package Information</span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Package dimensions and weight help calculate accurate shipping costs.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div>
                              <Label htmlFor="packageWeight">Package Weight</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="packageWeight"
                                  data-testid="input-package-weight"
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="150"
                                  {...form.register("packageWeight", { valueAsNumber: true })}
                                  placeholder="0.0"
                                  className="flex-1"
                                />
                                <Select value={packageUnit} onValueChange={(value: "inches" | "cm") => setPackageUnit(value)}>
                                  <SelectTrigger className="w-20" data-testid="select-weight-unit">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="inches">lbs</SelectItem>
                                    <SelectItem value="cm">kg</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {form.formState.errors.packageWeight && (
                                <p className="text-destructive text-sm mt-1">{form.formState.errors.packageWeight.message}</p>
                              )}
                            </div>
                            
                            <div>
                              <Label>Package Dimensions</Label>
                              <div className="grid grid-cols-4 gap-2">
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  placeholder="Length"
                                  onChange={(e) => {
                                    const dimensions = form.getValues("packageDimensions") || { length: 0, width: 0, height: 0, unit: packageUnit };
                                    form.setValue("packageDimensions", {
                                      ...dimensions,
                                      length: parseFloat(e.target.value) || 0,
                                      unit: packageUnit
                                    });
                                  }}
                                  data-testid="input-package-length"
                                />
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  placeholder="Width"
                                  onChange={(e) => {
                                    const dimensions = form.getValues("packageDimensions") || { length: 0, width: 0, height: 0, unit: packageUnit };
                                    form.setValue("packageDimensions", {
                                      ...dimensions,
                                      width: parseFloat(e.target.value) || 0,
                                      unit: packageUnit
                                    });
                                  }}
                                  data-testid="input-package-width"
                                />
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  placeholder="Height"
                                  onChange={(e) => {
                                    const dimensions = form.getValues("packageDimensions") || { length: 0, width: 0, height: 0, unit: packageUnit };
                                    form.setValue("packageDimensions", {
                                      ...dimensions,
                                      height: parseFloat(e.target.value) || 0,
                                      unit: packageUnit
                                    });
                                  }}
                                  data-testid="input-package-height"
                                />
                                <Select value={packageUnit} onValueChange={(value: "inches" | "cm") => {
                                  setPackageUnit(value);
                                  const dimensions = form.getValues("packageDimensions") || { length: 0, width: 0, height: 0, unit: packageUnit };
                                  form.setValue("packageDimensions", {
                                    ...dimensions,
                                    unit: value
                                  });
                                }}>
                                  <SelectTrigger data-testid="select-dimension-unit">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="inches">in</SelectItem>
                                    <SelectItem value="cm">cm</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {/* Advanced Listing Options */}
                        <AccordionItem value="advanced">
                          <AccordionTrigger className="text-left">
                            <div className="flex items-center gap-2">
                              <span>Advanced Listing Options</span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Choose between fixed price or auction format, and set duration and pricing options.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label>Listing Format</Label>
                                <Select 
                                  defaultValue="FIXED_PRICE"
                                  onValueChange={(value: any) => form.setValue("listingFormat", value)}
                                >
                                  <SelectTrigger data-testid="select-listing-format">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="FIXED_PRICE">Fixed Price</SelectItem>
                                    <SelectItem value="AUCTION">Auction</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Listing Duration</Label>
                                <Select 
                                  defaultValue="GTC"
                                  onValueChange={(value: any) => form.setValue("listingDuration", value)}
                                >
                                  <SelectTrigger data-testid="select-listing-duration">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="GTC">Good Till Cancelled</SelectItem>
                                    <SelectItem value="DAYS_1">1 Day</SelectItem>
                                    <SelectItem value="DAYS_3">3 Days</SelectItem>
                                    <SelectItem value="DAYS_5">5 Days</SelectItem>
                                    <SelectItem value="DAYS_7">7 Days</SelectItem>
                                    <SelectItem value="DAYS_10">10 Days</SelectItem>
                                    <SelectItem value="DAYS_30">30 Days</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            {form.watch("listingFormat") === "AUCTION" && (
                              <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/50">
                                <h4 className="font-medium">Auction Settings</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="startPrice">Starting Price ($)</Label>
                                    <Input
                                      id="startPrice"
                                      data-testid="input-start-price"
                                      type="number"
                                      step="0.01"
                                      min="0.01"
                                      {...form.register("startPrice", { valueAsNumber: true })}
                                      placeholder="0.99"
                                    />
                                    {form.formState.errors.startPrice && (
                                      <p className="text-destructive text-sm mt-1">{form.formState.errors.startPrice.message}</p>
                                    )}
                                  </div>
                                  <div>
                                    <Label htmlFor="reservePrice">Reserve Price ($) - Optional</Label>
                                    <Input
                                      id="reservePrice"
                                      data-testid="input-reserve-price"
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      {...form.register("reservePrice", { valueAsNumber: true })}
                                      placeholder="0.00"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Minimum price you'll accept</p>
                                  </div>
                                </div>
                                <div>
                                  <Label htmlFor="buyItNowPrice">Buy It Now Price ($) - Optional</Label>
                                  <Input
                                    id="buyItNowPrice"
                                    data-testid="input-buy-it-now-price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    {...form.register("buyItNowPrice", { valueAsNumber: true })}
                                    placeholder="0.00"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">Allow buyers to purchase immediately</p>
                                </div>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </TooltipProvider>
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
                          <Link href="/connections">
                            <Button variant="outline" size="sm" className="mt-2">
                              Connect Marketplaces
                            </Button>
                          </Link>
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
                            <span className="mr-2">⏳</span>
                            {selectedMarketplaces.length > 0 ? "Posting..." : "Saving..."}
                          </>
                        ) : (
                          <>
                            <span className="mr-2">💾</span>
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
