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

const LEGACY_DATA_DIR = __dirname;
const DATA_DIR = path.resolve(process.env.BOT_DATA_DIR || path.join(__dirname, "data"));
ensureDataDirectory(DATA_DIR);

const MEDIA_DIR = path.join(__dirname, "media");
const MEDIA_PHOTOS_DIR = path.join(MEDIA_DIR, "photos");
const MEDIA_VIDEOS_DIR = path.join(MEDIA_DIR, "videos");
const MEDIA_VOICES_DIR = path.join(MEDIA_DIR, "voices");
const MEDIA_DOCUMENTS_DIR = path.join(MEDIA_DIR, "documents");
const MEDIA_STICKERS_DIR = path.join(MEDIA_DIR, "stickers");
const MEDIA_TEMP_DIR = path.join(MEDIA_DIR, "temp");
[
  MEDIA_PHOTOS_DIR,
  MEDIA_VIDEOS_DIR,
  MEDIA_VOICES_DIR,
  MEDIA_DOCUMENTS_DIR,
  MEDIA_STICKERS_DIR,
  MEDIA_TEMP_DIR,
].forEach(ensureDataDirectory);

const USERS_FILE = path.join(DATA_DIR, "users.json");
const ANN_USERS_FILE = path.join(DATA_DIR, "annUsers.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");
const ANSWERS_FILE = path.join(DATA_DIR, "answers.json");
const SUPPORT_FILE = path.join(DATA_DIR, "support.json");
const STATS_FILE = path.join(DATA_DIR, "stats.json");
const CONVERSATIONS_FILE = path.join(DATA_DIR, "conversations.json");
const BLOCKED_USERS_FILE = path.join(DATA_DIR, "blockedUsers.json");
const REACTIONS_FILE = path.join(DATA_DIR, "reactions.json");
const ADMIN_LOGS_FILE = path.join(DATA_DIR, "adminLogs.json");
const POLLS_FILE = path.join(DATA_DIR, "polls.json");
const VOICE_MESSAGES_FILE = path.join(DATA_DIR, "voiceMessages.json");
const VIDEO_MESSAGES_FILE = path.join(DATA_DIR, "videoMessages.json");
const VIDEO_NOTES_FILE = path.join(DATA_DIR, "videoNotes.json");
const PHOTO_MESSAGES_FILE = path.join(DATA_DIR, "photoMessages.json");
const GIF_MESSAGES_FILE = path.join(DATA_DIR, "gifMessages.json");
const DOCUMENT_MESSAGES_FILE = path.join(DATA_DIR, "documentMessages.json");
const PREMIUM_REACTIONS_FILE = path.join(DATA_DIR, "premiumReactions.json");
const TELEGRAM_TEXT_LIMIT = 3900;
const ADMIN_CONVERSATIONS_PAGE_SIZE = 10;
const PREMIUM_REACTION_LIST = [
  { key: "like", emoji: "👍", emojiId: "5429375545940919774", name: "Лайк" },
  { key: "kiss", emoji: "😘", emojiId: "5366276300199723014", name: "Поцелуй" },
  { key: "wow", emoji: "😳", emojiId: "5350746346997452265", name: "Удивление", aliases: ["shock"] },
  { key: "heart", emoji: "❤️", emojiId: "5357579953497983889", name: "Любовь" },
  { key: "fire", emoji: "🔥", emojiId: "5199564713653983220", name: "Огонь" },
  { key: "rose", emoji: "🌹", emojiId: "5418164156584976210", name: "Роза" },
  { key: "laugh", emoji: "😂", emojiId: "5472363852131736400", name: "Смех" },
  { key: "clap", emoji: "👏", emojiId: "5258288547361732952", name: "Аплодисменты" },
  { key: "love", emoji: "🥰", emojiId: "5258383118246620195", name: "Нежность" },
  { key: "eyes", emoji: "😍", emojiId: "5366575839808879229", name: "Влюблён" },
];
const JSON_SCAN_EXCLUDED_DIRS = new Set([".git", "node_modules"]);
const JSON_SCAN_EXCLUDED_FILES = new Set(["package.json", "package-lock.json"]);

const BOT_SHORT_DESCRIPTION =
  "💌 Получай анонимные сообщения\n" +
  "по личной ссылке";

const BOT_DESCRIPTION =
  `${BOT_SHORT_DESCRIPTION}\n\n` +
  "✨ Узнай, кто отправил сообщение\n" +
  "🆔 Просматривай ID и username\n" +
  "отправителя\n" +
  "💬 Отвечай без ограничений\n" +
  "❤️ Ставь реакции на сообщения\n\n" +
  "🔗 Создай свою личную ссылку\n" +
  "и отправь её друзьям\n" +
  "♻️ Обновляй ссылку в один клик";

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
let adminLogs = [];
let polls = [];
let voiceMessages = [];
let videoMessages = [];
let videoNotes = [];
let photoMessages = [];
let gifMessages = [];
let documentMessages = [];
let premiumReactions = {};

const pendingAnonymousMessages = new Map();
const pendingReplies = new Map();
const pendingSupportMessages = new Map();
const pendingPushMessages = new Map();
const pendingPollMessages = new Map();
const processingBanCallbacks = new Set();
const processedBanCallbacks = new Set();
const startCooldown = new Map();

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

function ensureDataDirectory(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (error) {
    console.error(`❌ Save error: ${error.message}`);
    process.exit(1);
  }
}

function flushDirectory(dirPath) {
  let dirFd = null;

  try {
    dirFd = fs.openSync(dirPath, "r");
    fs.fsyncSync(dirFd);
  } catch {
    // Some filesystems do not support directory fsync. File fsync still protects the JSON payload.
  } finally {
    if (dirFd !== null) {
      try {
        fs.closeSync(dirFd);
      } catch {
        // Nothing useful to do if closing the directory descriptor fails.
      }
    }
  }
}

function writeJson(filePath, data) {
  const dirPath = path.dirname(filePath);
  const tempPath = path.join(dirPath, `${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  let fileFd = null;

  try {
    fs.mkdirSync(dirPath, { recursive: true });
    fileFd = fs.openSync(tempPath, "w");
    fs.writeFileSync(fileFd, JSON.stringify(data, null, 2), "utf8");
    fs.fsyncSync(fileFd);
    fs.closeSync(fileFd);
    fileFd = null;
    fs.renameSync(tempPath, filePath);
    flushDirectory(dirPath);
    return true;
  } catch (error) {
    if (fileFd !== null) {
      try {
        fs.closeSync(fileFd);
      } catch {
        // Ignore close errors after the original write failure.
      }
    }

    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {
      // Ignore cleanup errors after the original write failure.
    }

    console.error(`❌ Save error: ${filePath} - ${error.message}`);
    return false;
  }
}

function ensureFile(filePath, defaultValue) {
  if (fs.existsSync(filePath)) return;

  const legacyPath = path.join(LEGACY_DATA_DIR, path.basename(filePath));
  if (DATA_DIR !== LEGACY_DATA_DIR && fs.existsSync(legacyPath)) {
    try {
      const raw = fs.readFileSync(legacyPath, "utf8");
      const legacyData = raw.trim() ? JSON.parse(raw) : defaultValue;
      if (writeJson(filePath, legacyData)) {
        console.log(`📦 Migrated data file: ${path.basename(filePath)} -> ${DATA_DIR}`);
        return;
      }
    } catch (error) {
      console.error(`❌ Save error: ${filePath} - ${error.message}`);
    }
  }

  writeJson(filePath, defaultValue);
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

function readLegacyJson(filePath, defaultValue) {
  const legacyPath = path.join(LEGACY_DATA_DIR, path.basename(filePath));
  if (legacyPath === filePath || !fs.existsSync(legacyPath)) return defaultValue;

  try {
    const raw = fs.readFileSync(legacyPath, "utf8");
    if (!raw.trim()) return defaultValue;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Ошибка чтения ${legacyPath}:`, error.message);
    return defaultValue;
  }
}

function loadUsersData() {
  const primaryUsers = readJson(USERS_FILE, {});
  const legacyUsers = readLegacyJson(USERS_FILE, {});

  if (
    !primaryUsers ||
    typeof primaryUsers !== "object" ||
    Array.isArray(primaryUsers)
  ) {
    return legacyUsers && typeof legacyUsers === "object" && !Array.isArray(legacyUsers)
      ? legacyUsers
      : {};
  }

  if (!legacyUsers || typeof legacyUsers !== "object" || Array.isArray(legacyUsers)) {
    return primaryUsers;
  }

  return {
    ...legacyUsers,
    ...primaryUsers,
  };
}

function makeDataItemKey(item) {
  if (!item || typeof item !== "object") return "";
  return String(item.id || item.messageId || item.questionMessageId || item.conversationId || "");
}

function loadArrayData(filePath) {
  const primaryItems = readJson(filePath, []);
  const legacyItems = readLegacyJson(filePath, []);
  const result = [];
  const indexes = new Map();

  function pushItems(items) {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      const key = makeDataItemKey(item);
      if (key && indexes.has(key)) {
        result[indexes.get(key)] = {
          ...result[indexes.get(key)],
          ...item,
        };
        continue;
      }

      if (key) indexes.set(key, result.length);
      result.push(item);
    }
  }

  pushItems(legacyItems);
  pushItems(primaryItems);
  return result;
}

function loadObjectData(filePath) {
  const primaryData = readJson(filePath, {});
  const legacyData = readLegacyJson(filePath, {});
  const primaryObject = primaryData && typeof primaryData === "object" && !Array.isArray(primaryData) ? primaryData : {};
  const legacyObject = legacyData && typeof legacyData === "object" && !Array.isArray(legacyData) ? legacyData : {};
  return {
    ...legacyObject,
    ...primaryObject,
  };
}

function loadReactionsData() {
  const primaryData = readJson(REACTIONS_FILE, {});
  const legacyData = readLegacyJson(REACTIONS_FILE, {});

  if (Array.isArray(primaryData) || Array.isArray(legacyData)) {
    return [
      ...(Array.isArray(legacyData) ? legacyData : []),
      ...(Array.isArray(primaryData) ? primaryData : []),
    ];
  }

  const primaryObject = primaryData && typeof primaryData === "object" ? primaryData : {};
  const legacyObject = legacyData && typeof legacyData === "object" ? legacyData : {};
  return {
    ...legacyObject,
    ...primaryObject,
  };
}

function loadData() {
  users = loadUsersData();
  annUsers = readJson(ANN_USERS_FILE, {});
  messages = loadArrayData(MESSAGES_FILE);
  answers = loadArrayData(ANSWERS_FILE);
  supportMessages = readJson(SUPPORT_FILE, []);
  stats = readJson(STATS_FILE, {});
  conversations = loadArrayData(CONVERSATIONS_FILE);
  blockedUsers = readJson(BLOCKED_USERS_FILE, {});
  reactions = loadReactionsData();
  adminLogs = readJson(ADMIN_LOGS_FILE, []);
  polls = readJson(POLLS_FILE, []);
  voiceMessages = readJson(VOICE_MESSAGES_FILE, []);
  videoMessages = readJson(VIDEO_MESSAGES_FILE, []);
  videoNotes = readJson(VIDEO_NOTES_FILE, []);
  photoMessages = readJson(PHOTO_MESSAGES_FILE, []);
  gifMessages = readJson(GIF_MESSAGES_FILE, []);
  documentMessages = readJson(DOCUMENT_MESSAGES_FILE, []);
  premiumReactions = loadObjectData(PREMIUM_REACTIONS_FILE);
  normalizeRuntimeData();
  console.log(`✅ Users loaded: ${Object.keys(users).length}`);
  console.log(`✅ Premium reactions loaded: ${Object.keys(premiumReactions).length}`);
  console.log(`✅ Reactions loaded: ${Array.isArray(reactions) ? reactions.length : Object.keys(reactions).length}`);
  logLoadedDataCounts();
}

function saveUsers() {
  return writeJson(USERS_FILE, users);
}

function saveAnnUsers() {
  return writeJson(ANN_USERS_FILE, annUsers);
}

function saveMessages(options = {}) {
  const saved = writeJson(MESSAGES_FILE, messages);
  if (saved && options.messageId) console.log(`✅ Message saved: ${options.messageId}`);
  return saved;
}

function saveAnswers(options = {}) {
  const saved = writeJson(ANSWERS_FILE, answers);
  if (saved && options.replyId) console.log(`✅ Reply saved: ${options.replyId}`);
  return saved;
}

function saveSupportMessages() {
  return writeJson(SUPPORT_FILE, supportMessages);
}

function saveStats() {
  return writeJson(STATS_FILE, stats);
}

function loadConversations() {
  const data = readJson(CONVERSATIONS_FILE, []);
  conversations = Array.isArray(data) ? data : [];
}

function saveConversations(options = {}) {
  const saved = writeJson(CONVERSATIONS_FILE, conversations);
  if (saved && options.conversationId) console.log(`✅ Conversation saved: ${options.conversationId}`);
  return saved;
}

