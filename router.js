/**
 * PRONTO SPECS 2.1 - FULL CLOUD ENGINE
 * РАЗРАБОТКА: ТИМУР | ТАШКЕНТ 2026
 * СТАТУС: FINAL VERSION (БЕЗ СОКРАЩЕНИЙ)
 */

// --- 1. ЯДРО СИНХРОНИЗАЦИИ ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("Загрузка облачных модулей... Соединение с Firebase");
    
    // Предохранитель лоадера (3.5 сек), чтобы сайт открылся даже при плохом интернете
    setTimeout(hideLoader, 3500);

    // Подписываемся на изменения базы в реальном времени
    db.ref('settings').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            console.log("🔄 База данных обновлена и синхронизирована!");
            APP_CONFIG = data;
            
            // Если мы в конструкторе — мгновенно обновляем все выпадающие списки
            if (document.getElementById('equipment_select')) {
                populateSelects();
            }
        } else {
            console.warn("⚠️ База пуста. Отправка начального конфига в облако...");
            db.ref('settings').set(APP_CONFIG);
        }
        
        hideLoader(); // Убираем индикатор загрузки
    });

    applyTheme();
    navigate('home');
});

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader && loader.style.display !== 'none') {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 600);
    }
}

// --- 2. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И ХРАНИЛИЩЕ ---
let uploadedImageBase64 = null;
let currentManageKey = null;

const getArchive = () => JSON.parse(localStorage.getItem('pronto_archive') || '[]');
const getSettings = () => JSON.parse(localStorage.getItem('pronto_settings') || '{"role":"participant", "theme":"light"}');

// --- 3. СИСТЕМНЫЕ СЕРВИСЫ ---
function applyTheme() {
    const s = getSettings();
    document.body.className = s.theme === 'dark' ? 'dark-theme' : '';
}

function syncToCloud() {
    db.ref('settings').set(APP_CONFIG)
        .then(() => console.log("💾 Данные успешно отправлены в Google Cloud"))
        .catch((err) => alert("Ошибка синхронизации: " + err));
}

function navigate(view) {
    const app = document.getElementById('app');
    if (!app) return;

    if (view === 'home') app.innerHTML = homeView();
    else if (view === 'settings') app.innerHTML = settingsView();
    else if (view === 'template') app.innerHTML = templateView();
    else app.innerHTML = homeView();

    // После отрисовки заполняем списки и проверяем комбинированный режим
    if (view === 'template') {
        populateSelects();
        checkDualTemp();
    }
    window.scrollTo(0, 0);
}

// --- 4. УПРАВЛЕНИЕ ОБЛАЧНОЙ БАЗОЙ (ДЛЯ АДМИНА) ---
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
    const items = APP_CONFIG[currentManageKey] || [];
    items.forEach(item => {
        const opt = new Option(item, item);
        modalSelect.add(opt);
    });
}

function manAdd() {
    const val = prompt("Введите название нового элемента для облачной базы:");
    if (val && val.trim()) {
        APP_CONFIG[currentManageKey].push(val.trim());
        refreshAfterChange();
    }
}

function manEdit() {
    const modalSelect = document.getElementById('manageListSelect');
    const oldVal = modalSelect.value;
    if (!oldVal) return;
    const newVal = prompt("Изменить название в облаке:", oldVal);
    if (newVal && newVal.trim() && newVal !== oldVal) {
        const idx = APP_CONFIG[currentManageKey].indexOf(oldVal);
        if (idx !== -1) {
            APP_CONFIG[currentManageKey][idx] = newVal.trim();
            refreshAfterChange();
        }
    }
}

function manDel() {
    const modalSelect = document.getElementById('manageListSelect');
    const val = modalSelect.value;
    if (!val) return;
    if (confirm(`⚠️ Вы уверены, что хотите удалить "${val}"? Списки изменятся у всех пользователей.`)) {
        APP_CONFIG[currentManageKey] = APP_CONFIG[currentManageKey].filter(v => v !== val);
        refreshAfterChange();
    }
}

function refreshAfterChange() {
    renderManageList();
    if (document.getElementById('equipment_select')) populateSelects();
    syncToCloud();
}

