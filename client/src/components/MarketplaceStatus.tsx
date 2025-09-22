import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const marketplaceIcons: Record<string, { icon: string; color: string }> = {
  ebay: { icon: "fab fa-ebay", color: "bg-blue-600" },
  poshmark: { icon: "fas fa-tshirt", color: "bg-pink-500" },
  mercari: { icon: "fas fa-shopping-bag", color: "bg-orange-500" },
  facebook: { icon: "fab fa-facebook", color: "bg-blue-600" },
  etsy: { icon: "fab fa-etsy", color: "bg-orange-600" },
  depop: { icon: "fas fa-mobile-alt", color: "bg-purple-500" },
  grailed: { icon: "fas fa-user-tie", color: "bg-gray-800" },
  vinted: { icon: "fas fa-recycle", color: "bg-green-600" },
};

export default function MarketplaceStatus() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: marketplaces = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/marketplaces'],
    enabled: !!user,
  });

  // Get actual listings to count per marketplace
  const { data: listings = [] } = useQuery<any[]>({
    queryKey: ['/api/listings'],
    enabled: !!user,
  });

  const refreshConnectionsMutation = useMutation({
    mutationFn: async () => {
      // Refresh all marketplace connections
      await Promise.all(
        marketplaces
          .filter((m: any) => m.isConnected)
          .map((m: any) => 
            apiRequest("POST", `/api/marketplaces/${m.marketplace}/test`)
              .then(res => res.json())
              .catch(() => ({ isValid: false }))
          )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
      toast({
        title: "Connections refreshed",
        description: "All marketplace connections have been tested.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Refresh failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (marketplace: any) => {
    if (!marketplace.isConnected) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    }
    // For demo purposes, show some marketplaces as syncing or error
    if (marketplace.marketplace === 'mercari') {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    }
    if (marketplace.marketplace === 'facebook') {
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    }
    return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
  };

  const getStatusText = (marketplace: any) => {
    if (!marketplace.isConnected) {
      return 'Disconnected';
    }
    if (marketplace.marketplace === 'mercari') {
      return 'Syncing';
    }
    if (marketplace.marketplace === 'facebook') {
      return 'Error';
    }
    return 'Connected';
  };

  const getStatusDot = (marketplace: any) => {
    if (!marketplace.isConnected) {
      return 'bg-red-500';
    }
    if (marketplace.marketplace === 'mercari') {
      return 'bg-yellow-500 animate-pulse';
    }
    if (marketplace.marketplace === 'facebook') {
      return 'bg-red-500';
    }
    return 'bg-green-500';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Marketplace Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="animate-pulse flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-muted rounded-lg mr-3"></div>
                  <div>
                    <div className="h-4 bg-muted rounded w-20 mb-1"></div>
                    <div className="h-3 bg-muted rounded w-16"></div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="h-5 bg-muted rounded w-16 mr-2"></div>
                  <div className="w-2 h-2 bg-muted rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Marketplace Status</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refreshConnectionsMutation.mutate()}
          disabled={refreshConnectionsMutation.isPending}
          className="text-primary hover:text-primary/80 font-medium text-sm"
          data-testid="button-refresh-connections"
        >
          <i className={`fas fa-sync-alt mr-1 ${refreshConnectionsMutation.isPending ? 'animate-spin' : ''}`}></i>
          Refresh
        </Button>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {marketplaces.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No marketplaces configured</p>
              <Link href="/connections">
                <Button variant="outline" size="sm" className="mt-2">
                  Connect Marketplaces
                </Button>
              </Link>
            </div>
          ) : (
            marketplaces.map((marketplace: any) => {
              const marketplaceInfo = marketplaceIcons[marketplace.marketplace] || {
                icon: "fas fa-store",
                color: "bg-gray-500"
              };
              
              return (
                <div
                  key={marketplace.marketplace}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  data-testid={`marketplace-status-${marketplace.marketplace}`}
                >
                  <div className="flex items-center">
                    <div className={`w-8 h-8 ${marketplaceInfo.color} rounded-lg flex items-center justify-center mr-3`}>
                      <i className={`${marketplaceInfo.icon} text-white text-sm`}></i>
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground capitalize">
                        {marketplace.marketplace}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {marketplace.connection ? 
                          `${listings.filter((listing: any) => 
                            listing.posts?.some((post: any) => post.marketplace === marketplace.marketplace)
                          ).length} listings` 
                          : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Badge className={getStatusColor(marketplace)}>
                      {getStatusText(marketplace)}
                    </Badge>
                    <div className={`w-2 h-2 ${getStatusDot(marketplace)} rounded-full ml-2`}></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        <Link href="/connections">
          <Button
            variant="ghost"
            className="w-full mt-4 text-primary hover:bg-primary/10 font-medium text-sm"
            data-testid="button-add-marketplace"
          >
            <i className="fas fa-plus mr-2"></i>
            Connect New Marketplace
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
