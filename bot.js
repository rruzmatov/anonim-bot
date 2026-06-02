

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const TelegramBot = require("node-telegram-bot-api");

const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = String(process.env.OWNER_ID || "").trim();

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN не найден. Создайте .env и добавьте BOT_TOKEN=ваш_токен");
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const DATA_DIR = __dirname;
const USERS_FILE = path.join(DATA_DIR, "users.json");
const ANN_USERS_FILE = path.join(DATA_DIR, "annUsers.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");
const ANSWERS_FILE = path.join(DATA_DIR, "answers.json");
const SUPPORT_FILE = path.join(DATA_DIR, "support.json");
const STATS_FILE = path.join(DATA_DIR, "stats.json");
const TELEGRAM_TEXT_LIMIT = 3900;

const BOT_DESCRIPTION =
  "💞 Анонимные сообщения\n\n" +
  "🔗 Создай свою личную ссылку и отправь её друзьям\n" +
  "💌 Получай сообщения от знакомых\n" +
  "🙈 Отправитель остаётся скрытым\n" +
  "📊 Смотри статистику сообщений\n" +
  "♻️ Обновляй ссылку в один клик\n\n" +
  "✨ Поделись ссылкой в профиле, канале или сторис и узнай, что тебе хотят написать.";

const START_GREETING =
  "👋 Добро пожаловать!\n\n" +
  "💌 Этот бот помогает получать анонимные сообщения от знакомых.\n\n" +
  "Что умеет бот:\n" +
  "🔗 Создаёт твою личную ссылку\n" +
  "💬 Принимает анонимные сообщения\n" +
  "✍️ Позволяет отвечать на сообщения\n" +
  "📊 Показывает статистику\n" +
  "♻️ Может обновить ссылку в один клик\n" +
  "🛟 Есть поддержка для отзывов и вопросов\n\n" +
  "👇 Твоя ссылка уже готова:";

const ANN_GREETING =
  "👋 Добро пожаловать в анонимный режим!\n\n" +
  "💞 Получай анонимные сообщения от знакомых.\n" +
  "🔐 Отправители останутся скрытыми, но в специальном режиме ты сможешь видеть данные отправителя.\n\n" +
  "👇 Твоя индивидуальная ссылка:";

let botUsername = "";
let users = {};
let annUsers = {};
let messages = [];
let answers = [];
let supportMessages = [];
let stats = {};

const pendingAnonymousMessages = new Map();
const pendingReplies = new Map();
const pendingSupportMessages = new Map();

function ensureFile(filePath, defaultValue) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf8");
  }
}

function readJson(filePath, defaultValue) {
  try {
    ensureFile(filePath, defaultValue);
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) return defaultValue;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Ошибка чтения ${filePath}:`, error.message);
    return defaultValue;
  }
}

function writeJson(filePath, data) {
  try {
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    console.error(`Ошибка записи ${filePath}:`, error.message);
  }
}

function loadData() {
  users = readJson(USERS_FILE, {});
  annUsers = readJson(ANN_USERS_FILE, {});
  messages = readJson(MESSAGES_FILE, []);
  answers = readJson(ANSWERS_FILE, []);
  supportMessages = readJson(SUPPORT_FILE, []);
  stats = readJson(STATS_FILE, {});
}

function saveUsers() {
  writeJson(USERS_FILE, users);
}

function saveAnnUsers() {
  writeJson(ANN_USERS_FILE, annUsers);
}

function saveMessages() {
  writeJson(MESSAGES_FILE, messages);
}

function saveAnswers() {
  writeJson(ANSWERS_FILE, answers);
}

function saveSupportMessages() {
  writeJson(SUPPORT_FILE, supportMessages);
}

function saveStats() {
  writeJson(STATS_FILE, stats);
}

function saveData() {
  saveUsers();
  saveAnnUsers();
  saveMessages();
  saveAnswers();
  saveSupportMessages();
  saveStats();
}

function nowIso() {
  return new Date().toISOString();
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value || "—";
  }
}

function getDisplayName(from) {
  return [from.first_name, from.last_name].filter(Boolean).join(" ") || "Без имени";
}

function truncateText(text, maxLength = 600) {
  const value = String(text || "");
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function getUserShortInfo(userId) {
  const user = users[String(userId)];
  if (!user) return `ID: ${userId}`;

  const username = user.username ? `@${user.username}` : "нет username";
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Без имени";

  return `${name} | ${username} | ID: ${user.id}`;
}

function splitText(text, limit = TELEGRAM_TEXT_LIMIT) {
  const value = String(text || "");
  if (value.length <= limit) return [value];

  const parts = [];
  let rest = value;

  while (rest.length > limit) {
    let splitAt = rest.lastIndexOf("\n\n", limit);
    if (splitAt < 500) splitAt = rest.lastIndexOf("\n", limit);
    if (splitAt < 500) splitAt = limit;

    parts.push(rest.slice(0, splitAt).trim());
    rest = rest.slice(splitAt).trim();
  }

  if (rest) parts.push(rest);
  return parts;
}


function createStatsIfMissing(userId) {
  const id = String(userId);
  if (!stats[id]) {
    stats[id] = {
      linkClicks: 0,
      messagesReceived: 0,
      messagesSent: 0,
      repliesSent: 0,
      repliesReceived: 0,
    };
  }
  return stats[id];
}

function recalculateStatsFromMessages() {
  for (const user of Object.values(users)) {
    const userStats = createStatsIfMissing(user.id);
    userStats.messagesReceived = 0;
    userStats.messagesSent = 0;
    userStats.repliesSent = 0;
    userStats.repliesReceived = 0;
  }

  for (const user of Object.values(annUsers)) {
    user.messagesReceived = 0;
    user.messagesSent = 0;
    user.repliesSent = 0;
    user.repliesReceived = 0;
  }

  for (const item of messages) {
    if (item.type === "anonymous_message") {
      const senderId = String(item.senderId);
      const receiverId = String(item.receiverId);

      createStatsIfMissing(senderId).messagesSent += 1;
      createStatsIfMissing(receiverId).messagesReceived += 1;

      if (annUsers[senderId]) annUsers[senderId].messagesSent += 1;
      if (annUsers[receiverId]) annUsers[receiverId].messagesReceived += 1;
    }

    if (item.type === "reply") {
      const fromId = String(item.fromId);
      const toId = String(item.toId);

      createStatsIfMissing(fromId).repliesSent += 1;
      createStatsIfMissing(toId).repliesReceived += 1;

      if (annUsers[fromId]) annUsers[fromId].repliesSent += 1;
      if (annUsers[toId]) annUsers[toId].repliesReceived += 1;
    }
  }

  saveStats();
  saveAnnUsers();
}


function createUniqueCode() {
  let code;
  do {
    code = crypto.randomBytes(5).toString("hex");
  } while (findUserByCode(code));
  return code;
}

function ensureSeparateCodeForUser(userId, codeField) {
  const id = String(userId);
  const user = users[id];
  if (!user) return "";

  if (!user[codeField]) {
    let newCode = createUniqueCode();

    if (codeField === "startCode" && user.annCode && newCode === user.annCode) {
      newCode = createUniqueCode();
    }

    if (codeField === "annCode" && user.startCode && newCode === user.startCode) {
      newCode = createUniqueCode();
    }

    user[codeField] = newCode;
  }

  return user[codeField];
}

function buildLink(code) {
  return `https://t.me/${botUsername}?start=${code}`;
}

