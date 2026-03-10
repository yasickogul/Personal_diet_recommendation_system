import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { generateText } from '../api/gemini';

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
  const [motivationalQuote, setMotivationalQuote] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('access_token');
    const savedQuote = localStorage.getItem('motivational_quote');
    if (savedQuote) {
      setMotivationalQuote(savedQuote);
    }
    if (token) {
      // Verify token by fetching profile
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/accounts/profile/');
      // Store both profile and user data
      const profileData = response.data;
      setUser({
        id: profileData.user.id,
        username: profileData.user.username,
        email: profileData.user.email,
        profile: profileData,
      });
      setLoading(false);
    } catch (error) {
      // Token invalid, clear it
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setLoading(false);
    }
  };

  const generateMotivationalQuote = async () => {
    try {
      const prompt = "Generate a short, inspiring 2-line motivational quote about health, fitness, or diet. Make it encouraging and positive. Only return the quote, nothing else.";
      const quote = await generateText(prompt);
      setMotivationalQuote(quote.trim());
      localStorage.setItem('motivational_quote', quote.trim());
    } catch (error) {
      console.error("Error generating motivational quote:", error);
      // Fallback quote
      setMotivationalQuote("Every small step towards a healthier you is a victory. Keep going!");
    }
  };

  const signin = async (username, password) => {
    try {
      const response = await api.post('/accounts/signin/', {
        username,
        password,
      });

      const { user: userData, tokens, onboarding_completed } = response.data;

      // Store tokens
      localStorage.setItem('access_token', tokens.access);
      localStorage.setItem('refresh_token', tokens.refresh);

      // Fetch full profile data
      await fetchProfile();

      // Generate motivational quote
      await generateMotivationalQuote();

      // Navigate based on onboarding status
      if (onboarding_completed) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }

      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Invalid credentials';
      return { success: false, error: message };
    }
  };

  const signup = async (userData) => {
    try {
      const response = await api.post('/accounts/signup/', userData);

      const { user: newUser, tokens, onboarding_completed } = response.data;

      // Store tokens
      localStorage.setItem('access_token', tokens.access);
      localStorage.setItem('refresh_token', tokens.refresh);

      // Fetch full profile data
      await fetchProfile();

      // Redirect to onboarding (new users always need to complete onboarding)
      navigate('/onboarding');

      return { success: true };
    } catch (error) {
      if (error.response?.data?.username) {
        return { success: false, error: Array.isArray(error.response.data.username) ? error.response.data.username[0] : error.response.data.username };
      }
      if (error.response?.data?.email) {
        return { success: false, error: Array.isArray(error.response.data.email) ? error.response.data.email[0] : error.response.data.email };
      }
      if (error.response?.data?.password) {
        return { success: false, error: Array.isArray(error.response.data.password) ? error.response.data.password[0] : error.response.data.password };
      }
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Signup failed';
      return { success: false, error: message };
    }
  };

  const signout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    navigate('/signin');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signin,
        signup,
        signout,
        fetchProfile,
        motivationalQuote,
        generateMotivationalQuote,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

