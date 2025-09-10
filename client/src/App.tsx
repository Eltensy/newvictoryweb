import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/components/LandingPage";
import SubmissionForm from "@/components/SubmissionForm";
import AdminDashboard from "@/components/AdminDashboard";
import ThemeToggle from "@/components/ThemeToggle";

function GameApp() {
  const [currentView, setCurrentView] = useState<'landing' | 'submission' | 'admin'>('landing');
  
  // Theme toggle in top right corner
  const themeToggleButton = (
    <div className="fixed top-4 right-4 z-50">
      <ThemeToggle />
    </div>
  );

  if (currentView === 'admin') {
    return (
      <>
        {themeToggleButton}
        <AdminDashboard />
      </>
    );
  }

  if (currentView === 'submission') {
    return (
      <>
        {themeToggleButton}
        <SubmissionForm onBack={() => setCurrentView('landing')} />
      </>
    );
  }

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
      <Route path="/admin" component={() => <AdminDashboard />} />
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