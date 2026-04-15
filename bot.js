import { Telegraf, Markup } from 'telegraf';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, where, updateDoc, doc } from 'firebase/firestore';

const TOKEN = '8716182290:AAGv27iz8Ua1sCrKSS_0_qne9-xTUtlQO2M'; // Ваш токен
const URL = 'https://birjoyda-tma.vercel.app/'; // Ваш URL хостинга

// Отправка уведомлений в указанный админский чат. Измените на свой chat id.
const ADMIN_CHAT_ID = '1947053690'; // Временно подставляем senderId, но лучше узнайте свой telegram user_id.

// Инициализация Firebase (здесь те же ключи, что и на фронте, берем те, что в App.jsx)
const firebaseConfig = {
    apiKey: "AIzaSyC1pF2iqJjlVIlxBCXic8_aiaVScGYodQU",
    authDomain: "birjoyda-1db24.firebaseapp.com",
    projectId: "birjoyda-1db24",
    storageBucket: "birjoyda-1db24.firebasestorage.app",
    messagingSenderId: "792856004348",
    appId: "1:792856004348:web:ba626a8521d5d73811f979"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
signInAnonymously(auth).catch(console.error);
const appId = 'delivery-app-v6';

const bot = new Telegraf(TOKEN);

// Обработка /start
bot.start((ctx) => {
    ctx.reply(
        'Tilni tanlang / Выберите язык:',
        Markup.inlineKeyboard([
            Markup.button.callback('O’zbek 🇺🇿', 'lang_uz'),
            Markup.button.callback('Русский 🇷🇺', 'lang_ru')
        ])
    );
});

// Обработка выбора языка
bot.action(/lang_(uz|ru)/, async (ctx) => {
    const lang = ctx.match[1];
    await ctx.answerCbQuery();
    
    // Удаляем предыдущее сообщение с выбором
    await ctx.deleteMessage().catch(() => {});

    // Формируем URL с учетом языка
    const webAppUrl = `${URL}?lang=${lang}`;

    // Клавиатура под полем ввода
    const keyboard = Markup.keyboard([
        [Markup.button.webApp(lang === 'uz' ? '🍝 Menyuni ochish' : '🍝 Открыть меню', webAppUrl)],
        [
            Markup.button.callback(lang === 'uz' ? '📞 Kontaktlar' : '📞 Контакты', 'dummy1'),
            Markup.button.callback(lang === 'uz' ? '✍️ Fikr qoldirish' : '✍️ Оставить отзыв', 'dummy2')
        ]
    ]).resize();

    // Приветственное сообщение
    const welcomeText = lang === 'uz' 
        ? "Добро пожаловать в **BirJoyda**!\nMenyuni ochish uchun tugmani bosing."
        : "Добро пожаловать в **BirJoyda**!\nНажмите кнопку ниже, чтобы открыть меню.";

    await ctx.reply(welcomeText, keyboard, { parse_mode: 'Markdown' });
});

// Включение слушателя заказов из Firebase
onSnapshot(
    query(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), where('status', '==', 'pending')), 
    (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
                const order = change.doc.data();
                
                // Пропускаем старые заказы при запуске
                if (Date.now() - order.createdAt > 5 * 60 * 1000) return;

                const text = `🔥 *Новый заказ!*
                
👤 От: ${order.customerName || 'Неизвестный'}
📞 Тел: ${order.phone || 'Не указан'}
🏪 Заведение: ${order.storeName}
📍 Адрес: ${order.address || 'Геолокация'}
💳 Оплата: ${order.paymentMethod === 'cash' ? 'Наличные' : 'Переводом'}

💼 Сумма: ${order.total} сум

Пожалуйста, свяжитесь со студентом/клиентом.`;

                try {
                    // В MVP отправляем заказ боту (если ADMIN_CHAT_ID валиден, то ему)
                    await bot.telegram.sendMessage(ADMIN_CHAT_ID, text, { parse_mode: 'Markdown' });
                    console.log("Новый заказ пришел:", order);
                } catch (e) {
                    console.error("Ошибка при отправке уведомления:", e);
                }
            }
        });
    }
);

console.log('Бот запущен с прослушиванием заказов...');
bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
