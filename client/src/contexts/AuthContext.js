import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await api.get('/users/me');
          setUser(response.data);
        } catch (error) {
          logout();
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

 // Add this function to your AuthContext
const fetchUser = async () => {
   try {
    const res = await api.get('/user/profile'); // baseURL + /user/profile
    setUser(res.data);
  } catch (err) {
    console.error('Profile verification failed:', err);
    setUser(null);
  }
};

// Update your login function
const login = async (token, userData) => {
    try {
    // Store token and user data
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Set user state directly without verification
    setUser(userData);
    return userData;
  } catch (err) {
    console.error('Login failed:', err);
    logout();
    throw new Error('Login processing failed');
  }
};
  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Add this custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;