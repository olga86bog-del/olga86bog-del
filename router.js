/**
 * ======================================================
 * PRONTO SPECS CLOUD ENGINE | VERSION 2.1 (FINAL)
 * ======================================================
 * Разработчик: Тимур
 * Назначение: Управление логикой приложения, рендеринг,
 * синхронизация с Firebase и генерация HD документов.
 * ======================================================
 */

// ======================================================
// 1. ИНИЦИАЛИЗАЦИЯ И ЖИВАЯ СИНХРОНИЗАЦИЯ
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("[System] Запуск ядра...");

    // Таймер безопасности: если интернет медленный, лоадер исчезнет через 3 сек
    setTimeout(hideLoader, 3000);

    // Подключение к базе данных в реальном времени
    db.ref('settings').on('value', (snapshot) => {
        const cloudData = snapshot.val();

        if (cloudData) {
            console.log("[Firebase] Данные успешно загружены.");
            // Обновляем глобальную конфигурацию данными из облака
            APP_CONFIG = cloudData;

            // Если пользователь уже на странице ТЗ, обновляем списки на лету
            if (document.getElementById('equipment_select')) {
                populateSelects();
            }
        } else {
            console.warn("[Firebase] База пуста. Инициализация...");
            // Если база чистая, отправляем туда данные из config.js
            db.ref('settings').set(APP_CONFIG);
        }

        // Данные получены — скрываем экран загрузки
        hideLoader();
    });

    // Применяем тему оформления при старте
    applyTheme();
    
    // Загружаем главную страницу
    navigate('home');
});

/**
 * Функция скрытия загрузочного экрана с анимацией
 */
function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader && loader.style.display !== 'none') {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }
}

// ======================================================
// 2. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И ХРАНИЛИЩЕ
// ======================================================

let uploadedImageBase64 = null; // Для хранения фото в Base64
let currentManageKey = null;    // Для редактирования списков

// Получение архива из локальной памяти браузера
const getArchive = () => {
    const data = localStorage.getItem('pronto_archive');
    return data ? JSON.parse(data) : [];
};

// Получение настроек пользователя
const getSettings = () => {
    const data = localStorage.getItem('pronto_settings');
    return data ? JSON.parse(data) : { role: "participant", theme: "light" };
};

// ======================================================
// 3. СИСТЕМНЫЕ ФУНКЦИИ
// ======================================================

function applyTheme() {
    const settings = getSettings();
    if (settings.theme === 'dark') {
        document.body.className = 'dark-theme';
    } else {
        document.body.className = '';
    }
}

function syncToCloud() {
    db.ref('settings').set(APP_CONFIG)
        .then(() => console.log("Синхронизация успешна"))
        .catch((err) => console.error("Ошибка сети:", err));
}

// Главный роутер (переключатель страниц)
function navigate(view) {
    const app = document.getElementById('app');
    if (!app) return;

    if (view === 'home') {
        app.innerHTML = homeView();
    } 
    else if (view === 'settings') {
        app.innerHTML = settingsView();
    } 
    else if (view === 'template') {
        app.innerHTML = templateView();
    } 
    else {
        app.innerHTML = homeView();
    }

    // После отрисовки страницы запускаем скрипты
    if (view === 'template') {
        populateSelects();
        checkDualTemp();
    }
    
    window.scrollTo(0, 0);
}

// ======================================================
// 4. ЛОГИКА АДМИНИСТРАТОРА
// ======================================================

function openManageMenu(key, selectId) {
    if (getSettings().role !== 'admin') return;
    
    currentManageKey = key;
    renderManageList();
    document.getElementById('manageModal').style.display = 'flex';
}

function renderManageList() {
    const modalSelect = document.getElementById('manageListSelect');
    if (!modalSelect) return;
    
    modalSelect.innerHTML = '';
    // Берем данные из глобального конфига
    const list = APP_CONFIG[currentManageKey] || [];
    
    list.forEach(item => {
        const opt = new Option(item, item);
        modalSelect.add(opt);
    });
}

function manAdd() {
    const val = prompt("Введите название нового пункта:");
    if (val && val.trim()) {
        APP_CONFIG[currentManageKey].push(val.trim());
        refreshAfterChange();
    }
}

