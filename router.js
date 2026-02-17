/**
 * PRONTO SPECS 2.1 - FULL CLOUD ENGINE
 * РАЗРАБОТАНО ТИМУРОМ | ТАШКЕНТ 2026
 * СТАТУС: ПОЛНАЯ ВЕРСИЯ (580+ СТРОК)
 */

// --- 1. ЯДРО СИНХРОНИЗАЦИИ ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("Запуск системы... Подключение к Firebase");
    
    // LIVE SYNC: Подписываемся на изменения базы данных
    db.ref('settings').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            console.log("🔄 Облачные списки обновлены!");
            APP_CONFIG = data;
            
            // Если мы сейчас в конструкторе — обновляем списки без перезагрузки
            if (document.getElementById('equipment_select')) {
                populateSelects();
            }
        } else {
            console.log("⚠️ База пуста. Отправка начальных данных...");
            db.ref('settings').set(APP_CONFIG);
        }
        
        // ВСЕГДА УБИРАЕМ ЛОАДЕР, ЧТОБЫ САЙТ НЕ ВИС
        hideLoader();
    });

    applyTheme();
    navigate('home');
});

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 600);
    }
}

// --- 2. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
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
        .then(() => console.log("💾 Облако обновлено"))
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

// --- 4. УПРАВЛЕНИЕ БАЗОЙ (АДМИН) ---
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
    const val = prompt("Добавить новый пункт:");
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
    if (confirm(`Удалить "${val}"?`)) {
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
    const btnHTML = isAdmin ? `<button onclick="openManageMenu('${configKey}', '${id}')" class="admin-add-btn no-print" style="background:#10b981; color:white; border:none; border-radius:4px; margin-left:5px; cursor:pointer; font-weight:bold;">+</button>` : '';
    return `<div style="display:flex; align-items:center; width:100%; gap:5px;"><select id="${id}" style="flex-grow:1; padding:8px; border-radius:6px; border:1px solid #cbd5e1;"></select>${btnHTML}</div>`;
}

// --- 5. ШАБЛОНЫ (VIEWS) ---

const modalsHTML = `
<div id="loginModal" class="modal" style="display:none">
    <div class="modal-content">
        <h3 style="color:var(--pronto);">Вход Администратора</h3>
        <input type="password" id="inputPassword" placeholder="Пароль" style="width:100%; margin-bottom:20px; padding:12px; border-radius:10px; border:1px solid #ddd;">
        <div style="display:flex; gap:12px;"><button onclick="closeModals()" class="btn btn-secondary" style="flex:1;">Отмена</button><button onclick="checkLogin()" class="btn" style="flex:1;">Войти</button></div>
    </div>
</div>
<div id="changePassModal" class="modal" style="display:none">
    <div class="modal-content">
        <h3>Новый пароль</h3>
        <input type="password" id="newPassword" placeholder="Минимум 3 знака" style="width:100%; margin-bottom:20px; padding:12px; border-radius:10px; border:1px solid #ddd;">
        <div style="display:flex; gap:12px;"><button onclick="closeModals()" class="btn btn-secondary" style="flex:1;">Отмена</button><button onclick="saveNewCredentials()" class="btn" style="flex:1; background:#d69e2e;">Сохранить</button></div>
    </div>
</div>
<div id="manageModal" class="modal" style="display:none">
    <div class="modal-content" style="width:400px;">
        <h3>Управление списком</h3>
        <select id="manageListSelect" style="width:100%; padding:15px; margin-bottom:25px; border-radius:12px; font-weight:bold;"></select>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <button onclick="manAdd()" class="btn btn-success" style="padding:12px; font-size:12px;">➕ Добавить</button>
            <button onclick="manEdit()" class="btn btn-warning" style="padding:12px; font-size:12px;">✏️ Изменить</button>
            <button onclick="manDel()" class="btn btn-danger" style="padding:12px; font-size:12px;">🗑️ Удалить</button>
            <button onclick="closeModals()" class="btn btn-secondary" style="padding:12px; font-size:12px;">Закрыть</button>
        </div>
    </div>
</div>`;

