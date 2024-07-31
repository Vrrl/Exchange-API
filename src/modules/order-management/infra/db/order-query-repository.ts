import { Order } from '../../domain/order';

export interface IOrderQueryRepository {
  listByShareholderId(id: string): Promise<Order[]>;
  getById(shareholderId: string, id: string): Promise<Order | undefined>;
}
