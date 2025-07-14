import {
  Controller,
  Get,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { PrismaService } from 'src/shared/modules/global/prisma.service';

export class GetHealthCheckResponseDto {
  @ApiProperty({
    description: 'Health checks run number',
    example: '1',
  })
  checksRun: number;
}

@ApiTags('Healthcheck')
@Controller('/groups')
export class HealthCheckController {
  constructor(private readonly prisma: PrismaService) {}

  checksRun = 0;
  timeout = process.env.HEALTH_CHECK_TIMEOUT || 60000;

  @Get('/health')
  @ApiOperation({ summary: 'Execute a health check' })
  async healthCheck(): Promise<GetHealthCheckResponseDto> {
    const response = new GetHealthCheckResponseDto();

    this.checksRun += 1;
    const timestampMS = new Date().getTime();

    try {
      await this.prisma.group.findFirst({
        select: {
          id: true,
        },
      });

      if (new Date().getTime() - timestampMS > Number(this.timeout)) {
        throw new InternalServerErrorException('Database operation is slow.');
      }

      response.checksRun = this.checksRun;
    } catch (error) {
      console.error('Health check failed', error);
      throw new ServiceUnavailableException(
        `There is database operation error, ${error.message}`,
      );
    }

    return response;
  }
}
