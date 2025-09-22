import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Zap, 
  Target,
  Settings,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { marketplaceConfig, type MarketplaceConfig } from '../../../shared/marketplaceConfig';

interface MarketplaceConnection {
  marketplace: string;
  isConnected: boolean;
  lastSyncAt?: string;
  accessToken?: string;
  credentials?: any;
}

interface CrossPostingJob {
  id: string;
  listingId: string;
  marketplaces: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  results: Array<{
    marketplace: string;
    status: 'success' | 'failed' | 'pending';
    externalId?: string;
    externalUrl?: string;
    error?: string;
  }>;
  createdAt: string;
  completedAt?: string;
}

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  images: string[];
  status: 'draft' | 'active' | 'sold' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export default function CrossPostingManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [activeJob, setActiveJob] = useState<CrossPostingJob | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customSettings, setCustomSettings] = useState<Record<string, any>>({});

  // Fetch marketplace connections
  const { data: connections = [], isLoading: isLoadingConnections } = useQuery({
    queryKey: ['/api/marketplaces'],
    enabled: !!user,
  });

  // Fetch user's listings
  const { data: listings = [], isLoading: isLoadingListings } = useQuery({
    queryKey: ['/api/listings'],
    enabled: !!user,
  });

  // Fetch active cross-posting jobs
  const { data: activeJobs = [], refetch: refetchJobs } = useQuery({
    queryKey: ['/api/jobs/cross-posting'],
    enabled: !!user,
    refetchInterval: 2000, // Poll every 2 seconds for updates
  });

  // Get connected marketplaces
  const connectedMarketplaces = connections.filter((conn: MarketplaceConnection) => conn.isConnected);
  const availableMarketplaces = connectedMarketplaces.map(conn => marketplaceConfig[conn.marketplace]).filter(Boolean);

  // Cross-posting mutation
  const crossPostMutation = useMutation({
    mutationFn: async ({ listingId, marketplaces, settings }: { 
      listingId: string; 
      marketplaces: string[];
      settings?: Record<string, any>;
    }) => {
      const response = await apiRequest("POST", "/api/jobs/cross-posting", {
        listingId,
        marketplaces,
        settings: settings || {}
      });
      return response.json();
    },
    onSuccess: (job) => {
      toast({
        title: "Cross-posting started!",
        description: `Your listing is being posted to ${selectedMarketplaces.length} marketplace(s).`,
      });
      setActiveJob(job);
      setIsPosting(true);
      refetchJobs();
    },
    onError: (error: any) => {
      toast({
        title: "Cross-posting failed",
        description: error.message || "Failed to start cross-posting",
        variant: "destructive",
      });
      setIsPosting(false);
    },
  });

  // Handle marketplace selection
  const handleMarketplaceToggle = (marketplaceId: string) => {
    setSelectedMarketplaces(prev => 
      prev.includes(marketplaceId) 
        ? prev.filter(id => id !== marketplaceId)
        : [...prev, marketplaceId]
    );
  };

  // Handle select all connected marketplaces
  const handleSelectAll = () => {
    if (selectedMarketplaces.length === availableMarketplaces.length) {
      setSelectedMarketplaces([]);
    } else {
      setSelectedMarketplaces(availableMarketplaces.map(mp => mp.id));
    }
  };

  // Handle cross-posting
  const handleCrossPost = async () => {
    if (!selectedListing || selectedMarketplaces.length === 0) {
      toast({
        title: "Missing information",
        description: "Please select a listing and at least one marketplace.",
        variant: "destructive",
      });
      return;
    }

    setIsPosting(true);
    try {
      await crossPostMutation.mutateAsync({
        listingId: selectedListing.id,
        marketplaces: selectedMarketplaces,
        settings: customSettings
      });
    } catch (error) {
      // Error handled in mutation
    }
  };

  // Get marketplace status badge
  const getMarketplaceStatus = (marketplaceId: string) => {
    const connection = connections.find((conn: MarketplaceConnection) => conn.marketplace === marketplaceId);
    if (!connection) return { status: 'disconnected', color: 'destructive' };
    if (connection.isConnected) return { status: 'connected', color: 'default' };
    return { status: 'disconnected', color: 'destructive' };
  };

  // Get job progress percentage
  const getJobProgress = (job: CrossPostingJob) => {
    if (job.progress.total === 0) return 0;
    return Math.round((job.progress.completed / job.progress.total) * 100);
  };

  // Get job status color
  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'processing': return 'text-blue-600';
      case 'partial': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoadingConnections || isLoadingListings) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cross-Posting Manager</h1>
          <p className="text-muted-foreground">
            Post your listings to multiple marketplaces simultaneously
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {connectedMarketplaces.length} connected
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </Button>
        </div>
      </div>

      {/* Connection Status Alert */}
      {connectedMarketplaces.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You need to connect to at least one marketplace before you can cross-post. 
            <Button variant="link" className="p-0 h-auto ml-1" asChild>
              <a href="/marketplaces">Connect marketplaces</a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Listing Selection */}
        <div className="space-y-6">
          {/* Listing Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Select Listing
              </CardTitle>
              <CardDescription>
                Choose which listing you want to cross-post
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedListing?.id || ''}
                onValueChange={(value) => {
                  const listing = listings.find((l: Listing) => l.id === value);
                  setSelectedListing(listing || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a listing to cross-post" />
                </SelectTrigger>
                <SelectContent>
                  {listings.map((listing: Listing) => (
                    <SelectItem key={listing.id} value={listing.id}>
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate">{listing.title}</span>
                        <Badge variant="outline" className="ml-2">
                          ${listing.price}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedListing && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium">{selectedListing.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {selectedListing.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="font-medium">${selectedListing.price}</span>
                    <Badge variant="outline">{selectedListing.category}</Badge>
                    <Badge variant="outline">{selectedListing.condition}</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Marketplace Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Select Marketplaces
              </CardTitle>
              <CardDescription>
                Choose which marketplaces to post to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedMarketplaces.length === availableMarketplaces.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Badge variant="secondary">
                  {selectedMarketplaces.length} selected
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                {availableMarketplaces.map((marketplace: MarketplaceConfig) => {
                  const status = getMarketplaceStatus(marketplace.id);
                  return (
                    <div
                      key={marketplace.id}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <Checkbox
                        id={marketplace.id}
                        checked={selectedMarketplaces.includes(marketplace.id)}
                        onCheckedChange={() => handleMarketplaceToggle(marketplace.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={marketplace.id}
                            className="font-medium cursor-pointer"
                          >
                            {marketplace.name}
                          </Label>
                          <Badge variant={status.color as any} className="text-xs">
                            {status.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {marketplace.description}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          {marketplace.features.slice(0, 2).map((feature, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Active Jobs & Settings */}
        <div className="space-y-6">
          {/* Active Cross-Posting Jobs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Active Jobs
              </CardTitle>
              <CardDescription>
                Monitor your cross-posting progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active cross-posting jobs</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeJobs.map((job: CrossPostingJob) => (
                    <div key={job.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Job #{job.id.slice(-8)}</span>
                          <Badge className={getJobStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {job.progress.completed}/{job.progress.total} completed
                        </span>
                      </div>
                      
                      <Progress value={getJobProgress(job)} className="mb-3" />
                      
                      <div className="space-y-2">
                        {job.results.map((result, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span>{marketplaceConfig[result.marketplace]?.name || result.marketplace}</span>
                            <div className="flex items-center gap-2">
                              {result.status === 'success' && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                              {result.status === 'failed' && (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              {result.status === 'pending' && (
                                <Clock className="h-4 w-4 text-yellow-600" />
                              )}
                              {result.externalUrl && (
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={result.externalUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          {showAdvanced && (
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>
                  Customize cross-posting behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="delay">Posting Delay (seconds)</Label>
                  <Input
                    id="delay"
                    type="number"
                    min="0"
                    max="300"
                    value={customSettings.delay || 0}
                    onChange={(e) => setCustomSettings(prev => ({
                      ...prev,
                      delay: parseInt(e.target.value) || 0
                    }))}
                    placeholder="0"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Delay between posts to avoid rate limiting
                  </p>
                </div>

                <div>
                  <Label htmlFor="retryAttempts">Retry Attempts</Label>
                  <Input
                    id="retryAttempts"
                    type="number"
                    min="0"
                    max="5"
                    value={customSettings.retryAttempts || 2}
                    onChange={(e) => setCustomSettings(prev => ({
                      ...prev,
                      retryAttempts: parseInt(e.target.value) || 2
                    }))}
                    placeholder="2"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoOptimize"
                    checked={customSettings.autoOptimize || false}
                    onCheckedChange={(checked) => setCustomSettings(prev => ({
                      ...prev,
                      autoOptimize: checked
                    }))}
                  />
                  <Label htmlFor="autoOptimize">Auto-optimize for each marketplace</Label>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <div className="text-sm text-muted-foreground">
          {selectedMarketplaces.length > 0 && selectedListing && (
            <span>
              Ready to post "{selectedListing.title}" to {selectedMarketplaces.length} marketplace(s)
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedMarketplaces([]);
              setSelectedListing(null);
              setCustomSettings({});
            }}
          >
            Clear Selection
          </Button>
          <Button
            onClick={handleCrossPost}
            disabled={!selectedListing || selectedMarketplaces.length === 0 || isPosting}
            className="min-w-[140px]"
          >
            {isPosting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Cross-Post Now
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