function renderSelect(id, configKey) {
    const isAdmin = getSettings().role === 'admin';
    const btnHTML = isAdmin ? `<button onclick="openManageMenu('${configKey}', '${id}')" class="admin-add-btn no-print" title="Редактировать облачный список">+</button>` : '';
    return `<div style="display:flex; align-items:center; width:100%; gap:8px;"><select id="${id}" style="flex-grow:1; padding:10px; border-radius:8px; border:1px solid #cbd5e1;"></select>${btnHTML}</div>`;
}

// --- 5. ШАБЛОНЫ ИНТЕРФЕЙСА (VIEWS) ---

const modalsHTML = `
<div id="loginModal" class="modal" style="display:none">
    <div class="modal-content">
        <h2 style="color:var(--pronto); margin-top:0;">Аутентификация</h2>
        <p style="font-size:14px; color:#64748b; margin-bottom:25px;">Введите пароль администратора для управления списками и настройками облака.</p>
        <input type="password" id="inputPassword" placeholder="Мастер-пароль" style="width:100%; margin-bottom:25px; padding:15px; border:2px solid #eee; border-radius:12px; font-size:16px;">
        <div style="display:flex; gap:15px;"><button onclick="closeModals()" class="btn btn-secondary" style="flex:1;">ОТМЕНА</button><button onclick="checkLogin()" class="btn" style="flex:1;">ВОЙТИ</button></div>
    </div>
</div>
<div id="changePassModal" class="modal" style="display:none">
    <div class="modal-content">
        <h2 style="margin-top:0;">Новый пароль</h2>
        <p style="margin-bottom:20px; font-size:13px;">Установите новый ключ доступа к функциям администратора.</p>
        <input type="password" id="newPassword" placeholder="Минимум 3 знака" style="width:100%; margin-bottom:25px; padding:15px; border:2px solid #eee; border-radius:12px;">
        <div style="display:flex; gap:15px;"><button onclick="closeModals()" class="btn btn-secondary" style="flex:1;">ОТМЕНА</button><button onclick="saveNewCredentials()" class="btn" style="flex:1; background:#d69e2e;">СОХРАНИТЬ</button></div>
    </div>
</div>
<div id="manageModal" class="modal" style="display:none">
    <div class="modal-content" style="width:480px;">
        <h3 style="margin-top:0; letter-spacing:1px;">РЕДАКТОР СПИСКА</h3>
        <select id="manageListSelect" style="width:100%; padding:15px; margin-bottom:25px; font-weight:bold; border-radius:12px; font-size:15px;"></select>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <button onclick="manAdd()" class="btn btn-success" style="padding:15px; font-size:13px;">➕ ДОБАВИТЬ</button>
            <button onclick="manEdit()" class="btn btn-warning" style="padding:15px; font-size:13px;">✏️ ИЗМЕНИТЬ</button>
            <button onclick="manDel()" class="btn btn-danger" style="padding:15px; font-size:13px;">🗑️ УДАЛИТЬ</button>
            <button onclick="closeModals()" class="btn btn-secondary" style="padding:15px; font-size:13px;">ЗАКРЫТЬ</button>
        </div>
    </div>
</div>`;

const homeView = () => {
    const archive = getArchive();
    const s = getSettings();
    return `
    <div class="home-card fade-in" style="background:var(--white); border-radius:25px; padding:60px; text-align:center; box-shadow: 0 15px 40px rgba(0,0,0,0.1);">
        <h1 class="main-title" style="margin-bottom:5px;">PRODUCTION</h1><div class="subtitle" style="margin-bottom:40px; font-weight:300;">SPECS 2.1 FULL HD</div>
        <div style="font-weight:900; color:var(--pronto); margin-bottom:45px; font-size:13px; letter-spacing:2px; text-transform:uppercase;">ДОСТУП: ${s.role} | ИНТЕРФЕЙС: ${s.theme}</div>
        
        <button onclick="createNewTZ()" class="btn" style="height:85px; width:100%; font-size:20px; margin-bottom:20px; border-radius:18px; box-shadow: 0 10px 20px rgba(43,108,176,0.3);">+ СОЗДАТЬ НОВУЮ СПЕЦИФИКАЦИЮ</button>
        <button onclick="navigate('settings')" class="btn btn-secondary" style="width:100%; border-radius:18px;">КОНФИГУРАЦИЯ СИСТЕМЫ</button>
        
        <div style="margin-top:75px; text-align:left;">
            <h4 style="border-bottom:3px solid var(--border); padding-bottom:15px; color:var(--pronto); font-weight:900; letter-spacing:1px; text-transform:uppercase;">Архив последних проектов</h4>
            ${archive.length ? archive.map((item, i) => `
                <div class="archive-item" style="background:var(--white); border:1px solid var(--border); padding:25px; border-radius:18px; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center; transition:0.3s;">
                    <div>
                        <b style="font-size:22px; color:var(--pronto)">№ ${item.tz_no}</b>
                        <div style="font-size:16px; color:var(--text-main); margin-top:8px; font-weight:700;">${item.eq}</div>
                        <div style="font-size:13px; color:#94a3b8; margin-top:8px;">Менеджер: ${item.manager || 'Не указан'} | ${item.date}</div>
                    </div>
                    <button onclick="deleteFromArchive(${i})" class="btn" style="width:65px; background:#ef4444; margin:0; padding:15px; border-radius:14px;">🗑️</button>
                </div>`).join('') : '<p style="text-align:center; color:#94a3b8; padding:60px; font-style:italic; font-size:15px;">История пуста. Ваши проекты появятся здесь после сохранения.</p>'}
        </div>
    </div>`;
};

