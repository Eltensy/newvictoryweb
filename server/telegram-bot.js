// server/telegram-bot.js - Fixed Version
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = process.env.API_URL || 'http://localhost:5000';
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME;

// Validation
if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set in environment variables');
  process.exit(1);
}

if (!BOT_USERNAME) {
  console.warn('⚠️  TELEGRAM_BOT_USERNAME not set - bot link generation may not work');
}

// Initialize bot
const bot = new TelegramBot(BOT_TOKEN, { 
  polling: true,
  request: {
    agentOptions: {
      keepAlive: true,
      family: 4
    }
  }
});

console.log('🤖 Telegram bot started');
console.log(`📡 API URL: ${API_URL}`);
console.log(`👤 Bot username: @${BOT_USERNAME || 'not set'}`);

// Helper: Send formatted message
async function sendMessage(chatId, text, options = {}) {
  try {
    return await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      ...options
    });
  } catch (error) {
    console.error('Failed to send message:', error.message);
    try {
      return await bot.sendMessage(chatId, text.replace(/[*_`]/g, ''), options);
    } catch (fallbackError) {
      console.error('Fallback send also failed:', fallbackError.message);
    }
  }
}

// Helper: Get user info
function getUserInfo(user) {
  return {
    id: user.id,
    username: user.username || null,
    firstName: user.first_name || null,
    lastName: user.last_name || null,
    displayName: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || `User${user.id}`
  };
}

// Helper: Get profile photo URL
async function getProfilePhotoUrl(userId) {
  try {
    const photos = await bot.getUserProfilePhotos(userId, { limit: 1 });
    if (photos.total_count > 0 && photos.photos[0] && photos.photos[0][0]) {
      const fileId = photos.photos[0][0].file_id;
      const file = await bot.getFile(fileId);
      return `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    }
  } catch (error) {
    console.log(`Could not fetch profile photo for user ${userId}:`, error.message);
  }
  return null;
}

// Command: /start (without code)
bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id;
  const user = getUserInfo(msg.from);

  const welcomeMessage = `
👋 *Привет, ${user.displayName}!*

Я бот для связывания Telegram аккаунта с платформой ConstestGG.

*🔗 Как привязать аккаунт:*

1️⃣ Войдите на сайт ConstestGG
2️⃣ Откройте профиль пользователя
3️⃣ Нажмите "Привязать Telegram"
4️⃣ Скопируйте код верификации
5️⃣ Отправьте мне команду: \`/start КОД\`

*Или просто перейдите по ссылке из профиля - код уже будет в команде!*

_Код действителен 5 минут после создания._

💡 *Команды:*
/start - Это сообщение
/help - Помощь
/status - Проверить статус привязки
`;

  await sendMessage(chatId, welcomeMessage);
});

// Command: /start CODE (with verification code)
bot.onText(/^\/start\s+([A-Z0-9]{6})$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const verificationCode = match[1].trim().toUpperCase();
  const user = getUserInfo(msg.from);

  console.log(`🔍 User @${user.username || user.id} attempting verification with code: ${verificationCode}`);

  const processingMsg = await sendMessage(
    chatId,
    '⏳ Проверяю код верификации...'
  );

  try {
    // Get profile photo
    const photoUrl = await getProfilePhotoUrl(user.id);

    // Construct full URL
    const webhookUrl = `${API_URL}/api/auth/telegram/webhook`;
    console.log(`📤 Sending request to: ${webhookUrl}`);

    // Send verification to backend
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-bot-token': BOT_TOKEN
      },
      body: JSON.stringify({
        verificationCode,
        telegramId: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl
      })
    });

    console.log(`📥 Response status: ${response.status} ${response.statusText}`);
    
    // Check content type before parsing
    const contentType = response.headers.get('content-type');
    console.log(`📄 Content-Type: ${contentType}`);

    // Delete processing message
    try {
      await bot.deleteMessage(chatId, processingMsg.message_id);
    } catch (e) {
      // Ignore if can't delete
    }

    // Handle non-JSON responses
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.error('❌ Received non-JSON response:', textResponse.substring(0, 200));
      
      throw new Error(
        `Сервер вернул неправильный формат ответа. ` +
        `Проверьте, что API сервер запущен на ${API_URL}`
      );
    }

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Ошибка верификации');
    }

    // Success message
    await sendMessage(
      chatId,
      `✅ *Аккаунт успешно привязан!*

👤 Telegram: @${user.username || user.firstName}
🎮 Платформа: ConstestGG

Теперь вы будете получать уведомления о:
• Одобрении заявок
• Изменении баланса
• Статусе выводов
• Турнирах и событиях

Вернитесь на сайт - привязка завершена! 🎉`
    );

    console.log(`✅ Successfully linked @${user.username || user.id} with code ${verificationCode}`);

  } catch (error) {
    console.error('❌ Telegram linking error:', error);

    try {
      await bot.deleteMessage(chatId, processingMsg.message_id);
    } catch (e) {
      // Ignore
    }

    let errorMessage = '❌ *Ошибка привязки аккаунта*\n\n';

    if (error.message.includes('Invalid or expired')) {
      errorMessage += 
        '⏱️ Код верификации истек или неверен.\n\n' +
        '✅ *Решение:*\n' +
        '1. Вернитесь на сайт\n' +
        '2. Получите новый код\n' +
        '3. Попробуйте снова';
    } else if (error.message.includes('already linked')) {
      errorMessage += 
        '🔗 Этот Telegram аккаунт уже привязан к другому пользователю.\n\n' +
        'Если это ваш аккаунт, обратитесь в поддержку.';
    } else if (error.message.includes('формат ответа') || error.message.includes('API сервер')) {
      errorMessage += 
        '🔧 *Проблема с подключением к серверу*\n\n' +
        `Не удалось связаться с API сервером (${API_URL}).\n\n` +
        '**Возможные причины:**\n' +
        '• Сервер не запущен\n' +
        '• Неверный URL в настройках бота\n' +
        '• Проблемы с сетью\n\n' +
        'Обратитесь к администратору.';
    } else {
      errorMessage += 
        `Произошла ошибка: ${error.message}\n\n` +
        'Попробуйте еще раз или обратитесь в поддержку.';
    }

    await sendMessage(chatId, errorMessage);
  }
});

