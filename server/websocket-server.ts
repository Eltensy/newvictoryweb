// server/websocket-server.ts - Полная версия с правильной инициализацией

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { territoryStorage } from './territory-storage';

let ioInstance: SocketIOServer | null = null;

/**
 * Инициализирует WebSocket сервер
 * @param httpServer - HTTP сервер Express
 * @returns Экземпляр Socket.IO сервера
 */
export function setupWebSocket(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? false 
        : ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  ioInstance = io;
  console.log('🔌 [WebSocket] Server initialized');

  io.on('connection', (socket) => {
    console.log('✅ [WebSocket] Client connected:', socket.id);

    // Присоединение к комнате карты
    socket.on('join-map', (mapId: string) => {
      socket.join(`map:${mapId}`);
      console.log(`📍 [WebSocket] Socket ${socket.id} joined map:${mapId}`);
      
      // Логируем количество клиентов в комнате
      const room = io.sockets.adapter.rooms.get(`map:${mapId}`);
      console.log(`👥 [WebSocket] Total clients in map:${mapId} - ${room?.size || 0}`);
    });

    // Отсоединение от комнаты карты
    socket.on('leave-map', (mapId: string) => {
      socket.leave(`map:${mapId}`);
      console.log(`📍 [WebSocket] Socket ${socket.id} left map:${mapId}`);
    });

    // Отключение клиента
    socket.on('disconnect', (reason) => {
      console.log(`❌ [WebSocket] Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    // Обработка ошибок
    socket.on('error', (error) => {
      console.error(`❌ [WebSocket] Socket error for ${socket.id}:`, error);
    });
  });

  // Логирование ошибок сервера
  io.on('error', (error) => {
    console.error('❌ [WebSocket] Server error:', error);
  });

  return io;
}

/**
 * Получить текущий экземпляр Socket.IO
 */
export function getIO(): SocketIOServer | null {
  return ioInstance;
}

/**
 * Отправить обновление территории всем клиентам в комнате карты
 */
export async function broadcastTerritoryClaim(
  io: SocketIOServer, 
  mapId: string, 
  territoryId: string
): Promise<void> {
  try {
    console.log('📡 [WebSocket] Broadcasting territory claim:', { 
      mapId, 
      territoryId,
      timestamp: new Date().toISOString()
    });
    
    // ✅ Получаем СВЕЖИЕ данные с сервера
    const updatedTerritories = await territoryStorage.getMapTerritories(mapId);
    const updatedTerritory = updatedTerritories.find((t: any) => t.id === territoryId);
    
    if (!updatedTerritory) {
      console.warn('⚠️ [WebSocket] Territory not found for broadcast:', territoryId);
      return;
    }

    console.log('📤 [WebSocket] Territory data to broadcast:', {
      territoryId,
      name: updatedTerritory.name,
      color: updatedTerritory.color,
      claimCount: updatedTerritory.claims?.length || 0,
      claims: updatedTerritory.claims?.map((c: any) => ({
        userId: c.userId,
        displayName: c.displayName,
      })) || []
    });

    const message = {
      type: 'territory-update',
      mapId,
      territoryId,
      territory: updatedTerritory,
      timestamp: new Date().toISOString()
    };

    // ✅ Отправляем всем в комнате map:${mapId}
    io.to(`map:${mapId}`).emit('territory-update', message);
    
    // ✅ Проверяем количество подключенных клиентов
    const room = io.sockets.adapter.rooms.get(`map:${mapId}`);
    const clientCount = room?.size || 0;
    
    if (clientCount === 0) {
      console.warn(`⚠️ [WebSocket] No clients in room map:${mapId} - broadcast sent but nobody listening`);
    } else {
      console.log(`✅ [WebSocket] Broadcast sent to ${clientCount} client(s) in map:${mapId}`);
    }
    
  } catch (error) {
    console.error('❌ [WebSocket] Broadcast error:', error);
    throw error;
  }
}

/**
 * Отправить полное обновление карты всем клиентам
 */
export async function broadcastMapUpdate(
  io: SocketIOServer, 
  mapId: string
): Promise<void> {
  try {
    console.log('🔄 [WebSocket] Broadcasting full map update:', mapId);

    const message = {
      type: 'map-update',
      mapId,
      timestamp: new Date().toISOString()
    };

    io.to(`map:${mapId}`).emit('map-update', message);
    
    const room = io.sockets.adapter.rooms.get(`map:${mapId}`);
    console.log(`✅ [WebSocket] Map update sent to ${room?.size || 0} client(s)`);
    
  } catch (error) {
    console.error('❌ [WebSocket] Map update broadcast error:', error);
    throw error;
  }
}

/**
 * Получить количество подключенных клиентов в комнате карты
 */
export function getMapRoomSize(mapId: string): number {
  if (!ioInstance) return 0;
  const room = ioInstance.sockets.adapter.rooms.get(`map:${mapId}`);
  return room?.size || 0;
}

/**
 * Получить список всех активных комнат карт
 */
export function getActiveMapRooms(): string[] {
  if (!ioInstance) return [];
  
  const mapRooms: string[] = [];
  ioInstance.sockets.adapter.rooms.forEach((_, roomName) => {
    if (roomName.startsWith('map:')) {
      mapRooms.push(roomName);
    }
  });
  
  return mapRooms;
}