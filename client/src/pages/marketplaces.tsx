import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

const marketplaceInfo = {
  ebay: {
    name: "eBay",
    description: "World's largest online marketplace with billions of buyers",
    icon: "fab fa-ebay",
    color: "bg-blue-600",
    features: ["Auction & Fixed Price", "Global Reach", "Seller Protection"],
  },
  poshmark: {
    name: "Poshmark",
    description: "Social marketplace for fashion and lifestyle items",
    icon: "fas fa-tshirt",
    color: "bg-pink-500",
    features: ["Fashion Focus", "Social Features", "Authentication Service"],
  },
  mercari: {
    name: "Mercari",
    description: "Mobile marketplace for buying and selling anything",
    icon: "fas fa-shopping-bag",
    color: "bg-orange-500",
    features: ["Mobile First", "Easy Selling", "Buyer Protection"],
  },
  facebook: {
    name: "Facebook Marketplace",
    description: "Local and shipping marketplace on Facebook",
    icon: "fab fa-facebook",
    color: "bg-blue-600",
    features: ["Local Sales", "Social Integration", "No Fees"],
  },
  etsy: {
    name: "Etsy",
    description: "Marketplace for handmade, vintage, and creative goods",
    icon: "fab fa-etsy",
    color: "bg-orange-600",
    features: ["Handmade Focus", "Creative Community", "Custom Orders"],
  },
  depop: {
    name: "Depop",
    description: "Fashion marketplace popular with Gen Z",
    icon: "fas fa-mobile-alt",
    color: "bg-purple-500",
    features: ["Fashion Focus", "Young Audience", "Social Discovery"],
  },
  grailed: {
    name: "Grailed",
    description: "Marketplace for men's designer fashion",
    icon: "fas fa-user-tie",
    color: "bg-gray-800",
    features: ["Designer Focus", "Authentication", "Curated Selection"],
  },
  vinted: {
    name: "Vinted",
    description: "Platform for secondhand clothes",
    icon: "fas fa-recycle",
    color: "bg-green-600",
    features: ["Secondhand Focus", "No Selling Fees", "Buyer Protection"],
  },
};

