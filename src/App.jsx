import React, { useState, useEffect, useMemo } from 'react';
import {
    MapPin, ShoppingBag, User, Store, Truck, ChevronRight, Star, Clock,
    Plus, Minus, CheckCircle, Package, Navigation, ArrowLeft, X,
    CreditCard, LayoutDashboard, UtensilsCrossed, Timer, Search,
    Bell, Sparkles, Map as MapIcon, Phone, Check
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
    getFirestore, collection, doc, setDoc, getDoc, onSnapshot,
    updateDoc, query, where, addDoc, getDocs
} from 'firebase/firestore';
import {
    getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged
} from 'firebase/auth';

// --- Инициализация Firebase ---
// В Antigravity/VS Code замените эти строки на ваш объект config из Firebase Console
const firebaseConfig = typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : {
        apiKey: "ВАШ_API_KEY",
        authDomain: "PROJECT_ID.firebaseapp.com",
        projectId: "PROJECT_ID",
        storageBucket: "PROJECT_ID.appspot.com",
        messagingSenderId: "SENDER_ID",
        appId: "APP_ID"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'delivery-app-v6';

const tg = window.Telegram?.WebApp;

// --- Константы ---
const DEFAULT_STORES = [
    { id: 's1', name: 'Burger King', rating: 4.7, time: '20-30 мин', image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&q=80', categories: ['Бургеры', 'Обеды'] },
    { id: 's2', name: 'Zotman Pizza', rating: 4.9, time: '30-40 мин', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80', categories: ['Пицца', 'Итальянская'] },
    { id: 's3', name: 'Yaponamama', rating: 4.8, time: '40-50 мин', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&q=80', categories: ['Суши', 'Роллы'] },
    { id: 's4', name: 'Лавка (Маркет)', rating: 5.0, time: '15-20 мин', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80', categories: ['Продукты', 'Завтраки'] },
];

const MOCK_MENU = [
    { name: 'Воппер Комбо', price: 42000, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80', storeName: 'Burger King' },
    { name: 'Чизбургер XL', price: 19000, image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80', storeName: 'Burger King' },
    { name: 'Пепперони', price: 65000, image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&q=80', storeName: 'Zotman Pizza' },
    { name: 'Филадельфия Лайт', price: 58000, image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&q=80', storeName: 'Yaponamama' },
    { name: 'Бананы (1кг)', price: 18000, image: 'https://images.unsplash.com/photo-1571771894821-ad9958a35c47?w=400&q=80', storeName: 'Лавка (Маркет)' },
];

const ORDER_STATUSES = [
    { id: 'pending', label: 'Принят', icon: Clock },
    { id: 'accepted', label: 'Готовится', icon: UtensilsCrossed },
    { id: 'ready_for_pickup', label: 'Собран', icon: Package },
    { id: 'picked_up', label: 'В пути', icon: Truck },
    { id: 'delivered', label: 'Доставлен', icon: CheckCircle },
];

// --- Компоненты UI ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
    const base = "w-full py-4 rounded-[24px] font-bold transition-all active:scale-95 flex items-center justify-center gap-2";
    const variants = {
        primary: "bg-[#FCE000] text-black hover:bg-[#F0D000]",
        secondary: "bg-[#F2F2F2] text-black hover:bg-gray-200",
        dark: "bg-black text-white",
        outline: "border-2 border-gray-100 text-gray-500 font-bold"
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
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [currentScreen, setCurrentScreen] = useState('role-selection');
    const [cart, setCart] = useState([]);
    const [activeOrders, setActiveOrders] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [selectedStore, setSelectedStore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [orderTab, setOrderTab] = useState('active');
    const [trackingOrder, setTrackingOrder] = useState(null);

    // Инициализация Telegram WebApp
    useEffect(() => {
        if (tg) {
            tg.expand(); // Развернуть на весь экран
            tg.ready();
        }
    }, []);

    // Управление кнопкой "Назад" в Telegram
    useEffect(() => {
        if (!tg) return;

        if (['customer-store', 'customer-track-order', 'customer-orders'].includes(currentScreen)) {
            tg.BackButton.show();
            tg.BackButton.onClick(() => {
                if (currentScreen === 'customer-store') setCurrentScreen('customer-home');
                else if (currentScreen === 'customer-track-order') setCurrentScreen('customer-orders');
                else setCurrentScreen('customer-home');
            });
        } else {
            tg.BackButton.hide();
        }
    }, [currentScreen]);

    // Авторизация
    useEffect(() => {
        const initAuth = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (err) { console.error("Auth error", err); }
        };
        initAuth();
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            if (u) loadUserProfile(u.uid);
        });
        return () => unsubscribe();
    }, []);

    const loadUserProfile = async (uid) => {
        const userDoc = await getDoc(doc(db, 'artifacts', appId, 'users', uid, 'profile', 'info'));
        if (userDoc.exists()) {
            const data = userDoc.data();
            setUserRole(data.role);
            setCurrentScreen(data.role === 'customer' ? 'customer-home' : data.role + '-dashboard');
        }
        setLoading(false);
    };

    const seedProducts = async () => {
        const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
        const snapshot = await getDocs(productsRef);
        if (snapshot.empty) {
            for (const item of MOCK_MENU) {
                await addDoc(productsRef, { ...item, createdAt: Date.now(), sellerId: 'system' });
            }
        }
    };

    const selectRole = async (role) => {
        if (!user) return;
        if (!role) {
            setUserRole(null);
            setCurrentScreen('role-selection');
            return;
        }
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'info'), { role, uid: user.uid });
        setUserRole(role);
        setCurrentScreen(role === 'customer' ? 'customer-home' : role + '-dashboard');
        seedProducts();
    };

    useEffect(() => {
        if (!user || !userRole) return;
        const unsubOrders = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), (snapshot) => {
            setActiveOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const unsubProducts = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'products'), (snapshot) => {
            setAllProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => { unsubOrders(); unsubProducts(); };
    }, [user, userRole]);

    // Логика корзины
    const addToCart = (p) => {
        setCart(prev => {
            const ex = prev.find(i => i.id === p.id);
            return ex ? prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, { ...p, quantity: 1 }];
        });
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));
    };

    const placeOrder = async () => {
        if (!user || cart.length === 0) return;
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const orderData = {
            customerId: user.uid,
            items: cart,
            total,
            status: 'pending',
            storeName: selectedStore?.name || 'Заказ',
            createdAt: Date.now(),
            address: 'ул. Шахрисабз, 25',
        };
        const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), orderData);
        setCart([]);
        setTrackingOrder({ id: docRef.id, ...orderData });
        setCurrentScreen('order-success');
    };

    const updateOrderStatus = async (orderId, nextStatus, extra = {}) => {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), { status: nextStatus, ...extra });
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-white"><div className="w-10 h-10 border-4 border-[#FCE000] border-t-transparent rounded-full animate-spin" /></div>;

    const Navbar = () => {
        if (!userRole || ['role-selection', 'order-success'].includes(currentScreen)) return null;
        const tabs = {
            customer: [{ id: 'customer-home', icon: ShoppingBag, label: 'Меню' }, { id: 'customer-orders', icon: Clock, label: 'Заказы' }, { id: 'profile', icon: User, label: 'Профиль' }],
            seller: [{ id: 'seller-dashboard', icon: LayoutDashboard, label: 'Заказы' }, { id: 'seller-inventory', icon: UtensilsCrossed, label: 'Меню' }, { id: 'profile', icon: User, label: 'Профиль' }],
            courier: [{ id: 'courier-dashboard', icon: Truck, label: 'Доставка' }, { id: 'profile', icon: User, label: 'Профиль' }]
        };
        return (
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 flex justify-around py-4 z-50 rounded-t-[32px] shadow-2xl">
                {tabs[userRole].map(tab => (
                    <button key={tab.id} onClick={() => tab.id === 'profile' ? selectRole(null) : setCurrentScreen(tab.id)} className={`flex flex-col items-center gap-1 transition-all ${currentScreen === tab.id ? 'text-[#FCE000] scale-110' : 'text-gray-400'}`}>
                        <tab.icon size={22} fill={currentScreen === tab.id ? 'currentColor' : 'none'} />
                        <span className="text-[10px] font-black uppercase tracking-tighter">{tab.label}</span>
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="max-w-md mx-auto min-h-screen bg-white relative text-black pb-28 font-sans selection:bg-[#FCE000]">
            {currentScreen === 'role-selection' && (
                <div className="p-10 h-screen flex flex-col justify-center text-center">
                    <div className="w-24 h-24 bg-[#FCE000] rounded-[32px] flex items-center justify-center mx-auto mb-10 shadow-xl rotate-6 animate-bounce"><ShoppingBag size={48} /></div>
                    <h1 className="text-5xl font-black mb-4 tracking-tighter italic">EDAAA</h1>
                    <p className="text-gray-400 mb-14 text-lg font-medium italic">Telegram Mini App Edition</p>
                    <div className="space-y-4">
                        <Button onClick={() => selectRole('customer')}>Заказать еду</Button>
                        <Button onClick={() => selectRole('seller')} variant="secondary">Партнерство</Button>
                        <Button onClick={() => selectRole('courier')} variant="secondary">Стать курьером</Button>
                    </div>
                </div>
            )}

            {currentScreen === 'order-success' && (
                <div className="h-screen flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-500">
                    <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mb-8 animate-in zoom-in-50 duration-500 shadow-inner">
                        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg animate-bounce">
                            <Check size={40} strokeWidth={4} />
                        </div>
                    </div>
                    <h2 className="text-4xl font-black mb-4 tracking-tight">Готово!</h2>
                    <p className="text-gray-400 font-medium mb-12">Заказ оплачен. Ждем ресторан.</p>
                    <div className="w-full space-y-4">
                        <Button onClick={() => setCurrentScreen('customer-track-order')}>Где мой заказ?</Button>
                    </div>
                </div>
            )}

            {currentScreen === 'customer-track-order' && (
                <div className="p-6 animate-in slide-in-from-bottom duration-500">
                    <div className="bg-gray-50 p-8 rounded-[48px] mb-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5"><MapIcon size={120} /></div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Статус</p>
                        <h3 className="text-3xl font-black mb-6">
                            {(() => {
                                const currentOrder = activeOrders.find(o => o.id === trackingOrder?.id);
                                const status = currentOrder?.status || 'pending';
                                if (status === 'pending') return 'Заказ принят';
                                if (status === 'accepted') return 'Шеф готовит...';
                                if (status === 'ready_for_pickup') return 'Заказ собран';
                                if (status === 'picked_up') return 'Курьер в пути';
                                if (status === 'delivered') return 'Приятного аппетита!';
                            })()}
                        </h3>
                        <div className="flex justify-between items-center px-2 mb-4">
                            {ORDER_STATUSES.map((step, idx) => {
                                const currentOrder = activeOrders.find(o => o.id === trackingOrder?.id);
                                const statusIdx = ORDER_STATUSES.findIndex(s => s.id === (currentOrder?.status || 'pending'));
                                const isDone = idx <= statusIdx;
                                return (
                                    <React.Fragment key={step.id}>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${isDone ? 'bg-[#FCE000] shadow-lg scale-110' : 'bg-gray-200 text-gray-400'}`}>
                                            <step.icon size={18} />
                                        </div>
                                        {idx < ORDER_STATUSES.length - 1 && (
                                            <div className={`flex-1 h-1 mx-1 rounded-full ${isDone && idx < statusIdx ? 'bg-[#FCE000]' : 'bg-gray-200'}`} />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-[40px] p-6 shadow-sm mb-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center font-black">?</div>
                            <div>
                                <p className="font-black text-lg">{trackingOrder?.storeName}</p>
                                <p className="text-xs text-gray-400">ул. Шахрисабз, 25</p>
                            </div>
                            <button className="ml-auto bg-green-500 text-white p-3 rounded-2xl shadow-lg shadow-green-100"><Phone size={20} /></button>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-gray-50">
                            {trackingOrder?.items.map(it => (
                                <div key={it.id} className="flex justify-between font-bold text-sm">
                                    <span className="text-gray-400">{it.quantity}x</span>
                                    <span className="flex-1 ml-3">{it.name}</span>
                                    <span>{it.price.toLocaleString()} сум</span>
                                </div>
                            ))}
                            <div className="flex justify-between font-black text-xl pt-4">
                                <span>Итого</span>
                                <span>{trackingOrder?.total.toLocaleString()} сум</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {currentScreen === 'customer-home' && (
                <div className="p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-[#FCE000] rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">Я</div>
                            <span className="font-black text-2xl tracking-tighter italic">Еда</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="bg-gray-100 p-3 rounded-2xl"><Search size={22} /></div>
                            <div className="bg-gray-100 p-3 rounded-2xl"><Bell size={22} /></div>
                        </div>
                    </div>
                    <h2 className="text-3xl font-black mb-8 tracking-tight">Рестораны</h2>
                    <div className="space-y-10">
                        {DEFAULT_STORES.map(s => (
                            <div key={s.id} onClick={() => { setSelectedStore(s); setCurrentScreen('customer-store'); }} className="cursor-pointer group active:scale-95 transition-all">
                                <div className="relative h-60 rounded-[48px] overflow-hidden mb-5 shadow-xl">
                                    <img src={s.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    <div className="absolute top-5 right-5 bg-white/95 px-4 py-1.5 rounded-full font-black flex items-center gap-1 text-sm shadow-xl"><Star size={16} fill="currentColor" className="text-yellow-400" /> {s.rating}</div>
                                </div>
                                <div className="px-3 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-2xl font-black mb-1">{s.name}</h3>
                                        <p className="text-gray-400 text-xs font-black uppercase tracking-widest">{s.categories.join(' • ')}</p>
                                    </div>
                                    <div className="bg-[#FCE000] p-4 rounded-[22px] shadow-lg"><ChevronRight /></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {currentScreen === 'customer-store' && (
                <div className="animate-in slide-in-from-right duration-400">
                    <div className="relative h-72">
                        <img src={selectedStore?.image} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-10 bg-white -mt-12 rounded-t-[56px] relative shadow-2xl min-h-[70vh]">
                        <h1 className="text-4xl font-black mb-2 tracking-tight">{selectedStore?.name}</h1>
                        <p className="text-gray-400 mb-10 font-bold uppercase text-[10px] tracking-[0.2em]">Доставка • {selectedStore?.time}</p>
                        <div className="grid grid-cols-1 gap-6">
                            {allProducts.filter(p => p.storeName === selectedStore?.name).map(p => {
                                const q = cart.find(i => i.id === p.id)?.quantity || 0;
                                return (
                                    <div key={p.id} className="flex gap-5 items-center bg-gray-50 p-5 rounded-[40px] border border-gray-100 hover:bg-white hover:border-yellow-200 transition-all">
                                        <img src={p.image} className="w-28 h-28 rounded-3xl object-cover shadow-sm" />
                                        <div className="flex-1">
                                            <h4 className="font-black text-lg mb-1">{p.name}</h4>
                                            <p className="font-black text-xl text-[#FCE000] mb-3">{p.price.toLocaleString()} сум</p>
                                            {q > 0 ? (
                                                <div className="flex items-center gap-5 bg-white rounded-2xl px-3 py-1 w-fit border border-yellow-300">
                                                    <button onClick={() => removeFromCart(p.id)} className="p-2 text-yellow-600"><Minus size={20} /></button>
                                                    <span className="font-black text-lg">{q}</span>
                                                    <button onClick={() => addToCart(p)} className="p-2 text-yellow-600"><Plus size={20} /></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => addToCart(p)} className="bg-white px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-100 shadow-sm hover:border-yellow-400">В корзину</button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {cart.length > 0 && (
                        <div className="fixed bottom-28 left-6 right-6 z-50">
                            <Button onClick={placeOrder} className="shadow-2xl h-16 text-lg">Заказать {(cart.reduce((s, i) => s + i.price * i.quantity, 0)).toLocaleString()} сум</Button>
                        </div>
                    )}
                </div>
            )}

            {currentScreen === 'customer-orders' && (
                <div className="p-8">
                    <h2 className="text-4xl font-black mb-10 tracking-tight">Заказы</h2>
                    <div className="flex gap-3 mb-10 bg-gray-100 p-2 rounded-[24px]">
                        <button onClick={() => setOrderTab('active')} className={`flex-1 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-widest transition-all ${orderTab === 'active' ? 'bg-white shadow-md text-black' : 'text-gray-400'}`}>Активные</button>
                        <button onClick={() => setOrderTab('history')} className={`flex-1 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-widest transition-all ${orderTab === 'history' ? 'bg-white shadow-md text-black' : 'text-gray-400'}`}>История</button>
                    </div>
                    <div className="space-y-6">
                        {activeOrders.filter(o => o.customerId === user.uid && (orderTab === 'active' ? o.status !== 'delivered' : o.status === 'delivered')).sort((a, b) => b.createdAt - a.createdAt).map(o => (
                            <div key={o.id} onClick={() => { setTrackingOrder(o); setCurrentScreen('customer-track-order'); }} className="bg-white border border-gray-100 p-8 rounded-[44px] shadow-sm active:scale-95 transition-all cursor-pointer">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h4 className="font-black text-xl mb-1">{o.storeName}</h4>
                                        <p className="text-[10px] font-black text-gray-300 uppercase">№{o.id.slice(-6).toUpperCase()}</p>
                                    </div>
                                    <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${o.status === 'delivered' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-700'}`}>{o.status}</span>
                                </div>
                                <div className="flex gap-3 mb-6 overflow-x-auto no-scrollbar">
                                    {o.items.map(it => <img key={it.id} src={it.image} className="w-16 h-16 rounded-[22px] object-cover border-2 border-white shadow-sm" />)}
                                </div>
                                <div className="flex justify-between items-center border-t border-gray-50 pt-6">
                                    <p className="font-black text-lg">{o.total.toLocaleString()} сум</p>
                                    <ChevronRight size={20} className="text-gray-300" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ЭКРАНЫ ПРОДАВЦА */}
            {currentScreen === 'seller-dashboard' && (
                <div className="p-8 bg-gray-50 min-h-screen">
                    <h2 className="text-4xl font-black mb-10 tracking-tight">Заказы</h2>
                    <div className="space-y-6">
                        {activeOrders.filter(o => o.status !== 'delivered').map(o => (
                            <div key={o.id} className="bg-white p-8 rounded-[48px] shadow-lg animate-in slide-in-from-bottom-8">
                                <div className="flex justify-between mb-8">
                                    <p className="font-black text-xl italic">№{o.id.slice(-4).toUpperCase()}</p>
                                    <Timer size={24} className="text-blue-500 animate-pulse" />
                                </div>
                                <div className="space-y-3 mb-10">
                                    {o.items.map(it => <div key={it.id} className="flex justify-between font-bold text-gray-600"><span>{it.name}</span><span className="bg-gray-100 px-3 py-1 rounded-lg">x{it.quantity}</span></div>)}
                                </div>
                                {o.status === 'pending' && <Button onClick={() => updateOrderStatus(o.id, 'accepted')}>ПРИНЯТЬ</Button>}
                                {o.status === 'accepted' && <Button onClick={() => updateOrderStatus(o.id, 'ready_for_pickup')} variant="dark">ГОТОВО К ВЫДАЧЕ</Button>}
                                {o.status === 'ready_for_pickup' && <div className="text-center p-5 bg-blue-50 rounded-[28px] font-black text-blue-600 text-sm tracking-widest uppercase">Ждем курьера...</div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ЭКРАНЫ КУРЬЕРА */}
            {currentScreen === 'courier-dashboard' && (
                <div className="p-8 bg-zinc-950 min-h-screen text-white">
                    <div className="flex justify-between items-center mb-12">
                        <h2 className="text-4xl font-black italic">РАБОТА</h2>
                        <div className="px-5 py-2 bg-green-500 text-black font-black text-[10px] rounded-full">ONLINE</div>
                    </div>
                    <div className="space-y-8">
                        {activeOrders.filter(o => o.status === 'ready_for_pickup' && !o.courierId).map(o => (
                            <div key={o.id} className="bg-zinc-900 p-10 rounded-[56px] border border-zinc-800 shadow-2xl">
                                <div className="flex justify-between mb-8">
                                    <span className="text-[#FCE000] font-black text-3xl">+22 000 сум</span>
                                    <Package size={32} className="text-zinc-700" />
                                </div>
                                <div className="space-y-4 mb-10">
                                    <p className="text-sm font-bold"><span className="text-yellow-400 mr-2">ОТКУДА:</span> {o.storeName}</p>
                                    <p className="text-sm font-bold"><span className="text-red-500 mr-2">КУДА:</span> {o.address}</p>
                                </div>
                                <Button onClick={() => updateOrderStatus(o.id, 'ready_for_pickup', { courierId: user.uid })} variant="dark" className="bg-white text-black h-16 text-xl">ПРИНЯТЬ</Button>
                            </div>
                        ))}
                        {activeOrders.filter(o => o.courierId === user.uid && o.status !== 'delivered').map(o => (
                            <div key={o.id} className="bg-[#FCE000] text-black p-10 rounded-[56px]">
                                <p className="font-black text-3xl mb-10 italic">В ПУТИ</p>
                                {o.status === 'ready_for_pickup' ? (
                                    <Button onClick={() => updateOrderStatus(o.id, 'picked_up')} variant="dark" className="h-16 text-lg">ЗАБРАЛ ЗАКАЗ</Button>
                                ) : (
                                    <Button onClick={() => updateOrderStatus(o.id, 'delivered')} variant="dark" className="h-16 text-lg">ЗАВЕРШИТЬ</Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <Navbar />
        </div>
    );
}