import { Injectable } from '@nestjs/common';
import { SettingService } from '@/setting/setting.service';
import { BlockchainNetwork, BlockchainToken, SettingKey } from '@/common/const';
import { Contract, ethers, TransactionReceipt, TransactionResponse, Wallet } from 'ethers';

@Injectable()
export class BlockchainService {
  constructor(
    private readonly settingService: SettingService,
  ) {
  }

  async getTokenBalance(walletAddress: string, token: BlockchainToken, network: BlockchainNetwork): Promise<number> {
    if (token == BlockchainToken.USDT) {
      const contract = await this.createTokenContract(token, network);
      const balance = await contract.balanceOf(walletAddress);
      const decimals = await contract.decimals();

      // Convert the balance from token units to a human-readable number
      return parseFloat(ethers.formatUnits(balance, decimals));
    }

    if (token == BlockchainToken.BNB) {
      // For native tokens like BNB, we need to get the balance directly from the provider
      const rpcUrl = await this.getNetworkRPCUrl(network);
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // Get balance in wei
      const balanceInWei = await provider.getBalance(walletAddress);

      // Convert wei to ether
      return parseFloat(ethers.formatEther(balanceInWei));
    }

    throw new Error('Unsupported token');

  }

  async transferToken(privateKey: string, toAddress: string, token: BlockchainToken, network: BlockchainNetwork, amount: number): Promise<TransactionReceipt | null> {
    if (token == BlockchainToken.USDT) {
      const contract = await this.createTokenContract(token, network, privateKey);
      const decimals = await contract.decimals();

      // Convert amount to token units with proper decimals
      const amountInTokenUnits = ethers.parseUnits(amount.toString(), decimals);

      const tx: TransactionResponse = await contract.transfer(toAddress, amountInTokenUnits);

      return await tx.wait();
    }

    if (token == BlockchainToken.BNB) {
      const wallet = await this.createWallet(network, privateKey);
      // For native token (BNB), we do a simple transfer
      const amountInWei = ethers.parseEther(amount.toString());

      // Create transaction
      const tx = await wallet.sendTransaction({
        to: toAddress,
        value: amountInWei,
      });

      // Wait for transaction to be mined
      return await tx.wait();
    }

    throw new Error('Unsupported token');
  }

  async createWallet(network: BlockchainNetwork, privateKey: string): Promise<Wallet> {
    // Get the network RPC URL
    const rpcUrl = await this.getNetworkRPCUrl(network);

    // Create a provider and wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    return new ethers.Wallet(privateKey, provider);
  }

  async createTokenContract(token: BlockchainToken, network: BlockchainNetwork, privateKey?: string): Promise<Contract> {
    // Get the network RPC URL
    const rpcUrl = await this.getNetworkRPCUrl(network);

    // Create a provider and wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const tokenAddress = await this.getTokenAddress(token, network);

    // ERC20 token ABI (simplified for transfer function)
    const erc20Abi = [
      'function transfer(address to, uint amount) returns (bool)',
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)',
    ];

    if (privateKey) {
      const wallet = new ethers.Wallet(privateKey, provider);
      return new ethers.Contract(tokenAddress, erc20Abi, wallet);
    } else {
      return new ethers.Contract(tokenAddress, erc20Abi, provider);
    }
  }

  async getTokenAddress(token: BlockchainToken, network: BlockchainNetwork): Promise<string> {
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

  async getNetworkRPCUrl(network: BlockchainNetwork): Promise<string> {
    let settingKey: SettingKey;
    switch (network) {
      case BlockchainNetwork.opBNB:
        settingKey = SettingKey.OPBNB_RPC_URL;
        break;
      case BlockchainNetwork.BSC:
        settingKey = SettingKey.BSC_RPC_URL;
        break;
    }

    const url = await this.settingService.getSetting(settingKey, '');
    if (url.length == 0) {
      throw new Error(`RPC URL for ${network} network not found`);
    }
    return url;
  }
}