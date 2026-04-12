import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';
import { mockLogin, mockRegister, mockUpdateUser, mockSendVerificationCode, mockGetUserById } from '../services/mockBackend';
import { generateKyberKeyPair, generateDilithiumKeyPair } from '../utils/pqc';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Check local storage for persisted session
    const initUser = async () => {
      try {
        const { mockEnsureAllUsersHaveKeys } = await import('../services/mockBackend');
        await mockEnsureAllUsersHaveKeys();

        const storedUserStr = localStorage.getItem('chatapp_user');
        if (storedUserStr) {
          const storedUser = JSON.parse(storedUserStr) as User;
          
          // Ensure legacy users get a key pair for E2EE
          if (!localStorage.getItem(`privKey_${storedUser.id}`)) {
             const keys = generateKyberKeyPair();
             const signKeys = generateDilithiumKeyPair();
             storedUser.publicKey = keys.publicKey;
             // We can also store signPublicKey if we add it to the User type
             localStorage.setItem(`privKey_${storedUser.id}`, keys.secretKey);
             localStorage.setItem(`signPrivKey_${storedUser.id}`, signKeys.secretKey);
             await mockUpdateUser(storedUser.id, storedUser.name, storedUser.avatar, storedUser.publicKey);
             localStorage.setItem('chatapp_user', JSON.stringify(storedUser));
          }
          
          setUser(storedUser);
        }
      } catch (error) {
        console.error("Failed to initialize user session", error);
      } finally {
        setIsInitializing(false);
      }
    };
    initUser();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const user = await mockLogin(email, password);
    if (user) {
      // ✅ Sync with MongoDB user ID
      try {
        const mongoUserResponse = await fetch(`/api/users/by-email/${encodeURIComponent(user.email)}`);
        if (mongoUserResponse.ok) {
          const mongoUser = await mongoUserResponse.json();
          user.id = mongoUser._id; // Update to MongoDB ObjectId
          console.log('[Auth] Synced user ID with MongoDB:', user.id);
        }
      } catch (error) {
        console.warn('[Auth] Could not sync with MongoDB user:', error);
      }

      // If user doesn't have a public key, we might want to generate one, but for now we assume they do or it's a legacy account.
      // In a real app, we'd prompt them to restore their private key or generate a new pair.
      if (!localStorage.getItem(`privKey_${user.id}`)) {
         console.warn("Private key not found locally for this user. E2EE messages may not be decryptable unless restored.");
         // For demo purposes, if no key exists, let's auto-generate a new one to avoid breaking the demo
         const keys = generateKyberKeyPair();
         const signKeys = generateDilithiumKeyPair();
         user.publicKey = keys.publicKey;
         localStorage.setItem(`privKey_${user.id}`, keys.secretKey);
         localStorage.setItem(`signPrivKey_${user.id}`, signKeys.secretKey);
         // We should technically update the backend with the new public key here
         await mockUpdateUser(user.id, user.name, user.avatar, user.publicKey);
      }

      setUser(user);
      localStorage.setItem('chatapp_user', JSON.stringify(user));
      return true;
    }
    return false;
  };

  const sendVerificationCode = async (email: string): Promise<boolean> => {
      return await mockSendVerificationCode(email);
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
     // Generate PQC Key Pairs
     const keys = generateKyberKeyPair();
     const signKeys = generateDilithiumKeyPair();
     
     const newUser = await mockRegister(email, password, name, keys.publicKey);
     if (newUser) {
        // Store Private Keys locally
        localStorage.setItem(`privKey_${newUser.id}`, keys.secretKey);
        localStorage.setItem(`signPrivKey_${newUser.id}`, signKeys.secretKey);

        setUser(newUser);
        localStorage.setItem('chatapp_user', JSON.stringify(newUser));
        return true;
     }
     return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('chatapp_user');
  };

  const updateProfile = async (name: string, avatar: string) => {
    if (user) {
        const updatedUser = await mockUpdateUser(user.id, name, avatar, user.publicKey);
        if (updatedUser) {
            setUser(updatedUser);
            localStorage.setItem('chatapp_user', JSON.stringify(updatedUser));
        }
    }
  };

  const refreshUser = async () => {
    if (user) {
        const updatedUser = await mockGetUserById(user.id);
        if (updatedUser) {
            setUser(updatedUser);
            localStorage.setItem('chatapp_user', JSON.stringify(updatedUser));
        }
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, sendVerificationCode, logout, updateProfile, refreshUser, isAuthenticated: !!user, isInitializing }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};