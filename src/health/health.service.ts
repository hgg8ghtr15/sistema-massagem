import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getStatatus(): object {
    return {
      status: 'online',
      service: 'sistema-massagem-api',
      timestamp: new Date().toISOString(),
    };
  }
}