function createOrUpdateUser(from, options = {}) {
  const id = String(from.id);
  const current = users[id];
  const date = nowIso();

  if (!current) {
    users[id] = {
      id: from.id,
      username: from.username || "",
      first_name: from.first_name || "",
      last_name: from.last_name || "",
      firstSeen: date,
      lastActive: date,
      activeCode: "",
      startCode: "",
      annCode: "",
      oldCodes: [],
      link: "",
      startLink: "",
      annLink: "",
    };
  } else {
    users[id] = {
      ...current,
      username: from.username || current.username || "",
      first_name: from.first_name || current.first_name || "",
      last_name: from.last_name || current.last_name || "",
      lastActive: date,
    };
  }

  if (options.ensureCode && !users[id].activeCode) {
    users[id].activeCode = createUniqueCode();
    users[id].link = buildLink(users[id].activeCode);
  }

  if (!users[id].oldCodes) users[id].oldCodes = [];
  if (!users[id].startCode) users[id].startCode = "";
  if (!users[id].annCode) users[id].annCode = "";
  users[id].startLink = users[id].startCode ? buildLink(users[id].startCode) : "";
  users[id].annLink = users[id].annCode ? buildLink(users[id].annCode) : "";

  createStatsIfMissing(id);
  saveUsers();
  saveStats();

  return users[id];
}

function createOrUpdateAnnUser(from) {
  const baseUser = createOrUpdateUser(from);
  const id = String(from.id);
  const date = nowIso();
  const annCode = ensureSeparateCodeForUser(id, "annCode");
  const annLink = buildLink(annCode);

  users[id].annLink = annLink;
  users[id].link = annLink;
  users[id].activeCode = annCode;
  saveUsers();

  if (!annUsers[id]) {
    annUsers[id] = {
      id: from.id,
      username: from.username || "",
      first_name: from.first_name || "",
      last_name: from.last_name || "",
      annStartedAt: date,
      lastAnnActive: date,
      activeCode: annCode,
      oldCodes: Array.isArray(baseUser.oldCodes) ? baseUser.oldCodes : [],
      link: annLink,
      messagesReceived: 0,
      messagesSent: 0,
      repliesSent: 0,
      repliesReceived: 0,
    };
  } else {
    annUsers[id] = {
      ...annUsers[id],
      username: from.username || annUsers[id].username || "",
      first_name: from.first_name || annUsers[id].first_name || "",
      last_name: from.last_name || annUsers[id].last_name || "",
      lastAnnActive: date,
      activeCode: annCode,
      oldCodes: Array.isArray(baseUser.oldCodes) ? baseUser.oldCodes : [],
      link: annLink,
    };
  }

  saveAnnUsers();
  return annUsers[id];
}

function findUserByCode(code) {
  if (!code) return null;
  return (
    Object.values(users).find(
      (user) => user.activeCode === code || user.startCode === code || user.annCode === code
    ) || null
  );
}

function findLinkDataByCode(code) {
  if (!code) return null;

  for (const user of Object.values(users)) {
    if (user.annCode === code || user.activeCode === code) {
      return { user, source: "ann" };
    }

    if (user.startCode === code) {
      return { user, source: "start" };
    }
  }

  return null;
}

function getMessageText(msg) {
  if (msg.text) return msg.text;
  if (msg.caption) return msg.caption;
  return "";
}

function getContentType(msg) {
  if (msg.text) return "text";
  if (msg.photo) return "photo";
  if (msg.sticker) return "sticker";
  if (msg.video) return "video";
  if (msg.voice) return "voice";
  if (msg.document) return "document";
  if (msg.audio) return "audio";
  if (msg.animation) return "animation";
  return "other";
}

function isOwner(userId) {
  return OWNER_ID && String(userId) === OWNER_ID;
}

function mainMenuKeyboard() {
  return {
    inline_keyboard: [[{ text: "ℹ️ Помощь", callback_data: "help" }]],
  };
}

function annKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "📊 Статистика", callback_data: "ann_stats" }],
      [{ text: "💘 Больше сообщений", callback_data: "more_messages" }],
      [{ text: "♻️ Сменить ссылку", callback_data: "change_link" }],
      [{ text: "🛟 Поддержка", callback_data: "support" }],
    ],
  };
}

function adminKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "👥 Все пользователи", callback_data: "admin_users" }],
      [{ text: "❔ Вопросы и ответы", callback_data: "admin_qa" }],
      [{ text: "🤖 Пользователи /annstart", callback_data: "admin_ann_users" }],
      [{ text: "💌 Все сообщения", callback_data: "admin_messages" }],
      [{ text: "📊 Общая статистика", callback_data: "admin_stats" }],
      [{ text: "📁 Экспорт JSON", callback_data: "admin_export" }],
    ],
  };
}

async function safeSendMessage(chatId, text, options = {}) {
  try {
    return await bot.sendMessage(chatId, text, options);
  } catch (error) {
    console.error("sendMessage error:", error.message);
    return null;
  }
}

async function safeSendLongMessage(chatId, text, options = {}) {
  const parts = splitText(text);
  let lastMessage = null;

  for (let index = 0; index < parts.length; index += 1) {
    const partOptions = index === parts.length - 1 ? options : {};
    lastMessage = await safeSendMessage(chatId, parts[index], partOptions);
  }

  return lastMessage;
}

async function safeEditMessageText(chatId, messageId, text, options = {}) {
  const parts = splitText(text);

  try {
    await bot.editMessageText(parts[0], {
      chat_id: chatId,
      message_id: messageId,
      ...(parts.length === 1 ? options : {}),
    });

    if (parts.length > 1) {
      for (let index = 1; index < parts.length; index += 1) {
        const partOptions = index === parts.length - 1 ? options : {};
        await safeSendMessage(chatId, parts[index], partOptions);
      }
    }

    return true;
  } catch (error) {
    console.error("editMessageText error:", error.message);
    return await safeSendLongMessage(chatId, text, options);
  }
}

async function safeCopyMessage(chatId, fromChatId, messageId, options = {}) {
  try {
    return await bot.copyMessage(chatId, fromChatId, messageId, options);
  } catch (error) {
    console.error("copyMessage error:", error.message);
    return null;
  }
}

async function showNormalStart(chatId, from) {
  pendingAnonymousMessages.delete(String(from.id));
  pendingReplies.delete(String(from.id));
  pendingSupportMessages.delete(String(from.id));

  const user = createOrUpdateUser(from);
  const startCode = ensureSeparateCodeForUser(user.id, "startCode");
  const startLink = buildLink(startCode);

  users[String(user.id)].startLink = startLink;
  saveUsers();

  await safeSendMessage(
    chatId,
    `${START_GREETING}\n\n🔗 ${startLink}\n\n☝️ Запость эту ссылку в Telegram-канале, профиле или отправь друзьям.`,
    { reply_markup: annKeyboard() }
  );
}

async function showHelp(chatId, from) {
  createOrUpdateUser(from);
  await safeSendMessage(chatId, "ℹ️ Помощь\n\n/start — открыть главное меню\n/help — помощь");
}

async function showAnnStart(chatId, from) {
  const annUser = createOrUpdateAnnUser(from);
  await safeSendMessage(
    chatId,
    `${ANN_GREETING}\n\n🔗 ${annUser.link}\n\n☝️ Запость эту ссылку в Telegram-канале, профиле или отправь друзьям.`,
    { reply_markup: annKeyboard() }
  );
}

async function handleStartWithCode(chatId, from, code) {
  createOrUpdateUser(from);

  const linkData = findLinkDataByCode(code);
  if (!linkData) {
    await safeSendMessage(chatId, "❌ Эта ссылка больше не работает.");
    return;
  }

  const receiver = linkData.user;

  if (String(receiver.id) === String(from.id) && !isOwner(from.id)) {
    await safeSendMessage(chatId, "❌ Нельзя отправить сообщение самому себе.");
    return;
  }

  createStatsIfMissing(receiver.id).linkClicks += 1;
  saveStats();

  pendingAnonymousMessages.set(String(from.id), {
    receiverId: String(receiver.id),
    code,
    source: linkData.source,
    createdAt: Date.now(),
  });

  await safeSendMessage(chatId, "💌 Напиши анонимное сообщение.\nПолучатель не узнает, кто ты.");
}

async function showLink(chatId, from) {
  const annUser = createOrUpdateAnnUser(from);
  await safeSendMessage(chatId, `🔗 Ваша ссылка:\n${annUser.link}`);
}

async function showUserStats(chatId, from) {
  createOrUpdateUser(from);
  recalculateStatsFromMessages();
  const userStats = createStatsIfMissing(from.id);
  saveStats();

  await safeSendMessage(
    chatId,
    `📊 Статистика\n\n👥 Перешли по ссылке: ${userStats.linkClicks}\n💌 Получено сообщений: ${userStats.messagesReceived}\n📨 Отправлено сообщений: ${userStats.messagesSent}\n✍️ Отправлено ответов: ${userStats.repliesSent}\n💬 Получено ответов: ${userStats.repliesReceived}`
  );
}

function getLastUserMessages(userId, limit = 10) {
  return messages
    .filter((item) => item.type === "anonymous_message" && String(item.receiverId) === String(userId))
    .slice(-limit)
    .reverse();
}

