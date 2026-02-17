/**
 * PRONTO SPECS - ПРОФЕССИОНАЛЬНАЯ ИНЖЕНЕРНАЯ СИСТЕМА
 * Версия: 2.1 (Cloud Sync + HD PDF)
 * Разработчик: Тимур
 */

// --- 1. ИНИЦИАЛИЗАЦИЯ И ЖИВАЯ СИНХРОНИЗАЦИЯ ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("Система запущена. Подключение к облаку...");
    
    // Используем .on('value') для мгновенного обновления у всех пользователей
    db.ref('settings').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            console.log("🔄 Данные синхронизированы!");
            APP_CONFIG = data;
            // Обновляем текущий вид, если нужно
            if (document.getElementById('equipment_select')) {
                populateSelects();
            }
        } else {
            console.warn("База пуста. Инициализация стандартных настроек...");
            db.ref('settings').set(APP_CONFIG);
        }
        hideLoader();
    });

    applyTheme();
    navigate('home');
});

// --- 2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ИНТЕРФЕЙСА ---
function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
    }
}

function navigate(view) {
    const app = document.getElementById('app');
    if (!app) return;

    switch(view) {
        case 'home': app.innerHTML = homeView(); break;
        case 'settings': app.innerHTML = settingsView(); break;
        case 'template': app.innerHTML = templateView(); break;
        default: app.innerHTML = homeView();
    }

    if (view === 'template') {
        populateSelects();
        checkDualTemp();
    }
    window.scrollTo(0, 0);
}

// --- 3. ГЛОБАЛЬНОЕ СОСТОЯНИЕ ---
let uploadedImageBase64 = null;
let currentManageKey = null;

const getArchive = () => JSON.parse(localStorage.getItem('pronto_archive') || '[]');
const getSettings = () => JSON.parse(localStorage.getItem('pronto_settings') || '{"role":"participant", "theme":"light"}');

function applyTheme() {
    const s = getSettings();
    document.body.className = s.theme === 'dark' ? 'dark-theme' : '';
}

// --- 4. ОБЛАЧНАЯ ЛОГИКА ---
function syncToCloud() {
    db.ref('settings').set(APP_CONFIG)
        .then(() => console.log("💾 Облако обновлено"))
        .catch((err) => alert("Ошибка связи: " + err));
}

function saveNewCredentials() {
    const p = document.getElementById('newPassword').value.trim();
    if (p.length < 3) return alert("Пароль слишком короткий!");
    
    APP_CONFIG.adminPassword = p;
    syncToCloud();
    alert("Пароль успешно изменен!");
    closeModals();
}

// --- 5. УПРАВЛЕНИЕ СПИСКАМИ ---
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
    const list = APP_CONFIG[currentManageKey] || [];
    list.forEach(item => modalSelect.add(new Option(item, item)));
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
    if (confirm(`Удалить "${val}" из базы?`)) {
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
    const btnHTML = isAdmin ? `<button onclick="openManageMenu('${configKey}', '${id}')" class="admin-add-btn no-print">+</button>` : '';
    return `<div style="display:flex; align-items:center; width:100%; gap:5px;"><select id="${id}" style="flex-grow:1;"></select>${btnHTML}</div>`;
}

// --- 6. ШАБЛОНЫ ПРЕДСТАВЛЕНИЙ (VIEWS) ---
const modalsHTML = `
<div id="loginModal" class="modal" style="display:none">
    <div class="modal-content">
        <h3 style="color:var(--pronto)">Вход в систему</h3>
        <input type="password" id="inputPassword" placeholder="Пароль" style="width:100%; margin-bottom:15px; padding:10px;">
        <div style="display:flex; gap:10px;"><button onclick="closeModals()" class="btn btn-secondary">Отмена</button><button onclick="checkLogin()" class="btn">Войти</button></div>
    </div>
</div>
<div id="changePassModal" class="modal" style="display:none">
    <div class="modal-content">
        <h3>Новый пароль</h3>
        <input type="password" id="newPassword" placeholder="Мин. 3 символа" style="width:100%; margin-bottom:15px; padding:10px;">
        <div style="display:flex; gap:10px;"><button onclick="closeModals()" class="btn btn-secondary">Отмена</button><button onclick="saveNewCredentials()" class="btn">Сохранить</button></div>
    </div>
</div>
<div id="manageModal" class="modal" style="display:none">
    <div class="modal-content">
        <h3>Управление списком</h3>
        <select id="manageListSelect" style="width:100%; padding:10px; margin-bottom:15px; font-weight:bold;"></select>
        <div style="display:flex; flex-direction:column; gap:8px;">
            <button onclick="manAdd()" class="btn btn-success">➕ Добавить</button>
            <button onclick="manEdit()" class="btn btn-warning">✏️ Изменить</button>
            <button onclick="manDel()" class="btn btn-danger">🗑️ Удалить</button>
            <button onclick="closeModals()" class="btn btn-secondary">Выйти</button>
        </div>
    </div>
</div>`;

