import { AggregateRoot } from '@src/core/domain/aggregate-root';
import * as CoreErrors from '@src/core/errors';
import { OrderStatusEnum } from './order-status-enum';
import { OrderTypeEnum } from './order-type-enum';
import { OrderExpirationTypeEnum } from './order-expiration-type-enum';
import { FinantialNumber } from '@src/core/domain/shared/finantial-number';
import { exhaustiveGuard } from '@src/core/utils/exhaustiveGuard';
import { isBefore, isSameDay } from 'date-fns';

interface OrderProps {
  shareholderId: string;
  status: OrderStatusEnum;
  type: OrderTypeEnum;
  unitValue: FinantialNumber;
  shares: number;
  expirationType: OrderExpirationTypeEnum;
  expirationDate: Date | null;
  createdAtDate: Date;
  filledAtDate: Date | null;
}

export class Order extends AggregateRoot<OrderProps> {
  private constructor(props: OrderProps, id?: string) {
    super(props, id);

    this.validateSelfExpirationCoherence();
    this.validateSelfDatesCorrelation();
  }

  get expirationTimestamp(): number | null {
    return this.props.expirationDate?.getTime() || null;
  }

  get createdAtTimestamp(): number {
    return this.props.createdAtDate.getTime();
  }

  static ClassErrors = {
    InvalidPropsError: {
      ExpirationCoherence: {
        ORDER_WITHOUT_EXPIRATION_DATE: 'Orders with this type of expirationType need to have an expirationDate value',
        ORDER_WITH_EXPIRATION_DATE: 'Orders with this type of expirationType must not have an expirationDate value',
        DAY_ORDER_NOT_IN_SAME_DAY:
          'Order with expirationType DayOrder must have an expirationDate in the same day of creation',
      },
      ExpirationCorrelation: {
        EXPIRATION_DATE_BEFORE_CREATION: 'the provided expirationDate is before Order creation date',
        FILLED_DATE_BEFORE_CREATION: 'the provided filledAtDate is before Order creation date',
        FILLED_DATE_BEFORE_EXPIRATION_DATE: 'the provided filledAtDate is before Order expirationDate',
      },
    },
  };

  private validateSelfDatesCorrelation() {
    const { expirationDate, createdAtDate, filledAtDate } = this.props;

    if (expirationDate && isBefore(expirationDate, createdAtDate)) {
      throw new CoreErrors.InvalidPropsError(
        Order.ClassErrors.InvalidPropsError.ExpirationCorrelation.EXPIRATION_DATE_BEFORE_CREATION,
      );
    }
    if (filledAtDate && isBefore(filledAtDate, createdAtDate)) {
      throw new CoreErrors.InvalidPropsError(
        Order.ClassErrors.InvalidPropsError.ExpirationCorrelation.FILLED_DATE_BEFORE_CREATION,
      );
    }
    if (filledAtDate && expirationDate && isBefore(expirationDate, filledAtDate)) {
      throw new CoreErrors.InvalidPropsError(
        Order.ClassErrors.InvalidPropsError.ExpirationCorrelation.FILLED_DATE_BEFORE_EXPIRATION_DATE,
      );
    }
  }

  private validateSelfExpirationCoherence() {
    const { expirationType, expirationDate, createdAtDate } = this.props;

    switch (expirationType) {
      case OrderExpirationTypeEnum.DayOrder:
        if (!expirationDate) {
          throw new CoreErrors.InvalidPropsError(
            Order.ClassErrors.InvalidPropsError.ExpirationCoherence.ORDER_WITHOUT_EXPIRATION_DATE,
          );
        }
        if (!isSameDay(createdAtDate, expirationDate)) {
          throw new CoreErrors.InvalidPropsError(
            Order.ClassErrors.InvalidPropsError.ExpirationCoherence.DAY_ORDER_NOT_IN_SAME_DAY,
          );
        }
        break;
      case OrderExpirationTypeEnum.GoodTillDate:
        if (!expirationDate) {
          throw new CoreErrors.InvalidPropsError(
            Order.ClassErrors.InvalidPropsError.ExpirationCoherence.ORDER_WITHOUT_EXPIRATION_DATE,
          );
        }
        break;
      // case OrderExpirationTypeEnum.AllOrNone:
      //   break;
      case OrderExpirationTypeEnum.FillOrKill:
        break;
      case OrderExpirationTypeEnum.GoodTillCancelled:
        if (expirationDate) {
          throw new CoreErrors.InvalidPropsError(
            Order.ClassErrors.InvalidPropsError.ExpirationCoherence.ORDER_WITH_EXPIRATION_DATE,
          );
        }
        break;
      default:
        exhaustiveGuard(expirationType);
    }
  }

  static createFromPrimitive(
    props: {
      shareholderId: string;
      status: OrderStatusEnum;
      type: OrderTypeEnum;
      unitValue: number;
      shares: number;
      expirationType: OrderExpirationTypeEnum;
      expirationDate?: string | null;
      createdAtDate: string;
      filledAtDate?: string | null;
    },
    id?: string,
  ) {
    return new Order(
      {
        shareholderId: props.shareholderId,
        status: props.status,
        type: props.type,
        unitValue: FinantialNumber.create({ value: props.unitValue }),
        shares: props.shares,
        expirationType: props.expirationType,
        expirationDate: !props.expirationDate ? null : new Date(props.expirationDate),
        createdAtDate: new Date(props.createdAtDate),
        filledAtDate: !props.filledAtDate ? null : new Date(props.filledAtDate),
      },
      id,
    );
  }

  public toJson(): object {
    return {
      id: this.id,
      shareholderId: this.props.shareholderId,
      status: this.props.status,
      type: this.props.type,
      unitValue: this.props.unitValue.value,
      shares: this.props.shares,
      expirationType: this.props.expirationType,
      expirationDate: this.props.expirationDate,
      expirationTimestamp: this.expirationTimestamp,
      createdAtDate: this.props.createdAtDate,
      createdAtTimestamp: this.createdAtTimestamp,
      filledAtDate: this.props.filledAtDate,
    };
  }
}
