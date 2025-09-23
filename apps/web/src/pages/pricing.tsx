import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, X, Zap, TrendingUp, Crown, Rocket, Gift, Mail, Info, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const PRICING_PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Perfect for testing the waters",
    listings: "10 new listings",
    badge: "Forever Free",
    badgeVariant: "secondary" as const,
    features: [
      "10 new listings per month",
      "Access to all 29+ marketplaces",
      "Cross-Platform Inventory Sync™",
      "Basic Smart Background Posting",
      "Auto-delist on sale (prevents overselling)",
      "Real-time sync notifications",
      "Basic analytics dashboard",
      "Community support",
    ],
    comparison: "2x more than Vendoo's free trial",
    buttonText: "Start Free",
    buttonVariant: "outline" as const,
    gradient: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: "$9.99",
    period: "/month",
    description: "For casual sellers",
    listings: "50 new listings",
    features: [
      "50 new listings per month",
      "All 29+ marketplaces included",
      "Smart Background Auto-Posting™",
      "Cross-Platform Inventory Sync™",
      "Intelligent rate limiting",
      "Webhook sales detection",
      "AI-powered listing optimization",
      "Bulk operations (up to 50)",
      "Real-time WebSocket updates",
      "Email support",
    ],
    comparison: "2x Vendoo listings at same price",
    buttonText: "Choose Starter",
    buttonVariant: "outline" as const,
    gradient: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: "$29.99",
    period: "/month",
    description: "Scale your business",
    listings: "300 new listings",
    badge: "Most Popular",
    badgeVariant: "default" as const,
    features: [
      "300 new listings per month",
      "Advanced Smart Scheduling™",
      "AI Auto-Optimization Engine",
      "Marketplace-specific timing",
      "Advanced retry logic",
      "Bulk operations (up to 300)",
      "Pattern analysis & learning",
      "Competition tracking",
      "Priority rate limits",
      "Priority support",
    ],
    comparison: "50% more than Crosslist Bronze",
    buttonText: "Choose Growth",
    buttonVariant: "default" as const,
    gradient: true,
  },
  {
    id: "professional",
    name: "Professional",
    price: "$39.99",
    period: "/month",
    description: "For power sellers",
    listings: "1,000 new listings",
    features: [
      "1,000 new listings per month",
      "Intelligent batch processing",
      "Circuit breaker protection",
      "Dead letter queue recovery",
      "Advanced analytics & forecasting",
      "Multi-store management",
      "Custom webhook endpoints",
      "API access for automation",
      "Dedicated success manager",
      "24/7 priority support",
    ],
    comparison: "2x Vendoo Pro at lower price",
    buttonText: "Choose Professional",
    buttonVariant: "outline" as const,
    gradient: false,
  },
  {
    id: "unlimited",
    name: "Unlimited",
    price: "$44.99",
    period: "/month",
    description: "Maximum power & value",
    listings: "Unlimited listings",
    badge: "Best Value",
    badgeVariant: "destructive" as const,
    features: [
      "Unlimited new listings",
      "White-label capabilities",
      "Custom ML optimization models",
      "Dedicated infrastructure",
      "Premium rate limits",
      "Custom integrations",
      "Advanced team collaboration",
      "Business intelligence suite",
      "White-glove onboarding",
      "24/7 VIP support",
    ],
    comparison: "70% less than Vendoo unlimited",
    buttonText: "Go Unlimited",
    buttonVariant: "default" as const,
    gradient: true,
    bestValue: true,
  },
];

