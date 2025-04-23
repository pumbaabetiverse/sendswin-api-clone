// binance-client.ts

import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

/**
 * Cấu hình client Binance
 */
export interface BinanceConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
}

export interface PayTradeHistoryResponse {
  code: string;
  message: string;
  success: boolean;
  data: {
    uid: number;
    counterpartyId: number;
    orderId: string;
    note: string;
    orderType: string;
    transactionId: string;
    transactionTime: number;
    amount: string;
    currency: string;
    walletType: number;
    totalPaymentFee: string;
    payerInfo?: {
      name: string;
    };
  }[];
}

/**
 * Client chính cho Binance API
 */
export class BinanceClient {
  private readonly client: AxiosInstance;
  private readonly config: Required<BinanceConfig>;

  constructor(config: BinanceConfig) {
    this.config = {
      baseUrl: 'https://api.binance.com',
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'X-MBX-APIKEY': this.config.apiKey,
      },
    });
  }

  async getPayTradeHistory(
    limit: number = 100,
  ): Promise<PayTradeHistoryResponse> {
    return this.signedRequest<PayTradeHistoryResponse>(
      'GET',
      '/sapi/v1/pay/transactions',
      {
        limit,
      },
    );
  }

  async withdraw(
    coin: string,
    address: string,
    network: string,
    amount: number,
  ) {
    return this.signedRequest('POST', '/sapi/v1/capital/withdraw/apply', {
      coin,
      address,
      network,
      amount,
      walletType: 1,
    });
  }

  /**
   * Tạo chữ ký HMAC SHA256 cho request
   */
  private sign(queryString: string): string {
    return crypto
      .createHmac('sha256', this.config.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  /**
   * Thực hiện request có chữ ký
   */
  private async signedRequest<T>(
    method: 'GET' | 'POST' | 'DELETE',
    endpoint: string,
    params: Record<string, any> = {},
  ): Promise<T> {
    // Thêm timestamp
    const timestamp = Date.now();
    const requestParams = {
      ...params,
      timestamp,
    };

    // Tạo query string
    const queryString = Object.keys(requestParams)
      .map((key) => `${key}=${encodeURIComponent(requestParams[key])}`)
      .join('&');

    // Tạo chữ ký
    const signature = this.sign(queryString);
    try {
      const response = await this.client.request({
        method,
        url: endpoint,
        params: {
          ...requestParams,
          signature,
        },
      });

      return response.data as T;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Binance API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
        );
      }
      throw error;
    }
  }
}
