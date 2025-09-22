import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  MessageSquare, Plus, Edit, Trash2, Copy, Save, FileText,
  DollarSign, Percent, Package, Star, Heart, Gift, Zap
} from "lucide-react";

// Template schemas
const offerTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  marketplace: z.string().min(1, "Marketplace is required"),
  type: z.enum(['standard', 'bundle', 'seasonal', 'clearance']),
  message: z.string().min(10, "Message must be at least 10 characters"),
  discountPercentage: z.number().min(5).max(50),
  minPrice: z.number().min(0),
  maxPrice: z.number().min(0),
  includeShipping: z.boolean(),
  variables: z.array(z.string()),
  conditions: z.object({
    minLikes: z.number().min(0),
    maxUses: z.number().min(0),
    validDays: z.number().min(1).max(30),
  }),
  active: z.boolean(),
});

const bundleTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  marketplace: z.string().min(1, "Marketplace is required"),
  minItems: z.number().min(2).max(10),
  maxItems: z.number().min(2).max(10),
  discountTiers: z.array(z.object({
    itemCount: z.number(),
    discountPercentage: z.number(),
  })),
  message: z.string(),
  conditions: z.object({
    minBundleValue: z.number().min(0),
    excludeCategories: z.array(z.string()),
  }),
  active: z.boolean(),
});

type OfferTemplate = z.infer<typeof offerTemplateSchema>;
type BundleTemplate = z.infer<typeof bundleTemplateSchema>;

interface Template {
  id: string;
  name: string;
  marketplace: string;
  type: string;
  message: string;
  discountPercentage?: number;
  usageCount: number;
  conversionRate: number;
  lastUsed?: string;
  active: boolean;
  createdAt: string;
}

