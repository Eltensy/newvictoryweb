import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  Eye, 
  Lock, 
  Database, 
  Users, 
  Mail, 
  Phone, 
  Clock,
  ArrowLeft,
  FileText,
  AlertTriangle,
  CheckCircle,
  Globe,
  UserCheck,
  Trophy,
  Target,
  Zap,
  Home
} from "lucide-react";

export default function PrivacyPolicyPage() {
  const lastUpdated = "September 13, 2025";
  
  return (
    <div className="min-h-screen bg-gaming-dark text-gaming-light">
      {/* Cyberpunk Background Effect */}
      <div className="fixed inset-0 bg-gradient-to-br from-gaming-dark via-gaming-dark to-gaming-primary/5 pointer-events-none"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent)] pointer-events-none"></div>
      
      {/* Header */}
      <header className="relative z-50 border-b border-gaming-accent/20 bg-gaming-dark/80 backdrop-blur-sm sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => window.location.href = "/"}
              className="hover-elevate text-gaming-light hover:text-gaming-primary hover:bg-gaming-accent/10"
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
            <Separator orientation="vertical" className="h-6 bg-gaming-accent/20" />
            <Shield className="h-8 w-8 text-gaming-primary" />
            <span className="text-xl font-bold font-gaming text-gaming-light">Privacy Policy</span>
          </div>
          <Badge variant="secondary" className="font-gaming bg-gaming-accent/20 text-gaming-light border-gaming-accent/30">
            <Clock className="h-3 w-3 mr-1" />
            Updated: {lastUpdated}
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Introduction */}
          <Card className="border-gaming-primary/30 bg-gaming-dark/50 backdrop-blur-sm hover-elevate">
            <CardHeader className="bg-gradient-to-r from-gaming-primary/10 to-transparent">
              <CardTitle className="font-gaming flex items-center gap-2 text-2xl text-gaming-light">
                <Trophy className="h-6 w-6 text-gaming-primary" />
                Welcome to ContestGG Privacy Center
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg text-gaming-light/90">
                At <span className="text-gaming-primary font-gaming font-bold">ContestGG</span>, your privacy isn't just protected—it's 
                <span className="text-gaming-success font-semibold"> legendary</span>. We're committed to keeping your data as secure as your best plays.
              </p>
              <p className="text-gaming-light/80">
                This Privacy Policy outlines how we collect, use, store, and protect your information when you dominate our gaming platform and submission system.
              </p>
              <div className="bg-gaming-accent/10 p-4 rounded-lg border border-gaming-accent/20 backdrop-blur-sm">
                <p className="text-sm text-gaming-light/70 font-gaming">
                  <span className="text-gaming-success font-bold">EFFECTIVE:</span> {lastUpdated} | 
                  <span className="text-gaming-primary font-bold"> CONTACT:</span> privacy@contestgg.com
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Information We Collect */}
          <Card className="border-gaming-accent/20 bg-gaming-dark/50 backdrop-blur-sm hover-elevate">
            <CardHeader>
              <CardTitle className="font-gaming flex items-center gap-2 text-gaming-light">
                <Database className="h-5 w-5 text-gaming-secondary" />
                Player Data We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3 bg-gaming-success/5 p-4 rounded-lg border border-gaming-success/20">
                  <h4 className="font-gaming font-semibold flex items-center gap-2 text-gaming-light">
                    <UserCheck className="h-4 w-4 text-gaming-success" />
                    Player Profile
                  </h4>
                  <ul className="text-sm space-y-1 text-gaming-light/70 ml-6">
                    <li>• Epic Games ID and profile data</li>
                    <li>• Username and display name</li>
                    <li>• Email address (if provided)</li>
                    <li>• Balance and transaction history</li>
                  </ul>
                </div>
                
                <div className="space-y-3 bg-gaming-primary/5 p-4 rounded-lg border border-gaming-primary/20">
                  <h4 className="font-gaming font-semibold flex items-center gap-2 text-gaming-light">
                    <Target className="h-4 w-4 text-gaming-primary" />
                    Victory Content
                  </h4>
                  <ul className="text-sm space-y-1 text-gaming-light/70 ml-6">
                    <li>• Screenshots and gameplay videos</li>
                    <li>• Kill categories and achievements</li>
                    <li>• File metadata and timestamps</li>
                    <li>• Submission performance data</li>
                  </ul>
                </div>

                <div className="space-y-3 bg-gaming-warning/5 p-4 rounded-lg border border-gaming-warning/20">
                  <h4 className="font-gaming font-semibold flex items-center gap-2 text-gaming-light">
                    <Globe className="h-4 w-4 text-gaming-warning" />
                    System Analytics
                  </h4>
                  <ul className="text-sm space-y-1 text-gaming-light/70 ml-6">
                    <li>• IP address and location data</li>
                    <li>• Device and browser information</li>
                    <li>• Platform usage patterns</li>
                    <li>• Performance metrics</li>
                  </ul>
                </div>

                <div className="space-y-3 bg-gaming-accent/5 p-4 rounded-lg border border-gaming-accent/20">
                  <h4 className="font-gaming font-semibold flex items-center gap-2 text-gaming-light">
                    <Zap className="h-4 w-4 text-gaming-accent" />
                    Communication Hub
                  </h4>
                  <ul className="text-sm space-y-1 text-gaming-light/70 ml-6">
                    <li>• Telegram username (optional)</li>
                    <li>• Support conversations</li>
                    <li>• Feedback and reviews</li>
                    <li>• Admin notifications</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How We Use Your Information */}
          <Card className="border-gaming-accent/20 bg-gaming-dark/50 backdrop-blur-sm hover-elevate">
            <CardHeader>
              <CardTitle className="font-gaming flex items-center gap-2 text-gaming-light">
                <Eye className="h-5 w-5 text-gaming-secondary" />
                How We Level Up Your Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {[
                  {
                    title: "Platform Domination",
                    items: ["Epic authentication and account management", "Processing your legendary submissions", "Maintaining leaderboards and stats"],
                    color: "gaming-success",
                    icon: Trophy
                  },
                  {
                    title: "Player Communication",
                    items: ["Victory notifications and updates", "Submission status alerts", "24/7 support coverage"],
                    color: "gaming-primary",
                    icon: Mail
                  },
                  {
                    title: "Performance Analytics",
                    items: ["Analyzing gameplay patterns", "Optimizing platform speed", "Developing epic new features"],
                    color: "gaming-warning",
                    icon: Target
                  },
                  {
                    title: "Fair Play Protection",
                    items: ["Anti-cheat and fraud prevention", "Legal compliance protocols", "Terms of service enforcement"],
                    color: "gaming-accent",
                    icon: Shield
                  }
                ].map((section, index) => (
                  <div key={index} className={`bg-${section.color}/10 p-4 rounded-lg border border-${section.color}/20 hover-elevate`}>
                    <h4 className="font-gaming font-semibold mb-2 flex items-center gap-2 text-gaming-light">
                      <section.icon className={`h-4 w-4 text-${section.color}`} />
                      {section.title}
                    </h4>
                    <ul className="text-sm space-y-1 text-gaming-light/70">
                      {section.items.map((item, itemIndex) => (
                        <li key={itemIndex}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Data Sharing - Gaming Style */}
          <Card className="border-gaming-accent/20 bg-gaming-dark/50 backdrop-blur-sm hover-elevate">
            <CardHeader>
              <CardTitle className="font-gaming flex items-center gap-2 text-gaming-light">
                <Users className="h-5 w-5 text-gaming-warning" />
                Squad Share Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gaming-success/10 p-4 rounded-lg border border-gaming-success/30 hover-elevate">
                <h4 className="font-gaming font-semibold text-gaming-success flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4" />
                  Trusted Allies (We Share With):
                </h4>
                <ul className="text-sm space-y-1 text-gaming-light/80">
                  <li>• <strong className="text-gaming-success">Epic Games:</strong> Authentication and player verification</li>
                  <li>• <strong className="text-gaming-success">Payment Systems:</strong> Reward distribution and payouts</li>
                  <li>• <strong className="text-gaming-success">Cloud Partners:</strong> Secure hosting and data storage</li>
                  <li>• <strong className="text-gaming-success">Legal Authorities:</strong> When required by law or safety</li>
                </ul>
              </div>

              <div className="bg-gaming-destructive/10 p-4 rounded-lg border border-gaming-destructive/30 hover-elevate">
                <h4 className="font-gaming font-semibold text-gaming-destructive flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  No-Go Zone (We NEVER Share With):
                </h4>
                <ul className="text-sm space-y-1 text-gaming-light/80">
                  <li>• Advertising networks or marketers</li>
                  <li>• Social media platforms (except Epic Games)</li>
                  <li>• Data brokers or third-party analytics</li>
                  <li>• Any unauthorized parties - EVER!</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Security - Fortress Style */}
          <Card className="border-gaming-success/30 bg-gaming-success/5 backdrop-blur-sm hover-elevate">
            <CardHeader>
              <CardTitle className="font-gaming flex items-center gap-2 text-gaming-light">
                <Lock className="h-5 w-5 text-gaming-success" />
                Fortress-Level Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gaming-light/90 font-gaming">
                Your data is protected by <span className="text-gaming-success font-bold">military-grade security</span> - 
                because legends deserve legendary protection:
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gaming-dark/50 p-4 rounded-lg border border-gaming-success/20 hover-elevate">
                  <h4 className="font-gaming font-semibold mb-2 text-gaming-success">Cyber Defense Systems</h4>
                  <ul className="text-sm space-y-1 text-gaming-light/70">
                    <li>• SSL/TLS encryption protocols</li>
                    <li>• Encrypted database fortress</li>
                    <li>• Continuous security monitoring</li>
                    <li>• Advanced authentication shields</li>
                  </ul>
                </div>

                <div className="bg-gaming-dark/50 p-4 rounded-lg border border-gaming-success/20 hover-elevate">
                  <h4 className="font-gaming font-semibold mb-2 text-gaming-success">Human Firewall</h4>
                  <ul className="text-sm space-y-1 text-gaming-light/70">
                    <li>• Restricted admin access controls</li>
                    <li>• Team security training programs</li>
                    <li>• Complete audit trail logging</li>
                    <li>• Rapid incident response team</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gaming-warning/10 p-4 rounded-lg border border-gaming-warning/30 hover-elevate">
                <p className="text-sm text-gaming-light/80 font-gaming">
                  <AlertTriangle className="h-4 w-4 text-gaming-warning inline mr-2" />
                  <strong className="text-gaming-warning">Pro Tip:</strong> Even with our legendary defenses, no system is 100% invincible. 
                  Keep your passwords strong and your account info private!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Player Rights - Power-Up Style */}
          <Card className="border-gaming-primary/30 bg-gaming-primary/5 backdrop-blur-sm hover-elevate">
            <CardHeader>
              <CardTitle className="font-gaming flex items-center gap-2 text-gaming-light">
                <UserCheck className="h-5 w-5 text-gaming-primary" />
                Your Player Powers & Rights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gaming-light/90 font-gaming">
                You're in control of your data destiny. Here are your <span className="text-gaming-primary font-bold">legendary abilities</span>:
              </p>
              
              <div className="grid gap-3">
                {[
                  { power: "Data Vision", description: "Request a complete copy of your player data", icon: Eye },
                  { power: "Profile Edit", description: "Correct any inaccurate information in your records", icon: UserCheck },
                  { power: "Account Deletion", description: "Remove your account and associated data permanently", icon: AlertTriangle },
                  { power: "Data Export", description: "Download your data in a portable format", icon: Database },
                  { power: "Processing Block", description: "Object to certain uses of your personal data", icon: Shield },
                  { power: "Limit Control", description: "Restrict processing in specific situations", icon: Lock }
                ].map((item, index) => (
                  <div key={index} className="flex gap-3 p-3 bg-gaming-dark/30 rounded-lg border border-gaming-primary/20 hover-elevate">
                    <item.icon className="h-5 w-5 text-gaming-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="font-gaming font-semibold text-gaming-light">{item.power}</h5>
                      <p className="text-sm text-gaming-light/70">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gaming-primary/10 p-4 rounded-lg border border-gaming-primary/30 hover-elevate">
                <p className="text-sm text-gaming-light/80 font-gaming">
                  <Mail className="h-4 w-4 text-gaming-primary inline mr-2" />
                  <strong className="text-gaming-primary">Ready to use your powers?</strong> Contact us at privacy@contestgg.com 
                  or through your account settings. We'll respond within 30 days - faster than your best reaction time!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Section - Gaming HQ Style */}
          <Card className="border-gaming-accent/30 bg-gaming-accent/5 backdrop-blur-sm hover-elevate">
            <CardHeader>
              <CardTitle className="font-gaming flex items-center gap-2 text-gaming-light">
                <Mail className="h-5 w-5 text-gaming-accent" />
                Contact Gaming HQ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-gaming font-semibold mb-3 text-gaming-light">Reach Our Command Center</h4>
                <div className="bg-gaming-dark/50 p-4 rounded-lg space-y-3 border border-gaming-accent/20">
                  <div className="flex items-center gap-2 text-gaming-light/80">
                    <Mail className="h-4 w-4 text-gaming-accent" />
                    <strong className="text-gaming-accent">Privacy Officer:</strong> privacy@contestgg.com
                  </div>
                  <div className="flex items-center gap-2 text-gaming-light/80">
                    <Users className="h-4 w-4 text-gaming-accent" />
                    <strong className="text-gaming-accent">Support Squad:</strong> support@contestgg.com
                  </div>
                  <div className="flex items-center gap-2 text-gaming-light/80">
                    <Globe className="h-4 w-4 text-gaming-accent" />
                    <strong className="text-gaming-accent">Base URL:</strong> www.contestgg.com
                  </div>
                </div>
              </div>

              <div className="bg-gaming-primary/10 p-4 rounded-lg border border-gaming-primary/30 hover-elevate">
                <h4 className="font-gaming font-semibold mb-3 text-gaming-light">Policy Updates & Patches</h4>
                <p className="text-gaming-light/70 text-sm mb-3">
                  Like any good game, our privacy policy gets updates. When we release new versions:
                </p>
                <ul className="text-sm space-y-1 text-gaming-light/70 ml-4">
                  <li>• New policy goes live on our website</li>
                  <li>• Version number and date get updated</li>
                  <li>• Major changes trigger player notifications</li>
                  <li>• Previous versions remain accessible</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Footer - Epic Style */}
          <div className="text-center py-8 border-t border-gaming-accent/20">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className="h-8 w-8 text-gaming-primary" />
              <span className="font-gaming text-2xl text-gaming-light">Contest<span className="text-gaming-primary">GG</span></span>
            </div>
            <p className="text-sm text-gaming-light/70 font-gaming">
              Last Updated: <span className="text-gaming-primary">{lastUpdated}</span> | Version <span className="text-gaming-success">1.0</span>
            </p>
            <p className="text-xs text-gaming-light/50 mt-2">
              Governed by gaming law and protected by legendary security protocols.
            </p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <Badge variant="outline" className="bg-gaming-success/10 text-gaming-success border-gaming-success/30 font-gaming">
                GDPR Compliant
              </Badge>
              <Badge variant="outline" className="bg-gaming-primary/10 text-gaming-primary border-gaming-primary/30 font-gaming">
                Player Protected
              </Badge>
              <Badge variant="outline" className="bg-gaming-accent/10 text-gaming-accent border-gaming-accent/30 font-gaming">
                Legendary Secure
              </Badge>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}