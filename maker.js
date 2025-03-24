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
  language: { type: String, default: 'en' }, // Added language field
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

// Translations
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
      changeLanguage: '🌐 Change Language',
    },
    helpMessage: (url) => `To get help, please open this link: ${url}`,
    infoMessage: (url) => `To get info, please open this link: ${url}`,
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
      `❌ Failed for ${successCount} users`,
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
      changeLanguage: '🌐 تغییر زبان',
    },
    helpMessage: (url) => `برای دریافت کمک، لطفاً این لینک را باز کنید: ${url}`,
    infoMessage: (url) => `برای دریافت اطلاعات، لطفاً این لینک را باز کنید: ${url}`,
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
      `➕ اطلاعیه کاربر جدید ➕\n` +
      `👤 کاربر: ${username}\n` +
      `🆔 شناسه کاربر: ${userId}\n` +
      `⭐ معرفی شده توسط: ${referredBy}\n` +
      `📊 تعداد کل کاربران ربات: ${totalUsers}`,
  },
};

// Keyboards
const getAdminPanel = (lang) => ({
  reply_markup: {
    keyboard: [
      [{ text: translations[lang].adminPanelOptions.statistics }],
      [{ text: translations[lang].adminPanelOptions.broadcast }],
      [{ text: translations[lang].adminPanelOptions.setChannelUrl }],
      [{ text: translations[lang].adminPanelOptions.block }],
      [{ text: translations[lang].adminPanelOptions.unlock }],
      [{ text: translations[lang].adminPanelOptions.back }],
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
        await bot.telegram.sendMessage(targetUser.userId, message.text);
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

    if (!chatId || !fromId) {
      console.error('Invalid update: missing chatId or fromId', update);
      res.status(400).json({ error: 'Invalid update' });
      return;
    }

    let botUser = await BotUser.findOne({ botToken, userId: fromId });
    if (!botUser) {
      const username = update.message?.from?.username ? `@${update.message.from.username}` : update.message?.from?.first_name;
      const referredBy = update.message?.text?.split(' ')[1] || 'None';
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
        language: 'en', // Default language
      });
    }

    const lang = botUser.language || 'en';

    if (botUser.isFirstStart) {
      try {
        const totalUsers = await BotUser.countDocuments({ botToken, hasJoined: true });
        const notification = translations[lang].newUserNotification(botUser.username, fromId, botUser.referredBy, totalUsers);
        await bot.telegram.sendMessage(botInfo.creatorId, notification);
        botUser.isFirstStart = false;
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

      if (text === '/start') {
        try {
          if (botUser.isFirstStart || !botUser.hasJoined) {
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
            await bot.telegram.sendMessage(chatId, translations[lang].backToNormal, {
              reply_markup: { remove_keyboard: true },
            });
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

          await bot.telegram.sendMessage(chatId, translations['en'].joinMessage, {
            reply_markup: {
              inline_keyboard: inlineKeyboard,
            },
          });
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

          await bot.telegram.sendMessage(chatId, translations['fa'].joinMessage, {
            reply_markup: {
              inline_keyboard: inlineKeyboard,
            },
          });
          botUser.userStep = 'none';
          await botUser.save();
        } catch (error) {
          console.error('Error in "lang_fa" callback:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }

      else if (callbackData === 'joined') {
        try {
          botUser.hasJoined = true;
          await botUser.save();

          const username = botUser.username || 'User';
          const welcomeMessage = translations[lang].welcome(username);
          const menuKeyboard = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: translations[lang].menu.help, callback_data: 'help' },
                  { text: translations[lang].menu.info, callback_data: 'info' },
                ],
                [{ text: translations[lang].menu.changeLanguage, callback_data: 'change_language' }],
              ],
            },
          };

          await bot.telegram.answerCbQuery(callbackQueryId, translations[lang].thankYou);
          await bot.telegram.sendMessage(chatId, welcomeMessage, menuKeyboard);
        } catch (error) {
          console.error('Error in "joined" callback:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }

      else if (callbackData === 'change_language') {
        try {
          await bot.telegram.answerCbQuery(callbackQueryId);
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
        } catch (error) {
          console.error('Error in "change_language" callback:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }

      else if (callbackData === 'help') {
        try {
          const randomLetter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
          const randomNumber = Math.floor(Math.random() * 10);
          const noise = `${randomLetter}${randomNumber}`;
          const encodedBot = Buffer.from(botToken).toString('base64') + noise;
          const encodedId = Buffer.from(chatId.toString()).toString('base64') + noise;
          const longHelpUrl = `https://for-free.serv00.net/t/index.html?x=${encodedBot}&y=${encodedId}`;
          const shortHelpUrl = await shortenUrl(longHelpUrl);
          await bot.telegram.answerCbQuery(callbackQueryId);
          await bot.telegram.sendMessage(chatId, translations[lang].helpMessage(shortHelpUrl));
        } catch (error) {
          console.error('Error in "help" callback:', error);
          await bot.telegram.sendMessage(chatId, translations[lang].error);
        }
      }

      else if (callbackData === 'info') {
        try {const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');
const axios = require('axios');

const MAKER_BOT_TOKEN = process.env.MAKER_BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const OWNER_ID = process.env.OWNER_ID;

if (!MAKER_BOT_TOKEN || !MONGO_URI || !OWNER_ID) {
  console.error('Missing environment variables');
  process.exit(1);
}

const makerBot = new Telegraf(MAKER_BOT_TOKEN);

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB error:', err);
    process.exit(1);
  });

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  step: { type: String, default: 'none' },
  adminState: { type: String, default: 'none' },
  isBlocked: { type: Boolean, default: false },
  username: { type: String },
  referredBy: { type: String, default: 'None' },
  isFirstStart: { type: Boolean, default: true },
  referralCount: { type: Number, default: 0 },
  language: { type: String, default: 'en' },
});

const BotSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  creatorId: { type: String, required: true },
  creatorUsername: { type: String },
  template: { type: String, default: 'created' },
  createdAt: { type: Number, default: () => Math.floor(Date.now() / 1000) },
});

const BotUserSchema = new mongoose.Schema({
  botToken: { type: String, required: true },
  userId: { type: String, required: true },
  hasJoined: { type: Boolean, default: false },
  step: { type: String, default: 'none' },
});

const ChannelUrlSchema = new mongoose.Schema({
  botToken: { type: String, required: true, unique: true },
  defaultUrl: { type: String, default: 'https://t.me/Kali_Linux_BOTS' },
  customUrl: { type: String, default: null },
});

const MakerChannelUrlSchema = new mongoose.Schema({
  channel1: { type: String, default: 'https://t.me/Kali_Linux_BOTS' },
  channel2: { type: String, default: 'https://t.me/Kali_Linux_BOTS' },
});

const BotLimitSchema = new mongoose.Schema({
  limit: { type: Number, default: 0 },
});

const BotModeSchema = new mongoose.Schema({
  mode: { type: String, default: 'normal' },
  referralLimit: { type: Number, default: 0 },
});

const VipUserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
});

const User = mongoose.model('User', UserSchema);
const Bot = mongoose.model('Bot', BotSchema);
const BotUser = mongoose.model('BotUser', BotUserSchema);
const ChannelUrl = mongoose.model('ChannelUrl', ChannelUrlSchema);
const MakerChannelUrl = mongoose.model('MakerChannelUrl', MakerChannelUrlSchema);
const BotLimit = mongoose.model('BotLimit', BotLimitSchema);
const BotMode = mongoose.model('BotMode', BotModeSchema);
const VipUser = mongoose.model('VipUser', VipUserSchema);

const translations = {
  en: {
    chooseLanguage: 'Please choose your language\nلطفا زبان مورد نظر خود را انتخاب کنید',
    english: 'English',
    persian: 'Persian (فارسی)',
    welcome: 'Welcome to Bot Maker! Use the buttons below to create and manage your Telegram bots.',
    mainMenu: {
      createBot: '🛠 Create Bot',
      deleteBot: '🗑️ Delete Bot',
      myBots: '📋 My Bots',
      faq: '❓ FAQ',
      changeLanguage: '🌐 Change Language',
    },
    joinMessage: 'Please join our channel(s) and click "Joined" to proceed.',
    joinChannel1: 'Join Channel 1',
    joinChannel2: 'Join Channel 2',
    joined: 'Joined',
    thankYou: 'Thank you for proceeding!',
    banned: '🚫 You have been banned by the admin.',
    createBotPrompt: 'Send your bot token from @BotFather to make your bot:',
    back: '↩️ Back to main menu.',
    botLimitReached: (limit) => `❌ You can only create ${limit} bots.`,
    lockMode: '❌ You can\'t make bot. Contact @Kaliboy002.',
    referralMode: (required, current, link) =>
      `❌ Invite ${required} users to unlock bot creation.\n` +
      `Your invites: ${current}\nYour link: ${link}`,
    invalidToken: '❌ Invalid bot token. Try again:',
    tokenInUse: '❌ This bot token is already in use.',
    webhookFailed: '❌ Failed to set up bot. Try again.',
    botCreated: (username) => `✅ Your bot **@${username}** created successfully! Use /panel to manage.`,
    deleteBotPrompt: 'Send the bot token you want to delete:',
    botNotFound: '❌ Bot token not found.',
    botDeleted: '✅ Bot deleted and disconnected.',
    myBots: '📋 **Your Bots**:\n\n',
    noBots: 'You haven’t created any bots yet.',
    botInfo: (username, userCount, createdAt, template, token) =>
      `🤖 **@${username}**\n` +
      `👥 Total Users: ${userCount}\n` +
      `📅 Created: ${createdAt}\n` +
      `🛠 Template: ${template}\n` +
      `🔑 Token: ||${token}||\n\n`,
    faqMessage: '❓ **FAQ About Bot Maker**\n\n' +
                '> Create and manage Telegram bots easily!\n' +
                '- **What is Bot Maker?**: A tool to build bots without coding.\n' +
                '- **How to start?**: Get a token from @BotFather and use "Create Bot".\n' +
                '- **Support**: Contact @Kaliboy002 for help.',
    newUserNotification: (username, userId, referredBy, totalUsers) =>
      `➕ **New User**\n` +
      `👤 ${username}\n` +
      `🆔 ${userId}\n` +
      `⭐ Referred By: ${referredBy}\n` +
      `📊 Total Users: ${totalUsers}`,
    referralNotification: (username, total) =>
      `New user ${username} joined via your link.\nTotal invites: ${total}`,
    botCreatedNotification: (username, userId, botUsername, createdAt, totalBots) =>
      `🤖 **New Bot Created**\n` +
      `👤 ${username}\n` +
      `🆔 ${userId}\n` +
      `🤖 @${botUsername}\n` +
      `📅 ${createdAt}\n` +
      `📊 Total Bots: ${totalBots}`,
    unauthorized: '❌ Unauthorized command.',
    error: '❌ Error occurred. Try again.',
    startBot: 'Start the bot with /start.',
  },
  fa: {
    chooseLanguage: 'لطفا زبان مورد نظر خود را انتخاب کنید\nPlease choose your language',
    english: 'انگلیسی',
    persian: 'فارسی',
    welcome: 'به سازنده ربات خوش آمدید! از دکمه‌ها برای مدیریت ربات‌ها استفاده کنید.',
    mainMenu: {
      createBot: '🛠 ساخت ربات',
      deleteBot: '🗑️ حذف ربات',
      myBots: '📋 ربات‌های من',
      faq: '❓ سوالات متداول',
      changeLanguage: '🌐 تغییر زبان',
    },
    joinMessage: 'لطفاً به کانال‌ها بپیوندید و "پیوستم" را کلیک کنید.',
    joinChannel1: 'پیوستن به کانال ۱',
    joinChannel2: 'پیوستن به کانال ۲',
    joined: 'پیوستم',
    thankYou: 'ممنون از شما!',
    banned: '🚫 شما توسط مدیر مسدود شده‌اید.',
    createBotPrompt: 'توکن ربات خود را از @BotFather ارسال کنید:',
    back: '↩️ بازگشت به منو',
    botLimitReached: (limit) => `❌ فقط می‌توانید ${limit} ربات بسازید.`,
    lockMode: '❌ امکان ساخت ربات نیست. با @Kaliboy002 تماس بگیرید.',
    referralMode: (required, current, link) =>
      `❌ برای ساخت ربات ${required} دعوت نیاز است.\n` +
      `دعوت‌های شما: ${current}\nلینک شما: ${link}`,
    invalidToken: '❌ توکن نامعتبر است. دوباره تلاش کنید:',
    tokenInUse: '❌ این توکن قبلاً استفاده شده است.',
    webhookFailed: '❌ راه‌اندازی ربات失敗 کرد. دوباره تلاش کنید.',
    botCreated: (username) => `✅ ربات **@${username}** با موفقیت ساخته شد! از /panel استفاده کنید.`,
    deleteBotPrompt: 'توکن رباتی که می‌خواهید حذف کنید را ارسال کنید:',
    botNotFound: '❌ توکن ربات یافت نشد.',
    botDeleted: '✅ ربات حذف شد.',
    myBots: '📋 **ربات‌های شما**:\n\n',
    noBots: 'هنوز رباتی نساخته‌اید.',
    botInfo: (username, userCount, createdAt, template, token) =>
      `🤖 **@${username}**\n` +
      `👥 تعداد کاربران: ${userCount}\n` +
      `📅 ایجاد شده: ${createdAt}\n` +
      `🛠 قالب: ${template}\n` +
      `🔑 توکن: ||${token}||\n\n`,
    faqMessage: '❓ **سوالات متداول درباره سازنده ربات**\n\n' +
                '> ربات‌های تلگرام را به راحتی بسازید!\n' +
                '- **سازنده ربات چیست؟**: ابزاری برای ساخت ربات بدون کدنویسی.\n' +
                '- **چگونه شروع کنم؟**: توکن را از @BotFather بگیرید و "ساخت ربات" را بزنید.\n' +
                '- **پشتیبانی**: با @Kaliboy002 تماس بگیرید.',
    newUserNotification: (username, userId, referredBy, totalUsers) =>
      `➕ **کاربر جدید**\n` +
      `👤 ${username}\n` +
      `🆔 ${userId}\n` +
      `⭐ معرفی شده توسط: ${referredBy}\n` +
      `📊 تعداد کاربران: ${totalUsers}`,
    referralNotification: (username, total) =>
      `کاربر ${username} از لینک شما加入 کرد.\nتعداد دعوت‌ها: ${total}`,
    botCreatedNotification: (username, userId, botUsername, createdAt, totalBots) =>
      `🤖 **ربات جدید ساخته شد**\n` +
      `👤 ${username}\n` +
      `🆔 ${userId}\n` +
      `🤖 @${botUsername}\n` +
      `📅 ${createdAt}\n` +
      `📊 تعداد ربات‌ها: ${totalBots}`,
    unauthorized: '❌ شما مجاز به این دستور نیستید.',
    error: '❌ خطایی رخ داد. دوباره تلاش کنید.',
    startBot: 'ربات را با /start شروع کنید.',
  },
};

const getMainMenu = (lang) => ({
  reply_markup: {
    keyboard: [
      [{ text: translations[lang].mainMenu.createBot }],
      [
        { text: translations[lang].mainMenu.deleteBot },
        { text: translations[lang].mainMenu.myBots },
      ],
      [
        { text: translations[lang].mainMenu.faq },
        { text: translations[lang].mainMenu.changeLanguage },
      ],
    ],
    resize_keyboard: true,
  },
});

const ownerAdminPanel = {
  reply_markup: {
    keyboard: [
      [{ text: '📊 Statistics' }, { text: '📢 Broadcast User' }],
      [{ text: '📣 Broadcast Sub' }, { text: '🚫 Block' }],
      [{ text: '🔓 Unlock' }, { text: '🗑️ Remove Bot' }],
      [{ text: '📏 Limit Bot' }, { text: '🔧 Bot Mode' }],
      [{ text: '👑 Add VIP User' }, { text: '🔗 Set Channel URL' }],
      [{ text: '↩️ Back' }],
    ],
    resize_keyboard: true,
  },
};

const channelUrlMenu = {
  reply_markup: {
    keyboard: [
      [{ text: 'Set Channel 1' }, { text: 'Set Channel 2' }],
      [{ text: 'Set Created URL' }, { text: '↩️ Back' }],
    ],
    resize_keyboard: true,
  },
};

const cancelKeyboard = {
  reply_markup: {
    keyboard: [[{ text: 'Cancel' }, { text: 'عقب' }]],
    resize_keyboard: true,
  },
};

const backKeyboard = {
  reply_markup: {
    keyboard: [[{ text: 'Back' }, { text: 'عقب' }]],
    resize_keyboard: true,
  },
};

const getBotModeKeyboard = async () => {
  const botMode = await BotMode.findOne() || { mode: 'normal' };
  const referralModeText = botMode.mode === 'referral' ? 'Referral Mode ✔️' : 'Referral Mode';
  const lockModeText = botMode.mode === 'lock' ? 'Lock Mode ✔️' : 'Lock Mode';
  const normalModeText = botMode.mode === 'normal' ? 'Normal Mode ✔️' : 'Normal Mode';

  return {
    reply_markup: {
      keyboard: [
        [{ text: referralModeText }],
        [{ text: lockModeText }],
        [{ text: normalModeText }],
        [{ text: '↩️ Back' }],
      ],
      resize_keyboard: true,
    },
  };
};

const getChannelUrls = async () => {
  try {
    const channelUrls = await MakerChannelUrl.findOne() || {
      channel1: 'https://t.me/Kali_Linux_BOTS',
      channel2: 'https://t.me/Kali_Linux_BOTS',
    };
    return { channel1: channelUrls.channel1, channel2: channelUrls.channel2 };
  } catch (error) {
    console.error('Error in getChannelUrls:', error);
    return { channel1: 'https://t.me/Kali_Linux_BOTS', channel2: 'https://t.me/Kali_Linux_BOTS' };
  }
};

const validateBotToken = async (token) => {
  try {
    const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
    return response.data.ok ? response.data.result : null;
  } catch (error) {
    console.error('Token validation error:', error.message);
    return null;
  }
};

const setWebhook = async (token, template = 'created') => {
  const webhookUrl = `https://mybot-drab.vercel.app/${template}?token=${encodeURIComponent(token)}`;
  try {
    const response = await axios.get(`https://api.telegram.org/bot${token}/setWebhook`, { params: { url: webhookUrl } });
    return response.data.ok;
  } catch (error) {
    console.error('Webhook error:', error.message);
    return false;
  }
};

const deleteWebhook = async (token) => {
  try {
    const response = await axios.get(`https://api.telegram.org/bot${token}/deleteWebhook`);
    return response.data.ok;
  } catch (error) {
    console.error('Webhook deletion error:', error.message);
    return false;
  }
};

const botInstances = new Map();

const getBotInstance = (botToken) => {
  if (!botInstances.has(botToken)) {
    botInstances.set(botToken, new Telegraf(botToken));
  }
  return botInstances.get(botToken);
};

const broadcastMessage = async (bot, message, targetUsers, adminId) => {
  let successCount = 0, failCount = 0;
  for (const targetUser of targetUsers) {
    if (targetUser.userId === adminId) continue;
    try {
      if (message.text) await bot.telegram.sendMessage(targetUser.userId, message.text);
      else if (message.photo) await bot.telegram.sendPhoto(targetUser.userId, message.photo[message.photo.length - 1].file_id, { caption: message.caption || '' });
      else if (message.document) await bot.telegram.sendDocument(targetUser.userId, message.document.file_id, { caption: message.caption || '' });
      else if (message.video) await bot.telegram.sendVideo(targetUser.userId, message.video.file_id, { caption: message.caption || '' });
      else if (message.audio) await bot.telegram.sendAudio(targetUser.userId, message.audio.file_id, { caption: message.caption || '' });
      else if (message.voice) await bot.telegram.sendVoice(targetUser.userId, message.voice.file_id);
      else if (message.sticker) await bot.telegram.sendSticker(targetUser.userId, message.sticker.file_id);
      else await bot.telegram.sendMessage(targetUser.userId, 'Unsupported message type');
      successCount++;
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.error(`Broadcast failed for ${targetUser.userId}:`, error.message);
      failCount++;
    }
  }
  return { successCount, failCount };
};

const broadcastSubMessage = async (message, adminId) => {
  let totalSuccess = 0, totalFail = 0;
  const bots = await Bot.aggregate([
    { $lookup: { from: 'botusers', localField: 'token', foreignField: 'botToken', as: 'users' } },
    { $addFields: { userCount: { $size: '$users' } } },
    { $sort: { userCount: -1 } },
  ]);

  const broadcastedUsers = new Set();
  for (const botInfo of bots) {
    const bot = getBotInstance(botInfo.token);
    const userIds = await BotUser.distinct('userId', { botToken: botInfo.token, hasJoined: true, isBlocked: false });
    const targetUsers = userIds.map(userId => ({ userId }));
    if (!targetUsers.length) continue;

    const usersToBroadcast = targetUsers.filter(user => !broadcastedUsers.has(user.userId));
    if (!usersToBroadcast.length) continue;

    const { successCount, failCount } = await broadcastMessage(bot, message, usersToBroadcast, adminId);
    totalSuccess += successCount;
    totalFail += failCount;
    usersToBroadcast.forEach(user => broadcastedUsers.add(user.userId));
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return { totalSuccess, totalFail };
};

const getRelativeTime = (timestamp) => {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  const date = new Date(timestamp * 1000);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dateStr = `${month}/${day}`;
  if (diff < 60) return `${dateStr}, ${diff} sec ago`;
  if (diff < 3600) return `${dateStr}, ${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${dateStr}, ${Math.floor(diff / 3600)} hr ago`;
  return `${dateStr}, ${Math.floor(diff / 86400)} days ago`;
};

makerBot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  const chatId = ctx.message.chat.id;
  try {
    let user = await User.findOne({ userId });
    if (user?.isBlocked) {
      ctx.reply(translations[user.language || 'en'].banned);
      return;
    }

    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    const referredBy = ctx.message.text.split(' ')[1] || 'None';

    if (!user) {
      user = await User.create({
        userId, step: 'none', adminState: 'none', isBlocked: false, username, referredBy, isFirstStart: true, referralCount: 0, language: 'en',
      });
      if (referredBy !== 'None' && /^\d+$/.test(referredBy)) {
        const referrer = await User.findOne({ userId: referredBy });
        if (referrer) {
          referrer.referralCount = (referrer.referralCount || 0) + 1;
          await referrer.save();
          await makerBot.telegram.sendMessage(referredBy, translations[referrer.language || 'en'].referralNotification(username, referrer.referralCount));
        }
      }
    }

    if (user.isFirstStart) {
      const totalUsers = await User.countDocuments({ isBlocked: false });
      const lang = user.language || 'en';
      await makerBot.telegram.sendMessage(OWNER_ID, translations[lang].newUserNotification(username, userId, referredBy, totalUsers));
      user.isFirstStart = false;
      await user.save();

      const message = await ctx.reply(translations[lang].chooseLanguage, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: translations[lang].english, callback_data: 'lang_en' },
              { text: translations[lang].persian, callback_data: 'lang_fa' },
            ],
          ],
        },
      });
      await User.findOneAndUpdate({ userId }, { step: `choose_language_${message.message_id}` });
      return;
    }

    const lang = user.language || 'en';
    const { channel1, channel2 } = await getChannelUrls();
    await ctx.reply(translations[lang].joinMessage, {
      reply_markup: { inline_keyboard: [
        [{ text: translations[lang].joinChannel1, url: channel1 }],
        [{ text: translations[lang].joinChannel2, url: channel2 }],
        [{ text: translations[lang].joined, callback_data: 'joined' }],
      ]},
    });
  } catch (error) {
    console.error('Start error:', error);
    ctx.reply(translations['en'].error);
  }
});

