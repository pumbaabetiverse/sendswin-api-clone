export const Epoch = { UNIX: 1700000000000 }; // Unix time gốc
export const DEFAULT_SEQUENCE = 0n;
export const DEFAULT_VALUE = 0;

export const MAX_SEQUENCE = 65536n; // 2^16

export const MACHINE_ID_BITS = 2; // 2-bit cho 4 worker (0-3)
export const SEQUENCE_BITS = 16; // 16-bit cho sequence

export const MACHINE_ID_MASK = (1 << MACHINE_ID_BITS) - 1; // 0b11 = 3
export const SEQUENCE_MASK = (1 << SEQUENCE_BITS) - 1; // 0xFFFF = 65535

export const MACHINE_ID_SHIFT = SEQUENCE_BITS; // Worker ID dịch 16-bit
export const TIMESTAMP_LEFT_SHIFT = MACHINE_ID_BITS + MACHINE_ID_SHIFT; // Timestamp dịch 18-bit
export const USIGNED_INCREASE = 1;