function manEdit() {
    const modalSelect = document.getElementById('manageListSelect');
    const oldVal = modalSelect.value;
    if (!oldVal) return;
    
    const newVal = prompt("Изменить название:", oldVal);
    if (newVal && newVal.trim() && newVal !== oldVal) {
        const idx = APP_CONFIG[currentManageKey].indexOf(oldVal);
        APP_CONFIG[currentManageKey][idx] = newVal.trim();
        refreshAfterChange();
    }
}

function manDel() {
    const modalSelect = document.getElementById('manageListSelect');
    if (confirm(`Вы уверены, что хотите удалить "${modalSelect.value}"?`)) {
        APP_CONFIG[currentManageKey] = APP_CONFIG[currentManageKey].filter(v => v !== modalSelect.value);
        refreshAfterChange();
    }
}

function refreshAfterChange() {
    renderManageList();
    if (document.getElementById('equipment_select')) {
        populateSelects();
    }
    syncToCloud();
}

// Функция отрисовки выпадающего списка с кнопкой "+"
function renderSelect(id, configKey) {
    const isAdmin = getSettings().role === 'admin';
    let btnHTML = '';
    
    if (isAdmin) {
        btnHTML = `
            <button 
                onclick="openManageMenu('${configKey}', '${id}')" 
                class="admin-add-btn no-print" 
                style="margin-left:5px; background:#10b981; color:white; border:none; border-radius:8px; width:32px; height:36px; font-weight:bold; cursor:pointer;"
            >
                +
            </button>`;
    }
    
    return `
        <div style="display:flex; align-items:center; width:100%;">
            <select id="${id}" style="flex-grow:1;"></select>
            ${btnHTML}
        </div>`;
}

// ======================================================
// 5. HTML ШАБЛОНЫ (VIEWS)
// ======================================================

// Модальные окна (Вход, Пароль, Редактор)
const modalsHTML = `
    <div id="loginModal" class="modal" style="display:none">
        <div class="modal-content">
            <h3 style="color:var(--pronto); margin-top:0;">ВХОД АДМИНИСТРАТОРА</h3>
            <input type="password" id="inputPassword" placeholder="Пароль" style="width:100%; padding:12px; margin-bottom:20px; border-radius:10px; border:1px solid #ccc;">
            <div style="display:flex; gap:10px;">
                <button onclick="closeModals()" class="btn btn-secondary" style="flex:1;">ОТМЕНА</button>
                <button onclick="checkLogin()" class="btn" style="flex:1;">ВОЙТИ</button>
            </div>
        </div>
    </div>

    <div id="changePassModal" class="modal" style="display:none">
        <div class="modal-content">
            <h3>СМЕНА ПАРОЛЯ</h3>
            <input type="password" id="newPassword" placeholder="Новый пароль" style="width:100%; padding:12px; margin-bottom:20px; border-radius:10px; border:1px solid #ccc;">
            <div style="display:flex; gap:10px;">
                <button onclick="closeModals()" class="btn btn-secondary" style="flex:1;">ОТМЕНА</button>
                <button onclick="saveNewCredentials()" class="btn" style="flex:1; background:orange;">СОХРАНИТЬ</button>
            </div>
        </div>
    </div>

    <div id="manageModal" class="modal" style="display:none">
        <div class="modal-content" style="width:450px;">
            <h3>РЕДАКТОР СПИСКА</h3>
            <select id="manageListSelect" style="width:100%; padding:10px; margin-bottom:20px; border-radius:10px; font-weight:bold;"></select>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <button onclick="manAdd()" class="btn btn-success">➕ ДОБАВИТЬ</button>
                <button onclick="manEdit()" class="btn btn-warning">✏️ ИЗМЕНИТЬ</button>
                <button onclick="manDel()" class="btn btn-danger">🗑️ УДАЛИТЬ</button>
                <button onclick="closeModals()" class="btn btn-secondary">ЗАКРЫТЬ</button>
            </div>
        </div>
    </div>
`;

