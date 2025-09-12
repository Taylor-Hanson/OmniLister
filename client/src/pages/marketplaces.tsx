import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MarketplaceConnectionModal } from "@/components/MarketplaceConnectionModal";
import { 
  marketplaces, 
  marketplaceCategories, 
  getMarketplacesByCategory, 
  getPopularMarketplaces,
  type MarketplaceConfig,
  type MarketplaceCategory 
} from "@shared/marketplaceConfig";
import { format } from "date-fns";
import { Search, Check, X, AlertCircle, ArrowRight, Sparkles, Clock } from "lucide-react";

export default function Marketplaces() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMarketplace, setSelectedMarketplace] = useState<MarketplaceConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "popular" | MarketplaceCategory>("popular");

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['/api/marketplaces'],
    enabled: !!user,
  });

  const disconnectMutation = useMutation({
    mutationFn: async (marketplaceId: string) => {
      const response = await apiRequest("DELETE", `/api/marketplaces/${marketplaceId}`);
      return response.json();
    },
    onSuccess: (data, marketplaceId) => {
      toast({
        title: "Marketplace disconnected",
        description: `Successfully disconnected from ${marketplaces[marketplaceId]?.name}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
    },
    onError: (error: any) => {
      toast({
        title: "Disconnection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (marketplaceId: string) => {
      const response = await apiRequest("POST", `/api/marketplaces/${marketplaceId}/test`);
      return response.json();
    },
    onSuccess: (data, marketplaceId) => {
      toast({
        title: "Connection test",
        description: `${marketplaces[marketplaceId]?.name} connection is ${data.isValid ? 'working' : 'not working'}.`,
        variant: data.isValid ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConnect = (marketplace: MarketplaceConfig) => {
    setSelectedMarketplace(marketplace);
    setIsModalOpen(true);
  };

  const handleDisconnect = async (marketplaceId: string) => {
    if (confirm(`Are you sure you want to disconnect from ${marketplaces[marketplaceId]?.name}?`)) {
      await disconnectMutation.mutateAsync(marketplaceId);
    }
  };

  const isConnected = (marketplaceId: string) => {
    return connections.find((c: any) => c.marketplace === marketplaceId && c.isConnected);
  };

  const getConnectionInfo = (marketplaceId: string) => {
    return connections.find((c: any) => c.marketplace === marketplaceId);
  };

  const getFilteredMarketplaces = (): MarketplaceConfig[] => {
    let filtered: MarketplaceConfig[] = [];
    
    if (activeTab === "all") {
      filtered = Object.values(marketplaces);
    } else if (activeTab === "popular") {
      filtered = getPopularMarketplaces();
    } else {
      filtered = getMarketplacesByCategory(activeTab as MarketplaceCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const renderMarketplaceCard = (marketplace: MarketplaceConfig) => {
    const connected = isConnected(marketplace.id);
    const connectionInfo = getConnectionInfo(marketplace.id);
    
    return (
      <Card 
        key={marketplace.id} 
        className="relative overflow-hidden hover:shadow-lg transition-shadow"
        data-testid={`card-marketplace-${marketplace.id}`}
      >
        {marketplace.comingSoon && (
          <div className="absolute top-2 right-2 z-10">
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              <Clock className="w-3 h-3 mr-1" />
              Coming Soon
            </Badge>
          </div>
        )}
        
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`${marketplace.color} text-white p-3 rounded-lg`}>
                <i className={`${marketplace.icon} text-xl`}></i>
              </div>
              <div>
                <CardTitle className="text-lg">{marketplace.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {marketplace.description}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Features */}
          <div className="flex flex-wrap gap-1.5">
            {marketplace.features.slice(0, 3).map((feature) => (
              <Badge key={feature} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {connected ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600 font-medium">Connected</span>
                </>
              ) : (
                <>
                  <X className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-muted-foreground">Not connected</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {marketplace.apiAvailable && (
                <Badge variant="outline" className="text-xs">
                  API
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {marketplace.authType.replace('_', ' ')}
              </Badge>
            </div>
          </div>

          {/* Last Sync Info */}
          {connected && connectionInfo?.lastSyncAt && (
            <div className="text-xs text-muted-foreground">
              Last synced: {format(new Date(connectionInfo.lastSyncAt), "MMM d, h:mm a")}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {connected ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => testConnectionMutation.mutate(marketplace.id)}
                  data-testid={`button-test-${marketplace.id}`}
                >
                  Test Connection
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-red-600 hover:text-red-700"
                  onClick={() => handleDisconnect(marketplace.id)}
                  data-testid={`button-disconnect-${marketplace.id}`}
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="w-full"
                onClick={() => handleConnect(marketplace)}
                disabled={marketplace.comingSoon}
                data-testid={`button-connect-${marketplace.id}`}
              >
                {marketplace.comingSoon ? (
                  "Coming Soon"
                ) : (
                  <>
                    Connect
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading marketplaces...</p>
        </div>
      </div>
    );
  }

  const connectedCount = connections.filter((c: any) => c.isConnected).length;
  const totalCount = Object.keys(marketplaces).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Marketplace Connections</h1>
            <p className="text-muted-foreground mt-1">
              Connect your accounts to crosslist items across multiple platforms
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{connectedCount}/{totalCount}</p>
            <p className="text-sm text-muted-foreground">Connected</p>
          </div>
        </div>

        {/* Stats Alert */}
        {connectedCount === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Connect at least one marketplace to start crosslisting your items. 
              We recommend starting with popular platforms like eBay, Poshmark, or Mercari.
            </AlertDescription>
          </Alert>
        )}

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search marketplaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid grid-cols-5 lg:grid-cols-11 h-auto p-1">
          <TabsTrigger value="popular" className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Popular
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
          {Object.entries(marketplaceCategories).map(([key, category]) => (
            <TabsTrigger key={key} value={key} className="text-xs">
              <i className={`${category.icon} mr-1`}></i>
              <span className="hidden lg:inline">{category.name.split(' ')[0]}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {activeTab !== "all" && activeTab !== "popular" && (
            <div className="mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <i className={marketplaceCategories[activeTab as MarketplaceCategory].icon}></i>
                {marketplaceCategories[activeTab as MarketplaceCategory].name}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {marketplaceCategories[activeTab as MarketplaceCategory].description}
              </p>
            </div>
          )}

          {/* Marketplace Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {getFilteredMarketplaces().map(renderMarketplaceCard)}
          </div>

          {getFilteredMarketplaces().length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery 
                  ? `No marketplaces found matching "${searchQuery}"`
                  : "No marketplaces available in this category"}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Connection Modal */}
      <MarketplaceConnectionModal
        marketplace={selectedMarketplace}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedMarketplace(null);
        }}
      />
    </div>
  );
}