import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@ApiTags('System & Health')
@Public()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Health check endpoint: GET /v1/ dan GET /v1/health
  @ApiOperation({ summary: 'Health check status & informasi backend SIPELA' })
  @Get(['', 'health'])
  getHealth() {
    return this.appService.getHealth();
  }
}