const settingsView = () => {
    const s = getSettings();
    const isAdmin = s.role === 'admin';
    return `
    <div class="home-card fade-in" style="background:var(--white); border-radius:25px; padding:55px;">
        <h1 style="margin-bottom:45px; font-weight:900; letter-spacing:-1px;">НАСТРОЙКИ ПЛАТФОРМЫ</h1>
        
        <div style="text-align:left; background:rgba(43, 108, 176, 0.08); padding:35px; border-radius:22px; margin-bottom:45px; font-size:16px; line-height:1.8; border-left:12px solid var(--pronto);">
            <h4 style="margin-top:0; color:var(--pronto); text-transform:uppercase; letter-spacing:1px;">ТЕХНИЧЕСКИЙ ПАСПОРТ СИСТЕМЫ:</h4>
            <p><strong>PRONTO SPECS 2.1</strong> — это инженерная облачная платформа. Возможности:</p>
            <ul style="margin:15px 0; padding-left:25px;">
                <li><strong>Cloud Realtime Data:</strong> Мгновенная синхронизация базы материалов через Google Firebase API.</li>
                <li><strong>High-Definition Engine:</strong> Генерация PDF в разрешении 300 DPI для идеальной четкости чертежей.</li>
                <li><strong>Shared Workspace:</strong> Все изменения администратора применяются мгновенно для всех подключенных устройств.</li>
            </ul>
        </div>

        <div style="text-align:left; max-width:650px; margin:0 auto;">
            <div style="margin-bottom:35px;">
                <label style="font-weight:900; display:block; margin-bottom:12px; text-transform:uppercase; font-size:12px; color:#64748b; letter-spacing:1px;">🎨 Визуальный режим:</label>
                <select id="theme_select" style="width:100%; padding:16px; border-radius:12px; border:2.5px solid var(--border); background:var(--white); color:var(--text-main); font-weight:bold; font-size:16px;">
                    <option value="light" ${s.theme==='light'?'selected':''}>Classic Light (Светлый)</option>
                    <option value="dark" ${s.theme==='dark'?'selected':''}>Professional Dark (Темный)</option>
                </select>
            </div>

            <div style="margin-bottom:35px;">
                <label style="font-weight:900; display:block; margin-bottom:12px; text-transform:uppercase; font-size:12px; color:#64748b; letter-spacing:1px;">👤 Уровень полномочий:</label>
                <select id="role_select" onchange="handleRole(this)" style="width:100%; padding:16px; border-radius:12px; border:2.5px solid var(--border); background:var(--white); color:var(--text-main); font-weight:bold; font-size:16px;">
                    <option value="participant" ${!isAdmin?'selected':''}>Участник (Создание ТЗ)</option>
                    <option value="admin" ${isAdmin?'selected':''}>Администратор (Полное облачное управление)</option>
                </select>
            </div>

            ${isAdmin ? `
                <div style="background:var(--header-bg); padding:35px; border-radius:20px; border:2px solid var(--pronto); margin-bottom:45px; text-align:center;">
                    <h4 style="margin-top:0; color:var(--header-text); font-weight:900; letter-spacing:1px;">🔐 БЕЗОПАСНОСТЬ БАЗЫ</h4>
                    <p style="font-size:14px; color:var(--header-text); margin-bottom:25px;">Обновление мастер-пароля изменит ключ доступа для всех будущих админ-сессий.</p>
                    <button onclick="document.getElementById('changePassModal').style.display='flex'" class="btn" style="background:#d69e2e; width:100%; border-radius:12px; box-shadow: 0 5px 15px rgba(214,158,46,0.3);">ИЗМЕНИТЬ ПАРОЛЬ ДОСТУПА</button>
                </div>
            ` : ''}

            <button onclick="saveSettings()" class="btn btn-secondary" style="width:100%; border-radius:12px; height:65px; font-size:17px; font-weight:900;">СОХРАНИТЬ КОНФИГУРАЦИЮ</button>
        </div>
        ${modalsHTML}
    </div>`;
};

