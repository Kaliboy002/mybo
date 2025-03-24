const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
const axios = require('axios');

const MAKER_BOT_TOKEN = process.env.MAKER_BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const OWNER_ID = process.env.OWNER_ID;

if (!MAKER_BOT_TOKEN || !MONGO_URI || !OWNER_ID) {
  console.error('Missing environment variables: MAKER_BOT_TOKEN, MONGO_URI, or OWNER_ID');
  process.exit(1);
}

const makerBot = new Telegraf(MAKER_BOT_TOKEN);

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    console.log('Database name:', mongoose.connection.db.databaseName);
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// MongoDB Schemas
const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  step: { type: String, default: 'none' },
  adminState: { type: String, default: 'none' },
  isBlocked: { type: Boolean, default: false },
  username: { type: String },
  referredBy: { type: String, default: 'None' },
  isFirstStart: { type: Boolean, default: true },
  referralCount: { type: Number, default: 0 }, // Track number of successful referrals
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
  url: { type: String, default: 'https://t.me/Kali_Linux_BOTS' },
});

const BotLimitSchema = new mongoose.Schema({
  limit: { type: Number, default: 0 },
});

const BotModeSchema = new mongoose.Schema({
  mode: { type: String, default: 'normal' }, // 'normal', 'referral', 'lock'
  referralLimit: { type: Number, default: 0 }, // Required referrals in referral mode
});

const VipUserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
});

const User = mongoose.model('User', UserSchema);
const Bot = mongoose.model('Bot', BotSchema);
const BotUser = mongoose.model('BotUser', BotUserSchema);
const ChannelUrl = mongoose.model('ChannelUrl', ChannelUrlSchema);
const BotLimit = mongoose.model('BotLimit', BotLimitSchema);
const BotMode = mongoose.model('BotMode', BotModeSchema);
const VipUser = mongoose.model('VipUser', VipUserSchema);

// Keyboards
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

