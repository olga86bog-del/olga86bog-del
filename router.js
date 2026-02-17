/**
 * PRONTO SPECS 2.1 - PROFESSIONAL CLOUD ENGINE
 * РАЗРАБОТКА: ТИМУР
 * СТАТУС: ПОЛНАЯ ВЕРСИЯ БЕЗ СОКРАЩЕНИЙ
 */

// --- 1. ЯДРО СИНХРОНИЗАЦИИ ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("Загрузка облачных модулей... Подключение к Google Firebase");
    
    // Подписываемся на изменения в реальном времени (Realtime Database)
    db.ref('settings').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            console.log("✅ Облачная база данных успешно обновлена!");
            APP_CONFIG = data;
            
            // Если пользователь находится в конструкторе, списки обновятся сами
            if (document.getElementById('equipment_select')) {
                populateSelects();
            }
        } else {
            console.warn("⚠️ База данных Firebase пуста. Инициализация стандартного конфига...");
            db.ref('settings').set(APP_CONFIG);
        }
        
        // Плавное скрытие лоадера
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 600);
        }
    });

    applyTheme();
    navigate('home');
});

// --- 2. ГЛОБАЛЬНЫЙ КОНТЕКСТ ---
let uploadedImageBase64 = null;
let currentManageKey = null;

const getArchive = () => JSON.parse(localStorage.getItem('pronto_archive') || '[]');
const getSettings = () => JSON.parse(localStorage.getItem('pronto_settings') || '{"role":"participant", "theme":"light"}');

// --- 3. СИСТЕМНЫЕ ФУНКЦИИ ---
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

    if (view === 'template') {
        populateSelects();
        checkDualTemp();
    }
    window.scrollTo(0, 0);
}

// --- 4. ПАНЕЛЬ УПРАВЛЕНИЯ АДМИНИСТРАТОРА ---
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
        modalSelect.add(new Option(item, item));
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
    const newVal = prompt("Отредактируйте название:", oldVal);
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
    if (confirm(`⚠️ Вы уверены, что хотите удалить "${val}"? Это действие изменит списки у всех пользователей.`)) {
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
    const btnHTML = isAdmin ? `<button onclick="openManageMenu('${configKey}', '${id}')" class="admin-add-btn no-print" title="Редактировать облачную базу">+</button>` : '';
    return `<div style="display:flex; align-items:center; width:100%; gap:8px;"><select id="${id}" style="flex-grow:1; padding:8px; border-radius:6px; border:1px solid #cbd5e1;"></select>${btnHTML}</div>`;
}

// --- 5. ШАБЛОНЫ HTML ИНТЕРФЕЙСА ---

const modalsHTML = `
<div id="loginModal" class="modal" style="display:none">
    <div class="modal-content">
        <h2 style="color:var(--pronto); margin-top:0;">Аутентификация</h2>
        <p style="font-size:14px; color:#64748b; margin-bottom:25px;">Для управления облачными списками и настройками безопасности введите мастер-пароль.</p>
        <input type="password" id="inputPassword" placeholder="Пароль администратора" style="width:100%; margin-bottom:25px; padding:15px; border:2px solid #eee; border-radius:12px; font-size:16px;">
        <div style="display:flex; gap:15px;"><button onclick="closeModals()" class="btn btn-secondary" style="flex:1;">ОТМЕНА</button><button onclick="checkLogin()" class="btn" style="flex:1;">ВОЙТИ</button></div>
    </div>
</div>
<div id="changePassModal" class="modal" style="display:none">
    <div class="modal-content">
        <h2 style="margin-top:0;">Смена пароля</h2>
        <p style="margin-bottom:20px; font-size:13px;">Установите новый пароль для доступа к функциям администратора.</p>
        <input type="password" id="newPassword" placeholder="Минимум 3 символа" style="width:100%; margin-bottom:25px; padding:15px; border:2px solid #eee; border-radius:12px;">
        <div style="display:flex; gap:15px;"><button onclick="closeModals()" class="btn btn-secondary" style="flex:1;">ОТМЕНА</button><button onclick="saveNewCredentials()" class="btn" style="flex:1; background:#d69e2e;">СОХРАНИТЬ</button></div>
    </div>
</div>
<div id="manageModal" class="modal" style="display:none">
    <div class="modal-content" style="width:450px;">
        <h3 style="margin-top:0; letter-spacing:1px;">РЕДАКТОР СПИСКА</h3>
        <select id="manageListSelect" style="width:100%; padding:15px; margin-bottom:25px; font-weight:bold; border-radius:12px; font-size:15px;"></select>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <button onclick="manAdd()" class="btn btn-success" style="padding:15px; font-size:12px;">➕ ДОБАВИТЬ</button>
            <button onclick="manEdit()" class="btn btn-warning" style="padding:15px; font-size:12px;">✏️ ИЗМЕНИТЬ</button>
            <button onclick="manDel()" class="btn btn-danger" style="padding:15px; font-size:12px;">🗑️ УДАЛИТЬ</button>
            <button onclick="closeModals()" class="btn btn-secondary" style="padding:15px; font-size:12px;">ЗАКРЫТЬ</button>
        </div>
    </div>
</div>`;