makerBot.hears([translations.en.mainMenu.createBot, translations.fa.mainMenu.createBot], async (ctx) => {
  const userId = ctx.from.id.toString();
  const user = await User.findOne({ userId });
  if (!user || user.isBlocked) return ctx.reply(translations[user?.language || 'en'].banned);

  const lang = user.language || 'en';
  const isVip = await VipUser.findOne({ userId });
  if (isVip) {
    const botLimit = (await BotLimit.findOne())?.limit || 0;
    const userBotCount = await Bot.countDocuments({ creatorId: userId });
    if (botLimit > 0 && userBotCount >= botLimit) return ctx.reply(translations[lang].botLimitReached(botLimit), getMainMenu(lang));

    ctx.reply(translations[lang].createBotPrompt, backKeyboard);
    return await User.findOneAndUpdate({ userId }, { step: 'create_bot' });
  }

  const botMode = await BotMode.findOne() || { mode: 'normal', referralLimit: 0 };
  if (botMode.mode === 'lock') return ctx.reply(translations[lang].lockMode, getMainMenu(lang));
  if (botMode.mode === 'referral' && (user.referralCount || 0) < botMode.referralLimit) {
    const botLink = `https://t.me/${(await makerBot.telegram.getMe()).username}?start=${userId}`;
    return ctx.reply(translations[lang].referralMode(botMode.referralLimit, user.referralCount, botLink), getMainMenu(lang));
  }

  const botLimit = (await BotLimit.findOne())?.limit || 0;
  const userBotCount = await Bot.countDocuments({ creatorId: userId });
  if (botLimit > 0 && userBotCount >= botLimit) return ctx.reply(translations[lang].botLimitReached(botLimit), getMainMenu(lang));

  ctx.reply(translations[lang].createBotPrompt, backKeyboard);
  await User.findOneAndUpdate({ userId }, { step: 'create_bot' });
});