const homeView = () => {
    const arc = getArchive();
    const s = getSettings();
    return `
    <div class="home-card fade-in">
        <h1 class="main-title">PRODUCTION</h1><div class="subtitle">SPECS 2.1</div>
        <div style="font-weight:bold; color:var(--pronto); margin-bottom:20px;">РЕЖИМ: ${s.role.toUpperCase()}</div>
        <button onclick="navigate('template')" class="btn" style="height:60px;">+ СОЗДАТЬ НОВОЕ ТЗ</button>
        <button onclick="navigate('settings')" class="btn btn-secondary">НАСТРОЙКИ</button>
        <div style="margin-top:40px; text-align:left;">
            <h4>АРХИВ ПРОЕКТОВ</h4>
            ${arc.length ? arc.map((item, i) => `
                <div class="archive-item">
                    <div class="archive-info"><b>№ ${item.tz_no}</b><div>${item.eq}</div><small>${item.date}</small></div>
                    <button onclick="deleteFromArchive(${i})" class="btn" style="width:40px; background:red; margin:0;">🗑️</button>
                </div>`).join('') : '<p style="text-align:center; color:#ccc;">Архив пуст</p>'}
        </div>
    </div>`;
};

const settingsView = () => {
    const s = getSettings();
    const isAdmin = s.role === 'admin';
    return `
    <div class="home-card fade-in">
        <h1>НАСТРОЙКИ СИСТЕМЫ</h1>
        <div style="text-align:left; background:#f8fafc; padding:20px; border-radius:10px; font-size:14px; margin-bottom:25px; border-left:4px solid var(--pronto);">
            <p><strong>PRONTO SPECS</strong> — это инженерная экосистема для проектирования холодильного оборудования.</p>
            <ul style="padding-left:20px;">
                <li>Синхронизация с Google Firebase в режиме реального времени.</li>
                <li>Генерация PDF-документов высокого разрешения (HD).</li>
                <li>Управление базой материалов и комплектующих.</li>
            </ul>
        </div>
        <div style="margin-bottom:20px;">
            <label>Роль пользователя:</label>
            <select id="role_select" onchange="handleRole(this)" style="margin-top:10px; padding:10px;">
                <option value="participant" ${!isAdmin?'selected':''}>Участник</option>
                <option value="admin" ${isAdmin?'selected':''}>Администратор</option>
            </select>
        </div>
        ${isAdmin ? `
            <div style="border:2px dashed var(--pronto); padding:20px; border-radius:10px; margin-bottom:20px;">
                <h4 style="margin-top:0;">Панель Администратора</h4>
                <button onclick="document.getElementById('changePassModal').style.display='flex'" class="btn" style="background:#d69e2e">🔐 СМЕНИТЬ ПАРОЛЬ</button>
            </div>
        ` : ''}
        <button onclick="saveSettings()" class="btn btn-secondary">← СОХРАНИТЬ И ВЫЙТИ</button>
        ${modalsHTML}
    </div>`;
};

