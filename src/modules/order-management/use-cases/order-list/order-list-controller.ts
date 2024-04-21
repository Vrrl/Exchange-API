import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { ok } from '@src/core/infra/helpers/http-status';
import { HttpRequest, HttpResponse } from '@core/infra/http';
import { Controller, ControllerContext } from '@core/infra/controller';
import TYPES from '@src/modules/order-management/infra/types';
import { AuthenticationLevel } from '@src/core/infra/authentication/authentication-level';
import { User } from '@src/modules/authentication/domain/user';
import { OrderListUseCase } from './order-list';

@injectable()
export class OrderListController extends Controller {
  constructor(
    @inject(TYPES.OrderListUseCase)
    private readonly orderListUseCase: OrderListUseCase,
  ) {
    super();
  }

  authenticationLevels: AuthenticationLevel[] = [AuthenticationLevel.basicUser];

  get requestSchema(): z.AnyZodObject | undefined {
    return undefined;
  }

  async perform(httpRequest: HttpRequest, context: ControllerContext): Promise<HttpResponse> {
    const user = context.user as User;

    const userOrders = await this.orderListUseCase.execute({ investorId: user.id });

    return ok(userOrders);
  }
}