// Страница: ГЛАВНАЯ (HOME)
const homeView = () => {
    const archive = getArchive();
    
    return `
    <div class="home-card fade-in">
        <h1 class="main-title">PRODUCTION</h1>
        <div class="subtitle">SPECS</div>
        
        <div style="text-align:left; background:#f8fafc; padding:25px; border-radius:15px; margin:25px 0; border-left:6px solid var(--pronto); color:#475569; font-size:14px; line-height:1.6;">
            <p><strong>PRODUCTION SPECS</strong> — цифровая экосистема компании PRONTO.</p>
            <p>Система предназначена для мгновенной синхронизации технических заданий между всеми подразделениями производства в режиме реального времени.</p>
        </div>

        <button onclick="createNewTZ()" class="btn" style="height:85px; width:100%; font-size:22px; margin-bottom:20px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
            + СОЗДАТЬ ТЗ
        </button>
        
        <button onclick="navigate('settings')" class="btn btn-secondary" style="width:100%;">
            НАСТРОЙКИ СИСТЕМЫ
        </button>
        
        <div style="margin-top:70px; text-align:left;">
            <h4 style="border-bottom:3px solid var(--border); padding-bottom:15px; color:var(--pronto); font-weight:900;">ПОСЛЕДНИЕ ПРОЕКТЫ</h4>
            
            ${archive.length > 0 ? archive.map((item, i) => `
                <div class="archive-item">
                    <div class="archive-content" style="display:flex; align-items:center; gap:15px; width:100%;">
                        ${item.image ? 
                            `<img src="${item.image}" class="archive-thumb">` : 
                            `<div class="archive-thumb" style="display:flex; align-items:center; justify-content:center; color:#ccc;">📷</div>`
                        }
                        <div style="flex:1;">
                            <b style="font-size:18px; color:var(--pronto);">№ ${item.tz_no}</b>
                            <div style="font-size:14px; margin-top:5px; font-weight:bold;">${item.eq}</div>
                            <div style="font-size:12px; color:#64748b; margin-top:3px;">Менеджер: ${item.manager || '—'} | ${item.date}</div>
                        </div>
                    </div>
                    
                    <div class="archive-actions" style="margin-top:15px; display:flex; justify-content:flex-end; gap:8px;">
                        <button onclick="editFromArchive(${i})" class="btn-mini" style="background:#10b981;" title="Открыть">📂</button>
                        <button onclick="alert('Печать...')" class="btn-mini" style="background:#3b82f6;" title="PDF">📄</button>
                        <button onclick="alert('Печать...')" class="btn-mini" style="background:#64748b;" title="Печать">🖨️</button>
                        <button onclick="editFromArchive(${i})" class="btn-mini" style="background:#f59e0b;" title="Редактировать">✏️</button>
                        <button onclick="deleteFromArchive(${i})" class="btn-mini" style="background:#ef4444;" title="Удалить">🗑️</button>
                    </div>
                </div>
            `).join('') : '<p style="text-align:center; color:#94a3b8; padding:40px;">Архив пуст</p>'}
        </div>
    </div>`;
};

// Страница: НАСТРОЙКИ (SETTINGS)
const settingsView = () => {
    const s = getSettings();
    const isAdmin = s.role === 'admin';
    
    return `
    <div class="home-card fade-in">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:40px;">
            <h1 style="margin:0; font-weight:900;">НАСТРОЙКИ</h1>
            <button onclick="navigate('home')" class="close-x">✕</button>
        </div>
        
        <div style="text-align:left; max-width:600px; margin:0 auto;">
            <div style="margin-bottom:30px;">
                <label style="font-weight:bold; display:block; margin-bottom:10px;">ТЕМА ОФОРМЛЕНИЯ:</label>
                <select id="theme_select" style="width:100%;">
                    <option value="light" ${s.theme==='light'?'selected':''}>Светлая тема</option>
                    <option value="dark" ${s.theme==='dark'?'selected':''}>Темная тема</option>
                </select>
            </div>

            <div style="margin-bottom:30px;">
                <label style="font-weight:bold; display:block; margin-bottom:10px;">РОЛЬ ПОЛЬЗОВАТЕЛЯ:</label>
                <select id="role_select" onchange="handleRole(this)" style="width:100%;">
                    <option value="participant" ${!isAdmin?'selected':''}>Участник</option>
                    <option value="admin" ${isAdmin?'selected':''}>Администратор</option>
                </select>
            </div>

            ${isAdmin ? `
                <div style="background:rgba(255,255,255,0.5); padding:20px; border:2px solid var(--pronto); border-radius:15px; margin-bottom:30px; text-align:center;">
                    <h4 style="margin-top:0;">БЕЗОПАСНОСТЬ</h4>
                    <button onclick="document.getElementById('changePassModal').style.display='flex'" class="btn" style="background:orange; width:100%;">СМЕНИТЬ ПАРОЛЬ</button>
                </div>
            ` : ''}
            
            <button onclick="saveSettings()" class="btn btn-secondary" style="width:100%; height:60px; font-size:18px;">СОХРАНИТЬ</button>
        </div>
        ${modalsHTML}
    </div>`;
};

