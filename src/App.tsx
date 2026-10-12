import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, UserPlus, FileText, Zap, Droplets, Wrench, LogOut, Home, 
  Plus, Search, CheckCircle2, AlertCircle, Printer, Save, Trash2, Building2, 
  Layers, UserMinus, X, ImageIcon, Phone, CreditCard, UserCheck, ShieldAlert, 
  Calculator, Clock, CheckCircle, Receipt, Wallet, Upload, Eye, Settings, 
  QrCode, MapPin, TrendingUp, Calendar, Camera, ClipboardList, User, FileSearch, 
  AlertTriangle, Gavel, Lock, BadgeCheck, History, Send, ImagePlus, Menu, Key, ChevronRight,
  Sparkles, Loader2, Filter, Check, Quote, Megaphone, Bell
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json'; // Ensure this exists

// --- Firebase Configuration ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); // CRITICAL: The app will break without this line
const appId = firebaseConfig.projectId;

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const getImageSizeKB = (dataUrl?: string | null): number => {
  if (!dataUrl || typeof dataUrl !== 'string') return 0;
  const commaIdx = dataUrl.indexOf(',');
  const base64Str = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  return Math.round((base64Str.length * 0.75) / 1024);
};

const compressImage = (input: File | Blob | string, maxSizeMB = 1, maxDim = 1200): Promise<string> => {
  return new Promise((resolve, reject) => {
    const processImage = (src: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > height && width > maxDim) {
          height = Math.round(height * (maxDim / width));
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round(width * (maxDim / height));
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        while (dataUrl.length * 0.75 > maxSizeMB * 1024 * 1024 && quality > 0.15) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };

    if (typeof input === 'string') {
      processImage(input);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          processImage(result);
        } else {
          resolve('');
        }
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(input);
    }
  });
};


export const DEFAULT_DORM_RULES = `1. เวลาเข้า-ออก และการกลับหอพัก (Curfew & Attendance)
• เวลาเข้าหอพักปกติ: วันจันทร์ - พฤหัสบดี ต้องกลับเข้าหอพักภายในเวลา 20:00 น. / วันศุกร์ - อาทิตย์ และวันหยุดนักขัตฤกษ์ ภายในเวลา 21:00 น.
• การออกนอกพื้นที่: หากมีความจำเป็นต้องออกนอกหอพักหลังเวลาดังกล่าว ต้องแจ้งผู้ดูแลหอพักล่วงหน้าและได้รับอนุญาตจากผู้ปกครองทุกครั้ง
• การค้างคืนนอกหอพัก: อนุญาตให้ค้างคืนนอกหอพักได้เฉพาะกรณีมีผู้ปกครองมารับหรือทำหนังสือยินยอมเป็นลายลักษณ์อักษรล่วงหน้าเท่านั้น

2. ความปลอดภัย และบุคคลภายนอก (Security & Visitors)
• ห้ามบุคคลภายนอก (เพศชาย) ขึ้นบนห้องพักเด็ดขาด หากมีญาติหรือเพื่อนมาเยี่ยม ให้พบกันได้เฉพาะบริเวณด้านนอกอาคารหอพักหรือพื้นที่จัดไว้ให้เท่านั้น
• เวลาเยี่ยมเยียน: สิ้นสุดเวลาเยี่ยมไม่เกิน 19:00 น. ของทุกวัน
• การรักษาความปลอดภัย: ต้องล็อกประตูห้องพักทุกครั้งเมื่อเข้า-ออก หรือเข้านอน ห้ามให้กุญแจหรือคีย์การ์ดกับบุคคลอื่นยืมใช้เด็ดขาด

3. ความประพฤติ และสุขอนามัย (Conduct & Hygiene)
• สิ่งเสพติดและของมึนเมา: ห้ามพกพา เสพ หรือมีไว้ในครอบครองซึ่งบุหรี่ บุหรี่ไฟฟ้า สุรา สิ่งมึนเมา และยาเสพติดทุกชนิดภายในบริเวณหอพัก
• สิ่งผิดกฎหมายและอาวุธ: ห้ามนำอาวุธ วัตถุระเบิด หรือสิ่งผิดกฎหมายทุกชนิดเข้ามาในหอพัก
• ความสะอาด: รับผิดชอบความสะอาดภายในห้องพักของตนเอง และช่วยกันรักษาความสะอาดบริเวณพื้นที่ส่วนกลาง
• การจัดการขยะ: นำขยะในห้องพักไปทิ้งในจุดที่หอพักกำหนดไว้ทุกวัน, ห้ามทิ้งเศษอาหารลงในท่อระบายน้ำทิ้ง, ห้ามทิ้งกระดาษชำระลงในชักโครก

4. ทรัพย์สิน และการใช้พลังงาน (Facilities & Utilities)
• การอนุรักษ์พลังงาน: ปิดไฟ แอร์ พัดลม และเครื่องใช้ไฟฟ้าทุกชนิดทันทีเมื่อออกจากห้องพัก
• เครื่องใช้ไฟฟ้าที่ไม่อนุญาต: ห้ามใช้เครื่องใช้ไฟฟ้าประเภทให้ความร้อนสูงในห้องนอน เช่น เตาไฟฟ้า หม้อสุกี้ (ให้ใช้ในจุดที่จัดเตรียมไว้ให้เท่านั้น)
• ห้ามประกอบอาหารภายในหอพัก และห้ามใช้เตาไฟฟ้า/เตาแก๊ส
• ความเสียหาย: หากทรัพย์สินของหอพักชำรุดเสียหายจากการใช้งานผิดวิธี ผู้พักอาศัยต้องรับผิดชอบค่าใช้จ่ายในการซ่อมแซมหรือทดแทน

5. ความสงบเรียบร้อยในยามวิกาล (Quiet Hours)
• เวลาพักผ่อน: งดส่งเสียงดังหรือทำกิจกรรมที่รบกวนผู้อื่นตั้งแต่เวลา 22:00 น. เป็นต้นไป
• การใช้เสียง: ควรใช้อุปกรณ์หูฟังหากต้องการฟังเพลง ดูซีรีส์ หรือเล่นเกมในช่วงเวลาดึก เพื่อไม่ให้เป็นการรบกวนเพื่อนร่วมห้องและห้องข้างเคียง

6. การชำระค่าเช่า
• ก่อนเข้าพักจะต้องทำสัญญาเช่าอย่างน้อย 1 ปี และเก็บเงินค่าเช่า + ค่ามัดจำล่วงหน้า 1 เดือน
• การชำระค่าเช่า ไม่เกินวันที่ 5 ของเดือน โดยชำระเป็นการโอน / QR code เท่านั้น โดยจะแจ้งยอดบิลใน app / line ของหอพัก`;

export const DEFAULT_DORM_VIOLATIONS = `บทลงโทษกรณีฝ่าฝืนกฎระเบียบ
1. ตักเตือนด้วยวาจา: สำหรับการทำผิดครั้งแรก (เช่น ลืมปิดไฟ, กลับเข้าหอช้ากว่ากำหนดเล็กน้อยโดยไม่แจ้ง)
2. ตักเตือนเป็นลายลักษณ์อักษร / แจ้งผู้ปกครอง: สำหรับการทำผิดซ้ำ หรือฝ่าฝืนกฎระดับปานกลาง
3. พักการเข้าพัก / เชิญออกนอกหอพัก และยกเลิกสัญญา: สำหรับการทำผิดร้ายแรง เช่น เกี่ยวกับยาเสพติด, การนำเพศตรงข้ามขึ้นห้องพัก, หรือการทะเลาะวิวาท
4. การค้างชำระเกินวันที่กำหนด จะต้องแจ้งผู้ปกครองให้รับทราบ เพื่อชำระให้เรียบร้อย ถ้าไม่มีการชำระจนถึงวันที่ 15 ของเดือน ให้ยกเลิกสัญญา เชิญออกจากหอพัก และถ้ามีการชำระล่าช้าติดต่อกันสองเดือน (เกินกว่าวันที่ 5) ให้ยกเลิกสัญญา เชิญออกจากหอพัก เช่นเดียวกัน`;