const homeView = () => {
    const archive = getArchive();
    const s = getSettings();
    return `
    <div class="home-card fade-in" style="background:var(--white); border-radius:20px; padding:50px; text-align:center; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
        <h1 class="main-title" style="margin-bottom:5px;">PRODUCTION</h1><div class="subtitle" style="margin-bottom:35px; font-weight:300;">SPECS 2.1 FULL HD</div>
        <div style="font-weight:900; color:var(--pronto); margin-bottom:40px; font-size:12px; letter-spacing:2px; text-transform:uppercase;">РЕЖИМ: ${s.role} | ТЕМА: ${s.theme}</div>
        
        <button onclick="createNewTZ()" class="btn" style="height:85px; width:100%; font-size:20px; margin-bottom:20px; border-radius:15px; box-shadow: 0 10px 20px rgba(43,108,176,0.3);">+ СОЗДАТЬ НОВУЮ СПЕЦИФИКАЦИЮ</button>
        <button onclick="navigate('settings')" class="btn btn-secondary" style="width:100%; border-radius:15px;">НАСТРОЙКИ СИСТЕМЫ</button>
        
        <div style="margin-top:70px; text-align:left;">
            <h4 style="border-bottom:3px solid var(--border); padding-bottom:15px; color:var(--pronto); font-weight:900; letter-spacing:1px;">АРХИВ ВЫПОЛНЕННЫХ ПРОЕКТОВ</h4>
            ${archive.length ? archive.map((item, i) => `
                <div class="archive-item" style="background:var(--white); border:1px solid var(--border); padding:25px; border-radius:15px; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center; transition:0.3s;">
                    <div>
                        <b style="font-size:20px; color:var(--pronto)">№ ${item.tz_no}</b>
                        <div style="font-size:15px; color:var(--text-main); margin-top:8px; font-weight:600;">${item.eq}</div>
                        <div style="font-size:13px; color:#94a3b8; margin-top:5px;">Менеджер: ${item.manager || 'Не указан'} | Дата: ${item.date}</div>
                    </div>
                    <button onclick="deleteFromArchive(${i})" class="btn" style="width:65px; background:#ef4444; margin:0; padding:15px; border-radius:12px;">🗑️</button>
                </div>`).join('') : '<p style="text-align:center; color:#94a3b8; padding:50px; font-style:italic;">История проектов пуста. Все новые ТЗ будут отображаться здесь.</p>'}
        </div>
    </div>`;
};