// --- 8. ТАБЛИЦА ТЗ (ВСЕ РАЗДЕЛЫ ВЫРОВНЕНЫ) ---
const templateView = () => `
    <div class="document-sheet fade-in" id="print-root">
        <div class="doc-header">
            <div style="flex-grow:1;">
                <div style="display:flex; align-items:center;">
                    <span style="font-weight:900; color:var(--pronto); font-size:32px; margin-right:15px;">SPECS №</span>
                    <input type="text" id="tz_no" style="width:160px; font-size:32px; border:none; font-weight:900;" placeholder="000-00">
                </div>
                <div style="margin-top:10px;">
                    <b style="font-size:16px;">МЕНЕДЖЕР:</b> 
                    <input type="text" id="manager_name" style="border:none; border-bottom:2px solid #ccc; width:250px; font-size:16px; font-weight:bold;" placeholder="Фамилия">
                </div>
            </div>
            <button onclick="navigate('home')" class="close-x no-print">✕</button>
        </div>
        
        <div class="top-info-grid">
            <div><label style="font-size:11px; font-weight:bold; color:#64748b; display:block;">ОБОРУДОВАНИЕ</label>${renderSelect('equipment_select', 'equipment')}</div>
            <div><label style="font-size:11px; font-weight:bold; color:#64748b; display:block;">ЕД. ИЗМ.</label><select id="unit"><option>шт.</option><option>компл.</option></select></div>
            <div><label style="font-size:11px; font-weight:bold; color:#64748b; display:block;">КОЛ-ВО</label><input type="number" id="qty" value="1"></div>
        </div>

        <table class="spec-table">
            <thead><tr><th width="45">№</th><th>ПАРАМЕТР</th><th>ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ</th></tr></thead>
            <tbody>
                <tr class="section-title"><td colspan="3">1. ГАБАРИТНЫЕ РАЗМЕРЫ (мм)</td></tr>
                <tr><td>1.1</td><td>Высота (H)</td><td><div style="display:flex; align-items:center; gap:5px;"><input type="number" id="h" value="850" style="width:70px; text-align:center;"> <span>мм</span></div></td></tr>
                <tr><td>1.2</td><td>Ширина (W)</td><td><div style="display:flex; align-items:center; gap:5px;"><input type="number" id="w" value="1200" style="width:70px; text-align:center;"> <span>мм</span></div></td></tr>
                <tr><td>1.3</td><td>Глубина (D)</td><td><div style="display:flex; align-items:center; gap:5px;"><input type="number" id="d" value="700" style="width:70px; text-align:center;"> <span>мм</span></div></td></tr>
                <tr><td>1.4</td><td>Допуск</td><td><div style="display:flex; align-items:center; gap:5px;"><span>±</span><input type="number" id="val_1_4" value="5" style="width:50px; text-align:center;"> <span>мм</span></div></td></tr>
                
                <tr class="section-title"><td colspan="3">2. ИСПОЛНЕНИЕ</td></tr>
                <tr><td>2.1</td><td>Материал</td><td>${renderSelect('mat', 'materials')}</td></tr>
                <tr><td>2.2</td><td>Конструкция</td><td>${renderSelect('con', 'constructions')}</td></tr>
                
                <tr class="section-title"><td colspan="3">3. ОХЛАЖДЕНИЕ</td></tr>
                <tr><td>3.1</td><td>Система</td><td>${renderSelect('cool', 'coolingMethods')}</td></tr>
                
                <tr class="section-title"><td colspan="3">4. КОМПЛЕКТАЦИЯ</td></tr>
                <tr><td>4.1</td><td>Столешница</td><td><div style="display:flex; gap:10px;">${renderSelect('val_4_1', 'tabletops')}${renderSelect('val_4_1_mat', 'tabletopMaterials')}</div></td></tr>
                <tr><td>4.2</td><td>Гастроёмкости</td><td><div style="display:flex; align-items:center; gap:5px;">${renderSelect('sel_4_2', 'gnTypes')} <span>глуб:</span> <input type="number" id="val_4_2" value="150" style="width:60px; text-align:center;"> <span>мм</span></div></td></tr>
                <tr><td>4.3</td><td>Количество GN</td><td><div style="display:flex; align-items:center; gap:5px;"><input type="number" id="val_4_3" value="0" style="width:60px; text-align:center;"> <span>шт.</span></div></td></tr>
                <tr><td>4.4</td><td>Двери</td><td><div style="display:flex; align-items:center; gap:5px;">${renderSelect('sel_4_4', 'doorTypes')} <input type="number" id="val_4_4" value="2" style="width:50px; text-align:center;"> <span>шт.</span></div></td></tr>
                <tr><td>4.5</td><td>Ящики / Салазки</td><td><div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px;">${renderSelect('sel_4_5', 'drawerTypes')}${renderSelect('val_4_5_slides', 'slideTypes')}</div></td></tr>
                <tr><td>4.6</td><td>Полки</td><td><div style="display:flex; align-items:center; gap:5px;">${renderSelect('sel_4_6', 'shelfTypes')} <input type="number" id="val_4_6" value="2" style="width:50px; text-align:center;"> <span>шт.</span></div></td></tr>
                <tr><td>4.7</td><td>Нагрузка</td><td><div style="display:flex; align-items:center; gap:5px;"><input type="number" id="val_4_7" value="40" style="width:60px; text-align:center;"> <span>кг</span></div></td></tr>
                <tr><td>4.8</td><td>Подсветка</td><td>${renderSelect('val_4_8', 'lighting')}</td></tr>
                <tr><td>4.9</td><td>Ножки</td><td><div style="display:flex; align-items:center; gap:5px;">${renderSelect('sel_4_9', 'legs')} <input type="number" id="val_4_9" value="4" style="width:50px; text-align:center;"> <span>шт.</span></div></td></tr>
                <tr><td>4.10</td><td>Колеса (торм.)</td><td><div style="display:flex; align-items:center; gap:5px;">${renderSelect('sel_4_10', 'wheels')} <input type="number" id="val_4_10" value="2" style="width:50px; text-align:center;"> <span>шт.</span></div></td></tr>
                <tr><td>4.11</td><td>Колеса (б/торм)</td><td><div style="display:flex; align-items:center; gap:5px;">${renderSelect('sel_4_11', 'wheels')} <input type="number" id="val_4_11" value="2" style="width:50px; text-align:center;"> <span>шт.</span></div></td></tr>
                <tr><td>4.12</td><td>Вентиляция</td><td>${renderSelect('val_4_12', 'ventilation')}</td></tr>
                
                <tr class="section-title"><td colspan="3">5. ТЕМПЕРАТУРА</td></tr>
                <tr><td>5.1</td><td>Режим</td><td><div style="display:flex; align-items:center; gap:10px;"><span>t° :</span> <input type="text" id="val_5_1" value="+2...+8" style="width:90px; text-align:center;"> <div id="dual_temp_zone" style="display:none; align-items:center; gap:5px;"><span>/ t° :</span> <input type="text" id="val_5_1_2" value="-18" style="width:90px; text-align:center;"></div></div></td></tr>
                
                <tr class="section-title"><td colspan="3">6. СРЕДА</td></tr>
                <tr><td>6.1</td><td>Условия</td><td><div style="display:flex; align-items:center; gap:5px;"><span>+</span> <input type="number" id="val_6_1" value="32" style="width:50px; text-align:center;"> <span>/</span> <input type="number" id="val_6_2" value="60" style="width:50px; text-align:center;"> <span>%</span></div></td></tr>

                <tr class="section-title"><td colspan="3">7. ГАРАНТИЯ</td></tr>
                <tr><td>7.1</td><td>Срок гарантии</td><td><div style="display:flex; align-items:center; gap:5px;"><input type="number" id="val_7_1" value="12" style="width:60px; text-align:center; font-weight:bold;"> <span>мес.</span></div></td></tr>

                <tr class="section-title"><td colspan="3">8. СРОК СЛУЖБЫ</td></tr>
                <tr><td>8.1</td><td>Расчетный срок</td><td><div style="display:flex; align-items:center; gap:5px;"><input type="number" id="val_8_1" value="5" style="width:60px; text-align:center; font-weight:bold;"> <span>лет</span></div></td></tr>
                
                <tr class="section-title"><td colspan="3">9. ЭСКИЗ И ПРИМЕЧАНИЯ</td></tr>
                <tr><td colspan="3">
                    <div style="display:grid; grid-template-columns: 1fr 300px; gap:20px; min-height:250px;">
                        <textarea id="val_9_1" style="width:100%; resize:none; padding:10px; border:1px solid #cbd5e1; border-radius:10px;" placeholder="Примечание..."></textarea>
                        <div style="border:3px dashed #cbd5e1; border-radius:15px; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="document.getElementById('file_input').click()" id="upload_zone">
                            <img id="preview_img" style="display:none; max-width:100%; max-height:100%; object-fit:contain;">
                            <div id="img_text" style="text-align:center; color:#94a3b8; font-weight:bold;">📷 ФОТО</div>
                            <input type="file" id="file_input" style="display:none;" onchange="handleFile(this)">
                        </div>
                    </div>
                </td></tr>
            </tbody>
        </table>

        <div class="footer-btns no-print">
            <button class="btn btn-success" onclick="saveToArchive()">В АРХИВ</button>
            <button class="btn btn-secondary" onclick="handlePrint()">ПЕЧАТЬ</button>
            <button class="btn" onclick="genPDF()" style="background:#2b6cb0;">PDF</button>
        </div>
        ${modalsHTML}
    </div>`;

