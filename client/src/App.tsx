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
import TerritoryMainPage from './components/TerritoryMain';
import TournamentsPage from './components/TournamentsPage';
import TournamentDetailPage from './components/TournamentDetailPage';
import DropMapInvitePage from './components/DropMapInvitePage';
import PremiumModal from './components/PremiumModal';
import PremiumBadge from './components/PremiumBadge';
import { useAuth } from './hooks/useAuth';
import { usePremium } from './hooks/usePremium';
import { Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

function GameApp() {
  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
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
      
      <Route path="/territory" component={() => (
        <>
          <div className="fixed top-4 right-4 z-50">
            <ThemeToggle />
          </div>
          <TerritoryMainPage />
        </>
      )} />
      
      <Route path="/territory/:templateId" component={() => (
        <>
          <div className="fixed top-4 right-4 z-50">
            <ThemeToggle />
          </div>
          <TerritoryMainPage />
        </>
      )} />
      
      <Route path="/tournaments" component={() => (
        <>
          <div className="fixed top-4 right-4 z-50">
            <ThemeToggle />
          </div>
          <TournamentsPage />
        </>
      )} />
      
      <Route path="/tournament/:id" component={() => (
        <>
          <div className="fixed top-4 right-4 z-50">
            <ThemeToggle />
          </div>
          <TournamentDetailPage />
        </>
      )} />
      <Route path="/dropmap/invite/:id" component={() => (
        <>
          <div className="fixed top-4 right-4 z-50">
            <ThemeToggle />
          </div>
          <DropMapInvitePage />
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