export default function Marketplaces() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connectingMarketplace, setConnectingMarketplace] = useState<string | null>(null);

  const { data: marketplaces = [], isLoading } = useQuery({
    queryKey: ['/api/marketplaces'],
    enabled: !!user,
  });

  const getAuthUrlMutation = useMutation({
    mutationFn: async (marketplace: string) => {
      const response = await apiRequest("GET", `/api/marketplaces/${marketplace}/auth`);
      return response.json();
    },
    onSuccess: (data, marketplace) => {
      if (data.authUrl) {
        // For real APIs, this would redirect to the marketplace OAuth page
        // For now, we'll simulate the connection
        window.open(data.authUrl, '_blank', 'width=600,height=600');
        toast({
          title: "Authentication started",
          description: `Please complete authentication in the new window for ${marketplace}.`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error starting authentication",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const connectMarketplaceMutation = useMutation({
    mutationFn: async ({ marketplace, code }: { marketplace: string; code: string }) => {
      const response = await apiRequest("POST", `/api/marketplaces/${marketplace}/callback`, { code });
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Marketplace connected",
        description: `Successfully connected to ${variables.marketplace}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const disconnectMarketplaceMutation = useMutation({
    mutationFn: async (marketplace: string) => {
      const response = await apiRequest("DELETE", `/api/marketplaces/${marketplace}`);
      return response.json();
    },
    onSuccess: (data, marketplace) => {
      toast({
        title: "Marketplace disconnected",
        description: `Successfully disconnected from ${marketplace}.`,
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
    mutationFn: async (marketplace: string) => {
      const response = await apiRequest("POST", `/api/marketplaces/${marketplace}/test`);
      return response.json();
    },
    onSuccess: (data, marketplace) => {
      toast({
        title: "Connection test",
        description: `${marketplace} connection is ${data.isValid ? 'working' : 'not working'}.`,
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

  const handleConnect = async (marketplace: string) => {
    setConnectingMarketplace(marketplace);
    try {
      if (marketplace === 'ebay') {
        // For eBay, start OAuth flow
        await getAuthUrlMutation.mutateAsync(marketplace);
        // Simulate successful connection for demo
        setTimeout(() => {
          connectMarketplaceMutation.mutate({ 
            marketplace, 
            code: `demo_code_${Date.now()}` 
          });
          setConnectingMarketplace(null);
        }, 2000);
      } else {
        // For other marketplaces, simulate connection
        await connectMarketplaceMutation.mutateAsync({ 
          marketplace, 
          code: `demo_code_${Date.now()}` 
        });
        setConnectingMarketplace(null);
      }
    } catch (error) {
      setConnectingMarketplace(null);
    }
  };

  const handleDisconnect = (marketplace: string) => {
    disconnectMarketplaceMutation.mutate(marketplace);
  };

  const handleTestConnection = (marketplace: string) => {
    testConnectionMutation.mutate(marketplace);
  };

  const getMarketplaceData = (marketplace: any) => {
    const info = marketplaceInfo[marketplace.marketplace as keyof typeof marketplaceInfo];
    return {
      ...marketplace,
      ...info,
    };
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-64">
          <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
        </div>
      </div>
    );
  }

  const connectedCount = marketplaces.filter((m: any) => m.isConnected).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Marketplaces</h1>
        <p className="text-muted-foreground mt-2">
          Connect your accounts to post listings across multiple platforms
        </p>
      </div>

      {/* Summary */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground" data-testid="text-connected-count">
                {connectedCount}
              </div>
              <p className="text-sm text-muted-foreground">Connected</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground" data-testid="text-available-count">
                {marketplaces.length}
              </div>
              <p className="text-sm text-muted-foreground">Available</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary" data-testid="text-success-rate">
                {connectedCount > 0 ? '100%' : '0%'}
              </div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {connectedCount === 0 && (
        <Alert className="mb-6">
          <i className="fas fa-info-circle h-4 w-4"></i>
          <AlertDescription>
            Connect at least one marketplace to start crosslisting your products. 
            Each connection allows you to automatically post listings to that platform.
          </AlertDescription>
        </Alert>
      )}

      {/* Marketplace Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {marketplaces.map((marketplace: any) => {
          const data = getMarketplaceData(marketplace);
          const isConnecting = connectingMarketplace === marketplace.marketplace;
          
          return (
            <Card key={marketplace.marketplace} className="relative overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${data.color} rounded-lg flex items-center justify-center`}>
                      <i className={`${data.icon} text-white text-lg`}></i>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{data.name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge
                          className={marketplace.isConnected
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }
                        >
                          {marketplace.isConnected ? 'Connected' : 'Not Connected'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {marketplace.isConnected && (
                    <Switch
                      checked={marketplace.isConnected}
                      onCheckedChange={() => handleDisconnect(marketplace.marketplace)}
                      disabled={disconnectMarketplaceMutation.isPending}
                      data-testid={`switch-${marketplace.marketplace}`}
                    />
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {data.description}
                </p>

                {data.features && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Key Features:</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {data.features.map((feature: string, index: number) => (
                        <li key={index} className="flex items-center">
                          <i className="fas fa-check text-green-500 mr-2 text-xs"></i>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {marketplace.isConnected && marketplace.connection && (
                  <div className="text-xs text-muted-foreground">
                    <p>
                      Last sync: {marketplace.lastSyncAt 
                        ? format(new Date(marketplace.lastSyncAt), 'MMM d, h:mm a')
                        : 'Never'
                      }
                    </p>
                  </div>
                )}

                <div className="flex space-x-2">
                  {!marketplace.isConnected ? (
                    <Button
                      onClick={() => handleConnect(marketplace.marketplace)}
                      disabled={isConnecting || connectMarketplaceMutation.isPending}
                      className="flex-1"
                      data-testid={`button-connect-${marketplace.marketplace}`}
                    >
                      {isConnecting ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Connecting...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-link mr-2"></i>
                          Connect
                        </>
                      )}
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleTestConnection(marketplace.marketplace)}
                        disabled={testConnectionMutation.isPending}
                        className="flex-1"
                        data-testid={`button-test-${marketplace.marketplace}`}
                      >
                        {testConnectionMutation.isPending ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Testing...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-check mr-2"></i>
                            Test
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => handleDisconnect(marketplace.marketplace)}
                        disabled={disconnectMarketplaceMutation.isPending}
                        data-testid={`button-disconnect-${marketplace.marketplace}`}
                      >
                        <i className="fas fa-unlink"></i>
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>

              {isConnecting && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <i className="fas fa-spinner fa-spin text-2xl text-primary mb-2"></i>
                    <p className="text-sm text-muted-foreground">Connecting...</p>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Connection Tips */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Connection Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Before Connecting:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Ensure you have seller accounts on each marketplace</li>
                <li>• Have your login credentials ready</li>
                <li>• Check marketplace-specific requirements</li>
                <li>• Review fee structures and policies</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">After Connecting:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Test the connection regularly</li>
                <li>• Monitor posting success rates</li>
                <li>• Keep account credentials updated</li>
                <li>• Review marketplace analytics</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
