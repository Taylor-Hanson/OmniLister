import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow, isAfter, isBefore, addDays } from "date-fns";
import { 
  Calendar as CalendarIcon, Clock, Play, Pause, Trash2, Edit, 
  Plus, RefreshCw, AlertTriangle, CheckCircle, XCircle, Copy
} from "lucide-react";

interface AutomationSchedule {
  id: string;
  marketplace: string;
  automationType: string;
  name: string;
  description?: string;
  schedule: {
    type: 'once' | 'recurring' | 'interval';
    startDate: string;
    endDate?: string;
    time?: string;
    interval?: number; // minutes
    daysOfWeek?: string[];
    daysOfMonth?: number[];
    timezone: string;
  };
  config: any;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  stats?: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    averageDuration: number;
  };
}

export default function AutomationSchedules() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<AutomationSchedule | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');

  // New schedule form state
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    marketplace: '',
    automationType: '',
    scheduleType: 'recurring',
    startDate: new Date(),
    endDate: undefined as Date | undefined,
    time: '09:00',
    interval: 60,
    daysOfWeek: [] as string[],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  // Fetch schedules
  const { data: schedules = [], isLoading } = useQuery<AutomationSchedule[]>({
    queryKey: ['/api/automation/schedules'],
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: (schedule: any) =>
      apiRequest('/api/automation/schedules', {
        method: 'POST',
        body: JSON.stringify(schedule)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/schedules'] });
      toast({
        title: "Schedule Created",
        description: "Automation schedule has been created successfully"
      });
      setShowCreateDialog(false);
      resetNewSchedule();
    }
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: (data: { id: string; schedule: any }) =>
      apiRequest(`/api/automation/schedules/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data.schedule)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/schedules'] });
      toast({
        title: "Schedule Updated",
        description: "Automation schedule has been updated"
      });
    }
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/automation/schedules/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/schedules'] });
      toast({
        title: "Schedule Deleted",
        description: "Automation schedule has been deleted"
      });
    }
  });

  // Toggle schedule mutation
  const toggleScheduleMutation = useMutation({
    mutationFn: (data: { id: string; enabled: boolean }) =>
      apiRequest(`/api/automation/schedules/${data.id}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enabled: data.enabled })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/schedules'] });
    }
  });

  const resetNewSchedule = () => {
    setNewSchedule({
      name: '',
      marketplace: '',
      automationType: '',
      scheduleType: 'recurring',
      startDate: new Date(),
      endDate: undefined,
      time: '09:00',
      interval: 60,
      daysOfWeek: [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  };

  const handleCreateSchedule = () => {
    const schedule = {
      name: newSchedule.name,
      marketplace: newSchedule.marketplace,
      automationType: newSchedule.automationType,
      schedule: {
        type: newSchedule.scheduleType,
        startDate: newSchedule.startDate.toISOString(),
        endDate: newSchedule.endDate?.toISOString(),
        time: newSchedule.time,
        interval: newSchedule.interval,
        daysOfWeek: newSchedule.daysOfWeek,
        timezone: newSchedule.timezone,
      }
    };
    createScheduleMutation.mutate(schedule);
  };

  const handleDuplicateSchedule = (schedule: AutomationSchedule) => {
    const duplicate = {
      ...schedule,
      name: `${schedule.name} (Copy)`,
      enabled: false,
    };
    createScheduleMutation.mutate(duplicate);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getAutomationTypeIcon = (type: string) => {
    switch (type) {
      case 'share': return '🔄';
      case 'follow': return '👥';
      case 'offer': return '💰';
      case 'bump': return '⬆️';
      case 'relist': return '📋';
      default: return '⚡';
    }
  };

  const marketplaces = [
    { value: 'poshmark', label: 'Poshmark' },
    { value: 'mercari', label: 'Mercari' },
    { value: 'depop', label: 'Depop' },
    { value: 'grailed', label: 'Grailed' },
    { value: 'ebay', label: 'eBay' },
  ];

  const automationTypes = [
    { value: 'share', label: 'Share Items' },
    { value: 'follow', label: 'Follow Users' },
    { value: 'offer', label: 'Send Offers' },
    { value: 'bump', label: 'Bump Listings' },
    { value: 'relist', label: 'Relist Items' },
    { value: 'price_drop', label: 'Price Drops' },
  ];

  const daysOfWeek = [
    { value: 'mon', label: 'Monday' },
    { value: 'tue', label: 'Tuesday' },
    { value: 'wed', label: 'Wednesday' },
    { value: 'thu', label: 'Thursday' },
    { value: 'fri', label: 'Friday' },
    { value: 'sat', label: 'Saturday' },
    { value: 'sun', label: 'Sunday' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            Automation Schedules
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage when and how your automations run
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              data-testid="button-view-list"
            >
              List
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              data-testid="button-view-calendar"
            >
              Calendar
            </Button>
          </div>

          {/* Create Schedule Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-schedule">
                <Plus className="mr-2 h-4 w-4" />
                Create Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Automation Schedule</DialogTitle>
                <DialogDescription>
                  Set up a new automated task schedule
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Basic Info */}
                <div className="space-y-2">
                  <Label>Schedule Name</Label>
                  <Input
                    placeholder="e.g., Morning Share Routine"
                    value={newSchedule.name}
                    onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                    data-testid="input-schedule-name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Marketplace</Label>
                    <Select 
                      value={newSchedule.marketplace}
                      onValueChange={(value) => setNewSchedule({ ...newSchedule, marketplace: value })}
                    >
                      <SelectTrigger data-testid="select-marketplace">
                        <SelectValue placeholder="Select marketplace" />
                      </SelectTrigger>
                      <SelectContent>
                        {marketplaces.map(m => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Automation Type</Label>
                    <Select 
                      value={newSchedule.automationType}
                      onValueChange={(value) => setNewSchedule({ ...newSchedule, automationType: value })}
                    >
                      <SelectTrigger data-testid="select-automation-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {automationTypes.map(t => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Schedule Type */}
                <div className="space-y-2">
                  <Label>Schedule Type</Label>
                  <Tabs value={newSchedule.scheduleType} onValueChange={(value) => 
                    setNewSchedule({ ...newSchedule, scheduleType: value })
                  }>
                    <TabsList className="grid grid-cols-3 w-full">
                      <TabsTrigger value="once">Once</TabsTrigger>
                      <TabsTrigger value="recurring">Recurring</TabsTrigger>
                      <TabsTrigger value="interval">Interval</TabsTrigger>
                    </TabsList>

                    <TabsContent value="once" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Date</Label>
                          <Calendar
                            mode="single"
                            selected={newSchedule.startDate}
                            onSelect={(date) => setNewSchedule({ ...newSchedule, startDate: date || new Date() })}
                            className="rounded-md border"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Time</Label>
                          <Input
                            type="time"
                            value={newSchedule.time}
                            onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="recurring" className="space-y-4">
                      <div className="space-y-2">
                        <Label>Days of Week</Label>
                        <div className="grid grid-cols-7 gap-2">
                          {daysOfWeek.map(day => (
                            <div key={day.value} className="flex items-center space-x-1">
                              <Checkbox
                                checked={newSchedule.daysOfWeek.includes(day.value)}
                                onCheckedChange={(checked) => {
                                  const updated = checked
                                    ? [...newSchedule.daysOfWeek, day.value]
                                    : newSchedule.daysOfWeek.filter(d => d !== day.value);
                                  setNewSchedule({ ...newSchedule, daysOfWeek: updated });
                                }}
                              />
                              <Label className="text-xs">{day.label.slice(0, 3)}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Time</Label>
                          <Input
                            type="time"
                            value={newSchedule.time}
                            onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Timezone</Label>
                          <Input
                            value={newSchedule.timezone}
                            disabled
                            className="text-muted-foreground"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start Date</Label>
                          <Input
                            type="date"
                            value={format(newSchedule.startDate, 'yyyy-MM-dd')}
                            onChange={(e) => setNewSchedule({ ...newSchedule, startDate: new Date(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Date (Optional)</Label>
                          <Input
                            type="date"
                            value={newSchedule.endDate ? format(newSchedule.endDate, 'yyyy-MM-dd') : ''}
                            onChange={(e) => setNewSchedule({ 
                              ...newSchedule, 
                              endDate: e.target.value ? new Date(e.target.value) : undefined 
                            })}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="interval" className="space-y-4">
                      <div className="space-y-2">
                        <Label>Run Every</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={newSchedule.interval}
                            onChange={(e) => setNewSchedule({ ...newSchedule, interval: parseInt(e.target.value) })}
                            className="w-24"
                          />
                          <span>minutes</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start Date</Label>
                          <Input
                            type="date"
                            value={format(newSchedule.startDate, 'yyyy-MM-dd')}
                            onChange={(e) => setNewSchedule({ ...newSchedule, startDate: new Date(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Date (Optional)</Label>
                          <Input
                            type="date"
                            value={newSchedule.endDate ? format(newSchedule.endDate, 'yyyy-MM-dd') : ''}
                            onChange={(e) => setNewSchedule({ 
                              ...newSchedule, 
                              endDate: e.target.value ? new Date(e.target.value) : undefined 
                            })}
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateSchedule}
                    disabled={!newSchedule.name || !newSchedule.marketplace || !newSchedule.automationType}
                    data-testid="button-save-schedule"
                  >
                    Create Schedule
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Schedule List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                Loading schedules...
              </CardContent>
            </Card>
          ) : schedules.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Schedules Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first automation schedule to get started
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Schedule
                </Button>
              </CardContent>
            </Card>
          ) : (
            schedules.map(schedule => (
              <Card key={schedule.id} data-testid={`schedule-${schedule.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{getAutomationTypeIcon(schedule.automationType)}</div>
                      <div>
                        <CardTitle className="text-lg">{schedule.name}</CardTitle>
                        <CardDescription>
                          {schedule.marketplace} • {schedule.automationType}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(schedule.status)}>
                        {schedule.status}
                      </Badge>
                      <Switch
                        checked={schedule.enabled}
                        onCheckedChange={(checked) => 
                          toggleScheduleMutation.mutate({ id: schedule.id, enabled: checked })
                        }
                        data-testid={`switch-schedule-${schedule.id}`}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Schedule Type</p>
                      <p className="font-medium">{schedule.schedule.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Next Run</p>
                      <p className="font-medium">
                        {schedule.nextRun 
                          ? formatDistanceToNow(new Date(schedule.nextRun), { addSuffix: true })
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Run</p>
                      <p className="font-medium">
                        {schedule.lastRun 
                          ? formatDistanceToNow(new Date(schedule.lastRun), { addSuffix: true })
                          : 'Never'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                      <p className="font-medium">
                        {schedule.stats 
                          ? `${Math.round((schedule.stats.successfulRuns / schedule.stats.totalRuns) * 100)}%`
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Schedule Details */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Clock className="h-4 w-4" />
                    {schedule.schedule.type === 'recurring' && (
                      <span>
                        Runs {schedule.schedule.daysOfWeek?.join(', ')} at {schedule.schedule.time}
                      </span>
                    )}
                    {schedule.schedule.type === 'interval' && (
                      <span>
                        Runs every {schedule.schedule.interval} minutes
                      </span>
                    )}
                    {schedule.schedule.type === 'once' && (
                      <span>
                        Runs once on {format(new Date(schedule.schedule.startDate), 'PPP')} at {schedule.schedule.time}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingSchedule(schedule)}
                      data-testid={`button-edit-${schedule.id}`}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicateSchedule(schedule)}
                      data-testid={`button-duplicate-${schedule.id}`}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                      data-testid={`button-delete-${schedule.id}`}
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
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
              <div>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Schedules for {selectedDate ? format(selectedDate, 'PPP') : 'Today'}
                </h3>
                <div className="space-y-2">
                  {schedules
                    .filter(schedule => {
                      // Filter schedules that run on selected date
                      if (!selectedDate) return false;
                      // Add your date filtering logic here
                      return true;
                    })
                    .map(schedule => (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="text-lg">{getAutomationTypeIcon(schedule.automationType)}</div>
                          <div>
                            <p className="font-medium">{schedule.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {schedule.marketplace} • {schedule.schedule.time || 'All day'}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(schedule.status)}>
                          {schedule.status}
                        </Badge>
                      </div>
                    ))
                  }
                  {schedules.filter(s => true).length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No schedules for this date
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Schedules run in your local timezone. Make sure your marketplace settings align with your schedule times for optimal performance.
        </AlertDescription>
      </Alert>
    </div>
  );
}