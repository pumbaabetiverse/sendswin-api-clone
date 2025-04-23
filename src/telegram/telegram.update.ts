import { Action, Ctx, Message, On, Start, Update } from 'nestjs-telegraf';
import { Context, Scenes } from 'telegraf';
import { TelegramService } from '@/telegram/telegram.service';

export interface TelegramSession
  extends Scenes.SceneSession<Scenes.SceneSessionData> {
  waitingWalletFrom?: string;
  waitingBinanceFrom?: string;
}

export interface TelegramContext extends Context {
  scene: Scenes.SceneContextScene<TelegramContext>;
  session: TelegramSession;
}

@Update()
export class TelegramUpdate {
  constructor(private readonly telegramService: TelegramService) {}

  @Start()
  async startCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.message) {
      return;
    }
    const chatId = ctx.message.chat.id; // Keep as number
    const userId = ctx.message.from.id.toString(); // Convert to string for database
    const firstName = ctx.message.from.first_name || '';
    const lastName = ctx.message.from.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();

    await this.telegramService.handleStartCommand(userId, fullName, chatId);
  }

  @Action('play_game')
  async playGameAction(@Ctx() ctx: TelegramContext) {
    if (!ctx.from || !ctx.chat?.id) {
      return;
    }

    const userId = ctx.from.id.toString();
    const chatId = ctx.chat.id;

    await this.telegramService.handlePlayGameAction(userId, chatId, ctx);
  }

  @Action('connect_wallet')
  async connectWalletAction(@Ctx() ctx: TelegramContext) {
    if (!ctx.from || !ctx.chat?.id) {
      return;
    }

    const userId = ctx.from.id.toString();
    await this.telegramService.handleConnectWalletAction(userId, ctx);
  }

  @Action('connect_binance')
  async connectBinanceAction(@Ctx() ctx: TelegramContext) {
    if (!ctx.from || !ctx.chat?.id) {
      return;
    }

    const userId = ctx.from.id.toString();
    await this.telegramService.handleConnectBinanceAction(userId, ctx);
  }

  @Action('update_binance_request')
  async updateBinanceRequest(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) {
      return;
    }

    // Lưu user ID vào scene.state
    ctx.session.waitingBinanceFrom = ctx.from.id.toString();

    await this.telegramService.handleUpdateBinanceRequest(ctx);
  }

  @Action('update_wallet_request')
  async updateWalletRequest(@Ctx() ctx: TelegramContext) {
    // Lưu user ID để sử dụng khi xử lý phản hồi
    ctx.session.waitingWalletFrom = ctx.from?.id.toString();

    await this.telegramService.handleUpdateWalletRequest(ctx);
  }

  @On('text')
  async onText(
    @Ctx() ctx: TelegramContext,
    @Message('text') messageText: string,
  ) {
    await this.telegramService.handleTextMessage(ctx, messageText, ctx.session);
  }

  @Action('view_history')
  async viewHistoryAction(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) {
      return;
    }

    const telegramId = ctx.from.id.toString();
    await this.telegramService.handleViewHistoryAction(telegramId, ctx);
  }

  @Action('incomplete_profile')
  async incompleteProfileAction(@Ctx() ctx: TelegramContext) {
    await this.telegramService.handleIncompleteProfileAction(ctx);
  }

  @Action('play_lucky_number')
  async playLuckyNumberAction(@Ctx() ctx: TelegramContext) {
    if (!ctx.from || !ctx.chat?.id) {
      return;
    }

    const userId = ctx.from.id.toString();
    const chatId = ctx.chat.id;

    await this.telegramService.handlePlayLuckyNumberAction(userId, chatId, ctx);
  }

  @Action('back_to_menu')
  async backToMenuAction(@Ctx() ctx: TelegramContext) {
    if (!ctx.from || !ctx.chat?.id) {
      return;
    }

    const userId = ctx.from.id.toString();
    const firstName = ctx.from.first_name || '';
    const lastName = ctx.from.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const chatId = ctx.chat.id;

    await this.telegramService.handleBackToMenuAction(
      userId,
      fullName,
      chatId,
      ctx,
    );
  }
}
