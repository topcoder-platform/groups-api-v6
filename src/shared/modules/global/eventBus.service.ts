import {
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { M2MService } from './m2m.service';
import { CommonConfig } from 'src/shared/config/common.config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * Event bus message.
 */
class EventBusMessage<T> {
  topic: string;
  originator: string;
  'mime-type': string = 'application/json';
  timestamp: string = new Date().toISOString();
  payload: T;
}

// event bus send email payload
export class EventBusSendEmailPayload {
  data: {
    handle: string;
    reviewPhaseStart: string;
    challengeUrl: string;
    challengeName: string;
  };
  from: Record<string, string> = {
    email: 'Topcoder <noreply@topcoder.com>',
  };
  version: string = 'v3';
  sendgrid_template_id: string;
  recipients: string[];
}

@Injectable()
export class EventBusService {
  private readonly logger: Logger = new Logger(EventBusService.name);

  constructor(
    private readonly m2mService: M2MService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Send email message to Event bus.
   * @param payload send email payload
   */
  async sendEmail(payload: EventBusSendEmailPayload): Promise<void> {
    // Get M2m token
    const token = await this.m2mService.getM2MToken();
    // build event bus message
    const msg = new EventBusMessage<EventBusSendEmailPayload>();
    msg.topic = 'external.action.email';
    // TODO: Maybe we should update this value.
    msg.originator = 'ap-review-microservice';
    msg.payload = payload;
    // send message to event bus
    const url = CommonConfig.BUSAPI_URL;
    try {
      const response = await firstValueFrom(
        this.httpService.post(url, msg, {
          headers: {
            Authorization: 'Bearer ' + token,
          },
        }),
      );

      /* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
      if (
        response.status !== HttpStatus.OK &&
        response.status !== HttpStatus.NO_CONTENT
      ) {
        throw new Error(`Event bus status code: ${response.status}`);
      }
      /* eslint-enable @typescript-eslint/no-unsafe-enum-comparison */
    } catch (e) {
      this.logger.error(`Event bus failed with error: ${e.message}`);
      throw new InternalServerErrorException(
        'Sending message to event bus failed.',
      );
    }
  }
}
