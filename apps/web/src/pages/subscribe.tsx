import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc } from "@/components/ui/dialog";
import { CheckCircle, Info, Mail, Zap, Crown, Rocket, TrendingUp, Gift, CreditCard } from "lucide-react";
import { useLocation } from "wouter";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe - use testing key if production key isn't available
// Note: The testing keys are mislabeled - TESTING_STRIPE_SECRET_KEY is actually the publishable key
const stripePublicKey = (import.meta as any).env?.VITE_STRIPE_PUBLIC_KEY || (import.meta as any).env?.TESTING_STRIPE_SECRET_KEY || '';
const stripePromise = loadStripe(stripePublicKey);

// Price IDs for each plan (you'll need to set these up in Stripe)
const STRIPE_PRICE_IDS: { [key: string]: string } = {
  starter: 'price_starter', // Replace with actual Stripe price ID
  growth: 'price_growth', // Replace with actual Stripe price ID
  professional: 'price_professional', // Replace with actual Stripe price ID
  unlimited: 'price_unlimited', // Replace with actual Stripe price ID
};

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
    available: true,
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
    available: true,
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
    available: true,
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
    available: true,
  },
];

// Checkout form component
function CheckoutForm({ clientSecret, planId }: { clientSecret: string; planId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const { refreshUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard`,
      },
      redirect: 'if_required',
    });

    if (error) {
      toast({
        title: "Payment failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else {
      // Payment succeeded
      toast({
        title: "Payment successful!",
        description: `You are now subscribed to the ${planId} plan`,
      });
      await refreshUser();
      setLocation('/dashboard');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full"
        data-testid="button-submit-payment"
      >
        {isProcessing ? (
          <>
            <i className="fas fa-spinner fa-spin mr-2"></i>
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Subscribe Now
          </>
        )}
      </Button>
    </form>
  );
}

export default function Subscribe() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactPlan, setContactPlan] = useState<typeof PRICING_PLANS[0] | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);

  // Get plan from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planFromUrl = urlParams.get('plan');
    if (planFromUrl && PRICING_PLANS.find(p => p.id === planFromUrl)) {
      handlePlanSelection(planFromUrl);
    }
  }, []);

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
        setLocation("/dashboard");
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

  const createSubscriptionMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest("POST", "/api/get-or-create-subscription", { 
        planId,
        priceId: STRIPE_PRICE_IDS[planId] 
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create subscription",
        variant: "destructive",
      });
      setIsLoadingPayment(false);
    },
  });

  const handlePlanSelection = (planId: string) => {
    setSelectedPlan(planId);
    
    if (planId === 'free') {
      selectPlanMutation.mutate(planId);
    } else {
      // For paid plans, create Stripe subscription
      setIsLoadingPayment(true);
      createSubscriptionMutation.mutate(planId);
    }
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
            onClick={() => setLocation('/dashboard')}
            data-testid="button-return-dashboard"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // If we have a client secret, show the Stripe payment form
  if (clientSecret && selectedPlan && selectedPlan !== 'free') {
    const plan = PRICING_PLANS.find(p => p.id === selectedPlan);
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Complete Your Subscription</h1>
          <p className="text-muted-foreground mt-2">
            You're subscribing to the {plan?.name} plan - {plan?.price}/month
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>
              Enter your payment information to start your subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm clientSecret={clientSecret} planId={selectedPlan} />
            </Elements>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button 
            variant="ghost" 
            onClick={() => {
              setClientSecret(null);
              setSelectedPlan(null);
              setIsLoadingPayment(false);
            }}
            data-testid="button-back-to-plans"
          >
            Back to Plans
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
          Select the plan that fits your reselling goals
        </p>
      </div>

      <Alert className="mb-8">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Limited Time Offer:</strong> Start with our free plan and get 10 listings per month forever! 
          Upgrade to any paid plan to unlock more listings and advanced features.
        </AlertDescription>
      </Alert>

      {isLoadingPayment && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-96">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <i className="fas fa-spinner fa-spin text-4xl text-primary"></i>
                <p className="text-lg font-medium">Preparing checkout...</p>
                <p className="text-sm text-muted-foreground">Setting up your secure payment</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                ) : (
                  <Button 
                    className="w-full" 
                    onClick={() => handlePlanSelection(plan.id)}
                    disabled={selectPlanMutation.isPending || isLoadingPayment}
                    data-testid={`button-select-${plan.id}`}
                  >
                    {(selectPlanMutation.isPending || isLoadingPayment) && selectedPlan === plan.id ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        {plan.id === 'free' ? 'Activating...' : 'Loading...'}
                      </>
                    ) : (
                      <>
                        {plan.id === 'free' ? (
                          'Select Free Plan'
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Subscribe - {plan.price}/mo
                          </>
                        )}
                      </>
                    )}
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
              Contact our sales team for special pricing or custom requirements.
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
                Contact us at <a href="mailto:sales@crosslist.com" className="font-medium underline">sales@crosslist.com</a> for enterprise pricing or custom requirements.
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