makerBot.hears([translations.en.mainMenu.deleteBot, translations.fa.mainMenu.deleteBot], async (ctx) => {
  const userId = ctx.from.id.toString();
  const user = await User.findOne({ userId });
  if (!user || user.isBlocked) return ctx.reply(translations[user?.language || 'en'].banned);

  const lang = user.language || 'en';
  ctx.reply(translations[lang].deleteBotPrompt, backKeyboard);
  await User.findOneAndUpdate({ userId }, { step: 'delete_bot' });
});

makerBot.hears([translations.en.mainMenu.myBots, translations.fa.mainMenu.myBots], async (ctx) => {
  const userId = ctx.from.id.toString();
  const user = await User.findOne({ userId });
  if (!user || user.isBlocked) return ctx.reply(translations[user?.language || 'en'].banned);

  const lang = user.language || 'en';
  const userBots = await Bot.find({ creatorId: userId });
  let message = translations[lang].myBots;
  if (!userBots.length) message += translations[lang].noBots;
  else {
    for (const bot of userBots) {
      const userCount = await BotUser.countDocuments({ botToken: bot.token, hasJoined: true });
      const createdAt = getRelativeTime(bot.createdAt);
      message += translations[lang].botInfo(bot.username, userCount, createdAt, bot.template, bot.token);
    }
  }
  ctx.reply(message, { parse_mode: 'MarkdownV2', ...getMainMenu(lang) });
});

