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
import { fromPromiseResult } from '@/common/errors';

@Injectable()
export class BlockchainHelperService {
  constructor(private readonly settingService: SettingService) {}

  async getTransactionReceipt(
    txHash: string,
    network: BlockchainNetwork,
  ): Promise<Result<TransactionReceipt, Error>> {
    return fromPromiseResult(
      getPublicClient(network).waitForTransactionReceipt({
        hash: txHash as Address,
      }),
    );
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
    const amountInWei = parseEther(amount.toString());

    // Create transaction
    return fromPromiseResult(
      walletClient.sendTransaction({
        to: toAddress as Address,
        value: amountInWei,
      }),
    );
  }

  private async writeTransferToken(
    walletClient: GetWalletClientType,
    toAddress: string,
    amount: number,
    contractAddress: string,
    decimals: number = 18,
  ): Promise<Result<string, Error>> {
    const amountInTokenUnits = parseUnits(`${amount}`, decimals);

    const simulateResult = await fromPromiseResult(
      walletClient.simulateContract({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [toAddress as Address, amountInTokenUnits],
        address: contractAddress as Address,
      }),
    );

    if (simulateResult.isErr()) {
      return err(simulateResult.error);
    }

    return fromPromiseResult(
      walletClient.writeContract(simulateResult.value.request),
    );
  }

  private async readOnChainTokenBalance(
    client: GetPublicClientType,
    walletAddress: string,
    contractAddress: string,
    decimals: number = 18,
  ): Promise<Result<number, Error>> {
    return fromPromiseResult(
      client.readContract({
        address: contractAddress as Address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [walletAddress as Address],
      }),
    ).map((value) => Big(formatUnits(value, decimals)).toNumber());
  }

  private async readOnChainNativeBalance(
    client: GetPublicClientType,
    walletAddress: string,
  ): Promise<Result<number, Error>> {
    return fromPromiseResult(
      client.getBalance({
        address: walletAddress as Address,
      }),
    ).map((value) => Big(formatEther(value)).toNumber());
  }
}
