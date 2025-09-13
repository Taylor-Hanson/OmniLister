import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";
import { useState } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, Clock, Target, Zap, Award,
  AlertCircle, CheckCircle, RefreshCw, Play, Settings,
  Brain, LineChartIcon, Calendar, DollarSign, ShoppingBag,
  ArrowUpRight, ArrowDownRight, Lightbulb, Star, Maximize2
} from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

interface OptimizationOpportunity {
  type: 'timing' | 'pricing' | 'marketplace' | 'content';
  priority: 'high' | 'medium' | 'low';
  description: string;
  potentialImprovement: number;
  confidence: number;
  targetListings: number;
}

interface PerformanceTrend {
  trend: 'increasing' | 'decreasing' | 'stable';
  strength: number;
  changePercent: number;
  confidence: number;
}

interface OptimizationInsights {
  overallScore: number;
  opportunities: OptimizationOpportunity[];
  trends: PerformanceTrend;
  bestPerformingTimes: Array<{
    dayOfWeek: number;
    hourOfDay: number;
    avgSuccessScore: number;
    conversionRate: number;
    sampleSize: number;
  }>;
  marketplacePerformance: Array<{
    marketplace: string;
    avgSuccessScore: number;
    conversionRate: number;
    totalPosts: number;
    recommendation: string;
  }>;
  categoryInsights: Array<{
    category: string;
    avgSuccessScore: number;
    conversionRate: number;
    avgEngagement: number;
    recommendation: string;
  }>;
}

function OptimizationScore({ score }: { score: number }) {
  const radius = 50;
  const strokeWidth = 6;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };

  const getScoreLabel = () => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    return "Needs Work";
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={getColor()}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset, transition: "stroke-dashoffset 1.5s ease-in-out" }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold" style={{ color: getColor() }}>{score}</span>
        <span className="text-xs text-muted-foreground font-medium">{getScoreLabel()}</span>
      </div>
    </div>
  );
}

function OpportunityCard({ opportunity, onApply }: { 
  opportunity: OptimizationOpportunity; 
  onApply: (opportunity: OptimizationOpportunity) => void;
}) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'timing': return <Clock className="h-4 w-4" />;
      case 'pricing': return <DollarSign className="h-4 w-4" />;
      case 'marketplace': return <ShoppingBag className="h-4 w-4" />;
      case 'content': return <Lightbulb className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 border rounded-lg hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {getTypeIcon(opportunity.type)}
          <span className="font-medium capitalize">{opportunity.type} Optimization</span>
        </div>
        <Badge className={getPriorityColor(opportunity.priority)}>
          {opportunity.priority.toUpperCase()}
        </Badge>
      </div>
      
      <p className="text-sm text-muted-foreground mb-3">{opportunity.description}</p>
      
      <div className="grid grid-cols-3 gap-4 mb-3">
        <div className="text-center">
          <div className="text-lg font-bold text-green-600">+{opportunity.potentialImprovement.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">Potential Gain</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold">{opportunity.confidence}%</div>
          <div className="text-xs text-muted-foreground">Confidence</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold">{opportunity.targetListings}</div>
          <div className="text-xs text-muted-foreground">Listings</div>
        </div>
      </div>
      
      <Button 
        onClick={() => onApply(opportunity)} 
        size="sm" 
        className="w-full"
        data-testid={`button-apply-${opportunity.type}`}
      >
        <Play className="h-4 w-4 mr-2" />
        Apply Optimization
      </Button>
    </motion.div>
  );
}