export default function AutomationTemplates() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("offer");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateType, setTemplateType] = useState<'offer' | 'bundle'>('offer');

  // Forms
  const offerForm = useForm<OfferTemplate>({
    resolver: zodResolver(offerTemplateSchema),
    defaultValues: {
      name: '',
      marketplace: '',
      type: 'standard',
      message: '',
      discountPercentage: 10,
      minPrice: 0,
      maxPrice: 999999,
      includeShipping: true,
      variables: [],
      conditions: {
        minLikes: 0,
        maxUses: 0,
        validDays: 7,
      },
      active: true,
    }
  });

  const bundleForm = useForm<BundleTemplate>({
    resolver: zodResolver(bundleTemplateSchema),
    defaultValues: {
      name: '',
      marketplace: '',
      minItems: 2,
      maxItems: 5,
      discountTiers: [
        { itemCount: 2, discountPercentage: 10 },
        { itemCount: 3, discountPercentage: 15 },
        { itemCount: 4, discountPercentage: 20 },
      ],
      message: '',
      conditions: {
        minBundleValue: 0,
        excludeCategories: [],
      },
      active: true,
    }
  });

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ['/api/automation/templates'],
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: (template: any) =>
      apiRequest('/api/automation/templates', {
        method: 'POST',
        body: JSON.stringify(template)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/templates'] });
      toast({
        title: "Template Created",
        description: "Template has been created successfully"
      });
      setShowCreateDialog(false);
      offerForm.reset();
      bundleForm.reset();
    }
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: (data: { id: string; template: any }) =>
      apiRequest(`/api/automation/templates/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data.template)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/templates'] });
      toast({
        title: "Template Updated",
        description: "Template has been updated successfully"
      });
      setEditingTemplate(null);
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/automation/templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/templates'] });
      toast({
        title: "Template Deleted",
        description: "Template has been deleted successfully"
      });
    }
  });

  // Toggle template mutation
  const toggleTemplateMutation = useMutation({
    mutationFn: (data: { id: string; active: boolean }) =>
      apiRequest(`/api/automation/templates/${data.id}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ active: data.active })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/templates'] });
    }
  });

  // Duplicate template mutation
  const duplicateTemplateMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest('POST', `/api/automation/templates/${id}/duplicate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/templates'] });
      toast({
        title: "Template Duplicated",
        description: "Template has been duplicated successfully"
      });
    }
  });

  const handleCreateTemplate = () => {
    const template = templateType === 'offer' 
      ? offerForm.getValues()
      : bundleForm.getValues();
    
    createTemplateMutation.mutate({ ...template, type: templateType });
  };

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'standard': return <MessageSquare className="h-4 w-4" />;
      case 'bundle': return <Package className="h-4 w-4" />;
      case 'seasonal': return <Gift className="h-4 w-4" />;
      case 'clearance': return <Percent className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'standard': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'bundle': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'seasonal': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'clearance': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const marketplaces = [
    { value: 'poshmark', label: 'Poshmark' },
    { value: 'mercari', label: 'Mercari' },
    { value: 'depop', label: 'Depop' },
    { value: 'grailed', label: 'Grailed' },
    { value: 'ebay', label: 'eBay' },
  ];

  const messageVariables = [
    { value: '{buyer_name}', label: 'Buyer Name' },
    { value: '{item_title}', label: 'Item Title' },
    { value: '{original_price}', label: 'Original Price' },
    { value: '{discount_amount}', label: 'Discount Amount' },
    { value: '{final_price}', label: 'Final Price' },
    { value: '{discount_percentage}', label: 'Discount Percentage' },
    { value: '{bundle_count}', label: 'Bundle Item Count' },
    { value: '{bundle_savings}', label: 'Bundle Savings' },
    { value: '{expiry_time}', label: 'Offer Expiry Time' },
  ];

  // Sample templates for quick start
  const sampleTemplates = [
    {
      name: "Standard 10% Off",
      type: "standard",
      message: "Hi {buyer_name}! Thanks for liking {item_title}! I'm offering you an exclusive {discount_percentage}% discount. Your new price would be {final_price} with free shipping!",
      discount: 10
    },
    {
      name: "Bundle Deal",
      type: "bundle",
      message: "Hi! I noticed you liked multiple items. Bundle {bundle_count} or more items and save {bundle_savings}! Let me know which items you'd like to bundle.",
      discount: 15
    },
    {
      name: "Weekend Special",
      type: "seasonal",
      message: "🎉 Weekend Special! Get {discount_percentage}% off {item_title} - this offer expires in {expiry_time}. Don't miss out!",
      discount: 20
    },
    {
      name: "Clearance",
      type: "clearance",
      message: "CLEARANCE SALE! {item_title} is now {discount_percentage}% off - only {final_price}! Limited time offer.",
      discount: 30
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Offer Templates
          </h2>
          <p className="text-muted-foreground mt-1">
            Create and manage offer message templates for automated outreach
          </p>
        </div>

        {/* Create Template Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-template">
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Offer Template</DialogTitle>
              <DialogDescription>
                Create a reusable template for automated offers
              </DialogDescription>
            </DialogHeader>

            <Tabs value={templateType} onValueChange={(value: any) => setTemplateType(value)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="offer">Standard Offer</TabsTrigger>
                <TabsTrigger value="bundle">Bundle Offer</TabsTrigger>
              </TabsList>

              {/* Standard Offer Template */}
              <TabsContent value="offer">
                <Form {...offerForm}>
                  <form className="space-y-4">
                    <FormField
                      control={offerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Weekend Special 20% Off" 
                              {...field}
                              data-testid="input-template-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={offerForm.control}
                        name="marketplace"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Marketplace</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-marketplace">
                                  <SelectValue placeholder="Select marketplace" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {marketplaces.map(m => (
                                  <SelectItem key={m.value} value={m.value}>
                                    {m.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={offerForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Template Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="bundle">Bundle</SelectItem>
                                <SelectItem value="seasonal">Seasonal</SelectItem>
                                <SelectItem value="clearance">Clearance</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={offerForm.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message Template</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter your offer message..."
                              className="min-h-[100px]"
                              {...field}
                              data-testid="textarea-message"
                            />
                          </FormControl>
                          <FormDescription>
                            Use variables like {'{buyer_name}'}, {'{item_title}'}, {'{discount_percentage}'}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={offerForm.control}
                        name="discountPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount %</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="10"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={offerForm.control}
                        name="minPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Price</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={offerForm.control}
                        name="maxPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Price</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="999"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={offerForm.control}
                        name="conditions.minLikes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Likes</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>Min likes required</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={offerForm.control}
                        name="conditions.maxUses"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Uses</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>0 = unlimited</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={offerForm.control}
                        name="conditions.validDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valid Days</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="7"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>Offer validity</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={offerForm.control}
                      name="includeShipping"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>Include Free Shipping</FormLabel>
                            <FormDescription>
                              Add shipping discount to offers
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={offerForm.control}
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>Active</FormLabel>
                            <FormDescription>
                              Enable this template for use
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </TabsContent>

              {/* Bundle Template */}
              <TabsContent value="bundle">
                <Form {...bundleForm}>
                  <form className="space-y-4">
                    <FormField
                      control={bundleForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Bundle & Save Deal" 
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={bundleForm.control}
                      name="marketplace"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marketplace</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select marketplace" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {marketplaces.map(m => (
                                <SelectItem key={m.value} value={m.value}>
                                  {m.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={bundleForm.control}
                        name="minItems"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Items</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={bundleForm.control}
                        name="maxItems"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Items</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={bundleForm.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bundle Message</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter your bundle offer message..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Use {'{bundle_count}'} and {'{bundle_savings}'} variables
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={bundleForm.control}
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>Active</FormLabel>
                            <FormDescription>
                              Enable this template for use
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateTemplate}
                data-testid="button-save-template"
              >
                Create Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Start Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Start Templates</CardTitle>
          <CardDescription>
            Use these pre-made templates to get started quickly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {sampleTemplates.map((template, index) => (
              <Card 
                key={index}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  setShowCreateDialog(true);
                  offerForm.setValue('name', template.name);
                  offerForm.setValue('type', template.type as any);
                  offerForm.setValue('message', template.message);
                  offerForm.setValue('discountPercentage', template.discount);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    {getTemplateIcon(template.type)}
                    <Badge className={getTypeColor(template.type)}>
                      {template.discount}% OFF
                    </Badge>
                  </div>
                  <h4 className="font-medium text-sm">{template.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {template.message}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Template List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              Loading templates...
            </CardContent>
          </Card>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Templates Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first offer template or use a quick start template
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          templates.map(template => (
            <Card key={template.id} data-testid={`template-${template.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getTemplateIcon(template.type)}
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>
                        {template.marketplace} • {template.type}
                        {template.discountPercentage && ` • ${template.discountPercentage}% discount`}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getTypeColor(template.type)}>
                      {template.type}
                    </Badge>
                    <Switch
                      checked={template.active}
                      onCheckedChange={(checked) => 
                        toggleTemplateMutation.mutate({ id: template.id, active: checked })
                      }
                      data-testid={`switch-template-${template.id}`}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">Message Preview:</p>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{template.message}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Usage Count</p>
                    <p className="font-medium">{template.usageCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    <p className="font-medium">{template.conversionRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Used</p>
                    <p className="font-medium">
                      {template.lastUsed || 'Never'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingTemplate(template)}
                    data-testid={`button-edit-${template.id}`}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => duplicateTemplateMutation.mutate(template.id)}
                    data-testid={`button-duplicate-${template.id}`}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this template?")) {
                        deleteTemplateMutation.mutate(template.id);
                      }
                    }}
                    data-testid={`button-delete-${template.id}`}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Variable Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Available Variables</CardTitle>
          <CardDescription>
            Use these variables in your message templates for personalization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {messageVariables.map(variable => (
              <div key={variable.value} className="flex items-center gap-2">
                <code className="px-2 py-1 bg-muted rounded text-sm">
                  {variable.value}
                </code>
                <span className="text-sm text-muted-foreground">
                  {variable.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}