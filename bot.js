const fs = require("fs");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");

loadEnvFile();

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
const CONVERSATIONS_FILE = path.join(DATA_DIR, "conversations.json");
const BLOCKED_USERS_FILE = path.join(DATA_DIR, "blockedUsers.json");
const REACTIONS_FILE = path.join(DATA_DIR, "reactions.json");
const TELEGRAM_TEXT_LIMIT = 3900;
const REACTION_EMOJIS = ["❤️", "🔥", "😍", "🥰", "😘", "🌹", "👏", "😂", "😳", "👍"];

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
let conversations = [];
let blockedUsers = {};
let reactions = {};

const pendingAnonymousMessages = new Map();
const pendingReplies = new Map();
const pendingSupportMessages = new Map();

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  try {
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex === -1) continue;

      const key = trimmed.slice(0, equalsIndex).trim();
      let value = trimmed.slice(equalsIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch (error) {
    console.error("Ошибка чтения .env:", error.message);
  }
}

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
  loadConversations();
  blockedUsers = readJson(BLOCKED_USERS_FILE, {});
  reactions = readJson(REACTIONS_FILE, {});
  normalizeRuntimeData();
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

function loadConversations() {
  const data = readJson(CONVERSATIONS_FILE, []);
  conversations = Array.isArray(data) ? data : [];
}

function saveConversations() {
  writeJson(CONVERSATIONS_FILE, conversations);
}

function saveBlockedUsers() {
  writeJson(BLOCKED_USERS_FILE, blockedUsers);
}

function saveReactions() {
  writeJson(REACTIONS_FILE, reactions);
}

function saveData() {
  saveUsers();
  saveAnnUsers();
  saveMessages();
  saveAnswers();
  saveSupportMessages();
  saveStats();
  saveConversations();
  saveBlockedUsers();
  saveReactions();
}

function nowIso() {
  return new Date().toISOString();
}

