import 'reflect-metadata';
import TYPES from '@src/core/types';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { IOrderCommandRepository } from '@src/modules/order-management/infra/db/order-command-repository';
import { OrderCommandRepository } from '@src/modules/order-management/infra/db/dynamo/order-command-repository';
import { OrderRegistrationUseCase } from '@src/modules/order-management/use-cases/order-registration/order-registration';
import { IEventNotifier } from '@src/modules/order-management/infra/event/event-notifier';
import { EventNotifier } from '@src/modules/order-management/infra/event/sns/event-notifier';
import { SNSClient } from '@aws-sdk/client-sns';
import { OrderListUseCase } from '../use-cases/order-list/order-list';
import { IOrderQueryRepository } from './db/order-query-repository';
import { OrderQueryRepository } from './db/dynamo/order-query-repository';
import { OrderCancelationUseCase } from '../use-cases/order-cancelation/order-cancelation';
import { PostProcessingOrderCancelationUseCase } from '../use-cases/order-cancelation/post-processing/post-processing-order-cancelation';
import { OrderEditionUseCase } from '../use-cases/order-edition/order-edition';
import { PostProcessingOrderEditionUseCase } from '../use-cases/order-edition/post-processing/post-processing-order-edition';
import container from '@src/infra/injector';

const dynamoDb = new DynamoDBClient({ region: process.env.REGION });
const snsClient = new SNSClient({ region: process.env.REGION });

// Resources
container.bind<DynamoDBClient>(TYPES.DynamoDBClient).toConstantValue(dynamoDb);
container.bind<SNSClient>(TYPES.SNSClient).toConstantValue(snsClient);

// Repos
container.bind<IOrderCommandRepository>(TYPES.IOrderCommandRepository).to(OrderCommandRepository);
container.bind<IOrderQueryRepository>(TYPES.IOrderQueryRepository).to(OrderQueryRepository);

container.bind<IEventNotifier>(TYPES.IEventNotifier).to(EventNotifier);

// UseCases
container.bind<OrderEditionUseCase>(TYPES.OrderEditionUseCase).to(OrderEditionUseCase);
container.bind<OrderCancelationUseCase>(TYPES.OrderCancelationUseCase).to(OrderCancelationUseCase);
container
  .bind<PostProcessingOrderCancelationUseCase>(TYPES.PostProcessingOrderCancelationUseCase)
  .to(PostProcessingOrderCancelationUseCase);
container
  .bind<PostProcessingOrderEditionUseCase>(TYPES.PostProcessingOrderEditionUseCase)
  .to(PostProcessingOrderEditionUseCase);
container.bind<OrderRegistrationUseCase>(TYPES.OrderRegistrationUseCase).to(OrderRegistrationUseCase);
container.bind<OrderListUseCase>(TYPES.OrderListUseCase).to(OrderListUseCase);

export default container;
