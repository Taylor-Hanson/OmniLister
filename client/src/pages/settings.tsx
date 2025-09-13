import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RotateCw, GraduationCap } from "lucide-react";

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

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
    },
  });

  const { data: auditLogs = [] } = useQuery({
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account preferences and application settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">Notifications</TabsTrigger>
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

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium capitalize">
                    {user?.plan || 'free'} Plan
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {user?.plan === 'free' && 'Get started with basic features'}
                    {user?.plan === 'pro' && 'Perfect for serious resellers'}
                    {user?.plan === 'enterprise' && 'Advanced features for large operations'}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {user?.subscriptionStatus || 'inactive'}
                </Badge>
              </div>

              {user?.plan === 'free' ? (
                <Alert>
                  <i className="fas fa-info-circle h-4 w-4"></i>
                  <AlertDescription>
                    You're currently on the free plan. Upgrade to Pro for unlimited listings and advanced features.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <i className="fas fa-check-circle h-4 w-4"></i>
                  <AlertDescription>
                    Your subscription is active. Manage your billing through the Stripe customer portal.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-4 mt-4">
                {user?.plan === 'free' && (
                  <Button data-testid="button-upgrade-plan">
                    <i className="fas fa-crown mr-2"></i>
                    Upgrade to Pro
                  </Button>
                )}
                
                {user?.plan !== 'free' && (
                  <Button variant="outline" data-testid="button-manage-billing">
                    <i className="fas fa-credit-card mr-2"></i>
                    Manage Billing
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Listings this month</span>
                  <span className="font-medium">0 / {user?.plan === 'free' ? '100' : '∞'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AI generations used</span>
                  <span className="font-medium">0 / {user?.plan === 'free' ? '50' : '∞'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Storage used</span>
                  <span className="font-medium">0 MB / {user?.plan === 'free' ? '1 GB' : '∞'}</span>
                </div>
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