// --- КОНСТРУКТОР ТЕХНИЧЕСКОГО ЗАДАНИЯ (TEMPLATE) ---
const templateView = () => `
    <div class="document-sheet fade-in">
        <div class="doc-header">
            <div style="flex-grow:1;">
                <div style="font-size:14px; color:#94a3b8; font-weight:900; letter-spacing:2px; text-transform:uppercase;">Техническое Задание на производство</div>
                <div style="display:flex; align-items:center; margin-top:12px;">
                    <span style="font-weight:900; color:var(--pronto); font-size:36px; margin-right:20px;">SPECS №</span>
                    <input type="text" id="tz_no" style="width:180px; font-size:36px; border:none; font-weight:900; outline:none; color:black; background:transparent;" placeholder="000-00">
                </div>
                <div style="margin-top:20px; display:flex; align-items:center; gap:15px;">
                    <b style="font-size:17px; letter-spacing:0.5px;">ОТВ. МЕНЕДЖЕР:</b> 
                    <input type="text" id="manager_name" style="border:none; border-bottom:2px solid #cbd5e1; width:320px; font-size:17px; padding:6px; font-weight:bold; color:black; background:transparent;" placeholder="Введите имя и фамилию">
                </div>
            </div>
            <button onclick="navigate('home')" class="close-x no-print" title="Закрыть без сохранения">✕</button>
        </div>
        
        <div class="top-info-grid">
            <div>
                <label style="font-size:12px; font-weight:900; color:#64748b; display:block; margin-bottom:10px; text-transform:uppercase;">Тип изделия</label>
                ${renderSelect('equipment_select', 'equipment')}
            </div>
            <div>
                <label style="font-size:12px; font-weight:900; color:#64748b; display:block; margin-bottom:10px; text-transform:uppercase;">Ед. изм.</label>
                <select id="unit" style="padding:14px; border-radius:10px; border:1px solid #cbd5e1; width:100%; font-weight:bold; font-size:15px;"><option>шт.</option><option>компл.</option></select>
            </div>
            <div>
                <label style="font-size:12px; font-weight:900; color:#64748b; display:block; margin-bottom:10px; text-transform:uppercase;">Количество</label>
                <input type="number" id="qty" value="1" style="padding:14px; border-radius:10px; border:1px solid #cbd5e1; width:100%; font-weight:900; font-size:17px; color:var(--pronto);">
            </div>
        </div>

        <table class="spec-table">
            <thead>
                <tr><th width="55">№</th><th>ПАРАМЕТР ИЗДЕЛИЯ</th><th>ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ</th></tr>
            </thead>
            <tbody>
                <tr class="section-title"><td colspan="3">1. ГЕОМЕТРИЧЕСКИЕ ХАРАКТЕРИСТИКИ (мм)</td></tr>
                <tr><td>1.1</td><td>Высота изделия (H)</td><td><div style="display:flex; align-items:center; gap:12px;"><input type="number" id="h" value="850" style="width:130px; font-weight:bold; padding:8px;"> <b>мм</b></div></td></tr>
                <tr><td>1.2</td><td>Ширина изделия (W)</td><td><div style="display:flex; align-items:center; gap:12px;"><input type="number" id="w" value="1200" style="width:130px; font-weight:bold; padding:8px;"> <b>мм</b></div></td></tr>
                <tr><td>1.3</td><td>Глубина изделия (D)</td><td><div style="display:flex; align-items:center; gap:12px;"><input type="number" id="d" value="700" style="width:130px; font-weight:bold; padding:8px;"> <b>мм</b></div></td></tr>
                <tr><td>1.4</td><td>Технологический допуск</td><td><div style="display:flex; align-items:center; gap:12px;"><b>±</b> <input type="number" id="val_1_4" value="5" style="width:90px; font-weight:bold; padding:8px;"> <b>мм</b></div></td></tr>
                
                <tr class="section-title"><td colspan="3">2. МАТЕРИАЛЫ И КОНСТРУКЦИЯ</td></tr>
                <tr><td>2.1</td><td>Материал корпуса / отделка</td><td>${renderSelect('mat', 'materials')}</td></tr>
                <tr><td>2.2</td><td>Тип исполнения каркаса</td><td>${renderSelect('con', 'constructions')}</td></tr>
                
                <tr class="section-title"><td colspan="3">3. ХОЛОДИЛЬНЫЙ АГРЕГАТ</td></tr>
                <tr><td>3.1</td><td>Метод охлаждения (тип системы)</td><td>${renderSelect('cool', 'coolingMethods')}</td></tr>
                
                <tr class="section-title"><td colspan="3">4. ДЕТАЛИЗАЦИЯ КОМПЛЕКТАЦИИ</td></tr>
                <tr><td>4.1</td><td>Тип и материал столешницы</td><td><div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">${renderSelect('val_4_1', 'tabletops')}${renderSelect('val_4_1_mat', 'tabletopMaterials')}</div></td></tr>
                <tr><td>4.2</td><td>Гастроёмкости (стандарт GN)</td><td><div style="display:flex; align-items:center; gap:12px;">${renderSelect('sel_4_2', 'gnTypes')} <b style="white-space:nowrap;">глубина:</b> <input type="number" id="val_4_2" value="150" style="width:100px; font-weight:bold; padding:8px;"> <b>мм</b></div></td></tr>
                <tr><td>4.3</td><td>Количество GN в комплекте</td><td><div style="display:flex; align-items:center; gap:12px;"><input type="number" id="val_4_3" value="0" style="width:130px; font-weight:bold; padding:8px;"> <b>шт.</b></div></td></tr>
                <tr><td>4.4</td><td>Дверная система (тип)</td><td><div style="display:flex; align-items:center; gap:12px;">${renderSelect('sel_4_4', 'doorTypes')} <input type="number" id="val_4_4" value="2" style="width:90px; font-weight:bold; padding:8px;"> <b>шт.</b></div></td></tr>
                <tr><td>4.5</td><td>Выдвижные ящики / Салазки</td><td><div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">${renderSelect('sel_4_5', 'drawerTypes')}${renderSelect('val_4_5_slides', 'slideTypes')}</div></td></tr>
                <tr><td>4.6</td><td>Внутреннее наполнение (полки)</td><td><div style="display:flex; align-items:center; gap:12px;">${renderSelect('sel_4_6', 'shelfTypes')} <input type="number" id="val_4_6" value="2" style="width:90px; font-weight:bold; padding:8px;"> <b>шт.</b></div></td></tr>
                <tr><td>4.7</td><td>Нагрузочная способность полки</td><td><div style="display:flex; align-items:center; gap:12px;"><input type="number" id="val_4_7" value="40" style="width:130px; font-weight:bold; padding:8px;"> <b>кг</b></div></td></tr>
                <tr><td>4.8</td><td>Освещение рабочего объема</td><td>${renderSelect('val_4_8', 'lighting')}</td></tr>
                
                <tr class="section-title"><td colspan="3">4.9 - 4.12 ФУРНИТУРА И ВЕНТИЛЯЦИЯ</td></tr>
                <tr><td>4.9</td><td>Тип опорных элементов (ножки)</td><td><div style="display:flex; align-items:center; gap:12px;">${renderSelect('sel_4_9', 'legs')} <input type="number" id="val_4_9" value="4" style="width:90px; font-weight:bold; padding:8px;"> <b>шт.</b></div></td></tr>
                <tr><td>4.10</td><td>Колеса (с тормозным мех.)</td><td><div style="display:flex; align-items:center; gap:12px;">${renderSelect('sel_4_10', 'wheels')} <input type="number" id="val_4_10" value="2" style="width:90px; font-weight:bold; padding:8px;"> <b>шт.</b></div></td></tr>
                <tr><td>4.11</td><td>Колеса (без тормоза)</td><td><div style="display:flex; align-items:center; gap:12px;">${renderSelect('sel_4_11', 'wheels')} <input type="number" id="val_4_11" value="2" style="width:90px; font-weight:bold; padding:8px;"> <b>шт.</b></div></td></tr>
                <tr><td>4.12</td><td>Вентиляционные решетки</td><td>${renderSelect('val_4_12', 'ventilation')}</td></tr>
                
                <tr class="section-title"><td colspan="3">5. ТЕМПЕРАТУРНЫЕ РЕЖИМЫ И СРЕДА</td></tr>
                <tr><td>5.1</td><td>Целевой диапазон t°</td><td><div style="display:flex; align-items:center; gap:15px;"><b>t° :</b> <input type="text" id="val_5_1" value="+2...+8" style="width:110px; text-align:center; font-weight:900; background:#f0f7ff; border:1px solid #cbd5e1; border-radius:6px; padding:7px;"> <div id="dual_temp_zone" style="display:none; align-items:center; gap:15px;"><b>/ t° :</b> <input type="text" id="val_5_1_2" value="-18" style="width:110px; text-align:center; font-weight:900; background:#fff0f0; border:1px solid #cbd5e1; border-radius:6px; padding:7px;"></div></div></td></tr>
                <tr><td>6.1</td><td>Условия эксплуатации (T/Вл)</td><td><div style="display:flex; align-items:center; gap:10px;">до + <input type="number" id="val_6_1" value="32" style="width:75px; padding:7px; border-radius:6px;"> <b>/</b> до <input type="number" id="val_6_2" value="60" style="width:75px; padding:7px; border-radius:6px;"> <b>%</b></div></td></tr>
                
                <tr class="section-title"><td colspan="3">7. ГАРАНТИЯ И СРОКИ ПРОИЗВОДСТВА</td></tr>
                <tr><td>7.1</td><td>Гарантийный период</td><td><div style="display:flex; align-items:center; gap:12px;"><input type="number" id="val_7_1" value="12" style="width:110px; font-weight:bold; padding:8px;"> <b>мес.</b></div></td></tr>
                <tr><td>8.1</td><td>Срок изготовления заказа</td><td><div style="display:flex; align-items:center; gap:12px;"><input type="number" id="val_8_1" value="10" style="width:110px; font-weight:bold; padding:8px;"> <b>раб. дней</b></div></td></tr>
                
                <tr class="section-title"><td colspan="3">9. ГРАФИЧЕСКИЕ ДАННЫЕ И ПРИМЕЧАНИЯ</td></tr>
                <tr>
                    <td colspan="3">
                        <div style="display:grid; grid-template-columns: 1fr 340px; gap:35px; min-height:300px; padding:15px 0;">
                            <textarea id="val_9_1" style="width:100%; height:100%; resize:none; padding:22px; border:2px solid #cbd5e1; border-radius:18px; font-size:15px; font-family:inherit; line-height:1.6;" placeholder="Укажите здесь любые дополнительные примечания, требования к упаковке или особые пожелания заказчика..."></textarea>
                            <div style="border:3.5px dashed #cbd5e1; border-radius:25px; display:flex; align-items:center; justify-content:center; cursor:pointer; background:#f8fafc; overflow:hidden; position:relative; transition:0.3s;" onclick="document.getElementById('file_input').click()" id="upload_zone">
                                <img id="preview_img" style="display:none; max-width:100%; max-height:100%; object-fit:contain;">
                                <div id="img_text" style="text-align:center; color:#94a3b8; font-size:15px; font-weight:900; line-height:1.5;">📷 НАЖМИТЕ ДЛЯ ЗАГРУЗКИ<br>ЭСКИЗА ИЛИ ФОТОГРАФИИ</div>
                                <input type="file" id="file_input" style="display:none;" onchange="handleFile(this)">
                            </div>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>

        <div class="footer-btns no-print">
            <button class="btn btn-success" onclick="saveToArchive()" style="flex:1.3; font-size:15px;">💾 СОХРАНИТЬ В ОБЛАЧНЫЙ АРХИВ</button>
            <button class="btn" onclick="genPDF()" style="background:#2b6cb0; flex:1; font-size:15px;">📄 СКАЧАТЬ PDF (HD)</button>
        </div>
        ${modalsHTML}
    </div>`;

