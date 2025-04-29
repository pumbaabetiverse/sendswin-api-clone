// src/telegram/telegram.service.ts
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { UsersService } from '@/users/user.service';
import { SettingService } from '@/setting/setting.service';
import {
  Deposit,
  DepositOption,
  DepositResult,
} from '@/deposits/deposit.entity';
import * as fs from 'node:fs';
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';
import * as path from 'node:path';
import { DepositsService } from '@/deposits/deposit.service';
import { BinanceService } from '@/binance/binance.service';
import { TelegramContext, TelegramSession } from '@/telegram/telegram.update';
import { SettingKey } from '@/common/const';
import { User } from '@/users/user.entity';
import { getTransactionUrl } from '@/common/web3.client';

@Injectable()
export class TelegramService {
  private logger = new Logger(TelegramService.name);

  constructor(
    @InjectBot() private bot: Telegraf,
    private usersService: UsersService,
    @Inject(forwardRef(() => DepositsService))
    private depositService: DepositsService,
    private settingService: SettingService,
    private binanceService: BinanceService,
  ) {}

  async handleStartCommand(
    telegramId: string,
    fullName: string,
    chatId: number,
  ): Promise<void> {
    try {
      const user = await this.usersService.createOrUpdateUser(
        telegramId,
        fullName,
        chatId.toString(),
      );

      const introImg = await this.settingService.getSetting(
        SettingKey.TELE_BOT_INTRO_IMAGE,
        '',
      );

      // Generate the welcome message and buttons
      const { welcomeMessage, buttons } =
        await this.generateWelcomeMessageAndButtons(user, fullName);

      // Send the message with buttons
      await this.bot.telegram.sendVideo(
        chatId,
        introImg || {
          source: fs.createReadStream(
            path.join(process.cwd(), 'assets/intro.gif'),
          ),
        },
        {
          caption: welcomeMessage,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: buttons,
          },
        },
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in handleStartCommand: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  async sendMessage(
    chatId: number,
    message: string,
    extra: ExtraReplyMessage = {},
  ): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(chatId, message, extra);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in sendMessage: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  async sendNewGameResultMessage(
    chatId: number,
    deposit: Deposit,
  ): Promise<void> {
    try {
      let optionDisplay = 'Ⓞ ODD';

      if (deposit.option == DepositOption.UNDER) {
        optionDisplay = 'Ⓔ EVEN';
      } else if (deposit.option == DepositOption.LUCKY_NUMBER) {
        optionDisplay = '🍀 GOLDEN 7';
      }

      // Format the result for better readability
      let resultDisplay: string;
      switch (deposit.result) {
        case DepositResult.WIN:
          resultDisplay = '✅ WIN';
          break;
        case DepositResult.LOSE:
          resultDisplay = '❌ LOSE';
          break;
        default:
          resultDisplay = '⚠️ VOID';
          break;
      }

      // Create a message with all required deposit information
      const message = `
  🎮 *New Game Result*

  🔢 Order ID: \`${deposit.orderId}\`
  🎲 Your choice: ${optionDisplay}
  💰 Amount: ${deposit.amount} USDT
  🏆 Result: ${resultDisplay}
  `;

      // Add an extra message for winners
      const extra =
        deposit.result === DepositResult.WIN
          ? `\n🎉 Congratulations! Your payout of ${deposit.payout} USDT will be processed shortly.\n\n⚠️ *Important*: If you do not receive your payout within 5 minutes, please contact our customer support.`
          : '';

      const supportUrl = await this.settingService.getSetting(
        SettingKey.TELE_CUSTOMER_SUPPORT_URL,
        'https://t.me',
      );

      // Send the notification to the user
      await this.sendMessage(chatId, message + extra, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🧑‍💼 Customer Support',
                url: supportUrl, // Replace it with your actual support contact
              },
            ],
          ],
        },
        parse_mode: 'Markdown',
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in sendNewGameResultMessage: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  async sendWithdrawalSuccessMessage(
    chatId: number,
    payout: number,
    transactionHash: string,
    network: string,
  ): Promise<void> {
    try {
      await this.sendMessage(
        chatId,
        `✅ *Withdrawal Successful!*\n\n` +
          `💰 Amount: *${payout} USDT*\n` +
          `🔗 Transaction Hash: \`${transactionHash}\`\n\n` +
          `⏱ Your transaction is being processed and may take a few minutes to be confirmed on the blockchain.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🔍 View on OpBNB Scan',
                  url: getTransactionUrl(network, transactionHash),
                },
              ],
            ],
          },
        },
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in sendWithdrawalSuccessMessage: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  async handlePlayGameAction(
    telegramId: string,
    ctx: TelegramContext,
  ): Promise<void> {
    try {
      await ctx.editMessageReplyMarkup(undefined);
      // Get user information
      const user = await this.usersService.findByTelegramId(telegramId);

      const bannerImg = await this.settingService.getSetting(
        SettingKey.TELE_BOT_OVER_UNDER_IMAGE,
        '',
      );

      if (!user || !user.walletAddress || !user.binanceUsername) {
        await ctx.reply(
          '❌ You need to complete your profile before playing the game.',
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '🔙 Back to Main Menu',
                    callback_data: 'back_to_menu',
                  },
                ],
              ],
            },
          },
        );
        return;
      }

      // Prepare game instructions
      const instructions = `
🎮 *Game Odd/Even*:

💰 Betting amount: 0.5-50 USDT
💎 Win multiplier: 1.95x your bet

Good luck! 🍀
      `;

      const oddAccount =
        await this.binanceService.getRandomActiveBinanceAccount(
          DepositOption.ODD,
        );
      const evenAccount =
        await this.binanceService.getRandomActiveBinanceAccount(
          DepositOption.EVEN,
        );

      // Send QR code with game instructions
      await ctx.sendVideo(
        bannerImg || {
          source: fs.createReadStream(
            path.join(process.cwd(), 'assets/overunder.gif'),
          ),
        },
        {
          caption: instructions,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Ⓞ Odd',
                  url:
                    oddAccount?.binanceQrCodeUrl ?? 'https://app.binance.com',
                },
                {
                  text: 'Ⓔ Even',
                  url:
                    evenAccount?.binanceQrCodeUrl ?? 'https://app.binance.com',
                },
              ],
              [{ text: '🔙 Back to Main Menu', callback_data: 'back_to_menu' }],
            ],
          },
        },
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in handlePlayGameAction: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  async handleConnectWalletAction(
    telegramId: string,
    ctx: TelegramContext,
  ): Promise<void> {
    try {
      await ctx.editMessageReplyMarkup(undefined);
      const user = await this.usersService.findByTelegramId(telegramId);

      if (!user) {
        await ctx.reply(
          '❌ You are not registered yet. Please start the bot with /start command first.',
        );
        return;
      }

      // Wallet connection guide
      const walletGuide = `
💼 *WALLET ADDRESS*

📱 *How to get your wallet address:*
1️⃣ Open the Binance app
2️⃣ Go to the "Assets" tab
3️⃣ Select "Deposit"
4️⃣ Choose cryptocurrency "USDT"
5️⃣ Select network "BNB Smart Chain (BEP20)"
6️⃣ Copy the wallet address shown

⚠️ Important: Make sure to use BNB Smart Chain (BEP20) network only!
`;

      // Current wallet info
      let currentWalletInfo: string;
      if (user.walletAddress) {
        currentWalletInfo = `\n*Your current wallet address:*\n\`${user.walletAddress}\`\n`;
      } else {
        currentWalletInfo = '\n*You have not connected a wallet yet.*\n';
      }

      // Combine information
      const completeMessage = walletGuide + currentWalletInfo;

      // Prepare interaction buttons
      const buttons: InlineKeyboardButton[][] = [
        [
          {
            text: '✏️ Update Wallet Address',
            callback_data: 'update_wallet_request',
          },
        ],
        [{ text: '🔙 Back to Main Menu', callback_data: 'back_to_menu' }],
      ];

      // Edit current message
      await ctx.reply(completeMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: buttons,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in handleConnectWalletAction: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  async handleConnectBinanceAction(
    telegramId: string,
    ctx: TelegramContext,
  ): Promise<void> {
    try {
      await ctx.editMessageReplyMarkup(undefined);
      const user = await this.usersService.findByTelegramId(telegramId);

      if (!user) {
        await ctx.reply(
          '❌ You are not registered yet. Please start the bot with /start command first.',
        );
        return;
      }

      // Binance username guide
      const binanceGuide = `
🔗 *BINANCE ACCOUNT*

📱 *How to link your Binance account:*
1️⃣ Enter your Binance username
2️⃣ Make sure it's the exact username from your Binance account
3️⃣ This username will be used to identify your account for deposits and withdrawals

⚠️ Important: Make sure to enter the correct Binance username!
`;

      // Current Binance info
      let currentBinanceInfo: string;
      if (user.binanceUsername) {
        currentBinanceInfo = `\n*Your current Binance username:*\n\`${user.binanceUsername}\`\n`;
      } else {
        currentBinanceInfo =
          '\n*You have not connected a Binance account yet.*\n';
      }

      // Combine information
      const completeMessage = binanceGuide + currentBinanceInfo;

      // Prepare interaction buttons
      const buttons: InlineKeyboardButton[][] = [
        [
          {
            text: '✏️ Update Binance Username',
            callback_data: 'update_binance_request',
          },
        ],
        [{ text: '🔙 Back to Main Menu', callback_data: 'back_to_menu' }],
      ];

      // Edit current message
      await ctx.reply(completeMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: buttons,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in handleConnectBinanceAction: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  async handleUpdateWalletRequest(ctx: TelegramContext): Promise<void> {
    try {
      await ctx.reply(
        '💼 *Please enter your wallet address:*\n\nEnter a valid BEP20 address starting with "0x"',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            force_reply: true,
            selective: true,
          },
        },
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in handleUpdateWalletRequest: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  async handleUpdateBinanceRequest(ctx: TelegramContext): Promise<void> {
    try {
      await ctx.reply(
        '🔗 *Please enter your Binance username:*\n\nEnter your exact Binance username',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            force_reply: true,
            selective: true,
          },
        },
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in handleUpdateBinanceRequest: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  async handleTextMessage(
    ctx: TelegramContext,
    messageText: string,
    session: TelegramSession,
  ): Promise<void> {
    try {
      // Handle wallet address update
      if (
        session.waitingWalletFrom &&
        ctx.from?.id.toString() === session.waitingWalletFrom
      ) {
        const walletAddress = messageText.trim();
        const telegramId = ctx.from.id.toString();

        // Validate wallet address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
          await ctx.reply(
            '❌ *Invalid wallet address format*\n\nThe wallet address should be a valid BEP20 address starting with "0x" followed by 40 hexadecimal characters.\n\nPlease try again.',
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '🔙 Back to Main Menu',
                      callback_data: 'back_to_menu',
                    },
                  ],
                ],
              },
            },
          );
          // Clear waiting state
          delete session.waitingWalletFrom;
          return;
        }

        // Update wallet address
        const result = await this.usersService.updateWalletAddress(
          telegramId,
          walletAddress,
        );

        if (result) {
          await ctx.reply(
            `✅ *Wallet Address Updated Successfully!*\n\n` +
              `Your new wallet address:\n\`${walletAddress}\`\n\n`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '🔙 Back to Main Menu',
                      callback_data: 'back_to_menu',
                    },
                  ],
                ],
              },
            },
          );
        } else {
          await ctx.reply(
            '❌ *Error: Could not update your wallet address.*\n\nPlease try again later or contact support.',
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '🔙 Back to Main Menu',
                      callback_data: 'back_to_menu',
                    },
                  ],
                ],
              },
            },
          );
        }

        // Clear waiting state
        delete session.waitingWalletFrom;
      }
      // Handle Binance username update
      else if (
        session.waitingBinanceFrom &&
        ctx.from?.id.toString() === session.waitingBinanceFrom
      ) {
        const binanceUsername = messageText.trim();
        const telegramId = ctx.from.id.toString();

        // Check if Binance username is already in use by another user
        const existingUser =
          await this.usersService.findByBinanceUsername(binanceUsername);
        if (existingUser && existingUser.telegramId !== telegramId) {
          await ctx.reply(
            '❌ *This Binance username is already in use by another user.*\n\nPlease enter a different Binance username.',
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '🔙 Back to Main Menu',
                      callback_data: 'back_to_menu',
                    },
                  ],
                ],
              },
            },
          );
          // Clear waiting state
          delete session.waitingBinanceFrom;
          return;
        }

        // Update Binance username
        const result = await this.usersService.updateBinanceUsername(
          telegramId,
          binanceUsername,
        );

        if (result) {
          await ctx.reply(
            `✅ *Binance Username Updated Successfully!*\n\n` +
              `Your new Binance username:\n\`${binanceUsername}\`\n\n`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '🔙 Back to Main Menu',
                      callback_data: 'back_to_menu',
                    },
                  ],
                ],
              },
            },
          );
        } else {
          await ctx.reply(
            '❌ *Error: Could not update your Binance username.*\n\nPlease try again later or contact support.',
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '🔙 Back to Main Menu',
                      callback_data: 'back_to_menu',
                    },
                  ],
                ],
              },
            },
          );
        }

        // Clear waiting state
        delete session.waitingBinanceFrom;
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in handleTextMessage: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  async handleViewHistoryAction(
    telegramId: string,
    ctx: TelegramContext,
  ): Promise<void> {
    try {
      // Remove button to prevent multiple clicks
      await ctx.editMessageReplyMarkup(undefined);

      const user = await this.usersService.findByTelegramId(telegramId);

      if (!user) {
        await ctx.reply(
          '❌ You are not registered yet. Please start the bot with /start command first.',
        );
        return;
      }

      // Fetch user history
      const history = await this.depositService.getUserHistory(user.id);
      // const history: Deposit[] = [];
      // Edit current message
      if (
        ctx.callbackQuery &&
        'message' in ctx.callbackQuery &&
        ctx.callbackQuery.message
      ) {
        if (history.length > 0) {
          const historyMessage = history
            .map((item, index) => {
              const resultEmoji =
                item.result === DepositResult.WIN ? '🎉' : '📉';
              const resultText =
                item.result === DepositResult.WIN
                  ? `<b>${resultEmoji} ${item.result}</b>`
                  : `${resultEmoji} ${item.result}`;

              return (
                `<b>📝 ${index + 1}. Transaction #${item.orderId}</b>\n` +
                `<code>━━━━━━━━━━━━━━━━━━━━━</code>\n` +
                `<b>Option:</b> <code>${item.option ?? 'invalid'}</code>\n` +
                `<b>Amount:</b> <code>${item.amount}</code>\n` +
                `<b>Result:</b> ${resultText}\n` +
                `<b>Time:</b> <i>${item.transactionTime.toLocaleString()}</i>`
              );
            })
            .join('\n\n');

          await ctx.reply(
            `<b>📊 Your History</b> (latest 10 entries)\n\n${historyMessage}`,
            {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '🔙 Back to Main Menu',
                      callback_data: 'back_to_menu',
                    },
                  ],
                ],
              },
            },
          );
        } else {
          await ctx.reply(
            '<b>📊 Your History</b>\n\nYou have no history yet.',
            {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '🔙 Back to Main Menu',
                      callback_data: 'back_to_menu',
                    },
                  ],
                ],
              },
            },
          );
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in handleViewHistoryAction: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  async handleIncompleteProfileAction(ctx: TelegramContext): Promise<void> {
    try {
      if (
        ctx.callbackQuery &&
        'message' in ctx.callbackQuery &&
        ctx.callbackQuery.message
      ) {
        await ctx.editMessageText(
          '⚠️ *Incomplete Profile*\n\nYou need to complete your profile before accessing this feature.',
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '🔙 Back to Main Menu',
                    callback_data: 'back_to_menu',
                  },
                ],
              ],
            },
          },
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in handleIncompleteProfileAction: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  async handlePlayLuckyNumberAction(
    telegramId: string,
    ctx: TelegramContext,
  ): Promise<void> {
    try {
      await ctx.editMessageReplyMarkup(undefined);
      // Get user information
      const user = await this.usersService.findByTelegramId(telegramId);

      if (!user || !user.walletAddress || !user.binanceUsername) {
        await ctx.reply(
          '❌ You need to complete your profile before playing the game.',
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '🔙 Back to Main Menu',
                    callback_data: 'back_to_menu',
                  },
                ],
              ],
            },
          },
        );
        return;
      }

      // Game instructions
      const instructions = `
🎮 *Game Golden 7*:

💰 Betting amount: 0.5-10 USDT
💎 Win multiplier: 30x your bet

Good luck! 🍀
      `;

      const bannerImg = await this.settingService.getSetting(
        SettingKey.TELE_BOT_LUCKY_NUMBER_IMAGE,
        '',
      );

      const luckyAccount =
        await this.binanceService.getRandomActiveBinanceAccount(
          DepositOption.LUCKY_NUMBER,
        );

      await ctx.sendVideo(
        bannerImg || {
          source: fs.createReadStream(
            path.join(process.cwd(), 'assets/golden7.gif'),
          ),
        },
        {
          caption: instructions,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🎲 Play',
                  url:
                    luckyAccount?.binanceQrCodeUrl ?? 'https://app.binance.com',
                },
              ],
              [{ text: '🔙 Back to Main Menu', callback_data: 'back_to_menu' }],
            ],
          },
        },
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in handlePlayLuckyNumberAction: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  async handleBackToMenuAction(
    telegramId: string,
    fullName: string,
    ctx: TelegramContext,
  ): Promise<void> {
    try {
      await ctx.editMessageReplyMarkup(undefined);
      // Get user information
      const user = await this.usersService.findByTelegramId(telegramId);

      if (!user) {
        await ctx.reply(
          '❌ You are not registered yet. Please start the bot with /start command first.',
        );
        return;
      }

      // Generate the welcome message and buttons
      const { welcomeMessage, buttons } =
        await this.generateWelcomeMessageAndButtons(user, fullName);

      const introImg = await this.settingService.getSetting(
        SettingKey.TELE_BOT_INTRO_IMAGE,
        '',
      );

      // If no existing message, send a new one
      await ctx.sendVideo(
        introImg || {
          source: fs.createReadStream(
            path.join(process.cwd(), 'assets/intro.gif'),
          ),
        },
        {
          caption: welcomeMessage,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: buttons,
          },
        },
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in handleBackToMenuAction: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  private async generateWelcomeMessageAndButtons(
    user: User,
    fullName: string,
  ): Promise<{
    welcomeMessage: string;
    buttons: InlineKeyboardButton[][];
    missingInfo: string[];
  }> {
    // Create the welcome message
    let welcomeMessage = `👋 *Welcome, ${fullName}!*\n\n`;
    welcomeMessage += `🆔 User ID: \`${user.id}\`\n`;

    // Check for missing information
    const missingInfo: string[] = [];

    // Add wallet information
    if (user.walletAddress) {
      // Show a partial wallet address for security
      const shortWallet = `${user.walletAddress.substring(0, 6)}...${user.walletAddress.substring(user.walletAddress.length - 4)}`;
      welcomeMessage += `💼 Wallet: \`${shortWallet}\`\n`;
    } else {
      welcomeMessage += `💼 Wallet: ❌ *Not connected*\n`;
      missingInfo.push('wallet address');
    }

    // Add Binance username information
    if (user.binanceUsername) {
      welcomeMessage += `🔗 Binance Account: \`${user.binanceUsername}\`\n`;
    } else {
      welcomeMessage += `🔗 Binance Account: ❌ *Not connected*\n`;
      missingInfo.push('Binance username');
    }

    if (missingInfo.length > 0) {
      welcomeMessage += `\n⚠️ *WARNING: Your account is incomplete!*\n`;
      welcomeMessage += `You need to update your ${missingInfo.join(' and ')} to play the game.\n`;
      welcomeMessage += `Please use the buttons below to complete your profile.\n`;
    } else {
      welcomeMessage += `\n✅ *Your account is fully set up!*\n`;
      welcomeMessage += `You're ready to play the game.\n`;
    }

    // Create interaction buttons
    const buttons: InlineKeyboardButton[][] = [];

    const miniAppUrl = await this.settingService.getSetting(
      SettingKey.TELE_MINI_APP_URL,
      'https://sendswin-mini-app.pages.dev',
    );

    buttons.push([
      {
        text: '📱 Open App',
        web_app: { url: miniAppUrl },
      },
    ]);

    const supportUrl = await this.settingService.getSetting(
      SettingKey.TELE_CUSTOMER_SUPPORT_URL,
      'https://t.me',
    );

    if (user.walletAddress && user.binanceUsername) {
      buttons.push([
        { text: 'Ⓞ Odd/Even Ⓔ', callback_data: 'play_game' },
        { text: '🍀 Golden 7️', callback_data: 'play_lucky_number' },
      ]);
      buttons.push([
        { text: '📊 View History', callback_data: 'view_history' },
        { text: '🧑‍💼 Customer Support', url: supportUrl },
      ]);
    }

    const walletButtonText =
      user.walletAddress != null ? '💼 Wallet' : '⚠️ Wallet';

    const binanceButtonText =
      user.binanceUsername != null
        ? '🔗 Binance Account'
        : '⚠️ Binance Account';

    buttons.push([
      { text: walletButtonText, callback_data: 'connect_wallet' },
      {
        text: binanceButtonText,
        callback_data: 'connect_binance',
      },
    ]);

    return { welcomeMessage, buttons, missingInfo };
  }
}