// Command: /help
bot.onText(/^\/help$/i, async (msg) => {
  const chatId = msg.chat.id;

  const helpMessage = `
📚 *Справка по боту ConstestGG*

*🔗 Привязка аккаунта:*
1. Зайдите на сайт ConstestGG
2. Авторизуйтесь через Epic Games
3. Откройте профиль
4. Нажмите "Привязать Telegram"
5. Перейдите по ссылке или отправьте код боту

*📋 Команды:*
/start - Начать работу с ботом
/start КОД - Привязать аккаунт с кодом верификации
/help - Показать эту справку
/status - Проверить статус привязки (скоро)

*💬 Уведомления:*
После привязки вы будете получать:
• ✅ Одобрение заявок на участие
• 💰 Изменение баланса
• 💳 Статус выводов средств
• 🏆 Информацию о турнирах
• 🎮 Новости платформы

*❓ Нужна помощь?*
Обратитесь в поддержку на сайте ConstestGG.

_Код верификации действителен 5 минут._
`;

  await sendMessage(chatId, helpMessage);
});

// Command: /status
bot.onText(/^\/status$/i, async (msg) => {
  const chatId = msg.chat.id;
  
  await sendMessage(
    chatId,
    '🔍 *Проверка статуса привязки*\n\n' +
    'Эта функция будет доступна в ближайшее время.\n\n' +
    'Пока что проверяйте статус в профиле на сайте.'
  );
});

// Handle invalid verification codes
bot.onText(/^\/start\s+([A-Z0-9]+)$/i, async (msg, match) => {
  if (match[1].length === 6) return;
  
  const chatId = msg.chat.id;
  
  await sendMessage(
    chatId,
    '❌ *Неверный формат кода*\n\n' +
    'Код верификации должен состоять из 6 символов.\n\n' +
    'Пример: `A3F9K2`\n\n' +
    'Получите правильный код в профиле на сайте.'
  );
});

// Handle plain text (might be verification code)
bot.on('message', async (msg) => {
  if (msg.text && msg.text.startsWith('/')) return;
  
  const text = msg.text?.trim();
  if (!text) return;
  
  if (/^[A-Z0-9]{6}$/i.test(text)) {
    const chatId = msg.chat.id;
    await sendMessage(
      chatId,
      '💡 *Похоже на код верификации!*\n\n' +
      'Используйте команду:\n' +
      `\`/start ${text.toUpperCase()}\`\n\n` +
      'Или просто перейдите по ссылке из профиля.'
    );
  }
});

// Handle polling errors
bot.on('polling_error', (error) => {
  console.error('⚠️  Telegram polling error:', error.message);
  
  if (error.code === 'EFATAL') {
    console.error('Fatal polling error, exiting...');
    process.exit(1);
  }
});

bot.on('webhook_error', (error) => {
  console.error('⚠️  Telegram webhook error:', error.message);
});

bot.on('error', (error) => {
  console.error('⚠️  Telegram bot error:', error.message);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\n🛑 Stopping Telegram bot...');
  try {
    await bot.stopPolling();
    console.log('✅ Bot stopped gracefully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error stopping bot:', error);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('✅ Bot is ready to receive messages');
console.log('💬 Waiting for user interactions...\n');

export function getTelegramBot() {
  return bot;
}

export async function sendNotification(chatId, message) {
  return await sendMessage(chatId, message);
}