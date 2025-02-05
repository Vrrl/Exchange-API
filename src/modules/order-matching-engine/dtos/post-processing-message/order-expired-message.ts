import { MatchingEngineEventType } from '../../domain/events/matching-engine-event-type';
import { OrderExpirationTypeEnum } from '../../domain/order-expiration-type-enum';
import { OrderStatusEnum } from '../../domain/order-status-enum';
import { OrderTypeEnum } from '../../domain/order-type-enum';
import { PostProcessingMessage } from '../../infra/event/post-processing-message';

export class OrderExpiredMessage implements PostProcessingMessage {
  eventType = MatchingEngineEventType.OrderExpired;
  constructor(
    public payload: {
      id: string;
      type: OrderTypeEnum;
      unitValue: number;
      shares: number;
      status: OrderStatusEnum;
      createdAtTimestamp: number;
      expirationType: OrderExpirationTypeEnum;
      expirationTimestamp: number | null;
    },
  ) {}
}
