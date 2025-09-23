import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  ShoppingBag, Users, DollarSign, Clock, Shield, Zap,
  AlertTriangle, Plus, Trash2, Save, RefreshCw, Target,
  Calendar, MessageSquare, Gift, Heart, Star, TrendingUp, Info
} from "lucide-react";

// Form schemas for Poshmark settings
const shareSettingsSchema = z.object({
  enabled: z.boolean(),
  shareMode: z.enum(['closet', 'feed', 'both']),
  closetOrder: z.enum(['just_shared', 'just_in', 'price_low_high', 'price_high_low', 'size']),
  shareInterval: z.object({
    min: z.number().min(30),
    max: z.number().min(60),
  }),
  partySharing: z.object({
    enabled: z.boolean(),
    autoJoin: z.boolean(),
    categories: z.array(z.string()),
  }),
  peakHours: z.object({
    enabled: z.boolean(),
    timeRanges: z.array(z.object({
      start: z.string(),
      end: z.string(),
      days: z.array(z.string()),
    })),
  }),
  skipSold: z.boolean(),
  skipReserved: z.boolean(),
  maxSharesPerDay: z.number().min(0),
  captchaHandling: z.boolean(),
});

const followSettingsSchema = z.object({
  enabled: z.boolean(),
  strategy: z.enum(['followers_of_followers', 'likers', 'party_attendees', 'new_users']),
  dailyLimit: z.number().min(0).max(500),
  followBack: z.boolean(),
  unfollowNonReciprocal: z.boolean(),
  unfollowAfterDays: z.number().min(1).max(90),
  targetUsers: z.array(z.string()),
  excludeList: z.array(z.string()),
  followRatio: z.number().min(0.5).max(2),
});

const offerSettingsSchema = z.object({
  enabled: z.boolean(),
  autoOffer: z.object({
    enabled: z.boolean(),
    triggerOnLike: z.boolean(),
    triggerDelay: z.number().min(0).max(48), // hours
    minLikes: z.number().min(1).max(10),
  }),
  discountTiers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    percentage: z.number().min(5).max(50),
    minPrice: z.number().min(0),
    maxPrice: z.number().min(0),
    shippingDiscount: z.boolean(),
  })),
  bundleOffers: z.object({
    enabled: z.boolean(),
    bundleDiscount: z.number().min(10).max(50),
    minItems: z.number().min(2).max(5),
  }),
  messageTemplates: z.array(z.object({
    id: z.string(),
    name: z.string(),
    message: z.string(),
    variables: z.array(z.string()),
  })),
  excludeBrands: z.array(z.string()),
  excludeKeywords: z.array(z.string()),
});

const advancedSettingsSchema = z.object({
  humanization: z.object({
    enabled: z.boolean(),
    randomDelays: z.boolean(),
    typos: z.boolean(),
    mouseMovements: z.boolean(),
    breakPatterns: z.object({
      enabled: z.boolean(),
      shortBreaks: z.number().min(0).max(10), // per hour
      longBreakEvery: z.number().min(1).max(8), // hours
      longBreakDuration: z.number().min(10).max(60), // minutes
    }),
  }),
  compliance: z.object({
    respectRateLimits: z.boolean(),
    backoffOnErrors: z.boolean(),
    maxRetriesPerAction: z.number().min(0).max(5),
    errorCooldown: z.number().min(5).max(60), // minutes
  }),
  analytics: z.object({
    trackPerformance: z.boolean(),
    reportFrequency: z.enum(['daily', 'weekly', 'monthly']),
    metricsToTrack: z.array(z.string()),
  }),
  notifications: z.object({
    enabled: z.boolean(),
    channels: z.array(z.enum(['email', 'sms', 'push', 'webhook'])),
    events: z.array(z.string()),
  }),
});

type ShareSettings = z.infer<typeof shareSettingsSchema>;
type FollowSettings = z.infer<typeof followSettingsSchema>;
type OfferSettings = z.infer<typeof offerSettingsSchema>;
type AdvancedSettings = z.infer<typeof advancedSettingsSchema>;