function saveBlockedUsers(options = {}) {
  const saved = writeJson(BLOCKED_USERS_FILE, blockedUsers);
  if (saved && options.userId) console.log(`✅ Block list saved: ${options.userId}`);
  return saved;
}

function saveReactions(options = {}) {
  const saved = writeJson(REACTIONS_FILE, reactions);
  if (saved && options.messageId) console.log(`✅ Reactions saved: ${options.messageId}`);
  return saved;
}

function saveAdminLogs() {
  return writeJson(ADMIN_LOGS_FILE, adminLogs);
}

function savePolls() {
  return writeJson(POLLS_FILE, polls);
}

function saveVoiceMessages() {
  return writeJson(VOICE_MESSAGES_FILE, voiceMessages);
}

function saveVideoMessages() {
  return writeJson(VIDEO_MESSAGES_FILE, videoMessages);
}

function saveVideoNotes() {
  return writeJson(VIDEO_NOTES_FILE, videoNotes);
}

function savePhotoMessages() {
  return writeJson(PHOTO_MESSAGES_FILE, photoMessages);
}

function saveGifMessages() {
  return writeJson(GIF_MESSAGES_FILE, gifMessages);
}

function saveDocumentMessages() {
  return writeJson(DOCUMENT_MESSAGES_FILE, documentMessages);
}

function savePremiumReactions() {
  return writeJson(PREMIUM_REACTIONS_FILE, premiumReactions);
}

function saveData(options = {}) {
  const results = [
    saveUsers(),
    saveAnnUsers(),
    saveMessages(options),
    saveAnswers(options),
    saveSupportMessages(),
    saveStats(),
    saveConversations(options),
    saveBlockedUsers(),
    saveReactions(),
    saveAdminLogs(),
    savePolls(),
    saveVoiceMessages(),
    saveVideoMessages(),
    saveVideoNotes(),
    savePhotoMessages(),
    saveGifMessages(),
    saveDocumentMessages(),
    savePremiumReactions(),
  ];

  return results.every(Boolean);
}

function logLoadedDataCounts() {
  console.log("✅ users.json загружен");
  console.log("✅ messages.json загружен");
  console.log("✅ answers.json загружен");
  console.log("✅ conversations.json загружен");
  console.log("✅ reactions.json загружен");
  console.log("✅ blockedUsers.json загружен");
  console.log("✅ photoMessages.json загружен");
  console.log("✅ videoMessages.json загружен");
  console.log("✅ videoNotes.json загружен");
  console.log("✅ voiceMessages.json загружен");
  console.log("✅ gifMessages.json загружен");
  console.log(`📂 Loaded conversations: ${conversations.length}`);
  console.log(`💌 Loaded messages: ${messages.length}`);
  console.log(`✍️ Loaded answers: ${answers.length}`);
}

function isContainerRuntime() {
  return (
    fs.existsSync("/.dockerenv") ||
    Boolean(process.env.P_SERVER_UUID || process.env.P_SERVER_ALLOCATION_LIMIT || process.env.container)
  );
}

function logDataStorageInfo() {
  console.log(`📁 Data directory: ${DATA_DIR}`);

  if (isContainerRuntime() && !process.env.BOT_DATA_DIR) {
    console.warn(
      "⚠️ Container runtime detected. Set BOT_DATA_DIR to a mounted persistent directory to keep JSON data after container rebuilds."
    );
  }
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
  if (!reactions || typeof reactions !== "object") reactions = {};
  if (!Array.isArray(adminLogs)) adminLogs = [];
  if (!Array.isArray(polls)) polls = [];
  if (!Array.isArray(voiceMessages)) voiceMessages = [];
  if (!Array.isArray(videoMessages)) videoMessages = [];
  if (!Array.isArray(videoNotes)) videoNotes = [];
  if (!Array.isArray(photoMessages)) photoMessages = [];
  if (!Array.isArray(gifMessages)) gifMessages = [];
  if (!Array.isArray(documentMessages)) documentMessages = [];
  if (!premiumReactions || typeof premiumReactions !== "object" || Array.isArray(premiumReactions)) {
    premiumReactions = {};
  }

  normalizeBlockedUsers();
  normalizePremiumReactions();
  normalizeReactions();
  migrateConversationsFromMessages();
  normalizeConversationIdsForCallbackData();
  normalizeConversationDisplayNumbers();
}

function normalizeBlockedUsers() {
  const normalized = {};

  for (const [userId, list] of Object.entries(blockedUsers)) {
    if (userId === "__banned") {
      normalized.__banned = list && typeof list === "object" && !Array.isArray(list) ? list : {};
      continue;
    }

    const cleanList = Array.isArray(list) ? list : [];
    normalized[String(userId)] = [...new Set(cleanList.map((item) => String(item)))];
  }

  if (!normalized.__banned) normalized.__banned = {};
  blockedUsers = normalized;
}

function normalizeReactions() {
  const normalized = [];
  const allowed = new Map();
  for (const item of PREMIUM_REACTION_LIST) {
    allowed.set(item.emoji, item);
    allowed.set(item.key, item);
    allowed.set(item.emojiId, item);
    if (Array.isArray(item.aliases)) {
      for (const alias of item.aliases) allowed.set(alias, item);
    }
  }

  function pushRecord(record) {
    if (!record || typeof record !== "object") return;
    const reaction = getPremiumReaction(record.reactionKey || record.key || record.emoji || record.emojiId);
    if (!reaction) return;

    normalized.push({
      id: record.id || createId("reaction"),
      reactionKey: reaction.key,
      emoji: reaction.emoji,
      emojiId: reaction.emojiId,
      name: reaction.name,
      senderId: record.senderId !== undefined && record.senderId !== null ? Number(record.senderId) : null,
      receiverId: record.receiverId !== undefined && record.receiverId !== null ? Number(record.receiverId) : null,
      messageId: String(record.messageId || ""),
      conversationId: String(record.conversationId || ""),
      date: record.date || nowIso(),
    });
  }

  if (Array.isArray(reactions)) {
    for (const record of reactions) pushRecord(record);
  } else {
    for (const [messageId, bucket] of Object.entries(reactions)) {
      if (!bucket || typeof bucket !== "object" || Array.isArray(bucket)) continue;

      for (const [reactionKey, count] of Object.entries(bucket)) {
        const reaction = allowed.get(String(reactionKey));
        if (!reaction) continue;
        const total = Math.max(0, Number(count || 0));
        for (let index = 0; index < total; index += 1) {
          pushRecord({
            reactionKey: reaction.key,
            messageId,
          });
        }
      }
    }
  }

  reactions = normalized;
}

function normalizePremiumReactions() {
  const normalized = {};

  for (const item of PREMIUM_REACTION_LIST) {
    normalized[item.key] = {
      emoji: item.emoji,
      emojiId: item.emojiId,
      name: item.name,
    };
  }

  for (const [key, value] of Object.entries(premiumReactions)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const existing = normalized[key];
    if (!existing) continue;
    normalized[key] = {
      emoji: String(value.emoji || existing.emoji),
      emojiId: String(value.emojiId || value.customEmojiId || value.custom_emoji_id || existing.emojiId),
      name: String(value.name || existing.name),
    };
  }

  premiumReactions = normalized;
}

