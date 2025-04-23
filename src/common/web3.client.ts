import type { Hex } from 'viem';
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  publicActions,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  bscTestnet,
  mainnet,
  polygon,
  polygonAmoy,
  tron,
  opBNB,
} from 'viem/chains';

const bsc = defineChain({
  id: 56,
  name: 'BNB Smart Chain',
  nativeCurrency: {
    decimals: 18,
    name: 'BNB',
    symbol: 'BNB',
  },
  rpcUrls: {
    default: {
      http: [
        'https://bsc-dataseed1.binance.org/',
        'https://bsc-dataseed2.binance.org/',
        'https://bsc-dataseed3.binance.org/',
        'https://bsc-dataseed4.binance.org/',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'BscScan',
      url: 'https://bscscan.com',
      apiUrl: 'https://api.bscscan.com/api',
    },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 15921452,
    },
  },
});

export const getChain = (chainName?: string) => {
  switch (chainName) {
    case 'ETH':
      return mainnet;
    case 'TRON':
      return tron;
    case 'POL':
      return polygon;
    case 'BSC':
      return bsc;
    case 'OPBNB':
      return opBNB;
    case 'POL_AMOY':
      return polygonAmoy;
    case 'BSC_TEST':
      return bscTestnet;
    default:
      return mainnet;
  }
};

export function getPublicClient(chainName?: string) {
  const chain = getChain(chainName);
  return createPublicClient({
    chain,
    batch: {
      multicall: true,
    },
    transport: http(),
  });
}

export function getWalletClient(privateKey: string, chainName?: string) {
  const account = privateKeyToAccount(privateKey as Hex);
  const chain = getChain(chainName);
  return createWalletClient({
    account,
    chain,
    transport: http(),
  }).extend(publicActions);
}

export const getTransactionUrl = (chain: string, hash?: string | null) => {
  switch (chain.toUpperCase()) {
    case 'ETH':
      return `https://etherscan.io/tx/${hash}`;
    case 'TRON':
      return `https://tronscan.org/#/transaction/${hash?.startsWith('0x') ? hash.slice(2) : hash}`;
    case 'BSC':
      return `https://bscscan.com/tx/${hash}`;
    case 'OPBNB':
      return `https://opbnb.bscscan.com/tx/${hash}`;
    case 'BSC_TEST':
      return `https://testnet.bscscan.com/tx/${hash}`;
    case 'POL':
      return `https://polygonscan.com/tx/${hash}`;
    case 'POL_TEST':
      return `https://mumbai.polygonscan.com/tx/${hash}`;
    case 'POL_AMOY':
      return `https://amoy.polygonscan.com/tx/${hash}`;
    case 'SOL':
      return `https://explorer.solana.com/tx/${hash}`;
    case 'SOL_DEV':
      return `https://explorer.solana.com/tx/${hash}?cluster=devnet`;
    case 'SOL_TEST':
      return `https://explorer.solana.com/tx/${hash}?cluster=testnet`;
    default:
      return '#';
  }
};

export const getAddressUrl = (chain: string, address?: string | null) => {
  switch (chain) {
    case 'ETH':
      return `https://etherscan.io/address/${address}`;
    case 'TRON':
      return `https://tronscan.org/#/address/${address}`;
    case 'BSC':
      return `https://bscscan.com/address/${address}`;
    case 'BSC_TEST':
      return `https://testnet.bscscan.com/address/${address}`;
    case 'OPBNB':
      return `https://opbnb.bscscan.com/address/${address}`;
    case 'POL':
      return `https://polygonscan.com/address/${address}`;
    case 'POL_TEST':
      return `https://mumbai.polygonscan.com/address/${address}`;
    case 'POL_AMOY':
      return `https://amoy.polygonscan.com/address/${address}`;
    case 'SOL':
      return `https://solscan.io/account/${address}`;
    case 'SOL_DEV':
      return `https://solscan.io/account/${address}?cluster=devnet`;
    case 'SOL_TEST':
      return `https://solscan.io/account/${address}?cluster=testnet`;
    default:
      return '#';
  }
};

export const getTokenUrl = (chain: string, address?: string | null) => {
  switch (chain) {
    case 'ETH':
      return `https://etherscan.io/token/${address}`;
    case 'TRON':
      return `https://tronscan.org/#/token20/${address}`;
    case 'BSC':
      return `https://bscscan.com/token/${address}`;
    case 'BSC_TEST':
      return `https://testnet.bscscan.com/token/${address}`;
    case 'OPBNB':
      return `https://opbnb.bscscan.com/token/${address}`;
    case 'POL':
      return `https://polygonscan.com/token/${address}`;
    case 'POL_TEST':
      return `https://mumbai.polygonscan.com/token/${address}`;
    case 'POL_AMOY':
      return `https://amoy.polygonscan.com/token/${address}`;
    case 'SOL':
      return `https://solscan.io/token/${address}`;
    case 'SOL_DEV':
      return `https://solscan.io/token/${address}?cluster=devnet`;
    case 'SOL_TEST':
      return `https://solscan.io/token/${address}?cluster=testnet`;
    default:
      return '#';
  }
};
