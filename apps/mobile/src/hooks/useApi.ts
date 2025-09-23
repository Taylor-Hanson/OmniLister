// Custom hooks for API integration

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';

interface UseApiOptions {
  immediate?: boolean;
  dependencies?: any[];
}

export function useApi<T>(
  apiCall: () => Promise<{ data?: T; error?: string }>,
  options: UseApiOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  const { immediate = true, dependencies = [] } = options;

  const execute = useCallback(async () => {
    if (!isAuthenticated) {
      setError('Authentication required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiCall();
      if (response.data) {
        setData(response.data);
      } else {
        setError(response.error || 'Request failed');
      }
    } catch (err) {
      setError('Network error');
      console.error('API call failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, isAuthenticated, ...dependencies]);

  useEffect(() => {
    if (immediate && isAuthenticated) {
      execute();
    }
  }, [immediate, isAuthenticated, execute]);

  return {
    data,
    error,
    isLoading,
    refetch: execute,
  };
}

// Specific hooks for common API calls
export function useListings() {
  return useApi(() => apiService.getListings());
}

export function useMarketplaceConnections() {
  return useApi(() => apiService.getMarketplaceConnections());
}

export function useCrossPostingJobs() {
  return useApi(() => apiService.getCrossPostingJobs());
}

export function useUserStats() {
  return useApi(() => apiService.getUserStats());
}

export function useNotifications() {
  return useApi(() => apiService.getNotifications());
}

// Mutation hooks
export function useCreateListing() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createListing = useCallback(async (listingData: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.createListing(listingData);
      if (response.error) {
        setError(response.error);
        return null;
      }
      return response.data;
    } catch (err) {
      setError('Network error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createListing,
    isLoading,
    error,
  };
}

export function useCrossPosting() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCrossPostingJob = useCallback(async (
    listingId: string,
    marketplaces: string[],
    settings: Record<string, any> = {}
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.createCrossPostingJob(listingId, marketplaces, settings);
      if (response.error) {
        setError(response.error);
        return null;
      }
      return response.data;
    } catch (err) {
      setError('Network error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createCrossPostingJob,
    isLoading,
    error,
  };
}

export function useConnectMarketplace() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectMarketplace = useCallback(async (
    marketplaceId: string,
    credentials: Record<string, string>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.connectMarketplace(marketplaceId, credentials);
      if (response.error) {
        setError(response.error);
        return null;
      }
      return response.data;
    } catch (err) {
      setError('Network error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    connectMarketplace,
    isLoading,
    error,
  };
}

export function useUploadImage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = useCallback(async (imageUri: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.uploadImage(imageUri);
      if (response.error) {
        setError(response.error);
        return null;
      }
      return response.data;
    } catch (err) {
      setError('Upload failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    uploadImage,
    isLoading,
    error,
  };
}