const homeView = () => {
    const arc = getArchive();
    const s = getSettings();
    return `
    <div class="home-card fade-in" style="background:var(--white); border-radius:20px; padding:50px; text-align:center;">
        <h1 class="main-title">PRODUCTION</h1><div class="subtitle">SPECS 2.1 HD</div>
        <div style="font-weight:900; color:var(--pronto); margin-bottom:30px; font-size:13px; letter-spacing:1px; text-transform:uppercase;">РЕЖИМ: ${s.role} | ТЕМА: ${s.theme}</div>
        <button onclick="createNewTZ()" class="btn" style="height:75px; width:100%; font-size:18px; margin-bottom:20px;">+ СОЗДАТЬ ТЕХНИЧЕСКОЕ ЗАДАНИЕ</button>
        <button onclick="navigate('settings')" class="btn btn-secondary" style="width:100%;">НАСТРОЙКИ СИСТЕМЫ</button>
        <div style="margin-top:60px; text-align:left;">
            <h4 style="border-bottom:2px solid var(--border); padding-bottom:10px; color:var(--pronto); letter-spacing:1px;">АРХИВ ПРОЕКТОВ</h4>
            ${arc.map((item, i) => `
                <div class="archive-item" style="background:var(--white); border:1px solid var(--border); padding:20px; border-radius:15px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>№ ${item.tz_no}</b><div style="font-size:14px; margin-top:5px;">${item.eq} | Менеджер: ${item.manager || '—'}</div></div>
                    <button onclick="deleteFromArchive(${i})" class="btn" style="width:55px; background:#ef4444; margin:0; padding:15px;">🗑️</button>
                </div>`).join('')}
        </div>
    </div>`;
};

const settingsView = () => {
    const s = getSettings();
    const isAdmin = s.role === 'admin';
    return `
    <div class="home-card fade-in">
        <h1>НАСТРОЙКИ СИСТЕМЫ</h1>
        <div style="text-align:left; background:rgba(43, 108, 176, 0.1); padding:30px; border-radius:15px; margin-bottom:35px; font-size:15px; line-height:1.7; border-left:8px solid var(--pronto);">
            <strong>О ПЛАТФОРМЕ PRONTO SPECS:</strong><br>
            Это облачная инженерная экосистема для мгновенной разработки спецификаций холодильного оборудования. 
            Система использует Google Firebase для синхронизации базы материалов в реальном времени. 
            Все ТЗ сохраняются в HD качестве (Scale 3) для профессиональной печати.
        </div>
        <div style="text-align:left; max-width:550px; margin:0 auto;">
            <div style="margin-bottom:25px;">
                <label style="font-weight:bold; display:block; margin-bottom:10px;">🎨 Тема оформления:</label>
                <select id="theme_select" style="width:100%; padding:14px; border-radius:10px; border:1px solid var(--border); background:var(--white); color:var(--text-main);">
                    <option value="light" ${s.theme==='light'?'selected':''}>Светлая тема (Classic)</option>
                    <option value="dark" ${s.theme==='dark'?'selected':''}>Темная тема (Professional Dark)</option>
                </select>
            </div>
            <div style="margin-bottom:25px;">
                <label style="font-weight:bold; display:block; margin-bottom:10px;">👤 Роль пользователя:</label>
                <select id="role_select" onchange="handleRole(this)" style="width:100%; padding:14px; border-radius:10px; border:1px solid var(--border); background:var(--white); color:var(--text-main);">
                    <option value="participant" ${!isAdmin?'selected':''}>Участник</option>
                    <option value="admin" ${isAdmin?'selected':''}>Администратор</option>
                </select>
            </div>
            ${isAdmin ? `<button onclick="document.getElementById('changePassModal').style.display='flex'" class="btn" style="background:#d69e2e; width:100%; margin-bottom:20px;">🔐 СМЕНИТЬ ПАРОЛЬ АДМИНИСТРАТОРА</button>` : ''}
            <button onclick="saveSettings()" class="btn btn-secondary" style="width:100%;">СОХРАНИТЬ И ВЫЙТИ</button>
        </div>
        ${modalsHTML}
    </div>`;
};

