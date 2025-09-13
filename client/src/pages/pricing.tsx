import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Zap, TrendingUp, Crown, Rocket, Gift } from "lucide-react";
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
      "Access to all 12 marketplaces",
      "All features available",
      "Forever free - no expiration",
      "Basic analytics",
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
      "Unlimited crossposting",
      "All 12 marketplaces",
      "Bulk listing/delisting",
      "Inventory management",
      "Auto sales detection",
      "AI listing assistance",
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
      "Full automation suite",
      "Bulk scheduler",
      "Auto-delist features",
      "Advanced analytics",
      "Single dashboard management",
      "Priority support",
      "Custom templates",
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
      "Poshmark sharing automation",
      "Auto-share closets",
      "Bulk offers management",
      "Advanced analytics reports",
      "Multi-store management",
      "API access",
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
      "AI-powered listing creation",
      "Automatic price sync",
      "Multi-account management",
      "White-glove onboarding",
      "Dedicated account manager",
      "Custom integrations",
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
  { feature: "Marketplaces", free: "All 12", starter: "All 12", growth: "All 12", professional: "All 12", unlimited: "All 12" },
  { feature: "Crossposting", free: <Check className="w-4 h-4" />, starter: <Check className="w-4 h-4" />, growth: <Check className="w-4 h-4" />, professional: <Check className="w-4 h-4" />, unlimited: <Check className="w-4 h-4" /> },
  { feature: "Bulk Operations", free: <Check className="w-4 h-4" />, starter: <Check className="w-4 h-4" />, growth: <Check className="w-4 h-4" />, professional: <Check className="w-4 h-4" />, unlimited: <Check className="w-4 h-4" /> },
  { feature: "Auto-Delist", free: <X className="w-4 h-4 text-muted-foreground" />, starter: <Check className="w-4 h-4" />, growth: <Check className="w-4 h-4" />, professional: <Check className="w-4 h-4" />, unlimited: <Check className="w-4 h-4" /> },
  { feature: "AI Assistance", free: <X className="w-4 h-4 text-muted-foreground" />, starter: "Basic", growth: "Advanced", professional: "Advanced", unlimited: "Premium" },
  { feature: "Analytics", free: "Basic", starter: "Standard", growth: "Advanced", professional: "Advanced", unlimited: "Premium" },
  { feature: "Poshmark Automation", free: <X className="w-4 h-4 text-muted-foreground" />, starter: <X className="w-4 h-4 text-muted-foreground" />, growth: <X className="w-4 h-4 text-muted-foreground" />, professional: <Check className="w-4 h-4" />, unlimited: <Check className="w-4 h-4" /> },
  { feature: "Price Sync", free: <X className="w-4 h-4 text-muted-foreground" />, starter: <X className="w-4 h-4 text-muted-foreground" />, growth: "Manual", professional: "Manual", unlimited: "Automatic" },
  { feature: "Support", free: "Community", starter: "Email", growth: "Priority", professional: "24/7 Priority", unlimited: "24/7 VIP" },
];

export default function Pricing() {
  const { user } = useAuth();

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
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.buttonVariant}
                    asChild
                    data-testid={`button-select-${plan.id}`}
                  >
                    {user ? (
                      <Link href="/subscribe">{plan.buttonText}</Link>
                    ) : (
                      <Link href="/signup">{plan.buttonText}</Link>
                    )}
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
          <h2 className="text-3xl font-bold mb-8">Why CrossList Pro Wins</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <Gift className="w-8 h-8 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">Forever Free Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Unlike competitors with trials, our free plan never expires. Start with 10 listings/month forever.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">Better Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Up to 70% less expensive than Vendoo, List Perfectly, and Crosslist for similar features.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Crown className="w-8 h-8 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">All Features Included</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No feature gates. Even free users get access to all 12 marketplaces and core features.
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
    </div>
  );
}