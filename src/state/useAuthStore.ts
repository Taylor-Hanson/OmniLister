import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  orgId: string;
  userId: string | null;
  isAuthenticated: boolean;
  setOrgId: (orgId: string) => void;
  setUserId: (userId: string | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      orgId: '00000000-0000-0000-0000-000000000000', // Default org ID for development
      userId: null,
      isAuthenticated: false,
      setOrgId: (orgId: string) => set({ orgId }),
      setUserId: (userId: string | null) => set({ userId }),
      setAuthenticated: (isAuthenticated: boolean) => set({ isAuthenticated }),
      logout: () => set({ 
        orgId: '00000000-0000-0000-0000-000000000000',
        userId: null, 
        isAuthenticated: false 
      }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