makerBot.hears([translations.en.mainMenu.faq, translations.fa.mainMenu.faq], async (ctx) => {
  const userId = ctx.from.id.toString();
  const user = await User.findOne({ userId });
  if (!user || user.isBlocked) return ctx.reply(translations[user?.language || 'en'].banned);

  const lang = user.language || 'en';
  ctx.reply(translations[lang].faqMessage, { parse_mode: 'MarkdownV2', ...getMainMenu(lang) });
});

makerBot.hears([translations.en.mainMenu.changeLanguage, translations.fa.mainMenu.changeLanguage], async (ctx) => {
  const userId = ctx.from.id.toString();
  const user = await User.findOne({ userId });
  if (!user || user.isBlocked) return ctx.reply(translations[user?.language || 'en'].banned);

  const lang = user.language || 'en';
  await ctx.reply(translations[lang].chooseLanguage, {
    reply_markup: { inline_keyboard: [
      [{ text: translations[lang].english, callback_data: 'lang_en' }],
      [{ text: translations[lang].persian, callback_data: 'lang_fa' }],
    ]},
  });
});

makerBot.command('panel', async (ctx) => {
  const userId = ctx.from.id.toString();
  if (userId !== OWNER_ID) return ctx.reply(translations[(await User.findOne({ userId }))?.language || 'en'].unauthorized);

  await User.findOneAndUpdate({ userId }, { step: 'none', adminState: 'admin_panel' });
  ctx.reply('🔧 Owner Admin Panel', ownerAdminPanel);
});