const ownerAdminPanel = {
  reply_markup: {
    keyboard: [
      [{ text: '📊 Statistics' }],
      [{ text: '📢 Broadcast User' }],
      [{ text: '📣 Broadcast Sub' }],
      [{ text: '🚫 Block' }],
      [{ text: '🔓 Unlock' }],
      [{ text: '🗑️ Remove Bot' }],
      [{ text: '📏 Limit Bot' }],
      [{ text: '🔧 Bot Mode' }], // New button
      [{ text: '👑 Add VIP User' }], // New button
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

const backKeyboard = {
  reply_markup: {
    keyboard: [[{ text: 'Back' }]],
    resize_keyboard: true,
  },
};

// Helper Functions
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

const validateBotToken = async (token) => {
  try {
    const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
    return response.data.ok ? response.data.result : null;
  } catch (error) {
    console.error('Error validating bot token:', error.message);
    return null;
  }
};

const setWebhook = async (token, template = 'created') => {
  const webhookUrl = `https://mybot-drab.vercel.app/${template}?token=${encodeURIComponent(token)}`;
  try {
    const response = await axios.get(`https://api.telegram.org/bot${token}/setWebhook`, {
      params: { url: webhookUrl },
    });
    return response.data.ok;
  } catch (error) {
    console.error('Error setting webhook:', error.message);
    return false;
  }
};

const deleteWebhook = async (token) => {
  try {
    const response = await axios.get(`https://api.telegram.org/bot${token}/deleteWebhook`);
    return response.data.ok;
  } catch (error) {
    console.error('Error deleting webhook:', error.message);
    return false;
  }
};

const botInstances = new Map();

const getBotInstance = (botToken) => {
  if (!botInstances.has(botToken)) {
    const bot = new Telegraf(botToken);
    botInstances.set(botToken, bot);
  }
  return botInstances.get(botToken);
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
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Broadcast failed for user ${targetUser.userId}:`, error.message);
      failCount++;
    }
  }

  return { successCount, failCount };
};

const broadcastSubMessage = async (message, adminId) => {
  let totalSuccess = 0;
  let totalFail = 0;

  const bots = await Bot.aggregate([
    {
      $lookup: {
        from: 'botusers',
        localField: 'token',
        foreignField: 'botToken',
        as: 'users',
      },
    },
    {
      $addFields: {
        userCount: { $size: '$users' },
      },
    },
    { $sort: { userCount: -1 } },
  ]);

  const broadcastedUsers = new Set();

  for (const botInfo of bots) {
    const botToken = botInfo.token;
    const bot = getBotInstance(botToken);
    const userIds = await BotUser.distinct('userId', { botToken, hasJoined: true, isBlocked: false });
    const targetUsers = userIds.map(userId => ({ userId }));

    if (targetUsers.length === 0) continue;

    const usersToBroadcast = targetUsers.filter(user => !broadcastedUsers.has(user.userId));
    if (usersToBroadcast.length === 0) continue;

    const { successCount, failCount } = await broadcastMessage(bot, message, usersToBroadcast, adminId);
    totalSuccess += successCount;
    totalFail += failCount;

    usersToBroadcast.forEach(user => broadcastedUsers.add(user.userId));
    await new Promise(resolve => setTimeout(resolve, 1000));
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

  if (diff < 60) return `${dateStr}, ${diff} seconds ago`;
  if (diff < 3600) return `${dateStr}, ${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${dateStr}, ${Math.floor(diff / 3600)} hours ago`;
  return `${dateStr}, ${Math.floor(diff / 86400)} days ago`;
};

// /start Command
makerBot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  try {
    let user = await User.findOne({ userId });
    if (user && user.isBlocked) {
      ctx.reply('🚫 You have been banned by the admin.');
      return;
    }

    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    const referredBy = ctx.message.text.split(' ')[1] || 'None';

    if (!user) {
      user = await User.create({
        userId,
        step: 'none',
        adminState: 'none',
        isBlocked: false,
        username,
        referredBy,
        isFirstStart: true,
        referralCount: 0,
      });

      // Increment referral count for the referrer if referredBy is a user ID
      if (referredBy !== 'None' && /^\d+$/.test(referredBy)) {
        const referrer = await User.findOne({ userId: referredBy });
        if (referrer) {
          referrer.referralCount = (referrer.referralCount || 0) + 1;
          await referrer.save();
        }
      }
    }

    if (user.isFirstStart) {
      const totalUsers = await User.countDocuments({ isBlocked: false });
      const notification = `➕ New User Notification ➕\n` +
                          `👤 User: ${username}\n` +
                          `🆔 User ID: ${userId}\n` +
                          `⭐ Referred By: ${referredBy}\n` +
                          `📊 Total Users of Bot Maker: ${totalUsers}`;
      await makerBot.telegram.sendMessage(OWNER_ID, notification);

      user.isFirstStart = false;
      await user.save();
    }

    ctx.reply('Welcome to Bot Maker! Use the buttons below to create and manage your Telegram bots.', mainMenu);
  } catch (error) {
    console.error('Error in /start:', error);
    ctx.reply('❌ An error occurred. Please try again.');
  }
});

// Create Bot
makerBot.hears('🛠 Create Bot', async (ctx) => {
  const userId = ctx.from.id.toString();
  try {
    const user = await User.findOne({ userId });
    if (user && user.isBlocked) {
      ctx.reply('🚫 You have been banned by the admin.');
      return;
    }

    // Check if user is a VIP
    const isVip = await VipUser.findOne({ userId });
    if (isVip) {
      // VIP users can create bots regardless of mode
      const botLimitDoc = await BotLimit.findOne();
      const botLimit = botLimitDoc ? botLimitDoc.limit : 0;
      const userBotCount = await Bot.countDocuments({ creatorId: userId });

      if (botLimit > 0 && userBotCount >= botLimit) {
        ctx.reply(`❌ You can only create ${botLimit} bots.`, mainMenu);
        return;
      }

      ctx.reply('Send your bot token from @BotFather to make your bot:', backKeyboard);
      await User.findOneAndUpdate({ userId }, { step: 'create_bot' });
      return;
    }

    // Check bot mode
    const botMode = await BotMode.findOne() || { mode: 'normal', referralLimit: 0 };

    if (botMode.mode === 'lock') {
      ctx.reply('❌ You can\'t make bot. To make bot you can contact the owner of bot @Kaliboy002', mainMenu);
      return;
    }

    if (botMode.mode === 'referral') {
      const requiredReferrals = botMode.referralLimit || 0;
      const userReferrals = user.referralCount || 0;

      if (userReferrals < requiredReferrals) {
        const botLink = `https://t.me/${(await makerBot.telegram.getMe()).username}?start=${userId}`;
        ctx.reply(
          `❌ You don't have enough invites to make a bot. Please invite (${requiredReferrals}) others to start and join bot to unlock it.\n` +
          `Your total invite = ${userReferrals}\n` +
          `Your invite link = ${botLink}`,
          mainMenu
        );
        return;
      }
    }

    // Normal mode or passed referral check
    const botLimitDoc = await BotLimit.findOne();
    const botLimit = botLimitDoc ? botLimitDoc.limit : 0;
    const userBotCount = await Bot.countDocuments({ creatorId: userId });

    if (botLimit > 0 && userBotCount >= botLimit) {
      ctx.reply(`❌ You can only create ${botLimit} bots.`, mainMenu);
      return;
    }

    ctx.reply('Send your bot token from @BotFather to make your bot:', backKeyboard);
    await User.findOneAndUpdate({ userId }, { step: 'create_bot' });
  } catch (error) {
    console.error('Error in Create Bot:', error);
    ctx.reply('❌ An error occurred. Please try again.', mainMenu);
  }
});

