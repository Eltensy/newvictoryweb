import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/components/LandingPage";
import AdminDashboard from "@/components/AdminDashboard";
import ThemeToggle from "@/components/ThemeToggle";
import PrivacyPolicyPage from "./components/PrivacyPolicyPage"; 

function GameApp() {
  // Theme toggle in top right corner
  const themeToggleButton = (
    <div className="fixed top-4 right-4 z-50">
      <ThemeToggle />
    </div>
  );

  return (
    <>
      {themeToggleButton}
      <LandingPage />
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={GameApp} />
      <Route path="/admin" component={() => (
        <>
          <div className="fixed top-4 right-4 z-50">
            <ThemeToggle />
          </div>
          <AdminDashboard />
        </>
      )} />
      <Route path="/privacy" component={() => (
        <>
          <div className="fixed top-4 right-4 z-50">
            <ThemeToggle />
          </div>
          <PrivacyPolicyPage />
        </>
      )} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;