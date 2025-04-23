import { DEFAULT_SEQUENCE, MAX_SEQUENCE } from './constants';
import type { SonyflakeOptions } from './types';

export class Sonyflake {
  readonly #epoch: bigint;
  readonly #workerId: bigint;
  #sequence = DEFAULT_SEQUENCE;
  #lastTimestamp = 0n;

  constructor({ epoch = Date.now(), workerId = 0 }: SonyflakeOptions) {
    if (workerId < 0 || workerId > 3) {
      throw new Error('Worker ID must be between 0 and 3');
    }
    this.#workerId = BigInt(workerId);
    this.#epoch = BigInt(epoch);
  }

  #waitNextTick(lastTimestamp: bigint): bigint {
    let timestamp = this.#currentTimestamp();
    while (timestamp <= lastTimestamp) {
      timestamp = this.#currentTimestamp();
    }
    return timestamp;
  }

  #currentTimestamp(): bigint {
    return (BigInt(Date.now()) - this.#epoch) / 10n; // Unit 10ms
  }

  nextId(): bigint {
    let timestamp = this.#currentTimestamp();

    if (timestamp === this.#lastTimestamp) {
      this.#sequence++;
      if (this.#sequence >= MAX_SEQUENCE) {
        timestamp = this.#waitNextTick(this.#lastTimestamp);
        this.#sequence = 0n;
      }
    } else {
      this.#sequence = 0n;
    }
    this.#lastTimestamp = timestamp;
    // Structure ID: timestamp (38-bit) | workerId (2-bit) | sequence (16-bit) | padding (7-bit)
    return (timestamp << 18n) | (this.#workerId << 16n) | this.#sequence;
  }

  generateIdAt(ts: number, sequence = 0n): bigint {
    const timestamp = (BigInt(ts) - this.#epoch) / 10n;

    if (timestamp < 0) {
      throw new Error('The provided date is before the epoch.');
    }

    // Structure ID: timestamp (38-bit) | workerId (2-bit) | sequence (16-bit) | padding (7-bit)
    return (timestamp << 18n) | (this.#workerId << 16n) | sequence;
  }

  decodeId(id: bigint) {
    const timestamp = (id >> 18n) & ((1n << 38n) - 1n);
    const workerId = (id >> 16n) & 3n; // 2-bit worker ID
    const sequence = id & ((1n << 16n) - 1n); // 16-bit sequence

    return {
      timestamp: Number(timestamp) * 10 + Number(this.#epoch), // Convert to Unix time (ms)
      workerId: Number(workerId),
      sequence: Number(sequence),
    };
  }
}
