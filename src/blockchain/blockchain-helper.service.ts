import { BlockchainNetwork, BlockchainToken, SettingKey } from '@/common/const';
import { getPublicClient, getWalletClient } from '@/common/web3.client';
import { SettingService } from '@/setting/setting.service';
import { Injectable } from '@nestjs/common';
import Big from 'big.js';
import {
  Address,
  erc20Abi,
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
} from 'viem';

@Injectable()
export class BlockchainHelperService {
  constructor(private readonly settingService: SettingService) {}

  async getTokenBalance(
    walletAddress: string,
    token: BlockchainToken,
    network: BlockchainNetwork,
  ): Promise<number> {
    const client = getPublicClient(network);
    if (token == BlockchainToken.USDT) {
      const contractAddress = await this.getTokenAddress(token, network);

      const [balance, decimals] = await client.multicall({
        allowFailure: false,
        contracts: [
          {
            address: contractAddress as Address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [walletAddress as Address],
          },
          {
            address: contractAddress as Address,
            abi: erc20Abi,
            functionName: 'decimals',
          },
        ],
      });

      // Convert the balance from token units to a human-readable number
      return Big(formatUnits(balance, decimals)).toNumber();
    }

    if (token == BlockchainToken.BNB) {
      const balanceInWei = await client.getBalance({
        address: walletAddress as Address,
      });

      // Convert wei to ether
      return Big(formatEther(balanceInWei)).toNumber();
    }

    throw new Error('Unsupported token');
  }

  async transferToken(
    privateKey: string,
    toAddress: string,
    token: BlockchainToken,
    network: BlockchainNetwork,
    amount: number,
  ) {
    const walletClient = getWalletClient(privateKey, network);
    const contractAddress = await this.getTokenAddress(token, network);

    if (token === BlockchainToken.USDT) {
      const decimals = await walletClient.readContract({
        address: contractAddress as Address,
        abi: erc20Abi,
        functionName: 'decimals',
      });

      // Convert amount to token units with proper decimals
      const amountInTokenUnits = parseUnits(`${amount}`, decimals);

      const [gasPrice, gasEstimate] = await Promise.all([
        walletClient.getGasPrice(),
        walletClient.estimateContractGas({
          blockTag: 'pending',
          abi: erc20Abi,
          functionName: 'transfer',
          args: [toAddress as Address, amountInTokenUnits],
          address: contractAddress as Address,
        }),
      ]);

      const adjustedGasLimit = (gasEstimate * 12n) / 10n;
      const adjustedGasPrice = (gasPrice * 12n) / 10n;
      const { request } = await walletClient.simulateContract({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [toAddress as Address, amountInTokenUnits],
        address: contractAddress as Address,
        gas: adjustedGasLimit,
        gasPrice: adjustedGasPrice,
      });

      const txnHash = await walletClient.writeContract(request);

      return walletClient.waitForTransactionReceipt({
        hash: txnHash,
      });
    }

    if (token === BlockchainToken.BNB) {
      // For native token (BNB), we do a simple transfer
      const amountInWei = parseEther(amount.toString());

      // Create transaction
      const tx = await walletClient.sendTransaction({
        to: toAddress as Address,
        value: amountInWei,
      });

      // Wait for transaction to be mined
      return walletClient.waitForTransactionReceipt({
        hash: tx,
      });
    }

    throw new Error('Unsupported token');
  }

  async getTokenAddress(
    token: BlockchainToken,
    network: BlockchainNetwork,
  ): Promise<string> {
    if (token != BlockchainToken.USDT) {
      throw new Error('Only USDT token is supported');
    }

    let settingKey: SettingKey;
    switch (network) {
      case BlockchainNetwork.opBNB:
        settingKey = SettingKey.USDT_ADDRESS_OPBNB_NETWORK;
        break;

      case BlockchainNetwork.BSC:
        settingKey = SettingKey.USDT_ADDRESS_BSC_NETWORK;
        break;
    }

    const address = await this.settingService.getSetting(settingKey, '');
    if (address.length == 0) {
      throw new Error(`${token} address on ${network} network not found`);
    }
    return address;
  }
}
