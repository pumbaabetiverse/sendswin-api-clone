import { err } from 'neverthrow';

export const toErr = (error: unknown, message: string = 'Unknown error') => {
  if (error instanceof Error) {
    return err(error);
  }
  return err(new Error(message, { cause: error }));
};
