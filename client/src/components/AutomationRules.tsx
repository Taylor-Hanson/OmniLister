import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Zap, Shield, Clock, Users, ShoppingBag, DollarSign, 
  RefreshCw, AlertTriangle, Info, Settings, Target, Save
} from "lucide-react";

// Form schemas
const poshmarkRulesSchema = z.object({
  shareEnabled: z.boolean(),
  shareInterval: z.number().min(30).max(3600),
  followEnabled: z.boolean(),
  followLimit: z.number().min(0).max(500),
  offerEnabled: z.boolean(),
  offerPercentage: z.number().min(5).max(50),
  partyShareEnabled: z.boolean(),
  peakHoursOnly: z.boolean(),
  humanization: z.boolean(),
  safetyDelayMin: z.number().min(1).max(60),
  safetyDelayMax: z.number().min(1).max(120),
});

const mercariRulesSchema = z.object({
  offerEnabled: z.boolean(),
  offerPercentage: z.number().min(5).max(50),
  relistEnabled: z.boolean(),
  relistThreshold: z.number().min(1).max(90),
  priceDropEnabled: z.boolean(),
  priceDropPercentage: z.number().min(1).max(30),
  promoteEnabled: z.boolean(),
  promoteInterval: z.number().min(1).max(24),
});

const depopRulesSchema = z.object({
  bumpEnabled: z.boolean(),
  bumpInterval: z.number().min(1).max(168), // hours
  refreshEnabled: z.boolean(),
  refreshInterval: z.number().min(1).max(24),
  followEnabled: z.boolean(),
  followLimit: z.number().min(0).max(200),
  likeEnabled: z.boolean(),
  likeLimit: z.number().min(0).max(300),
});

const grailedRulesSchema = z.object({
  bumpEnabled: z.boolean(),
  bumpInterval: z.number().min(6).max(168),
  priceDropEnabled: z.boolean(),
  priceDropPercentage: z.number().min(5).max(30),
  priceDropFrequency: z.number().min(1).max(30), // days
  followEnabled: z.boolean(),
  followLimit: z.number().min(0).max(100),
});

type PoshmarkRules = z.infer<typeof poshmarkRulesSchema>;
type MercariRules = z.infer<typeof mercariRulesSchema>;
type DepopRules = z.infer<typeof depopRulesSchema>;
type GrailedRules = z.infer<typeof grailedRulesSchema>;

