import React, { useState, useEffect, useMemo } from 'react';
import {
    MapPin, ShoppingBag, User, Store, Truck, ChevronRight, Star, Clock,
    Plus, Minus, CheckCircle, Package, Navigation, ArrowLeft, X,
    LayoutDashboard, UtensilsCrossed, Timer, Search,
    Bell, Map as MapIcon, Phone, Check, CreditCard, Heart, MapPinned
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
    getFirestore, collection, doc, setDoc, onSnapshot,
    updateDoc, query, where, addDoc, getDocs
} from 'firebase/firestore';

// --- Инициализация Firebase ---
const firebaseConfig = {
    apiKey: "AIzaSyC1pF2iqJjlVIlxBCXic8_aiaVScGYodQU",
    authDomain: "birjoyda-1db24.firebaseapp.com",
    projectId: "birjoyda-1db24",
    storageBucket: "birjoyda-1db24.firebasestorage.app",
    messagingSenderId: "792856004348",
    appId: "1:792856004348:web:ba626a8521d5d73811f979"
};

let app, db, auth;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    signInAnonymously(auth).catch(e => console.error(e));
} catch (e) {
    console.error("Firebase initialization failed", e);
}

const appId = 'delivery-app-v6';
const tg = window.Telegram?.WebApp;

// --- Переводы ---
const translations = {
    ru: {
        home: "Главная",
        orders: "Заказы",
        profile: "Профиль",
        searchPlaceholder: "Поиск заведений...",
        categories: "Категории",
        stores: "Заведения",
        specifyAddress: "Указать адрес",
        sendGeo: "Отправить геолокацию",
        deliveryTime: "Время доставки",
        addToCart: "В корзину",
        checkout: "Оформить заказ",
        name: "Имя",
        phone: "Телефон",
        address: "Адрес",
        paymentMethod: "Способ оплаты",
        cash: "Наличными",
        transfer: "Перевод",
        submitOrder: "Заказать",
        total: "Итого",
        activeOrders: "Активные",
        history: "История",
        becomePartner: "Стать партнером",
        becomeCourier: "Стать курьером",
        emptyCart: "Корзина пуста",
        language: "Язык"
    },
    uz: {
        home: "Asosiy",
        orders: "Buyurtmalar",
        profile: "Profil",
        searchPlaceholder: "Joy qidirish...",
        categories: "Kategoriyalar",
        stores: "Joylar",
        specifyAddress: "Manzilni kiritish",
        sendGeo: "Geolokatsiyani yuborish",
        deliveryTime: "Yetkazish vaqti",
        addToCart: "Savatga joylash",
        checkout: "Rasmiylashtirish",
        name: "Ism",
        phone: "Telefon",
        address: "Manzil",
        paymentMethod: "To'lov usuli",
        cash: "Naqd pul",
        transfer: "O'tkazma",
        submitOrder: "Buyurtma berish",
        total: "Jami",
        activeOrders: "Faol",
        history: "Tarix",
        becomePartner: "Hamkor bo'lish",
        becomeCourier: "Kuryer bo'lish",
        emptyCart: "Savat bo'sh",
        language: "Til"
    }
};

// --- Константы ---
const CATEGORIES = [
    { id: 'burgers', name: 'Бургеры', emoji: '🍔' },
    { id: 'pizza', name: 'Пицца', emoji: '🍕' },
    { id: 'sushi', name: 'Суши', emoji: '🍣' },
    { id: 'drinks', name: 'Напитки', emoji: '🥤' },
    { id: 'plov', name: 'Плов', emoji: '🍲' },
];

