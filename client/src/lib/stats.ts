import { storage } from "@/../../server/storage"; // путь к твоему DatabaseStorage
import { getAuthUserId } from "@/hooks/useAuth"; // функция для получения userId из токена

export default async function handler(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const stats = await storage.getUserStats(userId);
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
}
