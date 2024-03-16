import TYPES from '@src/core/types';
import { inject, injectable } from 'inversify';
import { IUseCase } from '@src/core/use-case';
import { Order } from '../../domain/order';
import { v4 as uuid } from 'uuid';
import { OrderStatusEnum } from '../../domain/order-status-enum';
import { OrderTypeEnum } from '../../domain/order-type-enum';
import { OrderExpirationTypeEnum } from '../../domain/order-expiration-type-enum';
import { IOrderCommandRepository } from '../../infra/order-command-repository';

interface OrderRegistrationRequest {
  investorId: string;
  type: OrderTypeEnum;
  value: number;
  quantity: number;
  expirationType: OrderExpirationTypeEnum;
  expirationDate: string | null | undefined;
}

type OrderRegistrationResponse = void;

@injectable()
export class OrderRegistrationUseCase implements IUseCase<OrderRegistrationRequest, OrderRegistrationResponse> {
  constructor(
    @inject(TYPES.IOrderCommandRepository)
    private readonly orderCommandRepository: IOrderCommandRepository,
  ) {}

  async execute({
    investorId,
    type,
    value,
    quantity,
    expirationType,
    expirationDate,
  }: OrderRegistrationRequest): Promise<OrderRegistrationResponse> {
    const orderId = uuid();

    const newOrder = Order.createFromPrimitive(
      {
        status: OrderStatusEnum.Pending,
        createdAtDate: new Date().toString(),
        investorId,
        type,
        value,
        quantity,
        expirationType,
        expirationDate,
      },
      orderId,
    );

    await this.orderCommandRepository.save(newOrder);
  }
}