// --- ВОТ ОНА, ТВОЯ ПОЛНАЯ ТАБЛИЦА (НИ ЕДИНОЙ СОКРАЩЕННОЙ СТРОКИ) ---
const templateView = () => `
    <div class="document-sheet fade-in">
        <div class="doc-header">
            <div style="flex-grow:1;">
                <div style="font-size:12px; color:#94a3b8; font-weight:bold;">ТЕХНИЧЕСКОЕ ЗАДАНИЕ</div>
                <div style="display:flex; align-items:center;">
                    <span style="font-weight:900; color:var(--pronto); font-size:24px; margin-right:10px;">SPECS №</span>
                    <input type="text" id="tz_no" class="tz-number-input" placeholder="000-00">
                </div>
            </div>
            <button onclick="navigate('home')" class="no-print" style="background:none; border:none; font-size:24px; color:#cbd5e0; cursor:pointer;">✕</button>
        </div>
        
        <div class="top-info-grid">
            <div><label>ОБОРУДОВАНИЕ</label>${renderSelect('equipment_select', 'equipment')}</div>
            <div><label>ЕД. ИЗМ.</label><select id="unit"><option>шт.</option><option>компл.</option></select></div>
            <div><label>КОЛ-ВО</label><input type="number" id="qty" value="1"></div>
        </div>

        <table class="spec-table">
            <thead>
                <tr><th width="40">№</th><th>ПАРАМЕТР</th><th>ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ</th></tr>
            </thead>
            <tbody>
                <tr class="section-title"><td colspan="3">1. ВНЕШНИЕ ГАБАРИТЫ (мм)</td></tr>
                <tr><td>1.1</td><td>Высота (H)</td><td><input type="number" id="h" value="850"> мм</td></tr>
                <tr><td>1.2</td><td>Ширина (W)</td><td><input type="number" id="w" value="1200"> мм</td></tr>
                <tr><td>1.3</td><td>Глубина (D)</td><td><input type="number" id="d" value="700"> мм</td></tr>
                <tr><td>1.4</td><td>Допуск</td><td><div style="display:flex; align-items:center; gap:5px;"><span>±</span><input type="number" id="val_1_4" value="5" style="width:60px;"><span>мм</span></div></td></tr>
                
                <tr class="section-title"><td colspan="3">2. СПОСОБ ИСПОЛНЕНИЯ</td></tr>
                <tr><td>2.1</td><td>Материал</td><td>${renderSelect('mat', 'materials')}</td></tr>
                <tr><td>2.2</td><td>Конструкция</td><td>${renderSelect('con', 'constructions')}</td></tr>
                
                <tr class="section-title"><td colspan="3">3. МЕТОД ОХЛАЖДЕНИЯ</td></tr>
                <tr><td>3.1</td><td>Тип системы</td><td>${renderSelect('cool', 'coolingMethods')}</td></tr>
                
                <tr class="section-title"><td colspan="3">4. КОМПЛЕКТАЦИЯ</td></tr>
                <tr><td>4.1</td><td>Столешница</td><td><div style="display:flex; gap:5px;">${renderSelect('val_4_1', 'tabletops')}${renderSelect('val_4_1_mat', 'tabletopMaterials')}</div></td></tr>
                <tr><td>4.2</td><td>Гастроёмкости</td><td><div style="display:flex; align-items:center; gap:5px;">${renderSelect('sel_4_2', 'gnTypes')}<span>гл.</span><input type="number" id="val_4_2" value="150" style="width:60px;"><span>мм</span></div></td></tr>
                <tr><td>4.3</td><td>Количество GN</td><td><input type="number" id="val_4_3" value="0"> шт.</td></tr>
                <tr><td>4.4</td><td>Двери</td><td><div style="display:flex; align-items:center; gap:5px;">${renderSelect('sel_4_4', 'doorTypes')}<input type="number" id="val_4_4" value="2" style="width:60px;"><span>шт.</span></div></td></tr>
                <tr><td>4.5</td><td>Ящики / Салазки</td><td><div style="display:flex; gap:5px;">${renderSelect('sel_4_5', 'drawerTypes')}${renderSelect('val_4_5_slides', 'slideTypes')}</div></td></tr>
                <tr><td>4.6</td><td>Полки</td><td><div style="display:flex; align-items:center; gap:5px;">${renderSelect('sel_4_6', 'shelfTypes')}<input type="number" id="val_4_6" value="2" style="width:60px;"><span>шт.</span></div></td></tr>
                <tr><td>4.7</td><td>Нагрузка полки</td><td><input type="number" id="val_4_7" value="40"> кг</td></tr>
                <tr><td>4.8</td><td>Подсветка</td><td>${renderSelect('val_4_8', 'lighting')}</td></tr>
                <tr><td>4.9</td><td>Ножки</td><td><div style="display:flex; align-items:center; gap:5px;">${renderSelect('sel_4_9', 'legs')}<input type="number" id="val_4_9" value="4" style="width:60px;"><span>шт.</span></div></td></tr>
                <tr><td>4.10</td><td>Колеса (торм.)</td><td><div style="display:flex; align-items:center; gap:5px;">${renderSelect('sel_4_10', 'wheels')}<input type="number" id="val_4_10" value="2" style="width:60px;"><span>шт.</span></div></td></tr>
                <tr><td>4.11</td><td>Колеса (б/торм)</td><td><div style="display:flex; align-items:center; gap:5px;">${renderSelect('sel_4_11', 'wheels')}<input type="number" id="val_4_11" value="2" style="width:60px;"><span>шт.</span></div></td></tr>
                <tr><td>4.12</td><td>Вентиляция</td><td>${renderSelect('val_4_12', 'ventilation')}</td></tr>
                
                <tr class="section-title"><td colspan="3">5. ТЕМПЕРАТУРА</td></tr>
                <tr><td>5.1</td><td>Режим в камере</td><td><div style="display:flex; align-items:center; gap:10px;"><b>t°</b><input type="text" id="val_5_1" value="+2...+8" style="width:80px; text-align:center;"><div id="dual_temp_zone" style="display:none; align-items:center; gap:5px;"><b>/ t°</b><input type="text" id="val_5_1_2" value="-18" style="width:80px;"></div></div></td></tr>
                
                <tr class="section-title"><td colspan="3">6. СРЕДА / 7. ГАРАНТИЯ / 8. СРОК</td></tr>
                <tr><td>6.1</td><td>Условия (T/Вл)</td><td>+<input type="number" id="val_6_1" value="32" style="width:50px"> / <input type="number" id="val_6_2" value="60" style="width:50px"> %</td></tr>
                <tr><td>7.1</td><td>Гарантия</td><td><input type="number" id="val_7_1" value="12"> мес.</td></tr>
                <tr><td>8.1</td><td>Срок изг.</td><td><input type="number" id="val_8_1" value="10"> раб. дн.</td></tr>
                
                <tr class="section-title"><td colspan="3">9. ЭСКИЗ И ПРИМЕЧАНИЯ</td></tr>
                <tr>
                    <td colspan="3">
                        <div style="display:flex; gap:15px; height:180px;">
                            <textarea id="notes" style="flex:1; resize:none; padding:10px; border:1px solid #cbd5e1;" placeholder="Дополнительные примечания к ТЗ..."></textarea>
                            <div style="width:200px; border:2px dashed #cbd5e1; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="document.getElementById('file_input').click()">
                                <img id="preview_img" style="display:none; max-width:100%; max-height:100%;">
                                <span id="img_text">📷 ФОТО / ЭСКИЗ</span>
                                <input type="file" id="file_input" style="display:none;" onchange="handleFile(this)">
                            </div>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>

        <div class="footer-btns no-print">
            <button class="btn btn-success" onclick="saveToArchive()">💾 СОХРАНИТЬ В АРХИВ</button>
            <button class="btn" onclick="genPDF()">📄 СКАЧАТЬ PDF (HD)</button>
        </div>
        ${modalsHTML}
    </div>`;