// ======================================================
// 10. ОБРАБОТЧИКИ СОБЫТИЙ И ЛОГИКА
// ======================================================

function populateSelects() {
    const map = { 
        'equipment_select': 'equipment', 'mat': 'materials', 'con': 'constructions', 'cool': 'coolingMethods', 
        'val_4_1': 'tabletops', 'val_4_1_mat': 'tabletopMaterials', 'sel_4_2': 'gnTypes', 
        'sel_4_4': 'doorTypes', 'sel_4_5': 'drawerTypes', 'val_4_5_slides': 'slideTypes', 
        'sel_4_6': 'shelfTypes', 'val_4_8': 'lighting', 'sel_4_9': 'legs', 'sel_4_10': 'wheels', 
        'sel_4_11': 'wheels', 'val_4_12': 'ventilation' 
    };
    
    for (let id in map) {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '<option disabled selected>-- Выбор --</option>';
            const list = APP_CONFIG[map[id]] || [];
            list.forEach(v => el.add(new Option(v, v)));
        }
    }
}

function checkDualTemp() {
    const el = document.getElementById('equipment_select'); 
    if (el) {
        const zone = document.getElementById('dual_temp_zone');
        if (zone) {
            zone.style.display = el.value.toLowerCase().includes('комби') ? 'flex' : 'none';
        }
    }
}