function TrendChart({ data, title }: { data: any[]; title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChartIcon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function PerformanceRadar({ data, title }: { data: any[]; title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis />
            <Radar name="Performance" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default function OptimizationDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMarketplace, setSelectedMarketplace] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [autoOptimizationEnabled, setAutoOptimizationEnabled] = useState(false);

  // Fetch optimization insights
  const { data: insights, isLoading: loadingInsights } = useQuery({
    queryKey: ['/api/optimization/insights'],
    enabled: !!user,
  });

  // Fetch optimization opportunities
  const { data: opportunities, isLoading: loadingOpportunities } = useQuery({
    queryKey: ['/api/optimization/opportunities'],
    enabled: !!user,
  });

  // Fetch performance trends
  const { data: trends, isLoading: loadingTrends } = useQuery({
    queryKey: ['/api/optimization/trends', { days: 30, marketplace: selectedMarketplace }],
    enabled: !!user,
  });

  // Fetch time analysis data
  const { data: timeAnalysis, isLoading: loadingTimeAnalysis } = useQuery({
    queryKey: ['/api/optimization/time-analysis', { marketplace: selectedMarketplace, category: selectedCategory }],
    enabled: !!user,
  });

  // Fetch patterns data
  const { data: patterns, isLoading: loadingPatterns } = useQuery({
    queryKey: ['/api/optimization/patterns', { marketplace: selectedMarketplace, category: selectedCategory, days: 30 }],
    enabled: !!user,
  });

  // Apply optimization recommendations mutation
  const applyOptimizationMutation = useMutation({
    mutationFn: async (data: { recommendations: any[]; applyScheduling: boolean; applyPricing: boolean }) =>
      apiRequest('/api/optimization/apply-recommendations', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      }),
    onSuccess: () => {
      toast({
        title: "Optimization Applied",
        description: "Your optimization recommendations have been successfully applied.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/optimization/insights'] });
    },
    onError: (error: any) => {
      toast({
        title: "Optimization Failed",
        description: error.message || "Failed to apply optimization recommendations",
        variant: "destructive",
      });
    }
  });

  const handleApplyOpportunity = (opportunity: OptimizationOpportunity) => {
    const recommendations = [{
      type: opportunity.type,
      priority: opportunity.priority,
      description: opportunity.description,
      confidence: opportunity.confidence,
      targetListings: opportunity.targetListings
    }];

    applyOptimizationMutation.mutate({
      recommendations,
      applyScheduling: opportunity.type === 'timing',
      applyPricing: opportunity.type === 'pricing'
    });
  };

  const isLoading = loadingInsights || loadingOpportunities || loadingTrends || loadingTimeAnalysis || loadingPatterns;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-[200px] w-full" />
        ))}
      </div>
    );
  }

  // Handle insufficient data gracefully
  const hasInsufficientData = 
    (!insights || !insights.overallScore) && 
    (!opportunities || opportunities.length === 0) &&
    (!timeAnalysis || !timeAnalysis.timeSlots || timeAnalysis.timeSlots.length < 5);

  if (hasInsufficientData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Brain className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Learning In Progress</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            We need more listing and posting data to generate personalized optimization insights. 
            Continue creating and posting listings to unlock powerful AI-driven recommendations.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <Card className="p-4">
              <div className="text-center">
                <LineChartIcon className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                <h3 className="font-medium">Create More Listings</h3>
                <p className="text-sm text-muted-foreground">At least 10 listings needed</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <Calendar className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <h3 className="font-medium">Post Regularly</h3>
                <p className="text-sm text-muted-foreground">Multiple posting times help us learn</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <Target className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                <h3 className="font-medium">Try Different Markets</h3>
                <p className="text-sm text-muted-foreground">More platforms = better insights</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const optimizationScore = insights?.overallScore || 0;
  const performanceTrend = trends?.trend || 'stable';
  const trendColor = performanceTrend === 'increasing' ? 'text-green-600' : 
                     performanceTrend === 'decreasing' ? 'text-red-600' : 'text-gray-600';
  const TrendIcon = performanceTrend === 'increasing' ? ArrowUpRight : 
                   performanceTrend === 'decreasing' ? ArrowDownRight : RefreshCw;

  // Format time analysis data for charts
  const timeSlotData = timeAnalysis?.timeSlots?.map((slot: any) => ({
    time: `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][slot.dayOfWeek]} ${slot.hourOfDay}:00`,
    success: slot.avgSuccessScore,
    conversion: slot.conversionRate,
    engagement: slot.avgEngagement
  })) || [];

  const radarData = patterns?.categories?.map((cat: any) => ({
    subject: cat.category,
    value: cat.avgSuccessScore
  })) || [];

  return (
    <div className="space-y-6" data-testid="optimization-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Optimization Engine</h1>
          <p className="text-muted-foreground">AI-powered insights to maximize your posting success</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-optimization"
              checked={autoOptimizationEnabled}
              onCheckedChange={setAutoOptimizationEnabled}
              data-testid="switch-auto-optimization"
            />
            <Label htmlFor="auto-optimization">Auto-optimization</Label>
          </div>
          <Button variant="outline" size="sm" data-testid="button-refresh-insights">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Insights
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="marketplace-filter">Marketplace</Label>
              <Select value={selectedMarketplace} onValueChange={setSelectedMarketplace}>
                <SelectTrigger data-testid="select-marketplace">
                  <SelectValue placeholder="All Marketplaces" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Marketplaces</SelectItem>
                  <SelectItem value="ebay">eBay</SelectItem>
                  <SelectItem value="poshmark">Poshmark</SelectItem>
                  <SelectItem value="mercari">Mercari</SelectItem>
                  <SelectItem value="facebook">Facebook Marketplace</SelectItem>
                  <SelectItem value="depop">Depop</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="category-filter">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="home">Home & Garden</SelectItem>
                  <SelectItem value="collectibles">Collectibles</SelectItem>
                  <SelectItem value="automotive">Automotive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card data-testid="card-optimization-score">
          <CardHeader className="text-center">
            <CardTitle className="text-sm font-medium">Optimization Score</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <OptimizationScore score={optimizationScore} />
          </CardContent>
        </Card>

        <Card data-testid="card-performance-trend">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendIcon className={`h-8 w-8 ${trendColor}`} />
              <div>
                <div className="text-2xl font-bold capitalize">{performanceTrend}</div>
                <div className="text-sm text-muted-foreground">
                  {trends?.changePercent > 0 ? '+' : ''}{trends?.changePercent || 0}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-opportunities">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{opportunities?.length || 0}</div>
            <div className="text-sm text-muted-foreground">
              {opportunities?.filter((o: any) => o.priority === 'high').length || 0} high priority
            </div>
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                <Target className="h-3 w-3 mr-1" />
                Ready to optimize
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-potential-improvement">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Potential Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{opportunities?.reduce((sum: number, opp: any) => sum + opp.potentialImprovement, 0)?.toFixed(1) || 0}%
            </div>
            <div className="text-sm text-muted-foreground">
              Success rate boost
            </div>
            <div className="mt-2">
              <Progress 
                value={Math.min(100, opportunities?.reduce((sum: number, opp: any) => sum + opp.potentialImprovement, 0) || 0)} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="opportunities" className="space-y-4">
        <TabsList data-testid="tabs-optimization">
          <TabsTrigger value="opportunities" data-testid="tab-opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="patterns" data-testid="tab-patterns">Patterns</TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
          <TabsTrigger value="insights" data-testid="tab-insights">Insights</TabsTrigger>
        </TabsList>

        {/* Optimization Opportunities Tab */}
        <TabsContent value="opportunities" className="space-y-4" data-testid="content-opportunities">
          {opportunities && opportunities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {opportunities.map((opportunity: OptimizationOpportunity, index: number) => (
                <OpportunityCard
                  key={index}
                  opportunity={opportunity}
                  onApply={handleApplyOpportunity}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">All Optimized!</h3>
                  <p className="text-muted-foreground">
                    Your posting strategy is currently well-optimized. New opportunities will appear as more data is collected.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Pattern Analysis Tab */}
        <TabsContent value="patterns" className="space-y-4" data-testid="content-patterns">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrendChart 
              data={timeSlotData} 
              title="Success by Time Slot"
            />
            <PerformanceRadar 
              data={radarData} 
              title="Category Performance"
            />
          </div>

          {/* Best Performing Times */}
          <Card data-testid="card-best-times">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Best Performing Times
              </CardTitle>
              <CardDescription>
                Optimal posting windows based on historical success data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {timeAnalysis?.bestTimes?.slice(0, 6).map((time: any, index: number) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][time.dayOfWeek]}
                      </span>
                      <Badge variant="outline">{time.hourOfDay}:00</Badge>
                    </div>
                    <div className="text-2xl font-bold text-green-600 mb-1">{time.avgSuccessScore.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">Success Score</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {time.sampleSize} posts analyzed
                    </div>
                  </div>
                )) || (
                  <div className="col-span-3 text-center py-8 text-muted-foreground">
                    Analyzing patterns... More data needed for detailed insights.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Analysis Tab */}
        <TabsContent value="performance" className="space-y-4" data-testid="content-performance">
          {/* Marketplace Performance */}
          <Card data-testid="card-marketplace-performance">
            <CardHeader>
              <CardTitle>Marketplace Performance</CardTitle>
              <CardDescription>Compare success rates across different marketplaces</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={insights?.marketplacePerformance || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="marketplace" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avgSuccessScore" fill="#8b5cf6" />
                  <Bar dataKey="conversionRate" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Performance Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card data-testid="card-avg-success">
              <CardHeader>
                <CardTitle className="text-sm">Average Success Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {insights?.marketplacePerformance?.reduce((acc: number, mp: any) => acc + mp.avgSuccessScore, 0) / (insights?.marketplacePerformance?.length || 1) || 0}
                </div>
                <p className="text-sm text-muted-foreference">Across all marketplaces</p>
              </CardContent>
            </Card>

            <Card data-testid="card-avg-conversion">
              <CardHeader>
                <CardTitle className="text-sm">Average Conversion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {insights?.marketplacePerformance?.reduce((acc: number, mp: any) => acc + mp.conversionRate, 0) / (insights?.marketplacePerformance?.length || 1) || 0}%
                </div>
                <p className="text-sm text-muted-foreference">Conversion rate</p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-posts">
              <CardHeader>
                <CardTitle className="text-sm">Total Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {insights?.marketplacePerformance?.reduce((acc: number, mp: any) => acc + mp.totalPosts, 0) || 0}
                </div>
                <p className="text-sm text-muted-foreference">Analyzed</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insights & Recommendations Tab */}
        <TabsContent value="insights" className="space-y-4" data-testid="content-insights">
          <Alert data-testid="alert-ai-insights">
            <Brain className="h-4 w-4" />
            <AlertTitle>AI-Powered Insights</AlertTitle>
            <AlertDescription>
              Our optimization engine has analyzed your posting patterns and identified key improvement areas.
            </AlertDescription>
          </Alert>

          {/* Category Insights */}
          <Card data-testid="card-category-insights">
            <CardHeader>
              <CardTitle>Category Insights</CardTitle>
              <CardDescription>Performance analysis by product category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights?.categoryInsights?.map((category: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{category.category}</h4>
                      <p className="text-sm text-muted-foreground">{category.recommendation}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{category.avgSuccessScore.toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground">Success Score</div>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    Category insights will appear as more data is collected.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card data-testid="card-recommendations">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Smart Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights?.recommendations?.map((rec: any, index: number) => (
                  <Alert key={index}>
                    <Lightbulb className="h-4 w-4" />
                    <AlertTitle>{rec.title}</AlertTitle>
                    <AlertDescription>{rec.description}</AlertDescription>
                  </Alert>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    Smart recommendations are being generated based on your posting patterns.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}