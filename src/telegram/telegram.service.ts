// src/telegram/telegram.service.ts
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { User } from '@/users/user.entity';
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

@Injectable()
export class TelegramService {
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
    const user = await this.usersService.createOrUpdateUser(
      telegramId,
      fullName,
      chatId.toString(),
    );

    // Tạo thông báo chào mừng
    let welcomeMessage = `👋 *Welcome, ${fullName}!*\n\n`;
    welcomeMessage += `🆔 User ID: \`${user.id}\`\n`;

    // Kiểm tra thông tin còn thiếu
    const missingInfo: string[] = [];

    // Thêm thông tin ví
    if (user.walletAddress) {
      // Hiển thị phần đầu và cuối của địa chỉ ví để bảo mật
      const shortWallet = `${user.walletAddress.substring(0, 6)}...${user.walletAddress.substring(user.walletAddress.length - 4)}`;
      welcomeMessage += `💼 Wallet: \`${shortWallet}\`\n`;
    } else {
      welcomeMessage += `💼 Wallet: ❌ *Not connected*\n`;
      missingInfo.push('wallet address');
    }

    // Thêm thông tin Binance username
    if (user.binanceUsername) {
      welcomeMessage += `🔗 Binance Account: \`${user.binanceUsername}\`\n`;
    } else {
      welcomeMessage += `🔗 Binance Account: ❌ *Not connected*\n`;
      missingInfo.push('Binance username');
    }

    // Thêm cảnh báo nếu thiếu thông tin
    if (missingInfo.length > 0) {
      welcomeMessage += `\n⚠️ *WARNING: Your account is incomplete!*\n`;
      welcomeMessage += `You need to update your ${missingInfo.join(' and ')} to play the game.\n`;
      welcomeMessage += `Please use the buttons below to complete your profile.\n`;
    } else {
      welcomeMessage += `\n✅ *Your account is fully set up!*\n`;
      welcomeMessage += `You're ready to play the game.\n`;
    }

    // Tạo các nút tương tác
    const buttons: InlineKeyboardButton[][] = [];

    // Nếu tài khoản đã đầy đủ thông tin, hiển thị nút Play Game và View History trước
    if (user.walletAddress && user.binanceUsername) {
      buttons.push([
        { text: '🎮 Play Over/Under', callback_data: 'play_game' },
        { text: '🎮 Play Lucky 7', callback_data: 'play_lucky_number' },
      ]);
      buttons.push([
        { text: '📊 View History', callback_data: 'view_history' },
      ]);
    }

    // Nút cập nhật hoặc kết nối ví
    if (user.walletAddress) {
      buttons.push([
        { text: '💼 Update Wallet', callback_data: 'connect_wallet' },
      ]);
    } else {
      buttons.push([
        { text: '💼 Connect Wallet ⚠️', callback_data: 'connect_wallet' },
      ]);
    }

    // Nút cập nhật hoặc kết nối Binance
    if (user.binanceUsername) {
      buttons.push([
        { text: '🔗 Update Binance Account', callback_data: 'connect_binance' },
      ]);
    } else {
      buttons.push([
        {
          text: '🔗 Connect Binance Account ⚠️',
          callback_data: 'connect_binance',
        },
      ]);
    }

