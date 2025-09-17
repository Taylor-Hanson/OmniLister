import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { SiShopify, SiEbay, SiEtsy, SiAmazon } from "react-icons/si";
import { 
  Store, 
  Link2, 
  Unlink, 
  RefreshCw, 
  Package, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Download, 
  ShoppingBag, 
  Settings,
  ArrowRight,
  Loader2,
  Image,
  DollarSign,
  BarChart
} from "lucide-react";

interface ShopifyProduct {
  id: string;
  title: string;
  vendor: string;
  productType: string;
  status: string;
  handle: string;
  images: { src: string }[];
  variants: {
    id: string;
    title: string;
    price: string;
    sku?: string;
    inventoryQuantity?: number;
  }[];
  tags: string[];
}

interface MarketplaceConnection {
  id: string;
  marketplace: string;
  isConnected: boolean;
  shopUrl?: string;
  shopName?: string;
  accessToken?: string;
  lastSyncAt?: string;
  credentials?: any;
}

export default function Connections() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<string>("shopify");
  const [shopUrl, setShopUrl] = useState("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [importStatus, setImportStatus] = useState<"idle" | "importing" | "success" | "error">("idle");

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['/api/marketplaces'],
    enabled: !!user,
  });

  const { data: shopifyProducts, isLoading: isLoadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ['/api/marketplaces/shopify/products'],
    enabled: false, // Only fetch when requested
  });

  const connectShopifyMutation = useMutation({
    mutationFn: async (shopUrl: string) => {
      const response = await apiRequest("POST", "/api/marketplaces/shopify/install", { shopUrl });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        // Redirect to Shopify OAuth flow
        window.location.href = data.authUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect to Shopify",
        variant: "destructive",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (marketplace: string) => {
      const response = await apiRequest("DELETE", `/api/marketplaces/${marketplace}`);
      return response.json();
    },
    onSuccess: (_, marketplace) => {
      toast({
        title: "Disconnected",
        description: `Successfully disconnected from ${marketplace}`,
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
        title: data.isValid ? "Connection successful" : "Connection failed",
        description: data.message || `${marketplace} connection ${data.isValid ? 'is working' : 'failed'}`,
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

  const importProductsMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      const response = await apiRequest("POST", "/api/marketplaces/shopify/import", { 
        productIds,
        limit: productIds.length 
      });
      return response.json();
    },
    onSuccess: (data) => {
      setImportStatus("success");
      toast({
        title: "Import successful",
        description: `Imported ${data.imported} products from Shopify`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      setTimeout(() => {
        setIsImportModalOpen(false);
        setSelectedProducts([]);
        setImportStatus("idle");
      }, 1500);
    },
    onError: (error: any) => {
      setImportStatus("error");
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleShopifyConnect = () => {
    if (!shopUrl) {
      toast({
        title: "Shop URL required",
        description: "Please enter your Shopify shop URL",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure proper format
    let formattedUrl = shopUrl.trim();
    if (!formattedUrl.includes('.myshopify.com')) {
      if (!formattedUrl.includes('.')) {
        formattedUrl = `${formattedUrl}.myshopify.com`;
      }
    }
    
    connectShopifyMutation.mutate(formattedUrl);
  };

  const handleImportProducts = async () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "No products selected",
        description: "Please select at least one product to import",
        variant: "destructive",
      });
      return;
    }
    
    setImportStatus("importing");
    await importProductsMutation.mutateAsync(selectedProducts);
  };

  const handleOpenImportModal = async () => {
    setIsImportModalOpen(true);
    await refetchProducts();
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleSelectAll = () => {
    if (shopifyProducts?.products) {
      if (selectedProducts.length === shopifyProducts.products.length) {
        setSelectedProducts([]);
      } else {
        setSelectedProducts(shopifyProducts.products.map((p: ShopifyProduct) => p.id));
      }
    }
  };

  const getConnectionStatus = (marketplace: string) => {
    const connection = connections.find((c: MarketplaceConnection) => c.marketplace === marketplace);
    return connection?.isConnected || false;
  };

  const getShopifyConnection = () => {
    return connections.find((c: MarketplaceConnection) => c.marketplace === "shopify");
  };

  const shopifyConnection = getShopifyConnection();
  const isShopifyConnected = getConnectionStatus("shopify");

  const marketplaceIcons: Record<string, any> = {
    shopify: SiShopify,
    ebay: SiEbay,
    etsy: SiEtsy,
    amazon: SiAmazon,
  };

  const marketplaceColors: Record<string, string> = {
    shopify: "text-green-600",
    ebay: "text-blue-600",
    etsy: "text-orange-600",
    amazon: "text-yellow-600",
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Marketplace Connections</h1>
        <p className="text-muted-foreground mt-2">
          Manage your connections to various marketplaces and import products
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="shopify" data-testid="tab-shopify">
            <SiShopify className="w-4 h-4 mr-2" />
            Shopify
          </TabsTrigger>
          <TabsTrigger value="ebay" data-testid="tab-ebay">
            <SiEbay className="w-4 h-4 mr-2" />
            eBay
          </TabsTrigger>
          <TabsTrigger value="etsy" data-testid="tab-etsy">
            <SiEtsy className="w-4 h-4 mr-2" />
            Etsy
          </TabsTrigger>
          <TabsTrigger value="amazon" data-testid="tab-amazon">
            <SiAmazon className="w-4 h-4 mr-2" />
            Amazon
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shopify" className="space-y-6">
          {/* Shopify Connection Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                    <SiShopify className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle>Shopify Store Connection</CardTitle>
                    <CardDescription>
                      Connect your Shopify store to sync products and manage inventory
                    </CardDescription>
                  </div>
                </div>
                {isShopifyConnected && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isShopifyConnected ? (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Connect Your Shopify Store</AlertTitle>
                    <AlertDescription>
                      Enter your Shopify store URL to begin the connection process. You'll be redirected to Shopify to authorize the connection.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label htmlFor="shop-url">Shop URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="shop-url"
                        placeholder="mystore.myshopify.com"
                        value={shopUrl}
                        onChange={(e) => setShopUrl(e.target.value)}
                        data-testid="input-shop-url"
                        className="flex-1"
                      />
                      <Button
                        onClick={handleShopifyConnect}
                        disabled={connectShopifyMutation.isPending}
                        data-testid="button-connect-shopify"
                      >
                        {connectShopifyMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Link2 className="w-4 h-4 mr-2" />
                        )}
                        Connect Store
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Example: mystore.myshopify.com or just "mystore"
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Connected Store Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Store URL</Label>
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{shopifyConnection?.shopUrl}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Store Name</Label>
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{shopifyConnection?.shopName || "Connected Store"}</span>
                      </div>
                    </div>
                    {shopifyConnection?.lastSyncAt && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Last Synced</Label>
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {format(new Date(shopifyConnection.lastSyncAt), "MMM d, yyyy h:mm a")}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => testConnectionMutation.mutate("shopify")}
                      disabled={testConnectionMutation.isPending}
                      data-testid="button-test-shopify"
                    >
                      {testConnectionMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Test Connection
                    </Button>
                    
                    <Button
                      onClick={handleOpenImportModal}
                      data-testid="button-import-products"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Import Products
                    </Button>
                    
                    <Button
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => disconnectMutation.mutate("shopify")}
                      disabled={disconnectMutation.isPending}
                      data-testid="button-disconnect-shopify"
                    >
                      {disconnectMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Unlink className="w-4 h-4 mr-2" />
                      )}
                      Disconnect
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connection Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-600" />
                  <CardTitle className="text-base">Product Sync</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Import products directly from your Shopify store with all details and images
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-base">Inventory Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Keep inventory levels synchronized across all platforms automatically
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  <CardTitle className="text-base">Order Processing</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Manage orders from multiple marketplaces in your Shopify dashboard
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ebay" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                  <SiEbay className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>eBay Connection</CardTitle>
                  <CardDescription>
                    Connect to eBay to list products and manage your store
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  eBay connection is available through the Marketplaces page. Visit the Marketplaces section to connect your eBay account.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="etsy" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                  <SiEtsy className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <CardTitle>Etsy Connection</CardTitle>
                  <CardDescription>
                    Connect to Etsy to manage handmade and vintage items
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Etsy connection is coming soon. We're working on integrating with Etsy's API to provide seamless product management.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="amazon" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900">
                  <SiAmazon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <CardTitle>Amazon Seller Central</CardTitle>
                  <CardDescription>
                    Connect to Amazon to manage FBA and FBM listings
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Amazon connection is available through the Marketplaces page. Visit the Marketplaces section to connect your Amazon Seller account.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Products Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Import Shopify Products</DialogTitle>
            <DialogDescription>
              Select products to import from your Shopify store
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {isLoadingProducts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : shopifyProducts?.products && shopifyProducts.products.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedProducts.length === shopifyProducts.products.length}
                      onCheckedChange={toggleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                    <Label className="text-sm font-medium">
                      Select All ({selectedProducts.length} of {shopifyProducts.products.length})
                    </Label>
                  </div>
                  <Badge variant="secondary">
                    {shopifyProducts.products.length} Products Found
                  </Badge>
                </div>
                
                <ScrollArea className="h-[400px] border rounded-lg p-4">
                  <div className="space-y-3">
                    {shopifyProducts.products.map((product: ShopifyProduct) => (
                      <Card key={product.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedProducts.includes(product.id)}
                              onCheckedChange={() => toggleProductSelection(product.id)}
                              data-testid={`checkbox-product-${product.id}`}
                            />
                            
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="md:col-span-2 space-y-1">
                                <h4 className="font-medium">{product.title}</h4>
                                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                  {product.vendor && (
                                    <span>Vendor: {product.vendor}</span>
                                  )}
                                  {product.productType && (
                                    <span>Type: {product.productType}</span>
                                  )}
                                  <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                                    {product.status}
                                  </Badge>
                                </div>
                                {product.variants && product.variants.length > 0 && (
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">
                                      {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                                    </span>
                                    <span className="mx-2">•</span>
                                    <span className="font-medium">
                                      ${product.variants[0].price}
                                    </span>
                                    {product.variants[0].sku && (
                                      <>
                                        <span className="mx-2">•</span>
                                        <span className="text-muted-foreground">
                                          SKU: {product.variants[0].sku}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex justify-end">
                                {product.images && product.images.length > 0 && (
                                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted">
                                    <img
                                      src={product.images[0].src}
                                      alt={product.title}
                                      className="w-full h-full object-cover"
                                    />
                                    {product.images.length > 1 && (
                                      <Badge className="absolute bottom-1 right-1 text-xs px-1 py-0">
                                        +{product.images.length - 1}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No products found in your Shopify store. Make sure you have products published and try again.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImportProducts}
              disabled={selectedProducts.length === 0 || importStatus === "importing"}
              data-testid="button-confirm-import"
            >
              {importStatus === "importing" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : importStatus === "success" ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Imported!
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Import {selectedProducts.length} Product{selectedProducts.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}