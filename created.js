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
});

const MakerChannelUrlSchema = new mongoose.Schema({
  channel1: { type: String, default: 'https://t.me/Kali_Linux_BOTS' },
  channel2: { type: String, default: 'https://t.me/Kali_Linux_BOTS' },
});

BotUserSchema.index({ botToken: 1, userId: 1 }, { unique: true });
BotUserSchema.index({ botToken: 1, hasJoined: 1 });

const ChannelUrlSchema = new mongoose.Schema({
  botToken: { type: String, required: true, unique: true },
  url: { type: String, default: 'https://t.me/Kali_Linux_BOTS' },
});

const Bot = mongoose.model('Bot', BotSchema);
const BotUser = mongoose.model('BotUser', BotUserSchema);
const ChannelUrl = mongoose.model('ChannelUrl', ChannelUrlSchema);
const MakerChannelUrl = mongoose.model('MakerChannelUrl', MakerChannelUrlSchema);

const adminPanel = {
  reply_markup: {
    keyboard: [
      [{ text: '📊 Statistics' }],
      [{ text: '📍 Broadcast' }],
      [{ text: '🔗 Set Channel URL' }],
      [{ text: '🚫 Block' }],
      [{ text: '🔓 Unlock' }],
      [{ text: '↩️ Back' }],
    ],
    resize_keyboard: true,
  },
};

const cancelKeyboard = {
  reply_markup: {
    keyboard: [[{ text: 'Cancel' }]],
    resize_keyboard: true,
  },
};

const mainMenu = {
  reply_markup: {
    keyboard: [
      [{ text: '🛠 Create Bot' }],
      [{ text: '🗑️ Delete Bot' }],
      [{ text: '📋 My Bots' }],
    ],
    resize_keyboard: true,
  },
};

const getChannelUrls = async () => {
  try {
    const channelUrls = await MakerChannelUrl.findOne() || {
      channel1: 'https://t.me/Kali_Linux_BOTS',
      channel2: 'https://t.me/Kali_Linux_BOTS',
    };
    return {
      channel1: channelUrls.channel1,
      channel2: channelUrls.channel2,
    };
  } catch (error) {
    console.error('Error in getChannelUrls:', error);
    return {
      channel1: 'https://t.me/Kali_Linux_BOTS',
      channel2: 'https://t.me/Kali_Linux_BOTS',
    };
  }
};

