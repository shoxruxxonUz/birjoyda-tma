import { Telegraf, Markup } from 'telegraf';

const TOKEN = '8716182290:AAGv27iz8Ua1sCrKSS_0_qne9-xTUtlQO2M'; // Ваш токен
const URL = 'ВАШ_URL_ХОСТИНГА'; // Сюда нужно будет вставить URL после деплоя (например, на Vercel)

const bot = new Telegraf(TOKEN);

// Команда /start
bot.start((ctx) => {
    ctx.reply(
        'Добро пожаловать в BirJoyda! 🍕\nНажмите на кнопку ниже, чтобы открыть меню.',
        Markup.keyboard([
            Markup.button.webApp('Открыть меню', URL)
        ]).resize()
    );
});

// Настройка кнопки "Main App" (если нужно)
// bot.telegram.setChatMenuButton({
//     menuButton: {
//         type: 'web_app',
//         text: 'Открыть BirJoyda',
//         web_app: { url: URL }
//     }
// });

console.log('Бот запущен...');
bot.launch();

// Остановка бота при выключении процесса
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