async function showAnnBot(chatId, from) {
  createOrUpdateUser(from);
  const annUser = annUsers[String(from.id)];

  if (!annUser) {
    await safeSendMessage(chatId, "❌ У вас ещё нет анонимной ссылки.");
    return;
  }

  const lastMessages = getLastUserMessages(from.id, 10);
  const list = lastMessages.length
    ? lastMessages
      .map((item, index) => {
        const text = item.text || `[${item.contentType || "сообщение"}]`;
        return `${index + 1}. 👤 Отправитель:\n   ID: ${item.senderId}\n   Username: ${item.senderUsername || "нет username"}\n   Имя: ${item.senderName || "—"}\n   💬 Сообщение: ${text}\n   📅 Дата: ${formatDate(item.date)}`;
      })
      .join("\n\n")
    : "Пока сообщений нет.";

  await safeSendMessage(
    chatId,
    `🤖 Панель анонимных сообщений\n\n🔗 Моя ссылка:\n${annUser.link}\n\n📥 Анонимные сообщения, которые вам написали:\n\n${list}`
  );
}

async function changeLink(chatId, from) {
  const user = createOrUpdateUser(from, { ensureCode: true });
  const oldCode = user.activeCode;
  const newCode = createUniqueCode();

  if (oldCode) user.oldCodes.push(oldCode);
  user.activeCode = newCode;
  user.annCode = newCode;
  user.link = buildLink(newCode);
  user.annLink = buildLink(newCode);
  user.lastActive = nowIso();

  users[String(from.id)] = user;
  saveUsers();

  if (annUsers[String(from.id)]) {
    annUsers[String(from.id)].activeCode = newCode;
    annUsers[String(from.id)].oldCodes = user.oldCodes;
    annUsers[String(from.id)].link = user.link;
    annUsers[String(from.id)].lastAnnActive = nowIso();
    saveAnnUsers();
  }

  await safeSendMessage(chatId, `♻️ Ваша ссылка обновлена:\n\n${user.link}`);
}

async function showMoreMessages(chatId, from) {
  const annUser = createOrUpdateAnnUser(from);
  await safeSendMessage(
    chatId,
    `💘 Чтобы получить больше анонимных сообщений, разместите свою ссылку в Telegram-канале, сторис, профиле или отправьте друзьям.\n\n🔗 Ваша ссылка:\n${annUser.link}`
  );
}

async function startSupport(chatId, from) {
  createOrUpdateUser(from);

  pendingAnonymousMessages.delete(String(from.id));
  pendingReplies.delete(String(from.id));
  pendingSupportMessages.set(String(from.id), { createdAt: Date.now() });

  await safeSendMessage(
    chatId,
    "🛟 Поддержка\n\nНапишите своё мнение, вопрос или предложение одним сообщением.\nЯ передам его администратору."
  );
}

