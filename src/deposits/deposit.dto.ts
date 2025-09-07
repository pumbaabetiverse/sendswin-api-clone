import { BinanceAccount } from '@/binance/binance.entity';
import { Deposit } from '@/deposits/deposit.entity';

export interface PayTradeHistoryItem {
  uid: number;
  counterpartyId: number;
  orderId: string;
  note: string;
  orderType: string;
  transactionId: string;
  transactionTime: number;
  amount: string;
  currency: string;
  walletType: number;
  totalPaymentFee: string;
  payerInfo?: {
    name: string;
  };
}

export class NewDepositDto {
  note: string;
  amount: string;
  binanceId: number;
}

export class DepositWithTransactionHashDto extends Deposit {
  withdrawTransactionHash?: string;
}

export class DepositProcessQueueDto {
  item: PayTradeHistoryItem; // The item from pay trade history
  account: BinanceAccount; // The Binance account
}
