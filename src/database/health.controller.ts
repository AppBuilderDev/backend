import { Controller, Get, Inject } from '@nestjs/common';
import { PlatformStore } from '../legacy/platform/store.ts';
@Controller('health')
export class HealthController {
  constructor(@Inject(PlatformStore) private readonly store: PlatformStore) {}
  @Get() health() {
    return { status: 'ok', database: this.store.db.pragma('quick_check', { simple: true }) };
  }
}