// Delete Bot
makerBot.hears('🗑️ Delete Bot', async (ctx) => {
  const userId = ctx.from.id.toString();
  try {
    const user = await User.findOne({ userId });
    if (user && user.isBlocked) {
      ctx.reply('🚫 You have been banned by the admin.');
      return;
    }

    ctx.reply('Send your created bot token you want to delete:', backKeyboard);
    await User.findOneAndUpdate({ userId }, { step: 'delete_bot' });
  } catch (error) {
    console.error('Error in Delete Bot:', error);
    ctx.reply('❌ An error occurred. Please try again.', mainMenu);
  }
});

// List My Bots
makerBot.hears('📋 My Bots', async (ctx) => {
  const userId = ctx.from.id.toString();
  try {
    const user = await User.findOne({ userId });
    if (user && user.isBlocked) {
      ctx.reply('🚫 You have been banned by the admin.');
      return;
    }

    const userBots = await Bot.find({ creatorId: userId });
    let message = '📋 Your Bots:\n\n';
    if (userBots.length === 0) {
      message += 'You have not created any bots yet.';
    } else {
      userBots.forEach((bot) => {
        const createdAt = getRelativeTime(bot.createdAt);
        message += `🤖 @${bot.username}\nCreated: ${createdAt}\nTemplate: ${bot.template}\n\n`;
      });
    }
    ctx.reply(message, mainMenu);
  } catch (error) {
    console.error('Error in My Bots:', error);
    ctx.reply('❌ An error occurred. Please try again.', mainMenu);
  }
});

// /panel Command (Owner Only)
makerBot.command('panel', async (ctx) => {
  const userId = ctx.from.id.toString();
  if (userId !== OWNER_ID) {
    ctx.reply('❌ You are not authorized to use this command.');
    return;
  }

  try {
    await User.findOneAndUpdate({ userId }, { step: 'none', adminState: 'admin_panel' });
    ctx.reply('🔧 Owner Admin Panel', ownerAdminPanel);
  } catch (error) {
    console.error('Error in /panel:', error);
    ctx.reply('❌ An error occurred. Please try again.', mainMenu);
  }
});

