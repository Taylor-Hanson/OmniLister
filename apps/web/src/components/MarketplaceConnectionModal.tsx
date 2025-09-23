import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { type MarketplaceConfig } from "@shared/marketplaceConfig";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Info } from "lucide-react";

interface MarketplaceConnectionModalProps {
  marketplace: MarketplaceConfig | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MarketplaceConnectionModal({ marketplace, isOpen, onClose }: MarketplaceConnectionModalProps) {
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!marketplace) return;
      
      if (marketplace.authType === "oauth") {
        // Start OAuth flow
        const response = await apiRequest("GET", `/api/marketplaces/${marketplace.id}/auth`);
        const data = await response.json();
        
        if (data.authUrl) {
          // For OAuth, open the auth URL in a new window
          const authWindow = window.open(data.authUrl, '_blank', 'width=600,height=600');
          
          // Poll for completion
          return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
              if (authWindow?.closed) {
                clearInterval(checkInterval);
                queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
                resolve(true);
              }
            }, 1000);
            
            // Timeout after 5 minutes
            setTimeout(() => {
              clearInterval(checkInterval);
              reject(new Error("Authentication timeout"));
            }, 300000);
          });
        }
      } else {
        // For other auth types, send credentials directly
        const response = await apiRequest("POST", `/api/marketplaces/${marketplace.id}/connect`, {
          credentials,
          authType: marketplace.authType
        });
        return response.json();
      }
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: `Successfully connected to ${marketplace?.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
      onClose();
      setCredentials({});
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect to marketplace",
        variant: "destructive",
      });
    },
  });

  const handleConnect = async () => {
    if (!marketplace) return;
    
    // Validate required credentials
    if (marketplace.requiredCredentials) {
      for (const cred of marketplace.requiredCredentials) {
        if (!credentials[cred.key]) {
          toast({
            title: "Missing credentials",
            description: `Please provide ${cred.label}`,
            variant: "destructive",
          });
          return;
        }
      }
    }
    
    setIsConnecting(true);
    try {
      await connectMutation.mutateAsync();
    } finally {
      setIsConnecting(false);
    }
  };

  if (!marketplace) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="dialog-marketplace-connection">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <i className={`${marketplace.icon} ${marketplace.color} text-white p-2 rounded`}></i>
            Connect to {marketplace.name}
          </DialogTitle>
          <DialogDescription>
            {marketplace.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Features */}
          <div>
            <Label className="text-sm font-medium">Features</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {marketplace.features.map((feature) => (
                <span
                  key={feature}
                  className="text-xs bg-secondary px-2 py-1 rounded"
                  data-testid={`feature-${feature.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>

          {/* Connection Instructions */}
          {marketplace.authType === "oauth" && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You'll be redirected to {marketplace.name} to authorize the connection. 
                Please complete the authorization in the new window.
              </AlertDescription>
            </Alert>
          )}

          {marketplace.authType === "api_key" && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You'll need API credentials from your {marketplace.name} seller account. 
                These can usually be found in your account settings or developer portal.
              </AlertDescription>
            </Alert>
          )}

          {marketplace.authType === "username_password" && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Enter your {marketplace.name} account credentials. Your password is encrypted and stored securely.
              </AlertDescription>
            </Alert>
          )}

          {marketplace.authType === "manual" && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This marketplace requires manual setup. Please enter the required information below.
              </AlertDescription>
            </Alert>
          )}

          {/* Credential Fields */}
          {marketplace.requiredCredentials && (
            <div className="space-y-3">
              {marketplace.requiredCredentials.map((cred) => (
                <div key={cred.key}>
                  <Label htmlFor={cred.key}>{cred.label}</Label>
                  {cred.help && (
                    <p className="text-xs text-muted-foreground mb-1">{cred.help}</p>
                  )}
                  {cred.type === "textarea" ? (
                    <Textarea
                      id={cred.key}
                      placeholder={cred.placeholder}
                      value={credentials[cred.key] || ""}
                      onChange={(e) => setCredentials({ ...credentials, [cred.key]: e.target.value })}
                      className="mt-1"
                      data-testid={`input-${cred.key}`}
                    />
                  ) : (
                    <Input
                      id={cred.key}
                      type={cred.type}
                      placeholder={cred.placeholder}
                      value={credentials[cred.key] || ""}
                      onChange={(e) => setCredentials({ ...credentials, [cred.key]: e.target.value })}
                      className="mt-1"
                      data-testid={`input-${cred.key}`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Coming Soon Notice */}
          {marketplace.comingSoon && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <Info className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Integration with {marketplace.name} is coming soon! We're working on adding support for this marketplace.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel">
            Cancel
          </Button>
          <Button 
            onClick={handleConnect} 
            disabled={isConnecting || marketplace.comingSoon}
            data-testid="button-connect"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : marketplace.authType === "oauth" ? (
              "Authorize"
            ) : (
              "Connect"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}