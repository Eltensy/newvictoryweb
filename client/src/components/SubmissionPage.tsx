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
    <div className="min-h-screen bg-background">
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
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
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
          <div className="grid lg:grid-cols-3 gap-6">
            {/* File Upload Area - Takes 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              {/* File Upload Section */}
              <div className="bg-card/30 backdrop-blur-sm rounded-lg border border-border p-6">
                <FileUpload
                  selectedFile={selectedFile}
                  onFileSelect={setSelectedFile}
                  additionalText={additionalText}
                  onAdditionalTextChange={setAdditionalText}
                  isSubmitting={isSubmitting}
                />
              </div>
            </div>

            {/* Category Selection Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Category Selection Section */}
              <div className="bg-card/30 backdrop-blur-sm rounded-lg border border-border p-6">
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
    </div>
  );
}