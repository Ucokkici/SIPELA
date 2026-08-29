import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  // Mengembalikan informasi health check dasar
  getHealth() {
    return {
      success: true,
      data: {
        service: 'SIPELA API',
        version: '2.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
