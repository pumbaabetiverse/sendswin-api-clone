import { err, fromPromise, ok, Result, ResultAsync } from 'neverthrow';

export const toErr = (error: unknown, message: string = 'Unknown error') => {
  if (error instanceof Error) {
    return err(error);
  }
  return err(new Error(message, { cause: error }));
};

export const fromPromiseResult = <T>(
  promise: PromiseLike<T>,
  message: string = 'Unknown error',
): ResultAsync<T, Error> => {
  return fromPromise(promise, (error) => toErr(error, message).error);
};

export const fromSyncResult = <T>(
  fn: () => T,
  message: string = 'Unknown error',
): Result<T, Error> => {
  try {
    return ok(fn());
  } catch (error) {
    return toErr(error, message);
  }
};
