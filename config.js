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
    console.log("Firebase подключен успешно!");
} catch (e) {
    console.error("Ошибка Firebase:", e);
}

const db = firebase.database();

let APP_CONFIG = {
    adminLogin: "admin",
    adminPassword: "123",
    equipment: ["Стол холодильный", "Стол морозильный", "Стол барный", "Ларь морозильный", "Горка", "Витрина открытая"],
    units: ["шт.", "компл."],
    materials: ["AISI 304", "AISI 430", "Окрашенная сталь"],
    constructions: ["Вертикальный", "Горизонтальный"],
    coolingMethods: ["Статический", "Динамический"],
    tabletopMaterials: ["AISI 304", "AISI 430", "Гранит"],
    slideTypes: ["Прямые", "Тандем"],
    tabletops: ["С бортом", "Без борта", "Гранитная"],
    gnTypes: ["GN 1/1", "GN 1/2", "GN 1/3"],
    doorTypes: ["Металлические", "Стеклянные"],
    drawerTypes: ["Выдвижные", "Нет"],
    shelfTypes: ["Решетчатая", "Сплошная"],
    lighting: ["Нет", "LED"],
    legs: ["h-200", "h-100"],
    wheels: ["d-100", "Без колес"],
    ventilation: ["Замкнутая", "Сквозная"]
};
