import { err, fromPromise, ResultAsync } from 'neverthrow';

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
