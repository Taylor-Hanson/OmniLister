import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: async (key: string) => {
        try {
          return await SecureStore.getItemAsync(key);
        } catch (error) {
          console.error('Error getting item from secure store:', error);
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          await SecureStore.setItemAsync(key, value);
        } catch (error) {
          console.error('Error setting item in secure store:', error);
        }
      },
      removeItem: async (key: string) => {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (error) {
          console.error('Error removing item from secure store:', error);
        }
      },
    },
  },
});

// Helper to get current user's org ID
export async function getCurrentOrgId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  // In a real app, you'd fetch this from a user profile table
  // For now, we'll use a mock org ID
  return '00000000-0000-0000-0000-000000000000';
}

// Helper to make authenticated requests to Edge Functions
export async function callEdgeFunction(functionName: string, options: {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  params?: Record<string, string>;
} = {}) {
  const { method = 'GET', body, params = {} } = options;
  
  const url = new URL(`${supabaseUrl}/functions/v1/${functionName}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Edge function ${functionName} failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
