import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface SuccessScreenProps {
  onReturn: () => void;
}

export default function SuccessScreen({ onReturn }: SuccessScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md mx-auto text-center p-8 bg-card/50 backdrop-blur-sm rounded-lg border border-border">
        <div className="w-16 h-16 rounded-full bg-gaming-success/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-8 w-8 text-gaming-success" />
        </div>
        <h1 className="text-2xl font-bold font-gaming mb-4">Заявка отправлена!</h1>
        <p className="text-muted-foreground mb-6">
          Твой контент отправлен на модерацию. Мы рассмотрим его в течение 24 часов.
        </p>
        <Button 
          onClick={onReturn}
          className="w-full font-gaming"
          data-testid="button-submit-another"
        >
          Вернуться
        </Button>
      </div>
    </div>
  );
}