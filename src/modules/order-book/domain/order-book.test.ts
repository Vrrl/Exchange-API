import { describe, expect, it } from 'vitest';
import { OrderBook } from './order-book';
import { OrderTypeEnum } from '../dtos/order-type-enum';
import { createRandomOrder } from '../test/utils/factories';
import { OrderExpirationTypeEnum } from '../dtos/order-expiration-type-enum';
import moment from 'moment';
import { OrderStatusEnum } from '../dtos/order-status-enum';
import _ from 'lodash';

describe('OrderBook Domain', () => {
  const testDate = new Date();
  const testDateEpoch = testDate.valueOf();
  describe('addOrder method', () => {
    it.each([
      {
        orders: [
          createRandomOrder({ type: OrderTypeEnum.Buy, value: 100, createdAtEpoch: testDateEpoch - 100 }),
          createRandomOrder({ type: OrderTypeEnum.Buy, value: 100, createdAtEpoch: testDateEpoch }),
          createRandomOrder({ type: OrderTypeEnum.Buy, value: 100, createdAtEpoch: testDateEpoch - 200 }),
        ],
      },
      {
        orders: [
          createRandomOrder({ type: OrderTypeEnum.Sell, value: 100, createdAtEpoch: testDateEpoch - 100 }),
          createRandomOrder({ type: OrderTypeEnum.Sell, value: 100, createdAtEpoch: testDateEpoch }),
          createRandomOrder({ type: OrderTypeEnum.Sell, value: 100, createdAtEpoch: testDateEpoch - 200 }),
        ],
      },
    ])('should correctly add an Order and sort older $orders.1.type Orders first', ({ orders }) => {
      const orderBook = new OrderBook();

      orders.forEach(order => orderBook.addOrder(order));

      expect(orderBook['orders'][orders[0].type].length).toEqual(3);
      expect(orderBook['orders'][orders[0].type][0]).toEqual(orders[2]);
      expect(orderBook['orders'][orders[0].type][1]).toEqual(orders[0]);
      expect(orderBook['orders'][orders[0].type][2]).toEqual(orders[1]);
    });
  });

  describe('removeOrder method', () => {
    it.each([
      {
        orders: [
          createRandomOrder({ type: OrderTypeEnum.Buy, createdAtEpoch: testDateEpoch }),
          createRandomOrder({ type: OrderTypeEnum.Buy, createdAtEpoch: testDateEpoch - 100 }),
          createRandomOrder({ type: OrderTypeEnum.Buy, createdAtEpoch: testDateEpoch - 200 }),
        ],
      },
      {
        orders: [
          createRandomOrder({ type: OrderTypeEnum.Sell, createdAtEpoch: testDateEpoch }),
          createRandomOrder({ type: OrderTypeEnum.Sell, createdAtEpoch: testDateEpoch - 100 }),
          createRandomOrder({ type: OrderTypeEnum.Sell, createdAtEpoch: testDateEpoch - 200 }),
        ],
      },
    ])('should correctly remove an Order', ({ orders }) => {
      const orderBook = new OrderBook();

      orders.forEach(order => orderBook.addOrder(order));

      const orderToRemove = orders[1];

      orderBook.removeOrder(orderToRemove);

      expect(orderBook['orders'][orders[0].type].length).toEqual(2);
      expect(orderBook['orders'][orders[0].type].find(x => x.id === orderToRemove.id)).toEqual(undefined);
    });
  });

  describe('executeOrder method', () => {
    it.each([
      {
        order: createRandomOrder({
          type: OrderTypeEnum.Buy,
          value: 100,
          quantity: 100,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
        ordersInBook: [
          createRandomOrder({
            type: OrderTypeEnum.Sell,
            value: 200,
            quantity: 100,
            expirationType: OrderExpirationTypeEnum.DayOrder,
            expirationDate: moment().subtract(1, 'day').toDate(),
          }),
        ],
      },
      {
        order: createRandomOrder({
          type: OrderTypeEnum.Sell,
          value: 200,
          quantity: 100,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
        ordersInBook: [
          createRandomOrder({
            type: OrderTypeEnum.Buy,
            value: 100,
            quantity: 100,
            expirationType: OrderExpirationTypeEnum.DayOrder,
            expirationDate: moment().subtract(1, 'day').toDate(),
          }),
        ],
      },
      {
        order: createRandomOrder({
          type: OrderTypeEnum.Buy,
          value: 100,
          quantity: 100,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
        ordersInBook: [
          createRandomOrder({
            type: OrderTypeEnum.Sell,
            value: 200,
            quantity: 100,
            expirationType: OrderExpirationTypeEnum.GoodTillDate,
            expirationDate: moment().subtract(2, 'day').toDate(),
          }),
        ],
      },
      {
        order: createRandomOrder({
          type: OrderTypeEnum.Sell,
          value: 100,
          quantity: 200,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
        ordersInBook: [
          createRandomOrder({
            type: OrderTypeEnum.Buy,
            value: 100,
            quantity: 100,
            expirationType: OrderExpirationTypeEnum.GoodTillDate,
            expirationDate: moment().subtract(2, 'day').toDate(),
          }),
        ],
      },
    ])(
      'should not return matches for a $order.type Order and a $ordersInBook.0.type Order $ordersInBook.0.expirationType with expirationDate $ordersInBook.0.expirationDate and remove expired Order from orderBook as it is already expired and add new order to the book',
      ({ order, ordersInBook }) => {
        const orderBook = new OrderBook();

        ordersInBook.forEach(order => orderBook.addOrder(order));

        const result = orderBook.executeOrder(order);

        expect(result.executedOrderMatches.length).toEqual(0);
        expect(result.executedOrder).toEqual(order);
        expect(orderBook['orders'][ordersInBook[0].type].length).toEqual(0);
        expect(orderBook['orders'][order.type][0]).toEqual(order);
      },
    );

    it.each([
      {
        order: createRandomOrder({
          type: OrderTypeEnum.Buy,
          value: 100,
          quantity: 100,
          expirationType: OrderExpirationTypeEnum.FillOrKill,
        }),
        ordersInBook: [],
      },
      {
        order: createRandomOrder({
          type: OrderTypeEnum.Buy,
          value: 100,
          quantity: 200,
          expirationType: OrderExpirationTypeEnum.FillOrKill,
        }),
        ordersInBook: [
          createRandomOrder({
            type: OrderTypeEnum.Sell,
            value: 100,
            quantity: 100,
            expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
          }),
        ],
      },
      {
        order: createRandomOrder({
          type: OrderTypeEnum.Buy,
          value: 100,
          quantity: 300,
          expirationType: OrderExpirationTypeEnum.FillOrKill,
        }),
        ordersInBook: [
          createRandomOrder({
            type: OrderTypeEnum.Sell,
            value: 100,
            quantity: 100,
            expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
          }),
          createRandomOrder({
            type: OrderTypeEnum.Sell,
            value: 100,
            quantity: 100,
            expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
          }),
        ],
      },

      {
        order: createRandomOrder({
          type: OrderTypeEnum.Sell,
          value: 100,
          quantity: 100,
          expirationType: OrderExpirationTypeEnum.FillOrKill,
        }),
        ordersInBook: [],
      },
      {
        order: createRandomOrder({
          type: OrderTypeEnum.Sell,
          value: 100,
          quantity: 200,
          expirationType: OrderExpirationTypeEnum.FillOrKill,
        }),
        ordersInBook: [
          createRandomOrder({
            type: OrderTypeEnum.Buy,
            value: 100,
            quantity: 100,
            expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
          }),
        ],
      },
      {
        order: createRandomOrder({
          type: OrderTypeEnum.Sell,
          value: 100,
          quantity: 300,
          expirationType: OrderExpirationTypeEnum.FillOrKill,
        }),
        ordersInBook: [
          createRandomOrder({
            type: OrderTypeEnum.Buy,
            value: 100,
            quantity: 100,
            expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
          }),
          createRandomOrder({
            type: OrderTypeEnum.Buy,
            value: 100,
            quantity: 100,
            expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
          }),
        ],
      },
    ])(
      'should not return matches and cancel a $order.type Order $order.expirationType as it is not filled during execution and not add to the book',
      ({ order, ordersInBook }) => {
        const orderBook = new OrderBook();

        ordersInBook.forEach(order => orderBook.addOrder(order));

        const result = orderBook.executeOrder(order);

        expect(result.executedOrder.status).toBe(OrderStatusEnum.Canceled);
        expect(result.executedOrderMatches.length).toEqual(0);
        expect(orderBook['orders'][order.type].length).toBe(0);
      },
    );

    it.each([
      {
        order: createRandomOrder({
          type: OrderTypeEnum.Sell,
          value: 200,
          quantity: 100,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
        ordersInBook: [
          createRandomOrder({
            type: OrderTypeEnum.Buy,
            value: 100,
            quantity: 100,
            expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
          }),
          createRandomOrder({
            type: OrderTypeEnum.Buy,
            value: 100,
            quantity: 100,
            expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
          }),
        ],
      },
      {
        order: createRandomOrder({
          type: OrderTypeEnum.Buy,
          value: 100,
          quantity: 100,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
        ordersInBook: [
          createRandomOrder({
            type: OrderTypeEnum.Buy,
            value: 100,
            quantity: 100,
            expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
          }),
          createRandomOrder({
            type: OrderTypeEnum.Buy,
            value: 100,
            quantity: 100,
            expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
          }),
        ],
      },

      {
        order: createRandomOrder({
          type: OrderTypeEnum.Sell,
          value: 100,
          quantity: 100,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
        ordersInBook: [
          createRandomOrder({
            type: OrderTypeEnum.Sell,
            value: 100,
            quantity: 100,
            expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
          }),
          createRandomOrder({
            type: OrderTypeEnum.Sell,
            value: 100,
            quantity: 100,
            expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
          }),
        ],
      },
      {
        order: createRandomOrder({
          type: OrderTypeEnum.Buy,
          value: 100,
          quantity: 100,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
        ordersInBook: [
          createRandomOrder({
            type: OrderTypeEnum.Buy,
            value: 100,
            quantity: 100,
            expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
          }),
          createRandomOrder({
            type: OrderTypeEnum.Buy,
            value: 100,
            quantity: 100,
            expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
          }),
        ],
      },

      {
        order: createRandomOrder({
          type: OrderTypeEnum.Sell,
          value: 100,
          quantity: 100,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
        ordersInBook: [],
      },
      {
        order: createRandomOrder({
          type: OrderTypeEnum.Buy,
          value: 100,
          quantity: 100,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
        ordersInBook: [],
      },
    ])(
      'should not return matches for $order.type Order with value $order.value as it has no Opposite Orders with less or equal value and add new Order to the book',
      ({ order, ordersInBook }) => {
        const orderBook = new OrderBook();

        ordersInBook.forEach(order => orderBook.addOrder(order));

        const result = orderBook.executeOrder(order);

        expect(result.executedOrderMatches.length).toEqual(0);
        expect(result.executedOrder).toStrictEqual(order);
        expect(orderBook['orders'][order.type].find(x => x.id === order.id)).toEqual(order);
      },
    );
  });

  it.each([
    {
      order: createRandomOrder({
        type: OrderTypeEnum.Buy,
        value: 100,
        quantity: 200,
        expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
      }),
      ordersInBook: [
        createRandomOrder({
          type: OrderTypeEnum.Sell,
          value: 100,
          quantity: 200,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
      ],
    },
    {
      order: createRandomOrder({
        type: OrderTypeEnum.Sell,
        value: 100,
        quantity: 200,
        expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
      }),
      ordersInBook: [
        createRandomOrder({
          type: OrderTypeEnum.Buy,
          value: 100,
          quantity: 200,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
      ],
    },
    {
      order: createRandomOrder({
        type: OrderTypeEnum.Buy,
        value: 100,
        quantity: 200,
        expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
      }),
      ordersInBook: [
        createRandomOrder({
          type: OrderTypeEnum.Sell,
          value: 100,
          quantity: 100,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
        createRandomOrder({
          type: OrderTypeEnum.Sell,
          value: 100,
          quantity: 100,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
      ],
    },
    {
      order: createRandomOrder({
        type: OrderTypeEnum.Sell,
        value: 100,
        quantity: 200,
        expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
      }),
      ordersInBook: [
        createRandomOrder({
          type: OrderTypeEnum.Buy,
          value: 100,
          quantity: 100,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
        createRandomOrder({
          type: OrderTypeEnum.Buy,
          value: 100,
          quantity: 100,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
      ],
    },
  ])(
    'should COMPLETELY fill a new $order.type Order with all $ordersInBook.0.type Orders and not add to the book',
    ({ order, ordersInBook }) => {
      const orderBook = new OrderBook();

      ordersInBook.forEach(order => orderBook.addOrder(order));

      const result = orderBook.executeOrder(order);

      expect(result.executedOrder.status).toBe(OrderStatusEnum.Filled);
      expect(result.executedOrderMatches.length).toEqual(ordersInBook.length);
      expect(result.executedOrderMatches.every(x => ordersInBook.some(y => y.id === x.id))).toBe(true);
      expect(result.executedOrderMatches.every(x => x.status === OrderStatusEnum.Filled)).toBe(true);
      expect(orderBook['orders'][order.type].length).toEqual(0);
      expect(orderBook['orders'][ordersInBook[0].type].length).toEqual(0);
    },
  );

  it.each([
    {
      order: createRandomOrder({
        type: OrderTypeEnum.Buy,
        value: 100,
        quantity: 200,
        expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
      }),
      ordersInBook: [
        createRandomOrder({
          type: OrderTypeEnum.Sell,
          value: 100,
          quantity: 100,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
      ],
    },
    {
      order: createRandomOrder({
        type: OrderTypeEnum.Sell,
        value: 100,
        quantity: 200,
        expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
      }),
      ordersInBook: [
        createRandomOrder({
          type: OrderTypeEnum.Buy,
          value: 100,
          quantity: 100,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
      ],
    },

    {
      order: createRandomOrder({
        type: OrderTypeEnum.Buy,
        value: 100,
        quantity: 300,
        expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
      }),
      ordersInBook: [
        createRandomOrder({
          type: OrderTypeEnum.Sell,
          value: 100,
          quantity: 100,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
        createRandomOrder({
          type: OrderTypeEnum.Sell,
          value: 100,
          quantity: 100,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
      ],
    },
    {
      order: createRandomOrder({
        type: OrderTypeEnum.Sell,
        value: 100,
        quantity: 300,
        expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
      }),
      ordersInBook: [
        createRandomOrder({
          type: OrderTypeEnum.Buy,
          value: 100,
          quantity: 100,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
        createRandomOrder({
          type: OrderTypeEnum.Buy,
          value: 100,
          quantity: 100,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
      ],
    },
  ])(
    'should PARTIALLY fill a new $order.type Order with all $ordersInBook.0.type Orders and add the new Order to the book and remove all $ordersInBook.0.type Orders to the book',
    ({ order, ordersInBook }) => {
      const orderBook = new OrderBook();

      ordersInBook.forEach(order => orderBook.addOrder(order));

      const result = orderBook.executeOrder(order);

      expect(result.executedOrder.status).toBe(OrderStatusEnum.PartiallyFilled);
      expect(result.executedOrderMatches.length).toEqual(ordersInBook.length);
      expect(result.executedOrderMatches.every(x => ordersInBook.some(y => y.id === x.id))).toBe(true);
      expect(result.executedOrderMatches.every(x => x.status === OrderStatusEnum.Filled)).toBe(true);
      expect(orderBook['orders'][order.type].length).toEqual(1);
      expect(orderBook['orders'][ordersInBook[0].type].length).toEqual(0);
    },
  );

  it.each([
    {
      order: createRandomOrder({
        type: OrderTypeEnum.Buy,
        value: 100,
        quantity: 100,
        expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
      }),
      ordersInBook: [
        createRandomOrder({
          type: OrderTypeEnum.Sell,
          value: 100,
          quantity: 200,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
      ],
    },
    {
      order: createRandomOrder({
        type: OrderTypeEnum.Sell,
        value: 100,
        quantity: 100,
        expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
      }),
      ordersInBook: [
        createRandomOrder({
          type: OrderTypeEnum.Buy,
          value: 100,
          quantity: 200,
          expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
        }),
      ],
    },
  ])(
    'should COMPLETELY fill a new $order.type Order and PARTIALLY fill $ordersInBook.0.type Order and not add to the book',
    ({ order, ordersInBook }) => {
      const orderBook = new OrderBook();

      ordersInBook.forEach(order => orderBook.addOrder(order));

      const result = orderBook.executeOrder(order);

      expect(result.executedOrder.status).toBe(OrderStatusEnum.Filled);
      expect(result.executedOrderMatches.length).toEqual(ordersInBook.length);
      expect(result.executedOrderMatches.every(x => ordersInBook.some(y => y.id === x.id))).toBe(true);
      expect(result.executedOrderMatches.every(x => x.status === OrderStatusEnum.PartiallyFilled)).toBe(true);
      expect(orderBook['orders'][order.type].length).toEqual(0);
      expect(orderBook['orders'][ordersInBook[0].type].length).toEqual(1);
    },
  );

  // it.each([
  //   {
  //     order: createRandomOrder({
  //       type: OrderTypeEnum.Buy,
  //       value: 100,
  //       quantity: 200,
  //       expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
  //     }),
  //     ordersInBook: [
  //       createRandomOrder({
  //         type: OrderTypeEnum.Sell,
  //         value: 100,
  //         quantity: 100,
  //         expirationType: OrderExpirationTypeEnum.GoodTillCancelled,
  //       }),
  //     ],
  //   },
  // ])(
  //   'should return the quantity remaining of the executed $order.type Order and all the matches quantities for $ordersInBook.0.type Order',
  //   ({ order, ordersInBook }) => {
  //     const totalOrdersInBookQuantity = _.sumBy(ordersInBook, x => x.quantity);

  //     const = totalOrdersInBookQuantity
  //     const remainingExecutedOrderQuantity =
  //       totalMatchesQuantity < order.quantity ? order.quantity - totalMatchesQuantity : 0;

  //     const orderBook = new OrderBook();

  //     ordersInBook.forEach(order => orderBook.addOrder(order));

  //     const result = orderBook.executeOrder(order);

  //     expect(result.executedOrder).toBe(remainingExecutedOrderQuantity);
  //     expect(_.sumBy(result.executedOrderMatches, x => x.quantity)).toEqual(totalMatchesQuantity);
  //   },
  // );
});
