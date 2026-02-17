const firebaseConfig = {
  apiKey: "AIzaSyC4jKm_lvBG7tn_demA_WO4Vjb_Kru_24o",
  authDomain: "pronto-ps.firebaseapp.com",
  databaseURL: "https://pronto-ps-default-rtdb.firebaseio.com",
  projectId: "pronto-ps",
  storageBucket: "pronto-ps.firebasestorage.app",
  messagingSenderId: "552560993208",
  appId: "1:552560993208:web:41ca99e7fe46864502a54d"
};

try {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase подключен!");
} catch (e) {
    console.error("❌ Ошибка Firebase:", e);
}

const db = firebase.database();

let APP_CONFIG = {
    adminLogin: "admin",
    adminPassword: "123",
    equipment: ["Стол холодильный", "Стол морозильный", "Стол комбинированный", "Стол барный", "Ларь морозильный", "Горка", "Витрина открытая", "Витрина закрытая с дверьми", "Стол с настольной саладеттой", "Витрина с встроенной саладеттой"],
    units: ["шт.", "компл."],
    materials: ["AISI 304", "AISI 430", "Окрашенная сталь"],
    constructions: ["Вертикальный", "Горизонтальный", "Другое"],
    coolingMethods: ["Статический", "Динамический", "Комбинированный"],
    tabletopMaterials: ["AISI 304", "AISI 430", "Гранит"],
    slideTypes: ["Прямые", "Тандем"],
    tabletops: ["С бортом", "Без борта", "Гранитная", "Без столешницы"],
    gnTypes: ["GN 1/1", "GN 1/2", "GN 1/3", "GN 1/4", "GN 1/6", "GN 1/9", "GN 2/1"],
    doorTypes: ["Металлические", "Стеклянные"],
    drawerTypes: ["Выдвижные", "Телескопические", "Нет"],
    shelfTypes: ["Решетчатая", "Сплошная", "Стеклянная"],
    lighting: ["Нет", "Холодная LED", "Теплая LED", "Мясной спектр"],
    legs: ["h-200", "h-150", "h-135", "h-100"],
    wheels: ["d-200", "d-150", "d-125", "d-100", "d-75", "d-50", "Без колес"],
    ventilation: ["Замкнутая", "Сквозная"]
};