export default function AutomationRules() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("poshmark");
  const [isSaving, setIsSaving] = useState(false);

  // Forms for each marketplace
  const poshmarkForm = useForm<PoshmarkRules>({
    resolver: zodResolver(poshmarkRulesSchema),
    defaultValues: {
      shareEnabled: true,
      shareInterval: 120,
      followEnabled: false,
      followLimit: 100,
      offerEnabled: false,
      offerPercentage: 10,
      partyShareEnabled: true,
      peakHoursOnly: false,
      humanization: true,
      safetyDelayMin: 3,
      safetyDelayMax: 10,
    }
  });

  const mercariForm = useForm<MercariRules>({
    resolver: zodResolver(mercariRulesSchema),
    defaultValues: {
      offerEnabled: false,
      offerPercentage: 10,
      relistEnabled: false,
      relistThreshold: 30,
      priceDropEnabled: false,
      priceDropPercentage: 5,
      promoteEnabled: false,
      promoteInterval: 6,
    }
  });

  const depopForm = useForm<DepopRules>({
    resolver: zodResolver(depopRulesSchema),
    defaultValues: {
      bumpEnabled: false,
      bumpInterval: 24,
      refreshEnabled: false,
      refreshInterval: 6,
      followEnabled: false,
      followLimit: 50,
      likeEnabled: false,
      likeLimit: 100,
    }
  });

  const grailedForm = useForm<GrailedRules>({
    resolver: zodResolver(grailedRulesSchema),
    defaultValues: {
      bumpEnabled: false,
      bumpInterval: 24,
      priceDropEnabled: false,
      priceDropPercentage: 10,
      priceDropFrequency: 7,
      followEnabled: false,
      followLimit: 50,
    }
  });

  // Fetch existing rules
  const { data: existingRules } = useQuery({
    queryKey: ['/api/automation/rules'],
  });

  // Update forms when data loads
  useEffect(() => {
    if (existingRules) {
      if (existingRules?.poshmark) poshmarkForm.reset(existingRules.poshmark);
      if (existingRules?.mercari) mercariForm.reset(existingRules.mercari);
      if (existingRules?.depop) depopForm.reset(existingRules.depop);
      if (existingRules?.grailed) grailedForm.reset(existingRules.grailed);
    }
  }, [existingRules, poshmarkForm, mercariForm, depopForm, grailedForm]);

  // Save rules mutation
  const saveRulesMutation = useMutation({
    mutationFn: (data: { marketplace: string; rules: any }) =>
      apiRequest('POST', '/api/automation/rules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/rules'] });
      toast({
        title: "Rules Saved",
        description: "Automation rules have been updated successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save automation rules",
        variant: "destructive"
      });
    }
  });

  const handleSaveRules = async (marketplace: string) => {
    setIsSaving(true);
    let rules: any;
    
    switch (marketplace) {
      case 'poshmark':
        rules = poshmarkForm.getValues();
        break;
      case 'mercari':
        rules = mercariForm.getValues();
        break;
      case 'depop':
        rules = depopForm.getValues();
        break;
      case 'grailed':
        rules = grailedForm.getValues();
        break;
    }

    await saveRulesMutation.mutateAsync({ marketplace, rules });
    setIsSaving(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Automation Rules Configuration
        </CardTitle>
        <CardDescription>
          Configure automation rules and behaviors for each marketplace
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="poshmark">Poshmark</TabsTrigger>
            <TabsTrigger value="mercari">Mercari</TabsTrigger>
            <TabsTrigger value="depop">Depop</TabsTrigger>
            <TabsTrigger value="grailed">Grailed</TabsTrigger>
          </TabsList>

          {/* Poshmark Rules */}
          <TabsContent value="poshmark" className="mt-6">
            <Form {...poshmarkForm}>
              <form className="space-y-6">
                {/* Share Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    Share Settings
                  </h3>
                  
                  <FormField
                    control={poshmarkForm.control}
                    name="shareEnabled"
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
                            data-testid="switch-poshmark-share"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={poshmarkForm.control}
                    name="shareInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Share Interval (seconds)</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-4">
                            <Slider
                              min={30}
                              max={3600}
                              step={30}
                              value={[field.value]}
                              onValueChange={([value]) => field.onChange(value)}
                              className="flex-1"
                            />
                            <span className="w-20 text-sm text-muted-foreground">
                              {field.value}s
                            </span>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Time between each share action
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={poshmarkForm.control}
                    name="partyShareEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Party Sharing</FormLabel>
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
                </div>

                <Separator />

                {/* Follow Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Follow Settings
                  </h3>
                  
                  <FormField
                    control={poshmarkForm.control}
                    name="followEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Enable Auto-Following</FormLabel>
                          <FormDescription>
                            Automatically follow relevant users
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-poshmark-follow"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={poshmarkForm.control}
                    name="followLimit"
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
                        <FormDescription>
                          Maximum number of users to follow per day
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Offer Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Offer Settings
                  </h3>
                  
                  <FormField
                    control={poshmarkForm.control}
                    name="offerEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Enable Auto-Offers</FormLabel>
                          <FormDescription>
                            Send automatic offers to likers
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-poshmark-offers"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={poshmarkForm.control}
                    name="offerPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Offer Discount (%)</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-4">
                            <Slider
                              min={5}
                              max={50}
                              step={5}
                              value={[field.value]}
                              onValueChange={([value]) => field.onChange(value)}
                              className="flex-1"
                            />
                            <span className="w-20 text-sm text-muted-foreground">
                              {field.value}%
                            </span>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Discount percentage for automatic offers
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Safety Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Safety Settings
                  </h3>
                  
                  <FormField
                    control={poshmarkForm.control}
                    name="humanization"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Enable Humanization</FormLabel>
                          <FormDescription>
                            Add random delays to mimic human behavior
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
                      control={poshmarkForm.control}
                      name="safetyDelayMin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Delay (seconds)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="3"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={poshmarkForm.control}
                      name="safetyDelayMax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Delay (seconds)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="10"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={poshmarkForm.control}
                    name="peakHoursOnly"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Peak Hours Only</FormLabel>
                          <FormDescription>
                            Only run automations during peak hours (6-9 PM)
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
                </div>

                <Button 
                  onClick={() => handleSaveRules('poshmark')}
                  disabled={isSaving}
                  className="w-full"
                  data-testid="button-save-poshmark-rules"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Poshmark Rules
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* Mercari Rules */}
          <TabsContent value="mercari" className="mt-6">
            <Form {...mercariForm}>
              <form className="space-y-6">
                {/* Offer Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Offer Settings
                  </h3>
                  
                  <FormField
                    control={mercariForm.control}
                    name="offerEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Enable Auto-Offers</FormLabel>
                          <FormDescription>
                            Send automatic offers to watchers
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-mercari-offers"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={mercariForm.control}
                    name="offerPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Offer Discount (%)</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-4">
                            <Slider
                              min={5}
                              max={50}
                              step={5}
                              value={[field.value]}
                              onValueChange={([value]) => field.onChange(value)}
                              className="flex-1"
                            />
                            <span className="w-20 text-sm text-muted-foreground">
                              {field.value}%
                            </span>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Relist Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Relist Settings
                  </h3>
                  
                  <FormField
                    control={mercariForm.control}
                    name="relistEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Enable Auto-Relisting</FormLabel>
                          <FormDescription>
                            Automatically relist stale items
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
                    control={mercariForm.control}
                    name="relistThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relist After (days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="30"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Relist items older than this many days
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Price Drop Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Price Drop Settings
                  </h3>
                  
                  <FormField
                    control={mercariForm.control}
                    name="priceDropEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Enable Smart Price Drops</FormLabel>
                          <FormDescription>
                            Automatically drop prices to boost visibility
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
                    control={mercariForm.control}
                    name="priceDropPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Drop Amount (%)</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-4">
                            <Slider
                              min={1}
                              max={30}
                              step={1}
                              value={[field.value]}
                              onValueChange={([value]) => field.onChange(value)}
                              className="flex-1"
                            />
                            <span className="w-20 text-sm text-muted-foreground">
                              {field.value}%
                            </span>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Promote Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Promote Settings
                  </h3>
                  
                  <FormField
                    control={mercariForm.control}
                    name="promoteEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Enable Auto-Promote</FormLabel>
                          <FormDescription>
                            Automatically use promote feature
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
                    control={mercariForm.control}
                    name="promoteInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Promote Interval (hours)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="6"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Hours between promote actions
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                <Button 
                  onClick={() => handleSaveRules('mercari')}
                  disabled={isSaving}
                  className="w-full"
                  data-testid="button-save-mercari-rules"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Mercari Rules
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* Depop Rules */}
          <TabsContent value="depop" className="mt-6">
            <Form {...depopForm}>
              <form className="space-y-6">
                {/* Bump Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Bump Settings
                  </h3>
                  
                  <FormField
                    control={depopForm.control}
                    name="bumpEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Enable Auto-Bump</FormLabel>
                          <FormDescription>
                            Automatically bump listings to top
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-depop-bump"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={depopForm.control}
                    name="bumpInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bump Interval (hours)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="24"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Hours between bump actions
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Refresh Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Refresh Settings
                  </h3>
                  
                  <FormField
                    control={depopForm.control}
                    name="refreshEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Enable Auto-Refresh</FormLabel>
                          <FormDescription>
                            Refresh listings for better visibility
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
                    control={depopForm.control}
                    name="refreshInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Refresh Interval (hours)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="6"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Follow/Like Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Follow & Like Settings
                  </h3>
                  
                  <FormField
                    control={depopForm.control}
                    name="followEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Enable Auto-Follow</FormLabel>
                          <FormDescription>
                            Follow relevant users automatically
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
                    control={depopForm.control}
                    name="followLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Daily Follow Limit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="50"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={depopForm.control}
                    name="likeEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Enable Auto-Like</FormLabel>
                          <FormDescription>
                            Like items from target users
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
                    control={depopForm.control}
                    name="likeLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Daily Like Limit</FormLabel>
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
                </div>

                <Button 
                  onClick={() => handleSaveRules('depop')}
                  disabled={isSaving}
                  className="w-full"
                  data-testid="button-save-depop-rules"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Depop Rules
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* Grailed Rules */}
          <TabsContent value="grailed" className="mt-6">
            <Form {...grailedForm}>
              <form className="space-y-6">
                {/* Bump Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Bump Settings
                  </h3>
                  
                  <FormField
                    control={grailedForm.control}
                    name="bumpEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Enable Auto-Bump</FormLabel>
                          <FormDescription>
                            Automatically bump listings (6-hour cooldown)
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-grailed-bump"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={grailedForm.control}
                    name="bumpInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bump Interval (hours)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="6"
                            placeholder="24"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Minimum 6 hours between bumps
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Price Drop Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Price Drop Settings
                  </h3>
                  
                  <FormField
                    control={grailedForm.control}
                    name="priceDropEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Enable Smart Price Drops</FormLabel>
                          <FormDescription>
                            Strategic price drops for engagement
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
                    control={grailedForm.control}
                    name="priceDropPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Drop Amount (%)</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-4">
                            <Slider
                              min={5}
                              max={30}
                              step={5}
                              value={[field.value]}
                              onValueChange={([value]) => field.onChange(value)}
                              className="flex-1"
                            />
                            <span className="w-20 text-sm text-muted-foreground">
                              {field.value}%
                            </span>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={grailedForm.control}
                    name="priceDropFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Drop Frequency (days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="7"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Days between price drops
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Follow Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Follow Settings
                  </h3>
                  
                  <FormField
                    control={grailedForm.control}
                    name="followEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Enable Auto-Follow</FormLabel>
                          <FormDescription>
                            Follow users interested in your style
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
                    control={grailedForm.control}
                    name="followLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Daily Follow Limit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="50"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <Button 
                  onClick={() => handleSaveRules('grailed')}
                  disabled={isSaving}
                  className="w-full"
                  data-testid="button-save-grailed-rules"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Grailed Rules
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        {/* Safety Notice */}
        <Alert className="mt-6">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Safety First:</strong> All automations include built-in rate limiting, random delays, and compliance checks to protect your accounts from suspension.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}