// Handle Text Input
makerBot.on('text', async (ctx) => {
  const userId = ctx.from.id.toString();
  const text = ctx.message.text;
  const message = ctx.message;

  try {
    const user = await User.findOne({ userId });
    if (!user) {
      ctx.reply('Please start the bot with /start.', mainMenu);
      return;
    }

    if (user.isBlocked) {
      ctx.reply('🚫 You have been banned by the admin.');
      return;
    }

    if (userId === OWNER_ID && user.adminState === 'admin_panel') {
      if (text === '📊 Statistics') {
        const totalUsers = await User.countDocuments({ isBlocked: false });
        const totalBots = await Bot.countDocuments();
        const topBots = await Bot.aggregate([
          {
            $lookup: {
              from: 'botusers',
              localField: 'token',
              foreignField: 'botToken',
              as: 'users',
            },
          },
          {
            $addFields: {
              userCount: { $size: '$users' },
            },
          },
          { $sort: { userCount: -1 } },
          { $limit: 20 },
        ]);

        let statsMessage = `📊 Bot Maker Statistics\n\n` +
                          `👥 Total Users: ${totalUsers}\n` +
                          `🤖 Total Bots Created: ${totalBots}\n\n` +
                          `🏆 Top 20 Bots by User Count:\n\n`;

        if (topBots.length === 0) {
          statsMessage += 'No bots created yet.';
        } else {
          topBots.forEach((bot, index) => {
            const createdAt = getRelativeTime(bot.createdAt);
            statsMessage += `🔹 #${index + 1}\n` +
                           `Bot: @${bot.username}\n` +
                           `Creator: @${bot.creatorUsername || 'Unknown'}\n` +
                           `Token: ${bot.token}\n` +
                           `Template: ${bot.template}\n` +
                           `Users: ${bot.userCount}\n` +
                           `Created: ${createdAt}\n\n`;
          });
        }

        ctx.reply(statsMessage, ownerAdminPanel);
      } else if (text === '📢 Broadcast User') {
        const userCount = await User.countDocuments({ isBlocked: false });
        if (userCount === 0) {
          ctx.reply('❌ No users have joined Bot Maker yet.', ownerAdminPanel);
        } else {
          ctx.reply(`📢 Send your message or content to broadcast to ${userCount} Bot Maker users:`, cancelKeyboard);
          await User.findOneAndUpdate({ userId }, { adminState: 'awaiting_broadcast_user' });
        }
      } else if (text === '📣 Broadcast Sub') {
        const allBotUsers = await BotUser.find({ hasJoined: true, isBlocked: false }).distinct('userId');
        const userCount = allBotUsers.length;
        if (userCount === 0) {
          ctx.reply('❌ No users have joined any created bots yet.', ownerAdminPanel);
        } else {
          ctx.reply(`📣 Send your message or content to broadcast to ${userCount} users of created bots:`, cancelKeyboard);
          await User.findOneAndUpdate({ userId }, { adminState: 'awaiting_broadcast_sub' });
        }
      } else if (text === '🚫 Block') {
        ctx.reply('🚫 Enter the user ID of the account you want to block from Bot Maker:', cancelKeyboard);
        await User.findOneAndUpdate({ userId }, { adminState: 'awaiting_block' });
      } else if (text === '🔓 Unlock') {
        ctx.reply('🔓 Enter the user ID of the account you want to unblock from Bot Maker:', cancelKeyboard);
        await User.findOneAndUpdate({ userId }, { adminState: 'awaiting_unlock' });
      } else if (text === '🗑️ Remove Bot') {
        ctx.reply('🗑️ Enter the bot token of the bot you want to remove from Bot Maker:', cancelKeyboard);
        await User.findOneAndUpdate({ userId }, { adminState: 'awaiting_remove_bot' });
      } else if (text === '📏 Limit Bot') {
        const botLimitDoc = await BotLimit.findOne();
        const currentLimit = botLimitDoc ? botLimitDoc.limit : 0;
        ctx.reply(
          `📏 Current bot creation limit per user: ${currentLimit === 0 ? 'No limit' : currentLimit}\n` +
          `Enter the new bot creation limit (a number, e.g., 3). Enter 0 to remove the limit:`,
          cancelKeyboard
        );
        await User.findOneAndUpdate({ userId }, { adminState: 'awaiting_bot_limit' });
      } else if (text === '🔧 Bot Mode') {
        ctx.reply('Choose the mode of Bot Maker from below buttons:', await getBotModeKeyboard());
        await User.findOneAndUpdate({ userId }, { adminState: 'bot_mode' });
      } else if (text === '👑 Add VIP User') {
        ctx.reply('👑 Enter the user ID of the account you want to add as a VIP user (exempt from mode restrictions):', cancelKeyboard);
        await User.findOneAndUpdate({ userId }, { adminState: 'awaiting_vip_user' });
      } else if (text === '↩️ Back') {
        ctx.reply('↩️ Back to main menu.', mainMenu);
        await User.findOneAndUpdate({ userId }, { step: 'none', adminState: 'none' });
      }
    }

    else if (userId === OWNER_ID && user.adminState === 'bot_mode') {
      if (text === '↩️ Back') {
        ctx.reply('↩️ Back to admin panel.', ownerAdminPanel);
        await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
        return;
      }

      if (text.includes('Referral Mode')) {
        ctx.reply('📩 Enter the number of referrals required to unlock bot creation (e.g., 3):', cancelKeyboard);
        await User.findOneAndUpdate({ userId }, { adminState: 'awaiting_referral_limit' });
      } else if (text.includes('Lock Mode')) {
        await BotMode.findOneAndUpdate({}, { mode: 'lock', referralLimit: 0 }, { upsert: true });
        ctx.reply('✅ Lock Mode activated. Users cannot create bots (except VIP users).', await getBotModeKeyboard());
      } else if (text.includes('Normal Mode')) {
        await BotMode.findOneAndUpdate({}, { mode: 'normal', referralLimit: 0 }, { upsert: true });
        ctx.reply('✅ Normal Mode activated. Users can create bots without restrictions.', await getBotModeKeyboard());
      }
    }

    else if (userId === OWNER_ID && user.adminState === 'awaiting_referral_limit') {
      if (text === 'Cancel') {
        ctx.reply('↩️ Referral mode setting cancelled.', await getBotModeKeyboard());
        await User.findOneAndUpdate({ userId }, { adminState: 'bot_mode' });
        return;
      }

      const limit = parseInt(text.trim(), 10);
      if (isNaN(limit) || limit < 0) {
        ctx.reply('❌ Invalid number. Please enter a valid number (e.g., 3):', cancelKeyboard);
        return;
      }

      await BotMode.findOneAndUpdate({}, { mode: 'referral', referralLimit: limit }, { upsert: true });
      ctx.reply(`✅ Referral Mode activated. Users need ${limit} referrals to create bots.`, await getBotModeKeyboard());
      await User.findOneAndUpdate({ userId }, { adminState: 'bot_mode' });
    }

    else if (userId === OWNER_ID && user.adminState === 'awaiting_vip_user') {
      if (text === 'Cancel') {
        ctx.reply('↩️ Add VIP user action cancelled.', ownerAdminPanel);
        await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
        return;
      }

      const targetUserId = text.trim();
      if (!/^\d+$/.test(targetUserId)) {
        ctx.reply('❌ Invalid user ID. Please provide a numeric user ID (only numbers).', cancelKeyboard);
        return;
      }

      const targetUser = await User.findOne({ userId: targetUserId });
      if (!targetUser) {
        ctx.reply('❌ User not found.', ownerAdminPanel);
        await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
        return;
      }

      await VipUser.findOneAndUpdate({ userId: targetUserId }, { userId: targetUserId }, { upsert: true });
      ctx.reply(`✅ User ${targetUserId} has been added as a VIP user.`, ownerAdminPanel);
      await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
    }

    else if (userId === OWNER_ID && user.adminState === 'awaiting_bot_limit') {
      if (text === 'Cancel') {
        ctx.reply('↩️ Bot limit setting cancelled.', ownerAdminPanel);
        await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
        return;
      }

      const limit = parseInt(text.trim(), 10);
      if (isNaN(limit) || limit < 0) {
        ctx.reply('❌ Invalid number. Please enter a valid number (e.g., 3) or 0 to remove the limit:', cancelKeyboard);
        return;
      }

      await BotLimit.findOneAndUpdate({}, { limit }, { upsert: true });
      ctx.reply(
        `✅ Bot creation limit set to ${limit === 0 ? 'No limit' : limit} bots per user.`,
        ownerAdminPanel
      );
      await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
    }

    else if (userId === OWNER_ID && user.adminState === 'awaiting_broadcast_user') {
      if (text === 'Cancel') {
        ctx.reply('↩️ Broadcast cancelled.', ownerAdminPanel);
        await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
        return;
      }

      const targetUsers = await User.find({ isBlocked: false });
      const { successCount, failCount } = await broadcastMessage(makerBot, message, targetUsers, userId);

      ctx.reply(
        `📢 Broadcast to Bot Maker Users completed!\n` +
        `✅ Sent to ${successCount} users\n` +
        `❌ Failed for ${failCount} users`,
        ownerAdminPanel
      );
      await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
    }

    else if (userId === OWNER_ID && user.adminState === 'awaiting_broadcast_sub') {
      if (text === 'Cancel') {
        ctx.reply('↩️ Broadcast cancelled.', ownerAdminPanel);
        await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
        return;
      }

      const { totalSuccess, totalFail } = await broadcastSubMessage(message, userId);

      ctx.reply(
        `📣 Broadcast to Created Bot Users completed!\n` +
        `✅ Sent to ${totalSuccess} users\n` +
        `❌ Failed for ${totalFail} users`,
        ownerAdminPanel
      );
      await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
    }

    else if (userId === OWNER_ID && user.adminState === 'awaiting_block') {
      if (text === 'Cancel') {
        ctx.reply('↩️ Block action cancelled.', ownerAdminPanel);
        await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
        return;
      }

      const targetUserId = text.trim();
      if (!/^\d+$/.test(targetUserId)) {
        ctx.reply('❌ Invalid user ID. Please provide a numeric user ID (only numbers).', cancelKeyboard);
        return;
      }

      if (targetUserId === OWNER_ID) {
        ctx.reply('❌ You cannot block yourself.', cancelKeyboard);
        return;
      }

      const targetUser = await User.findOne({ userId: targetUserId });
      if (!targetUser) {
        ctx.reply('❌ User not found.', ownerAdminPanel);
        await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
        return;
      }

      await User.findOneAndUpdate({ userId: targetUserId }, { isBlocked: true });
      ctx.reply(`✅ User ${targetUserId} has been blocked from Bot Maker.`, ownerAdminPanel);
      await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
    }

    else if (userId === OWNER_ID && user.adminState === 'awaiting_unlock') {
      if (text === 'Cancel') {
        ctx.reply('↩️ Unlock action cancelled.', ownerAdminPanel);
        await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
        return;
      }

      const targetUserId = text.trim();
      if (!/^\d+$/.test(targetUserId)) {
        ctx.reply('❌ Invalid user ID. Please provide a numeric user ID (only numbers).', cancelKeyboard);
        return;
      }

      const targetUser = await User.findOne({ userId: targetUserId });
      if (!targetUser) {
        ctx.reply('❌ User not found.', ownerAdminPanel);
        await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
        return;
      }

      await User.findOneAndUpdate({ userId: targetUserId }, { isBlocked: false });
      ctx.reply(`✅ User ${targetUserId} has been unblocked from Bot Maker.`, ownerAdminPanel);
      await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
    }

    else if (userId === OWNER_ID && user.adminState === 'awaiting_remove_bot') {
      if (text === 'Cancel') {
        ctx.reply('↩️ Remove bot action cancelled.', ownerAdminPanel);
        await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
        return;
      }

      const botToken = text.trim();
      const bot = await Bot.findOne({ token: botToken });
      if (!bot) {
        ctx.reply('❌ Bot token not found.', ownerAdminPanel);
        await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
        return;
      }

      await deleteWebhook(botToken);
      await Bot.deleteOne({ token: botToken });
      await BotUser.deleteMany({ botToken });
      await ChannelUrl.deleteOne({ botToken });

      ctx.reply(`✅ Bot @${bot.username} has been removed from Bot Maker.`, ownerAdminPanel);
      await User.findOneAndUpdate({ userId }, { adminState: 'admin_panel' });
    }

    else if (user.step === 'create_bot') {
      if (text === 'Back') {
        ctx.reply('↩️ Back to main menu.', mainMenu);
        await User.findOneAndUpdate({ userId }, { step: 'none', adminState: 'none' });
        return;
      }

      const botInfo = await validateBotToken(text);
      if (!botInfo) {
        ctx.reply('❌ Invalid bot token. Please try again:', backKeyboard);
        return;
      }

      const existingBot = await Bot.findOne({ token: text });
      if (existingBot) {
        ctx.reply('❌ This bot token is already in use.', mainMenu);
        await User.findOneAndUpdate({ userId }, { step: 'none' });
        return;
      }

      const webhookSet = await setWebhook(text, 'created');
      if (!webhookSet) {
        ctx.reply('❌ Failed to set up the bot. Please try again.', mainMenu);
        await User.findOneAndUpdate({ userId }, { step: 'none' });
        return;
      }

      const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
      await Bot.create({
        token: text,
        username: botInfo.username,
        creatorId: userId,
        creatorUsername: ctx.from.username || ctx.from.first_name,
        template: 'created',
      });

      const totalBots = await Bot.countDocuments();
      const createdAt = getRelativeTime(Math.floor(Date.now() / 1000));
      const notification = `🤖 New Bot Created Notification 🤖\n` +
                          `👤 Creator: ${username}\n` +
                          `🆔 Creator ID: ${userId}\n` +
                          `🤖 Bot: @${botInfo.username}\n` +
                          `📅 Created: ${createdAt}\n` +
                          `📊 Total Bots Created: ${totalBots}`;
      await makerBot.telegram.sendMessage(OWNER_ID, notification);

      ctx.reply(
        `✅ Your bot @${botInfo.username} made successfully! Send /panel to manage it.`,
        mainMenu
      );
      await User.findOneAndUpdate({ userId }, { step: 'none' });
    } else if (user.step === 'delete_bot') {
      if (text === 'Back') {
        ctx.reply('↩️ Back to main menu.', mainMenu);
        await User.findOneAndUpdate({ userId }, { step: 'none', adminState: 'none' });
        return;
      }

      const bot = await Bot.findOne({ token: text });
      if (!bot) {
        ctx.reply('❌ Bot token not found.', mainMenu);
        await User.findOneAndUpdate({ userId }, { step: 'none' });
        return;
      }

      await deleteWebhook(text);
      await Bot.deleteOne({ token: text });
      await BotUser.deleteMany({ botToken: text });
      await ChannelUrl.deleteOne({ botToken: text });

      ctx.reply('✅ Bot has been deleted and disconnected from Bot Maker.', mainMenu);
      await User.findOneAndUpdate({ userId }, { step: 'none' });
    } else if (text === 'Back') {
      ctx.reply('↩️ Back to main menu.', mainMenu);
      await User.findOneAndUpdate({ userId }, { step: 'none', adminState: 'none' });
    }
  } catch (error) {
    console.error('Error in text handler:', error);
    ctx.reply('❌ An error occurred. Please try again.', mainMenu);
  }
});


// Vercel Handler
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await makerBot.handleUpdate(req.body);
      res.status(200).json({ ok: true });
    } else {
      res.status(200).send('Bot Maker is running.');
    }
  } catch (error) {
    console.error('Error in maker.js:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
};
