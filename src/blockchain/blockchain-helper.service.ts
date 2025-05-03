import { BlockchainNetwork, BlockchainToken, SettingKey } from '@/common/const';
import {
  getPublicClient,
  GetPublicClientType,
  getWalletClient,
  GetWalletClientType,
} from '@/common/web3.client';
import { SettingService } from '@/setting/setting.service';
import { Injectable } from '@nestjs/common';
import Big from 'big.js';
import { err, ok, Result } from 'neverthrow';
import {
  Address,
  erc20Abi,
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
  TransactionReceipt,
} from 'viem';
import { toErr } from '@/common/errors';

@Injectable()
export class BlockchainHelperService {
  constructor(private readonly settingService: SettingService) {}

  async getTransactionReceipt(
    txHash: string,
    network: BlockchainNetwork,
  ): Promise<Result<TransactionReceipt, Error>> {
    try {
      return ok(
        await getPublicClient(network).waitForTransactionReceipt({
          hash: txHash as Address,
        }),
      );
    } catch (error) {
      return toErr(error, 'Unknown error get transaction receipt');
    }
  }

  async getTokenBalance(
    walletAddress: string,
    token: BlockchainToken,
    network: BlockchainNetwork,
  ): Promise<Result<number, Error>> {
    const client = getPublicClient(network);
    if (token == BlockchainToken.USDT) {
      const contractAddressResult = await this.getTokenAddress(token, network);
      if (contractAddressResult.isErr()) {
        return err(contractAddressResult.error);
      }
      return await this.readOnChainTokenBalance(
        client,
        walletAddress,
        contractAddressResult.value,
      );
    }

    if (token == BlockchainToken.BNB) {
      return await this.readOnChainNativeBalance(client, walletAddress);
    }

    return err(new Error('Unsupported token'));
  }

  async transferToken(
    privateKey: string,
    toAddress: string,
    token: BlockchainToken,
    network: BlockchainNetwork,
    amount: number,
  ): Promise<Result<string, Error>> {
    const walletClient = getWalletClient(privateKey, network);

    if (token === BlockchainToken.USDT) {
      const contractAddressResult = await this.getTokenAddress(token, network);
      if (contractAddressResult.isErr()) {
        return err(contractAddressResult.error);
      }

      return await this.writeTransferToken(
        walletClient,
        toAddress,
        amount,
        contractAddressResult.value,
      );
    }

    if (token === BlockchainToken.BNB) {
      return await this.writeTransferNative(walletClient, toAddress, amount);
    }

    return err(new Error('Token transfer unsupported'));
  }

  async getTokenAddress(
    token: BlockchainToken,
    network: BlockchainNetwork,
  ): Promise<Result<string, Error>> {
    if (token != BlockchainToken.USDT) {
      return err(
        new Error('Only USDT token is supported on get token address'),
      );
    }

    let settingKey: SettingKey;
    switch (network) {
      case BlockchainNetwork.OPBNB:
        settingKey = SettingKey.USDT_ADDRESS_OPBNB_NETWORK;
        break;

      case BlockchainNetwork.BSC:
        settingKey = SettingKey.USDT_ADDRESS_BSC_NETWORK;
        break;
    }

    const address = await this.settingService.getSetting(settingKey, '');
    if (address.length == 0) {
      return err(new Error(`${token} address on ${network} network not found`));
    }
    return ok(address);
  }

  private async writeTransferNative(
    walletClient: GetWalletClientType,
    toAddress: string,
    amount: number,
  ): Promise<Result<string, Error>> {
    try {
      const amountInWei = parseEther(amount.toString());

      // Create transaction
      const txHash = await walletClient.sendTransaction({
        to: toAddress as Address,
        value: amountInWei,
      });

      return ok(txHash);
    } catch (error) {
      return toErr(error, 'Unknown error write transfer native');
    }
  }

  private async writeTransferToken(
    walletClient: GetWalletClientType,
    toAddress: string,
    amount: number,
    contractAddress: string,
    decimals: number = 18,
  ): Promise<Result<string, Error>> {
    try {
      const amountInTokenUnits = parseUnits(`${amount}`, decimals);

      const { request } = await walletClient.simulateContract({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [toAddress as Address, amountInTokenUnits],
        address: contractAddress as Address,
      });

      const txnHash = await walletClient.writeContract(request);

      return ok(txnHash);
    } catch (error) {
      return toErr(error, 'Unknown error write transfer token');
    }
  }

  private async readOnChainTokenBalance(
    client: GetPublicClientType,
    walletAddress: string,
    contractAddress: string,
    decimals: number = 18,
  ): Promise<Result<number, Error>> {
    try {
      const balance = await client.readContract({
        address: contractAddress as Address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [walletAddress as Address],
      });

      return ok(Big(formatUnits(balance, decimals)).toNumber());
    } catch (error) {
      return toErr(error, 'Unknown error read on chain token balance');
    }
  }

  private async readOnChainNativeBalance(
    client: GetPublicClientType,
    walletAddress: string,
  ): Promise<Result<number, Error>> {
    try {
      const balanceInWei = await client.getBalance({
        address: walletAddress as Address,
      });

      // Convert wei to ether
      return ok(Big(formatEther(balanceInWei)).toNumber());
    } catch (error) {
      return toErr(error, 'Unknown error read on chain native balance');
    }
  }
}
