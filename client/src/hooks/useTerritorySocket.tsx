import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useTerritorySocket(
  mapId: string | null,
  onTerritoryUpdate?: (data: any) => void,
  onMapUpdate?: (data: any) => void
) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!mapId) {
      console.log('🔌 [Socket] No mapId provided, skipping connection');
      return;
    }

    console.log('🔌 [Socket] Connecting to map:', mapId);

    // Создаем подключение
    const socket = io('/', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ [Socket] Connected, joining map room:', mapId);
      setIsConnected(true);
      
      // Присоединяемся к комнате карты
      socket.emit('join-map', mapId);
    });

    socket.on('disconnect', () => {
      console.log('❌ [Socket] Disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ [Socket] Connection error:', error);
      setIsConnected(false);
    });

    // ✅ КРИТИЧНО: Слушаем territory-update
    socket.on('territory-update', (data: any) => {
      console.log('🔔 [Socket] Territory update received:', {
        mapId: data.mapId,
        territoryId: data.territoryId,
        claimCount: data.territory?.claims?.length || 0,
        timestamp: data.timestamp
      });

      // Проверяем, что обновление для нашей карты
      if (data.mapId === mapId && onTerritoryUpdate) {
        onTerritoryUpdate(data);
      }
    });

    // ✅ Слушаем map-update (полное обновление карты)
    socket.on('map-update', (data: any) => {
      console.log('🔄 [Socket] Map update received:', data);
      
      if (data.mapId === mapId && onMapUpdate) {
        onMapUpdate(data);
      }
    });

    // Cleanup
    return () => {
      console.log('🔌 [Socket] Disconnecting from map:', mapId);
      if (socket.connected) {
        socket.emit('leave-map', mapId);
      }
      socket.disconnect();
    };
  }, [mapId, onTerritoryUpdate, onMapUpdate]);

  return { isConnected, socket: socketRef.current };
}