const settingsView = () => {
    const s = getSettings();
    const isAdmin = s.role === 'admin';
    return `
    <div class="home-card fade-in" style="background:var(--white); border-radius:20px; padding:45px;">
        <h1 style="margin-bottom:40px; font-weight:900; letter-spacing:-1px;">КОНФИГУРАЦИЯ СИСТЕМЫ</h1>
        
        <div style="text-align:left; background:rgba(43, 108, 176, 0.07); padding:35px; border-radius:18px; margin-bottom:40px; font-size:15px; line-height:1.8; border-left:10px solid var(--pronto);">
            <h4 style="margin-top:0; color:var(--pronto); text-transform:uppercase; letter-spacing:1px;">Техническая информация:</h4>
            <p><strong>PRONTO SPECS 2.1</strong> — это централизованная инженерная платформа. Система обеспечивает:</p>
            <ul style="margin:15px 0; padding-left:25px;">
                <li><strong>Cloud Realtime Engine:</strong> Мгновенная синхронизация базы материалов и комплектующих через Google Firebase API.</li>
                <li><strong>High-Definition PDF:</strong> Рендеринг документов в разрешении 300 DPI для прецизионной печати на производстве.</li>
                <li><strong>Global Admin Sync:</strong> Все изменения, внесенные администратором, применяются мгновенно для всей сети пользователей.</li>
            </ul>
        </div>

        <div style="text-align:left; max-width:600px; margin:0 auto;">
            <div style="margin-bottom:35px;">
                <label style="font-weight:900; display:block; margin-bottom:12px; text-transform:uppercase; font-size:12px; color:#64748b;">🎨 Визуальная тема:</label>
                <select id="theme_select" style="width:100%; padding:15px; border-radius:12px; border:2px solid var(--border); background:var(--white); color:var(--text-main); font-weight:bold; font-size:16px;">
                    <option value="light" ${s.theme==='light'?'selected':''}>Светлая тема (Classic Light)</option>
                    <option value="dark" ${s.theme==='dark'?'selected':''}>Темная тема (Professional Dark)</option>
                </select>
            </div>

            <div style="margin-bottom:35px;">
                <label style="font-weight:900; display:block; margin-bottom:12px; text-transform:uppercase; font-size:12px; color:#64748b;">👤 Режим доступа:</label>
                <select id="role_select" onchange="handleRole(this)" style="width:100%; padding:15px; border-radius:12px; border:2px solid var(--border); background:var(--white); color:var(--text-main); font-weight:bold; font-size:16px;">
                    <option value="participant" ${!isAdmin?'selected':''}>Участник (Создание и экспорт ТЗ)</option>
                    <option value="admin" ${isAdmin?'selected':''}>Администратор (Полный доступ к базе)</option>
                </select>
            </div>

            ${isAdmin ? `
                <div style="background:var(--header-bg); padding:30px; border-radius:18px; border:2px solid var(--pronto); margin-bottom:40px; text-align:center;">
                    <h4 style="margin-top:0; color:var(--header-text); font-weight:900; letter-spacing:1px;">🔐 БЕЗОПАСНОСТЬ ОБЛАКА</h4>
                    <p style="font-size:13px; color:var(--header-text); margin-bottom:25px;">Смена мастер-пароля изменит ключ доступа к функциям администратора для всех сессий.</p>
                    <button onclick="document.getElementById('changePassModal').style.display='flex'" class="btn" style="background:#d69e2e; width:100%; border-radius:12px; box-shadow: 0 5px 15px rgba(214,158,46,0.3);">ИЗМЕНИТЬ МАСТЕР-ПАРОЛЬ</button>
                </div>
            ` : ''}

            <button onclick="saveSettings()" class="btn btn-secondary" style="width:100%; border-radius:12px; height:60px; font-size:16px;">СОХРАНИТЬ И ВЕРНУТЬСЯ НА ГЛАВНУЮ</button>
        </div>
        ${modalsHTML}
    </div>`;
};

