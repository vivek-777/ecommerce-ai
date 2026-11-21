import { Request, Response, NextFunction } from 'express';

export type AsyncRouteHandler<TRequest extends Request = Request> = (
  req: TRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export function asyncHandler<TRequest extends Request = Request>(
  fn: AsyncRouteHandler<TRequest>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req as TRequest, res, next)).catch(next);
  };
}