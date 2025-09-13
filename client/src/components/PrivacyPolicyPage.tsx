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
  Home,
  Server,
  Share2,
  Archive,
  Settings
} from "lucide-react";

export default function PrivacyPolicyPage() {
  const lastUpdated = "September 13, 2025";
  const effectiveDate = "September 13, 2025";
  
  return (
    <div className="min-h-screen bg-gaming-dark text-gaming-light">
      {/* Background Effects */}
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
          
          {/* Introduction with Company Details */}
          <Card className="border-gaming-primary/30 bg-gaming-dark/50 backdrop-blur-sm hover-elevate">
            <CardHeader className="bg-gradient-to-r from-gaming-primary/10 to-transparent">
              <CardTitle className="font-gaming flex items-center gap-2 text-2xl text-gaming-light">
                <Trophy className="h-6 w-6 text-gaming-primary" />
                ContestGG Privacy Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gaming-accent/10 p-4 rounded-lg border border-gaming-accent/20">
                <h4 className="font-gaming font-semibold text-gaming-light mb-2">Company Information</h4>
                <div className="text-sm space-y-1 text-gaming-light/80">
                  <p><strong>Service Name:</strong> ContestGG</p>
                  <p><strong>Service Type:</strong> Gaming Achievement Platform & Submission System</p>
                  <p><strong>Effective Date:</strong> {effectiveDate}</p>
                  <p><strong>Last Updated:</strong> {lastUpdated}</p>
                  <p><strong>Privacy Contact:</strong> privacy@contestgg.com</p>
                  <p><strong>Data Protection Officer:</strong> dpo@contestgg.com</p>
                </div>
              </div>
              
              <p className="text-lg text-gaming-light/90">
                This Privacy Policy explains in detail how <span className="text-gaming-primary font-gaming font-bold">ContestGG</span> captures, 
                uses, shares, and retains your personal information when you use our gaming platform.
              </p>
            </CardContent>
          </Card>

          {/* SECTION 1: HOW DATA IS CAPTURED */}
          <Card className="border-gaming-success/30 bg-gaming-success/5 backdrop-blur-sm hover-elevate">
            <CardHeader>
              <CardTitle className="font-gaming flex items-center gap-2 text-gaming-light">
                <Server className="h-5 w-5 text-gaming-success" />
                1. How We Capture Your Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gaming-light/90">We collect information through the following methods:</p>
              
              <div className="grid gap-4">
                <div className="bg-gaming-dark/30 p-4 rounded-lg border border-gaming-success/20">
                  <h4 className="font-gaming font-semibold text-gaming-success mb-2">Automatic Collection</h4>
                  <ul className="text-sm space-y-1 text-gaming-light/70">
                    <li>• <strong>When you visit our website:</strong> IP address, browser type, device information, page views, timestamps</li>
                    <li>• <strong>During platform usage:</strong> Click patterns, session duration, feature usage, error logs</li>
                    <li>• <strong>Authentication process:</strong> Epic Games OAuth tokens, account verification data</li>
                    <li>• <strong>File uploads:</strong> Metadata, file size, upload timestamp, processing logs</li>
                  </ul>
                </div>

                <div className="bg-gaming-dark/30 p-4 rounded-lg border border-gaming-success/20">
                  <h4 className="font-gaming font-semibold text-gaming-success mb-2">Information You Provide</h4>
                  <ul className="text-sm space-y-1 text-gaming-light/70">
                    <li>• <strong>Account creation:</strong> Epic Games profile data (username, display name, email if shared)</li>
                    <li>• <strong>File submissions:</strong> Images, videos, category selections, original filenames</li>
                    <li>• <strong>Optional integrations:</strong> Telegram username for notifications</li>
                    <li>• <strong>Support interactions:</strong> Messages, feedback, bug reports</li>
                  </ul>
                </div>

                <div className="bg-gaming-dark/30 p-4 rounded-lg border border-gaming-success/20">
                  <h4 className="font-gaming font-semibold text-gaming-success mb-2">Third-Party Data Sources</h4>
                  <ul className="text-sm space-y-1 text-gaming-light/70">
                    <li>• <strong>Epic Games:</strong> Public profile information, authentication tokens, account status</li>
                    <li>• <strong>Payment processors:</strong> Transaction confirmation data (when rewards are processed)</li>
                    <li>• <strong>Analytics services:</strong> Aggregated usage patterns, performance metrics</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2: HOW DATA IS USED */}
          <Card className="border-gaming-primary/30 bg-gaming-primary/5 backdrop-blur-sm hover-elevate">
            <CardHeader>
              <CardTitle className="font-gaming flex items-center gap-2 text-gaming-light">
                <Settings className="h-5 w-5 text-gaming-primary" />
                2. How We Use Your Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gaming-light/90">We use your personal information for specific, legitimate purposes:</p>
              
              <div className="grid gap-4">
                {[
                  {
                    category: "Core Platform Operations",
                    legalBasis: "Contract Performance & Legitimate Interest",
                    purposes: [
                      "User authentication and account management",
                      "Processing and reviewing submitted content",
                      "Calculating and distributing rewards",
                      "Maintaining platform security and preventing fraud",
                      "Providing customer support services"
                    ],
                    icon: Trophy,
                    color: "gaming-primary"
                  },
                  {
                    category: "Communication & Notifications",
                    legalBasis: "Contract Performance & Consent",
                    purposes: [
                      "Sending submission status updates",
                      "Notifying about account changes or rewards",
                      "Providing platform updates and feature announcements",
                      "Responding to support requests",
                      "Sending optional promotional communications (with consent)"
                    ],
                    icon: Mail,
                    color: "gaming-secondary"
                  },
                  {
                    category: "Platform Improvement",
                    legalBasis: "Legitimate Interest",
                    purposes: [
                      "Analyzing usage patterns to improve user experience",
                      "Identifying and fixing technical issues",
                      "Developing new features based on user behavior",
                      "Optimizing platform performance and loading times",
                      "Conducting A/B testing for interface improvements"
                    ],
                    icon: Target,
                    color: "gaming-warning"
                  },
                  {
                    category: "Legal & Compliance",
                    legalBasis: "Legal Obligation & Legitimate Interest",
                    purposes: [
                      "Complying with applicable laws and regulations",
                      "Responding to legal requests and court orders",
                      "Preventing abuse, fraud, and violations of terms",
                      "Protecting user safety and platform integrity",
                      "Maintaining records for audit and compliance purposes"
                    ],
                    icon: Shield,
                    color: "gaming-accent"
                  }
                ].map((section, index) => (
                  <div key={index} className={`bg-${section.color}/10 p-4 rounded-lg border border-${section.color}/20 hover-elevate`}>
                    <div className="flex items-start gap-3 mb-3">
                      <section.icon className={`h-5 w-5 text-${section.color} mt-0.5`} />
                      <div>
                        <h4 className="font-gaming font-semibold text-gaming-light">{section.category}</h4>
                        <p className="text-xs text-gaming-light/60 font-gaming">Legal Basis: {section.legalBasis}</p>
                      </div>
                    </div>
                    <ul className="text-sm space-y-1 text-gaming-light/70">
                      {section.purposes.map((purpose, purposeIndex) => (
                        <li key={purposeIndex}>• {purpose}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SECTION 3: HOW DATA IS SHARED */}
          <Card className="border-gaming-warning/30 bg-gaming-warning/5 backdrop-blur-sm hover-elevate">
            <CardHeader>
              <CardTitle className="font-gaming flex items-center gap-2 text-gaming-light">
                <Share2 className="h-5 w-5 text-gaming-warning" />
                3. How We Share Your Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gaming-light/90">We share your information only in specific circumstances and with strict limitations:</p>
              
              <div className="space-y-4">
                <div className="bg-gaming-success/10 p-4 rounded-lg border border-gaming-success/30">
                  <h4 className="font-gaming font-semibold text-gaming-success mb-3">✓ Authorized Data Sharing</h4>
                  <div className="space-y-3 text-sm text-gaming-light/80">
                    <div>
                      <strong className="text-gaming-success">Epic Games Inc.</strong>
                      <p>• <strong>What:</strong> Authentication tokens, account verification requests</p>
                      <p>• <strong>Why:</strong> Required for OAuth login functionality</p>
                      <p>• <strong>Legal Basis:</strong> Contract performance</p>
                    </div>
                    <div>
                      <strong className="text-gaming-success">Cloud Service Providers (AWS/Google Cloud/etc.)</strong>
                      <p>• <strong>What:</strong> Encrypted user data, uploaded files, database backups</p>
                      <p>• <strong>Why:</strong> Secure hosting and data storage</p>
                      <p>• <strong>Legal Basis:</strong> Legitimate interest, Data Processing Agreements in place</p>
                    </div>
                    <div>
                      <strong className="text-gaming-success">Payment Processors</strong>
                      <p>• <strong>What:</strong> User ID, reward amount, transaction details</p>
                      <p>• <strong>Why:</strong> Processing reward payments</p>
                      <p>• <strong>Legal Basis:</strong> Contract performance</p>
                    </div>
                    <div>
                      <strong className="text-gaming-success">Analytics Services (Privacy-Focused)</strong>
                      <p>• <strong>What:</strong> Anonymized usage data, aggregated statistics</p>
                      <p>• <strong>Why:</strong> Platform improvement and performance monitoring</p>
                      <p>• <strong>Legal Basis:</strong> Legitimate interest, data is anonymized</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gaming-destructive/10 p-4 rounded-lg border border-gaming-destructive/30">
                  <h4 className="font-gaming font-semibold text-gaming-destructive mb-3">⚠️ Legal Disclosure Situations</h4>
                  <div className="space-y-2 text-sm text-gaming-light/80">
                    <p>• <strong>Court orders and subpoenas:</strong> When legally required to comply</p>
                    <p>• <strong>Law enforcement requests:</strong> For valid investigations with proper legal basis</p>
                    <p>• <strong>Safety emergencies:</strong> To prevent harm to users or others</p>
                    <p>• <strong>Terms violation enforcement:</strong> Serious breaches affecting platform integrity</p>
                  </div>
                </div>

                <div className="bg-gaming-accent/10 p-4 rounded-lg border border-gaming-accent/30">
                  <h4 className="font-gaming font-semibold text-gaming-accent mb-3">🔒 What We NEVER Share</h4>
                  <ul className="text-sm space-y-1 text-gaming-light/80">
                    <li>• Personal information with advertisers or marketers</li>
                    <li>• User content with unauthorized third parties</li>
                    <li>• Individual user data with other users (unless explicitly consent)</li>
                    <li>• Raw personal data for commercial purposes</li>
                    <li>• Information to data brokers or similar services</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 4: HOW DATA IS RETAINED */}
          <Card className="border-gaming-accent/30 bg-gaming-accent/5 backdrop-blur-sm hover-elevate">
            <CardHeader>
              <CardTitle className="font-gaming flex items-center gap-2 text-gaming-light">
                <Archive className="h-5 w-5 text-gaming-accent" />
                4. How We Retain Your Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gaming-light/90">We retain your personal information only as long as necessary. Here are our specific retention periods:</p>
              
              <div className="grid gap-4">
                {[
                  {
                    dataType: "Account Information",
                    activePeriod: "While account is active",
                    retentionAfter: "3 years after account deletion",
                    reason: "Legal compliance, dispute resolution, and security purposes",
                    icon: UserCheck
                  },
                  {
                    dataType: "Uploaded Content (Images/Videos)",
                    activePeriod: "While account is active + 1 year",
                    retentionAfter: "Deleted after retention period",
                    reason: "Contest verification, dispute resolution, and content moderation appeals",
                    icon: FileText
                  },
                  {
                    dataType: "Transaction & Reward Records",
                    activePeriod: "Indefinitely for active accounts",
                    retentionAfter: "7 years after last transaction",
                    reason: "Financial record-keeping, tax compliance, and audit requirements",
                    icon: Trophy
                  },
                  {
                    dataType: "Support Communications",
                    activePeriod: "2 years from last interaction",
                    retentionAfter: "Deleted after retention period",
                    reason: "Quality assurance, training, and follow-up support needs",
                    icon: Mail
                  },
                  {
                    dataType: "Usage Analytics",
                    activePeriod: "13 months from collection",
                    retentionAfter: "Aggregated data may be kept longer",
                    reason: "Platform improvement, anonymized analytics, and trend analysis",
                    icon: Target
                  },
                  {
                    dataType: "Security Logs",
                    activePeriod: "12 months from generation",
                    retentionAfter: "Deleted unless under investigation",
                    reason: "Security monitoring, fraud prevention, and incident investigation",
                    icon: Shield
                  }
                ].map((item, index) => (
                  <div key={index} className="bg-gaming-dark/30 p-4 rounded-lg border border-gaming-accent/20 hover-elevate">
                    <div className="flex items-start gap-3 mb-3">
                      <item.icon className="h-5 w-5 text-gaming-accent mt-0.5" />
                      <h4 className="font-gaming font-semibold text-gaming-light">{item.dataType}</h4>
                    </div>
                    <div className="text-sm space-y-1 text-gaming-light/70">
                      <p><strong className="text-gaming-accent">Active Retention:</strong> {item.activePeriod}</p>
                      <p><strong className="text-gaming-accent">After Deletion:</strong> {item.retentionAfter}</p>
                      <p><strong className="text-gaming-accent">Purpose:</strong> {item.reason}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gaming-primary/10 p-4 rounded-lg border border-gaming-primary/30">
                <h4 className="font-gaming font-semibold text-gaming-primary mb-2">Data Deletion Process</h4>
                <ul className="text-sm space-y-1 text-gaming-light/70">
                  <li>• Data is securely deleted using industry-standard methods</li>
                  <li>• Backups containing deleted data are also purged according to schedule</li>
                  <li>• Some data may be retained in anonymized, aggregated form for analytics</li>
                  <li>• Users can request immediate deletion of their data (subject to legal requirements)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* User Rights & Contact */}
          <Card className="border-gaming-primary/30 bg-gaming-primary/5 backdrop-blur-sm hover-elevate">
            <CardHeader>
              <CardTitle className="font-gaming flex items-center gap-2 text-gaming-light">
                <UserCheck className="h-5 w-5 text-gaming-primary" />
                Your Rights & How to Exercise Them
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gaming-light/90">You have the following rights regarding your personal data:</p>
              
              <div className="grid gap-3">
                {[
                  { right: "Right of Access", description: "Request a copy of all personal data we hold about you", timeframe: "Within 30 days" },
                  { right: "Right of Rectification", description: "Correct inaccurate or incomplete personal information", timeframe: "Within 30 days" },
                  { right: "Right of Erasure", description: "Request deletion of your personal data (Right to be Forgotten)", timeframe: "Within 30 days" },
                  { right: "Right of Portability", description: "Receive your data in a structured, machine-readable format", timeframe: "Within 30 days" },
                  { right: "Right to Object", description: "Object to processing based on legitimate interests", timeframe: "Immediate review" },
                  { right: "Right to Restrict Processing", description: "Limit how we process your data in certain situations", timeframe: "Immediate implementation" }
                ].map((item, index) => (
                  <div key={index} className="flex gap-3 p-3 bg-gaming-dark/30 rounded-lg border border-gaming-primary/20 hover-elevate">
                    <CheckCircle className="h-5 w-5 text-gaming-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h5 className="font-gaming font-semibold text-gaming-light">{item.right}</h5>
                      <p className="text-sm text-gaming-light/70">{item.description}</p>
                      <p className="text-xs text-gaming-primary font-gaming mt-1">Response Time: {item.timeframe}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gaming-primary/10 p-4 rounded-lg border border-gaming-primary/30">
                <h4 className="font-gaming font-semibold text-gaming-primary mb-2">How to Contact Us</h4>
                <div className="text-sm text-gaming-light/80 space-y-1">
                  <p><strong>Primary Contact:</strong> privacy@contestgg.com</p>
                  <p><strong>Data Protection Officer:</strong> dpo@contestgg.com</p>
                  <p><strong>Response Time:</strong> Within 72 hours for acknowledgment, 30 days for full response</p>
                  <p><strong>Required Information:</strong> Please include your Epic Games ID and describe your request clearly</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center py-8 border-t border-gaming-accent/20">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className="h-8 w-8 text-gaming-primary" />
              <span className="font-gaming text-2xl text-gaming-light">Contest<span className="text-gaming-primary">GG</span></span>
            </div>
            <p className="text-sm text-gaming-light/70 font-gaming">
              Privacy Policy Version 1.0 | Last Updated: {lastUpdated} | Effective: {effectiveDate}
            </p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <Badge variant="outline" className="bg-gaming-success/10 text-gaming-success border-gaming-success/30 font-gaming">
                GDPR Compliant
              </Badge>
              <Badge variant="outline" className="bg-gaming-primary/10 text-gaming-primary border-gaming-primary/30 font-gaming">
                CCPA Compliant
              </Badge>
              <Badge variant="outline" className="bg-gaming-accent/10 text-gaming-accent border-gaming-accent/30 font-gaming">
                ISO 27001 Aligned
              </Badge>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}