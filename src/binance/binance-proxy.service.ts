import { Injectable, Logger } from '@nestjs/common';
import { ProxyAgent, request } from 'undici';
import { TelegramAdminService } from '@/telegram-admin/telegram-admin.service';
import { BinanceAccount, BinanceAccountStatus } from './binance.entity';
import { ok, Result } from 'neverthrow';
import { toErr } from '@/common/errors';
import { BinanceService } from '@/binance/binance.service';
import { sleep } from '@/common/utils';

@Injectable()
export class BinanceProxyService {
  private readonly logger = new Logger(BinanceProxyService.name);
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private readonly HTTPBIN_URL = 'https://httpbin.org/ip';
  private readonly proxyFailureCounter = new Map<number, number>();

  constructor(
    private readonly binanceService: BinanceService,
    private readonly telegramAdminService: TelegramAdminService,
  ) {}

  async performProxyCheck() {
    const accounts = await this.binanceService.getActiveBinanceAccounts();

    if (accounts.length === 0) {
      return;
    }

    const failedProxies: { account: BinanceAccount; error: Error }[] = [];

    for (const account of accounts) {
      const result = await this.checkProxyWithRetry(account);

      if (result.isErr()) {
        this.logger.error(`Check proxy ${account.id} failed`);

        const currentFailures = this.proxyFailureCounter.get(account.id) || 0;
        const newFailureCount = currentFailures + 1;
        this.proxyFailureCounter.set(account.id, newFailureCount);

        if (newFailureCount >= 3) {
          failedProxies.push({
            account,
            error: result.error,
          });

          await this.binanceService.updateAccountStatus(
            account,
            BinanceAccountStatus.INACTIVE,
          );

          this.proxyFailureCounter.delete(account.id);
        }
      } else {
        this.proxyFailureCounter.delete(account.id);
      }
    }

    if (failedProxies.length > 0) {
      await this.sendFailedProxiesReport(failedProxies);
    }
  }

  async checkProxyWithRetry(
    account: BinanceAccount,
  ): Promise<Result<boolean, Error>> {
    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      const result = await this.checkProxy(account.proxy);
      if (result.isOk()) {
        return result;
      }

      await sleep(10000);

      if (attempt == this.MAX_RETRY_ATTEMPTS) {
        return result;
      }
    }

    return toErr(new Error('Check proxy failed after multiple attempts'));
  }

  async checkProxy(proxyString: string): Promise<Result<boolean, Error>> {
    try {
      const proxyAgent = this.createProxyAgent(proxyString);
      const { statusCode } = await request(this.HTTPBIN_URL, {
        method: 'GET',
        dispatcher: proxyAgent,
        headersTimeout: 5000, // 5 seconds timeout
      });

      if (statusCode >= 200 && statusCode < 300) {
        return ok(true);
      } else {
        return toErr(new Error(`HTTP status code: ${statusCode}`));
      }
    } catch (error) {
      return toErr(error);
    }
  }

  createProxyAgent(proxyString: string): ProxyAgent {
    const [url, port, username, password] = proxyString.split(':');
    return new ProxyAgent({
      uri: `http://${url}:${port}`,
      token: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      proxyTls: {
        timeout: 1000,
      },
    });
  }

  private async sendFailedProxiesReport(
    failedProxies: { account: BinanceAccount; error: Error }[],
  ): Promise<void> {
    const message = this.formatFailedProxiesMessage(failedProxies);
    await this.telegramAdminService.sendMessage(message, {
      parse_mode: 'Markdown',
    });
  }

  private formatFailedProxiesMessage(
    failedProxies: { account: BinanceAccount; error: Error }[],
  ): string {
    let message = `🚨 *Proxy Check Report* 🚨\n\n`;
    message += `${failedProxies.length} proxies failed the check and accounts have been set to inactive:\n\n`;

    failedProxies.forEach(({ account, error }, index) => {
      message += `${index + 1}. *Account ID:* ${account.id}\n`;
      message += `   *Username:* ${account.binanceUsername}\n`;
      message += `   *Proxy:* \`${account.proxy}\`\n`;
      message += `   *Error:* ${error.message}\n`;
      message += `   *Status:* Updated to *INACTIVE*\n\n`;
    });

    message += `Time: ${new Date().toISOString()}`;

    return message;
  }
}
