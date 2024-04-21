import TYPES from '@src/modules/order-management/infra/types';
import { inject, injectable } from 'inversify';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { Order } from '../../../domain/order';
import { throwIfUndefinedOrEmptyString } from '@src/core/infra/helpers/validation';
import { IOrderQueryRepository } from '../order-query-repository';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { OrderMap } from './mappers/order-map';

@injectable()
export class OrderQueryRepository implements IOrderQueryRepository {
  DYNAMO_ORDERS_TABLE: string;

  constructor(@inject(TYPES.DynamoDBClient) private dynamoClient: DynamoDBClient) {
    this.DYNAMO_ORDERS_TABLE = throwIfUndefinedOrEmptyString(
      process.env.DYNAMO_ORDERS_TABLE,
      'Env Parameter DYNAMO_ORDERS_TABLE is required',
    );
  }

  async listByInvestorId(id: string): Promise<Order[]> {
    const queryCommand = new QueryCommand({
      TableName: this.DYNAMO_ORDERS_TABLE,
      KeyConditionExpression: 'investorId = :investorId',
      ExpressionAttributeValues: marshall(
        {
          ':investorId': id,
        },
        { removeUndefinedValues: true },
      ),
    });

    const result = await this.dynamoClient.send(queryCommand);

    if (!result.Items) return [];

    return result.Items.map(x => OrderMap.toDomain(unmarshall(x)));
  }
}
