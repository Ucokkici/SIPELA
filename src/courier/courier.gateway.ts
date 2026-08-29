import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class CourierGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(CourierGateway.name);

  afterInit() {
    this.logger.log('📡 Courier WebSocket Gateway siap beroperasi.');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client WS terhubung: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client WS terputus: ${client.id}`);
  }

  /**
   * Client (Customer / Operator) bergabung ke room order untuk live tracking.
   * Event: join_order_tracking, Payload: { order_id: 1029 }
   */
  @SubscribeMessage('join_order_tracking')
  handleJoinOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { order_id: number },
  ) {
    const room = `order_${data.order_id}`;
    client.join(room);
    this.logger.log(`Client ${client.id} bergabung ke room tracking: ${room}`);
    return { success: true, room };
  }

  /**
   * Client meninggalkan room tracking order.
   * Event: leave_order_tracking, Payload: { order_id: 1029 }
   */
  @SubscribeMessage('leave_order_tracking')
  handleLeaveOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { order_id: number },
  ) {
    const room = `order_${data.order_id}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} keluar dari room tracking: ${room}`);
    return { success: true, room };
  }

  /**
   * Broadcast posisi kurir ke room order terkait.
   * Event terkirim ke klien: courier.location.updated
   * @param orderId ID Order
   * @param payload Data lokasi kurir
   */
  broadcastCourierLocation(
    orderId: number,
    payload: {
      order_id: number;
      courier_id: number;
      long: number;
      lat: number;
    },
  ) {
    const room = `order_${orderId}`;
    if (this.server) {
      this.server.to(room).emit('courier.location.updated', payload);
      this.logger.log(
        `📡 [courier.location.updated] Broadcast lokasi kurir #${payload.courier_id} ke room ${room} (Long: ${payload.long}, Lat: ${payload.lat})`,
      );
    }
  }
}