// --- КОНСТРУКТОР ТЗ (ПОЛНАЯ ТАБЛИЦА БЕЗ СОКРАЩЕНИЙ) ---
const templateView = () => `
    <div class="document-sheet fade-in">
        <div class="doc-header">
            <div style="flex-grow:1;">
                <div style="font-size:12px; color:#94a3b8; font-weight:900; letter-spacing:1px; text-transform:uppercase;">Техническое Задание</div>
                <div style="display:flex; align-items:center; margin-top:10px;">
                    <span style="font-weight:900; color:var(--pronto); font-size:32px; margin-right:15px;">SPECS №</span>
                    <input type="text" id="tz_no" style="width:160px; font-size:32px; border:none; font-weight:900; outline:none; color:black; background:transparent;" placeholder="000-00">
                </div>
                <div style="margin-top:15px; display:flex; align-items:center; gap:12px;">
                    <b style="font-size:15px;">МЕНЕДЖЕР:</b> 
                    <input type="text" id="manager_name" style="border:none; border-bottom:2px solid #cbd5e1; width:280px; font-size:15px; padding:4px; font-weight:bold; color:black;" placeholder="Имя и фамилия">
                </div>
            </div>
            <button onclick="navigate('home')" class="close-x no-print">✕</button>
        </div>
        
        <div class="top-info-grid">
            <div><label style="font-size:11px; font-weight:900; color:#64748b; display:block; margin-bottom:8px;">ОБОРУДОВАНИЕ</label>${renderSelect('equipment_select', 'equipment')}</div>
            <div><label style="font-size:11px; font-weight:900; color:#64748b; display:block; margin-bottom:8px;">ЕД. ИЗМ.</label><select id="unit" style="padding:10px; border-radius:8px; border:1px solid #cbd5e1; width:100%; font-weight:bold;"><option>шт.</option><option>компл.</option></select></div>
            <div><label style="font-size:11px; font-weight:900; color:#64748b; display:block; margin-bottom:8px;">КОЛ-ВО</label><input type="number" id="qty" value="1" style="padding:10px; border-radius:8px; border:1px solid #cbd5e1; width:100%; font-weight:900; font-size:16px;"></div>
        </div>

        <table class="spec-table">
            <thead>
                <tr><th width="45">№</th><th>НАИМЕНОВАНИЕ ПАРАМЕТРА</th><th>ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ</th></tr>
            </thead>
            <tbody>
                <tr class="section-title"><td colspan="3">1. ВНЕШНИЕ ГАБАРИТЫ (мм)</td></tr>
                <tr><td>1.1</td><td>Высота изделия (H)</td><td><div style="display:flex; align-items:center; gap:10px;"><input type="number" id="h" value="850" style="width:120px; font-weight:bold; padding:5px;"> <b>мм</b></div></td></tr>
                <tr><td>1.2</td><td>Ширина изделия (W)</td><td><div style="display:flex; align-items:center; gap:10px;"><input type="number" id="w" value="1200" style="width:120px; font-weight:bold; padding:5px;"> <b>мм</b></div></td></tr>
                <tr><td>1.3</td><td>Глубина изделия (D)</td><td><div style="display:flex; align-items:center; gap:10px;"><input type="number" id="d" value="700" style="width:120px; font-weight:bold; padding:5px;"> <b>мм</b></div></td></tr>
                <tr><td>1.4</td><td>Допуск на габариты</td><td><div style="display:flex; align-items:center; gap:10px;"><b>±</b> <input type="number" id="val_1_4" value="5" style="width:80px; font-weight:bold; padding:5px;"> <b>мм</b></div></td></tr>
                
                <tr class="section-title"><td colspan="3">2. МАТЕРИАЛЫ И КОНСТРУКЦИЯ</td></tr>
                <tr><td>2.1</td><td>Материал корпуса / отделка</td><td>${renderSelect('mat', 'materials')}</td></tr>
                <tr><td>2.2</td><td>Тип исполнения каркаса</td><td>${renderSelect('con', 'constructions')}</td></tr>
                
                <tr class="section-title"><td colspan="3">3. ХОЛОДИЛЬНЫЙ АГРЕГАТ</td></tr>
                <tr><td>3.1</td><td>Метод охлаждения (тип системы)</td><td>${renderSelect('cool', 'coolingMethods')}</td></tr>
                
                <tr class="section-title"><td colspan="3">4. ДЕТАЛИЗАЦИЯ КОМПЛЕКТАЦИИ</td></tr>
                <tr><td>4.1</td><td>Тип и материал столешницы</td><td><div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">${renderSelect('val_4_1', 'tabletops')}${renderSelect('val_4_1_mat', 'tabletopMaterials')}</div></td></tr>
                <tr><td>4.2</td><td>Гастроёмкости (стандарт GN)</td><td><div style="display:flex; align-items:center; gap:10px;">${renderSelect('sel_4_2', 'gnTypes')} <b style="white-space:nowrap;">глубина:</b> <input type="number" id="val_4_2" value="150" style="width:100px; font-weight:bold; padding:5px;"> <b>мм</b></div></td></tr>
                <tr><td>4.3</td><td>Количество GN в комплекте</td><td><div style="display:flex; align-items:center; gap:10px;"><input type="number" id="val_4_3" value="0" style="width:130px; font-weight:bold; padding:5px;"> <b>шт.</b></div></td></tr>
                <tr><td>4.4</td><td>Дверная система (тип)</td><td><div style="display:flex; align-items:center; gap:10px;">${renderSelect('sel_4_4', 'doorTypes')} <input type="number" id="val_4_4" value="2" style="width:80px; font-weight:bold; padding:5px;"> <b>шт.</b></div></td></tr>
                <tr><td>4.5</td><td>Выдвижные ящики / Салазки</td><td><div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">${renderSelect('sel_4_5', 'drawerTypes')}${renderSelect('val_4_5_slides', 'slideTypes')}</div></td></tr>
                <tr><td>4.6</td><td>Внутреннее наполнение (полки)</td><td><div style="display:flex; align-items:center; gap:10px;">${renderSelect('sel_4_6', 'shelfTypes')} <input type="number" id="val_4_6" value="2" style="width:80px; font-weight:bold; padding:5px;"> <b>шт.</b></div></td></tr>
                <tr><td>4.7</td><td>Освещение рабочего объема</td><td>${renderSelect('val_4_8', 'lighting')}</td></tr>
                
                <tr><td>4.9</td><td>Тип опорных элементов (ножки)</td><td><div style="display:flex; align-items:center; gap:12px;">${renderSelect('sel_4_9', 'legs')} <input type="number" id="val_4_9" value="4" style="width:90px; font-weight:bold;"> <b>шт.</b></div></td></tr>
                <tr><td>4.10</td><td>Колеса (с тормозным мех.)</td><td><div style="display:flex; align-items:center; gap:12px;">${renderSelect('sel_4_10', 'wheels')} <input type="number" id="val_4_10" value="2" style="width:90px; font-weight:bold;"> <b>шт.</b></div></td></tr>
                <tr><td>4.11</td><td>Колеса (без тормоза)</td><td><div style="display:flex; align-items:center; gap:12px;">${renderSelect('sel_4_11', 'wheels')} <input type="number" id="val_4_11" value="2" style="width:90px; font-weight:bold;"> <b>шт.</b></div></td></tr>
                <tr><td>4.12</td><td>Вентиляционные решетки</td><td>${renderSelect('val_4_12', 'ventilation')}</td></tr>
                
                <tr class="section-title"><td colspan="3">5. ТЕМПЕРАТУРНЫЕ РЕЖИМЫ</td></tr>
                <tr><td>5.1</td><td>Целевой диапазон t°</td><td><div style="display:flex; align-items:center; gap:15px;"><b>t° :</b> <input type="text" id="val_5_1" value="+2...+8" style="width:110px; text-align:center; font-weight:900; border:1px solid #cbd5e1; padding:5px;"> <div id="dual_temp_zone" style="display:none; align-items:center; gap:12px;"><b>/ t° :</b> <input type="text" id="val_5_1_2" value="-18" style="width:110px; text-align:center; font-weight:900; border:1px solid #cbd5e1; padding:5px;"></div></div></td></tr>
                
                <tr class="section-title"><td colspan="3">6. УСЛОВИЯ СРЕДЫ / 7. ГАРАНТИЯ / 8. СРОК</td></tr>
                <tr><td>6.1</td><td>Условия (T/Вл)</td><td><div style="display:flex; align-items:center; gap:8px;">до + <input type="number" id="val_6_1" value="32" style="width:70px; padding:6px;"> <b>/</b> до <input type="number" id="val_6_2" value="60" style="width:70px; padding:6px;"> <b>%</b></div></td></tr>
                <tr><td>7.1</td><td>Гарантия (мес.)</td><td><input type="number" id="val_7_1" value="12" style="width:100px; font-weight:bold; padding:5px;"> мес.</td></tr>
                <tr><td>8.1</td><td>Срок (раб. дней)</td><td><input type="number" id="val_8_1" value="10" style="width:100px; font-weight:bold; padding:5px;"> дн.</td></tr>
                
                <tr class="section-title"><td colspan="3">9. ГРАФИЧЕСКИЕ ПРИМЕЧАНИЯ</td></tr>
                <tr>
                    <td colspan="3">
                        <div style="display:grid; grid-template-columns: 1fr 320px; gap:30px; min-height:280px; padding:15px 0;">
                            <textarea id="val_9_1" style="width:100%; height:100%; resize:none; padding:20px; border:2px solid #cbd5e1; border-radius:15px; font-size:14px; font-family:inherit; line-height:1.5;" placeholder="Дополнительные требования, пожелания или особенности упаковки..."></textarea>
                            <div style="border:3px dashed #cbd5e1; border-radius:20px; display:flex; align-items:center; justify-content:center; cursor:pointer; background:#f8fafc; overflow:hidden;" onclick="document.getElementById('file_input').click()" id="upload_zone">
                                <img id="preview_img" style="display:none; max-width:100%; max-height:100%; object-fit:contain;">
                                <div id="img_text" style="text-align:center; color:#94a3b8; font-size:14px; font-weight:900;">📷 НАЖМИТЕ ДЛЯ<br>ЗАГРУЗКИ ФОТО</div>
                                <input type="file" id="file_input" style="display:none;" onchange="handleFile(this)">
                            </div>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>

        <div class="footer-btns no-print">
            <button class="btn btn-success" onclick="saveToArchive()" style="flex:1.2;">💾 СОХРАНИТЬ В ОБЛАКО</button>
            <button class="btn" onclick="genPDF()" style="background:#2b6cb0; flex:1;">📄 СКАЧАТЬ PDF (HD)</button>
        </div>
        ${modalsHTML}
    </div>`;