const FEATURE_COMPARISON = [
  { feature: "New Listings/Month", free: "10", starter: "50", growth: "300", professional: "1,000", unlimited: "Unlimited" },
  { feature: "Marketplaces", free: "All 29+", starter: "All 29+", growth: "All 29+", professional: "All 29+", unlimited: "All 29+" },
  { feature: "Cross-Platform Inventory Sync™", free: <Check className="w-4 h-4" />, starter: <Check className="w-4 h-4" />, growth: <Check className="w-4 h-4" />, professional: <Check className="w-4 h-4" />, unlimited: <Check className="w-4 h-4" /> },
  { feature: "Smart Background Auto-Posting™", free: "Basic", starter: <Check className="w-4 h-4" />, growth: <Check className="w-4 h-4" />, professional: <Check className="w-4 h-4" />, unlimited: <Check className="w-4 h-4" /> },
  { feature: "Auto-Delist on Sale", free: <Check className="w-4 h-4" />, starter: <Check className="w-4 h-4" />, growth: <Check className="w-4 h-4" />, professional: <Check className="w-4 h-4" />, unlimited: <Check className="w-4 h-4" /> },
  { feature: "Intelligent Scheduling", free: <X className="w-4 h-4 text-muted-foreground" />, starter: "Basic", growth: "Advanced", professional: "Advanced", unlimited: "Premium" },
  { feature: "Rate Limiting Protection", free: "Basic", starter: <Check className="w-4 h-4" />, growth: <Check className="w-4 h-4" />, professional: <Check className="w-4 h-4" />, unlimited: <Check className="w-4 h-4" /> },
  { feature: "Webhook Sales Detection", free: <X className="w-4 h-4 text-muted-foreground" />, starter: <Check className="w-4 h-4" />, growth: <Check className="w-4 h-4" />, professional: <Check className="w-4 h-4" />, unlimited: <Check className="w-4 h-4" /> },
  { feature: "AI Optimization Engine", free: <X className="w-4 h-4 text-muted-foreground" />, starter: "Basic", growth: "Advanced", professional: "Advanced", unlimited: "Premium ML" },
  { feature: "Bulk Operations", free: "Up to 10", starter: "Up to 50", growth: "Up to 300", professional: "Up to 1,000", unlimited: "Unlimited" },
  { feature: "Retry Logic & Recovery", free: "Basic", starter: <Check className="w-4 h-4" />, growth: <Check className="w-4 h-4" />, professional: <Check className="w-4 h-4" />, unlimited: <Check className="w-4 h-4" /> },
  { feature: "Real-time WebSocket Updates", free: <Check className="w-4 h-4" />, starter: <Check className="w-4 h-4" />, growth: <Check className="w-4 h-4" />, professional: <Check className="w-4 h-4" />, unlimited: <Check className="w-4 h-4" /> },
  { feature: "Analytics & Insights", free: "Basic", starter: "Standard", growth: "Advanced", professional: "Predictive", unlimited: "Business Intelligence" },
  { feature: "Circuit Breaker Protection", free: <X className="w-4 h-4 text-muted-foreground" />, starter: <X className="w-4 h-4 text-muted-foreground" />, growth: <Check className="w-4 h-4" />, professional: <Check className="w-4 h-4" />, unlimited: <Check className="w-4 h-4" /> },
  { feature: "API Access", free: <X className="w-4 h-4 text-muted-foreground" />, starter: <X className="w-4 h-4 text-muted-foreground" />, growth: <X className="w-4 h-4 text-muted-foreground" />, professional: <Check className="w-4 h-4" />, unlimited: <Check className="w-4 h-4" /> },
  { feature: "Support", free: "Community", starter: "Email", growth: "Priority", professional: "24/7 Priority", unlimited: "24/7 VIP + Dedicated Manager" },
];

