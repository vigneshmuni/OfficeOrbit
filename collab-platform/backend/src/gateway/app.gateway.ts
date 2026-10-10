import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/ws',
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppGateway.name);
  private userSocketMap = new Map<string, string[]>(); // userId -> socketIds

  constructor(private jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.data.email = payload.email;

      // Track user-socket mapping
      const existing = this.userSocketMap.get(payload.sub) || [];
      this.userSocketMap.set(payload.sub, [...existing, client.id]);

      this.logger.log(`Client connected: ${client.id} (User: ${payload.email})`);
    } catch (err) {
      this.logger.warn(`Unauthorized WS connection: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = this.userSocketMap.get(userId) || [];
      const updated = sockets.filter((id) => id !== client.id);
      if (updated.length === 0) {
        this.userSocketMap.delete(userId);
      } else {
        this.userSocketMap.set(userId, updated);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:project')
  @SubscribeMessage('join-project')
  handleJoinProject(@ConnectedSocket() client: Socket, @MessageBody() projectId: string) {
    client.join(`project:${projectId}`);
    this.logger.log(`Socket ${client.id} joined project:${projectId}`);
  }

  @SubscribeMessage('leave:project')
  @SubscribeMessage('leave-project')
  handleLeaveProject(@ConnectedSocket() client: Socket, @MessageBody() projectId: string) {
    client.leave(`project:${projectId}`);
  }

  // Emit to all connected sockets
  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  // Emit to a specific project room
  emitToProject(projectId: string, event: string, data: any) {
    this.server.to(`project:${projectId}`).emit(event, data);
  }

  // Emit to a specific user across all their sockets
  emitToUser(userId: string, event: string, data: any) {
    const socketIds = this.userSocketMap.get(userId) || [];
    socketIds.forEach((socketId) => {
      this.server.to(socketId).emit(event, data);
    });
  }

  // Emit to all sockets in a project room except the sender
  emitToProjectExcept(projectId: string, exceptSocketId: string, event: string, data: any) {
    this.server.to(`project:${projectId}`).except(exceptSocketId).emit(event, data);
  }
}