// --- 6. ЛОГИКА ОБРАБОТКИ СОБЫТИЙ И ПРОВЕРОК ---

function populateSelects() {
    const map = {
        'equipment_select': 'equipment', 'mat': 'materials', 'con': 'constructions',
        'cool': 'coolingMethods', 'val_4_1': 'tabletops', 'val_4_1_mat': 'tabletopMaterials',
        'sel_4_2': 'gnTypes', 'sel_4_4': 'doorTypes', 'sel_4_5': 'drawerTypes',
        'val_4_5_slides': 'slideTypes', 'sel_4_6': 'shelfTypes', 'val_4_8': 'lighting',
        'sel_4_9': 'legs', 'sel_4_10': 'wheels', 'sel_4_11': 'wheels', 'val_4_12': 'ventilation'
    };
    
    for (let id in map) {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '<option disabled selected>-- Выберите из облачной базы --</option>';
            const list = APP_CONFIG[map[id]] || [];
            list.forEach(v => {
                const opt = new Option(v, v);
                el.add(opt);
            });
        }
    }
}

function checkDualTemp() {
    const el = document.getElementById('equipment_select');
    if (el) {
        const zone = document.getElementById('dual_temp_zone');
        if (zone) zone.style.display = el.value.toLowerCase().includes('комби') ? 'flex' : 'none';
    }
}