function migrateConversationsFromMessages() {
  const conversationById = new Map();
  const originalToConversationId = new Map();

  conversations = conversations
    .filter((conversation) => conversation && conversation.id)
    .map((conversation) => {
      const normalizedConversation = {
        id: String(conversation.id),
        displayNumber: Number(conversation.displayNumber || 0),
        aliases: Array.isArray(conversation.aliases)
          ? conversation.aliases.map((item) => String(item)).filter(Boolean)
          : [],
        user1: Number(conversation.user1),
        user2: Number(conversation.user2),
        source: normalizeConversationSource(conversation.source),
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
          path: item.path || "",
          fileId: item.fileId || item.file_id || "",
          fileUniqueId: item.fileUniqueId || item.file_unique_id || "",
          caption: item.caption || "",
          duration: Number(item.duration || 0),
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
          source: normalizeConversationSource(item.source),
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
        source: item.source,
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
        path: item.path || "",
        fileId: item.fileId || item.file_id || "",
        fileUniqueId: item.fileUniqueId || item.file_unique_id || "",
        caption: item.caption || "",
        duration: Number(item.duration || 0),
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
      path: item.path || "",
      fileId: item.fileId || item.file_id || "",
      fileUniqueId: item.fileUniqueId || item.file_unique_id || "",
      caption: item.caption || "",
      duration: Number(item.duration || 0),
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

function normalizeConversationDisplayNumbers() {
  let maxDisplayNumber = conversations.reduce((max, conversation) => {
    return Math.max(max, Number(conversation.displayNumber || 0));
  }, 0);

  const sorted = conversations
    .slice()
    .sort((a, b) => new Date(a.createdAt || a.lastActivity || 0) - new Date(b.createdAt || b.lastActivity || 0));

  for (const conversation of sorted) {
    if (Number(conversation.displayNumber || 0) > 0) continue;
    maxDisplayNumber += 1;
    conversation.displayNumber = maxDisplayNumber;
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

function formatCardDate(value) {
  return formatDate(value).replace(",", " •");
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

function createEmptyUserStats(base = {}) {
  return {
    linkClicks: Number(base.linkClicks || 0),
    messagesReceived: 0,
    messagesSent: 0,
    repliesSent: 0,
    repliesReceived: 0,
  };
}

function makeRecordKey(prefix, item) {
  if (item && item.id) return `${prefix}:${item.id}`;

  return [
    prefix,
    item.messageId || item.questionMessageId || item.replyToMessageId || "",
    item.conversationId || "",
    item.date || "",
    item.senderId || item.fromId || item.answeredBy || "",
    item.receiverId || item.toId || item.sentTo || "",
    item.text || item.answerText || item.questionText || "",
  ].join(":");
}

function normalizeQuestionRecord(item, source) {
  const senderId = item.senderId ?? item.fromId ?? item.user1;
  const receiverId = item.receiverId ?? item.toId ?? item.user2;
  if (!senderId || !receiverId) return null;

  return {
    id: item.id || item.messageId || `${source}_${item.conversationId || ""}_${item.date || ""}`,
    source,
    conversationId: item.conversationId || "",
    senderId: Number(senderId),
    receiverId: Number(receiverId),
    text: item.text || item.questionText || getContentTypeLabel(item.contentType || "text"),
    contentType: item.contentType || "text",
    date: item.date || item.createdAt || "",
  };
}

function normalizeAnswerRecord(item, source) {
  const senderId = item.senderId ?? item.fromId ?? item.answeredBy;
  const receiverId = item.receiverId ?? item.toId ?? item.sentTo;
  if (!senderId || !receiverId) return null;

  return {
    id: item.id || item.messageId || `${source}_${item.conversationId || ""}_${item.date || ""}`,
    source,
    conversationId: item.conversationId || "",
    questionMessageId: item.questionMessageId || item.replyToMessageId || item.originalMessageId || "",
    senderId: Number(senderId),
    receiverId: Number(receiverId),
    questionText: item.questionText || "",
    answerText: item.answerText || item.text || getContentTypeLabel(item.contentType || "text"),
    contentType: item.contentType || "text",
    date: item.date || item.createdAt || "",
  };
}

function collectQuestionRecords() {
  const result = [];
  const used = new Set();

  function push(record) {
    if (!record) return;
    const key = makeRecordKey("question", record);
    if (used.has(key)) return;
    used.add(key);
    result.push(record);
  }

  for (const item of messages) {
    if (item && item.type === "anonymous_message") {
      push(normalizeQuestionRecord(item, "messages"));
    }
  }

  for (const conversation of conversations) {
    const firstMessage = Array.isArray(conversation.messages) ? conversation.messages[0] : null;
    if (firstMessage) {
      push(normalizeQuestionRecord({
        ...firstMessage,
        conversationId: firstMessage.conversationId || conversation.id,
      }, "conversations"));
    }
  }

  return result.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

function collectAnswerRecords() {
  const result = [];
  const used = new Set();

  function push(record) {
    if (!record) return;
    const key = makeRecordKey("answer", record);
    if (used.has(key)) return;
    used.add(key);
    result.push(record);
  }

  for (const item of messages) {
    if (item && item.type === "reply") {
      push(normalizeAnswerRecord(item, "messages"));
    }
  }

  for (const item of answers) {
    push(normalizeAnswerRecord(item, "answers"));
  }

  for (const conversation of conversations) {
    const conversationMessages = Array.isArray(conversation.messages) ? conversation.messages : [];
    for (const item of conversationMessages.slice(1)) {
      push(normalizeAnswerRecord({
        ...item,
        conversationId: item.conversationId || conversation.id,
      }, "conversations"));
    }
  }

  return result.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

function buildStatsFromHistory() {
  const rebuiltStats = {};

  for (const user of Object.values(users)) {
    rebuiltStats[String(user.id)] = createEmptyUserStats(stats[String(user.id)] || {});
  }

  for (const question of collectQuestionRecords()) {
    const senderId = String(question.senderId);
    const receiverId = String(question.receiverId);
    if (!rebuiltStats[senderId]) rebuiltStats[senderId] = createEmptyUserStats(stats[senderId] || {});
    if (!rebuiltStats[receiverId]) rebuiltStats[receiverId] = createEmptyUserStats(stats[receiverId] || {});
    rebuiltStats[senderId].messagesSent += 1;
    rebuiltStats[receiverId].messagesReceived += 1;
  }

  for (const answer of collectAnswerRecords()) {
    const senderId = String(answer.senderId);
    const receiverId = String(answer.receiverId);
    if (!rebuiltStats[senderId]) rebuiltStats[senderId] = createEmptyUserStats(stats[senderId] || {});
    if (!rebuiltStats[receiverId]) rebuiltStats[receiverId] = createEmptyUserStats(stats[receiverId] || {});
    rebuiltStats[senderId].repliesSent += 1;
    rebuiltStats[receiverId].repliesReceived += 1;
  }

  return rebuiltStats;
}

function syncStatsFromHistory(options = {}) {
  const rebuiltStats = buildStatsFromHistory();
  const changed = JSON.stringify(stats) !== JSON.stringify(rebuiltStats);
  if (changed || options.force) {
    stats = rebuiltStats;
    saveStats();
  }

  return { changed, stats: rebuiltStats };
}

function getUserStatsFromHistory(userId) {
  const id = String(userId);
  const rebuilt = buildStatsFromHistory();
  const current = stats[id] || {};
  const next = rebuilt[id] || createEmptyUserStats(current);

  if (JSON.stringify(current) !== JSON.stringify(next)) {
    stats[id] = next;
    saveStats();
  }

  return next;
}

function recalculateStatsFromMessages() {
  const rebuiltStats = buildStatsFromHistory();
  stats = rebuiltStats;

  for (const user of Object.values(annUsers)) {
    const userStats = stats[String(user.id)] || createEmptyUserStats();
    user.messagesReceived = 0;
    user.messagesSent = 0;
    user.repliesSent = 0;
    user.repliesReceived = 0;
    user.messagesReceived = userStats.messagesReceived;
    user.messagesSent = userStats.messagesSent;
    user.repliesSent = userStats.repliesSent;
    user.repliesReceived = userStats.repliesReceived;
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

function buildStartLink(code) {
  return `https://t.me/${botUsername}?start=s_${code}`;
}

function buildAnnLink(code) {
  return `https://t.me/${botUsername}?start=a_${code}`;
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
    users[id].link = buildAnnLink(users[id].activeCode);
  }

  if (!users[id].oldCodes) users[id].oldCodes = [];
  if (!users[id].startCode) users[id].startCode = "";
  if (!users[id].annCode) users[id].annCode = "";
  users[id].startLink = users[id].startCode ? buildStartLink(users[id].startCode) : "";
  users[id].annLink = users[id].annCode ? buildAnnLink(users[id].annCode) : "";

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
  const annLink = buildAnnLink(annCode);

  users[id].annLink = annLink;
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

  let source = null;
  let realCode = code;

  if (code.startsWith("a_")) {
    source = "ann";
    realCode = code.slice(2);
  } else if (code.startsWith("s_")) {
    source = "start";
    realCode = code.slice(2);
  }

  if (!source) return null;

  for (const user of Object.values(users)) {
    if (source === "ann" && user.annCode === realCode) {
      return { user, source: "ann" };
    }

    if (source === "start" && user.startCode === realCode) {
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
  if (msg.video_note) return "video_note";
  if (msg.sticker) return "sticker";
  if (msg.video) return "video";
  if (msg.voice) return "voice";
  if (msg.document) return "document";
  if (msg.audio) return "audio";
  if (msg.animation) return "animation";
  return "other";
}

function isSupportedDialogMessage(msg) {
  return ["text", "voice", "video", "video_note", "photo", "document", "animation"].includes(getContentType(msg));
}

function getContentTypeLabel(contentType) {
  const labels = {
    text: "💬 Сообщение",
    voice: "🎤 Голосовое сообщение",
    video: "🎥 Видео",
    video_note: "📹 Видео-кружок",
    photo: "🖼 Фото",
    document: "📄 Документ",
    animation: "🎞 GIF",
  };

  return labels[contentType] || "💬 Сообщение";
}

function getMessageFileId(msg) {
  if (msg.voice) return msg.voice.file_id;
  if (msg.video) return msg.video.file_id;
  if (msg.video_note) return msg.video_note.file_id;
  if (msg.document) return msg.document.file_id;
  if (msg.animation) return msg.animation.file_id;
  if (Array.isArray(msg.photo) && msg.photo.length) return msg.photo[msg.photo.length - 1].file_id;
  return "";
}

function getMessageFileUniqueId(msg) {
  if (msg.voice) return msg.voice.file_unique_id || "";
  if (msg.video) return msg.video.file_unique_id || "";
  if (msg.video_note) return msg.video_note.file_unique_id || "";
  if (msg.document) return msg.document.file_unique_id || "";
  if (msg.animation) return msg.animation.file_unique_id || "";
  if (Array.isArray(msg.photo) && msg.photo.length) return msg.photo[msg.photo.length - 1].file_unique_id || "";
  return "";
}

function getMessageDuration(msg) {
  if (msg.voice) return Number(msg.voice.duration || 0);
  if (msg.video) return Number(msg.video.duration || 0);
  if (msg.video_note) return Number(msg.video_note.duration || 0);
  if (msg.animation) return Number(msg.animation.duration || 0);
  return 0;
}

function getMediaDownloadDirectory(contentType) {
  if (contentType === "photo") return MEDIA_PHOTOS_DIR;
  if (contentType === "video" || contentType === "video_note") return MEDIA_VIDEOS_DIR;
  if (contentType === "voice") return MEDIA_VOICES_DIR;
  if (contentType === "document" || contentType === "animation") return MEDIA_DOCUMENTS_DIR;
  if (contentType === "sticker") return MEDIA_STICKERS_DIR;
  return MEDIA_TEMP_DIR;
}

function isLocallyStoredMediaType(contentType) {
  return ["photo", "video", "video_note", "voice", "document", "animation", "sticker"].includes(contentType);
}

function toRelativeMediaPath(filePath) {
  if (!filePath) return "";
  const relativePath = path.relative(__dirname, filePath);
  return relativePath.startsWith("..") ? filePath : relativePath;
}

function resolveStoredMediaPath(filePath) {
  if (!filePath) return "";
  return path.isAbsolute(filePath) ? filePath : path.join(__dirname, filePath);
}

function getSafeMediaFileName(messageId, downloadedPath) {
  const extension = path.extname(downloadedPath || "") || "";
  const baseName = String(messageId || createId("media")).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${baseName}${extension}`;
}

async function downloadMessageMedia(contentType, fileId, messageId) {
  if (!fileId || !isLocallyStoredMediaType(contentType)) return "";

  const targetDir = getMediaDownloadDirectory(contentType);
  ensureDataDirectory(targetDir);

  try {
    const downloadedPath = await bot.downloadFile(fileId, targetDir);
    const finalPath = path.join(targetDir, getSafeMediaFileName(messageId, downloadedPath));

    if (downloadedPath !== finalPath) {
      if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
      fs.renameSync(downloadedPath, finalPath);
    }

    return toRelativeMediaPath(finalPath);
  } catch (error) {
    console.error("downloadFile error:", error.message);
    return "";
  }
}

function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function getStoredMessageText(msg) {
  const contentType = getContentType(msg);
  const text = truncateText(getMessageText(msg), 2500);
  return text || getContentTypeLabel(contentType);
}

function isTextMessage(msg) {
  return getContentType(msg) === "text" && typeof msg.text === "string" && !msg.text.startsWith("/");
}

async function sendUnsupportedMessageWarning(chatId) {
  await safeSendMessage(
    chatId,
    "❌ Этот тип сообщения пока не поддерживается.\n\nМожно отправить текст, голосовое, видео, видео-кружок, фото или документ."
  );
}

function normalizeUsername(username) {
  if (!username || username === "нет username") return "нет username";
  return String(username).startsWith("@") ? String(username) : `@${username}`;
}

function normalizeConversationSource(source) {
  return String(source || "").trim() === "ann" ? "ann" : "start";
}

function updateConversationSenderInfo(conversation, info = {}) {
  if (!conversation) return;

  const source = normalizeConversationSource(info.source || conversation.source);
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
  return conversation && normalizeConversationSource(conversation.source) === "ann";
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

function getAnnConversationOwnerId(conversation) {
  if (!isAnnConversation(conversation) || !conversation.user2) return "";
  return String(conversation.user2);
}

function getAnnConversationSenderId(conversation) {
  if (!isAnnConversation(conversation) || !conversation.user1) return "";
  return String(conversation.user1);
}

function canViewConversationSenderInfo(conversation, viewerId, options = {}) {
  if (!options.initialAnonymousMessage) return false;

  const viewer = String(viewerId || "");
  const senderId = getAnnConversationSenderId(conversation);
  const ownerId = getAnnConversationOwnerId(conversation);
  const source = normalizeConversationSource(conversation && conversation.source);

  if (source !== "ann") return false;
  if (options.admin) return true;
  if (ownerId && viewer === ownerId) return true;
  if (senderId && viewer === senderId) return false;

  return false;
}

function formatConversationSenderBlock(conversation, viewerId, options = {}) {
  if (!canViewConversationSenderInfo(conversation, viewerId, options)) {
    return "";
  }

  const sender = getConversationSenderInfo(conversation);
  return `👤 Отправитель\nID: ${sender.id}\nUsername: ${sender.username}\nИмя: ${sender.name}`;
}

function createConversation(user1, user2, options = {}) {
  const date = nowIso();
  const source = normalizeConversationSource(options.source);
  const conversation = {
    id: createId("conv"),
    displayNumber: getNextConversationDisplayNumber(),
    aliases: [],
    user1: Number(user1),
    user2: Number(user2),
    source,
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
    path: message.path || "",
    fileId: message.fileId || message.file_id || "",
    fileUniqueId: message.fileUniqueId || message.file_unique_id || "",
    caption: message.caption || "",
    duration: Number(message.duration || 0),
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

  const exactConversation = conversations.find((conversation) => {
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
  });

  if (exactConversation) return exactConversation;

  return (
    conversations.find((conversation) => {
      if (!isConversationParticipant(conversation, userId)) return false;
      return (
        Array.isArray(conversation.messages) &&
        conversation.messages.some((message) => {
          return (
            message.telegramMessageId !== null &&
            message.telegramMessageId !== undefined &&
            String(message.telegramMessageId) === telegramMessageId
          );
        })
      );
    }) || null
  );
}

function findConversationByLatestInboundMessage(userId) {
  const id = String(userId || "");
  if (!id) return null;

  let bestConversation = null;
  let bestDate = 0;

  for (const conversation of conversations) {
    if (!isConversationParticipant(conversation, id) || !Array.isArray(conversation.messages)) continue;

    const latestInbound = conversation.messages
      .filter((message) => String(message.toId) === id)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0];

    if (!latestInbound) continue;

    const timestamp = new Date(latestInbound.date || 0).getTime();
    if (!bestConversation || timestamp >= bestDate) {
      bestConversation = conversation;
      bestDate = timestamp;
    }
  }

  return bestConversation;
}

function resolveConversationForCallback(conversationId, query, messageId = "") {
  return (
    findConversation(conversationId) ||
    findConversationByTelegramMessage(query) ||
    findConversationByMessageId(messageId) ||
    findConversationByLatestInboundMessage(query && query.from ? query.from.id : "")
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

function getBannedUsers() {
  if (!blockedUsers.__banned || typeof blockedUsers.__banned !== "object" || Array.isArray(blockedUsers.__banned)) {
    blockedUsers.__banned = {};
  }

  return blockedUsers.__banned;
}

function isGloballyBanned(userId) {
  return Boolean(getBannedUsers()[String(userId)]);
}

function banUser(userId, adminId) {
  const id = String(userId);
  getBannedUsers()[id] = {
    userId: Number(id),
    adminId: Number(adminId),
    date: nowIso(),
  };
  saveBlockedUsers({ userId: id });
}

function unbanUserGlobal(userId) {
  const id = String(userId);
  delete getBannedUsers()[id];
  saveBlockedUsers({ userId: id });
}

function blockUser(userId, targetId) {
  const id = String(userId);
  const target = String(targetId);
  if (!blockedUsers[id]) blockedUsers[id] = [];
  if (!blockedUsers[id].includes(target)) blockedUsers[id].push(target);
  saveBlockedUsers({ userId: id });
}

function unblockUser(userId, targetId) {
  const id = String(userId);
  const target = String(targetId);
  if (!Array.isArray(blockedUsers[id])) return;
  blockedUsers[id] = blockedUsers[id].filter((item) => item !== target);
  if (!blockedUsers[id].length) delete blockedUsers[id];
  saveBlockedUsers({ userId: id });
}

function getReactionCount(messageId, reactionKey) {
  const reaction = getPremiumReaction(reactionKey);
  const key = reaction ? reaction.key : String(reactionKey);
  return reactions.filter((item) => {
    return String(item.messageId) === String(messageId) && item.reactionKey === key;
  }).length;
}

function addReaction(message, reactionKey, senderId) {
  const reaction = getPremiumReaction(reactionKey);
  if (!reaction) return false;

  const record = {
    id: createId("reaction"),
    reactionKey: reaction.key,
    emoji: reaction.emoji,
    emojiId: reaction.emojiId,
    name: reaction.name,
    senderId: Number(senderId),
    receiverId: Number(message.fromId),
    messageId: String(message.id),
    conversationId: String(message.conversationId || ""),
    date: nowIso(),
  };

  reactions.push(record);
  saveReactions({ messageId: record.messageId });
  return record;
}

function getPremiumReaction(reactionKey) {
  const key = String(reactionKey || "");
  const fromList = PREMIUM_REACTION_LIST.find((item) => {
    return (
      item.key === key ||
      item.emoji === key ||
      item.emojiId === key ||
      (Array.isArray(item.aliases) && item.aliases.includes(key))
    );
  });

  if (!fromList) return null;

  const stored = premiumReactions[fromList.key] || {};
  return {
    key: fromList.key,
    emoji: stored.emoji || fromList.emoji,
    emojiId: stored.emojiId || stored.customEmojiId || fromList.emojiId,
    name: stored.name || fromList.name,
  };
}

function premiumReactionHtml(reactionKey) {
  const reaction = getPremiumReaction(reactionKey);
  if (!reaction) return escapeHtml(reactionKey);
  return `<tg-emoji emoji-id="${reaction.emojiId}">${escapeHtml(reaction.emoji)}</tg-emoji>`;
}

function getMessageReactionTotal(messageId) {
  return reactions.filter((item) => String(item.messageId) === String(messageId)).length;
}

function getTotalReactionCount() {
  return reactions.length;
}

function getTotalBlockCount() {
  return Object.values(blockedUsers).reduce((sum, list) => {
    if (list && typeof list === "object" && !Array.isArray(list)) return sum + Object.keys(list).length;
    return sum + (Array.isArray(list) ? list.length : 0);
  }, 0);
}

function getConversationMessagesTotal() {
  return conversations.reduce((sum, conversation) => {
    return sum + (Array.isArray(conversation.messages) ? conversation.messages.length : 0);
  }, 0);
}

function getNextConversationDisplayNumber() {
  return conversations.reduce((max, conversation) => {
    return Math.max(max, Number(conversation.displayNumber || 0));
  }, 0) + 1;
}

function getConversationDisplayNumber(conversation) {
  if (conversation && Number(conversation.displayNumber || 0) > 0) {
    return Number(conversation.displayNumber);
  }

  const sorted = conversations
    .slice()
    .sort((a, b) => new Date(a.createdAt || a.lastActivity || 0) - new Date(b.createdAt || b.lastActivity || 0));
  const index = sorted.findIndex((item) => String(item.id) === String(conversation && conversation.id));
  return index >= 0 ? index + 1 : sorted.length + 1;
}

function getSortedConversationMessages(conversation) {
  return (Array.isArray(conversation && conversation.messages) ? conversation.messages : [])
    .slice()
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
}

function getMediaStore(contentType) {
  if (contentType === "voice") return voiceMessages;
  if (contentType === "video") return videoMessages;
  if (contentType === "video_note") return videoNotes;
  if (contentType === "photo") return photoMessages;
  if (contentType === "document") return documentMessages;
  if (contentType === "animation") return gifMessages;
  return null;
}

function saveMediaStore(contentType) {
  if (contentType === "voice") return saveVoiceMessages();
  if (contentType === "video") return saveVideoMessages();
  if (contentType === "video_note") return saveVideoNotes();
  if (contentType === "photo") return savePhotoMessages();
  if (contentType === "document") return saveDocumentMessages();
  if (contentType === "animation") return saveGifMessages();
  return true;
}

function saveMediaRecord(record) {
  const store = getMediaStore(record.contentType);
  if (!store || !record.fileId) return;

  const existingIndex = store.findIndex((item) => String(item.messageId) === String(record.messageId));
  const item = {
    id: record.id,
    messageId: record.messageId,
    type: record.contentType,
    path: record.path || "",
    fileId: record.fileId,
    fileUniqueId: record.fileUniqueId || "",
    caption: record.caption || "",
    senderId: Number(record.senderId),
    receiverId: Number(record.receiverId),
    conversationId: record.conversationId,
    date: record.date,
  };

  if (["voice", "video", "video_note"].includes(record.contentType)) {
    item.duration = Number(record.duration || 0);
  }

  if (existingIndex >= 0) {
    store[existingIndex] = item;
  } else {
    store.push(item);
  }

  saveMediaStore(record.contentType);
}

function removeMediaRecordsByMessageIds(messageIds) {
  const ids = new Set([...messageIds].map(String));
  voiceMessages = voiceMessages.filter((item) => !ids.has(String(item.messageId)));
  videoMessages = videoMessages.filter((item) => !ids.has(String(item.messageId)));
  videoNotes = videoNotes.filter((item) => !ids.has(String(item.messageId)));
  photoMessages = photoMessages.filter((item) => !ids.has(String(item.messageId)));
  gifMessages = gifMessages.filter((item) => !ids.has(String(item.messageId)));
  documentMessages = documentMessages.filter((item) => !ids.has(String(item.messageId)));
}

async function sendDialogPayload(chatId, payload, options = {}) {
  const caption = payload.caption || "";
  const sendOptions = { ...options };
  const mediaSource = payload.path && fs.existsSync(resolveStoredMediaPath(payload.path))
    ? resolveStoredMediaPath(payload.path)
    : payload.fileId;
  let sent = null;

  try {
    if (payload.contentType === "voice" && mediaSource) {
      sent = await bot.sendVoice(chatId, mediaSource, {
        ...sendOptions,
        caption,
      });
    } else if (payload.contentType === "video" && mediaSource) {
      sent = await bot.sendVideo(chatId, mediaSource, {
        ...sendOptions,
        caption,
      });
    } else if (payload.contentType === "video_note" && mediaSource) {
      sent = await bot.sendVideoNote(chatId, mediaSource, sendOptions);
      if (caption) await safeSendMessage(chatId, caption);
    } else if (payload.contentType === "photo" && mediaSource) {
      sent = await bot.sendPhoto(chatId, mediaSource, {
        ...sendOptions,
        caption,
      });
    } else if (payload.contentType === "document" && mediaSource) {
      sent = await bot.sendDocument(chatId, mediaSource, {
        ...sendOptions,
        caption,
      });
    } else if (payload.contentType === "animation" && mediaSource) {
      sent = await bot.sendAnimation(chatId, mediaSource, {
        ...sendOptions,
        caption,
      });
    } else {
      sent = await bot.sendMessage(chatId, payload.text || caption, sendOptions);
    }
  } catch (error) {
    console.error("sendDialogPayload error:", error.message);
    return null;
  }

  return sent;
}

async function sendStoredConversationMedia(chatId, message, options = {}) {
  const fileId = message ? message.fileId || message.file_id || "" : "";
  const storedPath = message ? message.path || "" : "";
  const localPath = storedPath ? resolveStoredMediaPath(storedPath) : "";

  if (!message || (storedPath && !fs.existsSync(localPath)) || (!storedPath && !fileId)) {
    await safeSendMessage(chatId, "❌ Файл не найден.");
    return null;
  }

  const captionLines = [
    getContentTypeLabel(message.contentType),
    message.duration ? `⏱ Длительность: ${formatDuration(message.duration)}` : "",
    message.text && message.text !== getContentTypeLabel(message.contentType) ? message.text : "",
  ].filter(Boolean);

  return sendDialogPayload(chatId, {
    contentType: message.contentType,
    fileId,
    path: storedPath,
    caption: captionLines.join("\n"),
  }, options);
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

  const exactMatch = conversation.messages.find((message) => {
    return (
      String(message.toId) === userId &&
      message.telegramMessageId !== null &&
      message.telegramMessageId !== undefined &&
      String(message.telegramMessageId) === telegramMessageId
    );
  });

  if (exactMatch) return exactMatch;

  const inboundMessages = conversation.messages
    .filter((message) => String(message.toId) === userId)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return inboundMessages[0] || null;
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
  removeMediaRecordsByMessageIds(messageIds);

  reactions = reactions.filter((item) => !messageIds.has(String(item.messageId)));

  saveData({ conversationId: conversation.id });
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
        { text: "💬 Ответить", callback_data: `reply_conv:${conversationId}:${messageId}` },
        { text: "🎭 Реакция", callback_data: `reaction_menu:${conversationId}:${messageId}` },
      ],
      [
        { text: blockText, callback_data: blockCallback },
        { text: "🗑 Удалить диалог", callback_data: `delete_dialog:${conversationId}` },
      ],
      [{ text: "📜 История", callback_data: `history:${conversationId}` }],
    ],
  };
}

function reactionMenuKeyboard(conversationId, messageId) {
  return {
    inline_keyboard: [
      PREMIUM_REACTION_LIST.slice(0, 5).map((reaction) => ({
        text: reaction.emoji,
        callback_data: `reaction:${conversationId}:${messageId}:${reaction.key}`,
      })),
      PREMIUM_REACTION_LIST.slice(5).map((reaction) => ({
        text: reaction.emoji,
        callback_data: `reaction:${conversationId}:${messageId}:${reaction.key}`,
      })),
    ],
  };
}

function isOwner(userId) {
  return OWNER_ID && String(userId) === OWNER_ID;
}

function logAdminAction(from, action, payload = {}) {
  const entry = {
    id: createId("admin"),
    adminId: from && from.id ? Number(from.id) : null,
    action,
    payload,
    date: nowIso(),
  };

  adminLogs.push(entry);
  saveAdminLogs();
  return entry;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeTelegramId(value) {
  if (value === null || value === undefined) return "";
  const normalized = String(value).trim();
  return /^\d+$/.test(normalized) ? normalized : "";
}

function cleanUsername(value) {
  if (!value || value === "нет username") return "";
  return String(value).trim().replace(/^@+/, "");
}

function pickEarlierDate(current, candidate) {
  if (!candidate) return current || "";

  const parsedCandidate = new Date(candidate).getTime();
  if (Number.isNaN(parsedCandidate)) return current || String(candidate);
  if (!current) return String(candidate);

  const parsedCurrent = new Date(current).getTime();
  if (Number.isNaN(parsedCurrent) || parsedCandidate < parsedCurrent) return String(candidate);
  return current;
}

async function listJsonFilesDeep(dirPath) {
  const result = [];

  async function walk(currentPath) {
    let entries = [];

    try {
      entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      console.error(`json scan readdir error: ${currentPath} - ${error.message}`);
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (!JSON_SCAN_EXCLUDED_DIRS.has(entry.name)) await walk(entryPath);
        continue;
      }

      if (
        entry.isFile() &&
        entry.name.endsWith(".json") &&
        !JSON_SCAN_EXCLUDED_FILES.has(entry.name)
      ) {
        result.push(entryPath);
      }
    }
  }

  await walk(dirPath);
  return [...new Set(result)].sort();
}

async function readJsonIfExists(filePath) {
  try {
    const raw = await fs.promises.readFile(filePath, "utf8");
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`deep user search read error: ${filePath} - ${error.message}`);
    return null;
  }
}

function hasTargetIdInObject(value, targetId) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const idFields = [
    "id",
    "userId",
    "telegramId",
    "telegram_id",
    "fromId",
    "toId",
    "senderId",
    "receiverId",
    "user1",
    "user2",
    "ownerId",
    "chatId",
  ];

  return idFields.some((field) => normalizeTelegramId(value[field]) === targetId);
}

function looksLikeMessageRecord(value, sourceFile) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const fileName = path.basename(sourceFile).toLowerCase();
  const messageFile = /messages|answers|support|conversation/.test(fileName);
  const hasMessageFields = Boolean(
    value.text ||
    value.answerText ||
    value.questionText ||
    value.contentType ||
    value.telegramMessageId ||
    value.message_id
  );
  const hasMessageType = /message|reply|support/.test(String(value.type || ""));

  return messageFile && (hasMessageFields || hasMessageType);
}

function createMessageRecordKey(value, objectPath) {
  const stableId = value.id || value.messageId || value.telegramMessageId || value.message_id;
  if (stableId) {
    return [
      "id",
      value.type || "",
      stableId,
      value.conversationId || "",
      value.fromId || value.senderId || value.userId || "",
      value.toId || value.receiverId || "",
    ].join(":");
  }

  return [
    "signature",
    value.type || "",
    value.date || value.createdAt || "",
    value.fromId || value.senderId || value.userId || "",
    value.toId || value.receiverId || "",
    value.text || value.answerText || value.questionText || "",
    objectPath,
  ].join(":");
}

function collectProfileHints(value, result) {
  const username = cleanUsername(value.username || value.senderUsername);
  if (username && !result.username) result.username = username;

  if (value.first_name && !result.firstName) result.firstName = String(value.first_name);
  if (value.firstName && !result.firstName) result.firstName = String(value.firstName);
  if (value.last_name && !result.lastName) result.lastName = String(value.last_name);
  if (value.lastName && !result.lastName) result.lastName = String(value.lastName);

  if (!result.firstName && value.name) {
    const parts = String(value.name).trim().split(/\s+/).filter(Boolean);
    result.firstName = parts.shift() || "";
    result.lastName = result.lastName || parts.join(" ");
  }

  if (!result.firstName && value.senderName) {
    const parts = String(value.senderName).trim().split(/\s+/).filter(Boolean);
    result.firstName = parts.shift() || "";
    result.lastName = result.lastName || parts.join(" ");
  }

  const dateFields = [
    value.firstSeen,
    value.annStartedAt,
    value.createdAt,
    value.date,
    value.created_at,
    value.lastActive,
    value.lastAnnActive,
  ];

  for (const dateValue of dateFields) {
    result.firstInteraction = pickEarlierDate(result.firstInteraction, dateValue);
  }
}

function scanJsonForUser(data, targetId, sourceFile, result) {
  const visited = new Set();

  function walk(value, objectPath) {
    if (!value || typeof value !== "object") return;
    if (visited.has(value)) return;
    visited.add(value);

    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${objectPath}[${index}]`));
      return;
    }

    const directMatch = hasTargetIdInObject(value, targetId);
    if (directMatch) {
      result.found = true;
      result.sources.add(path.relative(__dirname, sourceFile) || path.basename(sourceFile));
      collectProfileHints(value, result);

      if (looksLikeMessageRecord(value, sourceFile)) {
        result.messageRecordKeys.add(createMessageRecordKey(value, objectPath));
      }
    }

    for (const [key, child] of Object.entries(value)) {
      if (normalizeTelegramId(key) === targetId) {
        result.found = true;
        result.sources.add(path.relative(__dirname, sourceFile) || path.basename(sourceFile));
        if (child && typeof child === "object") collectProfileHints(child, result);
      }

      walk(child, objectPath ? `${objectPath}.${key}` : key);
    }
  }

  walk(data, "");
}

async function findUserDeepByTelegramId(targetId) {
  const result = {
    found: false,
    telegramId: targetId,
    firstName: "",
    lastName: "",
    username: "",
    firstInteraction: "",
    sources: new Set(),
    messageRecordKeys: new Set(),
  };

  const runtimeData = [
    [USERS_FILE, users],
    [ANN_USERS_FILE, annUsers],
    [MESSAGES_FILE, messages],
    [ANSWERS_FILE, answers],
    [SUPPORT_FILE, supportMessages],
    [STATS_FILE, stats],
    [CONVERSATIONS_FILE, conversations],
    [BLOCKED_USERS_FILE, blockedUsers],
    [REACTIONS_FILE, reactions],
  ];

  for (const [filePath, data] of runtimeData) {
    scanJsonForUser(data, targetId, filePath, result);
  }

  const jsonFiles = await listJsonFilesDeep(__dirname);
  for (const filePath of jsonFiles) {
    const data = await readJsonIfExists(filePath);
    if (data !== null) scanJsonForUser(data, targetId, filePath, result);
  }

  return {
    ...result,
    sources: [...result.sources].sort(),
    messageCount: result.messageRecordKeys.size,
  };
}

function formatOwnerUserSearchResult(result) {
  const username = result.username ? `@${result.username}` : "—";
  const profileLink = result.username
    ? `https://t.me/${result.username}`
    : `tg://user?id=${result.telegramId}`;
  const messageCount = result.messageCount ? String(result.messageCount) : "не удалось определить";

  return (
    `🔎 <b>Пользователь найден</b>\n\n` +
    `🆔 <b>Telegram ID:</b> <code>${escapeHtml(result.telegramId)}</code>\n` +
    `👤 <b>Имя:</b> ${escapeHtml(result.firstName || "—")}\n` +
    `👥 <b>Фамилия:</b> ${escapeHtml(result.lastName || "—")}\n` +
    `🔗 <b>Username:</b> ${escapeHtml(username)}\n` +
    `🕒 <b>Первое взаимодействие:</b> ${escapeHtml(result.firstInteraction ? formatDate(result.firstInteraction) : "—")}\n` +
    `💬 <b>Количество сообщений:</b> ${escapeHtml(messageCount)}\n\n` +
    `🌐 <b>Ссылка:</b>\n<a href="${escapeHtml(profileLink)}">${escapeHtml(profileLink)}</a>`
  );
}

async function handleOwnerIdLookup(chatId, from, rawTargetId) {
  if (!isOwner(from.id)) return;

  const targetId = normalizeTelegramId(rawTargetId);
  if (!targetId) {
    await safeSendMessage(chatId, "ℹ️ Использование: /id 123456789");
    return;
  }

  try {
    const result = await findUserDeepByTelegramId(targetId);
    if (!result.found) {
      await safeSendMessage(chatId, "❌ Пользователь не найден в базе.");
      return;
    }

    await safeSendMessage(chatId, formatOwnerUserSearchResult(result), {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error("/id error:", error.message);
    await safeSendMessage(chatId, "❌ Произошла ошибка при поиске пользователя.");
  }
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
      [{ text: "🚫 Заблокированные пользователи", callback_data: "admin_blocked_users" }],
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

function getCallbackMessageKey(query) {
  if (!query || !query.message) return "";
  return `${query.message.chat.id}:${query.message.message_id}`;
}

async function clearCallbackInlineKeyboard(query) {
  if (!query || !query.message) return false;
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const emptyKeyboard = { inline_keyboard: [] };

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await bot.editMessageReplyMarkup(emptyKeyboard, {
        chat_id: chatId,
        message_id: messageId,
      });
      return true;
    } catch (error) {
      const message = String(error && error.message ? error.message : "");
      if (/message is not modified/i.test(message)) return true;
      if (attempt === 2) {
        console.error("editMessageReplyMarkup error:", message);
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  return false;
}

function markBanCallbackProcessed(key) {
  if (!key) return;
  processedBanCallbacks.add(key);
  setTimeout(() => {
    processedBanCallbacks.delete(key);
  }, 10 * 60 * 1000);
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
  if (isGloballyBanned(from.id) && !isOwner(from.id)) return;

  pendingAnonymousMessages.delete(String(from.id));
  pendingReplies.delete(String(from.id));
  pendingSupportMessages.delete(String(from.id));

  const user = createOrUpdateUser(from);
  const startCode = ensureSeparateCodeForUser(user.id, "startCode");
  const startLink = buildStartLink(startCode);

  users[String(user.id)].startLink = startLink;
  saveUsers();

  await safeSendMessage(
    chatId,
    `${START_GREETING}\n\n🔗 ${startLink}\n\n☝️ Запость эту ссылку в Telegram-канале, профиле или отправь друзьям.`,
    { reply_markup: annKeyboard() }
  );
}

async function showHelp(chatId, from) {
  if (isGloballyBanned(from.id) && !isOwner(from.id)) return;

  createOrUpdateUser(from);
  await safeSendMessage(chatId, "ℹ️ Помощь\n\n/start — открыть главное меню\n/help — помощь");
}

async function showAnnStart(chatId, from) {
  if (isGloballyBanned(from.id) && !isOwner(from.id)) return;

  pendingAnonymousMessages.delete(String(from.id));
  pendingReplies.delete(String(from.id));
  pendingSupportMessages.delete(String(from.id));

  createOrUpdateAnnUser(from);
  const annCode = ensureSeparateCodeForUser(from.id, "annCode");
  const annLink = buildAnnLink(annCode);
  users[String(from.id)].annLink = annLink;
  saveUsers();

  await safeSendMessage(
    chatId,
    `${ANN_GREETING}\n\n🔗 ${annLink}\n\n☝️ Запость эту ссылку в Telegram-канале, профиле или отправь друзьям.`,
    { reply_markup: annKeyboard() }
  );
}

async function handleStartWithCode(chatId, from, code) {
  if (isGloballyBanned(from.id) && !isOwner(from.id)) return;

  createOrUpdateUser(from);

  const linkData = findLinkDataByCode(code);
  console.log("START CODE:", code);
  console.log("LINK DATA:", linkData);
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
    source: linkData.source,
  });
  console.log("PENDING STATE:", pendingAnonymousMessages.get(String(from.id)));

  await safeSendMessage(chatId, "💌 Напиши анонимное сообщение.\nПолучатель не узнает, кто ты.");
}

async function showLink(chatId, from) {
  if (isGloballyBanned(from.id) && !isOwner(from.id)) return;

  const annUser = createOrUpdateAnnUser(from);
  await safeSendMessage(chatId, `🔗 Ваша ссылка:\n${annUser.link}`);
}

async function showUserStats(chatId, from) {
  if (isGloballyBanned(from.id) && !isOwner(from.id)) return;

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
  if (isGloballyBanned(from.id) && !isOwner(from.id)) return;
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
  if (isGloballyBanned(from.id) && !isOwner(from.id)) return;
  const user = createOrUpdateUser(from, { ensureCode: true });
  const oldCode = user.activeCode;
  const newCode = createUniqueCode();

  if (oldCode) user.oldCodes.push(oldCode);
  user.annCode = newCode;
  user.annLink = buildAnnLink(newCode);

  user.activeCode = user.annCode;
  user.link = user.annLink;

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
  if (isGloballyBanned(from.id) && !isOwner(from.id)) return;
  const annUser = createOrUpdateAnnUser(from);
  await safeSendMessage(
    chatId,
    `💘 Чтобы получить больше анонимных сообщений, разместите свою ссылку в Telegram-канале, сторис, профиле или отправьте друзьям.\n\n🔗 Ваша ссылка:\n${annUser.link}`
  );
}

async function startSupport(chatId, from) {
  if (isGloballyBanned(from.id) && !isOwner(from.id)) return;
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
  if (isGloballyBanned(userId) && !isOwner(userId)) return;

  if (!isTextMessage(msg)) {
    await sendUnsupportedMessageWarning(msg.chat.id);
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
  if (isGloballyBanned(senderId) && !isOwner(senderId)) return;
  const senderUsername = sender.username ? `@${sender.username}` : "нет username";
  const senderName = getDisplayName(sender);
  const receiverId = String(state.receiverId);
  const receiverUser = users[receiverId];
  state.source = normalizeConversationSource(state.source);

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

  if (!isSupportedDialogMessage(msg)) {
    await sendUnsupportedMessageWarning(msg.chat.id);
    return;
  }

  const contentType = getContentType(msg);
  const text = getStoredMessageText(msg);
  const fileId = getMessageFileId(msg);
  const fileUniqueId = getMessageFileUniqueId(msg);
  const caption = truncateText(getMessageText(msg), 2500);
  const duration = getMessageDuration(msg);
  const messageId = createId("msg");
  const mediaPath = await downloadMessageMedia(contentType, fileId, messageId);
  const conversation = createConversation(senderId, receiverId, {
    source: state.source,
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
    path: mediaPath,
    fileId,
    fileUniqueId,
    caption,
    duration,
    date,
  });

  let sentToReceiver = null;
  const messageKeyboard = conversationMessageKeyboard(conversation.id, receiverId, conversationMessage.id);
  const senderInfoBlock = formatConversationSenderBlock(conversation, receiverId, {
    initialAnonymousMessage: true,
  });
  const receiverText =
    `💌 Новое анонимное сообщение\n\n` +
    `${getContentTypeLabel(contentType)}:\n${text}` +
    (duration ? `\n⏱ Длительность: ${formatDuration(duration)}` : "") +
    (senderInfoBlock ? `\n\n${senderInfoBlock}` : "");

  if (contentType === "text") {
    sentToReceiver = await safeSendMessage(receiverId, receiverText, {
      reply_markup: messageKeyboard,
    });
  } else {
    sentToReceiver = await sendDialogPayload(receiverId, {
      contentType,
      path: mediaPath,
      fileId,
      caption: receiverText,
    }, {
      reply_markup: messageKeyboard,
    });
  }

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
    path: mediaPath,
    fileId,
    fileUniqueId,
    caption,
    duration,
    source: state.source,
    senderInfoVisible: isAnnConversation(conversation),
    conversationId: conversation.id,
    date,
    status: sentToReceiver ? "sent" : "error",
    telegramMessageId: sentToReceiver ? sentToReceiver.message_id : null,
    replies: [],
  };

  messages.push(savedMessage);
  saveMediaRecord({
    id: createId(contentType),
    messageId,
    contentType,
    path: mediaPath,
    fileId,
    fileUniqueId,
    caption,
    senderId,
    receiverId,
    conversationId: conversation.id,
    duration,
    date,
  });

  createStatsIfMissing(senderId).messagesSent += 1;
  createStatsIfMissing(receiverId).messagesReceived += 1;

  if (annUsers[receiverId]) annUsers[receiverId].messagesReceived += 1;
  if (annUsers[senderId]) annUsers[senderId].messagesSent += 1;

  saveData({ messageId, conversationId: conversation.id });
  pendingAnonymousMessages.delete(senderId);

  await safeSendMessage(msg.chat.id, "✅ Ваше анонимное сообщение отправлено.");
}

async function handleReplyMessage(msg, state) {
  const fromId = String(msg.from.id);
  if (isGloballyBanned(fromId) && !isOwner(fromId)) return;
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

  if (!isSupportedDialogMessage(msg)) {
    await sendUnsupportedMessageWarning(msg.chat.id);
    return;
  }

  const contentType = getContentType(msg);
  const answerText = getStoredMessageText(msg);
  const fileId = getMessageFileId(msg);
  const fileUniqueId = getMessageFileUniqueId(msg);
  const caption = truncateText(getMessageText(msg), 2500);
  const duration = getMessageDuration(msg);
  const questionText = original.text || `[${original.contentType || "сообщение"}]`;
  const replyId = createId("msg");
  const mediaPath = await downloadMessageMedia(contentType, fileId, replyId);
  const date = nowIso();
  const conversationMessage = ensureConversationMessage(conversation, {
    id: replyId,
    conversationId: conversation.id,
    fromId: Number(fromId),
    toId: Number(toId),
    text: answerText,
    contentType,
    path: mediaPath,
    fileId,
    fileUniqueId,
    caption,
    duration,
    date,
  });
  const messageKeyboard = conversationMessageKeyboard(conversation.id, toId, conversationMessage.id);

  const beautifulReplyText =
    `💌 Новое сообщение в анонимном диалоге\n\n` +
    `↩️ Ответ на:\n` +
    `${truncateText(questionText, 800)}\n\n` +
    `${getContentTypeLabel(contentType)} от собеседника:\n` +
    `${answerText}` +
    (duration ? `\n⏱ Длительность: ${formatDuration(duration)}` : "");

  let sentToReceiver = null;

  if (contentType === "text") {
    sentToReceiver = await safeSendMessage(toId, beautifulReplyText, {
      reply_markup: messageKeyboard,
    });
  } else {
    sentToReceiver = await sendDialogPayload(toId, {
      contentType,
      path: mediaPath,
      fileId,
      caption: beautifulReplyText,
    }, {
      reply_markup: messageKeyboard,
    });
  }

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
    senderId: Number(fromId),
    receiverId: Number(toId),
    text: answerText,
    contentType,
    path: mediaPath,
    fileId,
    fileUniqueId,
    caption,
    duration,
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
    contentType,
    path: mediaPath,
    fileId,
    fileUniqueId,
    caption,
    duration,
    answeredBy: Number(fromId),
    sentTo: Number(toId),
    senderId: Number(fromId),
    receiverId: Number(toId),
    date: reply.date,
    status: reply.status,
  };

  if (legacyOriginal) {
    legacyOriginal.replies.push(replyId);
    legacyOriginal.answers.push(answerRecord);
  }

  messages.push(reply);
  answers.push(answerRecord);
  saveMediaRecord({
    id: createId(contentType),
    messageId: replyId,
    contentType,
    path: mediaPath,
    fileId,
    fileUniqueId,
    caption,
    senderId: fromId,
    receiverId: toId,
    conversationId: conversation.id,
    duration,
    date,
  });

  createStatsIfMissing(fromId).repliesSent += 1;
  createStatsIfMissing(toId).repliesReceived += 1;

  if (annUsers[fromId]) annUsers[fromId].repliesSent += 1;
  if (annUsers[toId]) annUsers[toId].repliesReceived += 1;

  saveData({ messageId: replyId, replyId, conversationId: conversation.id });
  pendingReplies.delete(fromId);

  await safeSendMessage(msg.chat.id, "✅ Ответ отправлен");
}

function formatConversationMessageLine(message, viewerId, index, isAdminView = false, conversation = null) {
  const contentType = message.contentType || "text";
  const contentLabel = escapeHtml(getContentTypeLabel(contentType));
  const text = escapeHtml(truncateText(message.text || getContentTypeLabel(contentType), isAdminView ? 1200 : 700));
  const date = escapeHtml(formatDate(message.date));
  const messageReactions = reactions
    .filter((item) => String(item.messageId) === String(message.id))
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  const reactionBlock = messageReactions.length
    ? "\n" + messageReactions
      .map((item) => {
        return `   ${premiumReactionHtml(item.reactionKey)} Реакция: ${escapeHtml(item.name || item.reactionKey)} • ${escapeHtml(formatDate(item.date))}`;
      })
      .join("\n")
    : "";
  const duration = message.duration ? `\n   ⏱ Длительность: ${formatDuration(message.duration)}` : "";
  const mediaAction = contentType === "voice"
    ? "\n   🎤 Прослушать голосовое"
    : contentType === "video_note"
      ? "\n   📹 Открыть кружок"
      : contentType === "video"
        ? "\n   🎥 Открыть видео"
        : contentType === "photo"
          ? "\n   🖼 Открыть фото"
          : contentType === "document"
            ? "\n   📄 Открыть документ"
            : contentType === "animation"
              ? "\n   🎞 Открыть GIF"
              : "";

  if (isAdminView) {
    return (
      `${index}. ${date}\n` +
      `   👤 От: ${escapeHtml(getUserShortInfo(message.fromId))}\n` +
      `   👥 Кому: ${escapeHtml(getUserShortInfo(message.toId))}\n` +
      `   ${contentLabel}: ${text}${duration}${mediaAction}${reactionBlock}`
    );
  }

  const author = String(message.fromId) === String(viewerId) ? "Вы" : "Собеседник";
  const userDuration = message.duration ? `\n⏱ Длительность: ${formatDuration(message.duration)}` : "";
  const userReactions = reactionBlock ? reactionBlock.replace(/^   /gm, "") : "";
  return `${index}. ${escapeHtml(author)} • ${date}\n${contentLabel}: ${text}${userDuration}${userReactions}`;
}

function formatCompactQuestionAnswerDialog(conversation, viewerId, isAdminView = false) {
  const allMessages = getSortedConversationMessages(conversation);
  if (allMessages.length !== 2) return "";

  const [question, answer] = allMessages;
  const questionText = escapeHtml(truncateText(question.text || getContentTypeLabel(question.contentType), 1800));
  const answerText = escapeHtml(truncateText(answer.text || getContentTypeLabel(answer.contentType), 1800));
  const title = `📂 Диалог #${getConversationDisplayNumber(conversation)}`;

  return (
    `${title}\n\n` +
    `❓ Вопрос\n\n` +
    `${questionText}\n\n` +
    `🕒 ${escapeHtml(formatDate(question.date))}\n\n` +
    `━━━━━━━━━━━━━━\n\n` +
    `✅ Ответ\n\n` +
    `${answerText}\n\n` +
    `🕒 ${escapeHtml(formatDate(answer.date))}`
  );
}

function buildConversationMediaKeyboard(conversation, backCallback = "") {
  const rows = [];
  const mediaMessages = Array.isArray(conversation.messages)
    ? getSortedConversationMessages(conversation).filter((message) => (message.path || message.fileId || message.file_id) && message.contentType !== "text")
    : [];

  for (const message of mediaMessages.slice(-20)) {
    const label = message.contentType === "voice"
      ? "🎤 Прослушать голосовое"
      : message.contentType === "photo"
        ? "🖼 Открыть фото"
        : message.contentType === "document"
          ? "📄 Открыть документ"
          : message.contentType === "animation"
            ? "🎞 Открыть GIF"
            : message.contentType === "video_note"
              ? "📹 Открыть кружок"
              : message.contentType === "video"
                ? "🎥 Открыть видео"
                : "▶️ Открыть";
    rows.push([{ text: `${label} ${formatDate(message.date)}`, callback_data: `media:${conversation.id}:${message.id}` }]);
  }

  if (backCallback) rows.push([{ text: "🔙 Назад", callback_data: backCallback }]);
  return rows.length ? { inline_keyboard: rows } : null;
}

function formatConversationHistory(conversation, viewerId, options = {}) {
  const isAdminView = Boolean(options.admin);
  const limit = options.limit || 50;
  const allMessages = getSortedConversationMessages(conversation);
  const selectedMessages = isAdminView ? allMessages : allMessages.slice(-limit);
  const compactDialog = formatCompactQuestionAnswerDialog(conversation, viewerId, isAdminView);
  if (compactDialog && !isAdminView) return compactDialog;

  if (isAdminView) {
    const question = allMessages[0] || null;
    const answer = allMessages.slice(1).find(Boolean) || null;
    const senderId = question ? question.fromId : conversation.user1;
    const receiverId = question ? question.toId : conversation.user2;
    const extraMessages = allMessages.slice(2);

    const header =
      `📂 Диалог #${getConversationDisplayNumber(conversation)}\n\n` +
      `━━━━━━━━━━━━\n\n` +
      `❓ Вопрос\n\n` +
      `${escapeHtml(question ? question.text || getContentTypeLabel(question.contentType) : "—")}\n\n` +
      `🕒 ${escapeHtml(formatCardDate(question ? question.date : conversation.createdAt))}\n\n` +
      `━━━━━━━━━━━━\n\n` +
      `✅ Ответ\n\n` +
      `${escapeHtml(answer ? answer.text || getContentTypeLabel(answer.contentType) : "Ответов пока нет.")}\n\n` +
      `🕒 ${answer ? escapeHtml(formatCardDate(answer.date)) : "—"}\n\n` +
      `━━━━━━━━━━━━\n\n` +
      `👤 Отправитель\n\n` +
      `${escapeHtml(getUserShortInfo(senderId))}\n\n` +
      `🆔 ${escapeHtml(senderId)}\n\n` +
      `👥 Получатель\n\n` +
      `${escapeHtml(getUserShortInfo(receiverId))}\n\n` +
      `🆔 ${escapeHtml(receiverId)}`;

    if (!extraMessages.length) return `${header}\n\n━━━━━━━━━━━━`;

    const extraText = extraMessages
      .map((message, index) => formatConversationMessageLine(message, viewerId, index + 3, true, conversation))
      .join("\n\n");

    return `${header}\n\n━━━━━━━━━━━━\n\n${extraText}`;
  }

  const header = isAdminView
    ? `📂 Диалог #${getConversationDisplayNumber(conversation)}\n\n` +
    `👤 Участник 1: ${escapeHtml(getUserShortInfo(conversation.user1))}\n` +
    `👤 Участник 2: ${escapeHtml(getUserShortInfo(conversation.user2))}\n` +
    `💌 Сообщений: ${allMessages.length}\n` +
    `🕒 Создан: ${escapeHtml(formatDate(conversation.createdAt))}\n` +
    `🕒 Активность: ${escapeHtml(formatDate(conversation.lastActivity))}`
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

  const mediaKeyboard = buildConversationMediaKeyboard(conversation);
  await safeSendLongMessage(
    chatId,
    formatConversationHistory(conversation, from.id, { limit: 50 }),
    mediaKeyboard ? { parse_mode: "HTML", reply_markup: mediaKeyboard } : { parse_mode: "HTML" }
  );
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

  const mediaKeyboard = buildConversationMediaKeyboard(conversation);
  await safeSendLongMessage(
    chatId,
    formatConversationHistory(conversation, from.id, { limit: 50 }),
    mediaKeyboard ? { parse_mode: "HTML", reply_markup: mediaKeyboard } : { parse_mode: "HTML" }
  );
}

function getSortedConversations() {
  return conversations
    .slice()
    .sort((a, b) => new Date(b.lastActivity || b.createdAt || 0) - new Date(a.lastActivity || a.createdAt || 0));
}

function buildAdminConversationsKeyboard(page = 0) {
  const sorted = getSortedConversations();
  const totalPages = Math.max(1, Math.ceil(sorted.length / ADMIN_CONVERSATIONS_PAGE_SIZE));
  const currentPage = Math.min(Math.max(Number(page) || 0, 0), totalPages - 1);
  const offset = currentPage * ADMIN_CONVERSATIONS_PAGE_SIZE;

  const keyboard = sorted
    .slice(offset, offset + ADMIN_CONVERSATIONS_PAGE_SIZE)
    .map((conversation, index) => {
      const count = Array.isArray(conversation.messages) ? conversation.messages.length : 0;
      const lastActivity = formatDate(conversation.lastActivity || conversation.createdAt);
      return [
        {
          text: `#${getConversationDisplayNumber(conversation)}. ${conversation.user1} ↔ ${conversation.user2} • ${count} • ${lastActivity}`,
          callback_data: `admin_conv:${conversation.id}`,
        },
      ];
    });

  const pagination = [];
  if (currentPage > 0) pagination.push({ text: "⬅️ Назад", callback_data: `admin_conversations:${currentPage - 1}` });
  if (currentPage < totalPages - 1) pagination.push({ text: "➡️ Вперёд", callback_data: `admin_conversations:${currentPage + 1}` });
  if (pagination.length) keyboard.push(pagination);
  keyboard.push([{ text: "🔙 Назад", callback_data: "admin_back" }]);
  return { inline_keyboard: keyboard };
}

function buildAdminConversationDetailsKeyboard(conversation) {
  const rows = [];
  const mediaKeyboard = buildConversationMediaKeyboard(conversation);
  if (mediaKeyboard && Array.isArray(mediaKeyboard.inline_keyboard)) {
    rows.push(...mediaKeyboard.inline_keyboard);
  }

  const sorted = getSortedConversations();
  const index = sorted.findIndex((item) => String(item.id) === String(conversation.id));
  const nav = [];

  if (index > 0) {
    nav.push({ text: "◀️ Предыдущий", callback_data: `admin_conv:${sorted[index - 1].id}` });
  }

  nav.push({ text: "📜 Список", callback_data: "admin_conversations" });

  if (index >= 0 && index < sorted.length - 1) {
    nav.push({ text: "▶️ Следующий", callback_data: `admin_conv:${sorted[index + 1].id}` });
  }

  rows.push(nav);
  return { inline_keyboard: rows };
}

async function showAdminConversations(chatId, from, messageId = null, page = 0) {
  if (!isOwner(from.id)) return safeSendMessage(chatId, "⛔ У вас нет доступа.");

  const text =
    `📜 История диалогов\n\n` +
    `💬 Всего диалогов: ${conversations.length}\n` +
    `👥 Пользователей в базе: ${Object.keys(users).length}\n` +
    `💌 Сообщений: ${getConversationMessagesTotal()}\n\n` +
    `Новые диалоги всегда сверху. На странице по ${ADMIN_CONVERSATIONS_PAGE_SIZE} диалогов.`;

  const options = { reply_markup: buildAdminConversationsKeyboard(page) };

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
    reply_markup: buildAdminConversationDetailsKeyboard(conversation),
    parse_mode: "HTML",
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
  const userList = getSortedQaParticipants();

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

function getUserActivityScore(user) {
  const userStats = stats[String(user.id)] || {};
  return (
    Number(userStats.messagesReceived || 0) +
    Number(userStats.messagesSent || 0) +
    Number(userStats.repliesSent || 0) +
    Number(userStats.repliesReceived || 0) +
    Number(userStats.linkClicks || 0)
  );
}

function getUserSortDate(user) {
  return new Date(user.lastActive || user.firstSeen || 0).getTime() || 0;
}

function getSortedQaParticipants() {
  return Object.values(users).sort((a, b) => {
    const activityDiff = getUserActivityScore(b) - getUserActivityScore(a);
    if (activityDiff !== 0) return activityDiff;
    return getUserSortDate(b) - getUserSortDate(a);
  });
}

async function showAdminUsers(chatId, from, messageId = null) {
  if (!isOwner(from.id)) return safeSendMessage(chatId, "⛔ У вас нет доступа.");

  syncStatsFromHistory();
  const totalUsers = Object.keys(users).length;
  const participants = getSortedQaParticipants();
  console.log(`✅ QA participants: ${participants.length}`);

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

async function rebuildAdminStats(chatId, from, userId = "", messageId = null) {
  if (!isOwner(from.id)) return safeSendMessage(chatId, "⛔ У вас нет доступа.");

  recalculateStatsFromMessages();

  console.log(`✅ Users loaded: ${Object.keys(users).length}`);
  console.log(`✅ Messages loaded: ${messages.length}`);
  console.log(`✅ Answers loaded: ${answers.length}`);
  console.log(`✅ Conversations loaded: ${conversations.length}`);
  console.log("✅ Stats rebuilt successfully");

  if (userId && users[String(userId)]) {
    await safeSendMessage(chatId, "✅ Статистика пересчитана и сохранена.");
    return showAdminUserDetails(chatId, from, userId, messageId);
  }

  await safeSendMessage(chatId, "✅ Статистика пересчитана и сохранена.");
}

function getUserConversationHistoryCards(userId, limit = 10) {
  const id = String(userId);
  const usedQuestionIds = new Set();
  const userConversations = conversations
    .filter((conversation) => {
      if (String(conversation.user1) === id || String(conversation.user2) === id) return true;
      return Array.isArray(conversation.messages) && conversation.messages.some((message) => {
        return String(message.fromId) === id || String(message.toId) === id;
      });
    })
    .sort((a, b) => new Date(a.lastActivity || a.createdAt || 0) - new Date(b.lastActivity || b.createdAt || 0))
    .filter((conversation) => {
      const firstMessage = Array.isArray(conversation.messages) ? conversation.messages[0] : null;
      const key = firstMessage && firstMessage.id ? String(firstMessage.id) : String(conversation.id);
      if (usedQuestionIds.has(key)) return false;
      usedQuestionIds.add(key);
      return true;
    })
    .slice(-limit);

  return userConversations.map((conversation, index) => {
    const conversationMessages = getSortedConversationMessages(conversation);
    const question = conversationMessages[0] || null;
    const answer = conversationMessages.slice(1).find(Boolean) || null;
    const questionText = question ? truncateText(question.text || getContentTypeLabel(question.contentType), 900) : "—";
    const answerText = answer ? truncateText(answer.text || getContentTypeLabel(answer.contentType), 900) : "Ответов пока нет";
    const dialogNumber = getConversationDisplayNumber(conversation);

    return (
      `📂 Диалог #${dialogNumber}\n\n` +
      `❓ Вопрос\n${questionText}\n\n` +
      `🕒 ${formatCardDate(question ? question.date : conversation.createdAt)}\n\n` +
      `✅ Ответ\n${answerText}\n\n` +
      `🕒 ${answer ? formatCardDate(answer.date) : "—"}`
    );
  });
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
  const userStats = getUserStatsFromHistory(userId);
  console.log(`User ID: ${userId}`);
  console.log(`Questions sent: ${userStats.messagesSent}`);
  console.log(`Questions received: ${userStats.messagesReceived}`);
  console.log(`Answers sent: ${userStats.repliesSent}`);
  console.log(`Answers received: ${userStats.repliesReceived}`);

  const userConversationCards = getUserConversationHistoryCards(userId, 10);
  const questionsAndAnswersText = userConversationCards.length
    ? userConversationCards.join("\n\n━━━━━━━━━━━━━━\n\n")
    : "Пока нет вопросов и ответов.";

  const userOnlyAnswers = collectAnswerRecords()
    .filter((item) => item.source === "answers")
    .filter((item) => String(item.senderId) === String(userId) || String(item.receiverId) === String(userId))
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
    .slice(-10);

  const answersArchiveText = userOnlyAnswers.length
    ? userOnlyAnswers
      .map((item, index) => {
        return (
          `🧾 Ответ #${index + 1}\n\n` +
          `${truncateText(item.answerText || "—", 900)}\n\n` +
          `🕒 ${formatCardDate(item.date)}`
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
    `📩 Отправил вопросов: ${userStats.messagesSent}\n` +
    `❤️ Получил вопросов: ${userStats.messagesReceived}\n` +
    `✍️ Отправил ответов: ${userStats.repliesSent}\n` +
    `💬 Получил ответов: ${userStats.repliesReceived}\n\n` +
    `━━━━━━━━━━━━━━\n\n` +
    `❔ Вопросы и ответы участника:\n\n${questionsAndAnswersText}\n\n` +
    `━━━━━━━━━━━━━━\n\n` +
    `🧾 Архив ответов:\n\n${answersArchiveText}`;

  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔄 Пересчитать статистику", callback_data: `admin_rebuild_stats:${user.id}` }],
        [{ text: "🔙 К участникам", callback_data: "admin_users" }],
      ],
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

async function startBanUser(chatId, from, rawUserId) {
  if (!isOwner(from.id)) return;
  const userId = normalizeTelegramId(rawUserId);
  if (!userId) return safeSendMessage(chatId, "ℹ️ Использование: /ban ID");

  await safeSendMessage(
    chatId,
    `⚠️ Вы уверены, что хотите заблокировать пользователя?\n\n` +
    `🆔 ${userId}\n` +
    `👤 ${getUserShortInfo(userId)}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Да, заблокировать", callback_data: `ban_confirm:${userId}` }],
          [{ text: "❌ Отмена", callback_data: `ban_cancel:${userId}` }],
        ],
      },
    }
  );
}

async function startUnbanUser(chatId, from, rawUserId) {
  if (!isOwner(from.id)) return;
  const userId = normalizeTelegramId(rawUserId);
  if (!userId) return safeSendMessage(chatId, "ℹ️ Использование: /unban ID");

  await safeSendMessage(
    chatId,
    `⚠️ Разблокировать пользователя?\n\n🆔 ${userId}\n👤 ${getUserShortInfo(userId)}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Да, разблокировать", callback_data: `unban_confirm:${userId}` }],
          [{ text: "❌ Отмена", callback_data: `unban_cancel:${userId}` }],
        ],
      },
    }
  );
}

async function showBlockedUsers(chatId, from, messageId = null) {
  if (!isOwner(from.id)) return safeSendMessage(chatId, "⛔ У вас нет доступа.");

  const bannedEntries = Object.values(getBannedUsers())
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  const text = bannedEntries.length
    ? `🚫 Заблокированные пользователи\n\n` + bannedEntries
      .map((entry) => {
        return `👤 ${getUserShortInfo(entry.userId)}\n🆔 ${entry.userId}\n📅 ${formatDate(entry.date)}`;
      })
      .join("\n\n")
    : "🚫 Заблокированных пользователей нет.";

  const keyboard = bannedEntries.map((entry) => ([
    { text: `♻️ Разблокировать ${entry.userId}`, callback_data: `unban_confirm:${entry.userId}` },
  ]));
  keyboard.push([{ text: "🔙 Назад", callback_data: "admin_back" }]);

  const options = { reply_markup: { inline_keyboard: keyboard } };
  if (messageId) return safeEditMessageText(chatId, messageId, text, options);
  return safeSendMessage(chatId, text, options);
}

async function handleBanDecisionCallback(query, action, userId = "") {
  const chatId = query.message.chat.id;
  const from = query.from;
  const key = getCallbackMessageKey(query);

  if (!isOwner(from.id)) return;

  if (processedBanCallbacks.has(key) || processingBanCallbacks.has(key)) {
    await clearCallbackInlineKeyboard(query);
    return;
  }

  processingBanCallbacks.add(key);

  try {
    await clearCallbackInlineKeyboard(query);

    if (action === "confirm") {
      banUser(userId, from.id);
      await safeSendMessage(chatId, "✅ Пользователь успешно заблокирован");
      return;
    }

    if (action === "cancel") {
      await safeSendMessage(chatId, "❌ Блокировка отменена");
      return;
    }
  } finally {
    processingBanCallbacks.delete(key);
    markBanCallbackProcessed(key);
  }
}

async function handleUnbanDecisionCallback(query, action, userId = "") {
  const chatId = query.message.chat.id;
  const from = query.from;

  if (!isOwner(from.id)) return;

  await clearCallbackInlineKeyboard(query);

  if (action === "confirm") {
    unbanUserGlobal(userId);
    await safeSendMessage(chatId, "✅ Пользователь разблокирован");
    return;
  }

  if (action === "cancel") {
    await safeSendMessage(chatId, "❌ Разблокировка отменена");
  }
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
  logAdminAction(from, "export_json");

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
    ADMIN_LOGS_FILE,
    POLLS_FILE,
    VOICE_MESSAGES_FILE,
    VIDEO_MESSAGES_FILE,
    VIDEO_NOTES_FILE,
    PHOTO_MESSAGES_FILE,
    GIF_MESSAGES_FILE,
    DOCUMENT_MESSAGES_FILE,
    PREMIUM_REACTIONS_FILE,
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

async function broadcastToUsers(chatId, from, text) {
  if (!isOwner(from.id)) return;

  const payload = String(text || "").trim();
  if (!payload) {
    await safeSendMessage(chatId, "ℹ️ Использование: /broadcast текст рассылки");
    return;
  }

  const recipients = Object.keys(users);
  let sent = 0;
  let failed = 0;

  for (const userId of recipients) {
    const result = await safeSendMessage(userId, payload);
    if (result) sent += 1;
    else failed += 1;
  }

  logAdminAction(from, "broadcast", {
    recipients: recipients.length,
    sent,
    failed,
    text: truncateText(payload, 1000),
  });

  await safeSendMessage(chatId, `✅ Рассылка завершена\n\n📨 Отправлено: ${sent}\n❌ Ошибок: ${failed}`);
}

async function startPushFlow(chatId, from) {
  if (!isOwner(from.id)) return;
  pendingPushMessages.set(String(from.id), { step: "text", text: "", createdAt: Date.now() });
  await safeSendMessage(chatId, "Введите текст рассылки");
}

async function handlePushFlow(msg) {
  const userId = String(msg.from.id);
  const state = pendingPushMessages.get(userId);
  if (!state || !isOwner(msg.from.id)) return false;

  const text = getMessageText(msg).trim();
  if (!text) {
    await safeSendMessage(msg.chat.id, "Введите текст рассылки");
    return true;
  }

  state.text = text;
  state.step = "confirm";
  pendingPushMessages.set(userId, state);

  await safeSendMessage(msg.chat.id, `Отправить всем?\n\n${truncateText(text, 1200)}`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "✅ Да", callback_data: "push_confirm" }],
        [{ text: "❌ Отмена", callback_data: "push_cancel" }],
      ],
    },
  });
  return true;
}

async function sendPollToUsers(chatId, from, rawText) {
  if (!isOwner(from.id)) return;

  const parts = String(rawText || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  const question = parts.shift();
  const options = parts;

  if (!question || options.length < 2) {
    await safeSendMessage(chatId, "ℹ️ Использование: /poll Вопрос | Вариант 1 | Вариант 2");
    return;
  }

  const pollRecord = {
    id: createId("poll"),
    question,
    options,
    recipients: Object.keys(users).length,
    sent: 0,
    failed: 0,
    date: nowIso(),
  };

  for (const userId of Object.keys(users)) {
    try {
      await bot.sendPoll(userId, question, options, { is_anonymous: true });
      pollRecord.sent += 1;
    } catch (error) {
      console.error("sendPoll error:", error.message);
      pollRecord.failed += 1;
    }
  }

  polls.push(pollRecord);
  savePolls();
  logAdminAction(from, "poll", pollRecord);

  await safeSendMessage(
    chatId,
    `✅ Опрос отправлен\n\n📊 Получателей: ${pollRecord.recipients}\n📨 Отправлено: ${pollRecord.sent}\n❌ Ошибок: ${pollRecord.failed}`
  );
}

async function startPollFlow(chatId, from) {
  if (!isOwner(from.id)) return;
  pendingPollMessages.set(String(from.id), { step: "question", question: "", options: [], createdAt: Date.now() });
  await safeSendMessage(chatId, "Введите вопрос опроса");
}

async function handlePollFlow(msg) {
  const userId = String(msg.from.id);
  const state = pendingPollMessages.get(userId);
  if (!state || !isOwner(msg.from.id)) return false;

  const text = getMessageText(msg).trim();
  if (!text) return true;

  if (state.step === "question") {
    state.question = text;
    state.step = "options";
    pendingPollMessages.set(userId, state);
    await safeSendMessage(msg.chat.id, "Введите варианты ответов, каждый с новой строки");
    return true;
  }

  if (state.step === "options") {
    state.options = text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    if (state.options.length < 2) {
      await safeSendMessage(msg.chat.id, "Нужно минимум 2 варианта. Введите варианты ответов, каждый с новой строки");
      return true;
    }

    state.step = "confirm";
    pendingPollMessages.set(userId, state);
    await safeSendMessage(
      msg.chat.id,
      `Отправить опрос всем?\n\n${state.question}\n\n${state.options.join("\n")}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Да", callback_data: "poll_confirm" }],
            [{ text: "❌ Отмена", callback_data: "poll_cancel" }],
          ],
        },
      }
    );
    return true;
  }

  return true;
}

bot.onText(/^\/start(?:@[A-Za-z0-9_]+)?(?:\s+(.+))?$/i, async (msg, match) => {
  try {
    const cooldownKey = String(msg.from.id);
    const now = Date.now();
    const lastStart = startCooldown.get(cooldownKey) || 0;

    if (now - lastStart < 1500) {
      return;
    }

    startCooldown.set(cooldownKey, now);
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

bot.onText(/^\/annstart(?:@[A-Za-z0-9_]+)?$/i, async (msg) => {
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
bot.onText(/^\/ban(?:@[A-Za-z0-9_]+)?(?:\s+(\d+))?$/i, async (msg, match) => {
  await startBanUser(msg.chat.id, msg.from, match && match[1]);
});
bot.onText(/^\/unban(?:@[A-Za-z0-9_]+)?(?:\s+(\d+))?$/i, async (msg, match) => {
  await startUnbanUser(msg.chat.id, msg.from, match && match[1]);
});
bot.onText(/^\/push(?:@[A-Za-z0-9_]+)?$/i, async (msg) => {
  await startPushFlow(msg.chat.id, msg.from);
});
bot.onText(/^\/id(?:@[A-Za-z0-9_]+)?(?:\s+(\d+))?$/i, async (msg, match) => {
  await handleOwnerIdLookup(msg.chat.id, msg.from, match && match[1]);
});
bot.onText(/^\/broadcast(?:@[A-Za-z0-9_]+)?(?:\s+([\s\S]+))?$/i, async (msg, match) => {
  await broadcastToUsers(msg.chat.id, msg.from, match && match[1]);
});
bot.onText(/^\/poll(?:@[A-Za-z0-9_]+)?(?:\s+([\s\S]+))?$/i, async (msg, match) => {
  if (match && match[1]) {
    await sendPollToUsers(msg.chat.id, msg.from, match[1]);
    return;
  }

  await startPollFlow(msg.chat.id, msg.from);
});

bot.on("callback_query", async (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;
  const from = query.from;
  const messageId = query.message.message_id;

  try {
    await bot.answerCallbackQuery(query.id).catch(() => { });

    if (isGloballyBanned(from.id) && !isOwner(from.id)) return;

    if (data === "help") return showHelp(chatId, from);
    if (data === "ann_stats") return showUserStats(chatId, from);
    if (data === "more_messages") return showMoreMessages(chatId, from);
    if (data === "change_link") return changeLink(chatId, from);
    if (data === "support") return startSupport(chatId, from);

    if (data === "push_cancel" || data === "poll_cancel") {
      pendingPushMessages.delete(String(from.id));
      pendingPollMessages.delete(String(from.id));
      await safeSendMessage(chatId, "❌ Отменено.");
      return;
    }

    if (data === "ban_cancel" || (data && data.startsWith("ban_cancel:"))) {
      const userId = data.includes(":") ? data.split(":")[1] : "";
      return handleBanDecisionCallback(query, "cancel", userId);
    }

    if (data && data.startsWith("ban_confirm:")) {
      const userId = data.split(":")[1];
      return handleBanDecisionCallback(query, "confirm", userId);
    }

    if (data && data.startsWith("unban_cancel:")) {
      const userId = data.split(":")[1];
      return handleUnbanDecisionCallback(query, "cancel", userId);
    }

    if (data && data.startsWith("unban_confirm:")) {
      const userId = data.split(":")[1];
      return handleUnbanDecisionCallback(query, "confirm", userId);
    }

    if (data === "push_confirm") {
      if (!isOwner(from.id)) return;
      const state = pendingPushMessages.get(String(from.id));
      if (!state || !state.text) {
        await safeSendMessage(chatId, "❌ Текст рассылки не найден.");
        return;
      }

      pendingPushMessages.delete(String(from.id));
      return broadcastToUsers(chatId, from, state.text);
    }

    if (data === "poll_confirm") {
      if (!isOwner(from.id)) return;
      const state = pendingPollMessages.get(String(from.id));
      if (!state || !state.question || !Array.isArray(state.options) || state.options.length < 2) {
        await safeSendMessage(chatId, "❌ Опрос не найден.");
        return;
      }

      pendingPollMessages.delete(String(from.id));
      return sendPollToUsers(chatId, from, [state.question, ...state.options].join(" | "));
    }

    if (data && data.startsWith("reply_conv:")) {
      const [, conversationId, messageIdForReply = ""] = data.split(":");
      const conversation = resolveConversationForCallback(conversationId, query, messageIdForReply);

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
      const [, conversationId, requestedMessageId = ""] = data.split(":");
      const conversation = resolveConversationForCallback(conversationId, query, requestedMessageId);

      if (!conversation) {
        await safeSendMessage(chatId, "❌ Диалог уже удалён или недоступен.");
        return;
      }

      if (!isConversationParticipant(conversation, from.id)) {
        await safeSendMessage(chatId, "⛔ У вас нет доступа.");
        return;
      }

      let message = requestedMessageId && Array.isArray(conversation.messages)
        ? conversation.messages.find((item) => String(item.id) === String(requestedMessageId))
        : findConversationMessageForCallback(query, conversation);
      if (!message) {
        const fallbackMessage = getLatestInboundConversationMessage(conversation, from.id);

        if (!fallbackMessage) {
          await safeSendMessage(chatId, "❌ Сообщение для реакции не найдено.");
          return;
        }

        message = fallbackMessage;
      }

      await safeEditMessageReplyMarkup(chatId, query.message.message_id, reactionMenuKeyboard(conversation.id, message.id));
      return;
    }

    if (data && data.startsWith("reaction:")) {
      const parts = data.split(":");
      const conversationId = parts[1];
      const messageIdForReaction = parts[2];
      const reactionKey = parts[3];
      const conversation = resolveConversationForCallback(conversationId, query, messageIdForReaction);

      if (!conversation) {
        await safeSendMessage(chatId, "❌ Диалог уже удалён или недоступен.");
        return;
      }

      const message = Array.isArray(conversation.messages)
        ? conversation.messages.find((item) => item.id === String(messageIdForReaction))
        : null;

      const reaction = getPremiumReaction(reactionKey);
      if (!reaction || !message) {
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

      console.log("Reaction key:", reaction.key);
      console.log("Emoji:", reaction.emoji);
      console.log("Emoji ID:", reaction.emojiId);
      console.log("✅ Premium reaction selected");
      console.log(`✅ Emoji ID: ${reaction.emojiId}`);

      const reactionRecord = addReaction(message, reaction.key, from.id);
      if (!reactionRecord) {
        await safeSendMessage(chatId, "❌ Реакцию не удалось сохранить.");
        return;
      }

      await safeEditMessageReplyMarkup(
        chatId,
        query.message.message_id,
        conversationMessageKeyboard(conversation.id, from.id, message.id)
      );

      await safeSendMessage(
        message.fromId,
        `🎭 На ваше сообщение отреагировали\n\n` +
        `💬 Сообщение:\n${escapeHtml(truncateText(message.text || getContentTypeLabel(message.contentType), 1200))}\n\n` +
        `✨ Реакция: ${premiumReactionHtml(reaction.key)} ${escapeHtml(reaction.name)}\n\n` +
        `🕒 ${escapeHtml(formatDate(reactionRecord.date))}`,
        { parse_mode: "HTML" }
      );
      return;
    }

    if (data && data.startsWith("media:")) {
      const [, conversationId, messageIdForMedia = ""] = data.split(":");
      const conversation = resolveConversationForCallback(conversationId, query, messageIdForMedia);

      if (!conversation) {
        await safeSendMessage(chatId, "❌ Диалог уже удалён или недоступен.");
        return;
      }

      if (!isConversationParticipant(conversation, from.id) && !isOwner(from.id)) {
        await safeSendMessage(chatId, "⛔ У вас нет доступа.");
        return;
      }

      const message = Array.isArray(conversation.messages)
        ? conversation.messages.find((item) => String(item.id) === String(messageIdForMedia))
        : null;

      await sendStoredConversationMedia(chatId, message);
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
    if (data && data.startsWith("admin_rebuild_stats:")) {
      const userId = data.split(":")[1] || "";
      return rebuildAdminStats(chatId, from, userId, messageId);
    }
    if (data && data.startsWith("admin_user:")) {
      const userId = data.split(":")[1];
      return showAdminUserDetails(chatId, from, userId, messageId);
    }
    if (data === "admin_back") return showAdminPanel(chatId, from, messageId);
    if (data === "admin_ann_users") return showAdminAnnUsers(chatId, from);
    if (data === "admin_messages") return showAdminMessages(chatId, from);
    if (data === "admin_blocked_users") return showBlockedUsers(chatId, from, messageId);
    if (data === "admin_conversations") return showAdminConversations(chatId, from, messageId);
    if (data && data.startsWith("admin_conversations:")) {
      const page = Number(data.split(":")[1] || 0);
      return showAdminConversations(chatId, from, messageId, page);
    }
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
    if (isGloballyBanned(msg.from.id) && !isOwner(msg.from.id)) return;

    createOrUpdateUser(msg.from);

    const userId = String(msg.from.id);

    if (pendingPushMessages.has(userId)) {
      await handlePushFlow(msg);
      return;
    }

    if (pendingPollMessages.has(userId)) {
      await handlePollFlow(msg);
      return;
    }

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
    logDataStorageInfo();
    loadData();
    const me = await bot.getMe();
    botUsername = me.username;

    await bot.setMyDescription(BOT_DESCRIPTION).catch((error) => {
      console.error("setMyDescription error:", error.message);
    });

    await bot.setMyShortDescription(BOT_SHORT_DESCRIPTION).catch((error) => {
      console.error("setMyShortDescription error:", error.message);
    });

    for (const user of Object.values(users)) {
      if (!user.startCode) user.startCode = "";
      if (!user.annCode) user.annCode = user.activeCode || "";
      if (user.startCode) user.startLink = buildStartLink(user.startCode);
      if (user.annCode) user.annLink = buildAnnLink(user.annCode);
      if (user.annCode) user.link = buildAnnLink(user.annCode);
    }

    for (const user of Object.values(annUsers)) {
      if (user.activeCode) user.link = buildAnnLink(user.activeCode);
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
