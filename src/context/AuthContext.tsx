import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUser, useClerk, useAuth } from '@clerk/clerk-react';
import { setTokenGetter, authApi } from '../api';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  goal: string | null;
  emailVerified: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  setUser: (u: UserProfile | null) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
  refreshUser: async () => {},
  getToken: async () => null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);

  // Register Clerk token getter with the API layer
  useEffect(() => {
    if (isLoaded) {
      setTokenGetter(getToken);
    }
  }, [isLoaded, getToken]);

  // Fetch extra profile data (goal etc.) from our DB once Clerk user is available
  const refreshUser = useCallback(async () => {
    if (!clerkUser) {
      setUser(null);
      return;
    }
    try {
      const data = await authApi.getMe();
      if (data) {
        setUser(data);
      } else {
        // Fall back to Clerk data only
        setUser({
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          name: clerkUser.fullName || '',
          avatarUrl: clerkUser.imageUrl || '',
          goal: null,
          emailVerified: clerkUser.primaryEmailAddress?.verification?.status === 'verified',
        });
      }
    } catch {
      setUser({
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        name: clerkUser.fullName || '',
        avatarUrl: clerkUser.imageUrl || '',
        goal: null,
        emailVerified: false,
      });
    }
  }, [clerkUser]);

  useEffect(() => {
    if (isLoaded) {
      refreshUser();
    }
  }, [isLoaded, refreshUser]);

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, refreshUser, getToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