function handleRole(el) { 
    if (el.value === 'admin') document.getElementById('loginModal').style.display = 'flex'; 
}

function closeModals() { 
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); 
}

function checkLogin() {
    const passInput = document.getElementById('inputPassword').value;
    if (passInput === APP_CONFIG.adminPassword) {
        const currentTheme = getSettings().theme;
        localStorage.setItem('pronto_settings', JSON.stringify({role: 'admin', theme: currentTheme}));
        closeModals(); navigate('settings');
    } else {
        alert("❌ Ошибка доступа: Мастер-пароль не совпадает!");
    }
}

function saveNewCredentials() {
    const p = document.getElementById('newPassword').value.trim();
    if (p.length < 3) return alert("⚠️ Критическая ошибка: Пароль слишком короткий!");
    APP_CONFIG.adminPassword = p;
    syncToCloud(); 
    closeModals();
    alert("✅ Новый ключ администратора успешно сохранен в Google Firebase!");
}

function saveSettings() {
    const r = document.getElementById('role_select').value;
    const t = document.getElementById('theme_select').value;
    localStorage.setItem('pronto_settings', JSON.stringify({role: r, theme: t}));
    applyTheme(); navigate('home');
}

function handleFile(input) {
    const f = input.files[0];
    if (f) {
        const r = new FileReader();
        r.onload = e => {
            uploadedImageBase64 = e.target.result;
            const img = document.getElementById('preview_img');
            if (img) { img.src = uploadedImageBase64; img.style.display = 'block'; }
            const txt = document.getElementById('img_text');
            if (txt) txt.style.display = 'none';
        };
        r.readAsDataURL(f);
    }
}

