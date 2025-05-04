export class RefundRequestDto {
  userId: number;
  amount: number;

  // uuid generated from the client to avoid duplicate refund request
  txId: string;
}