    // Gửi thông báo với các nút
    await this.bot.telegram.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: buttons,
      },
    });
  }

  async updateWalletAddress(
    telegramId: string,
    walletAddress: string,
  ): Promise<User | null> {
    return await this.usersService.updateWalletAddress(
      telegramId,
      walletAddress,
    );
  }

  async getUserInfo(telegramId: string): Promise<User | null> {
    return this.usersService.findByTelegramId(telegramId);
  }

  async sendMessage(
    chatId: number,
    message: string,
    extra: ExtraReplyMessage = {},
  ): Promise<void> {
    await this.bot.telegram.sendMessage(chatId, message, extra);
  }

  async updateBinanceUsername(
    telegramId: string,
    binanceUsername: string,
  ): Promise<User | null> {
    return await this.usersService.updateBinanceUsername(
      telegramId,
      binanceUsername,
    );
  }

  async sendNewGameResultMessage(
    chatId: number,
    deposit: Deposit,
  ): Promise<void> {
    let optionDisplay = '🔺 OVER';

    if (deposit.option == DepositOption.UNDER) {
      optionDisplay = '🔻 UNDER';
    } else if (deposit.option == DepositOption.LUCKY_NUMBER) {
      optionDisplay = '🎲 LUCKY NUMBER';
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

    // Add extra message for winners
    const extra =
      deposit.result === DepositResult.WIN
        ? `\n🎉 Congratulations! Your payout of ${deposit.payout} USDT will be processed shortly.\n\n⚠️ *Important*: If you do not receive your payout within 5 minutes, please contact our customer support.`
        : '';

    // Send the notification to the user
    await this.sendMessage(chatId, message + extra, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🧑‍💼 Customer Support',
              url: 'https://t.me/daniel9291', // Replace with your actual support contact
            },
          ],
        ],
      },
      parse_mode: 'Markdown',
    });
  }

  async handlePlayGameAction(
    userId: string,
    chatId: number,
    ctx: TelegramContext,
  ): Promise<void> {
    // Get user information
    const user = await this.getUserInfo(userId);

    if (!user || !user.walletAddress || !user.binanceUsername) {
      await ctx.editMessageText(
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
🎮 *Over Under Game*:

💰 Betting amount: 0.5-50 USDT
💎 Win multiplier: 1.95x your bet

Good luck! 🍀
      `;

    if (
      ctx.callbackQuery &&
      'message' in ctx.callbackQuery &&
      ctx.callbackQuery.message
    ) {
      await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
    }
    const overAccount = await this.binanceService.getRandomActiveBinanceAccount(
      DepositOption.OVER,
    );
    const underAccount =
      await this.binanceService.getRandomActiveBinanceAccount(
        DepositOption.UNDER,
      );

    // Send QR code with game instructions
    await ctx.sendAnimation(
      {
        source: fs.createReadStream(
          path.join(__dirname, '../../assets/demo.mp4'),
        ),
      },
      {
        caption: instructions,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🔺 OVER',
                url: overAccount?.binanceQrCodeUrl ?? 'https://app.binance.com',
              },
              {
                text: '🔻 UNDER',
                url:
                  underAccount?.binanceQrCodeUrl ?? 'https://app.binance.com',
              },
            ],
            [{ text: '🔙 Back to Main Menu', callback_data: 'back_to_menu' }],
          ],
        },
      },
    );
  }

  async handleConnectWalletAction(
    userId: string,
    ctx: TelegramContext,
  ): Promise<void> {
    const user = await this.getUserInfo(userId);

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
    await ctx.editMessageText(completeMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: buttons,
      },
    });
  }

  async handleConnectBinanceAction(
    userId: string,
    ctx: TelegramContext,
  ): Promise<void> {
    const user = await this.getUserInfo(userId);

    if (!user) {
      await ctx.reply(
        '❌ You are not registered yet. Please start the bot with /start command first.',
      );
      return;
    }

    // Get an active Binance account for QR code URL
    const activeAccounts = await this.binanceService.getActiveBinanceAccounts();
    const activeAccount = activeAccounts.length > 0 ? activeAccounts[0] : null;

    // Current Binance info
    let binanceInfo = `🔗 *BINANCE ACCOUNT*\n\n`;

    if (user.binanceUsername) {
      binanceInfo += `*Your current Binance username:*\n\`${user.binanceUsername}\`\n\n`;
    } else {
      binanceInfo += `*You have not connected a Binance account yet.*\n\n`;
    }

    // Add transaction note (binanceLinkKey)
    binanceInfo += `*Transaction Note:*\n\`${user.binanceLinkKey}\`\n`;

    // Prepare interaction buttons
    const buttons: InlineKeyboardButton[][] = [];

    // Add Link Binance account button if we have an active account
    if (activeAccount) {
      buttons.push([
        {
          text: '🔗 Link Binance Account',
          url: activeAccount.binanceQrCodeUrl,
        },
      ]);
    }

    // Add back to menu button
    buttons.push([
      { text: '🔙 Back to Main Menu', callback_data: 'back_to_menu' },
    ]);

    // Edit current message
    await ctx.editMessageText(binanceInfo, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: buttons,
      },
    });
  }

  async handleUpdateBinanceRequest(ctx: TelegramContext): Promise<void> {
    // Send message requesting Binance username with force_reply
    await ctx.reply(
      '🔗 *Please enter your Binance username:*\n\nIt\'s usually something like "user123456"',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          force_reply: true,
          selective: true,
        },
      },
    );
  }

  async handleUpdateWalletRequest(ctx: TelegramContext): Promise<void> {
    // Send message requesting wallet address with force_reply
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
  }

  async handleTextMessage(
    ctx: TelegramContext,
    messageText: string,
    session: TelegramSession,
  ): Promise<void> {
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
      const result = await this.updateWalletAddress(telegramId, walletAddress);

      if (result) {
        // Show successful update message
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
    if (
      session.waitingBinanceFrom &&
      ctx.from?.id.toString() === session.waitingBinanceFrom
    ) {
      const binanceUsername = messageText.trim();
      const telegramId = ctx.from.id.toString();

      // Validate Binance username format
      if (binanceUsername.length < 2 || binanceUsername.length > 20) {
        await ctx.reply(
          '❌ *Invalid Binance username format*\n\nBinance username should be between 2 and 20 characters.\n\nPlease try again.',
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
      const result = await this.updateBinanceUsername(
        telegramId,
        binanceUsername,
      );

      if (result) {
        // Show successful update message
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
  }

  async handleViewHistoryAction(
    telegramId: string,
    ctx: TelegramContext,
  ): Promise<void> {
    // Remove button to prevent multiple clicks
    await ctx.editMessageReplyMarkup(undefined);

    const user = await this.getUserInfo(telegramId);

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
          .map(
            (item, index) =>
              `${index + 1}. Order ID: ${item.orderId}\n   Option: ${item.option ?? 'invalid'}\n   Amount: ${item.amount}\n   Result: ${item.result}\n   Transaction Time: ${item.transactionTime.toLocaleString()}`,
          )
          .join('\n\n');

        await ctx.editMessageText(
          `📊 *Your History* (latest 10 entries):\n\n${historyMessage}`,
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
        await ctx.editMessageText(
          '📊 *Your History*\n\nYou have no history yet.',
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
    }
  }

  async handleIncompleteProfileAction(ctx: TelegramContext): Promise<void> {
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
              [{ text: '🔙 Back to Main Menu', callback_data: 'back_to_menu' }],
            ],
          },
        },
      );
    }
  }

  async handlePlayLuckyNumberAction(
    userId: string,
    chatId: number,
    ctx: TelegramContext,
  ): Promise<void> {
    // Get user information
    const user = await this.getUserInfo(userId);

    if (!user || !user.walletAddress || !user.binanceUsername) {
      await ctx.editMessageText(
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
🎮 *LUCKY 7 GAME*:

💰 Betting amount: 0.5-10 USDT
💎 Win multiplier: 30x your bet

Good luck! 🍀
      `;

    if (
      ctx.callbackQuery &&
      'message' in ctx.callbackQuery &&
      ctx.callbackQuery.message
    ) {
      await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
    }

    const luckyAccount =
      await this.binanceService.getRandomActiveBinanceAccount(
        DepositOption.LUCKY_NUMBER,
      );

    // Send instructions with play button
    await ctx.sendAnimation(
      {
        source: fs.createReadStream(
          path.join(__dirname, '../../assets/demo.mp4'),
        ),
      },
      {
        caption: instructions,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🎲 7 Lucky',
                url:
                  luckyAccount?.binanceQrCodeUrl ?? 'https://app.binance.com',
              },
            ],
            [{ text: '🔙 Back to Main Menu', callback_data: 'back_to_menu' }],
          ],
        },
      },
    );
  }

  async handleBackToMenuAction(
    userId: string,
    fullName: string,
    chatId: number,
    ctx: TelegramContext,
  ): Promise<void> {
    // Get user information
    const user = await this.getUserInfo(userId);

    if (!user) {
      await ctx.reply(
        '❌ You are not registered yet. Please start the bot with /start command first.',
      );
      return;
    }

    // Create welcome message
    let welcomeMessage = `👋 *Welcome, ${fullName}!*\n\n`;
    welcomeMessage += `🆔 User ID: \`${user.id}\`\n`;

    // Check for missing information
    const missingInfo: string[] = [];

    // Add wallet information
    if (user.walletAddress) {
      // Show partial wallet address for security
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

    // Add warning if information is missing
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

    // If account is complete, show Play Game and View History buttons first
    if (user.walletAddress && user.binanceUsername) {
      buttons.push([
        { text: '🎮 Play Over/Under', callback_data: 'play_game' },
        { text: '🎮 Play Lucky 7', callback_data: 'play_lucky_number' },
      ]);
      buttons.push([
        { text: '📊 View History', callback_data: 'view_history' },
      ]);
    }

    // Wallet update or connect button
    if (user.walletAddress) {
      buttons.push([
        { text: '💼 Update Wallet', callback_data: 'connect_wallet' },
      ]);
    } else {
      buttons.push([
        { text: '💼 Connect Wallet ⚠️', callback_data: 'connect_wallet' },
      ]);
    }

    // Binance update or connect button
    if (user.binanceUsername) {
      buttons.push([
        {
          text: '🔗 Update Binance Account',
          callback_data: 'connect_binance',
        },
      ]);
    } else {
      buttons.push([
        {
          text: '🔗 Connect Binance Account ⚠️',
          callback_data: 'connect_binance',
        },
      ]);
    }

    if (
      ctx.callbackQuery &&
      'message' in ctx.callbackQuery &&
      ctx.callbackQuery.message
    ) {
      // Edit or send new message based on context
      try {
        await ctx.editMessageText(welcomeMessage, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: buttons,
          },
        });
      } catch {
        // If editing fails, send a new message
        await ctx.reply(welcomeMessage, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: buttons,
          },
        });
      }
    } else {
      // If no existing message, send a new one
      await ctx.reply(welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: buttons,
        },
      });
    }
  }
}