function saveToArchive() {
    const arc = getArchive();
    const data = {
        tz_no: document.getElementById('tz_no').value || 'Б/Н',
        eq: document.getElementById('equipment_select').value,
        manager: document.getElementById('manager_name').value || 'Не указан',
        date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
        image: uploadedImageBase64
    };
    arc.unshift(data);
    localStorage.setItem('pronto_archive', JSON.stringify(arc));
    navigate('home');
    alert("✅ Проект успешно помещен в архив!");
}

// --- 7. ГЕНЕРАТОР PDF (SCALE 3 HD) ---
async function genPDF() {
    const el = document.querySelector('.document-sheet');
    const footer = document.querySelector('.footer-btns');
    const closeBtn = document.querySelector('.close-x');
    
    // Скрываем элементы интерфейса перед созданием документа
    if (footer) footer.style.display = 'none';
    if (closeBtn) closeBtn.style.display = 'none';

    try {
        const canvas = await html2canvas(el, { 
            scale: 3, // Высочайшее HD разрешение (300 DPI)
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`PRONTO_SPEC_№${document.getElementById('tz_no').value || 'NEW'}.pdf`);
    } catch (err) {
        alert("Критическая ошибка экспорта: " + err);
    } finally {
        if (footer) footer.style.display = 'flex';
        if (closeBtn) closeBtn.style.display = 'block';
    }
}

function deleteFromArchive(i) {
    if(confirm('Удалить проект из облачной памяти навсегда?')) {
        const arc = getArchive(); arc.splice(i, 1);
        localStorage.setItem('pronto_archive', JSON.stringify(arc));
        navigate('home');
    }
}

function createNewTZ() { 
    uploadedImageBase64 = null; 
    navigate('template'); 
}