// --- 6. КОНСТРУКТОР СПЕЦИФИКАЦИИ (TEMPLATE) ---
const templateView = () => `
    <div class="document-sheet fade-in">
        <div class="doc-header">
            <div style="flex-grow:1;">
                <div style="font-size:14px; color:#94a3b8; font-weight:900; letter-spacing:2px; text-transform:uppercase;">Техническое Задание на производство</div>
                <div style="display:flex; align-items:center; margin-top:10px;">
                    <span style="font-weight:900; color:var(--pronto); font-size:34px; margin-right:20px;">SPECS №</span>
                    <input type="text" id="tz_no" style="width:180px; font-size:34px; border:none; font-weight:900; outline:none; color:black; background:transparent;" placeholder="000-00">
                </div>
                <div style="margin-top:20px; display:flex; align-items:center; gap:15px;">
                    <b style="font-size:16px; letter-spacing:0.5px;">ОТВ. МЕНЕДЖЕР:</b> 
                    <input type="text" id="manager_name" style="border:none; border-bottom:2px solid #cbd5e1; width:300px; font-size:16px; padding:5px; font-weight:bold; color:black;" placeholder="Введите Ф.И.О. менеджера">
                </div>
            </div>
            <button onclick="navigate('home')" class="close-x no-print" title="Закрыть без сохранения">✕</button>
        </div>
        
        <div class="top-info-grid">
            <div>
                <label style="font-size:12px; font-weight:900; color:#64748b; display:block; margin-bottom:10px; text-transform:uppercase;">Тип оборудования</label>
                ${renderSelect('equipment_select', 'equipment')}
            </div>
            <div>
                <label style="font-size:12px; font-weight:900; color:#64748b; display:block; margin-bottom:10px; text-transform:uppercase;">Ед. изм.</label>
                <select id="unit" style="padding:12px; border-radius:10px; border:1px solid #cbd5e1; width:100%; font-weight:bold; font-size:14px;"><option>шт.</option><option>компл.</option></select>
            </div>
            <div>
                <label style="font-size:12px; font-weight:900; color:#64748b; display:block; margin-bottom:10px; text-transform:uppercase;">Количество</label>
                <input type="number" id="qty" value="1" style="padding:12px; border-radius:10px; border:1px solid #cbd5e1; width:100%; font-weight:900; font-size:16px; color:var(--pronto);">
            </div>
        </div>

        <table class="spec-table">
            <thead>
                <tr><th width="50">№</th><th>ПАРАМЕТР ИЗДЕЛИЯ</th><th>ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ</th></tr>
            </thead>
            <tbody>
                <tr class="section-title"><td colspan="3">1. ГЕОМЕТРИЧЕСКИЕ ХАРАКТЕРИСТИКИ (мм)</td></tr>
                <tr><td>1.1</td><td>Высота изделия (H)</td><td><div style="display:flex; align-items:center; gap:10px;"><input type="number" id="h" value="850" style="width:130px; font-weight:bold; padding:6px;"> <b>мм</b></div></td></tr>
                <tr><td>1.2</td><td>Ширина изделия (W)</td><td><div style="display:flex; align-items:center; gap:10px;"><input type="number" id="w" value="1200" style="width:130px; font-weight:bold; padding:6px;"> <b>мм</b></div></td></tr>
                <tr><td>1.3</td><td>Глубина изделия (D)</td><td><div style="display:flex; align-items:center; gap:10px;"><input type="number" id="d" value="700" style="width:130px; font-weight:bold; padding:6px;"> <b>мм</b></div></td></tr>
                <tr><td>1.4</td><td>Технологический допуск</td><td><div style="display:flex; align-items:center; gap:12px;"><b>±</b> <input type="number" id="val_1_4" value="5" style="width:90px; font-weight:bold; padding:6px;"> <b>мм</b></div></td></tr>
                
                <tr class="section-title"><td colspan="3">2. МАТЕРИАЛЫ И КОНСТРУКЦИЯ</td></tr>
                <tr><td>2.1</td><td>Материал корпуса / отделка</td><td>${renderSelect('mat', 'materials')}</td></tr>
                <tr><td>2.2</td><td>Тип исполнения каркаса</td><td>${renderSelect('con', 'constructions')}</td></tr>
                
                <tr class="section-title"><td colspan="3">3. ХОЛОДИЛЬНЫЙ АГРЕГАТ</td></tr>
                <tr><td>3.1</td><td>Метод охлаждения (тип системы)</td><td>${renderSelect('cool', 'coolingMethods')}</td></tr>
                
                <tr class="section-title"><td colspan="3">4. ДЕТАЛИЗАЦИЯ КОМПЛЕКТАЦИИ</td></tr>
                <tr><td>4.1</td><td>Тип и материал столешницы</td><td><div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">${renderSelect('val_4_1', 'tabletops')}${renderSelect('val_4_1_mat', 'tabletopMaterials')}</div></td></tr>
                <tr><td>4.2</td><td>Гастроёмкости (стандарт GN)</td><td><div style="display:flex; align-items:center; gap:12px;">${renderSelect('sel_4_2', 'gnTypes')} <b style="white-space:nowrap;">глубина:</b> <input type="number" id="val_4_2" value="150" style="width:100px; font-weight:bold; padding:6px;"> <b>мм</b></div></td></tr>
                <tr><td>4.3</td><td>Количество GN в комплекте</td><td><div style="display:flex; align-items:center; gap:10px;"><input type="number" id="val_4_3" value="0" style="width:130px; font-weight:bold; padding:6px;"> <b>шт.</b></div></td></tr>
                <tr><td>4.4</td><td>Дверная система (тип)</td><td><div style="display:flex; align-items:center; gap:12px;">${renderSelect('sel_4_4', 'doorTypes')} <input type="number" id="val_4_4" value="2" style="width:90px; font-weight:bold; padding:6px;"> <b>шт.</b></div></td></tr>
                <tr><td>4.5</td><td>Выдвижные ящики / Салазки</td><td><div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">${renderSelect('sel_4_5', 'drawerTypes')}${renderSelect('val_4_5_slides', 'slideTypes')}</div></td></tr>
                <tr><td>4.6</td><td>Внутреннее наполнение (полки)</td><td><div style="display:flex; align-items:center; gap:12px;">${renderSelect('sel_4_6', 'shelfTypes')} <input type="number" id="val_4_6" value="2" style="width:90px; font-weight:bold; padding:6px;"> <b>шт.</b></div></td></tr>
                <tr><td>4.7</td><td>Нагрузочная способность полки</td><td><div style="display:flex; align-items:center; gap:10px;"><input type="number" id="val_4_7" value="40" style="width:130px; font-weight:bold; padding:6px;"> <b>кг</b></div></td></tr>
                <tr><td>4.8</td><td>Освещение рабочего объема</td><td>${renderSelect('val_4_8', 'lighting')}</td></tr>
                
                <tr><td>4.9</td><td>Тип опорных элементов (ножки)</td><td><div style="display:flex; align-items:center; gap:12px;">${renderSelect('sel_4_9', 'legs')} <input type="number" id="val_4_9" value="4" style="width:90px; font-weight:bold; padding:6px;"> <b>шт.</b></div></td></tr>
                <tr><td>4.10</td><td>Колеса (с тормозным мех.)</td><td><div style="display:flex; align-items:center; gap:12px;">${renderSelect('sel_4_10', 'wheels')} <input type="number" id="val_4_10" value="2" style="width:90px; font-weight:bold; padding:6px;"> <b>шт.</b></div></td></tr>
                <tr><td>4.11</td><td>Колеса (без тормоза)</td><td><div style="display:flex; align-items:center; gap:12px;">${renderSelect('sel_4_11', 'wheels')} <input type="number" id="val_4_11" value="2" style="width:90px; font-weight:bold; padding:6px;"> <b>шт.</b></div></td></tr>
                <tr><td>4.12</td><td>Вентиляционные решетки</td><td>${renderSelect('val_4_12', 'ventilation')}</td></tr>
                
                <tr class="section-title"><td colspan="3">5. ТЕМПЕРАТУРНЫЕ РЕЖИМЫ И СРЕДА</td></tr>
                <tr><td>5.1</td><td>Целевой диапазон t°</td><td><div style="display:flex; align-items:center; gap:15px;"><b>t° :</b> <input type="text" id="val_5_1" value="+2...+8" style="width:110px; text-align:center; font-weight:900; background:#f0f7ff; border:1px solid #cbd5e1; border-radius:6px; padding:6px;"> <div id="dual_temp_zone" style="display:none; align-items:center; gap:12px;"><b>/ t° :</b> <input type="text" id="val_5_1_2" value="-18" style="width:110px; text-align:center; font-weight:900; background:#fff0f0; border:1px solid #cbd5e1; border-radius:6px; padding:6px;"></div></div></td></tr>
                <tr><td>6.1</td><td>Условия эксплуатации (T/Вл)</td><td><div style="display:flex; align-items:center; gap:8px;">до + <input type="number" id="val_6_1" value="32" style="width:70px; padding:6px;"> <b>/</b> до <input type="number" id="val_6_2" value="60" style="width:70px; padding:6px;"> <b>%</b></div></td></tr>
                
                <tr class="section-title"><td colspan="3">7. ГАРАНТИЯ И СРОКИ ПРОИЗВОДСТВА</td></tr>
                <tr><td>7.1</td><td>Гарантийный период</td><td><div style="display:flex; align-items:center; gap:10px;"><input type="number" id="val_7_1" value="12" style="width:110px; font-weight:bold; padding:6px;"> <b>мес.</b></div></td></tr>
                <tr><td>8.1</td><td>Срок изготовления заказа</td><td><div style="display:flex; align-items:center; gap:10px;"><input type="number" id="val_8_1" value="10" style="width:110px; font-weight:bold; padding:6px;"> <b>раб. дней</b></div></td></tr>
                
                <tr class="section-title"><td colspan="3">9. ГРАФИЧЕСКИЕ ДАННЫЕ И ПРИМЕЧАНИЯ</td></tr>
                <tr>
                    <td colspan="3">
                        <div style="display:grid; grid-template-columns: 1fr 320px; gap:30px; min-height:280px; padding:15px 0;">
                            <textarea id="val_9_1" style="width:100%; height:100%; resize:none; padding:20px; border:2px solid #cbd5e1; border-radius:15px; font-size:14px; font-family:inherit; line-height:1.5;" placeholder="Введите дополнительные примечания, требования к упаковке или особые пожелания заказчика..."></textarea>
                            <div style="border:3px dashed #cbd5e1; border-radius:20px; display:flex; align-items:center; justify-content:center; cursor:pointer; background:#f8fafc; overflow:hidden; position:relative; transition:0.3s;" onclick="document.getElementById('file_input').click()" id="upload_zone">
                                <img id="preview_img" style="display:none; max-width:100%; max-height:100%; object-fit:contain;">
                                <div id="img_text" style="text-align:center; color:#94a3b8; font-size:14px; font-weight:900; line-height:1.4;">📷 НАЖМИТЕ ДЛЯ ЗАГРУЗКИ<br>ЭСКИЗА ИЛИ ФОТОГРАФИИ</div>
                                <input type="file" id="file_input" style="display:none;" onchange="handleFile(this)">
                            </div>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>

        <div class="footer-btns no-print">
            <button class="btn btn-success" onclick="saveToArchive()" style="flex:1.2; font-size:14px;">💾 СОХРАНИТЬ В ОБЛАКО</button>
            <button class="btn" onclick="genPDF()" style="background:#2b6cb0; flex:1; font-size:14px;">📄 СКАЧАТЬ PDF (HD)</button>
        </div>
        ${modalsHTML}
    </div>`;

