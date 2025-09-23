import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RotateCw, GraduationCap, Crown, Mail, Info, CheckCircle, TrendingUp, Zap, Gift } from "lucide-react";
import { Link } from "wouter";

const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sales: true,
    errors: true,
  });

  interface OptimizationSettings {
    autoOptimization: boolean;
    autoScheduling: boolean;
    autoPricing: boolean;
    optimizationThreshold: number;
    learningMode: boolean;
    notifyOptimizations: boolean;
  }

  const [optimizationSettings, setOptimizationSettings] = useState<OptimizationSettings>({
    autoOptimization: false,
    autoScheduling: true,
    autoPricing: false,
    optimizationThreshold: 70,
    learningMode: true,
    notifyOptimizations: true,
  });

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
    },
  });

  const { data: auditLogs = [] } = useQuery<any[]>({
    queryKey: ['/api/audit-logs'],
    enabled: !!user,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const response = await apiRequest("PUT", "/api/user", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/user");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "Your account has been deleted successfully.",
      });
      logout();
    },
    onError: (error: any) => {
      toast({
        title: "Deletion failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetOnboardingMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/onboarding/reset"),
    onSuccess: () => {
      toast({
        title: "Tutorial Reset",
        description: "The onboarding tutorial will start when you refresh the page.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      // Refresh the page to start the tutorial
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Reset failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileForm) => {
    updateProfileMutation.mutate(data);
  };

  const handleDeleteAccount = () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      deleteAccountMutation.mutate();
    }
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
    toast({
      title: "Notification preferences updated",
      description: `${key} notifications have been ${value ? 'enabled' : 'disabled'}.`,
    });
  };

  const updateOptimizationSettingsMutation = useMutation({
    mutationFn: async (settings: OptimizationSettings) => {
      const response = await apiRequest("PUT", "/api/user/optimization-settings", settings);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Optimization settings updated",
        description: "Your optimization preferences have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOptimizationChange = (key: keyof OptimizationSettings, value: boolean | number) => {
    const newSettings = { ...optimizationSettings, [key]: value };
    setOptimizationSettings(newSettings);
    updateOptimizationSettingsMutation.mutate(newSettings);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account preferences and application settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">Notifications</TabsTrigger>
          <TabsTrigger value="optimization" data-testid="tab-optimization">
            <Zap className="h-4 w-4 mr-2" />
            Optimization
          </TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing">Billing</TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      data-testid="input-username"
                      {...form.register("username")}
                      className={form.formState.errors.username ? "border-destructive" : ""}
                    />
                    {form.formState.errors.username && (
                      <p className="text-destructive text-sm mt-1">
                        {form.formState.errors.username.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      data-testid="input-email"
                      type="email"
                      {...form.register("email")}
                      className={form.formState.errors.email ? "border-destructive" : ""}
                    />
                    {form.formState.errors.email && (
                      <p className="text-destructive text-sm mt-1">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  
                  <Badge variant="outline" className="capitalize">
                    {user?.plan || 'free'} Plan
                  </Badge>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">0</div>
                  <p className="text-sm text-muted-foreground">Total Listings</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">0</div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">0</div>
                  <p className="text-sm text-muted-foreground">Connected Marketplaces</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tutorial & Help</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      <Label>Onboarding Tutorial</Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Learn how to use CrossList Pro with our interactive tutorial
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => resetOnboardingMutation.mutate()}
                    disabled={resetOnboardingMutation.isPending}
                    data-testid="button-restart-tutorial"
                  >
                    <RotateCw className="h-4 w-4 mr-2" />
                    {resetOnboardingMutation.isPending ? "Restarting..." : "Restart Tutorial"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={notifications.email}
                  onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                  data-testid="switch-email-notifications"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications in your browser
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={notifications.push}
                  onCheckedChange={(checked) => handleNotificationChange('push', checked)}
                  data-testid="switch-push-notifications"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sales-notifications">Sales Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when items sell
                  </p>
                </div>
                <Switch
                  id="sales-notifications"
                  checked={notifications.sales}
                  onCheckedChange={(checked) => handleNotificationChange('sales', checked)}
                  data-testid="switch-sales-notifications"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="error-notifications">Error Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about posting errors and issues
                  </p>
                </div>
                <Switch
                  id="error-notifications"
                  checked={notifications.errors}
                  onCheckedChange={(checked) => handleNotificationChange('errors', checked)}
                  data-testid="switch-error-notifications"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Frequency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Email Digest Frequency</Label>
                  <Select defaultValue="daily">
                    <SelectTrigger className="mt-2" data-testid="select-email-frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="daily">Daily digest</SelectItem>
                      <SelectItem value="weekly">Weekly digest</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6" data-testid="content-optimization-settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Optimization Engine Settings
              </CardTitle>
              <CardDescription>
                Configure AI-powered optimization features to maximize your posting success
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Auto-Optimization Master Switch */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-optimization" className="text-base">Auto-Optimization</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable AI-powered automatic optimizations based on learned patterns
                  </p>
                </div>
                <Switch
                  id="auto-optimization"
                  checked={optimizationSettings.autoOptimization}
                  onCheckedChange={(checked) => handleOptimizationChange('autoOptimization', checked)}
                  data-testid="switch-auto-optimization"
                />
              </div>

              <Separator />

              {/* Auto-Scheduling */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-scheduling" className="text-base">Smart Scheduling</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically schedule posts at optimal times based on success patterns
                  </p>
                </div>
                <Switch
                  id="auto-scheduling"
                  checked={optimizationSettings.autoScheduling}
                  onCheckedChange={(checked) => handleOptimizationChange('autoScheduling', checked)}
                  data-testid="switch-auto-scheduling"
                />
              </div>

              <Separator />

              {/* Auto-Pricing */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-pricing" className="text-base">Dynamic Pricing</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable automatic price adjustments based on market performance
                  </p>
                  <Badge variant="outline" className="mt-1">Coming Soon</Badge>
                </div>
                <Switch
                  id="auto-pricing"
                  checked={optimizationSettings.autoPricing}
                  onCheckedChange={(checked) => handleOptimizationChange('autoPricing', checked)}
                  disabled
                  data-testid="switch-auto-pricing"
                />
              </div>

              <Separator />

              {/* Optimization Threshold */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="optimization-threshold" className="text-base">Optimization Threshold</Label>
                  <p className="text-sm text-muted-foreground">
                    Minimum confidence level required to apply automatic optimizations ({optimizationSettings.optimizationThreshold}%)
                  </p>
                </div>
                <div className="px-3">
                  <input
                    type="range"
                    id="optimization-threshold"
                    min="50"
                    max="90"
                    step="5"
                    value={optimizationSettings.optimizationThreshold}
                    onChange={(e) => handleOptimizationChange('optimizationThreshold', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    data-testid="slider-optimization-threshold"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Conservative (50%)</span>
                    <span>Balanced (70%)</span>
                    <span>Aggressive (90%)</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Learning Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="learning-mode" className="text-base">Learning Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow the system to continuously learn from new posting data
                  </p>
                </div>
                <Switch
                  id="learning-mode"
                  checked={optimizationSettings.learningMode}
                  onCheckedChange={(checked) => handleOptimizationChange('learningMode', checked)}
                  data-testid="switch-learning-mode"
                />
              </div>

              <Separator />

              {/* Optimization Notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notify-optimizations" className="text-base">Optimization Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when optimizations are applied or recommendations are available
                  </p>
                </div>
                <Switch
                  id="notify-optimizations"
                  checked={optimizationSettings.notifyOptimizations}
                  onCheckedChange={(checked) => handleOptimizationChange('notifyOptimizations', checked)}
                  data-testid="switch-notify-optimizations"
                />
              </div>
            </CardContent>
          </Card>

          {/* Optimization Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Optimization Status</CardTitle>
              <CardDescription>Current status and performance of your optimization engine</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">Active</div>
                  <p className="text-sm text-muted-foreground">Engine Status</p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">+25%</div>
                  <p className="text-sm text-muted-foreground">Success Improvement</p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <GraduationCap className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">247</div>
                  <p className="text-sm text-muted-foreground">Patterns Learned</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Link href="/analytics?tab=optimization">
                  <Button variant="outline" size="sm" data-testid="button-view-optimization-insights">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Insights
                  </Button>
                </Link>
                <Button variant="outline" size="sm" disabled data-testid="button-export-optimization-data">
                  <Gift className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
                <Button variant="outline" size="sm" disabled data-testid="button-reset-optimization">
                  <RotateCw className="h-4 w-4 mr-2" />
                  Reset Engine
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          {/* Current Plan Card */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plan</CardTitle>
              <CardDescription>
                Manage your subscription plan and billing information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize text-lg">{user?.plan || "free"} Plan</p>
                  <p className="text-sm text-muted-foreground">
                    {user?.plan === "free" ? "Forever free plan" : "Active subscription"}
                  </p>
                </div>
                <Badge variant="default" className="flex items-center">
                  {user?.plan === 'free' ? (
                    <><Gift className="w-3 h-3 mr-1" /> Free</>
                  ) : user?.plan === 'starter' ? (
                    <><Zap className="w-3 h-3 mr-1" /> Starter</>
                  ) : user?.plan === 'growth' ? (
                    <><TrendingUp className="w-3 h-3 mr-1" /> Growth</>
                  ) : user?.plan === 'professional' ? (
                    <><Crown className="w-3 h-3 mr-1" /> Professional</>
                  ) : (
                    <><CheckCircle className="w-3 h-3 mr-1" /> {user?.plan}</>
                  )}
                </Badge>
              </div>

              {/* Usage Progress */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Monthly Listing Credits</span>
                  <span className="text-sm text-muted-foreground">
                    {user?.listingsUsedThisMonth || 0} / {user?.listingCredits || 10} used
                  </span>
                </div>
                <Progress 
                  value={((user?.listingsUsedThisMonth || 0) / (user?.listingCredits || 10)) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {user?.listingCredits === null ? "Unlimited listings" : 
                   user?.listingCredits === (user?.listingsUsedThisMonth || 0) ? 
                   "Monthly limit reached - upgrade to list more" : 
                   `${(user?.listingCredits || 10) - (user?.listingsUsedThisMonth || 0)} listings remaining this month`}
                </p>
              </div>

              {/* Plan Features */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Your Plan Includes:
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {user?.plan === "free" ? (
                    <>
                      <li>• 10 new listings per month</li>
                      <li>• Access to all 12 marketplaces</li>
                      <li>• Basic analytics</li>
                      <li>• Forever free - no expiration</li>
                    </>
                  ) : user?.plan === "starter" ? (
                    <>
                      <li>• 50 new listings per month</li>
                      <li>• Unlimited crossposting</li>
                      <li>• AI listing assistance</li>
                      <li>• Email support</li>
                    </>
                  ) : user?.plan === "growth" ? (
                    <>
                      <li>• 300 new listings per month</li>
                      <li>• Full automation suite</li>
                      <li>• Advanced analytics</li>
                      <li>• Priority support</li>
                    </>
                  ) : user?.plan === "professional" ? (
                    <>
                      <li>• 1,000 new listings per month</li>
                      <li>• Poshmark automation</li>
                      <li>• API access</li>
                      <li>• 24/7 priority support</li>
                    </>
                  ) : user?.plan === "unlimited" ? (
                    <>
                      <li>• Unlimited new listings</li>
                      <li>• AI-powered listing creation</li>
                      <li>• Automatic price sync</li>
                      <li>• 24/7 VIP support</li>
                    </>
                  ) : (
                    <>
                      <li>• 10 new listings per month</li>
                      <li>• Access to all 12 marketplaces</li>
                      <li>• Basic analytics</li>
                      <li>• Forever free - no expiration</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Billing Info */}
              {user?.billingCycleStart && (
                <div className="border rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Billing Period</p>
                      <p className="font-medium">{user?.plan === 'free' ? 'Forever Free' : 'Monthly'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Next Reset</p>
                      <p className="font-medium">
                        {new Date(new Date(user.billingCycleStart).setMonth(new Date(user.billingCycleStart).getMonth() + 1)).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Coming Soon Alert for Payment */}
              {user?.plan === "free" ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Upgrade to unlock more listings, automation features, and priority support. Paid plans with automatic billing coming soon!
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    You're on an early access program. Automatic billing will be set up when available.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button asChild data-testid="button-view-pricing">
                  <Link href="/pricing">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View All Plans
                  </Link>
                </Button>
                <Button variant="outline" asChild data-testid="button-manage-subscription">
                  <Link href="/subscribe">Manage Plan</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payment & Billing Card */}
          <Card>
            <CardHeader>
              <CardTitle>Payment & Billing</CardTitle>
              <CardDescription>
                Manage your payment methods and billing information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {user?.plan === 'free' 
                      ? 'No payment method required for the free plan. Automatic billing will be available when you upgrade.'
                      : 'Payment processing is being set up. Your plan is active through our early access program.'}
                  </AlertDescription>
                </Alert>
                
                {user?.plan !== 'free' ? (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Early Access Program</p>
                        <p className="text-sm text-muted-foreground">No payment method on file</p>
                      </div>
                      <Badge variant="outline">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2">Coming Soon: Automatic Billing</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      We're currently setting up automatic billing with Stripe. For now, contact our sales team for paid plan access.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = 'mailto:sales@crosslist.com'}
                      data-testid="button-contact-sales"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Contact Sales
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Billing History Card */}
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>
                View your past invoices and transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  {user?.plan === 'free' 
                    ? 'No billing history for free plan' 
                    : 'Billing history will appear here once payment processing is enabled'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Password</Label>
                <div className="flex space-x-2 mt-2">
                  <Input
                    type="password"
                    value="••••••••"
                    disabled
                    className="flex-1"
                  />
                  <Button variant="outline" data-testid="button-change-password">
                    Change
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Add an extra layer of security to your account
                </p>
                <Button variant="outline" data-testid="button-setup-2fa">
                  <i className="fas fa-shield-alt mr-2"></i>
                  Setup 2FA
                </Button>
              </div>

              <Separator />

              <div>
                <Label>Active Sessions</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Manage your active login sessions
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">Current Session</p>
                      <p className="text-xs text-muted-foreground">
                        Chrome on Mac • Started today
                      </p>
                    </div>
                    <Badge variant="outline">Current</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No recent activity
                  </p>
                ) : (
                  auditLogs.slice(0, 5).map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <p className="font-medium capitalize">
                          {log.action.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {log.entityType || 'system'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="border-destructive">
                <i className="fas fa-exclamation-triangle h-4 w-4"></i>
                <AlertDescription>
                  Once you delete your account, there is no going back. Please be certain.
                </AlertDescription>
              </Alert>
              
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deleteAccountMutation.isPending}
                className="mt-4"
                data-testid="button-delete-account"
              >
                {deleteAccountMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Deleting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash mr-2"></i>
                    Delete Account
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
