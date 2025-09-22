import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trophy, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategorySelectionProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedFile: File | null;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function CategorySelection({ 
  selectedCategory, 
  onCategoryChange, 
  selectedFile, 
  onSubmit, 
  isSubmitting 
}: CategorySelectionProps) {
  const categories = [
    { id: "gold-kill", label: "Голд килл", icon: Trophy, color: "text-yellow-400", bgColor: "bg-gaming-success/10 border-gaming-success/20" },
    { id: "silver-kill", label: "Серебрянный килл", icon: Trophy, color: "text-white-950", bgColor: "bg-gaming-success/10 border-gaming-success/20" },
    { id: "bronze-kill", label: "Бронзовый килл", icon: Trophy, color: "text-yellow-700", bgColor: "bg-gaming-success/10 border-gaming-success/20" },
    { id: "victory", label: "Победа", icon: Target, color: "text-gaming-primary", bgColor: "bg-gaming-primary/10 border-gaming-primary/20" },
    { id: "funny", label: "Другое", icon: Zap, color: "text-gaming-warning", bgColor: "bg-gaming-warning/10 border-gaming-warning/20" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-lg font-gaming mb-4 block">Категория</Label>
      </div>

      <RadioGroup value={selectedCategory} onValueChange={onCategoryChange} className="space-y-4">
        {categories.map((category) => (
          <div key={category.id}>
            <label 
              htmlFor={category.id} 
              className={cn(
                "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 hover-elevate",
                selectedCategory === category.id 
                  ? category.bgColor + " border-current" 
                  : "border-border bg-card/30 hover:bg-card/50"
              )}
            >
              <RadioGroupItem 
                value={category.id} 
                id={category.id}
                className="mt-1"
                data-testid={`radio-${category.id}`}
                disabled={isSubmitting}
              />
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <category.icon className={cn("h-6 w-6", category.color)} />
                  <span className="font-gaming font-semibold">{category.label}</span>
                </div>
              </div>
            </label>
          </div>
        ))}
      </RadioGroup>



      {/* Submit Button */}
      <div className="pt-4">
        <Button
          size="lg"
          className="w-full text-lg py-6 font-gaming hover-elevate"
          disabled={!selectedFile || !selectedCategory || isSubmitting}
          onClick={onSubmit}
          data-testid="button-submit"
        >
          {isSubmitting ? 'Отправка...' :
           !selectedFile ? 'Выбери файл' : 
           !selectedCategory ? 'Выбери категорию' : 
           'Отправить на модерацию'}
        </Button>
        
        {selectedFile && selectedCategory && !isSubmitting && (
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Все готово к отправке!
          </p>
        )}
      </div>
    </div>
  );
}