function handleRole(el) { 
    if (el.value === 'admin') {
        document.getElementById('loginModal').style.display = 'flex'; 
    }
}

function closeModals() { 
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); 
}

function checkLogin() {
    if (document.getElementById('inputPassword').value === APP_CONFIG.adminPassword) {
        localStorage.setItem('pronto_settings', JSON.stringify({role: 'admin', theme: getSettings().theme}));
        closeModals(); 
        navigate('settings');
    } else {
        alert("Неверно!");
    }
}

function saveNewCredentials() {
    const p = document.getElementById('newPassword').value;
    if (p.length < 3) return alert("Пароль слишком короткий!");
    APP_CONFIG.adminPassword = p; 
    syncToCloud(); 
    closeModals(); 
    alert("Пароль обновлен");
}

function saveSettings() {
    const r = document.getElementById('role_select').value;
    const t = document.getElementById('theme_select').value;
    localStorage.setItem('pronto_settings', JSON.stringify({role: r, theme: t}));
    applyTheme(); 
    navigate('home');
}

function handleFile(input) {
    const f = input.files[0];
    if (f) {
        const r = new FileReader();
        r.onload = e => {
            uploadedImageBase64 = e.target.result;
            const img = document.getElementById('preview_img');
            img.src = e.target.result; 
            img.style.display = 'block';
            document.getElementById('img_text').style.display = 'none';
        };
        r.readAsDataURL(f);
    }
}
// --- БЛОК 3: ГЕНЕРАТОР PDF (ВСТАВИТЬ ПОСЛЕ handlePrint) ---
async function genPDF() {
    const el = document.querySelector('.document-sheet');
    const footer = document.querySelector('.footer-btns');
    const closeBtn = document.querySelector('.close-x');
    
    // 1. Включаем режим чистовой печати
    prepareForPrint(true);
    
    // 2. Прячем кнопки
    if (footer) footer.style.display = 'none';
    if (closeBtn) closeBtn.style.display = 'none';

    try {
        // 3. Делаем снимок
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
        
        // 4. Настройка размеров (А4 с полями 10мм)
        const imgWidth = 190; // 210 (ширина А4) - 20 (поля слева и справа)
        const pageHeight = 297; 
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 10; // Отступ сверху 10мм

        // Первая страница
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - 20); // Вычитаем высоту листа минус поля

        // Если документ длинный — добавляем страницы
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight + 10; 
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 10, position - 20, imgWidth, imgHeight);
            heightLeft -= (pageHeight - 20);
        }

        // 5. Сохраняем файл
        pdf.save(`TZ_${document.getElementById('tz_no').value || 'DOC'}.pdf`);

    } catch (err) { 
        alert("Ошибка при создании PDF: " + err); 
    } finally { 
        // 6. Возвращаем всё назад
        if (footer) footer.style.display = 'flex'; 
        if (closeBtn) closeBtn.style.display = 'block';
        prepareForPrint(false);
    }
}
function saveToArchive() {
    const arc = getArchive();
    arc.unshift({ 
        tz_no: document.getElementById('tz_no').value || '?', 
        eq: document.getElementById('equipment_select').value,
        manager: document.getElementById('manager_name').value,
        date: new Date().toLocaleDateString(),
        image: uploadedImageBase64
    });
    localStorage.setItem('pronto_archive', JSON.stringify(arc));
    navigate('home');
}

