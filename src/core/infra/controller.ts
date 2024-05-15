import { HttpRequest, HttpResponse } from '@core/infra/http';
import * as httpStatus from './helpers/http-status';
import { HttpException } from '@src/core/infra/errors/http';
import { z } from 'zod';
import { injectable } from 'inversify';
import { AuthenticationLevel } from './authentication/authentication-level';
import TYPES from '../types';
import { IAuthenticationService } from '@src/infra/authentication/services/authentication-service';
import container from '../../modules/order-management/infra/injector';
import { User } from '@src/infra/authentication/domain/user';

export type ControllerContext = { user?: User };

@injectable()
export abstract class Controller {
  protected authenticationService: IAuthenticationService;

  authenticationLevels?: AuthenticationLevel[];

  hasAuthentication: boolean;

  constructor() {
    this.authenticationService = container.get<IAuthenticationService>(TYPES.IAuthenticationService);

    if (this.authenticationLevels?.length) {
      this.hasAuthentication = true;
    }
  }

  abstract get requestSchema(): z.AnyZodObject | undefined;
  abstract perform(httpRequest: HttpRequest, context?: ControllerContext): Promise<HttpResponse>;

  async handle(httpRequest: HttpRequest): Promise<HttpResponse> {
    try {
      const context: ControllerContext = {};

      if (this.authenticationLevels?.length) {
        try {
          const user = await this.authenticationService.getUserByToken(httpRequest.headers?.authorization);
          if (!user) return httpStatus.Unauthorized();
          context.user = user;
        } catch (error: any) {
          if (error.name === 'NotAuthorizedException') return httpStatus.Unauthorized('Access Token has expired');
          console.log(error);
          return httpStatus.serverError();
        }
      }

      if (this.requestSchema) {
        const validator = await this.requestSchema.safeParseAsync(httpRequest);

        if (!validator.success) return httpStatus.badRequest(validator.error.issues);
      }

      return await this.perform(httpRequest, context);
    } catch (error) {
      if (error instanceof HttpException) {
        return {
          statusCode: error.statusCode,
          body: { message: error.message },
        };
      }

      console.log(error);
      return httpStatus.serverError();
    }
  }
}