export default function Pricing() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const selectPlanMutation = useMutation({
    mutationFn: async (plan: string) => {
      const response = await apiRequest("POST", "/api/subscription/select-plan", { plan });
      return response.json();
    },
    onSuccess: async (data, planId) => {
      if (data.success) {
        toast({
          title: "Plan Activated!",
          description: data.message,
        });
        await refreshUser();
        setLocation("/");
      } else if (data.requiresPayment) {
        setSelectedPlan(planId);
        setShowContactDialog(true);
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

  const handleSelectPlan = (planId: string) => {
    if (planId === 'free') {
      selectPlanMutation.mutate(planId);
    } else {
      // Navigate to subscribe page with selected plan for Stripe payment
      window.location.href = `/subscribe?plan=${planId}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="outline">
            <Zap className="w-3 h-3 mr-1" />
            Beating the competition on price & features
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Choose Your Growth Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free forever, upgrade anytime. No credit card required for free plan.
          </p>
        </div>

        {/* Coming Soon Alert */}
        <Alert className="mb-8 max-w-4xl mx-auto">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Limited Time Offer:</strong> Start with our free plan and get 10 listings per month forever! 
            Subscribe to any paid plan to unlock more listings and advanced features.
          </AlertDescription>
        </Alert>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-16">
          {PRICING_PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                plan.gradient && "border-primary/50 shadow-lg",
                plan.bestValue && "ring-2 ring-primary"
              )}
            >
              {plan.badge && (
                <div className="absolute top-4 right-4">
                  <Badge variant={plan.badgeVariant} className="text-xs">
                    {plan.badge}
                  </Badge>
                </div>
              )}
              
              {plan.gradient && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 opacity-50" />
              )}
              
              <CardHeader className="relative">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm font-medium text-primary mt-2">
                  {plan.listings}/month
                </p>
              </CardHeader>
              
              <CardContent className="relative">
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <Check className="w-4 h-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                {plan.comparison && (
                  <p className="text-xs text-muted-foreground mt-4 italic">
                    💰 {plan.comparison}
                  </p>
                )}
              </CardContent>
              
              <CardFooter className="relative">
                {user?.plan === plan.id ? (
                  <Button className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : user ? (
                  plan.id === 'free' ? (
                    <Button
                      className="w-full"
                      variant={plan.buttonVariant}
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={selectPlanMutation.isPending}
                      data-testid={`button-select-${plan.id}`}
                    >
                      {selectPlanMutation.isPending && selectedPlan === plan.id ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Activating...
                        </>
                      ) : (
                        plan.buttonText
                      )}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.buttonVariant}
                      onClick={() => handleSelectPlan(plan.id)}
                      data-testid={`button-select-${plan.id}`}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Subscribe
                    </Button>
                  )
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.buttonVariant}
                    asChild
                    data-testid={`button-select-${plan.id}`}
                  >
                    <Link href="/signup">{plan.buttonText}</Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Complete Feature Comparison</h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Features</th>
                    <th className="text-center p-4 font-medium">Free</th>
                    <th className="text-center p-4 font-medium">Starter</th>
                    <th className="text-center p-4 font-medium bg-primary/5">Growth</th>
                    <th className="text-center p-4 font-medium">Professional</th>
                    <th className="text-center p-4 font-medium bg-primary/5">Unlimited</th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_COMPARISON.map((row, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-4 font-medium">{row.feature}</td>
                      <td className="text-center p-4">{row.free}</td>
                      <td className="text-center p-4">{row.starter}</td>
                      <td className="text-center p-4 bg-primary/5">{row.growth}</td>
                      <td className="text-center p-4">{row.professional}</td>
                      <td className="text-center p-4 bg-primary/5">{row.unlimited}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Competitive Advantages */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-8">Revolutionary Features That Set Us Apart</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-8">
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">Cross-Platform Inventory Sync™</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  <strong>Prevents overselling automatically!</strong> When an item sells on eBay, it's instantly delisted from Mercari, Poshmark, and all other platforms. No more double-selling nightmares.
                </p>
              </CardContent>
            </Card>
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <Rocket className="w-8 h-8 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">Smart Background Auto-Posting™</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  <strong>AI-powered scheduling magic!</strong> Posts at optimal times for each marketplace (eBay Sunday evenings, fashion on weekends). Respects rate limits and maximizes engagement automatically.
                </p>
              </CardContent>
            </Card>
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">AI Auto-Optimization Engine</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  <strong>Learns from your success!</strong> Our ML algorithms analyze your sales patterns and automatically optimize posting times, pricing, and marketplace selection for maximum profit.
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <Gift className="w-8 h-8 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">Forever Free Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Unlike competitors with trials, our free plan never expires. Start with 10 listings/month forever with inventory sync included!
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CreditCard className="w-8 h-8 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">70% Lower Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  More features at a fraction of the price. Vendoo charges $149/mo for unlimited - we charge $44.99 with better technology.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Crown className="w-8 h-8 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">29+ Marketplaces</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Support for all major platforms including eBay, Mercari, Poshmark, Facebook, Depop, Vinted, and 23 more. All included in every plan.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-primary/10 to-purple-600/10">
            <CardHeader>
              <Rocket className="w-12 h-12 text-primary mx-auto mb-4" />
              <CardTitle className="text-2xl">Ready to Scale Your Reselling Business?</CardTitle>
              <CardDescription className="text-base">
                Join thousands of sellers who are saving time and maximizing profits with CrossList Pro
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!user ? (
                <div className="flex gap-4 justify-center">
                  <Button size="lg" asChild data-testid="button-start-free">
                    <Link href="/signup">Start Free Forever</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild data-testid="button-view-demo">
                    <Link href="/">View Demo</Link>
                  </Button>
                </div>
              ) : (
                <Button size="lg" asChild data-testid="button-manage-subscription">
                  <Link href="/settings">Manage Subscription</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contact Sales Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Get Early Access to Paid Plans</DialogTitle>
            <DialogDescription>
              Paid plans with automatic billing are coming soon! Get early access by contacting our sales team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPlan && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {PRICING_PLANS.find(p => p.id === selectedPlan)?.name} Plan
                      </span>
                      <span className="font-bold">
                        {PRICING_PLANS.find(p => p.id === selectedPlan)?.price}/month
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {PRICING_PLANS.find(p => p.id === selectedPlan)?.listings} per month
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