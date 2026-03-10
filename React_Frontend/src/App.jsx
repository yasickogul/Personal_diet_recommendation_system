import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import SignIn from "./pages/signIn";
import SignUp from "./pages/signUp";
import Onboarding from "./pages/onboarding";
import Dashboard from "./pages/dashboard";
import MealPlan from "./pages/mealplan";
import LogFood from "./pages/logfood";
import Progress from "./pages/progress";
import Profile from "./pages/profile";
import ProtectedRoute from "./components/ProtectedRoute";

function OnboardingRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      color: 'white'
    }}>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/signin" replace />;
  }
  
  // If onboarding is already completed, redirect to dashboard
  if (user.profile?.onboarding_completed) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

function DashboardRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      color: 'white'
    }}>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/signin" replace />;
  }
  
  // If onboarding is not completed, redirect to onboarding
  if (!user.profile?.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      color: 'white'
    }}>Loading...</div>;
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

export default function App() {
  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <Routes>
      <Route path="/" element={<Navigate to="/signin" replace />} />
      <Route 
        path="/signin" 
        element={
          <PublicRoute>
            <SignIn />
          </PublicRoute>
        } 
      />
      <Route 
        path="/signup" 
        element={
          <PublicRoute>
            <SignUp />
          </PublicRoute>
        } 
      />
      <Route 
        path="/onboarding" 
        element={
          <OnboardingRoute>
            <Onboarding />
          </OnboardingRoute>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <DashboardRoute>
            <Dashboard />
          </DashboardRoute>
        } 
      />
      <Route 
        path="/meal-plan" 
        element={
          <ProtectedRoute>
            <MealPlan />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/log" 
        element={
          <ProtectedRoute>
            <LogFood />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/progress" 
        element={
          <ProtectedRoute>
            <Progress />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } 
      />

      <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
      </div>
  );
}
