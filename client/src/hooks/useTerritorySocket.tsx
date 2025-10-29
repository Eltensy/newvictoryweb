import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useTerritorySocket(
  mapId: string | null,
  onTerritoryUpdate?: (data: any) => void,
  onMapUpdate?: (data: any) => void
) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const currentMapIdRef = useRef<string | null>(null);
  const onTerritoryUpdateRef = useRef(onTerritoryUpdate);
  const onMapUpdateRef = useRef(onMapUpdate);

  // Обновляем колбэки без пересоздания эффекта
  useEffect(() => {
    onTerritoryUpdateRef.current = onTerritoryUpdate;
    onMapUpdateRef.current = onMapUpdate;
  }, [onTerritoryUpdate, onMapUpdate]);

  // Создаем сокет один раз при монтировании
  useEffect(() => {
    console.log('🔌 [Socket] Initializing socket connection');

    const socket = io('/', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ [Socket] Connected');
      setIsConnected(true);
      // Если есть текущая карта, присоединяемся к ней
      if (currentMapIdRef.current) {
        console.log('📍 [Socket] Rejoining map:', currentMapIdRef.current);
        socket.emit('join-map', currentMapIdRef.current);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ [Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ [Socket] Connection error:', error.message);
      setIsConnected(false);
    });

    socket.on('territory-update', (data: any) => {
      if (data.mapId === currentMapIdRef.current && onTerritoryUpdateRef.current) {
        onTerritoryUpdateRef.current(data);
      }
    });

    socket.on('map-update', (data: any) => {
      if (data.mapId === currentMapIdRef.current && onMapUpdateRef.current) {
        onMapUpdateRef.current(data);
      }
    });

    socket.on('error', (error) => {
      console.error('❌ [Socket] Socket error:', error);
    });

    return () => {
      console.log('🧹 [Socket] Disconnecting');
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // Создается только один раз!

  // Отдельный эффект для смены карт (только join/leave, без пересоздания сокета)
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const previousMapId = currentMapIdRef.current;

    // Покидаем старую карту
    if (previousMapId && previousMapId !== mapId) {
      console.log('📤 [Socket] Leaving map:', previousMapId);
      socket.emit('leave-map', previousMapId);
    }

    // Присоединяемся к новой карте
    if (mapId) {
      console.log('📥 [Socket] Joining map:', mapId);
      currentMapIdRef.current = mapId;
      if (socket.connected) {
        socket.emit('join-map', mapId);
      }
    } else {
      currentMapIdRef.current = null;
    }

    return () => {
      // При размонтировании или смене карты покидаем текущую
      if (mapId && socket.connected) {
        socket.emit('leave-map', mapId);
      }
    };
  }, [mapId]);

  return { isConnected, socket: socketRef.current };
}