// --- УМНАЯ ПОДГОТОВКА К ПЕЧАТИ ---
// --- УМНАЯ ПОДГОТОВКА (ЗАМЕНА СЛОВ) ---
function prepareForPrint(enable) {
    const inputs = document.querySelectorAll('input, select, textarea');
    
    inputs.forEach(el => {
        if(enable) {
            // ЛОГИКА ДЛЯ ВЫПАДАЮЩИХ СПИСКОВ
            if(el.tagName === 'SELECT') {
                // Запоминаем, что там было написано
                if(!el.dataset.originalText) {
                    el.dataset.originalText = el.options[el.selectedIndex].text;
                }

                // Если выбрано "Выбор..." или пусто -> меняем текст опции на "Нет"
                // Но саму рамочку не трогаем (она останется благодаря CSS)
                if(el.value.includes('Выбор') || el.value === '' || el.value.includes('--')) {
                    // Визуально подменяем текст выбранной опции
                    el.options[el.selectedIndex].text = 'Нет';
                }
            }
            
            // ЛОГИКА ДЛЯ ПУСТЫХ ПОЛЕЙ ВВОДА
            if(el.tagName === 'INPUT' && el.value === '') {
                // Можно написать "—" или оставить пустым, но рамка будет
                // el.value = '—'; // Если хочешь прочерк, раскомментируй
            }

        } else {
            // ВОЗВРАЩАЕМ ВСЁ НАЗАД ПОСЛЕ ПЕЧАТИ
            if(el.tagName === 'SELECT' && el.dataset.originalText) {
                el.options[el.selectedIndex].text = el.dataset.originalText;
                delete el.dataset.originalText;
            }
        }
    });

    // Скрываем зону "Нажмите для загрузки", если фото нет
    const imgText = document.getElementById('img_text');
    if(imgText) imgText.style.display = enable ? 'none' : (uploadedImageBase64 ? 'none' : 'block');
    
    // Убираем пунктирную рамку вокруг фото (но оставляем место)
    const upZone = document.getElementById('upload_zone');
    if(upZone) upZone.style.border = enable ? 'none' : '3px dashed #cbd5e1';
}
function deleteFromArchive(i) {
    if(confirm("Удалить проект из архива?")) {
        const arc = getArchive(); 
        arc.splice(i,1);
        localStorage.setItem('pronto_archive', JSON.stringify(arc)); 
        navigate('home');
    }
}

function editFromArchive(i) {
    const d = getArchive()[i]; 
    navigate('template');
    setTimeout(() => {
        document.getElementById('tz_no').value = d.tz_no;
        document.getElementById('equipment_select').value = d.eq;
        document.getElementById('manager_name').value = d.manager || '';
        if(d.image) {
            uploadedImageBase64 = d.image;
            document.getElementById('preview_img').src = d.image;
            document.getElementById('preview_img').style.display = 'block';
            document.getElementById('img_text').style.display = 'none';
        }
    }, 100);
}

function createNewTZ() { 
    uploadedImageBase64 = null; 
    navigate('template'); 
}









