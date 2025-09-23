import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, Edit, Play, Clock, Package, Calendar as CalendarIconSolid, Info } from "lucide-react";

const ruleFormSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  enabled: z.boolean().default(true),
  trigger: z.enum(["time_based", "inventory_based", "date_based"]),
  triggerValue: z.any(),
  marketplaces: z.array(z.string()).optional(),
  listingIds: z.array(z.string()).optional(),
});

type RuleFormData = z.infer<typeof ruleFormSchema>;

export default function AutoDelist() {
  const { toast } = useToast();
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);
  const [selectedListings, setSelectedListings] = useState<string[]>([]);
  const [applyToAll, setApplyToAll] = useState(true);

  // Fetch rules
  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ["/api/auto-delist/rules"],
  });

  // Fetch history
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["/api/auto-delist/history"],
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["/api/auto-delist/stats"],
  });

  // Fetch marketplaces
  const { data: marketplaces = [] } = useQuery({
    queryKey: ["/api/marketplaces"],
  });

  // Fetch listings (for selection)
  const { data: listings = [] } = useQuery({
    queryKey: ["/api/listings"],
  });

  const form = useForm<RuleFormData>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      name: "",
      enabled: true,
      trigger: "time_based",
      triggerValue: { days: 30 },
      marketplaces: [],
      listingIds: [],
    },
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (data: RuleFormData) => {
      return apiRequest("POST", "/api/auto-delist/rules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-delist/rules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auto-delist/stats"] });
      toast({
        title: "Rule created",
        description: "Auto-delist rule has been created successfully.",
      });
      setIsRuleDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create rule",
        variant: "destructive",
      });
    },
  });

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RuleFormData> }) => {
      return apiRequest("PATCH", `/api/auto-delist/rules/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-delist/rules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auto-delist/stats"] });
      toast({
        title: "Rule updated",
        description: "Auto-delist rule has been updated successfully.",
      });
      setIsRuleDialogOpen(false);
      setEditingRule(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update rule",
        variant: "destructive",
      });
    },
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/auto-delist/rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-delist/rules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auto-delist/stats"] });
      toast({
        title: "Rule deleted",
        description: "Auto-delist rule has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete rule",
        variant: "destructive",
      });
    },
  });

  // Trigger rule mutation
  const triggerRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/auto-delist/trigger/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-delist/history"] });
      toast({
        title: "Rule triggered",
        description: "Auto-delist rule has been triggered successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to trigger rule",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RuleFormData) => {
    const formData = {
      ...data,
      marketplaces: applyToAll ? undefined : selectedMarketplaces,
      listingIds: applyToAll ? undefined : selectedListings,
    };

    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, data: formData });
    } else {
      createRuleMutation.mutate(formData);
    }
  };

  const handleEditRule = (rule: any) => {
    setEditingRule(rule);
    form.reset({
      name: rule.name,
      enabled: rule.enabled,
      trigger: rule.trigger,
      triggerValue: rule.triggerValue,
    });
    setSelectedMarketplaces(rule.marketplaces || []);
    setSelectedListings(rule.listingIds || []);
    setApplyToAll(!rule.marketplaces && !rule.listingIds);
    setIsRuleDialogOpen(true);
  };

  const getTriggerIcon = (trigger: string) => {
    switch (trigger) {
      case "time_based":
        return <Clock className="w-4 h-4" />;
      case "inventory_based":
        return <Package className="w-4 h-4" />;
      case "date_based":
        return <CalendarIconSolid className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getTriggerDescription = (trigger: string, triggerValue: any) => {
    switch (trigger) {
      case "time_based":
        return `After ${triggerValue.days} days`;
      case "inventory_based":
        return `When quantity ≤ ${triggerValue.quantity}`;
      case "date_based":
        return `On ${format(new Date(triggerValue.date), "PPP")}`;
      default:
        return "";
    }
  };

  const connectedMarketplaces = (marketplaces as any[]).filter((m: any) => m.isConnected);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Auto-Delist</h1>
        <p className="text-muted-foreground mt-2">
          Automatically remove listings from marketplaces based on configurable rules
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Rules</p>
                <p className="text-2xl font-bold">{(stats as any)?.totalRules || 0}</p>
              </div>
              <Badge variant="outline" className="h-10 w-10 rounded-full p-0 flex items-center justify-center">
                <Info className="w-5 h-5" />
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold">{(stats as any)?.activeRules || 0}</p>
              </div>
              <Badge className="h-10 w-10 rounded-full p-0 flex items-center justify-center bg-green-100 text-green-800">
                <Play className="w-5 h-5" />
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recent Delists</p>
                <p className="text-2xl font-bold">{(stats as any)?.recentDelists || 0}</p>
              </div>
              <Badge variant="secondary" className="h-10 w-10 rounded-full p-0 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold">{(stats as any)?.scheduledDelists || 0}</p>
              </div>
              <Badge variant="outline" className="h-10 w-10 rounded-full p-0 flex items-center justify-center">
                <CalendarIconSolid className="w-5 h-5" />
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="rules" data-testid="tab-rules">Rules</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Auto-Delist Rules</CardTitle>
                  <CardDescription>Manage your automatic delisting rules</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingRule(null);
                    form.reset();
                    setIsRuleDialogOpen(true);
                  }}
                  data-testid="button-add-rule"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading rules...</div>
              ) : (rules as any[]).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No auto-delist rules configured. Click "Add Rule" to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {(rules as any[]).map((rule: any) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`rule-item-${rule.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getTriggerIcon(rule.trigger)}
                            <h3 className="font-semibold">{rule.name}</h3>
                          </div>
                          <Badge variant={rule.enabled ? "default" : "secondary"}>
                            {rule.enabled ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getTriggerDescription(rule.trigger, rule.triggerValue)}
                        </p>
                        {rule.marketplaces && rule.marketplaces.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">Marketplaces:</span>
                            {rule.marketplaces.map((m: string) => (
                              <Badge key={m} variant="outline" className="text-xs">
                                {m}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => triggerRuleMutation.mutate(rule.id)}
                          disabled={!rule.enabled}
                          data-testid={`button-trigger-${rule.id}`}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditRule(rule)}
                          data-testid={`button-edit-${rule.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteRuleMutation.mutate(rule.id)}
                          data-testid={`button-delete-${rule.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Delist History</CardTitle>
              <CardDescription>View past auto-delist actions</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading history...</div>
              ) : (history as any[]).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No auto-delist history available.
                </div>
              ) : (
                <div className="space-y-4">
                  {(history as any[]).map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`history-item-${item.id}`}
                    >
                      <div>
                        <p className="font-medium">Listing #{item.listingId?.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">{item.reason}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {item.marketplace}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(item.delistedAt), "PPp")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Rule Dialog */}
      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Rule" : "Create Auto-Delist Rule"}</DialogTitle>
            <DialogDescription>
              Configure when and how listings should be automatically removed from marketplaces.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Remove old listings" data-testid="input-rule-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Enable Rule</FormLabel>
                      <FormDescription>
                        Active rules will be processed automatically
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-enabled"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trigger"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trigger Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-trigger">
                          <SelectValue placeholder="Select trigger type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="time_based">Time-based (after X days)</SelectItem>
                        <SelectItem value="inventory_based">Inventory-based (when quantity reaches threshold)</SelectItem>
                        <SelectItem value="date_based">Date-based (on specific date)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("trigger") === "time_based" && (
                <FormField
                  control={form.control}
                  name="triggerValue.days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days After Listing</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          placeholder="30"
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            form.setValue("triggerValue", { days: value });
                          }}
                          data-testid="input-days"
                        />
                      </FormControl>
                      <FormDescription>
                        Delist items after this many days since creation
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch("trigger") === "inventory_based" && (
                <FormField
                  control={form.control}
                  name="triggerValue.quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity Threshold</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          placeholder="0"
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            form.setValue("triggerValue", { quantity: value });
                          }}
                          data-testid="input-quantity"
                        />
                      </FormControl>
                      <FormDescription>
                        Delist items when quantity reaches or falls below this value
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch("trigger") === "date_based" && (
                <FormField
                  control={form.control}
                  name="triggerValue.date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Delist Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                              data-testid="button-date-picker"
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => {
                              form.setValue("triggerValue", { date: date?.toISOString() });
                            }}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Automatically delist items on this date
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="apply-to-all"
                    checked={applyToAll}
                    onCheckedChange={(checked) => setApplyToAll(checked as boolean)}
                    data-testid="checkbox-apply-all"
                  />
                  <label
                    htmlFor="apply-to-all"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Apply to all marketplaces and listings
                  </label>
                </div>

                {!applyToAll && (
                  <>
                    <FormItem>
                      <FormLabel>Select Marketplaces</FormLabel>
                      <div className="grid grid-cols-2 gap-3">
                        {connectedMarketplaces.map((marketplace: any) => (
                          <div key={marketplace.marketplace} className="flex items-center space-x-2">
                            <Checkbox
                              id={`marketplace-${marketplace.marketplace}`}
                              checked={selectedMarketplaces.includes(marketplace.marketplace)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedMarketplaces([...selectedMarketplaces, marketplace.marketplace]);
                                } else {
                                  setSelectedMarketplaces(selectedMarketplaces.filter(m => m !== marketplace.marketplace));
                                }
                              }}
                              data-testid={`checkbox-marketplace-${marketplace.marketplace}`}
                            />
                            <label
                              htmlFor={`marketplace-${marketplace.marketplace}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {marketplace.marketplace}
                            </label>
                          </div>
                        ))}
                      </div>
                    </FormItem>

                    {(listings as any[]).length > 0 && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          You can also select specific listings. Leave empty to apply to all listings.
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsRuleDialogOpen(false);
                    setEditingRule(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
                  data-testid="button-save-rule"
                >
                  {editingRule ? "Update Rule" : "Create Rule"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}