// --- 7. ЛОГИКА ОБРАБОТКИ ДАННЫХ ---
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
            el.innerHTML = '<option disabled selected>Выбор</option>';
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
        localStorage.setItem('pronto_settings', JSON.stringify({role: 'admin', theme: 'light'}));
        closeModals(); navigate('settings');
    } else alert("Неверный пароль!");
}

function saveSettings() {
    const role = document.getElementById('role_select').value;
    localStorage.setItem('pronto_settings', JSON.stringify({role: role, theme: 'light'}));
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
    arc.unshift({
        tz_no: document.getElementById('tz_no').value || '?',
        eq: document.getElementById('equipment_select').value,
        date: new Date().toLocaleDateString()
    });
    localStorage.setItem('pronto_archive', JSON.stringify(arc));
    navigate('home');
}

function deleteFromArchive(i) {
    const arc = getArchive(); arc.splice(i, 1);
    localStorage.setItem('pronto_archive', JSON.stringify(arc));
    navigate('home');
}

// --- 8. PDF И ПЕЧАТЬ (HD КАЧЕСТВО) ---
async function genPDF() {
    const el = document.querySelector('.document-sheet');
    const footer = document.querySelector('.footer-btns');
    if (footer) footer.style.display = 'none'; // Скрываем кнопки перед съемкой

    // Качество scale: 3 делает PDF очень четким
    const canvas = await html2canvas(el, { scale: 3, useCORS: true });
    
    if (footer) footer.style.display = 'flex'; // Возвращаем кнопки

    const img = canvas.toDataURL('image/png');
    const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
    pdf.addImage(img, 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
    pdf.save(`TZ_${document.getElementById('tz_no').value || 'PRONTO'}.pdf`);
}