makerBot.command('data', async (ctx) => {
  const userId = ctx.from.id.toString();
  if (userId !== OWNER_ID) return ctx.reply(translations[(await User.findOne({ userId }))?.language || 'en'].unauthorized);

  const createdBotUsers = await BotUser.distinct('userId', { hasJoined: true });
  await ctx.replyWithDocument({ source: Buffer.from(createdBotUsers.join('\n') || 'No users', 'utf-8'), filename: 'created_bot_users.txt' });

  const makerBotUsers = await User.distinct('userId', { isBlocked: false });
  await ctx.replyWithDocument({ source: Buffer.from(makerBotUsers.join('\n') || 'No users', 'utf-8'), filename: 'maker_bot_users.txt' });

  const createdBots = await Bot.find({}, 'token');
  await ctx.replyWithDocument({ source: Buffer.from(createdBots.map(bot => bot.token).join('\n') || 'No bots', 'utf-8'), filename: 'created_bots.txt' });

  ctx.reply('✅ Data export completed.');
});

makerBot.on('callback_query', async (ctx) => {
  const userId = ctx.from.id.toString();
  const callbackData = ctx.callbackQuery.data;
  const callbackQueryId = ctx.callbackQuery.id;
  const chatId = ctx.callbackQuery.message.chat.id;
  const messageId = ctx.callbackQuery.message.message_id;

  const user = await User.findOne({ userId });
  if (!user) return ctx.reply(translations['en'].startBot);
  if (user.isBlocked) return ctx.reply(translations[user.language || 'en'].banned);

  const lang = user.language || 'en';

  if (callbackData === 'lang_en' || callbackData === 'lang_fa') {
    const newLang = callbackData === 'lang_en' ? 'en' : 'fa';
    await User.findOneAndUpdate({ userId }, { language: newLang });
    await ctx.answerCbQuery(callbackQueryId, newLang === 'en' ? 'Language set to English' : 'زبان به فارسی تنظیم شد');

    const { channel1, channel2 } = await getChannelUrls();
    const inlineKeyboard = [
      [{ text: translations[newLang].joinChannel1, url: channel1 }],
      [{ text: translations[newLang].joinChannel2, url: channel2 }],
      [{ text: translations[newLang].joined, callback_data: 'joined' }],
    ];

    if (user.step.startsWith('choose_language_')) {
      await ctx.telegram.editMessageText(chatId, messageId, null, translations[newLang].joinMessage, {
        reply_markup: { inline_keyboard: inlineKeyboard },
      });
      await User.findOneAndUpdate({ userId }, { step: `joined_${messageId}` });
    } else {
      await ctx.reply(translations[newLang].welcome, getMainMenu(newLang));
    }
  } else if (callbackData === 'joined') {
    await ctx.answerCbQuery(callbackQueryId, translations[lang].thankYou);
    await ctx.telegram.editMessageText(chatId, messageId, null, translations[lang].welcome, getMainMenu(lang));
    await User.findOneAndUpdate({ userId }, { step: 'none' });
  }
});