function randomHex(length = 8) {
  let value = "";
  while (value.length < length) {
    value += Math.random().toString(16).slice(2);
  }
  return value.slice(0, length);
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${randomHex(4)}`;
}

function normalizeRuntimeData() {
  if (!Array.isArray(messages)) messages = [];
  if (!Array.isArray(answers)) answers = [];
  if (!Array.isArray(supportMessages)) supportMessages = [];
  if (!Array.isArray(conversations)) conversations = [];
  if (!blockedUsers || typeof blockedUsers !== "object" || Array.isArray(blockedUsers)) blockedUsers = {};
  if (!reactions || typeof reactions !== "object" || Array.isArray(reactions)) reactions = {};

  normalizeBlockedUsers();
  normalizeReactions();
  migrateConversationsFromMessages();
  normalizeConversationIdsForCallbackData();
}

function normalizeBlockedUsers() {
  const normalized = {};

  for (const [userId, list] of Object.entries(blockedUsers)) {
    const cleanList = Array.isArray(list) ? list : [];
    normalized[String(userId)] = [...new Set(cleanList.map((item) => String(item)))];
  }

  blockedUsers = normalized;
}

function normalizeReactions() {
  const normalized = {};
  const allowedEmoji = new Set(REACTION_EMOJIS);

  for (const [messageId, bucket] of Object.entries(reactions)) {
    if (!bucket || typeof bucket !== "object" || Array.isArray(bucket)) continue;

    normalized[messageId] = {};
    for (const [emoji, count] of Object.entries(bucket)) {
      if (!allowedEmoji.has(emoji)) continue;
      normalized[messageId][emoji] = Math.max(0, Number(count || 0));
    }
  }

  reactions = normalized;
}

function migrateConversationsFromMessages() {
  const conversationById = new Map();
  const originalToConversationId = new Map();

  conversations = conversations
    .filter((conversation) => conversation && conversation.id)
    .map((conversation) => {
      const normalizedConversation = {
        id: String(conversation.id),
        aliases: Array.isArray(conversation.aliases)
          ? conversation.aliases.map((item) => String(item)).filter(Boolean)
          : [],
        user1: Number(conversation.user1),
        user2: Number(conversation.user2),
        source: conversation.source || "start",
        senderId: conversation.senderId ? Number(conversation.senderId) : null,
        senderUsername: conversation.senderUsername || "",
        senderName: conversation.senderName || "",
        createdAt: conversation.createdAt || nowIso(),
        lastActivity: conversation.lastActivity || conversation.createdAt || nowIso(),
        messages: Array.isArray(conversation.messages) ? conversation.messages : [],
      };

      normalizedConversation.messages = normalizedConversation.messages
        .filter((item) => item && item.id)
        .map((item) => ({
          id: String(item.id),
          conversationId: String(item.conversationId || normalizedConversation.id),
          fromId: Number(item.fromId),
          toId: Number(item.toId),
          text: String(item.text || ""),
          contentType: item.contentType || "text",
          date: item.date || normalizedConversation.createdAt,
          telegramMessageId: item.telegramMessageId ? Number(item.telegramMessageId) : null,
        }))
        .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

      conversationById.set(normalizedConversation.id, normalizedConversation);
      return normalizedConversation;
    });

  for (const item of messages) {
    if (Object.prototype.hasOwnProperty.call(item, "canReply")) delete item.canReply;

    if (item.type === "anonymous_message") {
      let conversationId = item.conversationId;
      if (!conversationId || !conversationById.has(conversationId)) {
        conversationId = createId("conv");
        const conversation = {
          id: conversationId,
          aliases: [],
          user1: Number(item.senderId),
          user2: Number(item.receiverId),
          source: item.source || "start",
          senderId: Number(item.senderId),
          senderUsername: item.senderUsername || "",
          senderName: item.senderName || "",
          createdAt: item.date || nowIso(),
          lastActivity: item.date || nowIso(),
          messages: [],
        };
        conversations.push(conversation);
        conversationById.set(conversationId, conversation);
      }

      updateConversationSenderInfo(conversationById.get(conversationId), {
        source: item.source || "start",
        senderId: item.senderId,
        senderUsername: item.senderUsername,
        senderName: item.senderName,
      });

      item.conversationId = conversationId;
      originalToConversationId.set(item.id, conversationId);
      ensureConversationMessage(conversationById.get(conversationId), {
        id: item.id,
        conversationId,
        fromId: Number(item.senderId),
        toId: Number(item.receiverId),
        text: item.text || `[${item.contentType || "сообщение"}]`,
        contentType: item.contentType || "text",
        date: item.date || nowIso(),
        telegramMessageId: item.telegramMessageId || null,
      });
    }
  }

  for (const item of messages) {
    if (item.type !== "reply") continue;

    let conversationId = item.conversationId || originalToConversationId.get(item.originalMessageId);
    if (!conversationId || !conversationById.has(conversationId)) {
      conversationId = createId("conv");
      const conversation = {
        id: conversationId,
        aliases: [],
        user1: Number(item.fromId),
        user2: Number(item.toId),
        source: "start",
        senderId: Number(item.fromId),
        senderUsername: "",
        senderName: "",
        createdAt: item.date || nowIso(),
        lastActivity: item.date || nowIso(),
        messages: [],
      };
      conversations.push(conversation);
      conversationById.set(conversationId, conversation);
    }

    item.conversationId = conversationId;
    ensureConversationMessage(conversationById.get(conversationId), {
      id: item.id,
      conversationId,
      fromId: Number(item.fromId),
      toId: Number(item.toId),
      text: item.text || item.answerText || `[${item.contentType || "сообщение"}]`,
      contentType: item.contentType || "text",
      date: item.date || nowIso(),
      telegramMessageId: item.telegramMessageId || null,
    });
  }

  conversations.sort((a, b) => new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0));
}

function normalizeConversationIdsForCallbackData() {
  const usedIds = new Set(conversations.map((conversation) => String(conversation.id)));
  const idMap = new Map();

  for (const conversation of conversations) {
    const currentId = String(conversation.id);
    if (!Array.isArray(conversation.aliases)) conversation.aliases = [];
    if (currentId.length <= 20) continue;

    let newId;
    do {
      newId = createId("conv");
    } while (usedIds.has(newId));

    usedIds.delete(currentId);
    usedIds.add(newId);
    idMap.set(currentId, newId);
    if (!conversation.aliases.includes(currentId)) conversation.aliases.push(currentId);
    conversation.id = newId;
  }

  if (!idMap.size) return;

  for (const conversation of conversations) {
    if (!Array.isArray(conversation.messages)) conversation.messages = [];
    for (const message of conversation.messages) {
      const mappedConversationId = idMap.get(String(message.conversationId));
      if (mappedConversationId) message.conversationId = mappedConversationId;
    }
  }

  for (const item of messages) {
    const mappedConversationId = idMap.get(String(item.conversationId || ""));
    if (mappedConversationId) item.conversationId = mappedConversationId;
  }

  for (const item of answers) {
    const mappedConversationId = idMap.get(String(item.conversationId || ""));
    if (mappedConversationId) item.conversationId = mappedConversationId;
  }
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
    code = randomHex(10);
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

function getStoredMessageText(msg) {
  const contentType = getContentType(msg);
  const text = truncateText(getMessageText(msg), 2500);
  return text || `[${contentType}]`;
}

function isTextMessage(msg) {
  return getContentType(msg) === "text" && typeof msg.text === "string" && !msg.text.startsWith("/");
}

async function sendTextOnlyWarning(chatId) {
  await safeSendMessage(
    chatId,
    "❌ Можно отправлять только текстовые сообщения.\n\n📝 Напишите сообщение текстом."
  );
}

function normalizeUsername(username) {
  if (!username || username === "нет username") return "нет username";
  return String(username).startsWith("@") ? String(username) : `@${username}`;
}

function updateConversationSenderInfo(conversation, info = {}) {
  if (!conversation) return;

  const source = info.source || conversation.source || "start";
  conversation.source = source;

  if (info.senderId || !conversation.senderId) {
    conversation.senderId = info.senderId ? Number(info.senderId) : conversation.senderId || null;
  }

  if (info.senderUsername || !conversation.senderUsername) {
    conversation.senderUsername = normalizeUsername(info.senderUsername || conversation.senderUsername);
  }

  if (info.senderName || !conversation.senderName) {
    conversation.senderName = info.senderName || conversation.senderName || "";
  }
}

function isAnnConversation(conversation) {
  return conversation && conversation.source === "ann";
}

function getConversationSenderInfo(conversation) {
  const senderId = conversation && conversation.senderId ? String(conversation.senderId) : "";
  const user = senderId ? users[senderId] : null;

  return {
    id: senderId || "—",
    username: normalizeUsername(conversation.senderUsername || (user && user.username) || ""),
    name:
      conversation.senderName ||
      (user ? [user.first_name, user.last_name].filter(Boolean).join(" ") : "") ||
      "—",
  };
}

function formatConversationSenderBlock(conversation) {
  if (!isAnnConversation(conversation)) return "";

  const sender = getConversationSenderInfo(conversation);
  return `👤 Отправитель\nID: ${sender.id}\nUsername: ${sender.username}\nИмя: ${sender.name}`;
}

function createConversation(user1, user2, options = {}) {
  const date = nowIso();
  const conversation = {
    id: createId("conv"),
    aliases: [],
    user1: Number(user1),
    user2: Number(user2),
    source: options.source || "start",
    senderId: options.senderId ? Number(options.senderId) : Number(user1),
    senderUsername: normalizeUsername(options.senderUsername || ""),
    senderName: options.senderName || "",
    createdAt: date,
    lastActivity: date,
    messages: [],
  };

  conversations.push(conversation);
  return conversation;
}

function ensureConversationMessage(conversation, message) {
  if (!conversation) return null;
  if (!Array.isArray(conversation.messages)) conversation.messages = [];

  const existing = conversation.messages.find((item) => item.id === String(message.id));
  const normalized = {
    id: String(message.id),
    conversationId: String(message.conversationId || conversation.id),
    fromId: Number(message.fromId),
    toId: Number(message.toId),
    text: String(message.text || ""),
    contentType: message.contentType || "text",
    date: message.date || nowIso(),
    telegramMessageId:
      message.telegramMessageId !== undefined && message.telegramMessageId !== null
        ? Number(message.telegramMessageId)
        : existing && existing.telegramMessageId
          ? Number(existing.telegramMessageId)
          : null,
  };

  if (existing) {
    Object.assign(existing, normalized);
  } else {
    conversation.messages.push(normalized);
  }

  const currentActivity = new Date(conversation.lastActivity || 0).getTime();
  const messageActivity = new Date(normalized.date || 0).getTime();
  if (!conversation.lastActivity || messageActivity >= currentActivity) {
    conversation.lastActivity = normalized.date;
  }

  conversation.messages.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  return normalized;
}

function findConversation(conversationId) {
  const id = String(conversationId || "");
  if (!id) return null;

  return (
    conversations.find((conversation) => {
      if (String(conversation.id) === id) return true;
      return Array.isArray(conversation.aliases) && conversation.aliases.map(String).includes(id);
    }) || null
  );
}

function findConversationByMessageId(messageId) {
  const id = String(messageId || "");
  if (!id) return null;

  return (
    conversations.find((conversation) => {
      return (
        Array.isArray(conversation.messages) &&
        conversation.messages.some((message) => String(message.id) === id)
      );
    }) || null
  );
}

function findConversationByTelegramMessage(query) {
  if (!query || !query.message || !query.from) return null;

  const telegramMessageId = String(query.message.message_id);
  const userId = String(query.from.id);

  return (
    conversations.find((conversation) => {
      return (
        Array.isArray(conversation.messages) &&
        conversation.messages.some((message) => {
          return (
            String(message.toId) === userId &&
            message.telegramMessageId !== null &&
            message.telegramMessageId !== undefined &&
            String(message.telegramMessageId) === telegramMessageId
          );
        })
      );
    }) || null
  );
}

function resolveConversationForCallback(conversationId, query, messageId = "") {
  return (
    findConversation(conversationId) ||
    findConversationByMessageId(messageId) ||
    findConversationByTelegramMessage(query)
  );
}

function isConversationParticipant(conversation, userId) {
  return (
    conversation &&
    (String(conversation.user1) === String(userId) || String(conversation.user2) === String(userId))
  );
}

function getOtherConversationUserId(conversation, userId) {
  if (!conversation) return "";
  if (String(conversation.user1) === String(userId)) return String(conversation.user2);
  if (String(conversation.user2) === String(userId)) return String(conversation.user1);
  return "";
}

function hasBlocked(userId, targetId) {
  const list = blockedUsers[String(userId)];
  return Array.isArray(list) && list.includes(String(targetId));
}

function isCommunicationBlocked(user1, user2) {
  return hasBlocked(user1, user2) || hasBlocked(user2, user1);
}

function blockUser(userId, targetId) {
  const id = String(userId);
  const target = String(targetId);
  if (!blockedUsers[id]) blockedUsers[id] = [];
  if (!blockedUsers[id].includes(target)) blockedUsers[id].push(target);
  saveBlockedUsers();
}

function unblockUser(userId, targetId) {
  const id = String(userId);
  const target = String(targetId);
  if (!Array.isArray(blockedUsers[id])) return;
  blockedUsers[id] = blockedUsers[id].filter((item) => item !== target);
  if (!blockedUsers[id].length) delete blockedUsers[id];
  saveBlockedUsers();
}

function getReactionCount(messageId, emoji) {
  return Number((reactions[String(messageId)] || {})[emoji] || 0);
}

function addReaction(messageId, emoji) {
  const id = String(messageId);
  if (!reactions[id]) reactions[id] = {};
  reactions[id][emoji] = getReactionCount(id, emoji) + 1;
  saveReactions();
}

function getMessageReactionTotal(messageId) {
  const bucket = reactions[String(messageId)] || {};
  return Object.values(bucket).reduce((sum, count) => sum + Number(count || 0), 0);
}

function getTotalReactionCount() {
  return Object.values(reactions).reduce((total, bucket) => {
    if (!bucket || typeof bucket !== "object") return total;
    return total + Object.values(bucket).reduce((sum, count) => sum + Number(count || 0), 0);
  }, 0);
}

function getTotalBlockCount() {
  return Object.values(blockedUsers).reduce((sum, list) => {
    return sum + (Array.isArray(list) ? list.length : 0);
  }, 0);
}

function getConversationMessagesTotal() {
  return conversations.reduce((sum, conversation) => {
    return sum + (Array.isArray(conversation.messages) ? conversation.messages.length : 0);
  }, 0);
}

function getLatestInboundConversationMessage(conversation, userId) {
  if (!conversation || !Array.isArray(conversation.messages)) return null;

  return (
    conversation.messages
      .slice()
      .reverse()
      .find((message) => String(message.toId) === String(userId)) || null
  );
}

function findConversationMessageForCallback(query, conversation) {
  if (!query || !query.message || !conversation || !Array.isArray(conversation.messages)) return null;

  const telegramMessageId = String(query.message.message_id);
  const userId = String(query.from.id);

  return (
    conversation.messages.find(
      (message) =>
        String(message.toId) === userId &&
        message.telegramMessageId !== null &&
        message.telegramMessageId !== undefined &&
        String(message.telegramMessageId) === telegramMessageId
    ) || getLatestInboundConversationMessage(conversation, userId)
  );
}

function setConversationMessageTelegramId(conversation, messageId, telegramMessageId) {
  if (!conversation || !telegramMessageId) return;
  const message = Array.isArray(conversation.messages)
    ? conversation.messages.find((item) => item.id === String(messageId))
    : null;

  if (message) {
    message.telegramMessageId = Number(telegramMessageId);
  }
}

function deleteConversation(conversationId) {
  const conversation = findConversation(conversationId);
  if (!conversation) return false;
  const conversationIds = new Set([String(conversation.id)]);
  if (Array.isArray(conversation.aliases)) {
    for (const alias of conversation.aliases) conversationIds.add(String(alias));
  }

  const messageIds = new Set(
    (Array.isArray(conversation.messages) ? conversation.messages : []).map((message) => String(message.id))
  );

  conversations = conversations.filter((item) => !conversationIds.has(String(item.id)));
  messages = messages.filter((item) => {
    return !conversationIds.has(String(item.conversationId || "")) && !messageIds.has(String(item.id));
  });
  answers = answers.filter((item) => {
    return !conversationIds.has(String(item.conversationId || "")) && !messageIds.has(String(item.id));
  });

  for (const messageId of messageIds) {
    delete reactions[messageId];
  }

  saveData();
  return true;
}

function conversationMessageKeyboard(conversationId, viewerId, messageId = "") {
  const conversation = findConversation(conversationId);
  const otherId = conversation ? getOtherConversationUserId(conversation, viewerId) : "";
  const isBlockedByViewer = otherId ? hasBlocked(viewerId, otherId) : false;
  const blockText = isBlockedByViewer ? "🔓 Разблокировать" : "🚫 Заблокировать";
  const blockCallback = isBlockedByViewer ? `unblock:${conversationId}` : `block:${conversationId}`;

  return {
    inline_keyboard: [
      [
        { text: "💬 Ответить", callback_data: `reply_conv:${conversationId}` },
        { text: "🎭 Реакция", callback_data: `reaction_menu:${conversationId}` },
      ],
      [{ text: "📜 История", callback_data: `history:${conversationId}` }],
      [
        { text: blockText, callback_data: blockCallback },
        { text: "🗑 Удалить диалог", callback_data: `delete_dialog:${conversationId}` },
      ],
    ],
  };
}

function reactionMenuKeyboard(conversationId, messageId) {
  return {
    inline_keyboard: [
      REACTION_EMOJIS.slice(0, 5).map((emoji) => ({
        text: emoji,
        callback_data: `reaction:${conversationId}:${messageId}:${emoji}`,
      })),
      REACTION_EMOJIS.slice(5).map((emoji) => ({
        text: emoji,
        callback_data: `reaction:${conversationId}:${messageId}:${emoji}`,
      })),
    ],
  };
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
      [{ text: "📂 Диалоги", callback_data: "admin_conversations" }],
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

async function safeEditMessageReplyMarkup(chatId, messageId, replyMarkup) {
  try {
    await bot.editMessageReplyMarkup(replyMarkup, {
      chat_id: chatId,
      message_id: messageId,
    });
    return true;
  } catch (error) {
    console.error("editMessageReplyMarkup error:", error.message);
    return false;
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

  if (isCommunicationBlocked(from.id, receiver.id)) {
    await safeSendMessage(
      chatId,
      hasBlocked(from.id, receiver.id)
        ? "🚫 Вы заблокировали этого собеседника. Разблокируйте его в истории диалога, чтобы написать снова."
        : "🚫 Этот собеседник сейчас недоступен для сообщений."
    );
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
  const userConversations = conversations.filter((conversation) => isConversationParticipant(conversation, from.id));
  const userConversationMessages = userConversations.reduce((sum, conversation) => {
    return sum + conversation.messages.filter((item) => String(item.fromId) === String(from.id)).length;
  }, 0);
  const userReactionCount = userConversations.reduce((sum, conversation) => {
    return (
      sum +
      conversation.messages
        .filter((item) => String(item.fromId) === String(from.id))
        .reduce((messageSum, item) => {
          const bucket = reactions[item.id] || {};
          return messageSum + Object.values(bucket).reduce((countSum, count) => countSum + Number(count || 0), 0);
        }, 0)
    );
  }, 0);
  const blockedCount = Array.isArray(blockedUsers[String(from.id)]) ? blockedUsers[String(from.id)].length : 0;
  saveStats();

  await safeSendMessage(
    chatId,
    `📊 Статистика\n\n` +
      `👥 Перешли по ссылке: ${userStats.linkClicks}\n` +
      `💌 Получено сообщений: ${userStats.messagesReceived}\n` +
      `📨 Отправлено сообщений: ${userStats.messagesSent}\n` +
      `✍️ Отправлено ответов: ${userStats.repliesSent}\n` +
      `💬 Получено ответов: ${userStats.repliesReceived}\n\n` +
      `💬 Всего диалогов: ${userConversations.length}\n` +
      `💌 Всего сообщений в диалогах: ${userConversationMessages}\n` +
      `🎭 Реакций на ваши сообщения: ${userReactionCount}\n` +
      `🚫 Заблокировано собеседников: ${blockedCount}`
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
        const conversation = findConversation(item.conversationId);
        const sender = conversation && isAnnConversation(conversation)
          ? getConversationSenderInfo(conversation)
          : {
              id: item.senderId,
              username: normalizeUsername(item.senderUsername || ""),
              name: item.senderName || "—",
            };
        const text = item.text || `[${item.contentType || "сообщение"}]`;
        return `${index + 1}. 👤 Отправитель:\n   ID: ${sender.id}\n   Username: ${sender.username}\n   Имя: ${sender.name}\n   💬 Сообщение: ${text}\n   📅 Дата: ${formatDate(item.date)}\n   💬 Диалог: ${item.conversationId || "—"}`;
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

  if (!isTextMessage(msg)) {
    await sendTextOnlyWarning(msg.chat.id);
    return;
  }

  const username = msg.from.username ? `@${msg.from.username}` : "нет username";
  const name = getDisplayName(msg.from);
  const text = truncateText(getMessageText(msg), 2500);
  const contentType = "text";

  if (!OWNER_ID) {
    pendingSupportMessages.delete(userId);
    await safeSendMessage(msg.chat.id, "❌ Поддержка временно недоступна.");
    return;
  }

  const supportRecord = {
    id: createId("support"),
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

  if (isCommunicationBlocked(senderId, receiverId)) {
    pendingAnonymousMessages.delete(senderId);
    await safeSendMessage(
      msg.chat.id,
      hasBlocked(senderId, receiverId)
        ? "🚫 Вы заблокировали этого собеседника. Сначала разблокируйте его, чтобы написать снова."
        : "🚫 Этот собеседник сейчас недоступен для сообщений."
    );
    return;
  }

  if (!isTextMessage(msg)) {
    await sendTextOnlyWarning(msg.chat.id);
    return;
  }

  const contentType = "text";
  const text = getStoredMessageText(msg);
  const messageId = createId("msg");
  const conversation = createConversation(senderId, receiverId, {
    source: state.source || "start",
    senderId: Number(senderId),
    senderUsername,
    senderName,
  });
  const date = nowIso();
  const conversationMessage = ensureConversationMessage(conversation, {
    id: messageId,
    conversationId: conversation.id,
    fromId: Number(senderId),
    toId: Number(receiverId),
    text,
    contentType,
    date,
  });

  let sentToReceiver = null;
  const messageKeyboard = conversationMessageKeyboard(conversation.id, receiverId, conversationMessage.id);
  const senderInfoBlock = formatConversationSenderBlock(conversation);
  const receiverText =
    `💌 Новое анонимное сообщение\n\n` +
    `💬 Сообщение:\n${text}` +
    (senderInfoBlock ? `\n\n${senderInfoBlock}` : "");

  sentToReceiver = await safeSendMessage(receiverId, receiverText, {
    reply_markup: messageKeyboard,
  });

  if (sentToReceiver) {
    setConversationMessageTelegramId(conversation, conversationMessage.id, sentToReceiver.message_id);
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
    senderInfoVisible: isAnnConversation(conversation),
    conversationId: conversation.id,
    date,
    status: sentToReceiver ? "sent" : "error",
    telegramMessageId: sentToReceiver ? sentToReceiver.message_id : null,
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
  const conversation = findConversation(state.conversationId);

  if (!conversation) {
    pendingReplies.delete(fromId);
    await safeSendMessage(msg.chat.id, "❌ Диалог уже удалён или недоступен.");
    return;
  }

  const original = getLatestInboundConversationMessage(conversation, fromId);

  if (!original) {
    pendingReplies.delete(fromId);
    await safeSendMessage(msg.chat.id, "❌ Нет входящего сообщения для ответа.");
    return;
  }

  if (!isConversationParticipant(conversation, fromId) && !isOwner(fromId)) {
    pendingReplies.delete(fromId);
    await safeSendMessage(msg.chat.id, "⛔ У вас нет доступа.");
    return;
  }

  if (String(original.toId) !== fromId && !isOwner(fromId)) {
    pendingReplies.delete(fromId);
    await safeSendMessage(msg.chat.id, "⛔ Отвечать можно только на сообщение, которое пришло вам.");
    return;
  }

  const toId = String(original.fromId);

  if (isCommunicationBlocked(fromId, toId)) {
    pendingReplies.delete(fromId);
    await safeSendMessage(
      msg.chat.id,
      hasBlocked(fromId, toId)
        ? "🚫 Вы заблокировали этого собеседника. Нажмите «🔓 Разблокировать» под сообщением, чтобы продолжить диалог."
        : "🚫 Этот собеседник заблокировал диалог. Сообщение не отправлено."
    );
    return;
  }

  if (!isTextMessage(msg)) {
    await sendTextOnlyWarning(msg.chat.id);
    return;
  }

  const contentType = "text";
  const answerText = getStoredMessageText(msg);
  const questionText = original.text || `[${original.contentType || "сообщение"}]`;
  const replyId = createId("msg");
  const date = nowIso();
  const conversationMessage = ensureConversationMessage(conversation, {
    id: replyId,
    conversationId: conversation.id,
    fromId: Number(fromId),
    toId: Number(toId),
    text: answerText,
    contentType,
    date,
  });
  const messageKeyboard = conversationMessageKeyboard(conversation.id, toId, conversationMessage.id);
  const senderInfoBlock = formatConversationSenderBlock(conversation);

  const beautifulReplyText =
    `💌 Новое сообщение в анонимном диалоге\n\n` +
    (senderInfoBlock ? `${senderInfoBlock}\n\n` : "") +
    `↩️ Ответ на:\n` +
    `${truncateText(questionText, 800)}\n\n` +
    `💬 Собеседник:\n` +
    `${answerText}`;

  let sentToReceiver = null;

  sentToReceiver = await safeSendMessage(toId, beautifulReplyText, {
    reply_markup: messageKeyboard,
  });

  if (sentToReceiver) {
    setConversationMessageTelegramId(conversation, conversationMessage.id, sentToReceiver.message_id);
  }

  const reply = {
    id: replyId,
    type: "reply",
    conversationId: conversation.id,
    replyToMessageId: original.id,
    questionText,
    answerText,
    fromId: Number(fromId),
    toId: Number(toId),
    text: answerText,
    contentType,
    date,
    status: sentToReceiver ? "sent" : "error",
    telegramMessageId: sentToReceiver ? sentToReceiver.message_id : null,
  };

  const legacyOriginal = messages.find((item) => item.id === original.id);
  if (legacyOriginal) {
    if (!Array.isArray(legacyOriginal.replies)) legacyOriginal.replies = [];
    if (!Array.isArray(legacyOriginal.answers)) legacyOriginal.answers = [];
  }

  const answerRecord = {
    id: replyId,
    questionMessageId: original.id,
    conversationId: conversation.id,
    questionText,
    answerText,
    answeredBy: Number(fromId),
    sentTo: Number(toId),
    date: reply.date,
    status: reply.status,
  };

  if (legacyOriginal) {
    legacyOriginal.replies.push(replyId);
    legacyOriginal.answers.push(answerRecord);
  }

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

function formatConversationMessageLine(message, viewerId, index, isAdminView = false, conversation = null) {
  const text = truncateText(message.text || `[${message.contentType || "сообщение"}]`, isAdminView ? 1200 : 700);
  const date = formatDate(message.date);
  const senderInfoBlock = formatConversationSenderBlock(conversation);

  if (isAdminView) {
    return (
      `${index}. ${date}\n` +
      `   👤 От: ${getUserShortInfo(message.fromId)}\n` +
      `   👥 Кому: ${getUserShortInfo(message.toId)}\n` +
      (senderInfoBlock ? `   ${senderInfoBlock.replace(/\n/g, "\n   ")}\n` : "") +
      `   💬 ${text}`
    );
  }

  const author = String(message.fromId) === String(viewerId) ? "Вы" : "Собеседник";
  return `${index}. ${author} • ${date}\n${senderInfoBlock ? `${senderInfoBlock}\n` : ""}💬 ${text}`;
}

function formatConversationHistory(conversation, viewerId, options = {}) {
  const isAdminView = Boolean(options.admin);
  const limit = options.limit || 50;
  const allMessages = Array.isArray(conversation.messages) ? conversation.messages : [];
  const selectedMessages = isAdminView ? allMessages : allMessages.slice(-limit);
  const header = isAdminView
    ? `📂 Диалог ${conversation.id}\n\n` +
      `👤 Участник 1: ${getUserShortInfo(conversation.user1)}\n` +
      `👤 Участник 2: ${getUserShortInfo(conversation.user2)}\n` +
      `💌 Сообщений: ${allMessages.length}\n` +
      `🕒 Создан: ${formatDate(conversation.createdAt)}\n` +
      `🕒 Активность: ${formatDate(conversation.lastActivity)}`
    : `📜 История диалога\n\n💌 Последние ${Math.min(limit, allMessages.length)} сообщений`;

  const body = selectedMessages.length
    ? selectedMessages
        .map((message, index) => {
          return formatConversationMessageLine(message, viewerId, index + 1, isAdminView, conversation);
        })
        .join("\n\n")
    : "Сообщений пока нет.";

  return `${header}\n\n${body}`;
}

async function showConversationHistory(chatId, from, conversationId) {
  const conversation = findConversation(conversationId);

  if (!conversation) {
    await safeSendMessage(chatId, "❌ Диалог уже удалён или недоступен.");
    return;
  }

  if (!isConversationParticipant(conversation, from.id) && !isOwner(from.id)) {
    await safeSendMessage(chatId, "⛔ У вас нет доступа к этому диалогу.");
    return;
  }

  await safeSendLongMessage(chatId, formatConversationHistory(conversation, from.id, { limit: 50 }));
}

async function showConversationHistoryFromCallback(chatId, from, conversationId, query) {
  const conversation = resolveConversationForCallback(conversationId, query);

  if (!conversation) {
    await safeSendMessage(chatId, "❌ История недоступна: диалог не найден.");
    return;
  }

  if (!isConversationParticipant(conversation, from.id) && !isOwner(from.id)) {
    await safeSendMessage(chatId, "⛔ У вас нет доступа к этому диалогу.");
    return;
  }

  await safeSendLongMessage(chatId, formatConversationHistory(conversation, from.id, { limit: 50 }));
}

function buildAdminConversationsKeyboard(limit = 20) {
  const keyboard = conversations
    .slice()
    .sort((a, b) => new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0))
    .slice(0, limit)
    .map((conversation, index) => {
      const count = Array.isArray(conversation.messages) ? conversation.messages.length : 0;
      return [
        {
          text: `${index + 1}. ${conversation.user1} ↔ ${conversation.user2} • ${count}`,
          callback_data: `admin_conv:${conversation.id}`,
        },
      ];
    });

  keyboard.push([{ text: "🔙 Назад", callback_data: "admin_back" }]);
  return { inline_keyboard: keyboard };
}

async function showAdminConversations(chatId, from, messageId = null) {
  if (!isOwner(from.id)) return safeSendMessage(chatId, "⛔ У вас нет доступа.");

  const participants = new Set();
  for (const conversation of conversations) {
    participants.add(String(conversation.user1));
    participants.add(String(conversation.user2));
  }

  const text =
    `📂 Диалоги\n\n` +
    `💬 Всего диалогов: ${conversations.length}\n` +
    `👥 Участников: ${participants.size}\n` +
    `💌 Сообщений: ${getConversationMessagesTotal()}\n\n` +
    `Выберите диалог, чтобы открыть всю историю:`;

  const options = { reply_markup: buildAdminConversationsKeyboard() };

  if (messageId) {
    await safeEditMessageText(chatId, messageId, text, options);
    return;
  }

  await safeSendMessage(chatId, text, options);
}

async function showAdminConversationDetails(chatId, from, conversationId, messageId = null) {
  if (!isOwner(from.id)) return safeSendMessage(chatId, "⛔ У вас нет доступа.");

  const conversation = findConversation(conversationId);
  if (!conversation) {
    await safeSendMessage(chatId, "❌ Диалог уже удалён или недоступен.");
    return;
  }

  const options = {
    reply_markup: {
      inline_keyboard: [[{ text: "🔙 К диалогам", callback_data: "admin_conversations" }]],
    },
  };
  const text = formatConversationHistory(conversation, from.id, { admin: true });

  if (messageId) {
    await safeEditMessageText(chatId, messageId, text, options);
    return;
  }

  await safeSendLongMessage(chatId, text, options);
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
        return `ID: ${item.id}\nДиалог: ${item.conversationId || "—"}\nТип: ответ\nОтправитель: ${item.fromId}\nПолучатель: ${item.toId}\nТекст: ${item.text || "—"}\nДата: ${formatDate(item.date)}`;
      }

      return `ID: ${item.id}\nДиалог: ${item.conversationId || "—"}\nТип: анонимное сообщение\nОтправитель: ${item.senderId}\nПолучатель: ${item.receiverId}\nТекст: ${item.text || "—"}\nДата: ${formatDate(item.date)}`;
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
  const totalDialogMessages = getConversationMessagesTotal();
  const totalReactions = getTotalReactionCount();
  const totalBlocks = getTotalBlockCount();

  await safeSendMessage(
    chatId,
    `📊 Общая статистика\n\n` +
      `👥 Всего пользователей: ${Object.keys(users).length}\n` +
      `🤖 Пользователей /annstart: ${Object.keys(annUsers).length}\n` +
      `💌 Анонимных сообщений: ${totalAnonymous}\n` +
      `✍️ Ответов: ${totalReplies}\n` +
      `🔗 Переходов по ссылкам: ${totalClicks}\n\n` +
      `💬 Всего диалогов: ${conversations.length}\n` +
      `💌 Всего сообщений: ${totalDialogMessages}\n` +
      `🎭 Всего реакций: ${totalReactions}\n` +
      `🚫 Всего блокировок: ${totalBlocks}`
  );
}

async function exportJson(chatId, from) {
  if (!isOwner(from.id)) return safeSendMessage(chatId, "⛔ У вас нет доступа.");

  const files = [
    USERS_FILE,
    ANN_USERS_FILE,
    MESSAGES_FILE,
    ANSWERS_FILE,
    SUPPORT_FILE,
    STATS_FILE,
    CONVERSATIONS_FILE,
    BLOCKED_USERS_FILE,
    REACTIONS_FILE,
  ];
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

bot.onText(/^\/support$/, async (msg) => {
  try {
    await startSupport(msg.chat.id, msg.from);
  } catch (error) {
    console.error("/support error:", error.message);
    await safeSendMessage(msg.chat.id, "❌ Произошла ошибка. Попробуйте позже.");
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

    if (data && data.startsWith("reply_conv:")) {
      const conversationId = data.slice("reply_conv:".length);
      const conversation = resolveConversationForCallback(conversationId, query);

      if (!conversation) {
        await safeSendMessage(chatId, "❌ Диалог уже удалён или недоступен.");
        return;
      }

      if (!isConversationParticipant(conversation, from.id)) {
        await safeSendMessage(chatId, "⛔ У вас нет доступа.");
        return;
      }

      const message = getLatestInboundConversationMessage(conversation, from.id);
      if (!message || String(message.toId) !== String(from.id)) {
        await safeSendMessage(chatId, "❌ Нет входящего сообщения для ответа.");
        return;
      }

      if (isCommunicationBlocked(from.id, message.fromId)) {
        await safeSendMessage(
          chatId,
          hasBlocked(from.id, message.fromId)
            ? "🚫 Вы заблокировали этого собеседника. Нажмите «🔓 Разблокировать», чтобы продолжить."
            : "🚫 Этот собеседник заблокировал диалог. Ответить нельзя."
        );
        return;
      }

      pendingAnonymousMessages.delete(String(from.id));
      pendingSupportMessages.delete(String(from.id));

      pendingReplies.set(String(from.id), {
        conversationId: conversation.id,
        createdAt: Date.now(),
      });

      await safeSendMessage(chatId, "✍️ Напишите ответ на это сообщение.\n\nЧтобы отменить действие, отправьте /cancel.");
      return;
    }

    if (data && data.startsWith("reaction_menu:")) {
      const conversationId = data.slice("reaction_menu:".length);
      const conversation = resolveConversationForCallback(conversationId, query);

      if (!conversation) {
        await safeSendMessage(chatId, "❌ Диалог уже удалён или недоступен.");
        return;
      }

      if (!isConversationParticipant(conversation, from.id)) {
        await safeSendMessage(chatId, "⛔ У вас нет доступа.");
        return;
      }

      const message = findConversationMessageForCallback(query, conversation);
      if (!message || String(message.toId) !== String(from.id)) {
        await safeSendMessage(chatId, "❌ Сообщение для реакции не найдено.");
        return;
      }

      await safeEditMessageReplyMarkup(chatId, query.message.message_id, reactionMenuKeyboard(conversation.id, message.id));
      return;
    }

    if (data && data.startsWith("reaction:")) {
      const parts = data.split(":");
      const conversationId = parts[1];
      const messageIdForReaction = parts[2];
      const emoji = parts.slice(3).join(":");
      const conversation = resolveConversationForCallback(conversationId, query, messageIdForReaction);

      if (!conversation) {
        await safeSendMessage(chatId, "❌ Диалог уже удалён или недоступен.");
        return;
      }

      const message = Array.isArray(conversation.messages)
        ? conversation.messages.find((item) => item.id === String(messageIdForReaction))
        : null;

      if (!REACTION_EMOJIS.includes(emoji) || !message) {
        await safeSendMessage(chatId, "❌ Сообщение для реакции не найдено.");
        return;
      }

      if (!isConversationParticipant(conversation, from.id) || String(message.toId) !== String(from.id)) {
        await safeSendMessage(chatId, "⛔ У вас нет доступа.");
        return;
      }

      if (isCommunicationBlocked(from.id, message.fromId)) {
        await safeSendMessage(chatId, "🚫 Диалог заблокирован. Реакцию отправить нельзя.");
        return;
      }

      addReaction(message.id, emoji);
      await safeEditMessageReplyMarkup(
        chatId,
        query.message.message_id,
        conversationMessageKeyboard(conversation.id, from.id, message.id)
      );

      await safeSendMessage(
        message.fromId,
        `🎭 На ваше сообщение отреагировали\n\n💬 Ваше сообщение:\n${truncateText(message.text, 1200)}\n\n${emoji}`
      );
      return;
    }

    if (data && data.startsWith("block:")) {
      const conversationId = data.slice("block:".length);
      const conversation = resolveConversationForCallback(conversationId, query);

      if (!conversation) {
        await safeSendMessage(chatId, "❌ Диалог уже удалён или недоступен.");
        return;
      }

      if (!isConversationParticipant(conversation, from.id)) {
        await safeSendMessage(chatId, "⛔ У вас нет доступа.");
        return;
      }

      const otherId = getOtherConversationUserId(conversation, from.id);
      if (!otherId) {
        await safeSendMessage(chatId, "❌ Собеседник не найден.");
        return;
      }

      if (hasBlocked(from.id, otherId)) {
        await safeEditMessageReplyMarkup(
          chatId,
          query.message.message_id,
          conversationMessageKeyboard(conversation.id, from.id)
        );
        await safeSendMessage(chatId, "🚫 Вы уже заблокировали этого собеседника.");
        return;
      }

      blockUser(from.id, otherId);
      pendingReplies.delete(String(from.id));
      await safeEditMessageReplyMarkup(
        chatId,
        query.message.message_id,
        conversationMessageKeyboard(conversation.id, from.id)
      );
      await safeSendMessage(chatId, "🚫 Вы заблокировали этого собеседника");
      return;
    }

    if (data && data.startsWith("unblock:")) {
      const conversationId = data.slice("unblock:".length);
      const conversation = resolveConversationForCallback(conversationId, query);

      if (!conversation) {
        await safeSendMessage(chatId, "❌ Диалог уже удалён или недоступен.");
        return;
      }

      if (!isConversationParticipant(conversation, from.id)) {
        await safeSendMessage(chatId, "⛔ У вас нет доступа.");
        return;
      }

      const otherId = getOtherConversationUserId(conversation, from.id);
      if (!otherId) {
        await safeSendMessage(chatId, "❌ Собеседник не найден.");
        return;
      }

      unblockUser(from.id, otherId);
      await safeEditMessageReplyMarkup(
        chatId,
        query.message.message_id,
        conversationMessageKeyboard(conversation.id, from.id)
      );
      await safeSendMessage(chatId, "🔓 Собеседник разблокирован. Диалог снова доступен.");
      return;
    }

    if (data && data.startsWith("delete_dialog:")) {
      const conversationId = data.slice("delete_dialog:".length);
      const conversation = resolveConversationForCallback(conversationId, query);

      if (!conversation) {
        await safeSendMessage(chatId, "🗑 Диалог уже удалён.");
        return;
      }

      if (!isConversationParticipant(conversation, from.id) && !isOwner(from.id)) {
        await safeSendMessage(chatId, "⛔ У вас нет доступа.");
        return;
      }

      deleteConversation(conversation.id);
      pendingReplies.delete(String(from.id));
      await safeEditMessageReplyMarkup(chatId, query.message.message_id, { inline_keyboard: [] });
      await safeSendMessage(chatId, "🗑 Диалог удалён.");
      return;
    }

    if (data && data.startsWith("history:")) {
      const conversationId = data.slice("history:".length);
      return showConversationHistoryFromCallback(chatId, from, conversationId, query);
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
    if (data === "admin_conversations") return showAdminConversations(chatId, from, messageId);
    if (data && data.startsWith("admin_conv:")) {
      const conversationId = data.split(":")[1];
      return showAdminConversationDetails(chatId, from, conversationId, messageId);
    }
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
