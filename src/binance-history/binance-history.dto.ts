export class BinanceHistoryDto {
  id: number;
  userId: number;
  amount: number;
  type: string;
  createdAt: Date;
  toBinanceAccountId?: number;
}
