// Получить токен из localStorage
export const getToken = () => localStorage.getItem('authToken');

// Парсить токен и вернуть данные
export const parseToken = (token?: string) => {
  if (!token) return null;
  try {
    return JSON.parse(atob(token));
  } catch {
    return null;
  }
};

// Получить Epic ID из токена
export const getEpicIdFromToken = () => {
  const token = getToken();
  const data = parseToken(token ?? undefined);
  return data?.epicGamesId ?? null;
};

// Получить userId
export const getUserIdFromToken = () => {
  const token = getToken();
  const data = parseToken(token ?? undefined);
  return data?.userId ?? null;
};
