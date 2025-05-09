export class RefundRequestDto {
  userId: number;
  amount: number;

  // uuid generated from the client to avoid duplicate refund request
  txId: string;
}

export class DirectWithdrawRequestDto {
  walletWithdrawId: number;
  amount: number;
  toAddress: string;
}