const DEFAULT_STORES = [
    { id: 's1', name: 'Burger King', rating: 4.7, time: '20-30 мин', image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&q=80', categories: ['Бургеры', 'Обеды'] },
    { id: 's2', name: 'Zotman Pizza', rating: 4.9, time: '30-40 мин', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80', categories: ['Пицца', 'Итальянская'] },
    { id: 's3', name: 'Yaponamama', rating: 4.8, time: '40-50 мин', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&q=80', categories: ['Суши', 'Роллы'] },
    { id: 's4', name: 'Evos', rating: 5.0, time: '15-20 мин', image: 'https://images.unsplash.com/photo-1508736793122-f516e3ba5569?w=600&q=80', categories: ['Лаваш', 'Обеды'] },
];

const MOCK_MENU = [
    { id: 'm1', name: 'Воппер Комбо', price: 42000, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80', storeName: 'Burger King', category: 'Комбо' },
    { id: 'm2', name: 'Чизбургер XL', price: 19000, image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80', storeName: 'Burger King', category: 'Бургеры' },
    { id: 'm3', name: 'Пепперони', price: 65000, image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&q=80', storeName: 'Zotman Pizza', category: 'Пицца' },
    { id: 'm4', name: 'Филадельфия Лайт', price: 58000, image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&q=80', storeName: 'Yaponamama', category: 'Роллы' },
    { id: 'm5', name: 'Лаваш с говядиной', price: 28000, image: 'https://images.unsplash.com/photo-1626804475297-41609ea0aa8eb?w=400&q=80', storeName: 'Evos', category: 'Лаваш' },
];

const ORDER_STATUSES = [
    { id: 'pending', label: 'Принят', icon: Clock },
    { id: 'accepted', label: 'Готовится', icon: UtensilsCrossed },
    { id: 'picked_up', label: 'В пути', icon: Truck },
    { id: 'delivered', label: 'Доставлен', icon: CheckCircle },
];

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
    const base = "w-full py-3.5 rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2";
    const variants = {
        primary: "bg-[#FCE000] text-black hover:bg-[#F0D000]",
        secondary: "bg-[#F2F2F2] text-black hover:bg-gray-200",
        dark: "bg-black text-white"
    };

    const handleClick = (e) => {
        if (tg) tg.HapticFeedback.impactOccurred('light');
        if (onClick) onClick(e);
    };

    return (
        <button onClick={handleClick} disabled={disabled} className={`${base} ${variants[variant]} ${className} ${disabled ? 'opacity-50 grayscale' : ''}`}>
            {children}
        </button>
    );
};

export default function App() {
    const [lang, setLang] = useState('ru');
    const [user, setUser] = useState({ id: 'local_dev', first_name: 'Гость', username: 'guest' });
    const [currentScreen, setCurrentScreen] = useState('customer-home');
    const [cart, setCart] = useState([]);
    const [activeOrders, setActiveOrders] = useState([]);
    const [selectedStore, setSelectedStore] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [orderTab, setOrderTab] = useState('active');
    const [trackingOrder, setTrackingOrder] = useState(null);
    
    // Checkout state
    const [userPhone, setUserPhone] = useState('');
    const [userAddress, setUserAddress] = useState('');
    const [userLocation, setUserLocation] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('cash');

    const t = translations[lang] || translations['ru'];

    // Инициализация Telegram WebApp
    useEffect(() => {
        if (tg) {
            tg.expand();
            tg.ready();
            
            // Получаем язык из URL параметров
            const params = new URLSearchParams(window.location.search);
            const tgLang = params.get('lang') || tg.initDataUnsafe?.user?.language_code;
            if (tgLang === 'uz' || tgLang === 'ru') setLang(tgLang);

            // Получаем пользователя
            if (tg.initDataUnsafe?.user) {
                setUser(tg.initDataUnsafe.user);
            }
        }
    }, []);

    // Управление кнопкой "Назад" в Telegram
    useEffect(() => {
        if (!tg) return;
        if (['customer-store', 'customer-track-order', 'checkout', 'cart'].includes(currentScreen)) {
            tg.BackButton.show();
            tg.BackButton.onClick(() => {
                if (currentScreen === 'customer-store') setCurrentScreen('customer-home');
                else if (currentScreen === 'checkout') setCurrentScreen('cart');
                else if (currentScreen === 'cart') setCurrentScreen('customer-home');
                else if (currentScreen === 'customer-track-order') setCurrentScreen('customer-orders');
            });
        } else {
            tg.BackButton.hide();
        }
        
        // Показываем/Скрываем MainButton (оформить заказ)
        if (cart.length > 0 && currentScreen !== 'checkout' && currentScreen !== 'cart' && currentScreen !== 'order-success') {
            tg.MainButton.show();
            tg.MainButton.text = `${t.checkout} - ${(cart.reduce((s, i) => s + i.price * i.quantity, 0)).toLocaleString()} сум`;
            tg.MainButton.color = '#FCE000';
            tg.MainButton.textColor = '#000000';
            // удаляем старые обработчики, чтобы не было дублей
            tg.MainButton.onClick(() => setCurrentScreen('cart'));
        } else {
            tg.MainButton.hide();
        }
    }, [currentScreen, cart, lang]);

    // Подписка на заказы пользователя
    useEffect(() => {
        if (!user || !db || !auth) return;
        
        let unsubFirestore;
        const unsubAuth = onAuthStateChanged(auth, (authUser) => {
            if (authUser) {
                const q = query(
                    collection(db, 'artifacts', appId, 'public', 'data', 'orders'),
                    where('customerId', '==', String(user.id))
                );
                
                unsubFirestore = onSnapshot(q, (snapshot) => {
                    setActiveOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                });
            }
        });
        
        return () => {
            unsubAuth();
            if (unsubFirestore) unsubFirestore();
        };
    }, [user]);

    const addToCart = (p) => {
        setCart(prev => {
            const ex = prev.find(i => i.id === p.id);
            return ex ? prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, { ...p, quantity: 1, storeName: p.storeName }];
        });
        if (tg) tg.HapticFeedback.impactOccurred('light');
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));
        if (tg) tg.HapticFeedback.impactOccurred('light');
    };
    
    // Получение геолокации
    const requestLocation = () => {
        if (tg?.LocationManager) {
            tg.LocationManager.init(() => {
                tg.LocationManager.getLocation((loc) => {
                    if (loc && loc.latitude) {
                        setUserLocation(loc);
                        setUserAddress(`Координаты: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
                    } else {
                        alert("Не удалось получить геопозицию из Telegram. Пожалуйста, укажите адрес вручную.");
                    }
                });
            });
        } else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                setUserAddress(`Локация: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
            }, (err) => {
                alert("Доступ к геопозиции отклонен бразуером. Введите адрес текстом.");
            });
        } else {
            alert("Ваше устройство не поддерживает геолокацию.");
        }
    };

    const placeOrder = async () => {
        if (cart.length === 0) return;
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const storeNames = [...new Set(cart.map(i => i.storeName))].join(', ');
        
        const orderData = {
            customerId: String(user.id),
            customerName: user.first_name || user.username || 'Клиент',
            phone: userPhone,
            address: userAddress,
            location: userLocation,
            paymentMethod: paymentMethod,
            items: cart,
            total,
            status: 'pending',
            storeName: storeNames,
            createdAt: Date.now(),
        };
        
        if (db) {
            try {
                const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), orderData);
                setTrackingOrder({ id: docRef.id, ...orderData });
            } catch (e) {
                console.error(e);
            }
        }
        
        setCart([]);
        setCurrentScreen('order-success');
    };

    const Navbar = () => {
        if (['order-success', 'checkout', 'cart', 'customer-store', 'customer-track-order'].includes(currentScreen)) return null;
        
        const tabs = [
            { id: 'customer-home', icon: Store, label: t.home },
            { id: 'customer-orders', icon: Clock, label: t.orders },
            { id: 'profile', icon: User, label: t.profile }
        ];

        return (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-3 pb-6 z-40 rounded-t-[24px]">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setCurrentScreen(tab.id)} className={`flex flex-col items-center gap-1 transition-all ${currentScreen === tab.id ? 'text-[#FCE000]' : 'text-gray-400'}`}>
                        <tab.icon size={24} fill={currentScreen === tab.id ? 'currentColor' : 'none'} />
                        <span className="text-[10px] font-bold">{tab.label}</span>
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="max-w-md mx-auto min-h-screen bg-[#F7F8FA] relative text-[#1A1A1A] pb-24 font-sans selection:bg-[#FCE000]">
            
            {/* ЭКРАН 1: ГЛАВНАЯ */}
            {currentScreen === 'customer-home' && (
                <div className="animate-in fade-in duration-300">
                    {/* Header + Address Block */}
                    <div className="bg-white p-5 rounded-b-[32px] shadow-sm mb-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                                <User size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-medium">Привет, {user.first_name} 👋</p>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="bg-[#F2F3F5] rounded-2xl flex items-center px-4 py-3 gap-3 mb-4">
                            <Search size={20} className="text-gray-400" />
                            <input type="text" placeholder={t.searchPlaceholder} className="bg-transparent border-none outline-none w-full text-sm font-medium placeholder-gray-400" />
                        </div>
                    </div>

                    <div className="px-5">
                        {/* Categories Horizontal Scroll */}
                        <h3 className="font-bold text-lg mb-4">{t.categories}</h3>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar mb-8 pb-2">
                            {CATEGORIES.map(c => (
                                <div key={c.id} onClick={() => setSelectedCategory(selectedCategory === c.name ? null : c.name)} className={`flex flex-col items-center gap-2 min-w-[70px] cursor-pointer transition-all ${selectedCategory === c.name ? 'scale-110' : 'opacity-80'}`}>
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-sm border ${selectedCategory === c.name ? 'bg-[#FCE000] border-yellow-400' : 'bg-white border-gray-100'}`}>{c.emoji}</div>
                                    <span className={`text-xs font-semibold ${selectedCategory === c.name ? 'text-black' : 'text-gray-500'}`}>{c.name}</span>
                                </div>
                            ))}
                        </div>

                        {/* Stores Grid 2 Columns */}
                        <h3 className="font-bold text-lg mb-4">{t.stores}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {DEFAULT_STORES.filter(s => !selectedCategory || s.categories.includes(selectedCategory)).map(s => (
                                <div key={s.id} onClick={() => { setSelectedStore(s); setCurrentScreen('customer-store'); }} className="bg-white rounded-[24px] overflow-hidden shadow-sm active:scale-95 transition-transform">
                                    <div className="relative h-28 bg-gray-100">
                                        <img src={s.image} className="w-full h-full object-cover" />
                                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1"><Star size={10} className="text-yellow-500" fill="currentColor"/> {s.rating}</div>
                                    </div>
                                    <div className="p-3">
                                        <h4 className="font-bold text-sm mb-1 truncate">{s.name}</h4>
                                        <p className="text-[10px] text-gray-400 font-medium">{s.categories.join(' • ')}</p>
                                        <p className="text-[10px] font-bold mt-2 text-green-600 bg-green-50 w-fit px-2 py-0.5 rounded-md">{s.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ЭКРАН 2: ЗАВЕДЕНИЕ */}
            {currentScreen === 'customer-store' && (
                <div className="animate-in slide-in-from-right duration-300 bg-white min-h-screen">
                    <div className="relative h-56">
                        <img src={selectedStore?.image} className="w-full h-full object-cover" />
                        <div className="absolute top-4 left-4">
                            <button onClick={() => setCurrentScreen('customer-home')} className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-md"><ArrowLeft size={20} /></button>
                        </div>
                    </div>
                    <div className="px-5 py-6">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <h1 className="text-3xl font-black">{selectedStore?.name}</h1>
                                <p className="text-gray-400 font-medium mt-1">{selectedStore?.categories.join(', ')}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold flex items-center gap-1 text-gray-600"><Clock size={14}/> {selectedStore?.time}</p>
                            </div>
                        </div>

                        <div className="space-y-4 mt-8 pb-32">
                            {MOCK_MENU.filter(p => p.storeName === selectedStore?.name).map(p => {
                                const q = cart.find(i => i.id === p.id)?.quantity || 0;
                                return (
                                    <div key={p.id} className="flex gap-4 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm">
                                        <img src={p.image} className="w-24 h-24 rounded-xl object-cover" />
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <h4 className="font-bold text-sm leading-tight">{p.name}</h4>
                                                <p className="text-xs text-gray-400 mt-1">{p.category}</p>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <p className="font-black text-sm">{p.price.toLocaleString()} сум</p>
                                                {q > 0 ? (
                                                    <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-2 py-1">
                                                        <button onClick={() => removeFromCart(p.id)} className="p-1"><Minus size={14} /></button>
                                                        <span className="font-bold text-sm w-4 text-center">{q}</span>
                                                        <button onClick={() => addToCart(p)} className="p-1"><Plus size={14} /></button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => addToCart(p)} className="bg-[#FCE000] text-black w-8 h-8 rounded-full flex items-center justify-center font-black"><Plus size={16} /></button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ЭКРАН 3: КОРЗИНА */}
            {currentScreen === 'cart' && (
                <div className="animate-in slide-in-from-bottom duration-300 min-h-screen bg-white px-5 pt-8 pb-32">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-black">Корзина</h2>
                        <button onClick={() => setCurrentScreen('customer-home')} className="bg-gray-100 p-2 rounded-full"><X size={20} /></button>
                    </div>

                    {cart.length === 0 ? (
                        <div className="text-center mt-20 text-gray-400">
                            <ShoppingBag size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="font-medium text-lg">{t.emptyCart}</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {cart.map(item => (
                                <div key={item.id} className="flex gap-4 items-center">
                                    <img src={item.image} className="w-16 h-16 rounded-xl object-cover" />
                                    <div className="flex-1">
                                        <p className="font-bold text-sm">{item.name}</p>
                                        <p className="text-gray-500 font-medium text-xs">{item.price.toLocaleString()} сум</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-2 py-1">
                                        <button onClick={() => removeFromCart(item.id)} className="p-1"><Minus size={14} /></button>
                                        <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                                        <button onClick={() => addToCart(item)} className="p-1"><Plus size={14} /></button>
                                    </div>
                                </div>
                            ))}
                            
                            <div className="border-t border-gray-100 pt-6 mt-6">
                                <div className="flex justify-between font-black text-xl mb-8">
                                    <span>{t.total}</span>
                                    <span>{(cart.reduce((s, i) => s + i.price * i.quantity, 0)).toLocaleString()} сум</span>
                                </div>
                                <Button onClick={() => setCurrentScreen('checkout')}>{t.checkout}</Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ЭКРАН 4: ОФОРМЛЕНИЕ ЗАКАЗА */}
            {currentScreen === 'checkout' && (
                <div className="animate-in slide-in-from-right duration-300 min-h-screen bg-[#F7F8FA] px-5 pt-6 pb-6">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => setCurrentScreen('cart')}><ArrowLeft size={24} /></button>
                        <h2 className="text-2xl font-black">{t.checkout}</h2>
                    </div>

                    <div className="space-y-4">
                        {/* Контакты */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm">
                            <h3 className="font-bold mb-4 flex items-center gap-2"><User size={18} className="text-[#FCE000]"/> Контакты</h3>
                            <input value={user.first_name || ''} readOnly className="w-full bg-gray-50 p-3 rounded-xl mb-3 text-sm font-medium outline-none text-gray-500" />
                            <input type="tel" placeholder={t.phone} value={userPhone} onChange={(e) => setUserPhone(e.target.value)} className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl text-sm font-medium outline-none focus:border-[#FCE000]" />
                        </div>

                        {/* Адрес */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm">
                            <h3 className="font-bold mb-4 flex items-center gap-2"><MapPinned size={18} className="text-[#FCE000]"/> Адрес доставки</h3>
                            <div className="flex gap-2 mb-3">
                                <Button onClick={requestLocation} variant="secondary" className="flex-1 py-2.5 text-xs"><Navigation size={14}/> {t.sendGeo}</Button>
                            </div>
                            <textarea 
                                placeholder="Укажите улицу, дом, подъезд..." 
                                value={userAddress}
                                onChange={(e) => setUserAddress(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl text-sm font-medium outline-none focus:border-[#FCE000] resize-none h-20"
                            />
                        </div>

                        {/* Оплата */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm">
                            <h3 className="font-bold mb-4 flex items-center gap-2"><CreditCard size={18} className="text-[#FCE000]"/> {t.paymentMethod}</h3>
                            <div className="flex gap-3">
                                <button onClick={() => setPaymentMethod('cash')} className={`flex-1 p-3 rounded-xl border ${paymentMethod === 'cash' ? 'border-[#FCE000] bg-yellow-50 font-bold' : 'border-gray-100 font-medium'}`}>{t.cash}</button>
                                <button onClick={() => setPaymentMethod('transfer')} className={`flex-1 p-3 rounded-xl border ${paymentMethod === 'transfer' ? 'border-[#FCE000] bg-yellow-50 font-bold' : 'border-gray-100 font-medium'}`}>{t.transfer}</button>
                            </div>
                        </div>
                    </div>

                    <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                        <Button onClick={placeOrder} disabled={!userAddress || !userPhone}>{t.submitOrder} - {(cart.reduce((s, i) => s + i.price * i.quantity, 0)).toLocaleString()} сум</Button>
                    </div>
                </div>
            )}

            {/* ЭКРАН 5: УСПЕШНЫЙ ЗАКАЗ */}
            {currentScreen === 'order-success' && (
                <div className="h-screen flex flex-col items-center justify-center p-10 text-center bg-white animate-in zoom-in duration-300">
                    <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6">
                        <Check size={48} strokeWidth={3} />
                    </div>
                    <h2 className="text-3xl font-black mb-3">Заказ принят!</h2>
                    <p className="text-gray-500 mb-10 font-medium">Ресторан уже начал его готовить.</p>
                    <Button onClick={() => setCurrentScreen('customer-orders')}>Мои заказы</Button>
                </div>
            )}

            {/* ЭКРАН 6: ЗАКАЗЫ И ИСТОРИЯ */}
            {currentScreen === 'customer-orders' && (
                <div className="p-5 animate-in fade-in duration-300">
                    <h2 className="text-3xl font-black mb-6">{t.orders}</h2>
                    <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
                        <button onClick={() => setOrderTab('active')} className={`flex-1 py-2 rounded-lg font-bold text-sm ${orderTab === 'active' ? 'bg-white shadow-sm' : 'text-gray-400'}`}>{t.activeOrders}</button>
                        <button onClick={() => setOrderTab('history')} className={`flex-1 py-2 rounded-lg font-bold text-sm ${orderTab === 'history' ? 'bg-white shadow-sm' : 'text-gray-400'}`}>{t.history}</button>
                    </div>

                    <div className="space-y-4">
                        {activeOrders
                            .filter(o => orderTab === 'active' ? (o.status !== 'delivered' && o.status !== 'cancelled') : (o.status === 'delivered' || o.status === 'cancelled'))
                            .sort((a, b) => b.createdAt - a.createdAt)
                            .map(o => (
                            <div key={o.id} onClick={() => { setTrackingOrder(o); setCurrentScreen('customer-track-order'); }} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-50 active:scale-95 transition-transform cursor-pointer">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-bold truncate w-2/3">{o.storeName}</h4>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${o.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{ORDER_STATUSES.find(s=>s.id === o.status)?.label || o.status}</span>
                                </div>
                                <p className="text-xs font-medium text-gray-400 mb-4">{new Date(o.createdAt).toLocaleDateString()} {new Date(o.createdAt).toLocaleTimeString()}</p>
                                <div className="flex justify-between items-center border-t border-gray-50 pt-4">
                                    <span className="font-black">{o.total.toLocaleString()} сум</span>
                                    <ChevronRight size={16} className="text-gray-300" />
                                </div>
                            </div>
                        ))}
                        {activeOrders.filter(o => orderTab === 'active' ? (o.status !== 'delivered' && o.status !== 'cancelled') : (o.status === 'delivered' || o.status === 'cancelled')).length === 0 && (
                            <p className="text-center text-gray-400 mt-10 font-medium">Нет заказов</p>
                        )}
                    </div>
                </div>
            )}

            {currentScreen === 'customer-track-order' && trackingOrder && (
                <div className="p-5 animate-in slide-in-from-right duration-300 min-h-screen bg-white">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => setCurrentScreen('customer-orders')}><ArrowLeft size={24} /></button>
                        <h2 className="text-2xl font-black">Статус заказа</h2>
                    </div>

                    <div className="bg-[#F7F8FA] p-6 rounded-3xl mb-6 text-center">
                        <h3 className="text-3xl font-black mb-2 text-[#FCE000]">
                            {ORDER_STATUSES.find(s=>s.id === trackingOrder.status)?.label || 'В обработке'}
                        </h3>
                        <p className="text-sm font-medium text-gray-500">Ожидайте обновления статуса</p>
                        
                        <div className="flex justify-between items-center px-4 mt-8">
                            {ORDER_STATUSES.map((step, idx) => {
                                const statusIdx = ORDER_STATUSES.findIndex(s => s.id === trackingOrder.status);
                                const isDone = idx <= statusIdx;
                                return (
                                    <React.Fragment key={step.id}>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 z-10 ${isDone ? 'bg-[#FCE000] shadow-sm transform scale-110' : 'bg-white text-gray-300 border border-gray-100'}`}>
                                            <step.icon size={18} className={isDone ? 'text-black' : ''} />
                                        </div>
                                        {idx < ORDER_STATUSES.length - 1 && (
                                            <div className={`flex-1 h-1 mx-[-10px] rounded-full z-0 ${isDone && idx < statusIdx ? 'bg-[#FCE000]' : 'bg-gray-100'}`} />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                        <h3 className="font-bold mb-4">{trackingOrder.storeName}</h3>
                        <div className="space-y-3 mb-4">
                            {trackingOrder.items.map(it => (
                                <div key={it.id} className="flex justify-between text-sm">
                                    <span className="text-gray-500">{it.quantity}x <span className="text-black font-medium">{it.name}</span></span>
                                    <span className="font-bold">{it.price.toLocaleString()} сум</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between font-black text-lg border-t border-gray-50 pt-4">
                            <span>{t.total}</span>
                            <span>{trackingOrder.total.toLocaleString()} сум</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ЭКРАН 7: ПРОФИЛЬ */}
            {currentScreen === 'profile' && (
                <div className="p-5 animate-in fade-in duration-300">
                    <h2 className="text-3xl font-black mb-8">{t.profile}</h2>
                    
                    <div className="bg-white p-5 rounded-3xl flex items-center gap-4 mb-8 shadow-sm">
                        <div className="w-16 h-16 bg-[#FCE000] rounded-full flex items-center justify-center font-black text-xl shadow-inner">
                            {user.first_name?.charAt(0) || user.username?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{user.first_name || 'Пользователь'}</h3>
                            <p className="text-gray-400 font-medium text-sm">@{user.username || 'username'}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="bg-white rounded-2xl p-4 flex justify-between items-center font-bold shadow-sm">
                            <span className="flex items-center gap-3"><MapPin size={20} className="text-gray-400"/> Язык</span>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button onClick={() => setLang('uz')} className={`px-3 py-1 rounded-md text-xs ${lang === 'uz' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>UZ</button>
                                <button onClick={() => setLang('ru')} className={`px-3 py-1 rounded-md text-xs ${lang === 'ru' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>RU</button>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-4 flex justify-between items-center font-bold shadow-sm text-blue-600">
                            <span className="flex items-center gap-3"><Store size={20}/> {t.becomePartner}</span>
                            <ChevronRight size={18} />
                        </div>
                        
                        <div className="bg-white rounded-2xl p-4 flex justify-between items-center font-bold shadow-sm text-green-600">
                            <span className="flex items-center gap-3"><Truck size={20}/> {t.becomeCourier}</span>
                            <ChevronRight size={18} />
                        </div>
                    </div>
                </div>
            )}

            <Navbar />
        </div>
    );
}
