import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Save, 
  Plus, 
  Trash2, 
  Edit2,
  DollarSign,
  Package,
  FileText,
  Image,
  Calculator
} from "lucide-react";

interface SyncConfigurationProps {
  onClose?: () => void;
}

export default function SyncConfiguration({ onClose }: SyncConfigurationProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Local state for settings
  const [globalSettings, setGlobalSettings] = useState({
    autoSync: false,
    syncFrequency: "manual",
    syncFields: {
      price: true,
      inventory: true,
      description: true,
      images: true,
    },
    defaultBehavior: {
      priceConflictResolution: "highest",
      inventoryConflictResolution: "lowest",
      descriptionConflictResolution: "longest",
    },
  });

  // Fetch sync settings
  const { data: syncSettings, isLoading } = useQuery<any>({
    queryKey: ['/api/sync/settings'],
    enabled: !!user,
  });

  // Fetch sync rules
  const { data: syncRules = [], refetch: refetchRules } = useQuery<any[]>({
    queryKey: ['/api/sync/rules'],
    enabled: !!user,
  });

  // Fetch marketplaces
  const { data: marketplaces = [] } = useQuery<any[]>({
    queryKey: ['/api/marketplaces'],
    enabled: !!user,
  });

  // Update local state when data is fetched
  useEffect(() => {
    if (syncSettings) {
      setGlobalSettings(syncSettings);
    }
  }, [syncSettings]);

  // Mutation for saving global settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: typeof globalSettings) => {
      return apiRequest('/api/sync/settings', 'POST', settings);
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your sync settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sync/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save settings",
        description: error.message || "An error occurred while saving settings.",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating sync rule
  const createRuleMutation = useMutation({
    mutationFn: async (rule: any) => {
      return apiRequest('/api/sync/rules', 'POST', rule);
    },
    onSuccess: () => {
      toast({
        title: "Rule created",
        description: "Platform-specific sync rule has been created.",
      });
      refetchRules();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create rule",
        description: error.message || "An error occurred while creating the rule.",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating sync rule
  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest(`/api/sync/rules/${id}`, 'PUT', data);
    },
    onSuccess: () => {
      toast({
        title: "Rule updated",
        description: "Sync rule has been updated successfully.",
      });
      refetchRules();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update rule",
        description: error.message || "An error occurred while updating the rule.",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting sync rule
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/sync/rules/${id}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Rule deleted",
        description: "Sync rule has been removed.",
      });
      refetchRules();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete rule",
        description: error.message || "An error occurred while deleting the rule.",
        variant: "destructive",
      });
    },
  });

  const handleSaveGlobalSettings = () => {
    saveSettingsMutation.mutate(globalSettings);
  };

  const handleCreateRule = () => {
    const availableMarkets = marketplaces
      .filter((m: any) => m.isConnected)
      .filter((m: any) => !syncRules.some((r: any) => r.marketplace === m.marketplace));
    
    if (availableMarkets.length === 0) {
      toast({
        title: "No available marketplaces",
        description: "All connected marketplaces already have sync rules.",
        variant: "destructive",
      });
      return;
    }

    const newRule = {
      marketplace: availableMarkets[0].marketplace,
      isEnabled: true,
      priceAdjustment: "0",
      fieldsToSync: {
        price: true,
        inventory: true,
        description: true,
        images: true,
      },
      priority: syncRules.length,
    };

    createRuleMutation.mutate(newRule);
  };

  const connectedMarketplaces = marketplaces.filter((m: any) => m.isConnected);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="global" data-testid="tab-global-settings">Global Settings</TabsTrigger>
          <TabsTrigger value="platform" data-testid="tab-platform-rules">Platform Rules</TabsTrigger>
        </TabsList>

        {/* Global Settings Tab */}
        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sync Configuration</CardTitle>
              <CardDescription>
                Configure global synchronization settings for all platforms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Auto Sync */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-sync">Auto Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync listings when changes are detected
                  </p>
                </div>
                <Switch
                  id="auto-sync"
                  checked={globalSettings.autoSync}
                  onCheckedChange={(checked) => 
                    setGlobalSettings({ ...globalSettings, autoSync: checked })
                  }
                  data-testid="switch-auto-sync"
                />
              </div>

              <Separator />

              {/* Sync Frequency */}
              <div className="space-y-2">
                <Label htmlFor="sync-frequency">Sync Frequency</Label>
                <Select
                  value={globalSettings.syncFrequency}
                  onValueChange={(value) => 
                    setGlobalSettings({ ...globalSettings, syncFrequency: value })
                  }
                >
                  <SelectTrigger id="sync-frequency" data-testid="select-sync-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Fields to Sync */}
              <div className="space-y-3">
                <Label>Fields to Sync</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="sync-price">Price</Label>
                    </div>
                    <Switch
                      id="sync-price"
                      checked={globalSettings.syncFields.price}
                      onCheckedChange={(checked) => 
                        setGlobalSettings({
                          ...globalSettings,
                          syncFields: { ...globalSettings.syncFields, price: checked }
                        })
                      }
                      data-testid="switch-sync-price"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="sync-inventory">Inventory</Label>
                    </div>
                    <Switch
                      id="sync-inventory"
                      checked={globalSettings.syncFields.inventory}
                      onCheckedChange={(checked) => 
                        setGlobalSettings({
                          ...globalSettings,
                          syncFields: { ...globalSettings.syncFields, inventory: checked }
                        })
                      }
                      data-testid="switch-sync-inventory"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="sync-description">Description</Label>
                    </div>
                    <Switch
                      id="sync-description"
                      checked={globalSettings.syncFields.description}
                      onCheckedChange={(checked) => 
                        setGlobalSettings({
                          ...globalSettings,
                          syncFields: { ...globalSettings.syncFields, description: checked }
                        })
                      }
                      data-testid="switch-sync-description"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Image className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="sync-images">Images</Label>
                    </div>
                    <Switch
                      id="sync-images"
                      checked={globalSettings.syncFields.images}
                      onCheckedChange={(checked) => 
                        setGlobalSettings({
                          ...globalSettings,
                          syncFields: { ...globalSettings.syncFields, images: checked }
                        })
                      }
                      data-testid="switch-sync-images"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Conflict Resolution */}
              <div className="space-y-3">
                <Label>Conflict Resolution</Label>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="price-conflict" className="text-sm">Price Conflicts</Label>
                    <Select
                      value={globalSettings.defaultBehavior.priceConflictResolution}
                      onValueChange={(value) => 
                        setGlobalSettings({
                          ...globalSettings,
                          defaultBehavior: { 
                            ...globalSettings.defaultBehavior, 
                            priceConflictResolution: value 
                          }
                        })
                      }
                    >
                      <SelectTrigger id="price-conflict" data-testid="select-price-conflict">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="highest">Keep Highest</SelectItem>
                        <SelectItem value="lowest">Keep Lowest</SelectItem>
                        <SelectItem value="source">Keep Source</SelectItem>
                        <SelectItem value="average">Use Average</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="inventory-conflict" className="text-sm">Inventory Conflicts</Label>
                    <Select
                      value={globalSettings.defaultBehavior.inventoryConflictResolution}
                      onValueChange={(value) => 
                        setGlobalSettings({
                          ...globalSettings,
                          defaultBehavior: { 
                            ...globalSettings.defaultBehavior, 
                            inventoryConflictResolution: value 
                          }
                        })
                      }
                    >
                      <SelectTrigger id="inventory-conflict" data-testid="select-inventory-conflict">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lowest">Keep Lowest</SelectItem>
                        <SelectItem value="highest">Keep Highest</SelectItem>
                        <SelectItem value="source">Keep Source</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description-conflict" className="text-sm">Description Conflicts</Label>
                    <Select
                      value={globalSettings.defaultBehavior.descriptionConflictResolution}
                      onValueChange={(value) => 
                        setGlobalSettings({
                          ...globalSettings,
                          defaultBehavior: { 
                            ...globalSettings.defaultBehavior, 
                            descriptionConflictResolution: value 
                          }
                        })
                      }
                    >
                      <SelectTrigger id="description-conflict" data-testid="select-description-conflict">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="longest">Keep Longest</SelectItem>
                        <SelectItem value="shortest">Keep Shortest</SelectItem>
                        <SelectItem value="source">Keep Source</SelectItem>
                        <SelectItem value="merge">Merge Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSaveGlobalSettings}
                disabled={saveSettingsMutation.isPending}
                className="w-full"
                data-testid="button-save-global-settings"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Global Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Platform Rules Tab */}
        <TabsContent value="platform" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Platform-Specific Rules</CardTitle>
                  <CardDescription>
                    Configure sync rules for each marketplace
                  </CardDescription>
                </div>
                <Button
                  onClick={handleCreateRule}
                  size="sm"
                  data-testid="button-add-rule"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {syncRules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No platform rules configured. Add a rule to customize sync behavior per marketplace.
                  </div>
                ) : (
                  syncRules.map((rule: any) => (
                    <Card key={rule.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={rule.isEnabled ? "default" : "secondary"}>
                              {rule.marketplace}
                            </Badge>
                            {!rule.isEnabled && (
                              <Badge variant="outline">Disabled</Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                updateRuleMutation.mutate({
                                  id: rule.id,
                                  data: { isEnabled: !rule.isEnabled }
                                });
                              }}
                              data-testid={`button-toggle-${rule.id}`}
                            >
                              {rule.isEnabled ? "Disable" : "Enable"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRuleMutation.mutate(rule.id)}
                              data-testid={`button-delete-${rule.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`price-adj-${rule.id}`}>
                              Price Adjustment (%)
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id={`price-adj-${rule.id}`}
                                type="number"
                                value={rule.priceAdjustment || "0"}
                                onChange={(e) => {
                                  updateRuleMutation.mutate({
                                    id: rule.id,
                                    data: { priceAdjustment: e.target.value }
                                  });
                                }}
                                className="w-24"
                                data-testid={`input-price-adj-${rule.id}`}
                              />
                              <span className="text-sm text-muted-foreground">%</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`priority-${rule.id}`}>
                              Priority
                            </Label>
                            <Input
                              id={`priority-${rule.id}`}
                              type="number"
                              value={rule.priority || 0}
                              onChange={(e) => {
                                updateRuleMutation.mutate({
                                  id: rule.id,
                                  data: { priority: parseInt(e.target.value) }
                                });
                              }}
                              className="w-24"
                              data-testid={`input-priority-${rule.id}`}
                            />
                          </div>
                        </div>
                        
                        {rule.priceFormula && (
                          <div className="space-y-2">
                            <Label>Custom Price Formula</Label>
                            <div className="flex items-center gap-2">
                              <Calculator className="h-4 w-4 text-muted-foreground" />
                              <code className="text-sm bg-muted px-2 py-1 rounded">
                                {rule.priceFormula}
                              </code>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}