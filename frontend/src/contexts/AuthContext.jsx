import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import { toast } from 'sonner';
import ProfileCompletionDialog from '../components/ProfileCompletionDialog';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('whisper_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const userInfo = await apiService.getCurrentUser();
          setUser(userInfo.user);
          
          // Check if user needs to complete profile
          if (userInfo.user && shouldShowProfileCompletion(userInfo.user)) {
            setShowProfileCompletion(true);
          }
        } catch (error) {
          // Token is invalid, remove it
          localStorage.removeItem('whisper_token');
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [token]);

  // Helper function to determine if user should see profile completion dialog
  const shouldShowProfileCompletion = (user) => {
    // Only show if user hasn't been prompted before
    if (user.profile_prompted) return false;
    
    // Show if user has no profile preferences filled out
    if (!user.preferences) return true;
    
    const { location, industry, purchase_frequency, product_goals } = user.preferences;
    return !location && !industry && !purchase_frequency && !product_goals;
  };

  // Handle profile completion
  const handleProfileCompletion = async (preferences) => {
    setIsUpdatingProfile(true);
    try {
      const result = await apiService.updateUserPreferences(preferences);
      if (result.status === 'success') {
        // Update user state with new preferences and mark as prompted
        setUser(prev => ({
          ...prev,
          preferences: { ...prev.preferences, ...preferences },
          profile_prompted: true
        }));
        setShowProfileCompletion(false);
        toast.success('Profile completed successfully!');
      } else {
        toast.error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleProfileCompletionClose = async () => {
    // Mark user as prompted even if they skip
    try {
      await apiService.dismissProfilePrompt();
      setUser(prev => ({
        ...prev,
        profile_prompted: true
      }));
    } catch (error) {
      console.warn('Failed to dismiss profile prompt:', error);
    }
    setShowProfileCompletion(false);
  };

  const login = async (email, password) => {
    try {
      const result = await apiService.login(email, password);
      
      if (result.status === 'success') {
        setUser(result.user);
        setToken(result.token);
        localStorage.setItem('whisper_token', result.token);
        
        // Check if user needs to complete profile
        if (shouldShowProfileCompletion(result.user)) {
          setShowProfileCompletion(true);
        }
        
        toast.success(`Welcome back, ${result.user.name}!`);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (email, password, name, preferences = null) => {
    try {
      const result = await apiService.register(email, password, name, preferences);
      
      if (result.status === 'success') {
        setUser(result.user);
        setToken(result.token);
        localStorage.setItem('whisper_token', result.token);
        
        // Check if user needs to complete profile
        if (shouldShowProfileCompletion(result.user)) {
          setShowProfileCompletion(true);
        }
        
        toast.success(`Welcome to Whisper, ${result.user.name}!`);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      // Call logout API to blacklist the token
      await apiService.logout();
    } catch (error) {
      // Don't show error to user, just log it
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local state regardless of API call result
      setUser(null);
      setToken(null);
      localStorage.removeItem('whisper_token');
      toast.success('Logged out successfully');
    }
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    showProfileCompletion,
    handleProfileCompletion,
    handleProfileCompletionClose,
    isUpdatingProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <ProfileCompletionDialog
        open={showProfileCompletion}
        onClose={handleProfileCompletionClose}
        onSave={handleProfileCompletion}
        isLoading={isUpdatingProfile}
      />
    </AuthContext.Provider>
  );
};