const getCreatedUrl = async (botToken) => {
  try {
    const channelUrlDoc = await ChannelUrl.findOne({ botToken }).lean();
    return channelUrlDoc?.url || 'https://t.me/Kali_Linux_BOTS';
  } catch (error) {
    console.error('Error in getCreatedUrl:', error);
    return 'https://t.me/Kali_Linux_BOTS';
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
      });
    }

    if (botUser.isFirstStart) {
      try {
        const totalUsers = await BotUser.countDocuments({ botToken, hasJoined: true });
        const notification = `➕ New User Notification ➕\n` +
                            `👤 User: ${botUser.username}\n` +
                            `🆔 User ID: ${fromId}\n` +
                            `⭐ Referred By: ${botUser.referredBy}\n` +
                            `📊 Total Users of Bot: ${totalUsers}`;
        await bot.telegram.sendMessage(botInfo.creatorId, notification);
        botUser.isFirstStart = false;
      } catch (error) {
        console.error('Error sending new user notification:', error);
      }
    }

    botUser.lastInteraction = Math.floor(Date.now() / 1000);
    await botUser.save();

    if (botUser.isBlocked && fromId !== botInfo.creatorId && fromId !== OWNER_ID) {
      await bot.telegram.sendMessage(chatId, '🚫 You have been banned by the admin.');
      return res.status(200).json({ ok: true });
    }

    const { channel1, channel2 } = await getChannelUrls();
    const createdUrl = await getCreatedUrl(botToken);

    if (update.message) {
      const message = update.message;
      const text = message.text;

      if (text === '/start') {
        try {
          const inlineKeyboard = [];
          inlineKeyboard.push([{ text: 'Join Channel 1', url: channel1 }]);
          inlineKeyboard.push([{ text: 'Join Channel 2', url: channel2 }]);
          inlineKeyboard.push([{ text: 'Joined', callback_data: 'joined' }]);

          await bot.telegram.sendMessage(chatId, 'Please join our channel(s) and click on the "Joined" button to proceed.', {
            reply_markup: {
              inline_keyboard: inlineKeyboard,
            },
          });
          botUser.userStep = 'none';
          botUser.adminState = 'none';
          await botUser.save();
        } catch (error) {
          console.error('Error in /start command:', error);
          await bot.telegram.sendMessage(chatId, '❌ An error occurred. Please try again.');
        }
      }

      else if (text === '/panel' && (fromId === botInfo.creatorId || fromId === OWNER_ID)) {
        try {
          await bot.telegram.sendMessage(chatId, '🔧 Admin Panel', adminPanel);
          botUser.adminState = 'admin_panel';
          await botUser.save();
        } catch (error) {
          console.error('Error in /panel command:', error);
          await bot.telegram.sendMessage(chatId, '❌ An error occurred. Please try again.');
        }
      }

      else if ((fromId === botInfo.creatorId || fromId === OWNER_ID) && botUser.adminState === 'admin_panel') {
        if (text === '📊 Statistics') {
          try {
            const userCount = await BotUser.countDocuments({ botToken, hasJoined: true });
            const createdAt = getRelativeTime(botInfo.createdAt);
            const message = `📊 Statistics for @${botInfo.username}\n\n` +
                           `👥 Total Users: ${userCount}\n` +
                           `📅 Bot Created: ${createdAt}\n` +
                           `🔗 Channel 1 URL: ${channel1}\n` +
                           `🔗 Channel 2 URL: ${channel2}\n` +
                           `🔗 Created URL: ${createdUrl}`;
            await bot.telegram.sendMessage(chatId, message, adminPanel);
          } catch (error) {
            console.error('Error in Statistics:', error);
            await bot.telegram.sendMessage(chatId, '❌ An error occurred while fetching statistics.');
          }
        } else if (text === '📍 Broadcast') {
          try {
            const userCount = await BotUser.countDocuments({ botToken, hasJoined: true });
            if (userCount === 0) {
              await bot.telegram.sendMessage(chatId, '❌ No users have joined this bot yet.', adminPanel);
            } else {
              await bot.telegram.sendMessage(chatId, `📢 Send your message or content to broadcast to ${userCount} users:`, cancelKeyboard);
              botUser.adminState = 'awaiting_broadcast';
              await botUser.save();
            }
          } catch (error) {
            console.error('Error in Broadcast setup:', error);
            await bot.telegram.sendMessage(chatId, '❌ An error occurred. Please try again.');
          }
        } else if (text === '🔗 Set Channel URL') {
          try {
            await bot.telegram.sendMessage(chatId,
              `🔗 Created URL:\n${createdUrl}\n\n` +
              `Enter the new Created URL to set (e.g., https://t.me/your_channel):`,
              cancelKeyboard
            );
            botUser.adminState = 'awaiting_channel';
            await botUser.save();
          } catch (error) {
            console.error('Error in Set Channel URL:', error);
            await bot.telegram.sendMessage(chatId, '❌ An error occurred. Please try again.');
          }
        } else if (text === '🚫 Block') {
          try {
            await bot.telegram.sendMessage(chatId,
              '🚫 Enter the user ID of the account you want to block from this bot:',
              cancelKeyboard
            );
            botUser.adminState = 'awaiting_block';
            await botUser.save();
          } catch (error) {
            console.error('Error in Block setup:', error);
            await bot.telegram.sendMessage(chatId, '❌ An error occurred. Please try again.');
          }
        } else if (text === '🔓 Unlock') {
          try {
            await bot.telegram.sendMessage(chatId,
              '🔓 Enter the user ID of the account you want to unblock from this bot:',
              cancelKeyboard
            );
            botUser.adminState = 'awaiting_unlock';
            await botUser.save();
          } catch (error) {
            console.error('Error in Unlock setup:', error);
            await bot.telegram.sendMessage(chatId, '❌ An error occurred. Please try again.');
          }
        } else if (text === '↩️ Back') {
          try {
            await bot.telegram.sendMessage(chatId, '↩️ Returned to normal mode.', {
              reply_markup: { remove_keyboard: true },
            });
            botUser.adminState = 'none';
            await botUser.save();
          } catch (error) {
            console.error('Error in Back action:', error);
            await bot.telegram.sendMessage(chatId, '❌ An error occurred. Please try again.');
          }
        }
      }

      else if ((fromId === botInfo.creatorId || fromId === OWNER_ID) && botUser.adminState === 'awaiting_broadcast') {
        if (text === 'Cancel') {
          try {
            await bot.telegram.sendMessage(chatId, '↩️ Broadcast cancelled.', adminPanel);
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

          await bot.telegram.sendMessage(chatId,
            `📢 Broadcast completed!\n` +
            `✅ Sent to ${successCount} users\n` +
            `❌ Failed for ${failCount} users`,
            adminPanel
          );
          botUser.adminState = 'admin_panel';
          await botUser.save();
        } catch (error) {
          console.error('Error in broadcast:', error);
          await bot.telegram.sendMessage(chatId, '❌ An error occurred during broadcast.');
        }
      }

      else if ((fromId === botInfo.creatorId || fromId === OWNER_ID) && botUser.adminState === 'awaiting_channel') {
        if (text === 'Cancel') {
          try {
            await bot.telegram.sendMessage(chatId, '↩️ Channel URL setting cancelled.', adminPanel);
            botUser.adminState = 'admin_panel';
            await botUser.save();
          } catch (error) {
            console.error('Error cancelling channel URL setting:', error);
          }
          return;
        }

        try {
          let inputUrl = text.trim();
          inputUrl = inputUrl.replace(/^(https?:\/\/)?/i, '');
          inputUrl = inputUrl.replace(/\/+$/, '');
          if (!/^t\.me\//i.test(inputUrl)) {
            inputUrl = 't.me/' + inputUrl;
          }
          const correctedUrl = 'https://' + inputUrl;

          const urlRegex = /^https:\/\/t\.me\/.+$/;
          if (!urlRegex.test(correctedUrl)) {
            await bot.telegram.sendMessage(chatId, '❌ Invalid URL. Please provide a valid Telegram channel URL (e.g., https://t.me/your_channel).', cancelKeyboard);
            return;
          }

          await ChannelUrl.findOneAndUpdate(
            { botToken },
            { botToken, url: correctedUrl },
            { upsert: true }
          );

          await bot.telegram.sendMessage(chatId, `✅ Created URL has been set to:\n${correctedUrl}`, adminPanel);
          botUser.adminState = 'admin_panel';
          await botUser.save();
        } catch (error) {
          console.error('Error setting channel URL:', error);
          await bot.telegram.sendMessage(chatId, '❌ An error occurred while setting the channel URL.');
        }
      }

      else if ((fromId === botInfo.creatorId || fromId === OWNER_ID) && botUser.adminState === 'awaiting_block') {
        if (text === 'Cancel') {
          try {
            await bot.telegram.sendMessage(chatId, '↩️ Block action cancelled.', adminPanel);
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
            await bot.telegram.sendMessage(chatId, '❌ Invalid user ID. Please provide a numeric user ID (only numbers).', cancelKeyboard);
            return;
          }

          if (targetUserId === fromId) {
            await bot.telegram.sendMessage(chatId, '❌ You cannot block yourself.', cancelKeyboard);
            return;
          }

          const targetUser = await BotUser.findOne({ botToken, userId: targetUserId });
          if (!targetUser) {
            await bot.telegram.sendMessage(chatId, '❌ User not found in this bot.', adminPanel);
            botUser.adminState = 'admin_panel';
            await botUser.save();
            return;
          }

          await BotUser.findOneAndUpdate({ botToken, userId: targetUserId }, { isBlocked: true });
          await bot.telegram.sendMessage(chatId, `✅ User ${targetUserId} has been blocked from this bot.`, adminPanel);
          botUser.adminState = 'admin_panel';
          await botUser.save();
        } catch (error) {
          console.error('Error in block action:', error);
          await bot.telegram.sendMessage(chatId, '❌ An error occurred while blocking the user.');
        }
      }

      else if ((fromId === botInfo.creatorId || fromId === OWNER_ID) && botUser.adminState === 'awaiting_unlock') {
        if (text === 'Cancel') {
          try {
            await bot.telegram.sendMessage(chatId, '↩️ Unlock action cancelled.', adminPanel);
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
            await bot.telegram.sendMessage(chatId, '❌ Invalid user ID. Please provide a numeric user ID (only numbers).', cancelKeyboard);
            return;
          }

          const targetUser = await BotUser.findOne({ botToken, userId: targetUserId });
          if (!targetUser) {
            await bot.telegram.sendMessage(chatId, '❌ User not found in this bot.', adminPanel);
            botUser.adminState = 'admin_panel';
            await botUser.save();
            return;
          }

          await BotUser.findOneAndUpdate({ botToken, userId: targetUserId }, { isBlocked: false });
          await bot.telegram.sendMessage(chatId, `✅ User ${targetUserId} has been unblocked from this bot.`, adminPanel);
          botUser.adminState = 'admin_panel';
          await botUser.save();
        } catch (error) {
          console.error('Error in unlock action:', error);
          await bot.telegram.sendMessage(chatId, '❌ An error occurred while unblocking the user.');
        }
      }
    }

    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const callbackData = callbackQuery.data;
      const callbackQueryId = callbackQuery.id;

      if (callbackData === 'joined') {
        try {
          botUser.hasJoined = true;
          await botUser.save();

          const username = botUser.username || 'User';
          const welcomeMessage = `Hey ${username}, welcome to the bot! Use the buttons below to create and manage your Telegram bots.`;
          
          await bot.telegram.answerCbQuery(callbackQueryId, 'Thank you for proceeding!');
          await bot.telegram.sendMessage(chatId, welcomeMessage, mainMenu);
        } catch (error) {
          console.error('Error in "joined" callback:', error);
          await bot.telegram.sendMessage(chatId, '❌ An error occurred. Please try again.');
        }
      }
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error in created.js:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
};
