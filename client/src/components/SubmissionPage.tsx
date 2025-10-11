import { useState } from "react";
import Header from "./Header";
import FileUpload from "./FileUpload";
import CategorySelection from "./CategorySelection";
import SuccessScreen from "./SuccessScreen";
import PremiumModal from "./PremiumModal";
import UserProfile from "./UserProfile";
import BalanceModal from "./BalanceModal";

interface User {
  id: string;
  username: string;
  displayName: string;
  balance: number;
  isAdmin: boolean;
}

interface SubmissionPageProps {
  user: User;
  profileOpen: boolean;
  setProfileOpen: (open: boolean) => void;
  balanceModalOpen: boolean;
  setBalanceModalOpen: (open: boolean) => void;
  onLogout: () => void;
  getAuthToken: () => string | null;
  onRefreshUser: () => Promise<void>;
  isRefreshing: boolean;
}

export default function SubmissionPage({ 
  user, 
  profileOpen, 
  setProfileOpen, 
  balanceModalOpen,
  setBalanceModalOpen,
  onLogout, 
  getAuthToken,
  onRefreshUser,
  isRefreshing 
}: SubmissionPageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [additionalText, setAdditionalText] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  const handleSubmit = async () => {
    if (!selectedFile || !selectedCategory) return;
    
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', selectedCategory);
      formData.append('additionalText', additionalText);

      const token = getAuthToken();
      if (!token) {
        alert('Вы не авторизованы');
        return;
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Submission successful:", result);
        setIsSubmitted(true);
        
        // Обновляем баланс пользователя после успешной отправки
        await onRefreshUser();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert(`Failed to submit: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturn = () => {
    setIsSubmitted(false);
    setSelectedFile(null);
    setSelectedCategory("");
    setAdditionalText("");
    // Обновляем баланс при возврате
    onRefreshUser();
  };

  if (isSubmitted) {
    return <SuccessScreen onReturn={handleReturn} />;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-500/5 animate-gradient"></div>
      
      {/* Decorative glow elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/30 rounded-full animate-float"></div>
        <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-purple-500/20 rounded-full animate-float-delayed"></div>
        <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-blue-500/30 rounded-full animate-float"></div>
        <div className="absolute top-1/2 left-1/3 w-2 h-2 bg-primary/20 rounded-full animate-float-delayed"></div>
      </div>

      {/* Header */}
      <Header
        user={user}
        onPremiumClick={() => setIsPremiumModalOpen(true)}
        onBalanceClick={() => setBalanceModalOpen(true)}
        onProfileClick={() => setProfileOpen(true)}
        onRefreshUser={onRefreshUser}
        isRefreshing={isRefreshing}
      />

      {/* Main Content */}
      <main className="relative z-10 py-6">
        <div className="container mx-auto px-4 w-full max-w-[1400px]">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold font-gaming mb-2">
              Готов к загрузке контента?
            </h1>
            <p className="text-muted-foreground text-lg">
              Загружайте свои победы и получай вознаграждения
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-[70%_30%] gap-6 justify-center mx-auto" style={{ maxWidth: '90%' }}>
            {/* File Upload Area */}
            <div className="flex flex-col gap-6">
              {/* File Upload Section with glass effect */}
              <div className="bg-card/30 backdrop-blur-md rounded-2xl border border-border/50 p-6 relative overflow-hidden">
                {/* Glow effect */}
                <div className="absolute top-0 right-0 h-32 w-32 bg-primary/10 rounded-full blur-3xl"></div>
                
                <FileUpload
                  selectedFile={selectedFile}
                  onFileSelect={setSelectedFile}
                  additionalText={additionalText}
                  onAdditionalTextChange={setAdditionalText}
                  isSubmitting={isSubmitting}
                />
              </div>
            </div>

            {/* Category Selection */}
            <div className="flex flex-col gap-6">
              {/* Category Selection Section with glass effect */}
              <div className="bg-card/30 backdrop-blur-md rounded-2xl border border-border/50 p-6 relative overflow-hidden">
                {/* Glow effect */}
                <div className="absolute top-0 right-0 h-32 w-32 bg-purple-500/10 rounded-full blur-3xl"></div>
                
                <CategorySelection
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  selectedFile={selectedFile}
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <UserProfile
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      <BalanceModal
        isOpen={balanceModalOpen}
        onClose={() => setBalanceModalOpen(false)}
        user={user}
        getAuthToken={getAuthToken}
        onRefreshUser={onRefreshUser}
      />

      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
      />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-15px) translateX(10px); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
          animation-delay: 2s;
        }
        
        @keyframes gradient {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        .animate-gradient {
          animation: gradient 8s ease-in-out infinite;
        }

        .delay-500 {
          animation-delay: 0.5s;
        }

        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}