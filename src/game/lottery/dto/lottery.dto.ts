import {
  LotteryJackpotNumber,
  LotterySidePrize,
} from '@/game/lottery/lottery.entity';

export class LotteryRoundWallet {
  settings: {
    minBet: number;
    maxBet: number;
    jackpotMultiplier: number;
    option: string;
    code: string;
  }[];

  prizes: LotterySidePrize[];
  jackpotNumber?: LotteryJackpotNumber;
  wallet?: string;
}