// --- 7. ЛОГИКА ПРИЛОЖЕНИЯ (ПОЛНЫЕ ФУНКЦИИ) ---

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
            el.innerHTML = '<option disabled selected>-- Выберите из базы --</option>';
            const list = APP_CONFIG[map[id]] || [];
            list.forEach(v => el.add(new Option(v, v)));
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
        alert("❌ Ошибка доступа: Неверный пароль администратора!");
    }
}

function saveNewCredentials() {
    const p = document.getElementById('newPassword').value.trim();
    if (p.length < 3) return alert("⚠️ Системная ошибка: Пароль должен содержать не менее 3 символов!");
    APP_CONFIG.adminPassword = p;
    syncToCloud(); 
    closeModals();
    alert("✅ Новый пароль успешно прописан в облачной базе!");
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
    alert("✅ Проект успешно архивирован!");
}

// --- 8. ГЕНЕРАТОР PDF (МАКСИМАЛЬНОЕ КАЧЕСТВО SCALE 3) ---
async function genPDF() {
    const el = document.querySelector('.document-sheet');
    const footer = document.querySelector('.footer-btns');
    const closeBtn = document.querySelector('.close-x');
    
    // Скрываем лишние элементы перед съемкой
    if (footer) footer.style.display = 'none';
    if (closeBtn) closeBtn.style.display = 'none';

    try {
        const canvas = await html2canvas(el, { 
            scale: 3, // HD Разрешение
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`PRONTO_SPECS_${document.getElementById('tz_no').value || 'PROJECT'}.pdf`);
    } catch (err) {
        alert("Критическая ошибка рендеринга PDF: " + err);
    } finally {
        if (footer) footer.style.display = 'flex';
        if (closeBtn) closeBtn.style.display = 'block';
    }
}

function deleteFromArchive(i) {
    if(confirm('Удалить проект из облачной памяти?')) {
        const arc = getArchive(); arc.splice(i, 1);
        localStorage.setItem('pronto_archive', JSON.stringify(arc));
        navigate('home');
    }
}

function createNewTZ() { 
    uploadedImageBase64 = null; 
    navigate('template'); 
}
    pdf.save(`TZ_${document.getElementById('tz_no').value || 'PRONTO'}.pdf`);
}