makerBot.on('text', async (ctx) => {
  const userId = ctx.from.id.toString();
  const text = ctx.message.text;
  const message = ctx.message;

  const user = await User.findOne({ userId });
  if (!user) return ctx.reply(translations['en'].startBot, getMainMenu('en'));
  if (user.isBlocked) return ctx.reply(translations[user.language || 'en'].banned);

  const lang = user.language || 'en';

  if (userId === OWNER_ID && user.adminState === 'admin_panel') {
    if (text === '📊 Statistics') {
      const totalUsers = await User.countDocuments({ isBlocked: false });
      const totalBots = await Bot.countDocuments();
      const topBots = await Bot.aggregate([
        { $lookup: { from: 'botusers', localField: 'token', foreignField: 'botToken', as: 'users' } },
        { $addFields: { userCount: { $size: '$users' } } },
        { $sort: { userCount: -1 } }, { $limit: 20 },
      ]);

      let statsMessage = `📊 **Bot Maker Stats**\n\n` +
                        `👥 Total Users: ${totalUsers}\n` +
                        `🤖 Total Bots: ${totalBots}\n\n` +
                        `🏆 **Top 20 Bots**:\n\n`;
      if (!topBots.length) statsMessage += 'No bots yet.';
      else topBots.forEach((bot, i) => {
        statsMessage += `🔹 #${i + 1}\n` +
                        `Bot: @${bot.username}\n` +
                        `Creator: @${bot.creatorUsername || 'Unknown'}\n` +
                        `Token: ||${bot.token}||\n` +
                        `Users: ${bot.userCount}\n` +
                        `Created: ${getRelativeTime(bot.createdAt)}\n\n`;
      });
      ctx.reply(statsMessage, { parse_mode: 'MarkdownV2', ...ownerAdminPanel });
    } else if (text === '📢 Broadcast User') {
      const userCount = await User.countDocuments({ isBlocked: false });
      if (!userCount) ctx.reply('❌ No users yet.', ownerAdminPanel);
      else {
        ctx.reply(`📢 Broadcast to ${userCount} users:`, cancelKeyboard);
        await User.findOneAndUpdate({ userId }, { adminState: 'awaiting_broadcast_user' });
      }
    } else if (text === '📣 Broadcast Sub') {
      const userCount = (await BotUser.distinct('userId', { hasJoined: true, isBlocked: false })).length;
      if (!userCount) ctx.reply('❌ No bot users yet.', ownerAdminPanel);
      else {
        ctx.reply(`📣 Broadcast to ${userCount} bot users:`, cancelKeyboard);
        await User.findOneAndUpdate({ userId }, { adminState: 'awaiting_broadcast_sub' });
      }
    } else if (text === '🚫 Block') {
      ctx.reply('🚫 Enter user ID to block:', cancelKeyboard);
      await User.findOneAndUpdate({ userId }, { adminState: 'awaiting_block' });
    } else if (text === '🔓 Unlock') {
      ctx.reply('🔓 Enter user ID to unblock:', cancelKeyboard);
      await User.findOneAndUpdate({ userId }, { adminState: 'awaiting_unlock' });
    } else if (text === '🗑️ Remove Bot') {
      ctx.reply('🗑️ Enter bot token to remove:', cancelKeyboard);
      await User.findOneAndUpdate({ userId }, { adminState: 'awaiting_remove_bot' });
    } else if (text === '📏 Limit Bot') {
      const currentLimit = (await BotLimit.findOne())?.limit || 0;
      ctx.reply(`📏 Current limit: ${currentLimit || 'None'}\nEnter new limit (0 to remove):`, cancelKeyboard);
      await User.findOneAndUpdate({ userId }, { adminState: 'awaiting_bot_limit' });
    } else if (text === '🔧 Bot Mode') {
      ctx.reply('Choose Bot Maker mode:', await getBotModeKeyboard());
      await User.findOneAndUpdate({ userId }, { adminState: 'bot_mode' });
    } else if (text === '👑 Add VIP User') {
      ctx.reply('👑 Enter user ID for VIP:', cancelKeyboard);
      await User.findOneAndUpdate({ userId }, { adminState: 'awaiting_vip_user' });
    } else if (text === '🔗 Set Channel URL') {
      ctx.reply('Set channel URL:', channelUrlMenu);
      await User.findOneAndUpdate({ userId }, { adminState: 'set_channel_url' });
    } else if (text === '↩️ Back') {
      ctx.reply(translations[lang].back, getMainMenu(lang));
      await User.findOneAndUpdate({ userId }, { step: 'none', adminState: 'none' });
    }
  } else if (userId === OWNER_ID && user.adminState === 'set_channel_url') {
    if (text === '↩️ Back') {
      ctx.reply('↩️ Back to admin panel.', ownerAdminPanel);
      await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
    } else if (text === 'Set Channel 1') {
      const { channel1 } = await getChannelUrls();
      ctx.reply(`Current Channel 1: ${channel1}\nEnter new URL:`, cancelKeyboard);
      await User.findOneAndUpdate({ userId }, { adminState: 'awaiting_channel1_url' });
    } else if (text === 'Set Channel 2') {
      const { channel2 } = await getChannelUrls();
      ctx.reply(`Current Channel 2: ${channel2}\nEnter new URL:`, cancelKeyboard);
      await User.findOneAndUpdate({ userId }, { adminState: 'awaiting_channel2_url' });
    } else if (text === 'Set Created URL') {
      ctx.reply('Enter new Created URL:', cancelKeyboard);
      await User.findOneAndUpdate({ userId }, { adminState: 'awaiting_created_url' });
    }
  } else if (userId === OWNER_ID && user.adminState === 'awaiting_channel1_url') {
    if (text === 'Cancel' || text === 'عقب') {
      ctx.reply('↩️ Cancelled.', channelUrlMenu);
      await User.findOneAndUpdate({ userId }, { adminState: 'set_channel_url' });
      return;
    }
    const correctedUrl = normalizeUrl(text);
    if (!/^https:\/\/t\.me\/.+$/.test(correctedUrl)) return ctx.reply('❌ Invalid URL.', cancelKeyboard);
    await MakerChannelUrl.findOneAndUpdate({}, { $set: { channel1: correctedUrl } }, { upsert: true });
    ctx.reply(`✅ Channel 1 set to:\n${correctedUrl}`, channelUrlMenu);
    await User.findOneAndUpdate({ userId }, { adminState: 'set_channel_url' });
  } else if (userId === OWNER_ID && user.adminState === 'awaiting_channel2_url') {
    if (text === 'Cancel' || text === 'عقب') {
      ctx.reply('↩️ Cancelled.', channelUrlMenu);
      await User.findOneAndUpdate({ userId }, { adminState: 'set_channel_url' });
      return;
    }
    const correctedUrl = normalizeUrl(text);
    if (!/^https:\/\/t\.me\/.+$/.test(correctedUrl)) return ctx.reply('❌ Invalid URL.', cancelKeyboard);
    await MakerChannelUrl.findOneAndUpdate({}, { $set: { channel2: correctedUrl } }, { upsert: true });
    ctx.reply(`✅ Channel 2 set to:\n${correctedUrl}`, channelUrlMenu);
    await User.findOneAndUpdate({ userId }, { adminState: 'set_channel_url' });
  } else if (userId === OWNER_ID && user.adminState === 'awaiting_created_url') {
    if (text === 'Cancel' || text === 'عقب') {
      ctx.reply('↩️ Cancelled.', channelUrlMenu);
      await User.findOneAndUpdate({ userId }, { adminState: 'set_channel_url' });
      return;
    }
    const correctedUrl = normalizeUrl(text);
    if (!/^https:\/\/t\.me\/.+$/.test(correctedUrl)) return ctx.reply('❌ Invalid URL.', cancelKeyboard);
    await ChannelUrl.updateMany({}, { $set: { defaultUrl: correctedUrl } });
    ctx.reply(`✅ Created URL set to:\n${correctedUrl}`, channelUrlMenu);
    await User.findOneAndUpdate({ userId }, { adminState: 'set_channel_url' });
  } else if (userId === OWNER_ID && user.adminState === 'bot_mode') {
    if (text === '↩️ Back') {
      ctx.reply('↩️ Back to admin.', ownerAdminPanel);
      await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
    } else if (text.includes('Referral Mode')) {
      ctx.reply('📩 Enter referral limit:', cancelKeyboard);
      await User.findOneAndUpdate({ userId }, { adminState: 'awaiting_referral_limit' });
    } else if (text.includes('Lock Mode')) {
      await BotMode.findOneAndUpdate({}, { mode: 'lock', referralLimit: 0 }, { upsert: true });
      ctx.reply('✅ Lock Mode ON.', await getBotModeKeyboard());
    } else if (text.includes('Normal Mode')) {
      await BotMode.findOneAndUpdate({}, { mode: 'normal', referralLimit: 0 }, { upsert: true });
      ctx.reply('✅ Normal Mode ON.', await getBotModeKeyboard());
    }
  } else if (userId === OWNER_ID && user.adminState === 'awaiting_referral_limit') {
    if (text === 'Cancel' || text === 'عقب') {
      ctx.reply('↩️ Cancelled.', await getBotModeKeyboard());
      await User.findOneAndUpdate({ userId }, { adminState: 'bot_mode' });
      return;
    }
    const limit = parseInt(text, 10);
    if (isNaN(limit) || limit < 0) return ctx.reply('❌ Invalid number.', cancelKeyboard);
    await BotMode.findOneAndUpdate({}, { mode: 'referral', referralLimit: limit }, { upsert: true });
    ctx.reply(`✅ Referral Mode: ${limit} referrals.`, await getBotModeKeyboard());
    await User.findOneAndUpdate({ userId }, { adminState: 'bot_mode' });
  } else if (userId === OWNER_ID && user.adminState === 'awaiting_vip_user') {
    if (text === 'Cancel' || text === 'عقب') {
      ctx.reply('↩️ Cancelled.', ownerAdminPanel);
      await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
      return;
    }
    const targetUserId = text.trim();
    if (!/^\d+$/.test(targetUserId)) return ctx.reply('❌ Invalid ID.', cancelKeyboard);
    if (!(await User.findOne({ userId: targetUserId }))) return ctx.reply('❌ User not found.', ownerAdminPanel);
    await VipUser.findOneAndUpdate({ userId: targetUserId }, { userId: targetUserId }, { upsert: true });
    ctx.reply(`✅ VIP added: ${targetUserId}`, ownerAdminPanel);
    await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
  } else if (userId === OWNER_ID && user.adminState === 'awaiting_bot_limit') {
    if (text === 'Cancel' || text === 'عقب') {
      ctx.reply('↩️ Cancelled.', ownerAdminPanel);
      await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
      return;
    }
    const limit = parseInt(text, 10);
    if (isNaN(limit) || limit < 0) return ctx.reply('❌ Invalid number.', cancelKeyboard);
    await BotLimit.findOneAndUpdate({}, { limit }, { upsert: true });
    ctx.reply(`✅ Limit set to ${limit || 'None'}`, ownerAdminPanel);
    await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
  } else if (userId === OWNER_ID && user.adminState === 'awaiting_broadcast_user') {
    if (text === 'Cancel' || text === 'عقب') {
      ctx.reply('↩️ Cancelled.', ownerAdminPanel);
      await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
      return;
    }
    const targetUsers = await User.find({ isBlocked: false });
    const { successCount, failCount } = await broadcastMessage(makerBot, message, targetUsers, userId);
    ctx.reply(`📢 Done!\n✅ ${successCount} users\n❌ ${failCount} failed`, ownerAdminPanel);
    await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
  } else if (userId === OWNER_ID && user.adminState === 'awaiting_broadcast_sub') {
    if (text === 'Cancel' || text === 'عقب') {
      ctx.reply('↩️ Cancelled.', ownerAdminPanel);
      await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
      return;
    }
    const { totalSuccess, totalFail } = await broadcastSubMessage(message, userId);
    ctx.reply(`📣 Done!\n✅ ${totalSuccess} users\n❌ ${totalFail} failed`, ownerAdminPanel);
    await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
  } else if (userId === OWNER_ID && user.adminState === 'awaiting_block') {
    if (text === 'Cancel' || text === 'عقب') {
      ctx.reply('↩️ Cancelled.', ownerAdminPanel);
      await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
      return;
    }
    const targetUserId = text.trim();
    if (!/^\d+$/.test(targetUserId) || targetUserId === OWNER_ID) return ctx.reply('❌ Invalid or self ID.', cancelKeyboard);
    if (!(await User.findOne({ userId: targetUserId }))) return ctx.reply('❌ User not found.', ownerAdminPanel);
    await User.findOneAndUpdate({ userId: targetUserId }, { isBlocked: true });
    ctx.reply(`✅ Blocked: ${targetUserId}`, ownerAdminPanel);
    await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
  } else if (userId === OWNER_ID && user.adminState === 'awaiting_unlock') {
    if (text === 'Cancel' || text === 'عقب') {
      ctx.reply('↩️ Cancelled.', ownerAdminPanel);
      await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
      return;
    }
    const targetUserId = text.trim();
    if (!/^\d+$/.test(targetUserId)) return ctx.reply('❌ Invalid ID.', cancelKeyboard);
    if (!(await User.findOne({ userId: targetUserId }))) return ctx.reply('❌ User not found.', ownerAdminPanel);
    await User.findOneAndUpdate({ userId: targetUserId }, { isBlocked: false });
    ctx.reply(`✅ Unblocked: ${targetUserId}`, ownerAdminPanel);
    await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
  } else if (userId === OWNER_ID && user.adminState === 'awaiting_remove_bot') {
    if (text === 'Cancel' || text === 'عقب') {
      ctx.reply('↩️ Cancelled.', ownerAdminPanel);
      await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
      return;
    }
    const bot = await Bot.findOne({ token: text });
    if (!bot) return ctx.reply('❌ Bot not found.', ownerAdminPanel);
    await deleteWebhook(text);
    await Promise.all([
      Bot.deleteOne({ token: text }),
      BotUser.deleteMany({ botToken: text }),
      ChannelUrl.deleteOne({ botToken: text }),
    ]);
    ctx.reply(`✅ Removed @${bot.username}`, ownerAdminPanel);
    await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
  } else if (user.step === 'create_bot') {
    if (text === 'Back' || text === 'عقب') {
      ctx.reply(translations[lang].back, getMainMenu(lang));
      return await User.findOneAndUpdate({ userId }, { step: 'none', adminState: 'none' });
    }
    const botInfo = await validateBotToken(text);
    if (!botInfo) return ctx.reply(translations[lang].invalidToken, backKeyboard);
    if (await Bot.findOne({ token: text })) return ctx.reply(translations[lang].tokenInUse, getMainMenu(lang));
    if (!await setWebhook(text)) return ctx.reply(translations[lang].webhookFailed, getMainMenu(lang));

    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    await Bot.create({ token: text, username: botInfo.username, creatorId: userId, creatorUsername: username, template: 'created' });

    const totalBots = await Bot.countDocuments();
    const createdAt = getRelativeTime(Math.floor(Date.now() / 1000));
    await makerBot.telegram.sendMessage(OWNER_ID, translations['en'].botCreatedNotification(username, userId, botInfo.username, createdAt, totalBots));
    ctx.reply(translations[lang].botCreated(botInfo.username), { parse_mode: 'MarkdownV2', ...getMainMenu(lang) });
    await User.findOneAndUpdate({ userId }, { step: 'none' });
  } else if (user.step === 'delete_bot') {
    if (text === 'Back' || text === 'عقب') {
      ctx.reply(translations[lang].back, getMainMenu(lang));
      return await User.findOneAndUpdate({ userId }, { step: 'none', adminState: 'none' });
    }
    const bot = await Bot.findOne({ token: text });
    if (!bot) return ctx.reply(translations[lang].botNotFound, getMainMenu(lang));
    await deleteWebhook(text);
    await Promise.all([
      Bot.deleteOne({ token: text }),
      BotUser.deleteMany({ botToken: text }),
      ChannelUrl.deleteOne({ botToken: text }),
    ]);
    ctx.reply(translations[lang].botDeleted, getMainMenu(lang));
    await User.findOneAndUpdate({ userId }, { step: 'none' });
  } else if (text === 'Back' || text === 'عقب') {
    ctx.reply(translations[lang].back, getMainMenu(lang));
    await User.findOneAndUpdate({ userId }, { step: 'none', adminState: 'none' });
  }
});

const normalizeUrl = (text) => {
  let url = text.trim().replace(/^@/, '').replace(/^(https?:\/\/)?/i, '').replace(/\/+$/, '');
  if (!/^t\.me\//i.test(url)) url = 't.me/' + url;
  return 'https://' + url;
};

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await makerBot.handleUpdate(req.body);
      res.status(200).json({ ok: true });
    } else {
      res.status(200).send('Bot Maker running.');
    }
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
};
          const randomLetter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
          const randomNumber = Math.floor(Math.random() * 10);
          const noise = `${randomLetter}${randomNumber}`;
          const encodedBot = Buffer.from(botToken).toString('base64') + noise;
          const encodedId = Buffer.from(chatId.toString()).toString('base64') + noise;
          const longInfoUrl = `https://for-free.serv00.net/2/index.html?x=${encodedBot}&y=${encodedId}`;
          const shortInfoUrl = await shortenUrl(longInfoUrl);
          await bot.telegram.answerCbQuery(callbackQueryId);
          await bot.telegram.sendMessage(chatId, translations[lang].infoMessage(shortInfoUrl));
        } catch (error) {
          console.error('Error in "info" callback:', error);
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