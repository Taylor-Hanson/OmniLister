import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc } from "@/components/ui/dialog";
import { CheckCircle, Info, Mail, Zap, Crown, Rocket, TrendingUp, Gift } from "lucide-react";
import { useLocation } from "wouter";

const PRICING_PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Perfect for testing the waters",
    listings: 10,
    listingsText: "10 new listings",
    badge: "Forever Free",
    badgeVariant: "secondary" as const,
    icon: Gift,
    features: [
      "10 new listings per month",
      "Access to all 12 marketplaces",
      "All features available",
      "Forever free - no expiration",
      "Basic analytics",
      "Community support",
    ],
    available: true,
  },
  {
    id: "starter",
    name: "Starter",
    price: "$9.99",
    period: "/month",
    description: "For casual sellers",
    listings: 50,
    listingsText: "50 new listings",
    icon: Zap,
    features: [
      "50 new listings per month",
      "Unlimited crossposting",
      "All 12 marketplaces",
      "Bulk listing/delisting",
      "Inventory management",
      "Auto sales detection",
      "AI listing assistance",
      "Email support",
    ],
    available: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: "$29.99",
    period: "/month",
    description: "Scale your business",
    listings: 300,
    listingsText: "300 new listings",
    badge: "Most Popular",
    badgeVariant: "default" as const,
    icon: TrendingUp,
    features: [
      "300 new listings per month",
      "Full automation suite",
      "Bulk scheduler",
      "Auto-delist features",
      "Advanced analytics",
      "Single dashboard management",
      "Priority support",
      "Custom templates",
    ],
    available: false,
  },
  {
    id: "professional",
    name: "Professional",
    price: "$39.99",
    period: "/month",
    description: "For power sellers",
    listings: 1000,
    listingsText: "1,000 new listings",
    icon: Crown,
    features: [
      "1,000 new listings per month",
      "Poshmark sharing automation",
      "Auto-share closets",
      "Bulk offers management",
      "Advanced analytics reports",
      "Multi-store management",
      "API access",
      "24/7 priority support",
    ],
    available: false,
  },
  {
    id: "unlimited",
    name: "Unlimited",
    price: "$44.99",
    period: "/month",
    description: "Maximum power & value",
    listings: null,
    listingsText: "Unlimited listings",
    badge: "Best Value",
    badgeVariant: "destructive" as const,
    icon: Rocket,
    features: [
      "Unlimited new listings",
      "AI-powered listing creation",
      "Automatic price sync",
      "Multi-account management",
      "White-glove onboarding",
      "Dedicated account manager",
      "Custom integrations",
      "24/7 VIP support",
    ],
    available: false,
  },
];

export default function Subscribe() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactPlan, setContactPlan] = useState<typeof PRICING_PLANS[0] | null>(null);

  const selectPlanMutation = useMutation({
    mutationFn: async (plan: string) => {
      const response = await apiRequest("POST", "/api/subscription/select-plan", { plan });
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.success) {
        toast({
          title: "Plan Activated!",
          description: data.message,
        });
        await refreshUser();
        setLocation("/");
      } else if (data.requiresPayment) {
        // Show contact sales dialog
        const plan = PRICING_PLANS.find(p => p.id === selectedPlan);
        if (plan) {
          setContactPlan(plan);
          setShowContactDialog(true);
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to select plan",
        variant: "destructive",
      });
    },
  });

  const handlePlanSelection = (planId: string) => {
    setSelectedPlan(planId);
    selectPlanMutation.mutate(planId);
  };

  if (user?.plan && user.plan !== 'free') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">You're on the {user.plan} plan!</h1>
          <p className="text-muted-foreground">
            You have access to all the features included in your plan.
          </p>
          <Button 
            className="mt-6" 
            onClick={() => setLocation('/')}
            data-testid="button-return-dashboard"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground">Choose Your Plan</h1>
        <p className="text-muted-foreground mt-2">
          Start with our free plan or contact us for paid plan early access
        </p>
      </div>

      <Alert className="mb-8">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Limited Time Offer:</strong> Start with our free plan and get 10 listings per month forever! 
          Paid plans with Stripe integration are coming soon. Contact us for early access.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {PRICING_PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = user?.plan === plan.id;
          
          return (
            <Card 
              key={plan.id}
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                selectedPlan === plan.id ? 'ring-2 ring-primary' : ''
              } ${isCurrentPlan ? 'border-green-500' : ''}`}
            >
              {plan.badge && (
                <div className="absolute top-4 right-4">
                  <Badge variant={plan.badgeVariant} className="text-xs">
                    {plan.badge}
                  </Badge>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute top-4 left-4">
                  <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                    Current Plan
                  </Badge>
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm font-medium text-primary mt-2">
                  {plan.listingsText}/month
                </p>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {plan.features.slice(0, 4).map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  {plan.features.length > 4 && (
                    <li className="text-sm text-muted-foreground">
                      +{plan.features.length - 4} more features
                    </li>
                  )}
                </ul>
                
                {isCurrentPlan ? (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    disabled
                  >
                    Current Plan
                  </Button>
                ) : plan.available ? (
                  <Button 
                    className="w-full" 
                    onClick={() => handlePlanSelection(plan.id)}
                    disabled={selectPlanMutation.isPending}
                    data-testid={`button-select-${plan.id}`}
                  >
                    {selectPlanMutation.isPending && selectedPlan === plan.id ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Activating...
                      </>
                    ) : (
                      'Select Free Plan'
                    )}
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => {
                      setContactPlan(plan);
                      setShowContactDialog(true);
                    }}
                    data-testid={`button-contact-${plan.id}`}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Contact Sales
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Contact Sales Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Get Early Access to {contactPlan?.name} Plan</DialogTitle>
            <DialogDesc>
              Paid plans with automatic billing are coming soon! Get early access by contacting our sales team.
            </DialogDesc>
          </DialogHeader>
          <div className="space-y-4">
            {contactPlan && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{contactPlan.name} Plan</span>
                      <span className="font-bold">{contactPlan.price}/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {contactPlan.listingsText} per month
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Contact us at <a href="mailto:sales@crosslist.com" className="font-medium underline">sales@crosslist.com</a> to get early access to paid plans with special introductory pricing.
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button 
                className="flex-1"
                onClick={() => window.location.href = 'mailto:sales@crosslist.com'}
                data-testid="button-email-sales"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email Sales
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowContactDialog(false)}
                data-testid="button-close-dialog"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}