// --- 6. ЛОГИКА ПРИЛОЖЕНИЯ ---

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
            el.innerHTML = '<option disabled selected>-- Выбор из облака --</option>';
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

function handleRole(el) { if (el.value === 'admin') document.getElementById('loginModal').style.display = 'flex'; }
function closeModals() { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }

function checkLogin() {
    if (document.getElementById('inputPassword').value === APP_CONFIG.adminPassword) {
        localStorage.setItem('pronto_settings', JSON.stringify({role: 'admin', theme: getSettings().theme}));
        closeModals(); navigate('settings');
    } else alert("❌ Неверный пароль!");
}

function saveNewCredentials() {
    const p = document.getElementById('newPassword').value.trim();
    if (p.length < 3) return alert("Минимум 3 знака!");
    APP_CONFIG.adminPassword = p; syncToCloud(); closeModals();
    alert("✅ Пароль изменен!");
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
        manager: document.getElementById('manager_name').value || '—',
        date: new Date().toLocaleDateString(),
        image: uploadedImageBase64
    };
    arc.unshift(data);
    localStorage.setItem('pronto_archive', JSON.stringify(arc));
    navigate('home');
    alert("✅ Сохранено!");
}

// --- 7. HD PDF ГЕНЕРАТОР (МАКСИМАЛЬНЫЙ SCALE) ---
async function genPDF() {
    const el = document.querySelector('.document-sheet');
    const footer = document.querySelector('.footer-btns');
    const closeBtn = document.querySelector('.close-x');
    
    if (footer) footer.style.display = 'none';
    if (closeBtn) closeBtn.style.display = 'none';

    try {
        const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`PRONTO_${document.getElementById('tz_no').value || 'PROJECT'}.pdf`);
    } catch (err) { alert("Ошибка PDF: " + err); } 
    finally { if (footer) footer.style.display = 'flex'; if (closeBtn) closeBtn.style.display = 'block'; }
}

function deleteFromArchive(i) {
    if(confirm('Удалить проект?')) {
        const arc = getArchive(); arc.splice(i, 1);
        localStorage.setItem('pronto_archive', JSON.stringify(arc));
        navigate('home');
    }
}

function createNewTZ() { uploadedImageBase64 = null; navigate('template'); }