const App = () => {
  // --- State Management ---
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Cloud Data States
  const [rooms, setRooms] = useState([]);
  const [bills, setBills] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    category: 'water' as 'water' | 'electricity' | 'maintenance' | 'general' | 'urgent',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isPinned: false
  });
  const [announcementFilter, setAnnouncementFilter] = useState<'all' | 'active' | 'expired'>('active');
  const [isConfigLoaded, setIsConfigLoaded] = useState(() => {
    return !!localStorage.getItem('cached_bill_config');
  });
  const [billConfig, setBillConfig] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_bill_config');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      // ignore
    }
    return {
      dormName: '',
      slogan: '',
      address: '',
      phone: '',
      taxId: '',
      bankName: '',
      accountNumber: '',
      accountName: '',
      logoUrl: '',
      qrCodeUrl: ''
    };
  });
  const [rates, setRates] = useState({ elecRate: 8, waterRate: 18, waterBillingType: 'unit', waterFixedRate: 150 });

  // UI States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [invoiceZoom, setInvoiceZoom] = useState<number>(85);
  const [isContractPreviewOpen, setIsContractPreviewOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isReviewBookingModalOpen, setIsReviewBookingModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);
  
  // AI ID Card Scanner States
  const [isScanningIdCard, setIsScanningIdCard] = useState<boolean>(false);
  const [scanningTarget, setScanningTarget] = useState<'tenant' | 'parent'>('tenant');
  const [scanStatusMessage, setScanStatusMessage] = useState<string>('');
  
  // Building & Floor Tab Navigation States for 'rooms' tab
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  
  // Billing Tab Filter States
  const [billingSearch, setBillingSearch] = useState<string>('');
  const [billingStatusFilter, setBillingStatusFilter] = useState<string>('all');
  const [billingBuildingFilter, setBillingBuildingFilter] = useState<string>('all');
  
  // Contract Tab Filter States
  const [contractSearch, setContractSearch] = useState<string>('');
  const [contractBuildingFilter, setContractBuildingFilter] = useState<string>('all');
  
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [selectedContractRoom, setSelectedContractRoom] = useState(null);
  
  const [tenantForm, setTenantForm] = useState({ 
    name: '', idCard: '', phone: '', parentName: '', parentPhone: '', address: '',
    contractId: '', deposit: '', initialTotal: '', dueDate: '5',
    startDate: new Date().toISOString().split('T')[0], 
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    rules: DEFAULT_DORM_RULES,
    violationDetails: DEFAULT_DORM_VIOLATIONS,
    idCardImage: null,
    tenantPassword: ''
  });

  const [bookingForm, setBookingForm] = useState({
    name: '', phone: '', slipImage: null
  });

  const [batchConfig, setBatchConfig] = useState({ building: '', startFloor: 1, endFloor: 1, roomsPerFloor: 5, type: 'Fan', price: 3500, imageUrl: '' });
  const [newMeter, setNewMeter] = useState({ roomId: '', prevElec: 0, currElec: '', prevWater: 0, currWater: '' });
  const [newExpense, setNewExpense] = useState({ title: '', amount: '', category: 'General', date: new Date().toISOString().split('T')[0], note: '' });
  const [newMaintenance, setNewMaintenance] = useState({ roomId: '', issue: '', image: null });
  const [maintenanceFilter, setMaintenanceFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [maintenanceSearch, setMaintenanceSearch] = useState<string>('');
  const [editingMaintenanceNote, setEditingMaintenanceNote] = useState<{ id: number | null, adminNote: string, cost: string }>({ id: null, adminNote: '', cost: '' });

  // Auth Role States
  const [authRole, setAuthRole] = useState(null); // 'admin' | 'tenant' | 'guest' | null
  const [passwordInput, setPasswordInput] = useState('');
  const [tenantLoginData, setTenantLoginData] = useState({ username: '', password: '' });
  const [loggedInRoom, setLoggedInRoom] = useState(null);
  const [loginError, setLoginError] = useState('');

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null as (() => void | Promise<void>) | null,
    confirmText: 'ยืนยัน',
    cancelText: 'ยกเลิก',
    isWarning: false
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void | Promise<void>, isWarning = false) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText: 'ยืนยัน',
      cancelText: 'ยกเลิก',
      isWarning
    });
  };

  // --- Auth Effect ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = (window as any).__initial_auth_token;
        if (token) {
          await signInWithCustomToken(auth, token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        // Silently ignore auth errors, we are proceeding as guest
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Even if firebaseUser is null, we can proceed as guests
      setUser(firebaseUser || { uid: 'anonymous-guest' });
    });
    return () => unsubscribe();
  }, []);

  // Handle mobile menu close on Escape key or desktop resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Dynamic Browser Tab Title and Favicon based on Dorm Info & Logo
  useEffect(() => {
    if (billConfig.dormName) {
      document.title = billConfig.slogan 
        ? `${billConfig.dormName} - ${billConfig.slogan}` 
        : billConfig.dormName;
    }
    if (billConfig.logoUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.head.appendChild(link);
      }
      link.href = billConfig.logoUrl;
    }
  }, [billConfig.dormName, billConfig.slogan, billConfig.logoUrl]);

  // --- Real-time Data Sync Effect ---
  useEffect(() => {
    const publicPath = (coll) => collection(db, 'artifacts', appId, 'public', 'data', coll);

    const unsubRooms = onSnapshot(publicPath('rooms'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      setRooms(data);
    }, (err) => console.error(err));

    const unsubBills = onSnapshot(publicPath('bills'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      setBills(data.sort((a, b) => b.id - a.id));
    }, (err) => console.error(err));

    const unsubExpenses = onSnapshot(publicPath('expenses'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      setExpenses(data.sort((a, b) => b.id - a.id));
    }, (err) => console.error(err));

    const unsubMaintenance = onSnapshot(publicPath('maintenance'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      setMaintenance(data.sort((a, b) => b.id - a.id));
    }, (err) => console.error(err));

    const unsubConfig = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBillConfig(prev => {
          const updated = { ...prev, ...data };
          try {
            localStorage.setItem('cached_bill_config', JSON.stringify(updated));
          } catch (e) {
            // ignore
          }
          return updated;
        });
      }
      setIsConfigLoaded(true);
    }, (err) => {
      console.error(err);
      setIsConfigLoaded(true);
    });

    const unsubRates = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'rates'), (docSnap) => {
      if (docSnap.exists()) setRates(docSnap.data());
    }, (err) => console.error(err));

    const unsubAnnouncements = onSnapshot(publicPath('announcements'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(data.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    }, (err) => console.error("Error fetching announcements:", err));

    return () => {
      unsubRooms(); unsubBills(); unsubExpenses(); unsubMaintenance(); unsubConfig(); unsubRates(); unsubAnnouncements();
    };
  }, [user]);

  // --- Dashboard Calculations ---
  const dashboardStats = useMemo(() => {
    const filteredBills = bills.filter(b => {
      const d = new Date(b.date);
      return (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear;
    });

    const filteredExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear;
    });

    const totalIncome = filteredBills.reduce((sum, b) => sum + (b.status === 'paid' ? b.total : 0), 0);
    const totalPending = filteredBills.reduce((sum, b) => sum + (b.status === 'unpaid' ? b.total : 0), 0);
    const totalExpense = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = totalIncome - totalExpense;

    return { totalIncome, totalPending, totalExpense, profit, filteredExpenses };
  }, [bills, expenses, selectedMonth, selectedYear]);

  const tenantUnpaidBills = useMemo(() => {
    if (authRole !== 'tenant' || !loggedInRoom) return [];
    return bills.filter(b => b.roomId === loggedInRoom.id && b.building === loggedInRoom.building && b.status === 'unpaid');
  }, [authRole, loggedInRoom, bills]);

  // Active Announcements (automatically filters out expired ones based on current date)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const activeAnnouncements = useMemo(() => {
    return announcements
      .filter((a: any) => {
        if (!a.endDate) return true;
        // Notice is active if endDate >= todayStr
        return a.endDate >= todayStr;
      })
      .sort((a: any, b: any) => {
        // Pinned first, then newest
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [announcements, todayStr]);

  // --- Announcement Handlers ---
  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const announcementId = editingAnnouncement ? editingAnnouncement.id : `ann_${Date.now()}`;
      const announcementData = {
        title: newAnnouncement.title.trim(),
        content: newAnnouncement.content.trim(),
        category: newAnnouncement.category,
        startDate: newAnnouncement.startDate || todayStr,
        endDate: newAnnouncement.endDate,
        createdAt: editingAnnouncement?.createdAt || new Date().toISOString(),
        author: authRole === 'admin' ? 'ผู้ดูแลหอพัก (Admin)' : 'เจ้าหน้าที่',
        isPinned: !!newAnnouncement.isPinned
      };

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'announcements', announcementId), announcementData);
      setIsAnnouncementModalOpen(false);
      setEditingAnnouncement(null);
      setNewAnnouncement({
        title: '',
        content: '',
        category: 'water',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isPinned: false
      });
    } catch (err: any) {
      console.error("Error saving announcement:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกประกาศ: " + err.message);
    }
  };

  const handleDeleteAnnouncement = (id: string, title: string) => {
    triggerConfirm(
      "ลบประกาศนี้?",
      `คุณต้องการลบประกาศ "${title}" ออกจากระบบใช่หรือไม่?`,
      async () => {
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'announcements', id));
        } catch (err: any) {
          console.error("Error deleting announcement:", err);
          alert("ไม่สามารถลบประกาศได้: " + err.message);
        }
      },
      true
    );
  };

  // Helper for Category styling & labels
  const getAnnouncementCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'water':
        return { label: 'น้ำประปา', bg: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: Droplets, lightBg: 'from-cyan-500/10 via-blue-500/5 to-white' };
      case 'electricity':
        return { label: 'ไฟฟ้า', bg: 'bg-amber-100 text-amber-800 border-amber-200', icon: Zap, lightBg: 'from-amber-500/10 via-yellow-500/5 to-white' };
      case 'maintenance':
        return { label: 'งานซ่อมบำรุง', bg: 'bg-purple-100 text-purple-800 border-purple-200', icon: Wrench, lightBg: 'from-purple-500/10 via-indigo-500/5 to-white' };
      case 'urgent':
        return { label: 'ด่วนมาก', bg: 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse', icon: AlertTriangle, lightBg: 'from-rose-500/15 via-red-500/5 to-white' };
      case 'general':
      default:
        return { label: 'ข่าวสารทั่วไป', bg: 'bg-blue-100 text-blue-800 border-blue-200', icon: Megaphone, lightBg: 'from-blue-500/10 via-slate-500/5 to-white' };
    }
  };

  // Quick preset templates for admin convenience
  const applyAnnouncementTemplate = (type: 'water' | 'electric' | 'clean' | 'holiday') => {
    const today = new Date().toISOString().split('T')[0];
    const twoDaysLater = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const nextDay = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    if (type === 'water') {
      setNewAnnouncement({
        title: 'แจ้งการตัดน้ำประปาชั่วคราวเพื่อซ่อมบำรุงท่อส่งน้ำ',
        content: 'เรียนผู้เช่าทุกท่าน ทางหอพักขอแจ้งงดจ่ายน้ำประปาชั่วคราวเพื่อทำการล้างถังพักน้ำและตรวจสอบระบบท่อประปา ขอให้ทุกท่านสำรองน้ำไว้ใช้ล่วงหน้า ขออภัยในความไม่สะดวกเป็นอย่างยิ่งครับ',
        category: 'water',
        startDate: today,
        endDate: nextDay,
        isPinned: true
      });
    } else if (type === 'electric') {
      setNewAnnouncement({
        title: 'แจ้งดับกระแสไฟฟ้าชั่วคราวเพื่อตรวจเช็กตู้ควบคุมไฟ',
        content: 'เรียนผู้เช่าทุกท่าน การไฟฟ้านครหลวง/หอพัก จะดำเนินการซ่อมบำรุงและสับเปลี่ยนอุปกรณ์ระบบไฟฟ้า ทำให้จำเป็นต้องดับกระแสไฟฟ้าชั่วคราว จึงขอแจ้งให้ผู้เช่าทุกท่านทราบล่วงหน้าครับ',
        category: 'electricity',
        startDate: today,
        endDate: nextDay,
        isPinned: true
      });
    } else if (type === 'clean') {
      setNewAnnouncement({
        title: 'แจ้งทำความสะอาดและฉีดพ่นฆ่าเชื้อพื้นที่ส่วนกลาง',
        content: 'แม่บ้านและเจ้าหน้าที่จะเข้าทำความสะอาดบริเวณทางเดิน โถงบันได และลานจอดรถ ขอความร่วมมืออย่าวางสิ่งของกีดขวางทางเดินส่วนกลาง ขอบคุณครับ',
        category: 'maintenance',
        startDate: today,
        endDate: twoDaysLater,
        isPinned: false
      });
    } else if (type === 'holiday') {
      setNewAnnouncement({
        title: 'แจ้งวันหยุดทำการสำนักงานหอพักช่วงเทศกาล',
        content: 'สำนักงานหอพักจะปิดทำการชั่วคราว หากมีเหตุฉุกเฉินหรือประสงค์แจ้งซ่อมเร่งด่วน สามารถติดต่อผู้ดูแลได้ที่เบอร์โทรศัพท์ประจำหอพักตามปกติครับ',
        category: 'general',
        startDate: today,
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isPinned: false
      });
    }
  };

  // --- Handlers ---
  const saveRoom = async (roomData) => {
    try {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', `${roomData.building}-${roomData.id}`);
      await setDoc(roomRef, roomData);
    } catch (err) {
      console.error("Error in saveRoom:", err);
      alert("Error saving room: " + err.message);
    }
  };

  const handleUpdateConfig = async (newConf) => {
    setBillConfig(newConf);
    try {
      localStorage.setItem('cached_bill_config', JSON.stringify(newConf));
    } catch (e) {
      // ignore
    }
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'general'), newConf);
  };

  const handleUpdateRates = async (newRates) => {
    setRates(newRates);
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'rates'), newRates);
  };

  const handleFileChange = async (e, field) => {
    const file = e.target.files?.[0];
    if (file) {
      if (field === 'idCard') {
        // บีบอัดสำเนาบัตรประชาชนให้มีขนาดกะทัดรัด คมชัดสูง (~100-200 KB) เพื่อประหยัดพื้นที่จัดเก็บ
        const compressed = await compressImage(file, 0.25, 1000);
        setTenantForm(prev => ({ ...prev, idCardImage: compressed }));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (field === 'room') {
          setBatchConfig({ ...batchConfig, imageUrl: reader.result });
        } else if (field === 'logo') {
          handleUpdateConfig({ ...billConfig, logoUrl: reader.result });
        } else if (field === 'qr') {
          handleUpdateConfig({ ...billConfig, qrCodeUrl: reader.result });
        } else if (field === 'slip') {
          setBookingForm({ ...bookingForm, slipImage: reader.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const processIdCardWithAI = async (file: File, target: 'tenant' | 'parent') => {
    setIsScanningIdCard(true);
    setScanningTarget(target);
    setScanStatusMessage('กำลังลดขนาดและปรับความคมชัดของภาพบัตรประชาชน...');

    try {
      // บีบอัดภาพบัตรประชาชนให้อยู่ในขนาดเหมาะสม (~120-250 KB, คมชัด 1000px) เพื่อประหยัดพื้นที่และอ่านได้รวดเร็ว
      const compressedDataUrl = await compressImage(file, 0.25, 1000) as string;
      
      // If scanning for tenant, also save this as the ID card photo copy
      if (target === 'tenant') {
        setTenantForm(prev => ({ ...prev, idCardImage: compressedDataUrl }));
      }

      // Extract base64 payload and mimeType
      const match = compressedDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (!match) {
        throw new Error('รูปแบบไฟล์รูปภาพไม่ถูกต้อง');
      }
      const mimeType = match[1];
      const base64Data = match[2];

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('ไม่พบคีย์เชื่อมต่อ AI (GEMINI_API_KEY)');
      }

      setScanStatusMessage('AI กำลังถอดข้อมูลบัตรประชาชน (ชื่อ-นามสกุล, เลขบัตร, ที่อยู่)...');
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `คุณคือระบบ OCR และ AI อ่านบัตรประจำตัวประชาชนไทย (Thai National ID Card) แบบความแม่นยำสูง
โปรดวิเคราะห์รูปภาพบัตรประชาชนนี้ และดึงข้อมูลต่อไปนี้ออกมาอย่างถูกต้อง:
1. "name": ชื่อและนามสกุลภาษาไทยเต็ม เช่น "นาย สมชาย ใจดี" หรือ "น.ส. กานดา บุญรักษา" (ไม่ตัดคำนำหน้าออก)
2. "idCard": เลขประจำตัวประชาชน 13 หลัก (เฉพาะตัวเลขติดกัน 13 หลัก เช่น "1234567890123")
3. "address": ที่อยู่ตามบัตรประชาชนภาษาไทยแบบสมบูรณ์ เช่น "123 หมู่ 4 ต.ในเมือง อ.เมือง จ.ขอนแก่น"

ส่งคำตอบกลับมาเฉพาะ JSON เท่านั้น ในโครงสร้างนี้:
{
  "name": "...",
  "idCard": "...",
  "address": "..."
}
หากข้อมูลส่วนใดมองไม่ชัดหรืออ่านไม่ได้ ให้ใส่เป็นสตริงว่าง ""`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data
                }
              },
              {
                text: prompt
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text || '{}';
      let parsed: { name?: string; idCard?: string; address?: string } = {};
      try {
        parsed = JSON.parse(responseText.trim());
      } catch (err) {
        const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned);
      }

      setTenantForm(prev => {
        if (target === 'tenant') {
          return {
            ...prev,
            name: parsed.name ? parsed.name.trim() : prev.name,
            idCard: parsed.idCard ? parsed.idCard.trim().replace(/[^0-9]/g, '') : prev.idCard,
            address: parsed.address ? parsed.address.trim() : prev.address
          };
        } else {
          // target === 'parent'
          return {
            ...prev,
            parentName: parsed.name ? parsed.name.trim() : prev.parentName,
            address: parsed.address ? (prev.address ? prev.address : parsed.address.trim()) : prev.address
          };
        }
      });

      setScanStatusMessage('ดึงข้อมูลสำเร็จเรียบร้อย!');
      setTimeout(() => {
        setScanStatusMessage('');
      }, 3000);
    } catch (error: any) {
      console.error('Scan ID Card Error:', error);
      alert(`การสแกนบัตรประชาชนด้วย AI ขัดข้อง: ${error?.message || 'โปรดลองใหม่อีกครั้ง หรือถ่ายรูปให้ชัดเจนขึ้น'}`);
    } finally {
      setIsScanningIdCard(false);
    }
  };

  const handleSingleRoomImageUpload = async (e, roomId, building) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const room = rooms.find(r => r.id === roomId && r.building === building);
        if (room) {
          await saveRoom({ ...room, image: reader.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddBatchRooms = async (e) => {
    e.preventDefault();
    
    if (!batchConfig.building) {
      alert("กรุณาระบุชื่อตึก");
      return;
    }

    const defaultImg = batchConfig.type === 'Air' 
      ? 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&q=80&w=600'
      : 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=600';

    try {
      let createdCount = 0;
      for (let f = parseInt(batchConfig.startFloor); f <= parseInt(batchConfig.endFloor); f++) {
        for (let r = 1; r <= parseInt(batchConfig.roomsPerFloor); r++) {
          const roomNum = `${f}${r.toString().padStart(2, '0')}`;
          if (!rooms.find(rm => rm.id === roomNum && rm.building === batchConfig.building)) {
            await saveRoom({
              id: roomNum,
              building: batchConfig.building,
              floor: f.toString(),
              status: 'available',
              tenant: '-',
              type: batchConfig.type,
              price: parseInt(batchConfig.price),
              image: batchConfig.imageUrl || defaultImg,
              lastElec: 0,
              lastWater: 0
            });
            createdCount++;
          }
        }
      }
      
      if (createdCount > 0) {
        alert(`เพิ่มห้องสำเร็จจำนวน ${createdCount} ห้อง`);
        setIsAddModalOpen(false);
        setBatchConfig({ building: '', startFloor: 1, endFloor: 1, roomsPerFloor: 5, type: 'Fan', price: 3500, imageUrl: '' });
      } else {
        alert("ไม่มีห้องใหม่ถูกเพิ่ม (ห้องอาจมีอยู่แล้ว)");
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // --- Booking Handlers ---
  const handleRoomBooking = async (e) => {
    e.preventDefault();
    if (!selectedRoom || !bookingForm.slipImage) return;

    await saveRoom({
      ...selectedRoom,
      status: 'pending_review',
      bookingInfo: {
        name: bookingForm.name,
        phone: bookingForm.phone,
        slipImage: bookingForm.slipImage,
        timestamp: new Date().toISOString()
      }
    });

    setIsBookingModalOpen(false);
    setBookingForm({ name: '', phone: '', slipImage: null });
    alert("ส่งข้อมูลการจองแล้ว กรุณารอผู้ดูแลระบบตรวจสอบหลักฐานการโอนเงิน");
  };

  const handleConfirmBooking = async () => {
    if (!selectedRoom || !user) return;
    await saveRoom({
      ...selectedRoom,
      status: 'reserved'
    });
    setIsReviewBookingModalOpen(false);
  };

  const handleRejectBooking = async () => {
    if (!selectedRoom || !user) return;
    triggerConfirm(
      "ปฏิเสธการจอง",
      "ยืนยันการปฏิเสธการจองนี้? ข้อมูลการจองจะถูกลบและห้องจะกลับมาว่าง",
      async () => {
        await saveRoom({
          ...selectedRoom,
          status: 'available',
          bookingInfo: null
        });
        setIsReviewBookingModalOpen(false);
      },
      true
    );
  };

  const handleUpdateTenant = async (e) => {
    e.preventDefault();
    if (!user || !selectedRoom) return;
    await saveRoom({
      ...selectedRoom,
      status: 'occupied',
      tenant: tenantForm.name,
      idCard: tenantForm.idCard,
      phone: tenantForm.phone,
      parentName: tenantForm.parentName,
      parentPhone: tenantForm.parentPhone,
      address: tenantForm.address,
      contractId: tenantForm.contractId,
      deposit: tenantForm.deposit,
      initialTotal: tenantForm.initialTotal,
      dueDate: tenantForm.dueDate,
      startDate: tenantForm.startDate,
      endDate: tenantForm.endDate,
      rules: tenantForm.rules,
      violationDetails: tenantForm.violationDetails,
      idCardImage: tenantForm.idCardImage,
      tenantPassword: tenantForm.tenantPassword,
      bookingInfo: null // Clear booking info after move-in
    });
    setIsTenantModalOpen(false);
    setTenantForm({ 
      name: '', idCard: '', phone: '', parentName: '', parentPhone: '', address: '',
      contractId: '', deposit: '', initialTotal: '', dueDate: '5', 
      startDate: new Date().toISOString().split('T')[0], 
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      rules: DEFAULT_DORM_RULES,
      violationDetails: DEFAULT_DORM_VIOLATIONS,
      idCardImage: null,
      tenantPassword: ''
    });
  };

  const openCreateContractModal = (room: any) => {
    setSelectedRoom(room);
    const currentYear = new Date().getFullYear();
    const nextYearDate = new Date();
    nextYearDate.setFullYear(currentYear + 1);
    const monthStr = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const today = new Date().toISOString().split('T')[0];
    const oneYearLater = nextYearDate.toISOString().split('T')[0];
    const roomPrice = Number(room.price) || 0;

    setTenantForm({ 
      name: room.bookingInfo?.name || '', 
      idCard: '', 
      phone: room.bookingInfo?.phone || '', 
      parentName: '', 
      parentPhone: '', 
      address: '',
      contractId: `CTR-${room.building}${room.id}-${currentYear.toString().slice(-2)}${monthStr}`, 
      deposit: String(roomPrice), 
      initialTotal: String(roomPrice * 2), 
      dueDate: '5',
      startDate: today, 
      endDate: oneYearLater,
      rules: DEFAULT_DORM_RULES,
      violationDetails: DEFAULT_DORM_VIOLATIONS,
      idCardImage: null,
      tenantPassword: `${room.building}${room.id}888`
    });
    setIsTenantModalOpen(true);
  };

  const openEditTenantModal = (room: any) => {
    setSelectedRoom(room);
    setTenantForm({
      name: room.tenant || '',
      idCard: room.idCard || '',
      phone: room.phone || '',
      parentName: room.parentName || '',
      parentPhone: room.parentPhone || '',
      address: room.address || '',
      contractId: room.contractId || '',
      deposit: room.deposit || '',
      initialTotal: room.initialTotal || '',
      dueDate: room.dueDate || '5',
      startDate: room.startDate || new Date().toISOString().split('T')[0],
      endDate: room.endDate || '',
      rules: room.rules || DEFAULT_DORM_RULES,
      violationDetails: room.violationDetails || DEFAULT_DORM_VIOLATIONS,
      idCardImage: room.idCardImage || null,
      tenantPassword: room.tenantPassword || ''
    });
    setIsTenantModalOpen(true);
  };

  const handleRemoveTenant = async (room) => {
    triggerConfirm(
      "แจ้งย้ายออก",
      `ยืนยันการแจ้งย้ายออกสำหรับห้อง ${room.id} (${room.building})?`,
      async () => {
        await saveRoom({ 
          ...room, 
          status: 'available', 
          tenant: '-', 
          idCard: '', 
          phone: '', 
          parentName: '', 
          parentPhone: '', 
          address: '', 
          contractId: '', 
          deposit: '', 
          initialTotal: '', 
          dueDate: '', 
          startDate: '', 
          endDate: '', 
          rules: '', 
          violationDetails: '', 
          idCardImage: null,
          tenantPassword: '',
          bookingInfo: null
        });
      },
      true
    );
  };

  const handleDeleteRoom = async (room) => {
    let confirmMsg = `คุณแน่ใจหรือไม่ที่จะลบห้องพัก ${room.id} (${room.building}) ออกจากระบบ?`;
    let isWarning = false;
    if (room.status === 'occupied') {
        confirmMsg = `คำเตือน: ห้องพัก ${room.id} (${room.building}) นี้ยังมีผู้เช่าสัญญามีผลทำงานพักอยู่ (${room.tenant}) การลบห้องพักจะทำให้ข้อมูลผู้เช่า สัญญา และรหัสผ่านทั้งหมดสูญหายอย่างถาวร! คุณแน่ใจหรือไม่ที่จะลบ?`;
        isWarning = true;
    } else if (room.status === 'reserved' || room.status === 'pending_review') {
        confirmMsg = `คำเตือน: ห้องพัก ${room.id} (${room.building}) นี้มีข้อมูลผู้จองหรือรอตรวจสอบใบเสร็จอยู่ การลบจะทำให้ข้อมูลการจองทั้งหมดสูญหาย! คุณแน่ใจหรือไม่ที่จะลบ?`;
        isWarning = true;
    }

    triggerConfirm(
        "ยืนยันการลบห้องพัก",
        confirmMsg,
        async () => {
            try {
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', `${room.building}-${room.id}`));
            } catch (err) {
                handleFirestoreError(err, OperationType.DELETE, `rooms/${room.building}-${room.id}`);
            }
        },
        isWarning
    );
  };

  const handleDeleteBuilding = async (buildingName) => {
    const bldRooms = rooms.filter(r => r.building === buildingName);
    const hasActive = bldRooms.some(r => r.status !== 'available');
    
    let confirmMsg = `คุณแน่ใจหรือไม่ที่จะลบอาคาร ${buildingName} และห้องพักทั้งหมดในตึกนี้ออกจากระบบ?`;
    let isWarning = false;
    if (hasActive) {
        confirmMsg = `คำเตือนขั้นสูง: อาคาร ${buildingName} นี้ยังมีห้องพักที่ไม่ว่าง (มีผู้เช่าหรือผู้จองอยู่) การลบอาคารนี้จะทำให้ห้องพักและผู้เช่าทั้งหมดในตึกนี้ถูกลบอย่างถาวร! คุณแน่ใจจริงหรือไม่ที่จะดำเนินการลบตึกนี้?`;
        isWarning = true;
    }

    triggerConfirm(
        "ยืนยันการลบอาคาร",
        confirmMsg,
        async () => {
            try {
                for (const r of bldRooms) {
                    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', `${r.building}-${r.id}`));
                }
            } catch (err) {
                handleFirestoreError(err, OperationType.DELETE, `rooms/${buildingName}`);
            }
        },
        isWarning
    );
  };

  const handleAddBill = async (e) => {
    e.preventDefault();
    const room = rooms.find(r => `${r.id} (${r.building})` === newMeter.roomId);
    if (!room || room.status !== 'occupied' || !user) return;

    const elecUnits = parseFloat(newMeter.currElec) - parseFloat(newMeter.prevElec);
    let waterUnits = 0;
    if (rates.waterBillingType !== 'fixed') {
      waterUnits = parseFloat(newMeter.currWater) - parseFloat(newMeter.prevWater);
      if (waterUnits < 0) {
        alert("เลขมิเตอร์ปัจจุบันห้ามน้อยกว่าเลขมิเตอร์ครั้งก่อน (ค่าน้ำ)");
        return;
      }
    }

    if (elecUnits < 0) {
      alert("เลขมิเตอร์ปัจจุบันห้ามน้อยกว่าเลขมิเตอร์ครั้งก่อน (ค่าไฟ)");
      return;
    }

    const elecCost = elecUnits * (rates.elecRate || 0);
    const waterCost = rates.waterBillingType === 'fixed' ? (rates.waterFixedRate || 150) : (waterUnits * (rates.waterRate || 0));

    const currentYear = new Date().getFullYear();
    const yearStr = currentYear.toString().slice(-2);
    const monthStr = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const billsThisYear = bills.filter(b => new Date(b.date).getFullYear() === currentYear);
    const runningNum = (billsThisYear.length + 1).toString().padStart(3, '0');
    
    // Using YYMM(Room ID)-001 as requested (DD updated to MM to make sense, but fits the pattern)
    const customBillId = `${yearStr}${monthStr}(${room.id})-${runningNum}`;

    const newBill = {
      id: customBillId,
      roomId: room.id,
      building: room.building,
      tenantName: room.tenant,
      prevElec: parseFloat(newMeter.prevElec),
      currElec: parseFloat(newMeter.currElec),
      elecUnits,
      prevWater: rates.waterBillingType === 'fixed' ? null : parseFloat(newMeter.prevWater),
      currWater: rates.waterBillingType === 'fixed' ? null : parseFloat(newMeter.currWater),
      waterUnits: rates.waterBillingType === 'fixed' ? null : waterUnits,
      electricity: elecCost,
      water: waterCost,
      rent: room.price,
      total: room.price + elecCost + waterCost,
      date: new Date().toISOString().split('T')[0],
      status: 'unpaid'
    };

    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bills', customBillId.toString()), newBill);
    await saveRoom({ ...room, lastElec: parseFloat(newMeter.currElec), lastWater: parseFloat(newMeter.currWater) });

    setNewMeter({ roomId: '', prevElec: 0, currElec: '', prevWater: 0, currWater: '' });
    setSelectedBill(newBill);
    setIsPreviewModalOpen(true);
  };

  const handleDeleteBill = async (billId) => {
    triggerConfirm(
      "ยืนยันการลบบิล",
      "คุณแน่ใจหรือไม่ที่จะลบบิลนี้?",
      async () => {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bills', billId.toString()));
      },
      true
    );
  };

  const toggleBillStatus = async (bill) => {
    let newStatus = 'paid';
    if (bill.status === 'paid') newStatus = 'unpaid';
    else if (bill.status === 'unpaid' || bill.status === 'pending') newStatus = 'paid';

    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bills', bill.id.toString()), {
      status: newStatus
    });
  };

  const handleUploadSlip = async (bill, slipImageBase64) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bills', bill.id.toString()), {
        status: 'pending',
        slipImage: slipImageBase64
      });
      alert('แนบสลิปและส่งให้แอดมินตรวจสอบเรียบร้อยแล้ว');
    } catch (err) {
      console.error('Error uploading slip: ', err);
      alert('เกิดข้อผิดพลาดในการแนบสลิป: ' + err.message);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const expId = Date.now();
    const expense = {
      ...newExpense,
      id: expId,
      amount: parseFloat(newExpense.amount)
    };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', expId.toString()), expense);
    setNewExpense({ title: '', amount: '', category: 'General', date: new Date().toISOString().split('T')[0], note: '' });
  };

  const handleDeleteMaintenance = async (id) => {
    triggerConfirm(
      "ยืนยันการลบรายการแจ้งซ่อม",
      "คุณแน่ใจหรือไม่ที่จะลบรายการแจ้งซ่อมนี้?",
      async () => {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'maintenance', id.toString()));
      },
      true
    );
  };

  const updateMaintenanceStatus = async (item, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'maintenance', item.id.toString()), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error updating status: ", err);
      alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ: ' + (err as Error).message);
    }
  };

  const toggleMaintenanceStatus = async (item) => {
    const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
    await updateMaintenanceStatus(item, nextStatus);
  };

  const handleSaveMaintenanceNote = async (item) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'maintenance', item.id.toString()), {
        adminNote: editingMaintenanceNote.adminNote,
        cost: editingMaintenanceNote.cost ? parseFloat(editingMaintenanceNote.cost) : 0,
        updatedAt: new Date().toISOString()
      });
      setEditingMaintenanceNote({ id: null, adminNote: '', cost: '' });
      alert('บันทึกหมายเหตุการซ่อมเรียบร้อยแล้ว');
    } catch (err) {
      console.error("Error saving note: ", err);
      alert('เกิดข้อผิดพลาดในการบันทึกหมายเหตุ: ' + (err as Error).message);
    }
  };

  const handleAddMaintenance = async (e) => {
    e.preventDefault();
    const currentRoomId = (authRole === 'tenant' && loggedInRoom) ? `${loggedInRoom.id} (${loggedInRoom.building})` : newMaintenance.roomId;
    
    if (!currentRoomId || !newMaintenance.issue) {
      alert('กรุณาเลือกห้องและระบุรายละเอียดปัญหา');
      return;
    }
    
    try {
      const maintId = Date.now();
      const newItem = {
        id: maintId,
        roomId: currentRoomId,
        issue: newMaintenance.issue,
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        image: newMaintenance.image
      };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'maintenance', maintId.toString()), newItem);
      setNewMaintenance({ roomId: '', issue: '', image: null });
      alert('บันทึกแจ้งซ่อมเรียบร้อยแล้ว');
    } catch (err) {
      console.error("Error saving maintenance: ", err);
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    }
  };

  const handlePrint = () => window.print();

  const handleLogin = (role) => {
    if (role === 'admin') {
      if (passwordInput === 'admin2026') {
        setAuthRole('admin');
        setActiveTab('dashboard'); // Admin default
        setLoginError('');
      } else {
        setLoginError('รหัสผ่านไม่ถูกต้อง');
      }
    } else if (role === 'tenant') {
      const room = rooms.find(r => r.status === 'occupied' && `${r.building}${r.id}`.toLowerCase() === tenantLoginData.username.toLowerCase() && r.tenantPassword === tenantLoginData.password);
      if (room) {
        setAuthRole('tenant');
        setLoggedInRoom(room);
        setActiveTab('tenant_dashboard'); // specific for tenant
        setLoginError('');
      } else {
        setLoginError('ชื่อผู้ใช้หรือรหัสผ่านห้องพักไม่ถูกต้อง');
      }
    } else {
      setAuthRole('guest');
      setActiveTab('rooms'); // Guest default
    }
  };

  const handleLogout = () => {
    setAuthRole(null);
    setPasswordInput('');
    setTenantLoginData({ username: '', password: '' });
    setLoggedInRoom(null);
    setLoginError('');
  };

  const SidebarItem = ({ id, icon: Icon, label, badge = null }) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => {
          setActiveTab(id);
          setIsMobileMenuOpen(false);
        }}
        className={`w-full flex items-center justify-between p-3 lg:p-2.5 rounded-xl transition-all duration-150 ${
          isActive 
            ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/40' 
            : 'text-gray-300 hover:text-white hover:bg-gray-800/80 font-medium'
        }`}
      >
        <div className="flex items-center space-x-3 min-w-0">
          <div className={`p-1 rounded-lg shrink-0 ${isActive ? 'bg-white/10 text-white' : 'text-gray-400'}`}>
            <Icon size={18} className="lg:w-4 lg:h-4" />
          </div>
          <span className="text-sm font-medium tracking-normal truncate">{label}</span>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          {badge && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded-full leading-none shadow-xs">
              {badge}
            </span>
          )}
          <ChevronRight size={15} className={`lg:hidden transition-transform shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} />
        </div>
      </button>
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">ว่าง</span>;
      case 'occupied': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">มีผู้เช่า</span>;
      case 'reserved': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">จองแล้ว</span>;
      case 'pending_review': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 animate-pulse">รอตรวจสอบ</span>;
      default: return null;
    }
  };

  if (!authRole) {
    return (
      <div className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center p-0 sm:p-6 bg-gradient-to-br from-gray-100 via-gray-50 to-blue-50/30 font-sans">
        <div className="bg-white p-6 sm:p-8 md:p-10 rounded-none sm:rounded-3xl shadow-none sm:shadow-xl w-full min-h-screen min-h-[100dvh] sm:min-h-0 sm:h-auto sm:max-w-md border-0 sm:border sm:border-gray-100 flex flex-col justify-center overflow-y-auto">
          <div className="w-full max-w-sm mx-auto my-auto py-6 sm:py-0">
            <div className="text-center mb-6 sm:mb-8">
              {!isConfigLoaded ? (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 bg-gray-50 border-2 border-gray-100 animate-pulse text-blue-500">
                  <Building2 size={28} className="sm:w-8 sm:h-8 opacity-40 animate-pulse" />
                </div>
              ) : billConfig.logoUrl ? (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 bg-white shadow-lg shadow-blue-500/15 border-2 border-gray-100 p-1.5 overflow-hidden transition-all duration-300">
                  <img 
                    src={billConfig.logoUrl} 
                    alt={billConfig.dormName || 'Logo'} 
                    className="w-full h-full object-contain rounded-xl"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="bg-blue-600 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 text-white shadow-lg shadow-blue-500/25">
                  <Building2 size={28} className="sm:w-8 sm:h-8" />
                </div>
              )}
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {billConfig.dormName || (isConfigLoaded ? 'หอพัก' : 'กำลังโหลด...')}
              </h1>
              {billConfig.slogan && (
                <p className="text-xs sm:text-sm text-blue-600 font-semibold mt-1 italic tracking-tight">"{billConfig.slogan}"</p>
              )}
              <p className="text-xs sm:text-sm text-gray-400 mt-1">ระบบจัดการหอพักและห้องเช่า</p>
            </div>

            <div className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-gray-500 uppercase mb-1.5 sm:mb-2">สำหรับผู้ดูแลระบบ (Admin)</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="รหัสผ่าน Admin"
                    className="flex-1 min-w-0 p-2.5 sm:p-3 text-xs sm:text-sm border-2 rounded-xl bg-gray-50 focus:border-blue-500 focus:bg-white outline-none transition-colors"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin('admin')}
                  />
                  <button
                    onClick={() => handleLogin('admin')}
                    className="bg-blue-600 text-white px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm shrink-0 text-xs sm:text-sm whitespace-nowrap min-w-[72px] sm:min-w-[80px]"
                  >
                    แอดมิน
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 sm:pt-4">
                <label className="block text-[11px] sm:text-xs font-bold text-gray-500 uppercase mb-1.5 sm:mb-2">สำหรับผู้เช่า (Tenant)</label>
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Username (เช่น A101)"
                    className="w-full p-2.5 sm:p-3 text-xs sm:text-sm border-2 rounded-xl bg-gray-50 focus:border-green-500 focus:bg-white outline-none transition-colors"
                    value={tenantLoginData.username}
                    onChange={e => setTenantLoginData({...tenantLoginData, username: e.target.value})}
                    onKeyDown={e => e.key === 'Enter' && handleLogin('tenant')}
                  />
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="รหัสผ่านห้องพัก"
                      className="flex-1 min-w-0 p-2.5 sm:p-3 text-xs sm:text-sm border-2 rounded-xl bg-gray-50 focus:border-green-500 focus:bg-white outline-none transition-colors"
                      value={tenantLoginData.password}
                      onChange={e => setTenantLoginData({...tenantLoginData, password: e.target.value})}
                      onKeyDown={e => e.key === 'Enter' && handleLogin('tenant')}
                    />
                    <button
                      onClick={() => handleLogin('tenant')}
                      className="bg-green-600 text-white px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold hover:bg-green-700 active:bg-green-800 transition-colors shadow-sm shrink-0 text-xs sm:text-sm whitespace-nowrap min-w-[72px] sm:min-w-[80px]"
                    >
                      ผู้เช่า
                    </button>
                  </div>
                </div>
              </div>
              
              {loginError && <p className="text-red-500 text-[11px] sm:text-xs font-bold text-center mt-1">{loginError}</p>}

              <div className="relative py-1 sm:py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center"><span className="bg-white px-3 sm:px-4 text-[10px] sm:text-xs font-bold text-gray-400 uppercase">หรือ</span></div>
              </div>

              <button
                onClick={() => handleLogin('guest')}
                className="w-full py-2.5 sm:py-3 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 border-2 border-gray-200 hover:border-gray-300 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm leading-tight text-center"
              >
                <User size={16} className="shrink-0 text-gray-500 sm:w-4 sm:h-4" /> 
                <span className="truncate">เข้าใช้งานดูห้องพัก/จองห้อง (Guest)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between p-3.5 sm:p-4 bg-gray-900 text-white shadow-md z-30 shrink-0 print:hidden select-none border-b border-gray-800">
        <div className="flex items-center space-x-2.5 min-w-0">
          {billConfig.logoUrl ? (
            <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-xs border border-gray-700/60 shrink-0 flex items-center justify-center overflow-hidden">
              <img 
                src={billConfig.logoUrl} 
                alt="Logo" 
                className="w-full h-full object-contain rounded-lg" 
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-xs shrink-0">
              <Home size={18} />
            </div>
          )}
          <div className="min-w-0">
            <span className="text-base font-black tracking-tight text-white block leading-tight truncate">
              {billConfig.dormName || 'DormManager'}
            </span>
            {billConfig.slogan && (
              <span className="text-[10px] text-blue-300 font-medium truncate block leading-tight">
                {billConfig.slogan}
              </span>
            )}
            <span className="text-[10px] text-gray-400 font-semibold mt-0.5 block truncate">
              {authRole === 'admin' ? 'โหมดผู้ดูแลระบบ' : authRole === 'tenant' ? `ห้อง ${loggedInRoom?.id || ''}` : 'โหมดผู้เยี่ยมชม'}
            </span>
          </div>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="px-3 py-2 text-white bg-gray-800 hover:bg-gray-700 active:bg-gray-600 border border-gray-700 rounded-xl transition-colors focus:outline-hidden flex items-center gap-1.5 text-xs font-bold shadow-xs shrink-0"
          aria-label="เปิดเมนูหลัก"
        >
          <Menu size={18} />
          <span>เมนู</span>
        </button>
      </div>

      {/* Mobile Sidebar Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/75 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop static (w-64) and Mobile Full-Screen (w-full inset-0) */}
      <aside className={`
        fixed inset-0 z-50 w-full h-[100dvh] bg-gray-900 text-white flex flex-col p-4 sm:p-6 transform transition-transform duration-300 ease-in-out print:hidden
        lg:inset-y-0 lg:left-0 lg:w-64 lg:h-auto lg:p-4 lg:static lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none lg:pointer-events-auto'}
      `}>
        {/* Menu Header with Dorm Branding & Close Button on Mobile */}
        <div className="flex items-center justify-between px-1 py-2 lg:py-5 mb-2 lg:mb-4 border-b border-gray-800 lg:border-none shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            {billConfig.logoUrl ? (
              <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-white p-1 shadow-md shadow-blue-500/20 border border-gray-700/60 shrink-0 flex items-center justify-center overflow-hidden">
                <img 
                  src={billConfig.logoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-contain rounded-lg" 
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-500/20 shrink-0">
                <Home size={20} />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-base lg:text-lg font-black tracking-tight text-white block leading-tight truncate">
                {billConfig.dormName || 'DormManager'}
              </span>
              {billConfig.slogan && (
                <span className="text-[11px] text-blue-300 font-medium truncate block leading-tight mt-0.5">
                  {billConfig.slogan}
                </span>
              )}
              <span className="text-[11px] text-gray-400 font-medium lg:hidden">
                เมนูหลัก (Main Menu)
              </span>
            </div>
          </div>
          {/* Close button on mobile full screen */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 text-gray-300 hover:text-white hover:bg-gray-800 active:bg-gray-700 rounded-xl transition-colors focus:outline-hidden border border-gray-800 flex items-center gap-1.5 text-xs font-semibold shrink-0"
            aria-label="ปิดเมนู"
          >
            <X size={18} />
            <span className="hidden sm:inline">ปิด</span>
          </button>
        </div>

        {/* User Role Card on Mobile Full Screen */}
        <div className="mb-2.5 px-1 lg:hidden shrink-0">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-800/80 border border-gray-700/60 text-xs">
            <div className="flex items-center gap-2 text-gray-200 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <div className="min-w-0">
                <span className="font-bold text-xs text-white block leading-tight truncate">
                  {authRole === 'admin' 
                    ? 'ผู้ดูแลระบบ (Admin)' 
                    : authRole === 'tenant' 
                      ? `ผู้เช่าห้องพัก ${loggedInRoom ? `(ห้อง ${loggedInRoom.id})` : ''}` 
                      : 'ผู้เยี่ยมชม (Guest)'}
                </span>
                <span className="text-[10px] text-gray-400">สถานะ: เข้าสู่ระบบแล้ว</span>
              </div>
            </div>
            <span className="text-[9px] uppercase font-black text-blue-400 bg-blue-950/80 border border-blue-800/60 px-2 py-0.5 rounded-md shrink-0">
              {authRole}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1 overscroll-contain py-1">
          {authRole === 'admin' && <SidebarItem id="dashboard" icon={LayoutDashboard} label="ภาพรวม" />}
          {(authRole === 'admin' || authRole === 'guest') && <SidebarItem id="rooms" icon={Building2} label="ผังตึกและห้องพัก" />}
          {authRole === 'admin' && (
            <>
              <SidebarItem id="contracts" icon={FileText} label="ทะเบียนสัญญาเช่า" />
              <SidebarItem id="billing" icon={Zap} label="คำนวณค่าเช่า/มิเตอร์" />
              <SidebarItem id="billDesign" icon={Settings} label="ตั้งค่าใบแจ้งหนี้" />
              <SidebarItem id="expenses" icon={Wallet} label="รายจ่ายหอพัก" />
              <SidebarItem 
                id="maintenance" 
                icon={Wrench} 
                label="จัดการแจ้งซ่อม/ปัญหา" 
                badge={maintenance.filter(m => m.status === 'pending').length > 0 ? maintenance.filter(m => m.status === 'pending').length : null} 
              />
              <SidebarItem 
                id="announcements" 
                icon={Megaphone} 
                label="แจ้งข่าว/ประกาศ" 
                badge={activeAnnouncements.length > 0 ? activeAnnouncements.length : null} 
              />
            </>
          )}
          {authRole === 'tenant' && (
             <>
               <SidebarItem id="tenant_dashboard" icon={User} label="ข้อมูลห้องพักของฉัน" badge={tenantUnpaidBills.length > 0 ? 'แจ้งเตือน' : null} />
               <SidebarItem 
                 id="tenant_announcements" 
                 icon={Megaphone} 
                 label="ข่าวสาร/ประกาศ" 
                 badge={activeAnnouncements.length > 0 ? activeAnnouncements.length : null} 
               />
               <SidebarItem id="tenant_bills" icon={FileText} label="บิลค่าเช่า/มิเตอร์" badge={tenantUnpaidBills.length > 0 ? tenantUnpaidBills.length : null} />
               <SidebarItem id="tenant_maintenance" icon={Wrench} label="แจ้งซ่อม" />
             </>
          )}
        </nav>

        {/* Dorm Information Widget */}
        <div className="mt-2.5 mb-2.5 p-3 rounded-xl bg-gray-800/60 border border-gray-800 space-y-2 shrink-0">
          <div className="flex items-center gap-2.5">
            {billConfig.logoUrl ? (
              <img src={billConfig.logoUrl} className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shadow-xs border border-gray-700/50 shrink-0" alt="Logo" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 border border-gray-700 shrink-0"><Home size={16} /></div>
            )}
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-gray-200 truncate uppercase tracking-tight leading-tight">{billConfig.dormName}</h4>
              {billConfig.slogan && (
                <p className="text-[10px] text-blue-300 font-medium truncate mt-0.5 italic">"{billConfig.slogan}"</p>
              )}
              <p className="text-[9px] font-bold text-gray-400 mt-0.5 flex items-center gap-1 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ข้อมูลหอพัก
              </p>
            </div>
          </div>
          
          <div className="space-y-1 text-[11px] text-gray-400 font-medium border-t border-gray-800 pt-1.5 leading-relaxed">
            <div className="flex gap-1.5">
              <span className="text-gray-500 shrink-0">ที่อยู่:</span>
              <span className="line-clamp-2 text-gray-300">{billConfig.address}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 shrink-0">โทร:</span>
              <a href={`tel:${billConfig.phone}`} className="text-blue-400 hover:underline hover:text-blue-300 transition-colors">{billConfig.phone}</a>
            </div>
          </div>
        </div>

        {/* Logout & Footer */}
        <div className="pt-2 border-t border-gray-800 text-center shrink-0">
            <button 
              onClick={() => {
                handleLogout();
                setIsMobileMenuOpen(false);
              }} 
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 mb-1.5 rounded-xl text-red-400 bg-red-500/10 hover:bg-red-500 hover:text-white transition-colors font-bold text-xs"
            >
              <LogOut size={16} /> <span>ออกจากระบบ</span>
            </button>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold">
              {authRole === 'admin' ? 'Admin Mode' : authRole === 'tenant' ? 'Tenant Mode' : 'Guest Mode (Booking Only)'}
            </p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-3.5 sm:p-4 md:p-8 relative print:p-0 print:bg-white">
        
        {/* Full Image Modal */}
        {expandedImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setExpandedImage(null)}>
            <button className="absolute top-4 right-4 text-white hover:text-gray-300 z-[110]" onClick={() => setExpandedImage(null)}>
              <X size={32} />
            </button>
            <img src={expandedImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" alt="Expanded Room" />
          </div>
        )}
        {isBookingModalOpen && selectedRoom && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative max-h-[95vh] overflow-y-auto">
                    <button onClick={() => setIsBookingModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"><X /></button>
                    <div className="text-center mb-5">
                        <h2 className="text-xl md:text-2xl font-black text-gray-900">จองห้องพัก {selectedRoom.id}</h2>
                        <p className="text-xs font-bold text-gray-700 mt-0.5">{billConfig.dormName}</p>
                        {billConfig.slogan && (
                          <p className="text-[11px] text-blue-600 font-semibold italic mt-0.5">"{billConfig.slogan}"</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">กรุณาโอนเงินมัดจำและอัปโหลดหลักฐานเพื่อจองห้อง</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                        {/* QR Code and Payment Bank Account Information */}
                        <div className="bg-blue-50/50 p-5 rounded-2xl flex flex-col items-center justify-center border border-blue-100 text-center">
                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">QR Code สำหรับชำระเงิน</span>
                            {billConfig.qrCodeUrl && (
                                <img src={billConfig.qrCodeUrl} className="w-28 h-28 md:w-32 md:h-32 mb-3 rounded-xl shadow-xs border bg-white p-1" alt="QR Payment" />
                            )}
                            <p className="font-extrabold text-sm text-blue-700 leading-tight">{billConfig.bankName}</p>
                            <p className="text-xs text-blue-600 font-black mt-1 leading-none">{billConfig.accountNumber}</p>
                            <p className="text-[10px] text-blue-500 leading-tight mt-1 mb-1 max-w-[170px] font-medium">{billConfig.accountName}</p>
                        </div>

                        {/* Booking Form Core inputs */}
                        <form onSubmit={handleRoomBooking} className="space-y-3.5 flex flex-col justify-between">
                            <div className="space-y-3.5">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">ชื่อผู้จอง</label>
                                    <input 
                                        type="text" 
                                        required 
                                        className="w-full p-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50/50 focus:ring-1 focus:ring-blue-500 focus:outline-hidden" 
                                        value={bookingForm.name} 
                                        onChange={e => setBookingForm({...bookingForm, name: e.target.value})} 
                                    />
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">เบอร์ติดต่อ</label>
                                    <input 
                                        type="tel" 
                                        required 
                                        className="w-full p-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50/50 focus:ring-1 focus:ring-blue-500 focus:outline-hidden" 
                                        value={bookingForm.phone} 
                                        onChange={e => setBookingForm({...bookingForm, phone: e.target.value})} 
                                    />
                                </div>
                                
                                <div className="relative group border border-dashed border-gray-300 rounded-xl p-2.5 bg-gray-50 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition-all">
                                    {bookingForm.slipImage ? (
                                        <div className="flex flex-col items-center justify-center">
                                            <img src={bookingForm.slipImage} className="w-full h-20 object-contain rounded-lg mb-1" alt="Slip" />
                                            <span className="text-[11px] font-bold text-green-600 flex items-center gap-1 justify-center">✔ แนบหลักฐานเรียบร้อย</span>
                                        </div>
                                    ) : (
                                        <div className="py-2.5 text-gray-400 flex flex-col items-center">
                                            <Upload size={20} className="mb-1 text-gray-400" />
                                            <span className="text-[11px] font-bold text-gray-500">อัปโหลดสลิปเงินมัดจำ</span>
                                        </div>
                                    )}
                                    <input type="file" required accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'slip')} />
                                </div>
                            </div>

                            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-md transition-all mt-1">
                                ส่งข้อมูลการจอง
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        )}

        {isReviewBookingModalOpen && selectedRoom && selectedRoom.bookingInfo && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black flex items-center gap-2"><BadgeCheck className="text-orange-500" /> ตรวจสอบการจอง</h2>
                        <button onClick={() => setIsReviewBookingModalOpen(false)}><X /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-4">
                            <div><p className="text-[10px] font-black text-gray-400 uppercase">ห้องที่จอง</p><p className="text-xl font-bold">ห้อง {selectedRoom.id} (ตึก {selectedRoom.building})</p></div>
                            <div><p className="text-[10px] font-black text-gray-400 uppercase">ชื่อผู้จอง</p><p className="text-xl font-bold">{selectedRoom.bookingInfo.name}</p></div>
                            <div><p className="text-[10px] font-black text-gray-400 uppercase">เบอร์ติดต่อ</p><p className="text-xl font-bold">{selectedRoom.bookingInfo.phone}</p></div>
                            <div><p className="text-[10px] font-black text-gray-400 uppercase">วันเวลาที่จอง</p><p className="text-sm font-bold text-gray-600">{new Date(selectedRoom.bookingInfo.timestamp).toLocaleString('th-TH')}</p></div>
                        </div>
                        <div className="space-y-2">
                             <p className="text-[10px] font-black text-gray-400 uppercase">หลักฐานการโอนเงิน (Slip)</p>
                             <div className="border-4 border-gray-100 rounded-3xl overflow-hidden shadow-inner">
                                <img src={selectedRoom.bookingInfo.slipImage} className="w-full h-auto cursor-zoom-in" alt="Slip review" />
                             </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={handleConfirmBooking} className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2">
                            <CheckCircle size={20} /> ยืนยันการจอง (Confirm)
                        </button>
                        <button onClick={handleRejectBooking} className="flex-1 py-4 bg-red-50 text-red-600 border-2 border-red-100 rounded-2xl font-black hover:bg-red-100 transition-all flex items-center justify-center gap-2">
                            <Trash2 size={20} /> ปฏิเสธการจอง
                        </button>
                    </div>
                </div>
            </div>
        )}

        {isPreviewModalOpen && selectedBill && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm print:relative print:bg-white print:inset-0 print:p-0 print:block">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[94vh] sm:max-h-[92vh] overflow-hidden print:shadow-none print:max-w-none print:w-full print:max-h-none print:rounded-none">
              
              {/* Sticky Header with Actions & Scale Controls */}
              <div className="bg-gray-50 border-b px-3 sm:px-6 py-2.5 sm:py-3.5 flex flex-wrap justify-between items-center gap-2 shrink-0 print:hidden z-20">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                    <Eye size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-sm sm:text-base text-gray-900 block leading-tight">ตัวอย่างใบแจ้งหนี้</span>
                    <span className="text-[10px] text-gray-500 font-medium">ห้อง {selectedBill.roomId} ({selectedBill.building})</span>
                  </div>
                </div>

                {/* Preview Scale Selector for Current Device Preview */}
                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-0.5 sm:p-1 shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-400 px-1 hidden md:inline">ย่อมุมมอง:</span>
                  <button 
                    type="button"
                    onClick={() => setInvoiceZoom(75)} 
                    className={`px-2 py-1 text-xs rounded-lg font-bold transition-all ${invoiceZoom === 75 ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'}`}
                    title="ย่อ 75% ให้พอดีจอเล็ก"
                  >
                    75%
                  </button>
                  <button 
                    type="button"
                    onClick={() => setInvoiceZoom(85)} 
                    className={`px-2 py-1 text-xs rounded-lg font-bold transition-all ${invoiceZoom === 85 ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'}`}
                    title="ย่อ 85% มุมมองแนะนำ"
                  >
                    85%
                  </button>
                  <button 
                    type="button"
                    onClick={() => setInvoiceZoom(100)} 
                    className={`px-2 py-1 text-xs rounded-lg font-bold transition-all ${invoiceZoom === 100 ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'}`}
                    title="ขนาดปกติ 100%"
                  >
                    100%
                  </button>
                </div>

                {/* Print and Close buttons */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button 
                    onClick={handlePrint} 
                    className="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:bg-blue-700 shadow-sm transition-all active:scale-95"
                  >
                    <Printer size={16} /> <span>พิมพ์บิล</span>
                  </button>
                  <button 
                    onClick={() => setIsPreviewModalOpen(false)} 
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1 transition-all active:scale-95"
                  >
                    <X size={16} /> <span>ปิด</span>
                  </button>
                </div>
              </div>

              {/* Scrollable Bill Content */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-6 bg-gray-100/70 print:bg-white print:p-0 print:overflow-visible">
                <div 
                  id="bill-print-area" 
                  style={{ zoom: `${invoiceZoom}%` }}
                  className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 shadow-md p-4 sm:p-8 md:p-10 mx-auto max-w-2xl print:max-w-none print:w-full print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none"
                >
                  {/* Top Dorm Info & Invoice Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 pb-4 sm:pb-6 border-b print:border-b">
                    <div className="flex gap-3 sm:gap-4 items-start w-full sm:w-auto">
                      {billConfig.logoUrl ? (
                        <img src={billConfig.logoUrl} className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl border p-1 bg-white shrink-0" alt="Dorm Logo" />
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl shrink-0">
                          {billConfig.dormName ? billConfig.dormName.charAt(0) : 'D'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base sm:text-2xl font-black text-gray-900 tracking-tight mb-0.5 uppercase break-words leading-tight">{billConfig.dormName || 'หอพัก'}</h2>
                        {billConfig.slogan && (
                          <p className="text-xs sm:text-sm font-semibold text-blue-600 mb-1 italic tracking-tight">"{billConfig.slogan}"</p>
                        )}
                        <p className="text-[11px] sm:text-xs text-gray-500 max-w-sm leading-relaxed">{billConfig.address || '-'}</p>
                        <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">โทร: {billConfig.phone || '-'} {billConfig.taxId ? `| เลขผู้เสียภาษี: ${billConfig.taxId}` : ''}</p>
                      </div>
                    </div>
                    <div className="w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end bg-blue-50/70 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none">
                      <div className="text-left sm:text-right">
                        <h3 className="text-xl sm:text-2xl font-black text-blue-600 tracking-tight leading-none">INVOICE</h3>
                        <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 font-medium">ใบแจ้งหนี้ / ใบเสร็จ</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600 sm:text-gray-500 font-medium">เลขที่บิล: <span className="font-mono font-bold text-gray-900">#{selectedBill.id}</span></p>
                        <p className="text-xs text-gray-500">วันที่: {selectedBill.date}</p>
                        <p className="text-[10px] text-gray-400">รอบบิล: {selectedBill.month}/{selectedBill.year}</p>
                      </div>
                    </div>
                  </div>

                  {/* Room & Tenant Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 mb-6 p-3.5 sm:p-5 bg-gray-50 rounded-xl sm:rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Home size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ห้องพัก</p>
                        <p className="font-black text-base text-gray-900">ห้อง {selectedBill.roomId} <span className="text-xs font-bold text-gray-500">(ตึก {selectedBill.building})</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:justify-end">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 sm:order-2">
                        <User size={18} />
                      </div>
                      <div className="sm:text-right sm:order-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ชื่อผู้เช่า</p>
                        <p className="font-black text-base text-gray-900">{selectedBill.tenantName}</p>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Item Breakdown (100% visible and optimized for small screens) */}
                  <div className="block sm:hidden space-y-2.5 mb-5 print:hidden">
                    {/* Rent */}
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-xs text-gray-800">ค่าเช่าห้องพักประจำเดือน</p>
                        <p className="text-[10px] text-gray-400">1 เดือน</p>
                      </div>
                      <p className="font-black text-sm text-gray-900">{selectedBill.rent?.toLocaleString()} ฿</p>
                    </div>

                    {/* Electricity */}
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Zap size={14} className="text-amber-500" />
                          <p className="font-bold text-xs text-gray-800">ค่าไฟฟ้า</p>
                        </div>
                        <p className="font-black text-sm text-gray-900">{selectedBill.electricity?.toLocaleString()} ฿</p>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[10px] bg-white p-2 rounded-lg border border-gray-100 text-center">
                        <div><span className="text-gray-400 block">ครั้งก่อน</span><span className="font-bold text-gray-700">{selectedBill.prevElec ?? '-'}</span></div>
                        <div><span className="text-gray-400 block">ครั้งนี้</span><span className="font-bold text-gray-700">{selectedBill.currElec ?? '-'}</span></div>
                        <div><span className="text-gray-400 block">ใช้ ({rates.elecRate}บ./น.)</span><span className="font-bold text-blue-600">{selectedBill.elecUnits} หน่วย</span></div>
                      </div>
                    </div>

                    {/* Water */}
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Droplets size={14} className="text-blue-500" />
                          <p className="font-bold text-xs text-gray-800">ค่าน้ำประปา {selectedBill.waterUnits === null ? '(เหมาจ่าย)' : ''}</p>
                        </div>
                        <p className="font-black text-sm text-gray-900">{selectedBill.water?.toLocaleString()} ฿</p>
                      </div>
                      {selectedBill.waterUnits !== null ? (
                        <div className="grid grid-cols-3 gap-1 text-[10px] bg-white p-2 rounded-lg border border-gray-100 text-center">
                          <div><span className="text-gray-400 block">ครั้งก่อน</span><span className="font-bold text-gray-700">{selectedBill.prevWater ?? '-'}</span></div>
                          <div><span className="text-gray-400 block">ครั้งนี้</span><span className="font-bold text-gray-700">{selectedBill.currWater ?? '-'}</span></div>
                          <div><span className="text-gray-400 block">ใช้ ({rates.waterRate}บ./น.)</span><span className="font-bold text-blue-600">{selectedBill.waterUnits} หน่วย</span></div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-500 bg-white p-1.5 rounded-lg border border-gray-100 text-center">คิดราคาอัตราเหมาจ่ายรายเดือน</p>
                      )}
                    </div>
                  </div>

                  {/* Desktop & Print Table */}
                  <div className="hidden sm:block overflow-x-auto mb-6 print:block">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-900 bg-gray-50/50">
                          <th className="text-left py-2.5 px-3 text-xs font-black uppercase tracking-wider text-gray-800">รายการ</th>
                          <th className="text-center py-2.5 px-2 text-xs font-black uppercase tracking-wider text-gray-800">จดเลขครั้งก่อน</th>
                          <th className="text-center py-2.5 px-2 text-xs font-black uppercase tracking-wider text-gray-800">จดเลขครั้งนี้</th>
                          <th className="text-center py-2.5 px-2 text-xs font-black uppercase tracking-wider text-gray-800">จำนวนที่ใช้</th>
                          <th className="text-right py-2.5 px-2 text-xs font-black uppercase tracking-wider text-gray-800">หน่วยละ</th>
                          <th className="text-right py-2.5 px-3 text-xs font-black uppercase tracking-wider text-gray-800">จำนวนเงิน(บาท)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-xs sm:text-sm">
                        <tr>
                          <td className="py-3 px-3 font-bold text-gray-900">ค่าเช่าห้องพักประจำเดือน</td>
                          <td className="py-3 px-2 text-center text-gray-400">-</td>
                          <td className="py-3 px-2 text-center text-gray-400">-</td>
                          <td className="py-3 px-2 text-center">1</td>
                          <td className="py-3 px-2 text-right">{selectedBill.rent?.toLocaleString()}</td>
                          <td className="py-3 px-3 text-right font-bold text-gray-900">{selectedBill.rent?.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-3 font-bold text-gray-900">ค่าไฟฟ้า</td>
                          <td className="py-3 px-2 text-center text-gray-600">{selectedBill.prevElec ?? '-'}</td>
                          <td className="py-3 px-2 text-center text-gray-600">{selectedBill.currElec ?? '-'}</td>
                          <td className="py-3 px-2 text-center font-semibold text-blue-600">{selectedBill.elecUnits}</td>
                          <td className="py-3 px-2 text-right text-gray-600">{rates.elecRate}</td>
                          <td className="py-3 px-3 text-right font-bold text-gray-900">{selectedBill.electricity?.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-3 font-bold text-gray-900">ค่าน้ำประปา {selectedBill.waterUnits === null ? '(เหมาจ่าย)' : ''}</td>
                          <td className="py-3 px-2 text-center text-gray-600">{selectedBill.prevWater ?? '-'}</td>
                          <td className="py-3 px-2 text-center text-gray-600">{selectedBill.currWater ?? '-'}</td>
                          <td className="py-3 px-2 text-center font-semibold text-blue-600">{selectedBill.waterUnits ?? 1}</td>
                          <td className="py-3 px-2 text-right text-gray-600">{selectedBill.waterUnits === null ? selectedBill.water?.toLocaleString() : rates.waterRate}</td>
                          <td className="py-3 px-3 text-right font-bold text-gray-900">{selectedBill.water?.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Payment Details & Total */}
                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-end gap-4 sm:gap-6 mb-4 sm:mb-6">
                    <div className="flex-1 border p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row gap-4 sm:gap-5 items-center sm:items-start bg-white shadow-xs">
                      {billConfig.qrCodeUrl ? (
                        <div className="p-1.5 bg-white border rounded-xl shadow-xs shrink-0 text-center">
                          <img src={billConfig.qrCodeUrl} className="w-24 h-24 sm:w-28 sm:h-28 object-contain mx-auto" alt="QR Payment" />
                          <p className="text-[9px] font-bold text-gray-400 mt-1">สแกนชำระเงิน</p>
                        </div>
                      ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-50 border border-dashed rounded-xl flex flex-col items-center justify-center text-gray-400 shrink-0">
                          <QrCode size={28} className="opacity-40" />
                          <span className="text-[9px] mt-1">ไม่มี QR</span>
                        </div>
                      )}
                      <div className="text-xs text-center sm:text-left flex-1 min-w-0">
                        <p className="font-bold text-gray-400 uppercase text-[9px] tracking-wider mb-1">ช่องทางชำระเงิน (Payment)</p>
                        <p className="font-bold text-blue-600 text-sm">{billConfig.bankName || 'ธนาคาร'}</p>
                        <p className="font-black text-lg sm:text-xl text-gray-900 tracking-tight my-0.5 select-all">{billConfig.accountNumber || '-'}</p>
                        <p className="text-xs text-gray-600 truncate">{billConfig.accountName || '-'}</p>
                        <p className="text-[10px] text-gray-400 mt-1.5">กรุณาแจ้งชำระและแนบหลักฐานการโอนเงิน</p>
                      </div>
                    </div>

                    <div className="w-full sm:w-60 md:w-64 bg-gray-900 text-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg shrink-0 flex flex-col items-center justify-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">ยอดรวมสุทธิ (Total)</p>
                      <p className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">{selectedBill.total.toLocaleString()} ฿</p>
                      <p className="text-[10px] text-gray-400 mt-1">รวมค่าเช่าและค่าสาธารณูปโภค</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Quick Action Footer */}
              <div className="p-3 bg-gray-50 border-t flex sm:hidden gap-2 shrink-0 print:hidden z-20">
                <button 
                  onClick={handlePrint} 
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Printer size={16} /> พิมพ์บิล
                </button>
                <button 
                  onClick={() => setIsPreviewModalOpen(false)} 
                  className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-95"
                >
                  <X size={16} /> ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}

        {isContractPreviewOpen && selectedContractRoom && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm print:relative print:bg-white print:inset-0 print:p-0 print:block">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[94vh] sm:max-h-[92vh] overflow-hidden print:shadow-none print:max-w-none print:w-full print:max-h-none print:rounded-none">
              <div className="bg-gray-50 p-3 sm:p-4 border-b flex justify-between items-center print:hidden shrink-0 z-20">
                <div className="flex items-center gap-2 text-gray-700 text-xs sm:text-sm font-bold truncate">
                  <FileSearch size={18} className="text-blue-600 shrink-0" />
                  <span className="truncate">รายละเอียดสัญญาเช่า: ห้อง {selectedContractRoom.id}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={handlePrint} className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:bg-blue-700 active:scale-95 transition-all">
                    <Printer size={16} /> พิมพ์สัญญา
                  </button>
                  <button onClick={() => setIsContractPreviewOpen(false)} className="bg-gray-200 text-gray-700 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold active:scale-95 transition-all">
                    ปิด
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-8 md:p-10 overflow-y-auto flex-1 print:p-0 text-xs sm:text-sm leading-relaxed" id="contract-print-area">
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl font-black mb-1">หนังสือสัญญาเช่าที่พักอาศัย</h2>
                  <p className="font-bold text-sm sm:text-base text-gray-900">{billConfig.dormName}</p>
                  {billConfig.slogan && (
                    <p className="text-xs font-semibold text-blue-600 italic mt-0.5">"{billConfig.slogan}"</p>
                  )}
                  <p className="text-[10px] text-gray-500 mt-1">เลขที่สัญญา: {selectedContractRoom.contractId || '-'}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-10 mb-6 sm:mb-8 border-b pb-6 sm:pb-8 print:grid-cols-2 print:gap-10">
                  <div>
                    <h3 className="font-black text-blue-600 uppercase text-[10px] mb-2 tracking-widest">ข้อมูลผู้เช่า</h3>
                    <p><span className="font-bold">ชื่อ-นามสกุล:</span> {selectedContractRoom.tenant}</p>
                    <p><span className="font-bold">เลขบัตรประชาชน:</span> {selectedContractRoom.idCard}</p>
                    <p><span className="font-bold">เบอร์โทรศัพท์:</span> {selectedContractRoom.phone}</p>
                    <p><span className="font-bold">ที่อยู่ติดต่อ:</span> {selectedContractRoom.address}</p>
                  </div>
                  <div>
                    <h3 className="font-black text-blue-600 uppercase text-[10px] mb-2 tracking-widest">ข้อมูลห้องพัก</h3>
                    <p><span className="font-bold">อาคาร:</span> {selectedContractRoom.building} <span className="ml-4 font-bold">ห้องเลขที่:</span> {selectedContractRoom.id}</p>
                    <p><span className="font-bold">ประเภทห้อง:</span> {selectedContractRoom.type === 'Air' ? 'ห้องปรับอากาศ' : 'ห้องพัดลม'}</p>
                    <p><span className="font-bold">อัตราค่าเช่า:</span> {selectedContractRoom.price?.toLocaleString()} บาท/เดือน</p>
                    <p><span className="font-bold">วันที่เริ่มสัญญา:</span> {selectedContractRoom.startDate}</p>
                  </div>
                </div>

                <div className="space-y-6 mb-10">
                  <div>
                    <h3 className="font-black text-gray-900 mb-2">ข้อตกลงและเงื่อนไขการเช่า (กฎระเบียบหอพัก)</h3>
                    <div className="bg-gray-50 p-4 sm:p-5 rounded-xl whitespace-pre-line text-xs text-gray-800 leading-relaxed border border-gray-200">
                      {selectedContractRoom.rules || DEFAULT_DORM_RULES}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-black text-red-600 mb-2">บทลงโทษและการระงับสัญญา (กรณีฝ่าฝืน)</h3>
                    <div className="bg-red-50 p-4 sm:p-5 rounded-xl whitespace-pre-line text-xs text-red-950 leading-relaxed border border-red-200">
                      {selectedContractRoom.violationDetails || DEFAULT_DORM_VIOLATIONS}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10 text-center mt-10 sm:mt-20 print:grid-cols-2 print:mt-16">
                  <div>
                    <div className="w-48 border-b border-black mx-auto mb-2"></div>
                    <p className="font-bold text-xs">(........................................................)</p>
                    <p className="text-xs">ลงชื่อผู้เช่า</p>
                  </div>
                  <div>
                    <div className="w-48 border-b border-black mx-auto mb-2"></div>
                    <p className="font-bold text-xs">(........................................................)</p>
                    <p className="text-xs">ลงชื่อผู้ให้เช่า</p>
                  </div>
                </div>

                {selectedContractRoom.idCardImage && (
                  <div className="mt-20 pt-10 border-t break-before-page">
                    <h3 className="font-black text-center mb-6">สำเนาบัตรประจำตัวประชาชนผู้เช่า</h3>
                    <div className="max-w-2xl mx-auto border p-4 rounded-xl shadow-sm">
                      <img src={selectedContractRoom.idCardImage} className="w-full grayscale brightness-110" alt="ID Card Copy" />
                    </div>
                    <p className="text-center mt-4 text-[10px] text-gray-400 italic">สำเนาถูกต้องเพื่อใช้ประกอบการทำสัญญาเช่าเท่านั้น</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add Batch Rooms */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl p-8 max-w-xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold flex items-center gap-2"><Plus className="text-blue-600" /> เพิ่มห้องพักรายตึก</h2><button onClick={() => setIsAddModalOpen(false)}><X className="text-gray-400" /></button></div>
              <form onSubmit={handleAddBatchRooms} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-500 mb-1">ชื่อตึก/อาคาร</label><input type="text" required placeholder="ตึก A" className="w-full p-2.5 border rounded-xl bg-gray-50" value={batchConfig.building} onChange={e => setBatchConfig({...batchConfig, building: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-500 mb-1">ห้องต่อชั้น</label><input type="number" className="w-full p-2.5 border rounded-xl bg-gray-50" value={batchConfig.roomsPerFloor} onChange={e => setBatchConfig({...batchConfig, roomsPerFloor: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-500 mb-1">เริ่มชั้น</label><input type="number" className="w-full p-2.5 border rounded-xl bg-gray-50" value={batchConfig.startFloor} onChange={e => setBatchConfig({...batchConfig, startFloor: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-500 mb-1">ถึงชั้น</label><input type="number" className="w-full p-2.5 border rounded-xl bg-gray-50" value={batchConfig.endFloor} onChange={e => setBatchConfig({...batchConfig, endFloor: e.target.value})} /></div>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><ImageIcon size={12} /> รูปภาพห้องพักอ้างอิง</label>
                  <div className="relative group border-2 border-dashed rounded-2xl p-4 hover:border-blue-400 bg-gray-50 flex flex-col items-center justify-center gap-2 overflow-hidden">
                    {batchConfig.imageUrl ? <img src={batchConfig.imageUrl} className="w-full h-48 object-cover rounded-xl shadow-inner" alt="Preview Room" /> : <><Upload className="text-gray-400" size={32} /><span className="text-[10px] text-gray-500 font-bold uppercase">คลิกเพื่อเลือกไฟล์</span></>}
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'room')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-2xl border">
                    <select className="p-2.5 border rounded-xl" value={batchConfig.type} onChange={e => setBatchConfig({...batchConfig, type: e.target.value, price: e.target.value === 'Air' ? 4500 : 3500})}><option value="Fan">ห้องพัดลม</option><option value="Air">ห้องแอร์</option></select>
                    <input type="number" className="p-2.5 border rounded-xl" value={batchConfig.price} onChange={e => setBatchConfig({...batchConfig, price: e.target.value})} />
                </div>
                <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">ยืนยันการเพิ่มลง Cloud</button>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Tenant Management */}
        {isTenantModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[95vh]">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <UserPlus className="text-blue-600" /> {selectedRoom?.status === 'occupied' ? 'แก้ไขข้อมูลผู้เช่า & รหัสผ่าน' : 'จัดทำสัญญาเช่า'} - ห้อง {selectedRoom?.id} ({selectedRoom?.building})
                </h2>
                <button onClick={() => setIsTenantModalOpen(false)}><X className="text-gray-400" /></button>
              </div>
              <form onSubmit={handleUpdateTenant} className="space-y-6">
                
                {/* Section: ผู้เช่า */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <User size={14} className="text-blue-600" /> ข้อมูลผู้เช่า และเข้าสู่ระบบ
                    </h3>
                    
                    {/* Camera / AI Scan Button for Tenant ID */}
                    <div className="flex items-center gap-2">
                      <label 
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                          isScanningIdCard && scanningTarget === 'tenant'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:shadow-md active:scale-95'
                        }`}
                        title="เปิดกล้องมือถือ/เลือกรูปบัตรประชาชนผู้เช่า ให้ AI ดึงชื่อ เลขบัตร และที่อยู่ให้อัตโนมัติ"
                      >
                        {isScanningIdCard && scanningTarget === 'tenant' ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>AI กำลังอ่านบัตร...</span>
                          </>
                        ) : (
                          <>
                            <Camera size={14} />
                            <Sparkles size={12} className="text-yellow-300" />
                            <span>สแกนบัตร ปชช. ผู้เช่า (Camera AI)</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          disabled={isScanningIdCard}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              processIdCardWithAI(file, 'tenant');
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {isScanningIdCard && scanningTarget === 'tenant' && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 text-xs text-blue-800 animate-pulse">
                      <Loader2 size={18} className="animate-spin text-blue-600 shrink-0" />
                      <div className="flex-1 font-medium">{scanStatusMessage || 'กำลังอ่านข้อมูลบัตรประชาชนด้วย AI...'}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 mb-1 block">ชื่อ-นามสกุล ผู้เช่า</label>
                      <input type="text" required className="w-full p-2.5 border rounded-xl" placeholder="ชื่อ-นามสกุล ผู้เช่า" value={tenantForm.name} onChange={e => setTenantForm({...tenantForm, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 mb-1 block">เลขบัตรประชาชนผู้เช่า (13 หลัก)</label>
                      <input type="text" required className="w-full p-2.5 border rounded-xl font-mono" placeholder="เลขบัตรประชาชนผู้เช่า 13 หลัก" value={tenantForm.idCard} onChange={e => setTenantForm({...tenantForm, idCard: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 mb-1 block">เบอร์โทรศัพท์ผู้เช่า</label>
                    <input type="tel" required className="w-full p-2.5 border rounded-xl" placeholder="เบอร์โทรผู้เช่า" value={tenantForm.phone} onChange={e => setTenantForm({...tenantForm, phone: e.target.value})} />
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-2">
                     <p className="text-xs font-bold text-blue-800 mb-2">ข้อมูลสำหรับผู้เช่าเข้าสู่ระบบ:</p>
                     <p className="text-sm mb-2">Username: <span className="font-bold text-blue-600">{selectedRoom?.building}{selectedRoom?.id}</span></p>
                     <input type="text" required className="w-full p-2.5 border rounded-xl" placeholder="รหัสผ่านเข้าสู่ระบบสำหรับห้องนี้" value={tenantForm.tenantPassword || ''} onChange={e => setTenantForm({...tenantForm, tenantPassword: e.target.value})} />
                  </div>
                  
                  {/* ID Card Upload / Camera Photo Preview */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">
                        สำเนาบัตรประชาชนผู้เช่า (สำหรับแนบท้ายสัญญา)
                      </label>
                      {tenantForm.idCardImage && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            ขนาด: {getImageSizeKB(tenantForm.idCardImage)} KB
                          </span>
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle size={12} /> บีบอัดลดขนาดแล้ว
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="relative border-2 border-dashed rounded-xl p-4 bg-gray-50 flex items-center justify-center">
                      {tenantForm.idCardImage ? (
                        <div className="flex flex-col items-center gap-3 w-full">
                          <div className="relative group max-w-sm w-full bg-white p-2 rounded-xl border shadow-sm">
                            <img 
                              src={tenantForm.idCardImage} 
                              className="w-full max-h-48 object-contain rounded" 
                              alt="ID Card" 
                            />
                            <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setExpandedImage(tenantForm.idCardImage)}
                                className="px-2 py-1 bg-black/75 hover:bg-black text-white text-[11px] font-bold rounded-lg shadow-sm backdrop-blur-xs flex items-center gap-1 transition"
                                title="ดูภาพขยายเต็มจอเพื่อตรวจสอบความคมชัด"
                              >
                                <Eye size={12} /> ดูภาพเต็ม
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap justify-center text-xs">
                             <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-lg border border-green-200 flex items-center gap-1.5">
                               <CheckCircle size={14} className="text-green-600" /> 
                               ขนาด {getImageSizeKB(tenantForm.idCardImage)} KB (ลดขนาดลง ~95% ประหยัดพื้นที่ฐานข้อมูล)
                             </span>
                             {getImageSizeKB(tenantForm.idCardImage) > 250 && (
                               <button
                                 type="button"
                                 onClick={async () => {
                                   if (tenantForm.idCardImage) {
                                     const recompressed = await compressImage(tenantForm.idCardImage, 0.15, 900);
                                     setTenantForm(prev => ({ ...prev, idCardImage: recompressed }));
                                   }
                                 }}
                                 className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1"
                                 title="บีบอัดลดขนาดภาพนี้ให้เล็กลงอีก (~120 KB)"
                               >
                                 ⚡ บีบอัดลดขนาดเป็น ~120 KB
                               </button>
                             )}
                             <button 
                               type="button" 
                               onClick={() => setTenantForm({...tenantForm, idCardImage: null})} 
                               className="text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg border border-red-200 text-xs font-bold flex items-center gap-1 transition-colors"
                             >
                               <Trash2 size={13} /> ลบรูป
                             </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-400 py-3 text-center">
                          <Camera size={32} className="text-blue-500" />
                          <span className="text-xs font-bold uppercase text-gray-700">ถ่ายรูปบัตร / อัปโหลดสำเนาบัตรประชาชน</span>
                          <span className="text-[11px] text-gray-500 max-w-sm">
                            ระบบลดขนาดภาพให้อัตโนมัติเหลือเพียง ~100-200 KB (ลดลงกว่า 95%) โดยยังคงความคมชัดสูงสำหรับแนบท้ายสัญญาและพิมพ์เอกสาร
                          </span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment" 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                processIdCardWithAI(file, 'tenant');
                                e.target.value = '';
                              }
                            }} 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section: ผู้ปกครอง & ที่อยู่ */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <UserCheck size={14} className="text-emerald-600" /> ข้อมูลผู้ปกครอง & ที่อยู่
                    </h3>
                    
                    {/* Camera / AI Scan Button for Parent ID */}
                    <div className="flex items-center gap-2">
                      <label 
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                          isScanningIdCard && scanningTarget === 'parent'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md active:scale-95'
                        }`}
                        title="เปิดกล้องมือถือ/เลือกรูปบัตรประชาชนผู้ปกครอง ให้ AI ดึงชื่อ และที่อยู่ให้อัตโนมัติ"
                      >
                        {isScanningIdCard && scanningTarget === 'parent' ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>AI กำลังอ่านบัตร...</span>
                          </>
                        ) : (
                          <>
                            <Camera size={14} />
                            <Sparkles size={12} className="text-yellow-300" />
                            <span>สแกนบัตร ปชช. ผู้ปกครอง (Camera AI)</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          disabled={isScanningIdCard}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              processIdCardWithAI(file, 'parent');
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {isScanningIdCard && scanningTarget === 'parent' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-800 animate-pulse">
                      <Loader2 size={18} className="animate-spin text-emerald-600 shrink-0" />
                      <div className="flex-1 font-medium">{scanStatusMessage || 'กำลังอ่านข้อมูลบัตรประชาชนผู้ปกครองด้วย AI...'}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 mb-1 block">ชื่อผู้ปกครอง</label>
                      <input type="text" className="w-full p-2.5 border rounded-xl" placeholder="ชื่อ-นามสกุล ผู้ปกครอง" value={tenantForm.parentName} onChange={e => setTenantForm({...tenantForm, parentName: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 mb-1 block">เบอร์โทรผู้ปกครอง</label>
                      <input type="tel" className="w-full p-2.5 border rounded-xl" placeholder="เบอร์โทรผู้ปกครอง" value={tenantForm.parentPhone} onChange={e => setTenantForm({...tenantForm, parentPhone: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 mb-1 block">ที่อยู่ตามทะเบียนบ้าน / ที่อยู่ติดต่อ</label>
                    <textarea className="w-full p-2.5 border rounded-xl h-20 text-xs" placeholder="ที่อยู่ตามทะเบียนบ้าน / ที่อยู่ติดต่อ (AI จะเติมให้อัตโนมัติเมื่อสแกนบัตร)" value={tenantForm.address} onChange={e => setTenantForm({...tenantForm, address: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><CreditCard size={14} /> รายละเอียดสัญญา & การเงิน</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 mb-1 block">เลขที่สัญญา</label>
                      <input type="text" required className="w-full p-2.5 border rounded-xl font-mono text-sm" value={tenantForm.contractId} onChange={e => setTenantForm({...tenantForm, contractId: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 mb-1 block">วันกำหนดชำระรายเดือน (ทุกวันที่)</label>
                      <input type="number" min="1" max="31" className="w-full p-2.5 border rounded-xl text-sm" value={tenantForm.dueDate} onChange={e => setTenantForm({...tenantForm, dueDate: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 mb-1 block">เงินมัดจำล่วงหน้า (บาท)</label>
                      <input type="number" className="w-full p-2.5 border rounded-xl text-sm" placeholder="เงินมัดจำ..." value={tenantForm.deposit} onChange={e => setTenantForm({...tenantForm, deposit: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 mb-1 block">ยอดเงินรวมแรกเข้า (บาท)</label>
                      <input type="number" className="w-full p-2.5 border rounded-xl text-sm" placeholder="ค่าเช่า + มัดจำ..." value={tenantForm.initialTotal} onChange={e => setTenantForm({...tenantForm, initialTotal: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 mb-1 block">วันที่เริ่มสัญญา</label>
                      <input type="date" required className="w-full p-2.5 border rounded-xl text-sm" value={tenantForm.startDate} onChange={e => setTenantForm({...tenantForm, startDate: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 mb-1 block">วันสิ้นสุดสัญญา (สัญญาอย่างน้อย 1 ปี)</label>
                      <input type="date" className="w-full p-2.5 border rounded-xl text-sm" value={tenantForm.endDate} onChange={e => setTenantForm({...tenantForm, endDate: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* Section: สัญญาและกฎระเบียบเพิ่มเติม */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><ClipboardList size={14} /> ข้อตกลง เงื่อนไข และบทลงโทษเพิ่มเติม</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5 flex-wrap gap-1">
                        <label className="text-xs font-bold text-gray-700">ข้อตกลงและเงื่อนไขการเช่า (กฎระเบียบหอพัก)</label>
                        <button 
                          type="button" 
                          onClick={() => setTenantForm({...tenantForm, rules: DEFAULT_DORM_RULES})}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                          title="ดึงกฎระเบียบมาตรฐานของหอพักเข้ามาใส่ใหม่อัตโนมัติ"
                        >
                          🔄 โหลดกฎระเบียบมาตรฐาน
                        </button>
                      </div>
                      <textarea 
                        required
                        rows={11}
                        className="w-full p-3 border rounded-xl text-xs font-medium text-gray-700 bg-white shadow-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden leading-relaxed"
                        placeholder="ระบุกฎระเบียบและข้อตกลงการเช่า..."
                        value={tenantForm.rules}
                        onChange={e => setTenantForm({...tenantForm, rules: e.target.value})}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1.5 flex-wrap gap-1">
                        <label className="text-xs font-bold text-gray-700">บทลงโทษและการระงับสัญญา (กรณีฝ่าฝืน)</label>
                        <button 
                          type="button" 
                          onClick={() => setTenantForm({...tenantForm, violationDetails: DEFAULT_DORM_VIOLATIONS})}
                          className="text-[11px] font-bold text-red-600 hover:text-red-800 hover:underline bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 transition-colors"
                          title="ดึงบทลงโทษมาตรฐานเข้ามาใส่ใหม่อัตโนมัติ"
                        >
                          🔄 โหลดบทลงโทษมาตรฐาน
                        </button>
                      </div>
                      <textarea 
                        required
                        rows={6}
                        className="w-full p-3 border rounded-xl text-xs font-medium text-gray-700 bg-white shadow-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden leading-relaxed"
                        placeholder="ระบุเงื่อนไขการระงับสัญญาและบทลงโทษ..."
                        value={tenantForm.violationDetails}
                        onChange={e => setTenantForm({...tenantForm, violationDetails: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-colors">
                  {selectedRoom?.status === 'occupied' ? 'บันทึกการแก้ไขข้อมูลผู้เช่า & รหัสผ่าน' : 'บันทึกสัญญาและเข้าพัก'}
                </button>
              </form>
            </div>
          </div>
        )}

        <header className="mb-4 sm:mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 print:hidden">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-black text-gray-900 leading-tight">
              {activeTab === 'dashboard' && 'แดชบอร์ดสรุปผล (Real-time)'}
              {activeTab === 'rooms' && 'ผังห้องพักรายตึก'}
              {activeTab === 'billing' && 'คำนวณค่าเช่า/มิเตอร์'}
              {activeTab === 'billDesign' && 'ตั้งค่าใบแจ้งหนี้'}
              {activeTab === 'expenses' && 'บันทึกรายจ่ายหอพัก'}
              {activeTab === 'maintenance' && 'จัดการงานแจ้งซ่อม'}
              {activeTab === 'contracts' && 'ทะเบียนสัญญาเช่า'}
              {activeTab === 'announcements' && 'ระบบแจ้งข่าวสารและประกาศ (Announcements)'}
              {activeTab === 'tenant_announcements' && 'ข่าวสารและประกาศจากหอพัก'}
            </h1>
            {activeTab === 'announcements' && (
              <p className="text-xs text-gray-500 mt-1">กระจายข่าวสารให้ผู้เช่าทุกคนรับทราบ พร้อมระบบกำหนดวันหมดอายุอัตโนมัติ (เช่น แจ้งน้ำไม่ไหล, ไฟดับ, ซ่อมบำรุง)</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'rooms' && authRole === 'admin' && (
              <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all w-full sm:w-auto">
                <Plus size={18} /> เพิ่มตึก/ห้อง
              </button>
            )}
            {activeTab === 'announcements' && authRole === 'admin' && (
              <button 
                onClick={() => {
                  setEditingAnnouncement(null);
                  setNewAnnouncement({
                    title: '',
                    content: '',
                    category: 'water',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    isPinned: false
                  });
                  setIsAnnouncementModalOpen(true);
                }} 
                className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
              >
                <Plus size={18} /> สร้างประกาศใหม่
              </button>
            )}
          </div>
        </header>

        {/* Global Urgent/Active Announcement Broadcast Bar for Tenants & Admin */}
        {activeAnnouncements.length > 0 && activeTab !== 'announcements' && activeTab !== 'tenant_announcements' && (
          <div className="mb-5 sm:mb-6 space-y-2.5 print:hidden">
            {activeAnnouncements.slice(0, 2).map((ann: any) => {
              const badge = getAnnouncementCategoryBadge(ann.category);
              const CategoryIcon = badge.icon;
              return (
                <div 
                  key={ann.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r ${badge.lightBg} border-blue-200/80 transition-all`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-white shadow-xs border border-gray-200/80 text-blue-600 shrink-0 mt-0.5">
                      <CategoryIcon size={20} className={ann.category === 'urgent' ? 'text-rose-600 animate-pulse' : 'text-blue-600'} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider ${badge.bg}`}>
                          {badge.label}
                        </span>
                        {ann.isPinned && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            📌 ปักหมุด
                          </span>
                        )}
                        <span className="text-[11px] text-gray-500 font-medium">
                          ปิดประกาศ: <strong className="text-gray-700">{ann.endDate}</strong> (จะซ่อนอัตโนมัติเมื่อครบกำหนด)
                        </span>
                      </div>
                      <h4 className="font-black text-sm sm:text-base text-gray-900 leading-snug truncate">
                        {ann.title}
                      </h4>
                      <p className="text-xs text-gray-600 line-clamp-2 mt-0.5 leading-relaxed">
                        {ann.content}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab(authRole === 'admin' ? 'announcements' : 'tenant_announcements')}
                    className="self-end sm:self-center px-3.5 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-bold shadow-2xs hover:text-blue-600 transition shrink-0 whitespace-nowrap"
                  >
                    ดูประกาศทั้งหมด ({activeAnnouncements.length})
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {authRole === 'tenant' && tenantUnpaidBills.length > 0 && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-5 bg-red-50 border border-red-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-pulse print:hidden">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-red-500 text-white p-2.5 sm:p-3 rounded-xl shadow-md shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-extrabold text-red-900 text-base sm:text-lg">แจ้งเตือน: ถึงกำหนดชำระ / มียอดค้างชำระหอพัก</h3>
                <p className="text-xs sm:text-sm text-red-600 font-medium">
                  คุณมียอดค้างชำระค่าเช่าหรือมิเตอร์รวม <span className="underline font-bold text-red-800">{tenantUnpaidBills.length} รายการ</span> โปรดชำระเงินและแนบหลักฐานสลิปเพื่อขอตรวจสอบแจ้งชำระเงิน
                </p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('tenant_bills')} 
              className="bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl transition duration-250 shadow-md transform hover:scale-[1.01] flex items-center justify-center gap-2 shrink-0 active:scale-95 w-full md:w-auto"
            >
              <CreditCard size={16} /> ตรวจสอบบิล & แนบสลิป
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-4 sm:space-y-6 md:space-y-8 print:hidden">
            {/* Filter Bar */}
            <div className="bg-white p-3.5 sm:p-5 rounded-2xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-gray-700">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-xs sm:text-sm text-gray-900 block leading-tight">เลือกช่วงเวลาข้อมูล</span>
                    <span className="text-[10px] sm:text-xs text-gray-400">ประมวลผลสถิติแบบ Real-time</span>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <select 
                    className="flex-1 sm:flex-initial py-2 px-3 border rounded-xl bg-gray-50 text-xs sm:text-sm font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  >
                    {months.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <select 
                    className="flex-1 sm:flex-initial py-2 px-3 border rounded-xl bg-gray-50 text-xs sm:text-sm font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  >
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>พ.ศ. {y + 543}</option>)}
                  </select>
                </div>
            </div>

            {/* 4 Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
                <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1 sm:mb-2">
                    <p className="text-xs sm:text-sm text-gray-500 font-bold truncate">รายรับ (Cloud)</p>
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  </div>
                  <div>
                    <h2 className="text-base sm:text-2xl lg:text-3xl font-black text-blue-600 truncate tracking-tight">{dashboardStats.totalIncome.toLocaleString()} ฿</h2>
                    <p className="text-[10px] sm:text-xs text-orange-600 font-semibold mt-1 truncate">ค้าง: {dashboardStats.totalPending.toLocaleString()} ฿</p>
                  </div>
                </div>

                <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1 sm:mb-2">
                    <p className="text-xs sm:text-sm text-gray-500 font-bold truncate">รายจ่ายรวม</p>
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  </div>
                  <div>
                    <h2 className="text-base sm:text-2xl lg:text-3xl font-black text-red-600 truncate tracking-tight">{dashboardStats.totalExpense.toLocaleString()} ฿</h2>
                    <p className="text-[10px] sm:text-xs text-gray-400 font-semibold mt-1 truncate">รายจ่ายประจำเดือน</p>
                  </div>
                </div>

                <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1 sm:mb-2">
                    <p className="text-xs sm:text-sm text-gray-500 font-bold truncate">กำไรสุทธิ</p>
                    <span className={`w-2 h-2 rounded-full ${dashboardStats.profit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  </div>
                  <div>
                    <h2 className={`text-base sm:text-2xl lg:text-3xl font-black ${dashboardStats.profit >= 0 ? 'text-green-600' : 'text-red-800'} truncate tracking-tight`}>{dashboardStats.profit.toLocaleString()} ฿</h2>
                    <p className="text-[10px] sm:text-xs text-gray-400 font-semibold mt-1 truncate">รายรับหักรายจ่าย</p>
                  </div>
                </div>

                <div 
                  onClick={() => setActiveTab('maintenance')} 
                  className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-xs border border-gray-100 hover:border-orange-300 hover:shadow-md cursor-pointer transition-all group flex flex-col justify-between active:scale-[0.98]"
                  title="คลิกเพื่อไปที่หน้ารับและจัดการงานซ่อม"
                >
                  <div className="flex items-center justify-between mb-1 sm:mb-2">
                    <p className="text-xs sm:text-sm text-gray-500 font-bold truncate">งานซ่อมคงค้าง</p>
                    <span className="text-[9px] sm:text-[10px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded-full group-hover:bg-orange-100 transition-colors">จัดการ →</span>
                  </div>
                  <div>
                    <h2 className="text-base sm:text-2xl lg:text-3xl font-black text-orange-600 tracking-tight">{maintenance.filter(m => m.status === 'pending').length}</h2>
                    <p className="text-[10px] sm:text-xs text-gray-400 font-semibold mt-1 truncate">ทั้งหมด {maintenance.length} รายการ</p>
                  </div>
                </div>
            </div>

            {/* Building Occupancy Summary */}
             <div className="bg-white rounded-2xl sm:rounded-3xl border shadow-xs p-4 sm:p-6 md:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
                  <div>
                    <h3 className="font-black text-base sm:text-xl text-gray-900 flex items-center gap-2">
                      <Building2 className="text-blue-600" size={20} /> สรุปห้องพักรายตึก
                    </h3>
                    <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">จำนวนห้องว่างและห้องที่มีผู้เช่าพักอาศัย</p>
                  </div>
                  <span className="self-start sm:self-auto text-[11px] sm:text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                    ทั้งหมด {rooms.length} ห้อง
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 md:gap-6">
                  {[...new Set(rooms.map(r => r.building))].sort().map(bld => {
                    const bldRooms = rooms.filter(r => r.building === bld);
                    const available = bldRooms.filter(r => r.status === 'available').length;
                    const occupied = bldRooms.filter(r => r.status === 'occupied').length;
                    return (
                      <div key={bld} className="border rounded-xl sm:rounded-2xl p-3.5 sm:p-5 bg-gray-50/70 hover:bg-white flex items-center justify-between transition-all">
                        <div>
                          <h4 className="font-black text-base sm:text-lg text-gray-900">อาคาร {bld}</h4>
                          <p className="text-[11px] sm:text-xs text-gray-500 font-medium">รวม {bldRooms.length} ห้อง (เช่าอยู่ {occupied})</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase mb-0.5">ห้องว่าง</p>
                          <p className={`text-2xl sm:text-3xl font-black leading-none ${available > 0 ? 'text-green-600' : 'text-red-500'}`}>{available}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
             </div>

            {/* Monthly Accounting Chart */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border shadow-xs p-4 sm:p-6 md:p-8">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4 sm:mb-6">
                 <div>
                   <h3 className="font-black text-base sm:text-xl text-gray-900 flex items-center gap-2">
                     <TrendingUp className="text-blue-600" size={20} /> สรุปบัญชีรายเดือน
                   </h3>
                   <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">เปรียบเทียบสัดส่วนรายรับ รายจ่าย และกำไรสุทธิ</p>
                 </div>
               </div>

               <div className="relative h-44 sm:h-64 w-full flex items-end justify-around border-b px-2 sm:px-6 pt-8 pb-2">
                  {(() => {
                    const max = Math.max(dashboardStats.totalIncome, dashboardStats.totalExpense, Math.abs(dashboardStats.profit), 1000);
                    const getH = (val) => `${Math.max(8, (Math.abs(val) / max) * 100)}%`;
                    return (
                      <>
                        <div className="flex flex-col items-center gap-2 w-1/4 max-w-[80px] sm:max-w-[100px]">
                          <div className="w-full bg-blue-100 hover:bg-blue-200 transition-colors rounded-t-xl sm:rounded-t-2xl relative" style={{ height: getH(dashboardStats.totalIncome) }}>
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] sm:text-xs font-black text-blue-600 whitespace-nowrap">
                              {dashboardStats.totalIncome.toLocaleString()}
                            </span>
                          </div>
                          <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">รายรับ</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 w-1/4 max-w-[80px] sm:max-w-[100px]">
                          <div className="w-full bg-red-100 hover:bg-red-200 transition-colors rounded-t-xl sm:rounded-t-2xl relative" style={{ height: getH(dashboardStats.totalExpense) }}>
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] sm:text-xs font-black text-red-600 whitespace-nowrap">
                              {dashboardStats.totalExpense.toLocaleString()}
                            </span>
                          </div>
                          <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">รายจ่าย</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 w-1/4 max-w-[80px] sm:max-w-[100px]">
                          <div className={`w-full ${dashboardStats.profit >= 0 ? 'bg-green-100 hover:bg-green-200' : 'bg-red-200'} transition-colors rounded-t-xl sm:rounded-t-2xl relative`} style={{ height: getH(dashboardStats.profit) }}>
                            <span className={`absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] sm:text-xs font-black whitespace-nowrap ${dashboardStats.profit >= 0 ? 'text-green-600' : 'text-red-900'}`}>
                              {dashboardStats.profit.toLocaleString()}
                            </span>
                          </div>
                          <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">กำไร</span>
                        </div>
                      </>
                    );
                  })()}
               </div>

               {/* Mobile-friendly financial breakdown chips */}
               <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 text-center">
                 <div className="bg-blue-50/70 p-2 sm:p-2.5 rounded-xl border border-blue-100/80">
                   <span className="text-[9px] sm:text-xs font-bold text-blue-600 block">รายรับ</span>
                   <span className="text-xs sm:text-sm font-black text-blue-900 block truncate">{dashboardStats.totalIncome.toLocaleString()} ฿</span>
                 </div>
                 <div className="bg-red-50/70 p-2 sm:p-2.5 rounded-xl border border-red-100/80">
                   <span className="text-[9px] sm:text-xs font-bold text-red-600 block">รายจ่าย</span>
                   <span className="text-xs sm:text-sm font-black text-red-900 block truncate">{dashboardStats.totalExpense.toLocaleString()} ฿</span>
                 </div>
                 <div className={`${dashboardStats.profit >= 0 ? 'bg-green-50/70 border-green-100/80 text-green-900' : 'bg-red-50/70 border-red-100/80 text-red-900'} p-2 sm:p-2.5 rounded-xl border`}>
                   <span className={`text-[9px] sm:text-xs font-bold block ${dashboardStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>กำไรสุทธิ</span>
                   <span className="text-xs sm:text-sm font-black block truncate">{dashboardStats.profit.toLocaleString()} ฿</span>
                 </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'rooms' && (() => {
          const buildingsList = [...new Set(rooms.map(r => r.building))].sort();
          
          if (buildingsList.length === 0) {
            return (
              <div className="bg-white rounded-2xl border p-12 text-center text-gray-500 shadow-sm print:hidden">
                <Building2 size={48} className="mx-auto mb-3 text-gray-300" />
                <h3 className="text-base font-bold text-gray-700 mb-1">ยังไม่มีข้อมูลอาคารหรือห้องพัก</h3>
                <p className="text-xs text-gray-400">กดปุ่ม "เพิ่มตึก/ห้อง" ด้านบน เพื่อเริ่มสร้างห้องพักในระบบ</p>
              </div>
            );
          }

          const currentBld = buildingsList.includes(selectedBuilding) ? selectedBuilding : buildingsList[0];
          const bldRooms = rooms.filter(r => r.building === currentBld);
          
          const floorsList = Array.from(new Set<string>(bldRooms.map(r => String(r.floor))))
            .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
          
          const currentFloor = floorsList.includes(selectedFloor) ? selectedFloor : (floorsList[0] || '');
          const floorRooms = bldRooms.filter(r => String(r.floor) === currentFloor).sort((a, b) => a.id.localeCompare(b.id));

          // Quick statistics for current building & floor
          const bldTotal = bldRooms.length;
          const bldOccupied = bldRooms.filter(r => r.status === 'occupied').length;
          const bldAvailable = bldRooms.filter(r => r.status === 'available').length;
          const floorTotal = floorRooms.length;
          const floorOccupied = floorRooms.filter(r => r.status === 'occupied').length;
          const floorAvailable = floorRooms.filter(r => r.status === 'available').length;

          return (
            <div className="space-y-4 print:hidden">
              {/* Tab Navigation Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-3 sm:p-4 space-y-3 sm:space-y-4">
                
                {/* 1. Building Tabs Row */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 size={14} className="text-blue-600" /> เลือกอาคาร
                    </span>
                    <span className="text-[11px] text-gray-400 hidden sm:inline">
                      ทั้งหมด {buildingsList.length} อาคาร ({rooms.length} ห้อง)
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {buildingsList.map(bld => {
                      const count = rooms.filter(r => r.building === bld).length;
                      const isSelected = currentBld === bld;
                      return (
                        <button
                          key={bld}
                          onClick={() => {
                            setSelectedBuilding(bld);
                            const nextFloors = Array.from(new Set<string>(rooms.filter(r => r.building === bld).map(r => String(r.floor))))
                              .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
                            if (nextFloors.length > 0) {
                              setSelectedFloor(nextFloors[0]);
                            }
                          }}
                          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-600 ring-offset-1'
                              : 'bg-gray-100 hover:bg-gray-200/80 text-gray-700 border border-gray-200/60'
                          }`}
                        >
                          <Building2 size={16} className={isSelected ? 'text-white' : 'text-gray-500'} />
                          <span>อาคาร {bld}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {count} ห้อง
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Floor Tabs Row (within selected building) */}
                <div className="pt-2 sm:pt-3 border-t border-gray-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers size={14} className="text-indigo-600" /> เลือกชั้น (อาคาร {currentBld})
                    </span>
                    <span className="text-[11px] text-gray-400">
                      ชั้น {currentFloor}: {floorAvailable} ว่าง / {floorOccupied} พัก / รวม {floorTotal} ห้อง
                    </span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {floorsList.map(flr => {
                      const flrRooms = bldRooms.filter(r => String(r.floor) === flr);
                      const isSelected = currentFloor === flr;
                      const avail = flrRooms.filter(r => r.status === 'available').length;
                      return (
                        <button
                          key={flr}
                          onClick={() => setSelectedFloor(flr)}
                          className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-2 ring-indigo-600 ring-offset-1'
                              : 'bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-900 border border-indigo-100'
                          }`}
                        >
                          <Layers size={14} className={isSelected ? 'text-white' : 'text-indigo-500'} />
                          <span>ชั้น {flr}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-white/80 text-indigo-700 border border-indigo-200/60'
                          }`}>
                            {avail > 0 ? `ว่าง ${avail}` : `${flrRooms.length} ห้อง`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Selected Building & Floor Content Section */}
              <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
                {/* Header with building & floor info and actions */}
                <div className="bg-gradient-to-r from-gray-900 via-slate-900 to-gray-800 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="p-2 bg-blue-600/90 rounded-xl text-white shadow-xs shrink-0">
                      <Layers size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-extrabold text-base sm:text-lg tracking-tight">
                          อาคาร {currentBld} · ชั้น {currentFloor}
                        </h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-200">
                          {floorRooms.length} ห้องพัก
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        อาคาร {currentBld} รวม: {bldTotal} ห้อง (ว่าง {bldAvailable} ห้อง, มีผู้เช่า {bldOccupied} ห้อง)
                      </p>
                    </div>
                  </div>

                  {authRole === 'admin' && (
                    <button 
                      onClick={() => handleDeleteBuilding(currentBld)} 
                      className="px-2.5 sm:px-3 py-1.5 hover:bg-red-600/90 text-red-200 hover:text-white rounded-xl flex items-center gap-1.5 text-xs font-bold bg-white/10 border border-white/10 transition-colors ml-auto sm:ml-0"
                      title={`ลบอาคาร ${currentBld} และห้องพักทั้งหมด`}
                    >
                      <Trash2 size={14} /> <span>ลบตึก {currentBld}</span>
                    </button>
                  )}
                </div>

                {floorRooms.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <p className="text-sm">ไม่พบห้องพักในชั้นนี้</p>
                  </div>
                ) : (
                  <div>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="text-gray-500 text-[10px] uppercase border-b bg-gray-50/70">
                          <tr>
                            <th className="pb-3 pt-3 px-6">พรีวิวสภาพห้อง</th>
                            <th className="pb-3 pt-3 px-6">ห้อง / สถานะ</th>
                            <th className="pb-3 pt-3 px-6">ประเภท/ราคา</th>
                            <th className="pb-3 pt-3 px-6">ข้อมูลผู้เช่า/ผู้จอง</th>
                            <th className="pb-3 pt-3 px-6 text-right">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {floorRooms.map(room => (
                            <tr key={`${room.building}-${room.id}`} className="hover:bg-blue-50/40 transition-colors">
                              <td className="py-4 px-6">
                                <div className="flex flex-col items-center gap-2 w-28">
                                  <div className="relative group w-28 h-20 rounded-xl border border-gray-200 shadow-xs overflow-hidden bg-gray-100 shrink-0">
                                    <img 
                                      src={room.image} 
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-pointer" 
                                      alt="Room" 
                                      onClick={(e) => { e.stopPropagation(); setExpandedImage(room.image); }} 
                                      referrerPolicy="no-referrer"
                                    />
                                    {authRole === 'admin' && (
                                      <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer text-white font-bold text-[10px]">
                                        <Camera size={18} className="mb-0.5" /> เปลี่ยนรูป
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSingleRoomImageUpload(e, room.id, room.building)} />
                                      </label>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <p className="font-black text-xl text-gray-900 mb-1 leading-tight">{room.id}</p>
                                {getStatusBadge(room.status)}
                              </td>
                              <td className="py-4 px-6">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${room.type === 'Air' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                  {room.type === 'Air' ? 'แอร์' : 'พัดลม'}
                                </span>
                                <p className="mt-1 font-bold text-base text-gray-800">{room.price.toLocaleString()}฿</p>
                              </td>
                              <td className="py-4 px-6">
                                {room.status === 'occupied' ? (
                                  authRole === 'admin' ? (
                                    <div className="space-y-1.5">
                                      <div>
                                        <p className="font-bold text-blue-700 text-sm leading-tight">{room.tenant}</p>
                                        {room.phone && <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5"><Phone size={12} className="text-gray-400 shrink-0" /> {room.phone}</p>}
                                      </div>
                                      <div className="pt-1 border-t border-gray-100 flex flex-col gap-1 text-xs">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-bold text-gray-400 w-8 shrink-0">User:</span>
                                          <code className="bg-slate-100 text-slate-800 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 select-all" title="ชื่อผู้ใช้เข้าสู่ระบบ (Username)">
                                            {room.building}{room.id}
                                          </code>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-bold text-gray-400 w-8 shrink-0">Pass:</span>
                                          <code className="bg-amber-50 text-amber-900 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200 select-all flex items-center gap-1" title="รหัสผ่านเข้าสู่ระบบ (Password)">
                                            <Key size={10} className="text-amber-600 shrink-0" />
                                            {room.tenantPassword || <span className="text-gray-400 font-sans font-normal italic text-[9px]">ยังไม่ตั้งรหัส</span>}
                                          </code>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 italic text-xs">มีผู้เช่าแล้ว</span>
                                  )
                                ) : room.status === 'pending_review' || room.status === 'reserved' ? (
                                  <div>
                                    <p className="font-bold text-orange-600 text-sm">{room.bookingInfo?.name}</p>
                                    {authRole === 'admin' && <p className="text-[10px] text-gray-400">ผู้จอง: {room.bookingInfo?.phone}</p>}
                                  </div>
                                ) : (
                                  <span className="text-gray-300 italic text-xs">พร้อมให้เช่า</span>
                                )}
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex justify-end items-center gap-1.5">
                                  {authRole === 'admin' ? (
                                    <>
                                      {room.status === 'available' && (
                                        <button onClick={() => openCreateContractModal(room)} className="text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 hover:bg-blue-100 shadow-xs">ทำสัญญา</button>
                                      )}
                                      {room.status === 'pending_review' && (
                                        <button onClick={() => { setSelectedRoom(room); setIsReviewBookingModalOpen(true); }} className="text-orange-600 font-bold text-xs bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100 hover:bg-orange-100 shadow-xs flex items-center gap-1"><Search size={13} /> ตรวจสอบ</button>
                                      )}
                                      {room.status === 'reserved' && (
                                        <button onClick={() => openCreateContractModal(room)} className="text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 hover:bg-blue-100 shadow-xs flex items-center gap-1"><UserPlus size={13} /> ทำสัญญาเช่า</button>
                                      )}
                                      {room.status === 'occupied' && (
                                        <>
                                          <button 
                                            onClick={() => openEditTenantModal(room)} 
                                            className="text-blue-600 font-bold text-xs bg-blue-50 px-2.5 py-1.5 rounded-xl border border-blue-100 hover:bg-blue-100 shadow-xs flex items-center gap-1"
                                            title="แก้ไขข้อมูลผู้เช่าและรหัสผ่าน"
                                          >
                                            <Key size={12} /> รหัส/แก้
                                          </button>
                                          <button onClick={() => handleRemoveTenant(room)} className="text-red-600 font-bold text-xs bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 hover:bg-red-100 shadow-xs">แจ้งย้ายออก</button>
                                        </>
                                      )}
                                      <button onClick={() => handleDeleteRoom(room)} className="text-red-500 hover:text-red-700 p-1.5 rounded-xl hover:bg-red-50" title="ลบห้อง"><Trash2 size={18} /></button>
                                    </>
                                  ) : (
                                    <>
                                      {room.status === 'available' && (
                                        <button onClick={() => { setSelectedRoom(room); setIsBookingModalOpen(true); }} className="text-blue-600 font-bold text-xs bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 shadow-sm">จองห้องพักนี้</button>
                                      )}
                                      {room.status !== 'available' && (
                                        <span className="text-xs font-bold text-gray-400 flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-xl"><Lock size={12}/> ไม่ว่าง</span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="grid grid-cols-1 gap-3.5 p-3.5 sm:p-4 md:hidden bg-slate-50/50">
                      {floorRooms.map(room => (
                        <div key={`mobile-${room.building}-${room.id}`} className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-xs flex flex-col gap-3 text-left">
                          <div className="flex gap-3">
                            <div className="relative w-22 h-20 rounded-xl overflow-hidden border border-gray-100 shrink-0 bg-gray-50">
                              <img 
                                src={room.image} 
                                className="w-full h-full object-cover" 
                                alt="Room" 
                                onClick={(e) => { e.stopPropagation(); setExpandedImage(room.image); }} 
                                referrerPolicy="no-referrer" 
                              />
                              {authRole === 'admin' && (
                                <label className="absolute inset-0 bg-black/40 opacity-0 active:opacity-100 flex flex-col items-center justify-center text-white font-bold text-[9px] cursor-pointer">
                                  <Camera size={16} /> เปลี่ยนรูป
                                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSingleRoomImageUpload(e, room.id, room.building)} />
                                </label>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-1 pb-1">
                                <h3 className="font-black text-lg text-gray-950 leading-none">{room.id}</h3>
                                {getStatusBadge(room.status)}
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${room.type === 'Air' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                                  {room.type === 'Air' ? 'แอร์' : 'พัดลม'}
                                </span>
                                <span className="font-extrabold text-sm text-gray-900">{room.price.toLocaleString()}฿/ด</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-100 pt-2.5 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs">
                              {room.status === 'occupied' ? (
                                authRole === 'admin' ? (
                                  <div className="leading-tight space-y-1">
                                    <div>
                                      <p className="font-bold text-blue-600 text-xs">{room.tenant}</p>
                                      {room.phone && <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-0.5"><Phone size={10} className="shrink-0" /> {room.phone}</p>}
                                    </div>
                                    <div className="pt-1 border-t border-gray-100 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px]">
                                      <div className="flex items-center gap-1">
                                        <span className="text-gray-400 font-bold">User:</span>
                                        <code className="bg-slate-100 text-slate-800 font-mono px-1 py-0.5 rounded font-bold border border-slate-200 select-all" title="ชื่อผู้ใช้เข้าสู่ระบบ">
                                          {room.building}{room.id}
                                        </code>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-gray-400 font-bold">Pass:</span>
                                        <code className="bg-amber-50 text-amber-900 font-mono px-1 py-0.5 rounded font-bold border border-amber-200 flex items-center gap-1 select-all" title="รหัสผ่านเข้าสู่ระบบ">
                                          <Key size={10} className="text-amber-600 shrink-0" />
                                          {room.tenantPassword || <span className="text-gray-400 font-sans font-normal italic text-[9px]">ยังไม่ตั้งรหัส</span>}
                                        </code>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic font-medium text-xs">มีผู้เช่าแล้ว</span>
                                )
                              ) : room.status === 'pending_review' || room.status === 'reserved' ? (
                                <div className="leading-tight">
                                  <p className="font-bold text-orange-500 text-xs">{room.bookingInfo?.name}</p>
                                  {authRole === 'admin' && <p className="text-[10px] text-gray-400 font-medium">{room.bookingInfo?.phone}</p>}
                                </div>
                              ) : (
                                <span className="text-gray-300 font-bold italic text-xs">ว่างให้เช่า</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 ml-auto">
                              {authRole === 'admin' ? (
                                <>
                                  {room.status === 'available' && (
                                    <button onClick={() => openCreateContractModal(room)} className="text-blue-600 font-bold text-[11px] bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100">ทำสัญญา</button>
                                  )}
                                  {room.status === 'pending_review' && (
                                    <button onClick={() => { setSelectedRoom(room); setIsReviewBookingModalOpen(true); }} className="text-orange-600 font-bold text-[11px] bg-orange-50 px-2.5 py-1.5 rounded-lg border border-orange-100 hover:bg-orange-100 flex items-center gap-1"><Search size={12} /> ตรวจสอบ</button>
                                  )}
                                  {room.status === 'reserved' && (
                                    <button onClick={() => openCreateContractModal(room)} className="text-blue-600 font-bold text-[11px] bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 flex items-center gap-1"><UserPlus size={12} /> ทำสัญญา</button>
                                  )}
                                  {room.status === 'occupied' && (
                                    <>
                                      <button 
                                        onClick={() => openEditTenantModal(room)} 
                                        className="text-blue-600 font-bold text-[11px] bg-blue-50 px-2 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 flex items-center gap-1"
                                        title="แก้ไขข้อมูลผู้เช่าและรหัสผ่าน"
                                      >
                                        <Key size={11} /> รหัส
                                      </button>
                                      <button onClick={() => handleRemoveTenant(room)} className="text-red-500 font-bold text-[11px] bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100 hover:bg-red-150">ย้ายออก</button>
                                    </>
                                  )}
                                  <button onClick={() => handleDeleteRoom(room)} className="text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-100 shrink-0" title="ลบห้อง">
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  {room.status === 'available' && (
                                    <button onClick={() => { setSelectedRoom(room); setIsBookingModalOpen(true); }} className="text-white font-extrabold text-[11px] bg-blue-600 px-3.5 py-1.5 rounded-lg hover:bg-blue-700 shadow-xs animate-pulse">จองห้อง</button>
                                  )}
                                  {room.status !== 'available' && (
                                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100"><Lock size={11}/> ไม่ว่าง</span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          );
        })()}

        {activeTab === 'billing' && (() => {
          // Calculate filtered bills
          const buildingsList: string[] = Array.from(new Set<string>(bills.map(b => String(b.building || '')))).filter(Boolean).sort();
          
          const filteredBills = bills.filter(b => {
            const matchBuilding = billingBuildingFilter === 'all' || b.building === billingBuildingFilter;
            const matchStatus = billingStatusFilter === 'all' || b.status === billingStatusFilter;
            const q = billingSearch.trim().toLowerCase();
            const matchSearch = !q || 
              String(b.id || '').toLowerCase().includes(q) ||
              String(b.roomId || '').toLowerCase().includes(q) ||
              String(b.building || '').toLowerCase().includes(q) ||
              String(b.tenantName || '').toLowerCase().includes(q);
            return matchBuilding && matchStatus && matchSearch;
          });

          // Summary Metrics
          const totalBilledAmount = bills.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
          const paidBills = bills.filter(b => b.status === 'paid');
          const paidAmount = paidBills.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
          const pendingOrUnpaidBills = bills.filter(b => b.status !== 'paid');
          const pendingOrUnpaidAmount = pendingOrUnpaidBills.reduce((sum, b) => sum + (Number(b.total) || 0), 0);

          const selectedRoomForMeter = rooms.find(rm => `${rm.id} (${rm.building})` === newMeter.roomId);

          // Calculations for meter form preview
          const currElecNum = parseFloat(String(newMeter.currElec));
          const prevElecNum = parseFloat(String(newMeter.prevElec)) || 0;
          const elecDiff = !isNaN(currElecNum) ? Math.max(0, currElecNum - prevElecNum) : 0;
          const estimatedElecCost = elecDiff * (rates.elecRate || 0);

          const currWaterNum = parseFloat(String(newMeter.currWater));
          const prevWaterNum = parseFloat(String(newMeter.prevWater)) || 0;
          const waterDiff = !isNaN(currWaterNum) ? Math.max(0, currWaterNum - prevWaterNum) : 0;
          const estimatedWaterCost = rates.waterBillingType === 'fixed' 
            ? (rates.waterFixedRate || 150) 
            : waterDiff * (rates.waterRate || 0);

          const estimatedTotal = selectedRoomForMeter 
            ? (selectedRoomForMeter.price || 0) + estimatedElecCost + estimatedWaterCost 
            : 0;

          return (
            <div className="space-y-4 sm:space-y-6 print:hidden">
              {/* Top Configuration & Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Rates Configuration Card */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold flex items-center gap-2 text-blue-600 text-sm sm:text-base">
                        <Calculator size={18} /> อัตราค่าบริการ (Sync Cloud)
                      </h3>
                      <span className="text-[11px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg border">
                        {authRole === 'admin' ? 'แก้ไขได้' : 'ดูอย่างเดียว'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Elec Rate */}
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">
                          ไฟฟ้า (บ./หน่วย)
                        </label>
                        <div className="relative">
                          <input 
                            type="number" 
                            step="any"
                            disabled={authRole !== 'admin'} 
                            className="w-full p-2 sm:p-2.5 text-sm font-semibold border rounded-xl disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                            value={rates.elecRate || ''} 
                            onChange={e => handleUpdateRates({...rates, elecRate: parseFloat(e.target.value) || 0})} 
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">฿</span>
                        </div>
                      </div>

                      {/* Water Type */}
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">
                          ประเภทค่าน้ำ
                        </label>
                        <select 
                          disabled={authRole !== 'admin'} 
                          className="w-full p-2 sm:p-2.5 text-sm font-medium border rounded-xl disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" 
                          value={rates.waterBillingType || 'unit'} 
                          onChange={e => handleUpdateRates({...rates, waterBillingType: e.target.value})}
                        >
                          <option value="unit">ตามหน่วย (บ./น.)</option>
                          <option value="fixed">เหมาจ่าย (บ./ด.)</option>
                        </select>
                      </div>

                      {/* Water Rate */}
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 truncate">
                          {rates.waterBillingType === 'fixed' ? 'น้ำเหมา (บ./ด.)' : 'น้ำ (บ./หน่วย)'}
                        </label>
                        <div className="relative">
                          {rates.waterBillingType === 'fixed' ? (
                            <input 
                              type="number" 
                              step="any"
                              disabled={authRole !== 'admin'} 
                              className="w-full p-2 sm:p-2.5 text-sm font-semibold border rounded-xl disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                              value={rates.waterFixedRate || 150} 
                              onChange={e => handleUpdateRates({...rates, waterFixedRate: parseFloat(e.target.value) || 0})} 
                            />
                          ) : (
                            <input 
                              type="number" 
                              step="any"
                              disabled={authRole !== 'admin'} 
                              className="w-full p-2 sm:p-2.5 text-sm font-semibold border rounded-xl disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                              value={rates.waterRate || ''} 
                              onChange={e => handleUpdateRates({...rates, waterRate: parseFloat(e.target.value) || 0})} 
                            />
                          )}
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">฿</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Billing Stats Summary Card */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold flex items-center gap-2 text-gray-800 text-sm sm:text-base">
                      <Receipt size={18} className="text-emerald-600" /> สรุปยอดเรียกเก็บทั้งหมด
                    </h3>
                    <span className="text-xs font-bold text-gray-500">
                      รวม {bills.length} บิล
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {/* Total Billed */}
                    <div className="bg-gray-50 p-2 sm:p-2.5 rounded-xl border border-gray-100 text-center min-w-0">
                      <span className="text-[10px] sm:text-xs text-gray-500 block font-medium">ยอดออกบิล</span>
                      <span className="text-sm sm:text-base md:text-lg font-black text-gray-900 block truncate">
                        {totalBilledAmount.toLocaleString()} ฿
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold">{bills.length} รายการ</span>
                    </div>

                    {/* Paid */}
                    <div className="bg-emerald-50/70 p-2 sm:p-2.5 rounded-xl border border-emerald-100 text-center min-w-0">
                      <span className="text-[10px] sm:text-xs text-emerald-700 block font-medium">ชำระแล้ว</span>
                      <span className="text-sm sm:text-base md:text-lg font-black text-emerald-700 block truncate">
                        {paidAmount.toLocaleString()} ฿
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold">{paidBills.length} รายการ</span>
                    </div>

                    {/* Pending / Unpaid */}
                    <div className="bg-amber-50/70 p-2 sm:p-2.5 rounded-xl border border-amber-100 text-center min-w-0">
                      <span className="text-[10px] sm:text-xs text-amber-800 block font-medium">ค้างชำระ</span>
                      <span className="text-sm sm:text-base md:text-lg font-black text-amber-700 block truncate">
                        {pendingOrUnpaidAmount.toLocaleString()} ฿
                      </span>
                      <span className="text-[10px] text-amber-600 font-semibold">{pendingOrUnpaidBills.length} รายการ</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content: Meter Entry (Left) + Bills List (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                {/* Meter Form Entry */}
                <div className="lg:col-span-5 xl:col-span-4 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 h-fit space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2 text-orange-500 text-sm sm:text-base">
                      <Zap size={18} /> จดมิเตอร์ใหม่ลง Cloud
                    </h3>
                    <span className="text-[11px] font-semibold text-gray-400">ระบบคำนวณอัตโนมัติ</span>
                  </div>

                  {authRole === 'admin' ? (
                    <form onSubmit={handleAddBill} className="space-y-4">
                      {/* Select Room */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          เลือกห้องพักที่เข้าพัก *
                        </label>
                        <select 
                          className="w-full p-2.5 sm:p-3 border rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium" 
                          required 
                          value={newMeter.roomId} 
                          onChange={e => { 
                            const r = rooms.find(rm => `${rm.id} (${rm.building})` === e.target.value); 
                            if(r) setNewMeter({...newMeter, roomId: e.target.value, prevElec: r.lastElec, prevWater: r.lastWater});
                            else setNewMeter({...newMeter, roomId: '', prevElec: 0, prevWater: 0});
                          }}
                        >
                          <option value="">-- เลือกห้องพักที่เข้าพัก --</option>
                          {rooms.filter(r => r.status === 'occupied').map(r => (
                            <option key={`${r.building}-${r.id}`} value={`${r.id} (${r.building})`}>
                              ตึก {r.building} - ห้อง {r.id} ({r.tenant})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Selected Room Info Badge */}
                      {selectedRoomForMeter && (
                        <div className="bg-blue-50/70 border border-blue-100 p-2.5 rounded-xl text-xs space-y-1">
                          <div className="flex justify-between items-center text-blue-900 font-bold">
                            <span>ตึก {selectedRoomForMeter.building} · ห้อง {selectedRoomForMeter.id}</span>
                            <span>ค่าเช่า {selectedRoomForMeter.price.toLocaleString()} ฿/ด.</span>
                          </div>
                          <p className="text-gray-600 text-[11px]">ผู้เช่า: <span className="font-semibold text-gray-800">{selectedRoomForMeter.tenant}</span></p>
                        </div>
                      )}

                      {/* Electricity Meter Inputs */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                            <Zap size={14} className="text-amber-500" /> มิเตอร์ไฟฟ้า (หน่วย)
                          </label>
                          <span className="text-[11px] text-gray-500 font-medium">อัตรา {rates.elecRate} บ./น.</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="block text-[10px] font-bold text-gray-400 mb-1">เลขเดิม (ครั้งก่อน)</span>
                            <input 
                              type="number" 
                              readOnly 
                              className="w-full p-2 border rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold text-center" 
                              value={newMeter.prevElec} 
                            />
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-blue-600 mb-1">เลขใหม่ (ครั้งนี้) *</span>
                            <input 
                              type="number" 
                              required 
                              placeholder="กรอกเลขใหม่" 
                              className="w-full p-2 border border-blue-200 rounded-xl bg-blue-50/30 focus:bg-white text-sm font-semibold text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                              value={newMeter.currElec} 
                              onChange={e => setNewMeter({...newMeter, currElec: e.target.value})} 
                            />
                          </div>
                        </div>
                        {newMeter.currElec !== '' && !isNaN(parseFloat(String(newMeter.currElec))) && (
                          <div className="text-[11px] bg-amber-50 text-amber-800 p-2 rounded-lg flex justify-between font-medium border border-amber-100">
                            <span>ใช้ไฟ: {elecDiff} หน่วย</span>
                            <span className="font-bold">~{estimatedElecCost.toLocaleString()} ฿</span>
                          </div>
                        )}
                      </div>

                      {/* Water Meter Inputs */}
                      {rates.waterBillingType !== 'fixed' ? (
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                              <Droplets size={14} className="text-blue-500" /> มิเตอร์น้ำประปา (หน่วย)
                            </label>
                            <span className="text-[11px] text-gray-500 font-medium">อัตรา {rates.waterRate} บ./น.</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="block text-[10px] font-bold text-gray-400 mb-1">เลขเดิม (ครั้งก่อน)</span>
                              <input 
                                type="number" 
                                readOnly 
                                className="w-full p-2 border rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold text-center" 
                                value={newMeter.prevWater} 
                              />
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold text-blue-600 mb-1">เลขใหม่ (ครั้งนี้) *</span>
                              <input 
                                type="number" 
                                required 
                                placeholder="กรอกเลขใหม่" 
                                className="w-full p-2 border border-blue-200 rounded-xl bg-blue-50/30 focus:bg-white text-sm font-semibold text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                                value={newMeter.currWater} 
                                onChange={e => setNewMeter({...newMeter, currWater: e.target.value})} 
                              />
                            </div>
                          </div>
                          {newMeter.currWater !== '' && !isNaN(parseFloat(String(newMeter.currWater))) && (
                            <div className="text-[11px] bg-blue-50 text-blue-800 p-2 rounded-lg flex justify-between font-medium border border-blue-100">
                              <span>ใช้น้ำ: {waterDiff} หน่วย</span>
                              <span className="font-bold">~{estimatedWaterCost.toLocaleString()} ฿</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between text-xs text-blue-800">
                          <span className="flex items-center gap-1 font-medium"><Droplets size={14} /> ค่าน้ำประปาเหมาจ่าย:</span>
                          <span className="font-bold">{rates.waterFixedRate || 150} ฿/เดือน</span>
                        </div>
                      )}

                      {/* Estimated Grand Total Preview */}
                      {selectedRoomForMeter && (newMeter.currElec !== '' || rates.waterBillingType === 'fixed') && (
                        <div className="bg-gray-900 text-white p-3 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-gray-400 block font-medium">ประมาณการยอดบิล</span>
                            <span className="text-xs text-gray-300">ค่าเช่า + ไฟ + น้ำ</span>
                          </div>
                          <span className="text-lg font-black text-amber-400">
                            {estimatedTotal.toLocaleString()} ฿
                          </span>
                        </div>
                      )}

                      <button 
                        type="submit" 
                        className="w-full py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <FileText size={16} /> <span>ออกบิล & ดูใบแจ้งหนี้</span>
                      </button>
                    </form>
                  ) : (
                    <div className="p-6 bg-gray-50 rounded-xl border border-dashed flex flex-col items-center justify-center text-gray-400">
                      <Lock size={32} className="mb-2 opacity-50" />
                      <p className="text-xs font-bold uppercase mt-2">สงวนสิทธิ์สำหรับ Admin</p>
                    </div>
                  )}
                </div>

                {/* Bills List & Management (Right) */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-3 sm:space-y-4">
                  {/* Toolbar & Filters */}
                  <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-blue-600 shrink-0" />
                        <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                          รายการบิลค่าเช่า ({filteredBills.length})
                        </h4>
                      </div>

                      {/* Building Filter Dropdown */}
                      {buildingsList.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 font-semibold hidden sm:inline">ตึก:</span>
                          <select 
                            value={billingBuildingFilter} 
                            onChange={e => setBillingBuildingFilter(e.target.value)}
                            className="p-1.5 sm:p-2 text-xs font-bold border rounded-xl bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="all">ทุกอาคาร ({bills.length})</option>
                            {buildingsList.map(b => (
                              <option key={b} value={b}>ตึก {b}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Search & Status Filters */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="ค้นหาเลขบิล, ห้อง, หรือชื่อผู้เช่า..." 
                          value={billingSearch} 
                          onChange={e => setBillingSearch(e.target.value)} 
                          className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        />
                        {billingSearch && (
                          <button 
                            type="button" 
                            onClick={() => setBillingSearch('')} 
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Status Tabs */}
                      <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 shrink-0">
                        <button 
                          type="button"
                          onClick={() => setBillingStatusFilter('all')}
                          className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                            billingStatusFilter === 'all' 
                              ? 'bg-blue-600 text-white shadow-xs' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          ทั้งหมด ({bills.length})
                        </button>
                        <button 
                          type="button"
                          onClick={() => setBillingStatusFilter('unpaid')}
                          className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                            billingStatusFilter === 'unpaid' 
                              ? 'bg-rose-600 text-white shadow-xs' 
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          ค้างชำระ ({bills.filter(b => b.status === 'unpaid').length})
                        </button>
                        <button 
                          type="button"
                          onClick={() => setBillingStatusFilter('pending')}
                          className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                            billingStatusFilter === 'pending' 
                              ? 'bg-amber-600 text-white shadow-xs' 
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          }`}
                        >
                          รอตรวจสลิป ({bills.filter(b => b.status === 'pending').length})
                        </button>
                        <button 
                          type="button"
                          onClick={() => setBillingStatusFilter('paid')}
                          className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                            billingStatusFilter === 'paid' 
                              ? 'bg-emerald-600 text-white shadow-xs' 
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          ชำระแล้ว ({paidBills.length})
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bills Cards List */}
                  {filteredBills.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl border text-center text-gray-400 space-y-2">
                      <Receipt size={40} className="mx-auto text-gray-300" />
                      <p className="font-bold text-gray-600 text-sm">ไม่พบบิลตามเงื่อนไขที่เลือก</p>
                      <p className="text-xs text-gray-400">กรุณาเลือกเงื่อนไขอื่น หรือกดออกบิลใหม่จากแบบฟอร์มด้านซ้าย</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredBills.map(bill => (
                        <div 
                          key={bill.id} 
                          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all flex flex-col gap-3"
                        >
                          {/* Top Row: Room & Tenant on Left, Grand Total on Right */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                <FileText size={20} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-black text-sm sm:text-base text-gray-900">
                                    ห้อง {bill.roomId}
                                  </span>
                                  <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                                    ตึก {bill.building}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 truncate mt-0.5 font-medium">
                                  {bill.tenantName || 'ผู้เช่า'}
                                </p>
                                <p className="text-[10px] font-mono text-gray-400 mt-0.5 truncate">
                                  #{bill.id} · {bill.date}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right shrink-0">
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">ยอดสุทธิ</span>
                              <span className="font-black text-lg sm:text-2xl text-gray-900 tracking-tight block">
                                {bill.total?.toLocaleString()} ฿
                              </span>
                            </div>
                          </div>

                          {/* Middle Row: Usage Breakdown Chips */}
                          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-[10px] sm:text-xs bg-gray-50/90 p-2 sm:p-2.5 rounded-xl border border-gray-100">
                            <div className="text-center min-w-0">
                              <span className="text-[10px] text-gray-400 block font-medium">ค่าเช่าห้อง</span>
                              <span className="font-bold text-gray-800 truncate block">{bill.rent?.toLocaleString()} ฿</span>
                            </div>
                            <div className="text-center border-x border-gray-200/70 px-1 min-w-0">
                              <span className="text-[10px] text-gray-400 block font-medium">ไฟ ({bill.elecUnits ?? 0} น.)</span>
                              <span className="font-bold text-amber-600 truncate block">{bill.electricity?.toLocaleString()} ฿</span>
                            </div>
                            <div className="text-center min-w-0">
                              <span className="text-[10px] text-gray-400 block font-medium">น้ำ {bill.waterUnits !== null && bill.waterUnits !== undefined ? `(${bill.waterUnits} น.)` : '(เหมา)'}</span>
                              <span className="font-bold text-blue-600 truncate block">{bill.water?.toLocaleString()} ฿</span>
                            </div>
                          </div>

                          {/* Bottom Row: Status Badge on Left, Action Buttons on Right */}
                          <div className="pt-2 sm:pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                            {/* Status Toggle Button */}
                            <button 
                              type="button"
                              onClick={() => authRole === 'admin' && toggleBillStatus(bill)}
                              disabled={authRole !== 'admin'}
                              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 shrink-0 ${
                                bill.status === 'paid' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : bill.status === 'pending' 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              } ${authRole === 'admin' ? 'hover:opacity-85 cursor-pointer active:scale-95' : 'cursor-default'}`}
                              title={authRole === 'admin' ? 'คลิกเพื่อเปลี่ยนสถานะชำระเงิน' : undefined}
                            >
                              {bill.status === 'paid' && <CheckCircle size={14} className="text-emerald-600" />}
                              {bill.status === 'pending' && <Clock size={14} className="text-amber-600" />}
                              {bill.status === 'unpaid' && <AlertCircle size={14} className="text-rose-600" />}
                              <span>
                                {bill.status === 'paid' ? '✔ ชำระแล้ว' : bill.status === 'pending' ? 'รอตรวจสอบสลิป' : 'ค้างชำระ'}
                              </span>
                            </button>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
                              <button 
                                type="button"
                                onClick={() => { setSelectedBill(bill); setIsPreviewModalOpen(true); }} 
                                className="px-2.5 sm:px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors active:scale-95"
                                title="ดูตัวอย่างและพิมพ์ใบแจ้งหนี้"
                              >
                                <Eye size={15} /> <span>ดูบิล</span>
                              </button>

                              {bill.slipImage && authRole === 'admin' && (
                                <button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setExpandedImage(bill.slipImage); }} 
                                  className="px-2.5 sm:px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors active:scale-95" 
                                  title="ดูสลิปโอนเงินที่แนบมา"
                                >
                                  <ImageIcon size={15} /> <span>สลิป</span>
                                </button>
                              )}

                              {authRole === 'admin' && (
                                <button 
                                  type="button"
                                  onClick={() => handleDeleteBill(bill.id)} 
                                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors active:scale-95" 
                                  title="ลบบิลนี้"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'billDesign' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white p-8 rounded-3xl border shadow-sm grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b">
                  <div className="flex items-center gap-2">
                    <Settings className="text-blue-600" />
                    <h3 className="font-black text-xl">ข้อมูลหอพัก (Public)</h3>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                    <Check size={13} /> Cloud Real-time
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">ชื่อหอพัก</label>
                    <input 
                      type="text" 
                      disabled={authRole !== 'admin'} 
                      className="w-full p-3 border rounded-2xl disabled:bg-gray-100 bg-gray-50 font-bold text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition-all" 
                      value={billConfig.dormName} 
                      onChange={e => handleUpdateConfig({...billConfig, dormName: e.target.value})} 
                      placeholder="เช่น บจก. ดอร์ม แมเนเจอร์ หรือ หอพักแสนสุข"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-blue-600 uppercase flex items-center gap-1.5">
                        <Quote size={13} className="text-blue-600" />
                        <span>สโลแกน ของหอพัก (Slogan)</span>
                      </label>
                      <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                        แสดงทุกจุดที่มีชื่อหอพัก
                      </span>
                    </div>
                    <input 
                      type="text" 
                      disabled={authRole !== 'admin'} 
                      className="w-full p-3 border border-blue-200 rounded-2xl disabled:bg-gray-100 bg-blue-50/20 focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-gray-900" 
                      value={billConfig.slogan || ''} 
                      onChange={e => handleUpdateConfig({...billConfig, slogan: e.target.value})} 
                      placeholder="เช่น อบอุ่น ปลอดภัย สะดวกสบาย เหมือนบ้านคุณ"
                    />
                    <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                      💡 สโลแกนนี้จะปรากฏควบคู่กับชื่อหอพักในทุกจุด (หัวเว็บ, แถบเมนูด้านข้าง, บัตรข้อมูลหอพัก, หัวใบแจ้งหนี้/ใบเสร็จ, สัญญาเช่า, และแดชบอร์ด)
                    </p>
                  </div>

                  {/* Live Branding Preview Card */}
                  <div className="p-3.5 bg-gradient-to-br from-blue-50/70 to-indigo-50/50 rounded-2xl border border-blue-100 space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                      <Sparkles size={12} /> ตัวอย่างการแสดงผลชื่อ & สโลแกนหอพัก
                    </span>
                    <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs flex items-center gap-3">
                      {billConfig.logoUrl ? (
                        <div className="w-12 h-12 rounded-xl border border-gray-100 p-1 bg-white shrink-0 overflow-hidden flex items-center justify-center shadow-xs">
                          <img src={billConfig.logoUrl} className="w-full h-full object-contain rounded-lg" alt="Logo" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 shrink-0 flex items-center justify-center">
                          <Building2 size={24} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-base font-black text-gray-900 leading-tight truncate">{billConfig.dormName || 'ชื่อหอพัก'}</h4>
                        {billConfig.slogan ? (
                          <p className="text-xs font-semibold text-blue-600 italic mt-0.5 truncate">"{billConfig.slogan}"</p>
                        ) : (
                          <p className="text-xs text-gray-400 italic mt-0.5">(ยังไม่ได้ระบุสโลแกน)</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div><label className="block text-[10px] font-bold text-gray-400 uppercase">ที่อยู่</label><textarea disabled={authRole !== 'admin'} className="w-full p-3 border rounded-2xl disabled:bg-gray-100 bg-gray-50 h-24" value={billConfig.address} onChange={e => handleUpdateConfig({...billConfig, address: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase">เบอร์โทร</label><input type="text" disabled={authRole !== 'admin'} className="w-full p-3 border rounded-2xl disabled:bg-gray-100 bg-gray-50" value={billConfig.phone} onChange={e => handleUpdateConfig({...billConfig, phone: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase">เลขผู้เสียภาษี</label><input type="text" disabled={authRole !== 'admin'} className="w-full p-3 border rounded-2xl disabled:bg-gray-100 bg-gray-50" value={billConfig.taxId} onChange={e => handleUpdateConfig({...billConfig, taxId: e.target.value})} /></div>
                  </div>
                  <div className="pt-2">
                    <h4 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2"><CreditCard size={16} className="text-blue-600" /> ข้อมูลบัญชีรับโอน</h4>
                    <div className="space-y-3">
                        <input type="text" placeholder="ธนาคาร" disabled={authRole !== 'admin'} className="w-full p-3 border rounded-2xl disabled:bg-gray-100 bg-gray-50" value={billConfig.bankName} onChange={e => handleUpdateConfig({...billConfig, bankName: e.target.value})} />
                        <input type="text" placeholder="เลขที่บัญชี" disabled={authRole !== 'admin'} className="w-full p-3 border rounded-2xl disabled:bg-gray-100 bg-gray-50" value={billConfig.accountNumber} onChange={e => handleUpdateConfig({...billConfig, accountNumber: e.target.value})} />
                        <input type="text" placeholder="ชื่อบัญชี" disabled={authRole !== 'admin'} className="w-full p-3 border rounded-2xl disabled:bg-gray-100 bg-gray-50" value={billConfig.accountName} onChange={e => handleUpdateConfig({...billConfig, accountName: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b"><ImageIcon className="text-purple-600" /><h3 className="font-black text-xl">โลโก้ & QR</h3></div>
                <div className="space-y-8">
                  <div className="relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center bg-gray-50 overflow-hidden shadow-inner">
                    {billConfig.logoUrl ? <img src={billConfig.logoUrl} className="w-48 h-48 object-contain shadow-sm rounded-xl" alt="Logo" /> : <ImageIcon size={64} className="text-gray-300" />}
                    {authRole === 'admin' && <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'logo')} />}
                    <p className="mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{authRole === 'admin' ? 'คลิกเพื่อเปลี่ยนโลโก้บน Cloud' : 'โลโก้หอพัก'}</p>
                  </div>
                  <div className="relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center bg-gray-50 overflow-hidden shadow-inner">
                    {billConfig.qrCodeUrl ? <img src={billConfig.qrCodeUrl} className="w-48 h-48 object-contain shadow-sm rounded-xl" alt="QR" /> : <QrCode size={64} className="text-gray-300" />}
                    {authRole === 'admin' && <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'qr')} />}
                    <p className="mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{authRole === 'admin' ? 'คลิกเพื่ออัปโหลด QR ชำระเงิน' : 'QR Code ชำระเงิน'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (() => {
          const totalIssues = maintenance.length;
          const pendingIssues = maintenance.filter(m => m.status === 'pending').length;
          const inProgressIssues = maintenance.filter(m => m.status === 'in_progress').length;
          const completedIssues = maintenance.filter(m => m.status === 'completed').length;

          const filteredMaintenance = maintenance.filter(m => {
            const matchesStatus = maintenanceFilter === 'all' 
              ? true 
              : maintenanceFilter === 'in_progress'
                ? m.status === 'in_progress'
                : maintenanceFilter === 'pending'
                  ? (m.status === 'pending' || !m.status)
                  : m.status === 'completed';

            const query = maintenanceSearch.trim().toLowerCase();
            const matchesSearch = !query || 
              (m.issue && m.issue.toLowerCase().includes(query)) ||
              (m.roomId && m.roomId.toLowerCase().includes(query)) ||
              (m.date && m.date.includes(query)) ||
              (m.adminNote && m.adminNote.toLowerCase().includes(query));

            return matchesStatus && matchesSearch;
          });

          return (
            <div className="space-y-6 print:hidden">
              {/* Top Summary Banner & Filter Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={() => setMaintenanceFilter('all')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    maintenanceFilter === 'all' 
                      ? 'bg-blue-50 border-blue-300 shadow-sm ring-2 ring-blue-500/20' 
                      : 'bg-white hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">ทั้งหมด</p>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-black text-gray-900">{totalIssues}</span>
                    <span className="text-xs text-gray-400">รายการ</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMaintenanceFilter('pending')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    maintenanceFilter === 'pending' 
                      ? 'bg-orange-50 border-orange-300 shadow-sm ring-2 ring-orange-500/20' 
                      : 'bg-white hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">รอดำเนินการ</p>
                    {pendingIssues > 0 && <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>}
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-black text-orange-600">{pendingIssues}</span>
                    <span className="text-xs text-orange-400">รายการ</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMaintenanceFilter('in_progress')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    maintenanceFilter === 'in_progress' 
                      ? 'bg-blue-50 border-blue-300 shadow-sm ring-2 ring-blue-500/20' 
                      : 'bg-white hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">กำลังซ่อม</p>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-black text-blue-600">{inProgressIssues}</span>
                    <span className="text-xs text-blue-400">รายการ</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMaintenanceFilter('completed')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    maintenanceFilter === 'completed' 
                      ? 'bg-green-50 border-green-300 shadow-sm ring-2 ring-green-500/20' 
                      : 'bg-white hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <p className="text-xs font-bold text-green-600 uppercase tracking-wider">ซ่อมเสร็จสิ้น</p>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-black text-green-600">{completedIssues}</span>
                    <span className="text-xs text-green-400">รายการ</span>
                  </div>
                </button>
              </div>

              {/* Search & Filter Controls */}
              <div className="bg-white p-4 rounded-2xl border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาห้อง, อาการ, รายละเอียด..."
                    value={maintenanceSearch}
                    onChange={(e) => setMaintenanceSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm bg-gray-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  {maintenanceSearch && (
                    <button 
                      onClick={() => setMaintenanceSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end overflow-x-auto">
                  <span className="text-xs font-bold text-gray-400 flex items-center gap-1 shrink-0">
                    <Filter size={14} /> สถานะ:
                  </span>
                  {(['all', 'pending', 'in_progress', 'completed'] as const).map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setMaintenanceFilter(tab)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                        maintenanceFilter === tab
                          ? 'bg-gray-900 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {tab === 'all' && 'ทั้งหมด'}
                      {tab === 'pending' && `รอดำเนินการ (${pendingIssues})`}
                      {tab === 'in_progress' && `กำลังซ่อม (${inProgressIssues})`}
                      {tab === 'completed' && `เสร็จสิ้น (${completedIssues})`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form to Create/Add New Repair Job */}
                <div className="lg:col-span-1 bg-white p-6 rounded-2xl border shadow-sm h-fit space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b">
                    <h3 className="font-bold text-orange-600 flex items-center gap-2">
                      <Wrench size={18} /> รับเรื่อง / เพิ่มงานแจ้งซ่อม
                    </h3>
                    <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      {authRole === 'admin' ? 'Admin Action' : 'แจ้งซ่อม'}
                    </span>
                  </div>

                  {authRole === 'admin' ? (
                    <form onSubmit={handleAddMaintenance} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                          เลือกห้องพักที่แจ้งซ่อม <span className="text-red-500">*</span>
                        </label>
                        <select 
                          className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                          required 
                          value={newMaintenance.roomId} 
                          onChange={e => setNewMaintenance({...newMaintenance, roomId: e.target.value})}
                        >
                          <option value="">-- เลือกห้องพักที่มีผู้เช่า --</option>
                          {rooms.map(r => (
                            <option key={`${r.building}-${r.id}`} value={`${r.id} (${r.building})`}>
                              ตึก {r.building} - ห้อง {r.id} {r.status === 'occupied' ? '(มีผู้เช่า)' : `(${r.status})`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                          รายละเอียดปัญหา / อุปกรณ์ที่ชำรุด <span className="text-red-500">*</span>
                        </label>
                        <textarea 
                          required 
                          placeholder="เช่น แอร์ไม่เย็น, ก็อกน้ำรั่ว, ไฟห้องน้ำกระพริบ, ลูกบิดประตูหลวม..." 
                          className="w-full p-2.5 border rounded-xl h-24 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                          value={newMaintenance.issue} 
                          onChange={e => setNewMaintenance({...newMaintenance, issue: e.target.value})}
                        ></textarea>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                          รูปถ่ายจุดชำรุด / ปัญหา (ถ้ามี)
                        </label>
                        <div className="relative border-2 border-dashed border-gray-300 hover:border-orange-400 rounded-xl p-4 flex flex-col items-center justify-center bg-gray-50 hover:bg-orange-50/20 transition-all overflow-hidden shadow-inner group">
                          {newMaintenance.image ? (
                            <div className="relative w-full">
                              <img src={newMaintenance.image} className="w-full h-44 object-cover rounded-lg shadow-xs" alt="Issue" />
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setNewMaintenance({...newMaintenance, image: null}); }}
                                className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 text-xs"
                                title="ลบรูป"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <Upload size={28} className="text-gray-400 group-hover:text-orange-500 transition-colors mb-1" />
                              <span className="text-xs text-gray-600 font-bold">อัปโหลดภาพถ่ายปัญหา</span>
                              <span className="text-[10px] text-gray-400 mt-0.5">บีบอัดอัตโนมัติ ไม่เปลืองเนื้อที่</span>
                            </>
                          )}
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            onChange={async (e) => { 
                              const f = e.target.files?.[0]; 
                              if(f){ 
                                const compressed = await compressImage(f, 0.25, 1000); 
                                setNewMaintenance({...newMaintenance, image: compressed}); 
                              } 
                            }} 
                          />
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        className="w-full py-3 bg-orange-600 hover:bg-orange-700 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <Save size={16} /> บันทึกรับเรื่องแจ้งซ่อม
                      </button>
                    </form>
                  ) : (
                    <div className="p-6 bg-gray-50 rounded-xl border border-dashed flex flex-col items-center justify-center text-gray-400 text-center">
                      <Lock size={32} className="mb-2 opacity-50" />
                      <p className="text-xs font-bold uppercase mt-2">สงวนสิทธิ์สำหรับ Admin</p>
                      <p className="text-[11px] text-gray-500 mt-1">ผู้เช่าสามารถแจ้งซ่อมผ่านแท็บ "แจ้งซ่อม" ในเมนูส่วนตัว</p>
                    </div>
                  )}
                </div>

                {/* Maintenance Items List with Action Controls */}
                <div className="lg:col-span-2 space-y-4">
                  {filteredMaintenance.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl border text-center text-gray-400 shadow-xs">
                      <Wrench size={48} className="mx-auto mb-3 opacity-25 text-orange-500" />
                      <h4 className="font-bold text-gray-700 text-base mb-1">ไม่พบรายการแจ้งซ่อม</h4>
                      <p className="text-xs text-gray-400">
                        {maintenanceSearch 
                          ? `ไม่พบข้อมูลที่ตรงกับคำค้นหา "${maintenanceSearch}"` 
                          : maintenanceFilter !== 'all' 
                            ? `ไม่มีรายการในสถานะที่เลือก (${maintenanceFilter})` 
                            : 'ยังไม่มีประวัติการแจ้งซ่อมในระบบ'}
                      </p>
                      {(maintenanceSearch || maintenanceFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={() => { setMaintenanceSearch(''); setMaintenanceFilter('all'); }}
                          className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
                        >
                          ล้างตัวกรองทั้งหมด
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredMaintenance.map(m => {
                      const isEditingThisNote = editingMaintenanceNote.id === m.id;
                      const status = m.status || 'pending';

                      return (
                        <div key={m.id} className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col gap-4 hover:border-gray-300 transition-all">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            {/* Photo thumbnail */}
                            {m.image ? (
                              <div 
                                onClick={() => setExpandedImage(m.image)} 
                                className="w-full sm:w-44 h-32 rounded-xl overflow-hidden shadow-xs border shrink-0 relative group cursor-zoom-in bg-gray-100"
                                title="คลิกเพื่อดูรูปขยาย"
                              >
                                <img src={m.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Issue" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                  <Eye size={16} /> ดูภาพเต็ม
                                </div>
                              </div>
                            ) : (
                              <div className={`w-full sm:w-24 h-24 rounded-xl flex items-center justify-center shrink-0 ${
                                status === 'pending' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                status === 'in_progress' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                'bg-green-50 text-green-600 border border-green-100'
                              }`}>
                                <Wrench size={32} />
                              </div>
                            )}

                            {/* Details */}
                            <div className="flex-1 w-full min-w-0">
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-gray-100 text-gray-800 border">
                                  <Building2 size={13} className="text-gray-500" /> ห้อง {m.roomId}
                                </span>
                                <span className="text-[11px] text-gray-400 font-semibold flex items-center gap-1">
                                  <Calendar size={12} /> {m.date || 'ไม่ระบุวัน'}
                                </span>
                              </div>

                              <h4 className="font-black text-lg text-gray-900 leading-snug break-words">
                                {m.issue}
                              </h4>

                              {/* Admin Note / Repair Cost Display */}
                              {(m.adminNote || m.cost > 0) && (
                                <div className="mt-2.5 p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1">
                                  {m.adminNote && (
                                    <p className="text-gray-700 font-medium">
                                      <strong className="text-gray-900">บันทึกของช่าง/แอดมิน:</strong> {m.adminNote}
                                    </p>
                                  )}
                                  {m.cost > 0 && (
                                    <p className="text-orange-700 font-bold">
                                      ค่าใช้จ่ายซ่อม: {Number(m.cost).toLocaleString()} บาท
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Status Badges & Quick Switchers */}
                              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">สถานะ:</span>
                                  {authRole === 'admin' ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => updateMaintenanceStatus(m, 'pending')}
                                        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all ${
                                          status === 'pending'
                                            ? 'bg-orange-600 text-white shadow-xs'
                                            : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                                        }`}
                                      >
                                        รอดำเนินการ
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => updateMaintenanceStatus(m, 'in_progress')}
                                        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all ${
                                          status === 'in_progress'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                                        }`}
                                      >
                                        กำลังซ่อม
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => updateMaintenanceStatus(m, 'completed')}
                                        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all ${
                                          status === 'completed'
                                            ? 'bg-green-600 text-white shadow-xs'
                                            : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600'
                                        }`}
                                      >
                                        ✔ ซ่อมเสร็จสิ้น
                                      </button>
                                    </>
                                  ) : (
                                    <span className={`text-xs font-bold px-3 py-1 rounded-lg ${
                                      status === 'pending' ? 'bg-orange-100 text-orange-700' :
                                      status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                      'bg-green-100 text-green-700'
                                    }`}>
                                      {status === 'pending' ? 'รอดำเนินการ' : status === 'in_progress' ? 'กำลังซ่อม' : 'ซ่อมเสร็จสิ้นแล้ว'}
                                    </span>
                                  )}
                                </div>

                                {authRole === 'admin' && (
                                  <div className="flex items-center gap-1.5 ml-auto">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isEditingThisNote) {
                                          setEditingMaintenanceNote({ id: null, adminNote: '', cost: '' });
                                        } else {
                                          setEditingMaintenanceNote({
                                            id: m.id,
                                            adminNote: m.adminNote || '',
                                            cost: m.cost ? String(m.cost) : ''
                                          });
                                        }
                                      }}
                                      className="px-2.5 py-1 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1"
                                      title="เพิ่มหรือแก้ไขบันทึกงานซ่อม"
                                    >
                                      📝 {isEditingThisNote ? 'ปิดหมายเหตุ' : 'บันทึกช่าง/ค่าใช้จ่าย'}
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => handleDeleteMaintenance(m.id)} 
                                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                                      title="ลบรายการแจ้งซ่อม"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Inline Admin Note & Cost Editing Box */}
                          {isEditingThisNote && authRole === 'admin' && (
                            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-3 mt-1 animate-fadeIn">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                                  📝 จัดการบันทึกการซ่อม & ค่าใช้จ่าย (ห้อง {m.roomId})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingMaintenanceNote({ id: null, adminNote: '', cost: '' })}
                                  className="text-xs text-gray-400 hover:text-gray-600"
                                >
                                  ✕ ปิด
                                </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                                    บันทึกผลการซ่อม / ช่างผู้รับผิดชอบ
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="เช่น เปลี่ยนก๊อกน้ำใหม่แล้ว, นัดช่างแอร์เข้าวันพรุ่งนี้ 10:00"
                                    value={editingMaintenanceNote.adminNote}
                                    onChange={(e) => setEditingMaintenanceNote({...editingMaintenanceNote, adminNote: e.target.value})}
                                    className="w-full p-2 border rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                                    ค่าใช้จ่ายซ่อม (บาท)
                                  </label>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={editingMaintenanceNote.cost}
                                    onChange={(e) => setEditingMaintenanceNote({...editingMaintenanceNote, cost: e.target.value})}
                                    className="w-full p-2 border rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingMaintenanceNote({ id: null, adminNote: '', cost: '' })}
                                  className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-200 rounded-lg"
                                >
                                  ยกเลิก
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveMaintenanceNote(m)}
                                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                                >
                                  บันทึกข้อมูล
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'expenses' && (
          <div className="space-y-6 print:hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-white p-6 rounded-2xl border shadow-sm h-fit">
                <h3 className="font-bold mb-4 text-red-600 flex items-center gap-2"><Wallet size={18} /> บันทึกรายจ่าย Cloud</h3>
                {authRole === 'admin' ? (
                  <form onSubmit={handleAddExpense} className="space-y-4">
                    <input type="text" required placeholder="รายการรายจ่าย" className="w-full p-2.5 border rounded-xl bg-gray-50" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="number" required placeholder="จำนวนเงิน" className="p-2.5 border rounded-xl" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} />
                      <select className="p-2.5 border rounded-xl bg-gray-50" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}>
                        <option value="General">ทั่วไป</option>
                        <option value="Utilities">น้ำ/ไฟส่วนกลาง</option>
                        <option value="Maintenance">ซ่อมบำรุง</option>
                        <option value="Salary">พนักงาน</option>
                      </select>
                    </div>
                    <input type="date" required className="w-full p-2.5 border rounded-xl" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} />
                    <textarea placeholder="หมายเหตุ..." className="w-full p-2.5 border rounded-xl h-24" value={newExpense.note} onChange={e => setNewExpense({...newExpense, note: e.target.value})}></textarea>
                    <button type="submit" className="w-full py-3 bg-red-600 text-white rounded-xl font-bold shadow-md">บันทึกรายจ่าย</button>
                  </form>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl border border-dashed flex flex-col items-center justify-center text-gray-400">
                    <Lock size={32} className="mb-2 opacity-50" />
                    <p className="text-xs font-bold uppercase mt-2">สงวนสิทธิ์สำหรับ Admin</p>
                  </div>
                )}
              </div>
              <div className="lg:col-span-2 space-y-4">
                {expenses.map(exp => (
                  <div key={exp.id} className="bg-white p-5 rounded-2xl border shadow-sm flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="bg-red-50 p-4 rounded-xl"><Wallet className="text-red-500" size={24} /></div>
                        <div><p className="font-black text-xl">{exp.title}</p><p className="text-xs text-gray-500">{exp.category} • {exp.date}</p></div>
                      </div>
                      <h4 className="font-black text-2xl text-red-600">-{exp.amount.toLocaleString()} ฿</h4>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contracts' && (() => {
          const occupiedRooms = rooms.filter(r => r.status === 'occupied').filter(r => {
            const matchesSearch = !contractSearch || 
              (r.tenant && r.tenant.toLowerCase().includes(contractSearch.toLowerCase())) ||
              (r.id && r.id.toLowerCase().includes(contractSearch.toLowerCase())) ||
              (r.contractId && r.contractId.toLowerCase().includes(contractSearch.toLowerCase())) ||
              (r.phone && r.phone.includes(contractSearch));
            const matchesBld = contractBuildingFilter === 'all' || r.building === contractBuildingFilter;
            return matchesSearch && matchesBld;
          });
          const allBuildings = [...new Set(rooms.map(r => r.building))].sort();

          return (
            <div className="space-y-4 sm:space-y-6 print:hidden">
              <div className="bg-white rounded-2xl border shadow-xs overflow-hidden">
                {/* Header Banner */}
                <div className="p-3.5 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/70">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <ClipboardList size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-base sm:text-xl text-gray-900 leading-tight">ทะเบียนสัญญาเช่า (Secure Cloud)</h3>
                      <p className="text-[11px] sm:text-xs text-gray-400">สัญญาเช่าที่พักอาศัยที่มีผลบังคับใช้ทั้งหมด ({occupiedRooms.length} ฉบับ)</p>
                    </div>
                  </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="p-3 sm:p-4 border-b bg-white flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="ค้นหาชื่อผู้เช่า, เลขห้อง, เลขสัญญา, เบอร์โทร..." 
                      value={contractSearch} 
                      onChange={e => setContractSearch(e.target.value)} 
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border rounded-xl bg-gray-50/70 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                  </div>
                  <select 
                    value={contractBuildingFilter} 
                    onChange={e => setContractBuildingFilter(e.target.value)} 
                    className="py-2 px-3 text-xs sm:text-sm border rounded-xl bg-gray-50/70 font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">ทุกอาคาร ({rooms.filter(r => r.status === 'occupied').length})</option>
                    {allBuildings.map(bld => <option key={bld} value={bld}>อาคาร {bld}</option>)}
                  </select>
                </div>

                {occupiedRooms.length === 0 ? (
                  <div className="p-8 sm:p-12 text-center text-gray-400">
                    <ClipboardList size={40} className="mx-auto mb-2 text-gray-300" />
                    <h4 className="font-bold text-sm text-gray-600 mb-0.5">ไม่พบข้อมูลสัญญาเช่า</h4>
                    <p className="text-xs text-gray-400">ยังไม่มีผู้เช่าที่มีสัญญาเช่าตรงกับเงื่อนไขการค้นหา</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View (block md:hidden) */}
                    <div className="block md:hidden p-2.5 sm:p-3 space-y-2.5">
                      {occupiedRooms.map(room => (
                        <div 
                          key={`contract-card-${room.building}-${room.id}`} 
                          className="bg-white p-3.5 rounded-xl border border-gray-200/90 shadow-xs space-y-3 hover:border-blue-200 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {room.idCardImage ? (
                                <img 
                                  src={room.idCardImage} 
                                  onClick={() => setExpandedImage(room.idCardImage)}
                                  className="w-14 h-10 object-cover rounded-lg border shadow-xs grayscale cursor-pointer hover:opacity-80 shrink-0" 
                                  title="คลิกเพื่อดูรูปบัตรขนาดเต็ม"
                                  alt="ID Card"
                                />
                              ) : (
                                <div className="w-14 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 border border-gray-200">
                                  <User size={20} className="text-gray-300" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <h4 className="font-black text-gray-900 text-sm sm:text-base leading-tight truncate">{room.tenant}</h4>
                                <span className="inline-block mt-0.5 text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tight">
                                  # {room.contractId || 'N/A'}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="px-2.5 py-1 rounded-xl bg-gray-900 text-white text-xs font-black shadow-xs inline-block">
                                ห้อง {room.id}
                              </span>
                              <span className="text-[10px] text-gray-400 font-bold block mt-0.5">อาคาร {room.building}</span>
                            </div>
                          </div>

                          {/* Quick details 2x2 grid */}
                          <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                            <div>
                              <span className="text-[10px] text-gray-400 block font-semibold">เงินมัดจำ</span>
                              <span className="font-bold text-gray-800">{parseFloat(room.deposit || 0).toLocaleString()} ฿</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-orange-500 block font-semibold">ยอดจ่ายแรกเข้า</span>
                              <span className="font-bold text-orange-700">{parseFloat(room.initialTotal || 0).toLocaleString()} ฿</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-green-600 block font-semibold">เริ่มสัญญา</span>
                              <span className="font-bold text-gray-700">{room.startDate || '-'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 block font-semibold">ครบกำหนด</span>
                              <span className="font-bold text-gray-700">{room.endDate || 'ไม่มีกำหนด'}</span>
                            </div>
                          </div>

                          {/* Action Button */}
                          <button 
                            onClick={() => { setSelectedContractRoom(room); setIsContractPreviewOpen(true); }}
                            className="w-full py-2.5 px-3 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-blue-200 hover:border-transparent transition-all active:scale-[0.98]"
                          >
                            <FileSearch size={16} /> ดูและพิมพ์หนังสือสัญญาเช่า
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table View (hidden md:block) */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/70 text-[11px] font-bold text-gray-400 uppercase border-b">
                                <tr>
                                    <th className="px-4 lg:px-6 py-3.5">ผู้เช่า / เลขที่สัญญา</th>
                                    <th className="px-4 lg:px-6 py-3.5">ห้องพัก</th>
                                    <th className="px-4 lg:px-6 py-3.5">การเงิน & มัดจำ</th>
                                    <th className="px-4 lg:px-6 py-3.5">ระยะเวลาสัญญา</th>
                                    <th className="px-4 lg:px-6 py-3.5 text-right">พิมพ์สัญญา</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {occupiedRooms.map(room => (
                                    <tr key={`contract-${room.building}-${room.id}`} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-4 lg:px-6 py-4">
                                            <div className="flex items-center gap-3 lg:gap-4">
                                                {room.idCardImage ? (
                                                  <img 
                                                    src={room.idCardImage} 
                                                    onClick={() => setExpandedImage(room.idCardImage)}
                                                    className="w-14 lg:w-16 h-10 lg:h-12 object-cover rounded border shadow-xs grayscale cursor-pointer hover:opacity-80" 
                                                    title="คลิกเพื่อดูรูปบัตรขนาดเต็ม"
                                                    alt="ID Card"
                                                  />
                                                ) : (
                                                  <div className="w-14 lg:w-16 h-10 lg:h-12 bg-gray-100 rounded flex items-center justify-center border border-gray-200">
                                                    <User size={22} className="text-gray-300" />
                                                  </div>
                                                )}
                                                <div>
                                                    <p className="font-black text-gray-900 text-sm lg:text-base">{room.tenant}</p>
                                                    <p className="text-[10px] font-mono text-blue-600 uppercase tracking-tighter"># {room.contractId || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 lg:px-6 py-4">
                                          <p className="font-bold text-gray-800 text-sm">ห้อง {room.id}</p>
                                          <p className="text-[10px] text-gray-400">อาคาร {room.building}</p>
                                        </td>
                                        <td className="px-4 lg:px-6 py-4">
                                          <p className="text-xs lg:text-sm font-bold text-gray-700">มัดจำ: {parseFloat(room.deposit || 0).toLocaleString()} ฿</p>
                                          <p className="text-[10px] text-orange-600 font-bold uppercase">แรกเข้า: {parseFloat(room.initialTotal || 0).toLocaleString()} ฿</p>
                                        </td>
                                        <td className="px-4 lg:px-6 py-4">
                                          <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">เริ่ม: {room.startDate}</p>
                                          <p className="text-[10px] text-gray-400">ครบกำหนด: {room.endDate || 'ไม่มีกำหนด'}</p>
                                        </td>
                                        <td className="px-4 lg:px-6 py-4 text-right">
                                            <button 
                                              onClick={() => { setSelectedContractRoom(room); setIsContractPreviewOpen(true); }} 
                                              className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-xs border border-blue-100 active:scale-95"
                                              title="ดูและพิมพ์สัญญาเช่า"
                                            >
                                              <FileSearch size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* --- Tenant Views --- */}
        {activeTab === 'tenant_dashboard' && loggedInRoom && (
            <div className="space-y-4 sm:space-y-6">
                <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 sm:gap-4">
                      {billConfig.logoUrl ? (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border border-gray-100 p-1 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
                          <img src={billConfig.logoUrl} alt="Logo" className="w-full h-full object-contain rounded-xl" referrerPolicy="no-referrer" />
                        </div>
                      ) : null}
                      <div>
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-1">ยินดีต้อนรับ, {loggedInRoom.tenant}</h2>
                        <p className="text-xs sm:text-sm font-bold text-gray-700">{billConfig.dormName}</p>
                        {billConfig.slogan && (
                          <p className="text-xs font-semibold text-blue-600 italic mb-1.5">"{billConfig.slogan}"</p>
                        )}
                        <p className="text-gray-500 flex items-center gap-1.5 text-xs sm:text-sm"><Building2 size={16} /> ห้อง {loggedInRoom.id} (อาคาร {loggedInRoom.building})</p>
                      </div>
                    </div>
                </div>

                {/* Active Announcements Card for Tenant */}
                {activeAnnouncements.length > 0 && (
                  <div className="bg-white rounded-2xl sm:rounded-3xl border border-blue-100 shadow-xs p-4 sm:p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Megaphone size={20} />
                        <h3 className="font-black text-base sm:text-lg text-gray-900">ประกาศและข่าวสารจากหอพัก</h3>
                      </div>
                      <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-200">
                        {activeAnnouncements.length} ประกาศล่าสุด
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {activeAnnouncements.map((ann: any) => {
                        const badge = getAnnouncementCategoryBadge(ann.category);
                        const CategoryIcon = badge.icon;
                        return (
                          <div 
                            key={`dash-ann-${ann.id}`}
                            className={`p-4 rounded-2xl border transition hover:shadow-xs bg-gradient-to-br ${badge.lightBg} border-gray-200`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider flex items-center gap-1 ${badge.bg}`}>
                                <CategoryIcon size={12} />
                                {badge.label}
                              </span>
                              <span className="text-[11px] font-semibold text-gray-500">
                                กำหนดปิด: <span className="text-gray-800 font-bold">{ann.endDate}</span>
                              </span>
                            </div>
                            <h4 className="font-black text-sm text-gray-900 mb-1.5 flex items-center gap-1.5">
                              {ann.isPinned && <span>📌</span>}
                              {ann.title}
                            </h4>
                            <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed line-clamp-4">
                              {ann.content}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {tenantUnpaidBills.length > 0 && (
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-red-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-600 animate-pulse">สถานะ: ค้างชำระหอพัก</span>
                            <h3 className="font-black text-lg sm:text-xl text-gray-950 mt-1 sm:mt-2">โปรดทราบ: มีบิลค้างชำระในระบบ</h3>
                            <p className="text-xs sm:text-sm text-gray-600 font-medium font-sans">กรุณากดชำระเงินและแนบหลักฐานสลิปการโอนเงินผ่านทางหน้าเมนูล่างนี้เพื่อแจ้งผู้ควบคุมระบบ</p>
                        </div>
                        <button onClick={() => setActiveTab('tenant_bills')} className="w-full md:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs sm:text-sm transition shadow-md active:scale-95 shrink-0">
                            คลิกที่นี่เพื่อไปดูรายละเอียด & จ่ายเงิน
                        </button>
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                        <h3 className="font-bold flex items-center gap-2 text-blue-600 border-b pb-4"><UserCheck size={20} /> ข้อมูลสัญญา</h3>
                        <p className="text-sm"><strong>เลขที่สัญญา:</strong> {loggedInRoom.contractId}</p>
                        <p className="text-sm"><strong>วันที่เข้าพัก:</strong> {loggedInRoom.startDate}</p>
                        <p className="text-sm"><strong>ค่าเช่ารายเดือน:</strong> {loggedInRoom.price?.toLocaleString()} บาท</p>
                        <p className="text-sm"><strong>เงินมัดจำ:</strong> {loggedInRoom.deposit?.toLocaleString()} บาท</p>
                        <p className="text-sm"><strong>เบอร์โทรติดต่อ:</strong> {loggedInRoom.phone || '-'}</p>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                        <h3 className="font-bold flex items-center gap-2 text-red-600 border-b pb-4"><AlertCircle size={20} /> กฎระเบียบและข้อตกลงหอพัก</h3>
                        <div className="text-xs sm:text-sm whitespace-pre-line text-gray-700 leading-relaxed max-h-96 overflow-y-auto pr-1">
                          {loggedInRoom.rules || DEFAULT_DORM_RULES}
                        </div>
                        {Boolean(loggedInRoom.violationDetails || DEFAULT_DORM_VIOLATIONS) && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <h4 className="font-bold text-xs text-red-600 mb-2">บทลงโทษกรณีฝ่าฝืน:</h4>
                            <div className="text-xs whitespace-pre-line text-red-900 bg-red-50 p-3 rounded-xl border border-red-200">
                              {loggedInRoom.violationDetails || DEFAULT_DORM_VIOLATIONS}
                            </div>
                          </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'tenant_bills' && loggedInRoom && (
            <div className="space-y-6">
                <h2 className="text-2xl font-black mb-4">บิลค่าเช่า/มิเตอร์ของฉัน</h2>
                <div className="grid grid-cols-1 gap-4">
                  {bills.filter(b => b.roomId === loggedInRoom.id && b.building === loggedInRoom.building).length > 0 ? (
                    bills.filter(b => b.roomId === loggedInRoom.id && b.building === loggedInRoom.building).map(bill => (
                      <div key={bill.id} className="bg-white p-5 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${bill.status === 'paid' ? 'bg-green-100' : bill.status === 'pending' ? 'bg-orange-100' : 'bg-red-100'}`}>
                            <FileText className={bill.status === 'paid' ? 'text-green-600' : bill.status === 'pending' ? 'text-orange-600' : 'text-red-600'} size={24} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-xs">รอบบิล {bill.month}/{bill.year}</p>
                            <h4 className="font-black text-2xl">{bill.total.toLocaleString()} ฿</h4>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${bill.status === 'paid' ? 'text-green-600' : bill.status === 'pending' ? 'text-orange-600' : 'text-red-600'}`}>{bill.status === 'paid' ? '✔ ชำระแล้ว' : bill.status === 'pending' ? 'รอตรวจสอบสลิป' : 'ค้างชำระ'}</span>
                          </div>
                        </div>
                        <div className="w-full md:w-auto text-right flex flex-col md:flex-row gap-2">
                          <button onClick={() => { setSelectedBill(bill); setIsPreviewModalOpen(true); }} className="w-full md:w-auto px-6 py-3 md:py-2 bg-blue-50 text-blue-600 font-bold hover:bg-blue-100 rounded-xl shadow-sm text-sm">ดูบิลฉบับเต็ม</button>
                          {(bill.status === 'unpaid' || bill.status === 'pending') && (
                            <label className="cursor-pointer w-full md:w-auto px-6 py-3 md:py-2 bg-orange-50 text-orange-600 font-bold hover:bg-orange-100 rounded-xl shadow-sm text-sm flex items-center justify-center gap-2">
                                <Upload size={16} />
                                {bill.status === 'pending' ? 'แนบสลิปใหม่' : 'แนบสลิปโอนเงิน'}
                                <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                    const f = e.target.files[0];
                                    if(f) {
                                      const compressed = await compressImage(f, 1);
                                      handleUploadSlip(bill, compressed);
                                    }
                                }} />
                            </label>
                          )}
                          {bill.slipImage && (
                            <button onClick={() => setExpandedImage(bill.slipImage)} className="w-full md:w-auto px-4 py-3 md:py-2 bg-gray-50 text-gray-600 font-bold hover:bg-gray-100 rounded-xl shadow-sm text-sm flex items-center justify-center gap-2" title="ดูสลิปที่แนบ">
                                <ImageIcon size={16} /> ดูสลิป
                            </button>
                          )}
                        </div>
                      </div>
                  ))) : (
                      <div className="bg-white p-12 rounded-2xl border text-center text-gray-400">
                          <FileText size={48} className="mx-auto mb-4 opacity-20" />
                          <p>ยังไม่มีบิลในระบบ</p>
                      </div>
                  )}
                </div>
            </div>
        )}

        {activeTab === 'tenant_maintenance' && loggedInRoom && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border mb-6">
                <h3 className="font-bold flex items-center gap-2 text-blue-600 mb-4"><Wrench size={18} /> แจ้งปัญหา / แจ้งซ่อม</h3>
                <form onSubmit={(e) => { e.preventDefault(); handleAddMaintenance(e); }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <input type="text" required placeholder="อธิบายปัญหาที่พบ (เช่น แอร์ไม่เย็น, ท่อน้ำซึม)" className="w-full p-3 border rounded-xl" value={newMaintenance.issue} onChange={e => setNewMaintenance({...newMaintenance, issue: e.target.value})} />
                  </div>
                  <div>
                    <label className="cursor-pointer bg-gray-50 border-2 border-dashed rounded-xl p-3 flex justify-center items-center gap-2 hover:bg-gray-100 text-sm h-full">
                      <ImagePlus size={18} className="text-gray-400" />
                      <span className="text-gray-500 font-bold truncate">{newMaintenance.image ? 'แนบรูปแล้ว' : 'แนบรูปภาพ'}</span>
                      <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                        const file = e.target.files[0];
                        if(file) {
                          const compressed = await compressImage(file, 1);
                          setNewMaintenance({...newMaintenance, image: compressed});
                        }
                      }} />
                    </label>
                  </div>
                  <div className="md:col-span-3">
                    <button type="submit" className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl font-bold shadow-md hover:bg-red-700 transition">
                       <Send size={18} /> ส่งเรื่องแจ้งซ่อม
                    </button>
                  </div>
                </form>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold">รายการแจ้งซ่อมของฉัน</h3>
                {maintenance.filter(m => m.roomId === `${loggedInRoom.id} (${loggedInRoom.building})`).length > 0 ? (
                  maintenance.filter(m => m.roomId === `${loggedInRoom.id} (${loggedInRoom.building})`).map(m => (
                    <div key={m.id} className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-center gap-6">
                        {m.image && (
                           <div className="w-full sm:w-48 h-32 rounded-xl overflow-hidden shadow-sm border shrink-0">
                              <img src={m.image} className="w-full h-full object-cover" alt="Issue" />
                           </div>
                        )}
                        <div className="flex-1 w-full">
                          <p className="font-black text-xl text-gray-900">{m.issue}</p>
                          <p className="text-xs text-gray-500 mt-1 uppercase font-bold tracking-wider">วันแจ้ง: {m.date}</p>
                          <div className="mt-4">
                             <span className={`text-xs font-black px-4 py-2 rounded-xl transition-all shadow-sm ${m.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>{m.status === 'pending' ? 'รอดำเนินการ' : 'ซ่อมเสร็จสิ้นแล้ว'}</span>
                          </div>
                        </div>
                    </div>
                  ))
                ) : (
                    <div className="bg-white p-12 rounded-2xl border text-center text-gray-400">
                        <Wrench size={48} className="mx-auto mb-4 opacity-20" />
                        <p>ไม่มีประวัติการแจ้งซ่อม</p>
                    </div>
                )}
              </div>
            </div>
        )}

        {/* --- Announcements View (Admin & Tenant) --- */}
        {(activeTab === 'announcements' || activeTab === 'tenant_announcements') && (
          <div className="space-y-4 sm:space-y-6 print:hidden">
            {/* Announcement Management Header & Summary */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border shadow-xs p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Megaphone size={24} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-tight">
                    {authRole === 'admin' ? 'ศูนย์แจ้งข่าวสารและประกาศหอพัก' : 'กระดานข่าวสารและประกาศจากหอพัก'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {authRole === 'admin' 
                      ? 'ประกาศที่หมดอายุ (เกินวันที่ปิดประกาศ) จะถูกซ่อนออกจากหน้าผู้เช่าอัตโนมัติ' 
                      : 'ติดตามข่าวสาร น้ำประปา ไฟฟ้า การซ่อมแซม และข้อความสำคัญจากผู้ดูแลหอพัก'}
                  </p>
                </div>
              </div>

              {/* Status counter & filter */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold text-gray-600">
                  <button
                    onClick={() => setAnnouncementFilter('active')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${announcementFilter === 'active' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-gray-900'}`}
                  >
                    กำลังประกาศ ({activeAnnouncements.length})
                  </button>
                  {authRole === 'admin' && (
                    <>
                      <button
                        onClick={() => setAnnouncementFilter('expired')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${announcementFilter === 'expired' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-gray-900'}`}
                      >
                        ปิด/หมดอายุแล้ว ({announcements.filter((a: any) => a.endDate && a.endDate < todayStr).length})
                      </button>
                      <button
                        onClick={() => setAnnouncementFilter('all')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${announcementFilter === 'all' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-gray-900'}`}
                      >
                        ทั้งหมด ({announcements.length})
                      </button>
                    </>
                  )}
                </div>

                {authRole === 'admin' && (
                  <button
                    onClick={() => {
                      setEditingAnnouncement(null);
                      setNewAnnouncement({
                        title: '',
                        content: '',
                        category: 'water',
                        startDate: new Date().toISOString().split('T')[0],
                        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        isPinned: false
                      });
                      setIsAnnouncementModalOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition ml-auto md:ml-0"
                  >
                    <Plus size={16} /> ประกาศใหม่
                  </button>
                )}
              </div>
            </div>

            {/* Quick Templates for Admin */}
            {authRole === 'admin' && (
              <div className="bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-white rounded-2xl border border-blue-100 p-3.5 sm:p-4">
                <span className="text-[11px] font-black uppercase text-blue-800 tracking-wider block mb-2">
                  ⚡ สร้างประกาศด่วนจากแม่แบบสำเร็จรูป (คลิกสร้างทันที):
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { applyAnnouncementTemplate('water'); setIsAnnouncementModalOpen(true); }}
                    className="px-3 py-1.5 bg-white hover:bg-cyan-50 border border-cyan-200 text-cyan-800 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition"
                  >
                    <Droplets size={14} className="text-cyan-600" /> แจ้งตัดน้ำประปา
                  </button>
                  <button
                    type="button"
                    onClick={() => { applyAnnouncementTemplate('electric'); setIsAnnouncementModalOpen(true); }}
                    className="px-3 py-1.5 bg-white hover:bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition"
                  >
                    <Zap size={14} className="text-amber-600" /> แจ้งดับไฟฟ้าชั่วคราว
                  </button>
                  <button
                    type="button"
                    onClick={() => { applyAnnouncementTemplate('clean'); setIsAnnouncementModalOpen(true); }}
                    className="px-3 py-1.5 bg-white hover:bg-purple-50 border border-purple-200 text-purple-800 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition"
                  >
                    <Wrench size={14} className="text-purple-600" /> ทำความสะอาดพื้นที่ส่วนกลาง
                  </button>
                  <button
                    type="button"
                    onClick={() => { applyAnnouncementTemplate('holiday'); setIsAnnouncementModalOpen(true); }}
                    className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition"
                  >
                    <Calendar size={14} className="text-blue-600" /> แจ้งวันหยุดเทศกาล
                  </button>
                </div>
              </div>
            )}

            {/* Announcement List */}
            {(() => {
              const displayList = announcements.filter((a: any) => {
                const isExpired = a.endDate && a.endDate < todayStr;
                if (authRole === 'tenant') {
                  // Tenants only see active announcements
                  return !isExpired;
                }
                if (announcementFilter === 'active') return !isExpired;
                if (announcementFilter === 'expired') return isExpired;
                return true;
              }).sort((a: any, b: any) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
              });

              if (displayList.length === 0) {
                return (
                  <div className="bg-white rounded-2xl sm:rounded-3xl border border-dashed border-gray-300 p-8 sm:p-12 text-center text-gray-400 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto text-gray-300">
                      <Megaphone size={32} />
                    </div>
                    <h3 className="font-bold text-base text-gray-700">ไม่มีประกาศในหมวดนี้</h3>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                      {announcementFilter === 'expired' 
                        ? 'ไม่มีประกาศที่ครบกำหนดปิดหรือหมดอายุ' 
                        : 'ขณะนี้ยังไม่มีข่าวสารหรือประกาศที่ใช้งานอยู่'}
                    </p>
                    {authRole === 'admin' && (
                      <button
                        onClick={() => {
                          setEditingAnnouncement(null);
                          setNewAnnouncement({
                            title: '',
                            content: '',
                            category: 'water',
                            startDate: new Date().toISOString().split('T')[0],
                            endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            isPinned: false
                          });
                          setIsAnnouncementModalOpen(true);
                        }}
                        className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                      >
                        สร้างประกาศฉบับแรก
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayList.map((ann: any) => {
                    const badge = getAnnouncementCategoryBadge(ann.category);
                    const CategoryIcon = badge.icon;
                    const isExpired = ann.endDate && ann.endDate < todayStr;

                    return (
                      <div
                        key={ann.id}
                        className={`bg-white rounded-2xl sm:rounded-3xl border p-5 sm:p-6 shadow-xs flex flex-col justify-between transition hover:shadow-md relative overflow-hidden ${
                          isExpired ? 'opacity-65 border-gray-200 bg-gray-50/60' : 'border-gray-200'
                        }`}
                      >
                        {/* Top Accent Strip */}
                        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
                          ann.category === 'water' ? 'from-cyan-400 to-blue-500' :
                          ann.category === 'electricity' ? 'from-amber-400 to-orange-500' :
                          ann.category === 'urgent' ? 'from-rose-500 to-red-600' :
                          ann.category === 'maintenance' ? 'from-purple-500 to-indigo-600' :
                          'from-blue-500 to-indigo-600'
                        }`} />

                        <div>
                          {/* Badges & Expiry info */}
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-3 pt-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border uppercase tracking-wider flex items-center gap-1 ${badge.bg}`}>
                                <CategoryIcon size={12} />
                                {badge.label}
                              </span>
                              {ann.isPinned && (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-0.5">
                                  📌 ปักหมุด
                                </span>
                              )}
                              {isExpired && (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-gray-200 text-gray-700">
                                  หมดเวลาแล้ว (ซ่อนจากผู้เช่า)
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-bold text-gray-500">
                              ปิดประกาศ: <span className={`${isExpired ? 'text-red-500 line-through' : 'text-blue-700 font-extrabold'}`}>{ann.endDate}</span>
                            </span>
                          </div>

                          <h3 className="text-base sm:text-lg font-black text-gray-900 mb-2 leading-snug">
                            {ann.title}
                          </h3>

                          <div className="text-xs sm:text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                            {ann.content}
                          </div>
                        </div>

                        {/* Card Footer: Metadata and Admin Actions */}
                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                          <div className="flex items-center gap-2">
                            <span>เริ่ม: {ann.startDate || '-'}</span>
                            <span>•</span>
                            <span>โดย {ann.author || 'แอดมิน'}</span>
                          </div>

                          {authRole === 'admin' && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingAnnouncement(ann);
                                  setNewAnnouncement({
                                    title: ann.title || '',
                                    content: ann.content || '',
                                    category: ann.category || 'water',
                                    startDate: ann.startDate || todayStr,
                                    endDate: ann.endDate || todayStr,
                                    isPinned: !!ann.isPinned
                                  });
                                  setIsAnnouncementModalOpen(true);
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="แก้ไขประกาศ"
                              >
                                <Settings size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteAnnouncement(ann.id, ann.title)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                                title="ลบประกาศ"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </main>

      {/* Announcement Create/Edit Modal */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 max-h-[92vh] flex flex-col">
            <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Megaphone size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-gray-900 leading-tight">
                    {editingAnnouncement ? 'แก้ไขประกาศ' : 'สร้างประกาศ/แจ้งข่าวสารใหม่'}
                  </h3>
                  <p className="text-[11px] text-gray-400">ระบบจะนำไปแสดงให้ผู้เช่าทุกคนเห็น และจะซ่อนอัตโนมัติเมื่อครบกำหนดปิดประกาศ</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsAnnouncementModalOpen(false); setEditingAnnouncement(null); }} 
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Category */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">ประเภทประกาศ</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'water', label: 'น้ำประปา', icon: Droplets, color: 'text-cyan-600' },
                    { id: 'electricity', label: 'ไฟฟ้า', icon: Zap, color: 'text-amber-600' },
                    { id: 'maintenance', label: 'ซ่อมบำรุง', icon: Wrench, color: 'text-purple-600' },
                    { id: 'urgent', label: 'ด่วนมาก', icon: AlertTriangle, color: 'text-rose-600' },
                    { id: 'general', label: 'ข่าวทั่วไป', icon: Megaphone, color: 'text-blue-600' }
                  ].map(cat => {
                    const Icon = cat.icon;
                    const isSelected = newAnnouncement.category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setNewAnnouncement({ ...newAnnouncement, category: cat.id as any })}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition ${
                          isSelected ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Icon size={14} className={cat.color} />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">หัวข้อประกาศ <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="เช่น แจ้งงดจ่ายน้ำประปาชั่วคราว, แจ้งซ่อมแซมระบบไฟฟ้า"
                  value={newAnnouncement.title}
                  onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  className="w-full p-3 text-xs sm:text-sm border rounded-xl bg-gray-50/70 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">วันที่เริ่มประกาศ</label>
                  <input 
                    type="date" 
                    required
                    value={newAnnouncement.startDate}
                    onChange={e => setNewAnnouncement({ ...newAnnouncement, startDate: e.target.value })}
                    className="w-full p-2.5 text-xs sm:text-sm border rounded-xl bg-gray-50/70 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">
                    วันที่ปิดประกาศ (วันหมดอายุ) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="date" 
                    required
                    value={newAnnouncement.endDate}
                    onChange={e => setNewAnnouncement({ ...newAnnouncement, endDate: e.target.value })}
                    className="w-full p-2.5 text-xs sm:text-sm border-2 border-blue-400 rounded-xl bg-blue-50/20 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-900"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block leading-tight">เมื่อพ้นวันนี้ ข่าวจะหายไปจากหน้าผู้เช่าโดยอัตโนมัติ</span>
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">รายละเอียดประกาศ <span className="text-red-500">*</span></label>
                <textarea 
                  required
                  rows={4}
                  placeholder="ระบุข้อความรายละเอียด เช่น วันเวลาที่จะตัดน้ำ/ไฟ, คำแนะนำสำหรับผู้เช่า, เบอร์ติดต่อกรณีฉุกเฉิน..."
                  value={newAnnouncement.content}
                  onChange={e => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                  className="w-full p-3 text-xs sm:text-sm border rounded-xl bg-gray-50/70 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
                />
              </div>

              {/* Pin Switch */}
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100/80 transition">
                <input 
                  type="checkbox"
                  checked={newAnnouncement.isPinned}
                  onChange={e => setNewAnnouncement({ ...newAnnouncement, isPinned: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-gray-800 block">📌 ปักหมุดไว้บนสุด (Pinned Announcement)</span>
                  <span className="text-gray-400 text-[11px]">แสดงเป็นอันดับแรกในกระดานข่าวสารเสมอ</span>
                </div>
              </label>

              {/* Submit Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setIsAnnouncementModalOpen(false); setEditingAnnouncement(null); }}
                  className="w-1/3 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <Save size={16} /> บันทึกและเผยแพร่ประกาศ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 p-8 space-y-6">
            <div className="flex items-start gap-4">
              <div className={`p-3.5 rounded-2xl shrink-0 ${confirmModal.isWarning ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                {confirmModal.isWarning ? <AlertTriangle size={24} /> : <AlertCircle size={24} />}
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 leading-snug">{confirmModal.title}</h3>
                <p className="text-sm text-gray-500 mt-2.5 whitespace-pre-wrap leading-relaxed">{confirmModal.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
                className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                {confirmModal.cancelText}
              </button>
              <button 
                onClick={async () => {
                  setConfirmModal({ ...confirmModal, isOpen: false });
                  if (confirmModal.onConfirm) {
                    await confirmModal.onConfirm();
                  }
                }} 
                className={`px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition cursor-pointer ${confirmModal.isWarning ? 'bg-red-600 hover:bg-red-700 active:scale-95' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const months = [
    { id: 1, name: 'มกราคม' }, { id: 2, name: 'กุมภาพันธ์' }, { id: 3, name: 'มีนาคม' },
    { id: 4, name: 'เมษายน' }, { id: 5, name: 'พฤษภาคม' }, { id: 6, name: 'มิถุนายน' },
    { id: 7, name: 'กรกฎาคม' }, { id: 8, name: 'สิงหาคม' }, { id: 9, name: 'กันยายน' },
    { id: 10, name: 'ตุลาคม' }, { id: 11, name: 'พฤศจิกายน' }, { id: 12, name: 'ธันวาคม' }
];

export default App;
