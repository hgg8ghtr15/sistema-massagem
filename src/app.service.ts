import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): object {
    return {
      name: 'sistema-massagem',
      status: 'online',
      timestamp: new Date().toISOString(),
    };
  }
}