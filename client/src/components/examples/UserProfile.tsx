import { useState } from "react";
import { Button } from "@/components/ui/button";
import UserProfile from '../UserProfile'

export default function UserProfileExample() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-4">
      <Button onClick={() => setIsOpen(true)}>
        Открыть профиль
      </Button>
      <UserProfile 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </div>
  )
}