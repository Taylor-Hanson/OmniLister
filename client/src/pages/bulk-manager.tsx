import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

export default function BulkManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedListings, setSelectedListings] = useState<string[]>([]);
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: listings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ['/api/listings'],
    enabled: !!user,
  });

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['/api/jobs'],
    enabled: !!user,
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  const { data: marketplaces = [] } = useQuery({
    queryKey: ['/api/marketplaces'],
    enabled: !!user,
  });

  const postListingsMutation = useMutation({
    mutationFn: async ({ listingIds, marketplaces }: { listingIds: string[]; marketplaces: string[] }) => {
      const jobs = await Promise.all(
        listingIds.map(listingId =>
          apiRequest("POST", "/api/jobs/post-listing", { listingId, marketplaces }).then(res => res.json())
        )
      );
      return jobs;
    },
    onSuccess: (jobs) => {
      toast({
        title: "Bulk posting started",
        description: `${jobs.length} listing(s) are being posted to ${selectedMarketplaces.length} marketplace(s).`,
      });
      setSelectedListings([]);
      setSelectedMarketplaces([]);
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error starting bulk posting",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const delistListingsMutation = useMutation({
    mutationFn: async ({ listingIds, marketplaces }: { listingIds: string[]; marketplaces?: string[] }) => {
      const jobs = await Promise.all(
        listingIds.map(listingId =>
          apiRequest("POST", "/api/jobs/delist-listing", { listingId, marketplaces }).then(res => res.json())
        )
      );
      return jobs;
    },
    onSuccess: (jobs) => {
      toast({
        title: "Bulk delisting started",
        description: `${jobs.length} listing(s) are being delisted.`,
      });
      setSelectedListings([]);
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error starting bulk delisting",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredListings = listings.filter((listing: any) => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (listing.brand && listing.brand.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || listing.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleListingToggle = (listingId: string) => {
    setSelectedListings(prev =>
      prev.includes(listingId)
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId]
    );
  };

  const handleSelectAll = () => {
    if (selectedListings.length === filteredListings.length) {
      setSelectedListings([]);
    } else {
      setSelectedListings(filteredListings.map((listing: any) => listing.id));
    }
  };

  const handleMarketplaceToggle = (marketplace: string) => {
    setSelectedMarketplaces(prev =>
      prev.includes(marketplace)
        ? prev.filter(m => m !== marketplace)
        : [...prev, marketplace]
    );
  };

  const handleBulkPost = () => {
    if (selectedListings.length === 0) {
      toast({
        title: "No listings selected",
        description: "Please select at least one listing to post.",
        variant: "destructive",
      });
      return;
    }

    if (selectedMarketplaces.length === 0) {
      toast({
        title: "No marketplaces selected",
        description: "Please select at least one marketplace.",
        variant: "destructive",
      });
      return;
    }

    postListingsMutation.mutate({
      listingIds: selectedListings,
      marketplaces: selectedMarketplaces,
    });
  };

  const handleBulkDelist = () => {
    if (selectedListings.length === 0) {
      toast({
        title: "No listings selected",
        description: "Please select at least one listing to delist.",
        variant: "destructive",
      });
      return;
    }

    delistListingsMutation.mutate({
      listingIds: selectedListings,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'sold': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const connectedMarketplaces = marketplaces.filter((m: any) => m.isConnected);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Bulk Manager</h1>
        <p className="text-muted-foreground mt-2">
          Manage multiple listings and track posting jobs across all marketplaces
        </p>
      </div>

      <Tabs defaultValue="listings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="listings" data-testid="tab-listings">Listings</TabsTrigger>
          <TabsTrigger value="jobs" data-testid="tab-jobs">Jobs & Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="space-y-6">
          {/* Filters and Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Bulk Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search listings..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-search-listings"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48" data-testid="select-status-filter">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="delisted">Delisted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Marketplace Selection */}
                {connectedMarketplaces.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Select Marketplaces for Posting:</h4>
                    <div className="flex flex-wrap gap-2">
                      {connectedMarketplaces.map((marketplace: any) => (
                        <label
                          key={marketplace.marketplace}
                          className="flex items-center space-x-2 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedMarketplaces.includes(marketplace.marketplace)}
                            onCheckedChange={() => handleMarketplaceToggle(marketplace.marketplace)}
                            data-testid={`checkbox-bulk-marketplace-${marketplace.marketplace}`}
                          />
                          <span className="text-sm capitalize">{marketplace.marketplace}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleBulkPost}
                    disabled={selectedListings.length === 0 || selectedMarketplaces.length === 0 || postListingsMutation.isPending}
                    data-testid="button-bulk-post"
                  >
                    {postListingsMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Posting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-upload mr-2"></i>
                        Post Selected ({selectedListings.length})
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleBulkDelist}
                    disabled={selectedListings.length === 0 || delistListingsMutation.isPending}
                    data-testid="button-bulk-delist"
                  >
                    {delistListingsMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Delisting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-trash mr-2"></i>
                        Delist Selected ({selectedListings.length})
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleSelectAll}
                    data-testid="button-select-all"
                  >
                    {selectedListings.length === filteredListings.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>

                {selectedListings.length > 0 && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                    <p className="text-sm text-primary">
                      {selectedListings.length} listing(s) selected
                      {selectedMarketplaces.length > 0 && 
                        ` • Will post to ${selectedMarketplaces.length} marketplace(s)`
                      }
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Listings Table */}
          <Card>
            <CardHeader>
              <CardTitle>Listings ({filteredListings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {listingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
                </div>
              ) : filteredListings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No listings found matching your criteria.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedListings.length === filteredListings.length && filteredListings.length > 0}
                            onCheckedChange={handleSelectAll}
                            data-testid="checkbox-select-all-listings"
                          />
                        </TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredListings.map((listing: any) => (
                        <TableRow key={listing.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedListings.includes(listing.id)}
                              onCheckedChange={() => handleListingToggle(listing.id)}
                              data-testid={`checkbox-listing-${listing.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                                {listing.images && listing.images.length > 0 ? (
                                  <img
                                    src={listing.images[0]}
                                    alt={listing.title}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <i className="fas fa-image text-muted-foreground"></i>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate">{listing.title}</p>
                                {listing.brand && (
                                  <p className="text-sm text-muted-foreground">{listing.brand}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">${parseFloat(listing.price).toFixed(2)}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(listing.status)}>
                              {listing.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(listing.createdAt), 'MMM d, yyyy')}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" data-testid={`button-edit-${listing.id}`}>
                                <i className="fas fa-edit"></i>
                              </Button>
                              <Button variant="outline" size="sm" data-testid={`button-view-posts-${listing.id}`}>
                                <i className="fas fa-external-link-alt"></i>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No jobs found. Jobs will appear here when you perform bulk actions.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.slice(0, 20).map((job: any) => (
                    <div key={job.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-medium text-foreground capitalize">
                            {job.type.replace('-', ' ')}
                          </h3>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(job.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>

                      {job.status === 'processing' && (
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{job.progress || 0}%</span>
                          </div>
                          <Progress value={job.progress || 0} className="h-2" />
                        </div>
                      )}

                      {job.status === 'completed' && job.result && (
                        <div className="text-sm text-muted-foreground">
                          <p>
                            {job.result.successCount || 0} of {job.result.totalCount || 0} successful
                          </p>
                        </div>
                      )}

                      {job.status === 'failed' && job.errorMessage && (
                        <div className="text-sm text-destructive">
                          <p>Error: {job.errorMessage}</p>
                        </div>
                      )}

                      {job.data && (
                        <div className="text-xs text-muted-foreground mt-2">
                          {job.data.marketplaces && (
                            <p>Marketplaces: {job.data.marketplaces.join(', ')}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
