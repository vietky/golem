import { createContext, useContext, useState, useEffect } from 'react';
import { logger } from '../utils/logger';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authAvailable, setAuthAvailable] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/auth/profile', {
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        logger.info('User authenticated', { uid: userData.uid, email: userData.email });
      } else if (response.status === 404) {
        // Auth not configured on backend - disable auth
        setUser(null);
        logger.info('Authentication not configured on backend');
      } else {
        setUser(null);
        logger.debug('User not authenticated');
      }
    } catch (err) {
      logger.error('Failed to check auth status', { error: err.message });
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    // Redirect to Google OAuth login
    window.location.href = '/auth/google';
  };

  const logout = async () => {
    try {
      const response = await fetch('/auth/logout', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        setUser(null);
        logger.info('User logged out');
      }
    } catch (err) {
      logger.error('Failed to logout', { error: err.message });
      setError('Failed to logout');
    }
  };

  const updateProfile = async (displayName, photoURL) => {
    try {
      const response = await fetch('/auth/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          display_name: displayName,
          photo_url: photoURL,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        logger.info('Profile updated', { displayName });
        return true;
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (err) {
      logger.error('Failed to update profile', { error: err.message });
      setError('Failed to update profile');
      return false;
    }
  };

  const value = {
    user,
    loading,
    error,
    authAvailable,
    login,
    logout,
    updateProfile,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
