import {
  LotteryJackpotNumber,
  LotterySidePrize,
} from '@/game/lottery/lottery.entity';

export class GameWalletDto {
  lottery1: {
    minBet: number;
    maxBet: number;
    jackpotMultiplier: number;
    prizes: LotterySidePrize[];
    jackpotNumber?: LotteryJackpotNumber;
  };
  oddEven: {
    minBet: number;
    maxBet: number;
    oddMultiplier: number;
    evenMultiplier: number;
  };
  overUnder: {
    overMultiplier: number;
    underMultiplier: number;
    minBet: number;
    maxBet: number;
  };
  binanceId?: string;
  binanceUsername?: string;
}