export default function PoshmarkAutomationSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("share");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize forms
  const shareForm = useForm<ShareSettings>({
    resolver: zodResolver(shareSettingsSchema),
    defaultValues: {
      enabled: true,
      shareMode: 'both',
      closetOrder: 'just_shared',
      shareInterval: { min: 30, max: 120 },
      partySharing: {
        enabled: true,
        autoJoin: false,
        categories: [],
      },
      peakHours: {
        enabled: false,
        timeRanges: [],
      },
      skipSold: true,
      skipReserved: true,
      maxSharesPerDay: 5000,
      captchaHandling: true,
    }
  });

  const followForm = useForm<FollowSettings>({
    resolver: zodResolver(followSettingsSchema),
    defaultValues: {
      enabled: false,
      strategy: 'followers_of_followers',
      dailyLimit: 100,
      followBack: false,
      unfollowNonReciprocal: false,
      unfollowAfterDays: 7,
      targetUsers: [],
      excludeList: [],
      followRatio: 1.0,
    }
  });

  const offerForm = useForm<OfferSettings>({
    resolver: zodResolver(offerSettingsSchema),
    defaultValues: {
      enabled: false,
      autoOffer: {
        enabled: false,
        triggerOnLike: true,
        triggerDelay: 4,
        minLikes: 1,
      },
      discountTiers: [],
      bundleOffers: {
        enabled: false,
        bundleDiscount: 20,
        minItems: 2,
      },
      messageTemplates: [],
      excludeBrands: [],
      excludeKeywords: [],
    }
  });

  const advancedForm = useForm<AdvancedSettings>({
    resolver: zodResolver(advancedSettingsSchema),
    defaultValues: {
      humanization: {
        enabled: true,
        randomDelays: true,
        typos: false,
        mouseMovements: true,
        breakPatterns: {
          enabled: true,
          shortBreaks: 2,
          longBreakEvery: 4,
          longBreakDuration: 30,
        },
      },
      compliance: {
        respectRateLimits: true,
        backoffOnErrors: true,
        maxRetriesPerAction: 3,
        errorCooldown: 15,
      },
      analytics: {
        trackPerformance: true,
        reportFrequency: 'weekly',
        metricsToTrack: ['shares', 'follows', 'offers', 'sales'],
      },
      notifications: {
        enabled: true,
        channels: ['email', 'push'],
        events: ['sale', 'offer_accepted', 'automation_error'],
      },
    }
  });

  // Field arrays for dynamic lists
  const { fields: discountTiers, append: appendTier, remove: removeTier } = 
    useFieldArray({ control: offerForm.control, name: "discountTiers" });

  const { fields: messageTemplates, append: appendTemplate, remove: removeTemplate } = 
    useFieldArray({ control: offerForm.control, name: "messageTemplates" });

  const { fields: timeRanges, append: appendTimeRange, remove: removeTimeRange } = 
    useFieldArray({ control: shareForm.control, name: "peakHours.timeRanges" });

  // Fetch existing settings
  const { data: existingSettings } = useQuery<Record<string, any>>({
    queryKey: ['/api/automation/poshmark/settings'],
  });

  // Update forms when data loads
  useEffect(() => {
    if (existingSettings) {
      if (existingSettings?.share) shareForm.reset(existingSettings.share);
      if (existingSettings?.follow) followForm.reset(existingSettings.follow);
      if (existingSettings?.offer) offerForm.reset(existingSettings.offer);
      if (existingSettings?.advanced) advancedForm.reset(existingSettings.advanced);
    }
  }, [existingSettings, shareForm, followForm, offerForm, advancedForm]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: (data: { section: string; settings: any }) =>
      apiRequest('POST', '/api/automation/poshmark/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/poshmark/settings'] });
      toast({
        title: "Settings Saved",
        description: "Poshmark automation settings have been updated"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    }
  });

  const handleSaveSettings = async (section: string) => {
    setIsSaving(true);
    let settings: any;
    
    switch (section) {
      case 'share':
        settings = shareForm.getValues();
        break;
      case 'follow':
        settings = followForm.getValues();
        break;
      case 'offer':
        settings = offerForm.getValues();
        break;
      case 'advanced':
        settings = advancedForm.getValues();
        break;
    }

    await saveSettingsMutation.mutateAsync({ section, settings });
    setIsSaving(false);
  };

  const poshmarkCategories = [
    'Women', 'Men', 'Kids', 'Home', 'Beauty & Wellness', 
    'Electronics', 'Pets', 'Boutique', 'Vintage'
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-pink-500" />
          Poshmark Automation Settings
        </CardTitle>
        <CardDescription>
          Configure advanced Poshmark automation features and behaviors
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="share">Share</TabsTrigger>
            <TabsTrigger value="follow">Follow</TabsTrigger>
            <TabsTrigger value="offer">Offers</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Share Settings Tab */}
          <TabsContent value="share" className="mt-6">
            <Form {...shareForm}>
              <form className="space-y-6">
                {/* Basic Share Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Settings</h3>
                  
                  <FormField
                    control={shareForm.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Enable Auto-Sharing</FormLabel>
                          <FormDescription>
                            Automatically share your closet items
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-poshmark-autoshare"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={shareForm.control}
                    name="shareMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Share Mode</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="closet">Closet Only</SelectItem>
                            <SelectItem value="feed">Feed Only</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose where to share your items
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={shareForm.control}
                    name="closetOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Closet Share Order</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="just_shared">Just Shared</SelectItem>
                            <SelectItem value="just_in">Just In</SelectItem>
                            <SelectItem value="price_low_high">Price: Low to High</SelectItem>
                            <SelectItem value="price_high_low">Price: High to Low</SelectItem>
                            <SelectItem value="size">Size</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={shareForm.control}
                      name="shareInterval.min"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Interval (seconds)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="30"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={shareForm.control}
                      name="shareInterval.max"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Interval (seconds)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="120"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={shareForm.control}
                    name="maxSharesPerDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Shares Per Day</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="5000"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum number of items to share per day (0 = unlimited)
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Party Sharing Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Party Sharing</h3>
                  
                  <FormField
                    control={shareForm.control}
                    name="partySharing.enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Enable Party Sharing</FormLabel>
                          <FormDescription>
                            Share items during Posh Parties
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
                    control={shareForm.control}
                    name="partySharing.autoJoin"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Auto-Join Parties</FormLabel>
                          <FormDescription>
                            Automatically join relevant parties
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
                    control={shareForm.control}
                    name="partySharing.categories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Party Categories</FormLabel>
                        <div className="grid grid-cols-3 gap-2">
                          {poshmarkCategories.map((category) => (
                            <FormItem
                              key={category}
                              className="flex items-center space-x-2"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(category)}
                                  onCheckedChange={(checked) => {
                                    const updated = checked
                                      ? [...(field.value || []), category]
                                      : field.value?.filter((c) => c !== category) || [];
                                    field.onChange(updated);
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {category}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Peak Hours Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Peak Hours</h3>
                  
                  <FormField
                    control={shareForm.control}
                    name="peakHours.enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Enable Peak Hours</FormLabel>
                          <FormDescription>
                            Only share during specified time ranges
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

                  <div className="space-y-2">
                    <Label>Time Ranges</Label>
                    {timeRanges.map((range, index) => (
                      <div key={range.id} className="flex items-center gap-2">
                        <Input
                          type="time"
                          {...shareForm.register(`peakHours.timeRanges.${index}.start`)}
                        />
                        <span>to</span>
                        <Input
                          type="time"
                          {...shareForm.register(`peakHours.timeRanges.${index}.end`)}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeTimeRange(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendTimeRange({
                        start: '18:00',
                        end: '21:00',
                        days: ['mon', 'tue', 'wed', 'thu', 'fri']
                      })}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Time Range
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Skip Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Skip Settings</h3>
                  
                  <FormField
                    control={shareForm.control}
                    name="skipSold"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Skip sold items</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={shareForm.control}
                    name="skipReserved"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Skip reserved items</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={shareForm.control}
                    name="captchaHandling"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Handle CAPTCHAs automatically</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <Button 
                  onClick={() => handleSaveSettings('share')}
                  disabled={isSaving}
                  className="w-full"
                  data-testid="button-save-share-settings"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Share Settings
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* Follow Settings Tab */}
          <TabsContent value="follow" className="mt-6">
            <Form {...followForm}>
              <form className="space-y-6">
                <div className="space-y-4">
                  <FormField
                    control={followForm.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Enable Auto-Following</FormLabel>
                          <FormDescription>
                            Automatically follow strategic users
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-poshmark-autofollow"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={followForm.control}
                    name="strategy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Follow Strategy</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="followers_of_followers">Followers of Followers</SelectItem>
                            <SelectItem value="likers">Item Likers</SelectItem>
                            <SelectItem value="party_attendees">Party Attendees</SelectItem>
                            <SelectItem value="new_users">New Users</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={followForm.control}
                    name="dailyLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Daily Follow Limit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="100"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={followForm.control}
                    name="followBack"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Auto follow-back</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={followForm.control}
                    name="unfollowNonReciprocal"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Unfollow non-reciprocal followers</FormLabel>
                      </FormItem>
                    )}
                  />

                  {followForm.watch('unfollowNonReciprocal') && (
                    <FormField
                      control={followForm.control}
                      name="unfollowAfterDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unfollow After (days)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="7"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={followForm.control}
                    name="followRatio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Follow Ratio</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-4">
                            <Slider
                              min={0.5}
                              max={2}
                              step={0.1}
                              value={[field.value]}
                              onValueChange={([value]) => field.onChange(value)}
                              className="flex-1"
                            />
                            <span className="w-20 text-sm text-muted-foreground">
                              {field.value.toFixed(1)}
                            </span>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Maintain a healthy follower/following ratio
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                <Button 
                  onClick={() => handleSaveSettings('follow')}
                  disabled={isSaving}
                  className="w-full"
                  data-testid="button-save-follow-settings"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Follow Settings
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* Offer Settings Tab */}
          <TabsContent value="offer" className="mt-6">
            <Form {...offerForm}>
              <form className="space-y-6">
                {/* Auto-Offer Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Auto-Offer Settings</h3>
                  
                  <FormField
                    control={offerForm.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Enable Auto-Offers</FormLabel>
                          <FormDescription>
                            Automatically send offers to likers
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-poshmark-autooffer"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={offerForm.control}
                    name="autoOffer.triggerOnLike"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Trigger on new likes</FormLabel>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={offerForm.control}
                      name="autoOffer.triggerDelay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Offer Delay (hours)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="4"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={offerForm.control}
                      name="autoOffer.minLikes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Likes Required</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Discount Tiers */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Discount Tiers</h3>
                  
                  <div className="space-y-2">
                    {discountTiers.map((tier, index) => (
                      <Card key={tier.id}>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 gap-4">
                            <Input
                              placeholder="Tier Name"
                              {...offerForm.register(`discountTiers.${index}.name`)}
                            />
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="Discount %"
                                {...offerForm.register(`discountTiers.${index}.percentage`)}
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeTier(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <Input
                              type="number"
                              placeholder="Min Price"
                              {...offerForm.register(`discountTiers.${index}.minPrice`)}
                            />
                            <Input
                              type="number"
                              placeholder="Max Price"
                              {...offerForm.register(`discountTiers.${index}.maxPrice`)}
                            />
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            <Checkbox
                              {...offerForm.register(`discountTiers.${index}.shippingDiscount`)}
                            />
                            <Label>Include shipping discount</Label>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => appendTier({
                        id: Math.random().toString(),
                        name: '',
                        percentage: 10,
                        minPrice: 0,
                        maxPrice: 999,
                        shippingDiscount: true,
                      })}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Discount Tier
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Bundle Offers */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Bundle Offers</h3>
                  
                  <FormField
                    control={offerForm.control}
                    name="bundleOffers.enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Enable Bundle Offers</FormLabel>
                          <FormDescription>
                            Send bundle discount offers
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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={offerForm.control}
                      name="bundleOffers.bundleDiscount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bundle Discount (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="20"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={offerForm.control}
                      name="bundleOffers.minItems"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Items</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="2"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Button 
                  onClick={() => handleSaveSettings('offer')}
                  disabled={isSaving}
                  className="w-full"
                  data-testid="button-save-offer-settings"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Offer Settings
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* Advanced Settings Tab */}
          <TabsContent value="advanced" className="mt-6">
            <Form {...advancedForm}>
              <form className="space-y-6">
                {/* Humanization Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Humanization & Safety
                  </h3>
                  
                  <FormField
                    control={advancedForm.control}
                    name="humanization.enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Enable Humanization</FormLabel>
                          <FormDescription>
                            Mimic human behavior patterns
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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={advancedForm.control}
                      name="humanization.randomDelays"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Random delays</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={advancedForm.control}
                      name="humanization.mouseMovements"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Mouse movements</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Break Patterns</Label>
                    <FormField
                      control={advancedForm.control}
                      name="humanization.breakPatterns.enabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Enable break patterns</FormLabel>
                        </FormItem>
                      )}
                    />
                    
                    {advancedForm.watch('humanization.breakPatterns.enabled') && (
                      <div className="grid grid-cols-3 gap-4 mt-2">
                        <FormField
                          control={advancedForm.control}
                          name="humanization.breakPatterns.shortBreaks"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Short breaks/hour</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={advancedForm.control}
                          name="humanization.breakPatterns.longBreakEvery"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Long break (hours)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={advancedForm.control}
                          name="humanization.breakPatterns.longBreakDuration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Duration (mins)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Compliance Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Compliance & Error Handling
                  </h3>
                  
                  <FormField
                    control={advancedForm.control}
                    name="compliance.respectRateLimits"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Respect platform rate limits</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={advancedForm.control}
                    name="compliance.backoffOnErrors"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Exponential backoff on errors</FormLabel>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={advancedForm.control}
                      name="compliance.maxRetriesPerAction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Retries</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={advancedForm.control}
                      name="compliance.errorCooldown"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Error Cooldown (mins)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Button 
                  onClick={() => handleSaveSettings('advanced')}
                  disabled={isSaving}
                  className="w-full"
                  data-testid="button-save-advanced-settings"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Advanced Settings
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        {/* Info Alert */}
        <Alert className="mt-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Pro Tip</AlertTitle>
          <AlertDescription>
            These settings work best when combined with strategic timing and quality listings. 
            Monitor your analytics to optimize your automation strategy over time.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}