async function handleSupportMessage(msg) {
  const userId = String(msg.from.id);
  const username = msg.from.username ? `@${msg.from.username}` : "нет username";
  const name = getDisplayName(msg.from);
  const text = truncateText(getMessageText(msg) || `[${getContentType(msg)}]`, 2500);
  const contentType = getContentType(msg);

  if (!OWNER_ID) {
    pendingSupportMessages.delete(userId);
    await safeSendMessage(msg.chat.id, "❌ Поддержка временно недоступна.");
    return;
  }

  const supportRecord = {
    id: `support_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    userId: Number(userId),
    username,
    name,
    text,
    contentType,
    date: nowIso(),
    status: "sent",
  };

  supportMessages.push(supportRecord);
  saveSupportMessages();

  await safeSendMessage(
    OWNER_ID,
    `🛟 Написали в поддержку\n\n👤 Пользователь:\nID: ${userId}\nUsername: ${username}\nИмя: ${name}\n\n💬 Сообщение:\n${text}\n\n🕒 Время: ${formatDate(supportRecord.date)}`
  );

  if (contentType !== "text") {
    await safeCopyMessage(OWNER_ID, msg.chat.id, msg.message_id);
  }

  pendingSupportMessages.delete(userId);
  await safeSendMessage(msg.chat.id, "✅ Ваше сообщение отправлено в поддержку.");
}

async function handleAnonymousMessage(msg, state) {
  const sender = msg.from;
  const senderId = String(sender.id);
  const senderUsername = sender.username ? `@${sender.username}` : "нет username";
  const senderName = getDisplayName(sender);
  const receiverId = String(state.receiverId);
  const receiverUser = users[receiverId];

  if (!receiverUser) {
    pendingAnonymousMessages.delete(senderId);
    await safeSendMessage(msg.chat.id, "❌ Получатель не найден.");
    return;
  }

  const contentType = getContentType(msg);
  const text = truncateText(getMessageText(msg), 2500);
  const messageId = `msg_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  let sentToReceiver = null;
  const showSenderInfo = state.source === "ann";

  if (contentType === "text") {
    const receiverText = showSenderInfo
      ? `💌 Вам пришло новое анонимное сообщение:\n\n💬 Сообщение:\n${text}\n\n👤 Отправитель:\nID: ${senderId}\nUsername: ${senderUsername}\nИмя: ${senderName}`
      : `💌 Вам пришло новое анонимное сообщение:\n\n💬 Сообщение:\n${text}`;

    sentToReceiver = await safeSendMessage(
      receiverId,
      receiverText,
      {
        reply_markup: {
          inline_keyboard: [[{ text: "✍️ Ответить", callback_data: `reply_to:${messageId}` }]],
        },
      }
    );
  } else {
    const receiverText = showSenderInfo
      ? `💌 Вам пришло новое анонимное сообщение.\n\n👤 Отправитель:\nID: ${senderId}\nUsername: ${senderUsername}\nИмя: ${senderName}`
      : "💌 Вам пришло новое анонимное сообщение.";

    await safeSendMessage(
      receiverId,
      receiverText,
      {
        reply_markup: {
          inline_keyboard: [[{ text: "✍️ Ответить", callback_data: `reply_to:${messageId}` }]],
        },
      }
    );
    sentToReceiver = await safeCopyMessage(receiverId, msg.chat.id, msg.message_id);
  }

  const savedMessage = {
    id: messageId,
    type: "anonymous_message",
    senderId: Number(senderId),
    senderUsername,
    senderName,
    receiverId: Number(receiverId),
    text,
    contentType,
    source: state.source || "start",
    senderInfoVisible: showSenderInfo,
    date: nowIso(),
    status: sentToReceiver ? "sent" : "error",
    telegramMessageId: sentToReceiver ? sentToReceiver.message_id : null,
    canReply: true,
    replies: [],
  };

  messages.push(savedMessage);

  createStatsIfMissing(senderId).messagesSent += 1;
  createStatsIfMissing(receiverId).messagesReceived += 1;

  if (annUsers[receiverId]) annUsers[receiverId].messagesReceived += 1;
  if (annUsers[senderId]) annUsers[senderId].messagesSent += 1;

  saveData();
  pendingAnonymousMessages.delete(senderId);

  await safeSendMessage(msg.chat.id, "✅ Ваше анонимное сообщение отправлено.");
}

async function handleReplyMessage(msg, state) {
  const fromId = String(msg.from.id);
  const original = messages.find((item) => item.id === state.originalMessageId);

  if (!original) {
    pendingReplies.delete(fromId);
    await safeSendMessage(msg.chat.id, "❌ Сообщение для ответа не найдено.");
    return;
  }

  if (String(original.receiverId) !== fromId && !isOwner(fromId)) {
    pendingReplies.delete(fromId);
    await safeSendMessage(msg.chat.id, "⛔ У вас нет доступа.");
    return;
  }

  const toId = String(original.senderId);
  const contentType = getContentType(msg);
  const answerText = truncateText(getMessageText(msg) || `[${contentType}]`, 2500);
  const questionText = original.text || `[${original.contentType || "сообщение"}]`;
  const replyId = `reply_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  const beautifulReplyText =
    `💌 Ответ на анонимное сообщение\n\n` +
    `❔ Ваше сообщение:\n` +
    `${questionText}\n\n` +
    `💬 Ответ:\n` +
    `${answerText}`;

  if (contentType === "text") {
    await safeSendMessage(toId, beautifulReplyText);
  } else {
    await safeSendMessage(
      toId,
      `💌 Ответ на анонимное сообщение\n\n❔ Ваше сообщение:\n${questionText}\n\n💬 Ответ ниже 👇`
    );
    await safeCopyMessage(toId, msg.chat.id, msg.message_id);
  }

  const reply = {
    id: replyId,
    type: "reply",
    originalMessageId: original.id,
    questionText,
    answerText,
    fromId: Number(fromId),
    toId: Number(toId),
    text: answerText,
    date: nowIso(),
    status: "sent",
  };

  if (!Array.isArray(original.replies)) original.replies = [];
  if (!Array.isArray(original.answers)) original.answers = [];

  const answerRecord = {
    id: replyId,
    questionMessageId: original.id,
    questionText,
    answerText,
    answeredBy: Number(fromId),
    sentTo: Number(toId),
    date: reply.date,
    status: "sent",
  };

  original.replies.push(replyId);
  original.answers.push(answerRecord);
  messages.push(reply);
  answers.push(answerRecord);

  createStatsIfMissing(fromId).repliesSent += 1;
  createStatsIfMissing(toId).repliesReceived += 1;

  if (annUsers[fromId]) annUsers[fromId].repliesSent += 1;
  if (annUsers[toId]) annUsers[toId].repliesReceived += 1;

  saveData();
  pendingReplies.delete(fromId);

  await safeSendMessage(msg.chat.id, "✅ Ответ отправлен");
}

function getUsersList(limit = 20) {
  const list = Object.values(users).slice(-limit).reverse();
  if (!list.length) return "Пользователей пока нет.";

  return list
    .map((user, index) => {
      const userStats = createStatsIfMissing(user.id);
      return `${index + 1}. ID: ${user.id}\nUsername: ${user.username ? "@" + user.username : "—"}\nИмя: ${[user.first_name, user.last_name].filter(Boolean).join(" ") || "—"}\nДата регистрации: ${formatDate(user.firstSeen)}\nПолучил сообщений: ${userStats.messagesReceived}\nОтправил сообщений: ${userStats.messagesSent}`;
    })
    .join("\n\n");
}

function getAnnUsersList(limit = 20) {
  const list = Object.values(annUsers).slice(-limit).reverse();
  if (!list.length) return "Пользователей анонимного режима пока нет.";

  return list
    .map((user, index) => {
      return `${index + 1}. ID: ${user.id}\nUsername: ${user.username ? "@" + user.username : "—"}\nИмя: ${[user.first_name, user.last_name].filter(Boolean).join(" ") || "—"}\nДата /annstart: ${formatDate(user.annStartedAt)}\nСсылка: ${user.link}\nПолучил сообщений: ${user.messagesReceived}\nОтправил сообщений: ${user.messagesSent}`;
    })
    .join("\n\n");
}

function getMessagesList(limit = 20) {
  const list = messages.slice(-limit).reverse();
  if (!list.length) return "Сообщений пока нет.";

  return list
    .map((item) => {
      if (item.type === "reply") {
        return `ID: ${item.id}\nТип: ответ\nОтправитель: ${item.fromId}\nПолучатель: ${item.toId}\nТекст: ${item.text || "—"}\nДата: ${formatDate(item.date)}`;
      }

      return `ID: ${item.id}\nТип: анонимное сообщение\nОтправитель: ${item.senderId}\nПолучатель: ${item.receiverId}\nТекст: ${item.text || "—"}\nДата: ${formatDate(item.date)}`;
    })
    .join("\n\n");
}

async function showAdminPanel(chatId, from, messageId = null) {
  if (!isOwner(from.id)) {
    await safeSendMessage(chatId, "⛔ У вас нет доступа.");
    return;
  }

  const text = "🛠 Админ-панель";
  const options = { reply_markup: adminKeyboard() };

  if (messageId) {
    await safeEditMessageText(chatId, messageId, text, options);
    return;
  }

  await safeSendMessage(chatId, text, options);
}

function buildAdminUsersKeyboard() {
  const userList = Object.values(users)
    .sort((a, b) => new Date(b.lastActive || b.firstSeen || 0) - new Date(a.lastActive || a.firstSeen || 0))
    .slice(0, 20);

  const keyboard = userList.map((user) => {
    const username = user.username ? `@${user.username}` : "нет username";
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Без имени";
    return [
      {
        text: `👤 ${name} | ${username}`,
        callback_data: `admin_user:${user.id}`,
      },
    ];
  });

  keyboard.push([{ text: "🔙 Назад", callback_data: "admin_back" }]);

  return { inline_keyboard: keyboard };
}

async function showAdminUsers(chatId, from, messageId = null) {
  if (!isOwner(from.id)) return safeSendMessage(chatId, "⛔ У вас нет доступа.");

  const totalUsers = Object.keys(users).length;

  if (!totalUsers) {
    await safeSendMessage(chatId, "👥 Пользователей пока нет.");
    return;
  }

  const text = `❔ Вопросы и ответы\n\n👥 Участники бота: ${totalUsers}\n\nВыберите участника, чтобы посмотреть его вопросы, ответы и время:`;
  const options = { reply_markup: buildAdminUsersKeyboard() };

  if (messageId) {
    await safeEditMessageText(chatId, messageId, text, options);
    return;
  }

  await safeSendMessage(chatId, text, options);
}

async function showAdminUserDetails(chatId, from, userId, messageId = null) {
  if (!isOwner(from.id)) return safeSendMessage(chatId, "⛔ У вас нет доступа.");

  const user = users[String(userId)];
  if (!user) {
    await safeSendMessage(chatId, "❌ Пользователь не найден.");
    return;
  }

  const username = user.username ? `@${user.username}` : "нет username";
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Без имени";
  const userStats = createStatsIfMissing(userId);

  function getAnswersForQuestion(question) {
    const fromMessageAnswers = Array.isArray(question.answers) ? question.answers : [];

    const fromAnswersFile = answers.filter(
      (answer) => String(answer.questionMessageId) === String(question.id)
    );

    const fromMessagesReplies = messages
      .filter(
        (item) =>
          item.type === "reply" &&
          String(item.originalMessageId) === String(question.id)
      )
      .map((item) => ({
        id: item.id,
        answerText: item.answerText || item.text || "—",
        answeredBy: item.fromId,
        sentTo: item.toId,
        date: item.date,
        status: item.status || "sent",
      }));

    const merged = [...fromMessageAnswers, ...fromAnswersFile, ...fromMessagesReplies];
    const unique = [];
    const usedIds = new Set();

    for (const answer of merged) {
      const answerId = answer.id || `${answer.answeredBy}_${answer.sentTo}_${answer.date}_${answer.answerText}`;
      if (usedIds.has(answerId)) continue;
      usedIds.add(answerId);
      unique.push(answer);
    }

    return unique.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  }

  const relatedQuestions = messages
    .filter(
      (item) =>
        item.type === "anonymous_message" &&
        (String(item.senderId) === String(userId) || String(item.receiverId) === String(userId))
    )
    .slice(-15)
    .reverse();

  const questionsAndAnswersText = relatedQuestions.length
    ? relatedQuestions
        .map((question, index) => {
          const isReceived = String(question.receiverId) === String(userId);
          const direction = isReceived ? "📥 Получил вопрос" : "📤 Отправил вопрос";
          const secondUserLabel = isReceived ? "Отправитель" : "Получатель";
          const secondUserId = isReceived ? question.senderId : question.receiverId;
          const secondUserInfo = getUserShortInfo(secondUserId);
          const questionText = truncateText(question.text || `[${question.contentType || "сообщение"}]`, 500);
          const questionDate = formatDate(question.date);
          const questionAnswers = getAnswersForQuestion(question);

          const answersText = questionAnswers.length
            ? questionAnswers
                .map((answer, answerIndex) => {
                  const answerText = truncateText(answer.answerText || answer.text || "—", 500);
                  const answerDate = formatDate(answer.date);
                  const answeredBy = answer.answeredBy || answer.fromId || "—";
                  const sentTo = answer.sentTo || answer.toId || "—";

                  return (
                    `   ${answerIndex + 1}) 💬 Ответ: ${answerText}\n` +
                    `      👤 Ответил: ${getUserShortInfo(answeredBy)}\n` +
                    `      👥 Кому: ${getUserShortInfo(sentTo)}\n` +
                    `      🕒 Время: ${answerDate}`
                  );
                })
                .join("\n")
            : "   Ответов пока нет";

          return (
            `${index + 1}. ${direction}\n` +
            `   ❔ Вопрос: ${questionText}\n` +
            `   👤 ${secondUserLabel}: ${secondUserInfo}\n` +
            `   🕒 Время вопроса: ${questionDate}\n` +
            `   📌 ID вопроса: ${question.id}\n` +
            `   ─ Ответы:\n${answersText}`
          );
        })
        .join("\n\n")
    : "Пока нет вопросов и ответов.";

  const userOnlyAnswers = answers
    .filter((item) => String(item.answeredBy) === String(userId) || String(item.sentTo) === String(userId))
    .slice(-10)
    .reverse();

  const answersArchiveText = userOnlyAnswers.length
    ? userOnlyAnswers
        .map((item, index) => {
          return (
            `${index + 1}. 💬 Ответ\n` +
            `   ❔ Вопрос: ${truncateText(item.questionText || "—", 500)}\n` +
            `   ✅ Ответ: ${truncateText(item.answerText || "—", 500)}\n` +
            `   👤 Ответил: ${getUserShortInfo(item.answeredBy || "—")}\n` +
            `   👥 Кому: ${getUserShortInfo(item.sentTo || "—")}\n` +
            `   🕒 Время: ${formatDate(item.date)}`
          );
        })
        .join("\n\n")
    : "Пока нет сохранённых ответов.";

  const text =
    `👤 Участник\n\n` +
    `ID: ${user.id}\n` +
    `Username: ${username}\n` +
    `Имя: ${name}\n` +
    `Дата регистрации: ${formatDate(user.firstSeen)}\n` +
    `Последняя активность: ${formatDate(user.lastActive)}\n\n` +
    `📊 Статистика:\n` +
    `👥 Переходов по ссылке: ${userStats.linkClicks}\n` +
    `💌 Получил вопросов: ${userStats.messagesReceived}\n` +
    `📨 Отправил вопросов: ${userStats.messagesSent}\n` +
    `✍️ Отправил ответов: ${userStats.repliesSent}\n` +
    `💬 Получил ответов: ${userStats.repliesReceived}\n\n` +
    `━━━━━━━━━━━━━━\n\n` +
    `❔ Вопросы и ответы участника:\n\n${questionsAndAnswersText}\n\n` +
    `━━━━━━━━━━━━━━\n\n` +
    `🧾 Архив ответов:\n\n${answersArchiveText}`;

  const options = {
    reply_markup: {
      inline_keyboard: [[{ text: "🔙 К участникам", callback_data: "admin_users" }]],
    },
  };

  if (messageId) {
    await safeEditMessageText(chatId, messageId, text, options);
    return;
  }

  await safeSendMessage(chatId, text, options);
}

async function showAdminAnnUsers(chatId, from) {
  if (!isOwner(from.id)) return safeSendMessage(chatId, "⛔ У вас нет доступа.");
  await safeSendMessage(chatId, `🤖 Пользователи анонимного режима: ${Object.keys(annUsers).length}\n\n${getAnnUsersList(20)}`);
}

async function showAdminMessages(chatId, from) {
  if (!isOwner(from.id)) return safeSendMessage(chatId, "⛔ У вас нет доступа.");
  await safeSendMessage(chatId, `💌 Последние сообщения:\n\n${getMessagesList(20)}`);
}

async function showAdminStats(chatId, from) {
  if (!isOwner(from.id)) return safeSendMessage(chatId, "⛔ У вас нет доступа.");

  recalculateStatsFromMessages();

  const totalReplies = messages.filter((item) => item.type === "reply").length;
  const totalAnonymous = messages.filter((item) => item.type === "anonymous_message").length;
  const totalClicks = Object.values(stats).reduce((sum, item) => sum + Number(item.linkClicks || 0), 0);

  await safeSendMessage(
    chatId,
    `📊 Общая статистика\n\n👥 Всего пользователей: ${Object.keys(users).length}\n🤖 Пользователей /annstart: ${Object.keys(annUsers).length}\n💌 Всего сообщений: ${totalAnonymous}\n✍️ Всего ответов: ${totalReplies}\n🔗 Всего переходов по ссылкам: ${totalClicks}`
  );
}

async function exportJson(chatId, from) {
  if (!isOwner(from.id)) return safeSendMessage(chatId, "⛔ У вас нет доступа.");

  const files = [USERS_FILE, ANN_USERS_FILE, MESSAGES_FILE, ANSWERS_FILE, SUPPORT_FILE, STATS_FILE];
  for (const filePath of files) {
    try {
      await bot.sendDocument(chatId, filePath);
    } catch (error) {
      console.error("sendDocument error:", error.message);
      await safeSendMessage(chatId, `❌ Не получилось отправить файл: ${path.basename(filePath)}`);
    }
  }
}

bot.onText(/^\/start(?:\s+(.+))?$/, async (msg, match) => {
  try {
    const code = match && match[1] ? match[1].trim() : "";
    if (code) {
      await handleStartWithCode(msg.chat.id, msg.from, code);
      return;
    }
    await showNormalStart(msg.chat.id, msg.from);
  } catch (error) {
    console.error("/start error:", error.message);
    await safeSendMessage(msg.chat.id, "❌ Произошла ошибка. Попробуйте позже.");
  }
});


bot.onText(/^\/help$/, async (msg) => {
  try {
    await showHelp(msg.chat.id, msg.from);
  } catch (error) {
    console.error("/help error:", error.message);
  }
});

bot.onText(/^\/cancel$/, async (msg) => {
  try {
    pendingAnonymousMessages.delete(String(msg.from.id));
    pendingReplies.delete(String(msg.from.id));
    pendingSupportMessages.delete(String(msg.from.id));
    await safeSendMessage(msg.chat.id, "✅ Действие отменено.");
  } catch (error) {
    console.error("/cancel error:", error.message);
  }
});

bot.onText(/^\/annstart$/, async (msg) => {
  try {
    await showAnnStart(msg.chat.id, msg.from);
  } catch (error) {
    console.error("/annstart error:", error.message);
    await safeSendMessage(msg.chat.id, "❌ Произошла ошибка. Попробуйте позже.");
  }
});

bot.onText(/^\/annbot$/, async (msg) => {
  try {
    await showAnnBot(msg.chat.id, msg.from);
  } catch (error) {
    console.error("/annbot error:", error.message);
    await safeSendMessage(msg.chat.id, "❌ Произошла ошибка. Попробуйте позже.");
  }
});

bot.onText(/^\/link$/, async (msg) => {
  try {
    await showLink(msg.chat.id, msg.from);
  } catch (error) {
    console.error("/link error:", error.message);
    await safeSendMessage(msg.chat.id, "❌ Произошла ошибка. Попробуйте позже.");
  }
});

bot.onText(/^\/stats$/, async (msg) => {
  try {
    await showUserStats(msg.chat.id, msg.from);
  } catch (error) {
    console.error("/stats error:", error.message);
  }
});

bot.onText(/^\/admin$/, async (msg) => showAdminPanel(msg.chat.id, msg.from));
bot.onText(/^\/users$/, async (msg) => showAdminUsers(msg.chat.id, msg.from));
bot.onText(/^\/annusers$/, async (msg) => showAdminAnnUsers(msg.chat.id, msg.from));
bot.onText(/^\/messages$/, async (msg) => showAdminMessages(msg.chat.id, msg.from));
bot.onText(/^\/export$/, async (msg) => exportJson(msg.chat.id, msg.from));

bot.on("callback_query", async (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;
  const from = query.from;
  const messageId = query.message.message_id;

  try {
    await bot.answerCallbackQuery(query.id).catch(() => { });

    if (data === "help") return showHelp(chatId, from);
    if (data === "ann_stats") return showUserStats(chatId, from);
    if (data === "more_messages") return showMoreMessages(chatId, from);
    if (data === "change_link") return changeLink(chatId, from);
    if (data === "support") return startSupport(chatId, from);

    if (data && data.startsWith("reply_to:")) {
      const originalMessageId = data.split(":")[1];
      const original = messages.find((item) => item.id === originalMessageId);

      if (!original) {
        await safeSendMessage(chatId, "❌ Сообщение не найдено.");
        return;
      }

      if (original.canReply === false) {
        await safeSendMessage(chatId, "❌ На это сообщение уже отвечают.");
        return;
      }

      if (String(original.receiverId) !== String(from.id) && !isOwner(from.id)) {
        await safeSendMessage(chatId, "⛔ У вас нет доступа.");
        return;
      }

      original.canReply = false;
      saveMessages();

      try {
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          {
            chat_id: chatId,
            message_id: query.message.message_id,
          }
        );
      } catch (error) {
        console.error("editMessageReplyMarkup error:", error.message);
      }

      pendingReplies.set(String(from.id), {
        originalMessageId,
        createdAt: Date.now(),
      });

      await safeSendMessage(chatId, "✍️ Напишите ответ на это сообщение.");
      return;
    }

    if (data === "admin_users") return showAdminUsers(chatId, from, messageId);
    if (data === "admin_qa") return showAdminUsers(chatId, from, messageId);
    if (data && data.startsWith("admin_user:")) {
      const userId = data.split(":")[1];
      return showAdminUserDetails(chatId, from, userId, messageId);
    }
    if (data === "admin_back") return showAdminPanel(chatId, from, messageId);
    if (data === "admin_ann_users") return showAdminAnnUsers(chatId, from);
    if (data === "admin_messages") return showAdminMessages(chatId, from);
    if (data === "admin_stats") return showAdminStats(chatId, from);
    if (data === "admin_export") return exportJson(chatId, from);
  } catch (error) {
    console.error("callback_query error:", error.message);
    await safeSendMessage(chatId, "❌ Произошла ошибка. Попробуйте позже.");
  }
});

bot.on("message", async (msg) => {
  try {
    if (!msg.from || !msg.chat) return;
    if (msg.text && msg.text.startsWith("/")) return;

    createOrUpdateUser(msg.from);

    const userId = String(msg.from.id);

    if (pendingSupportMessages.has(userId)) {
      await handleSupportMessage(msg);
      return;
    }

    if (pendingReplies.has(userId)) {
      await handleReplyMessage(msg, pendingReplies.get(userId));
      return;
    }

    if (pendingAnonymousMessages.has(userId)) {
      await handleAnonymousMessage(msg, pendingAnonymousMessages.get(userId));
      return;
    }
  } catch (error) {
    console.error("message handler error:", error.message);
    await safeSendMessage(msg.chat.id, "❌ Произошла ошибка. Попробуйте позже.");
  }
});

bot.on("polling_error", (error) => {
  console.error("polling_error:", error.message);
});

process.on("SIGINT", () => {
  console.log("\n🛑 Бот остановлен. Сохраняю данные...");
  saveData();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Бот остановлен. Сохраняю данные...");
  saveData();
  process.exit(0);
});

async function startBot() {
  try {
    loadData();
    const me = await bot.getMe();
    botUsername = me.username;

    await bot.setMyDescription(BOT_DESCRIPTION).catch((error) => {
      console.error("setMyDescription error:", error.message);
    });

    await bot.setMyShortDescription("💌 Получай анонимные сообщения по личной ссылке").catch((error) => {
      console.error("setMyShortDescription error:", error.message);
    });

    for (const user of Object.values(users)) {
      if (!user.startCode) user.startCode = "";
      if (!user.annCode) user.annCode = user.activeCode || "";
      if (user.startCode) user.startLink = buildLink(user.startCode);
      if (user.annCode) user.annLink = buildLink(user.annCode);
      if (user.activeCode) user.link = buildLink(user.activeCode);
    }

    for (const user of Object.values(annUsers)) {
      if (user.activeCode) user.link = buildLink(user.activeCode);
    }

    recalculateStatsFromMessages();
    saveData();

    console.log(`✅ Бот запущен: @${botUsername}`);
  } catch (error) {
    console.error("Ошибка запуска бота:", error.message);
    process.exit(1);
  }
}

startBot();