import { BinanceAccount } from '@/binance/binance.entity';

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

export class DepositProcessQueueDto {
  item: PayTradeHistoryItem; // The item from pay trade history
  account: BinanceAccount; // The Binance account
}
