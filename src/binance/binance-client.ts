// binance-client.ts

import { paths } from '@/common/binance-schema.gen';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import * as crypto from 'crypto';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { err, ok, Result } from 'neverthrow';
import { fromSyncResult, toErr } from '@/common/errors';

/**
 * Cấu hình client Binance
 */
export interface BinanceConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
  proxy: string; // Format: url:port:username:pass (mandatory)
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

    const [url, port, username, password] = this.config.proxy.split(':');
    const proxyUrl = `http://${username}:${password}@${url}:${port}`;
    const httpsAgent = new HttpsProxyAgent(proxyUrl);

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'X-MBX-APIKEY': this.config.apiKey,
      },
      httpsAgent,
    });
  }

  async getAccountBalanceBySymbol(
    symbol: string,
  ): Promise<Result<string, Error>> {
    const result = await this.signedRequest<
      paths['/sapi/v1/asset/get-funding-asset']['post']['responses']['200']['content']['application/json']
    >('POST', '/sapi/v1/asset/get-funding-asset');
    return result.map(
      (data) =>
        data.find((v) => v.asset.toLowerCase() === symbol.toLowerCase())
          ?.free ?? '0',
    );
  }

  async getPayTradeHistory(
    limit: number = 100,
  ): Promise<Result<PayTradeHistoryResponse, Error>> {
    return await this.signedRequest<PayTradeHistoryResponse>(
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
    return this.signedRequest<
      paths['/sapi/v1/capital/withdraw/apply']['post']['responses']['200']['content']['application/json']
    >('POST', '/sapi/v1/capital/withdraw/apply', {
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
  private sign(queryString: string): Result<string, Error> {
    return fromSyncResult(() =>
      crypto
        .createHmac('sha256', this.config.apiSecret)
        .update(queryString)
        .digest('hex'),
    );
  }

  /**
   * Thực hiện request có chữ ký
   */
  private async signedRequest<T>(
    method: 'GET' | 'POST' | 'DELETE',
    endpoint: string,
    params: Record<string, any> = {},
  ): Promise<Result<T, Error>> {
    const timestamp = Date.now();
    const requestParams: Record<string, string | number | boolean> = {
      ...params,
      timestamp,
      recvWindow: 30000,
    };

    const queryString = Object.keys(requestParams)
      .map((key) => `${key}=${encodeURIComponent(requestParams[key])}`)
      .join('&');

    const signatureResult = this.sign(queryString);

    if (signatureResult.isErr()) {
      return err(signatureResult.error);
    }

    return await this.sendRequest<T>({
      method,
      url: endpoint,
      params: {
        ...requestParams,
        signature: signatureResult.value,
      },
    });
  }

  private async sendRequest<T>(
    config: AxiosRequestConfig,
  ): Promise<Result<T, Error>> {
    try {
      const res = await this.client.request<T>(config);
      return ok(res.data);
    } catch (e) {
      if (e instanceof AxiosError) {
        return err(
          new Error(
            `Binance API error: ${e.response?.status} - ${JSON.stringify(e.response?.data)}`,
          ),
        );
      }
      return toErr(e);
    }
  }
}
