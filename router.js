// --- 1. СИНХРОНИЗАЦИЯ И ЗАПУСК ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("Стучимся в базу данных...");
    // Используем .on('value'), чтобы изменения у админа СРАЗУ появлялись у всех
    db.ref('settings').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            console.log("🔄 База обновлена!");
            APP_CONFIG = data;
            // Обновляем выпадающие списки, если мы на странице ТЗ
            if (document.getElementById('equipment_select')) populateSelects();
        } else {
            console.log("⚠️ База пустая. Инициализация...");
            db.ref('settings').set(APP_CONFIG);
        }
        hideLoader();
    });
    applyTheme();
    navigate('home');
});

function hideLoader() {
    const loader = document.getElementById('loader');
    if(loader) { loader.style.opacity = '0'; setTimeout(() => loader.style.display = 'none', 500); }
}

function syncToCloud() {
    db.ref('settings').set(APP_CONFIG)
        .then(() => console.log("💾 Данные в Google!"))
        .catch((err) => alert("Ошибка облака: " + err));
}

// --- 2. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
let currentEditIndex = null;
let uploadedImageBase64 = null;
let currentManageKey = null;

const getArchive = () => JSON.parse(localStorage.getItem('pronto_archive') || '[]');
const getSettings = () => JSON.parse(localStorage.getItem('pronto_settings') || '{"role":"participant", "theme":"light"}');

function applyTheme() {
    const s = getSettings();
    document.body.className = s.theme === 'dark' ? 'dark-theme' : '';
}

function getList(key) { return APP_CONFIG[key] || []; }

// --- 3. УПРАВЛЕНИЕ СПИСКАМИ ---
function openManageMenu(key, selectId) {
    if (getSettings().role !== 'admin') return;
    currentManageKey = key;
    renderManageList();
    document.getElementById('manageModal').style.display = 'flex';
}

function renderManageList() {
    const modalSelect = document.getElementById('manageListSelect');
    if(!modalSelect) return;
    modalSelect.innerHTML = '';
    getList(currentManageKey).forEach(item => modalSelect.add(new Option(item, item)));
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
    if (confirm(`Удалить пункт "${val}"?`)) {
        const idx = APP_CONFIG[currentManageKey].indexOf(val);
        if (idx !== -1) {
            APP_CONFIG[currentManageKey].splice(idx, 1);
            refreshAfterChange();
        }
    }
}

function refreshAfterChange() {
    renderManageList();
    if(document.getElementById('equipment_select')) populateSelects();
    syncToCloud();
}

function renderSelect(id, configKey) {
    const isAdmin = getSettings().role === 'admin';
    const btnHTML = isAdmin ? `<button onclick="openManageMenu('${configKey}', '${id}')" class="admin-add-btn no-print">+</button>` : '';
    return `<div style="display:flex; align-items:center; width:100%; gap:5px;"><select id="${id}" style="flex-grow:1;"></select>${btnHTML}</div>`;
}

// --- 4. ШАБЛОНЫ И ИНТЕРФЕЙС ---
const modalsHTML = `
<div id="loginModal" class="modal" style="display:none">
    <div class="modal-content">
        <h3>Вход Админа</h3>
        <input type="password" id="inputPassword" placeholder="Пароль" style="width:100%; margin-bottom:15px; padding:10px;">
        <div style="display:flex; gap:10px;"><button onclick="closeModals()" class="btn btn-secondary">Отмена</button><button onclick="checkLogin()" class="btn">Войти</button></div>
    </div>
</div>
<div id="changePassModal" class="modal" style="display:none">
    <div class="modal-content">
        <h3>Смена пароля</h3>
        <input type="password" id="newPassword" placeholder="Новый пароль" style="width:100%; margin-bottom:15px; padding:10px;">
        <div style="display:flex; gap:10px;"><button onclick="closeModals()" class="btn btn-secondary">Отмена</button><button onclick="saveNewCredentials()" class="btn">Сохранить</button></div>
    </div>
</div>
<div id="manageModal" class="modal" style="display:none">
    <div class="modal-content">
        <h3>Управление списком</h3>
        <select id="manageListSelect" style="width:100%; margin-bottom:20px;"></select>
        <button onclick="manAdd()" class="btn btn-success">➕ Добавить</button>
        <button onclick="manEdit()" class="btn btn-warning">✏️ Изменить</button>
        <button onclick="manDel()" class="btn btn-danger">🗑️ Удалить</button>
        <button onclick="closeModals()" class="btn btn-secondary">Выйти</button>
    </div>
</div>
`;

function navigate(v) {
    const app = document.getElementById('app');
    if(!app) return;
    if(v==='template') app.innerHTML = templateView();
    else if(v==='settings') app.innerHTML = settingsView();
    else app.innerHTML = homeView();
    if(v==='template') { populateSelects(); checkDualTemp(); }
    window.scrollTo(0,0);
}

const homeView = () => {
    const arc = getArchive();
    const s = getSettings();
    return `<div class="home-card fade-in">
        <h1 class="main-title">PRODUCTION</h1><div class="subtitle">SPECS</div>
        <div style="font-weight:bold; color:var(--pronto); margin-bottom:20px;">РЕЖИМ: ${s.role.toUpperCase()}</div>
        <button onclick="createNewTZ()" class="btn" style="height:60px;">+ СОЗДАТЬ НОВОЕ ТЗ</button>
        <button onclick="navigate('settings')" class="btn btn-secondary">НАСТРОЙКИ</button>
        <div style="margin-top:40px; text-align:left;">
            <h4>АРХИВ ПРОЕКТОВ</h4>
            ${arc.length ? arc.map((item, i) => `
                <div class="archive-item">
                    ${item.image ? `<img src="${item.image}" class="archive-thumb">` : `<div class="archive-thumb" style="padding-top:20px; text-align:center;">📷</div>`}
                    <div class="archive-info"><b>№ ${item.tz_no}</b><div>${item.eq}</div><small>${item.date}</small></div>
                    <div class="archive-controls">
                        <button onclick="deleteFromArchive(${i})" class="btn-tall btn-act-red">🗑️</button>
                        <button onclick="editFromArchive(${i})" class="btn-tall btn-act-green">📂</button>
                    </div>
                </div>`).join('') : '<p style="text-align:center; color:#ccc;">Архив пуст</p>'}
        </div>
    </div>`;
};

const settingsView = () => {
    const s = getSettings();
    const isAdmin = s.role === 'admin';
    return `<div class="home-card">
        <h1>НАСТРОЙКИ</h1>
        <label>Роль пользователя:</label>
        <select id="role_select" onchange="handleRole(this)" style="margin-bottom:20px;">
            <option value="participant" ${!isAdmin?'selected':''}>Участник</option>
            <option value="admin" ${isAdmin?'selected':''}>Администратор</option>
        </select>
        ${isAdmin ? `<button onclick="document.getElementById('changePassModal').style.display='flex'" class="btn" style="background:#d69e2e">🔐 СМЕНИТЬ ПАРОЛЬ</button>` : ''}
        <button onclick="saveSettings()" class="btn btn-secondary" style="margin-top:20px;">← ВЫЙТИ</button>
        ${modalsHTML}
    </div>`;
};

// --- ВОТ ОНА, ТВОЯ ПОЛНАЯ ТАБЛИЦА (НИЧЕГО НЕ ВЫРЕЗАНО) ---
const templateView = () => `
    <div class="document-sheet fade-in">
        <div class="doc-header">
            <div>
                <span style="font-weight:900; color:var(--pronto); font-size:24px;">SPECS №</span>
                <input type="text" id="tz_no" class="tz-number-input" placeholder="000-00">
            </div>
            <button onclick="navigate('home')" class="no-print" style="border:none; background:none; font-size:28px; color:#ccc; cursor:pointer;">✕</button>
        </div>
        <div class="top-info-grid">
            <div><label>ОБОРУДОВАНИЕ</label>${renderSelect('equipment_select', 'equipment')}</div>
            <div><label>ЕД. ИЗМ.</label><select id="unit"><option>шт.</option><option>компл.</option></select></div>
            <div><label>КОЛ-ВО</label><input type="number" id="qty" value="1"></div>
        </div>
        <table class="spec-table">
            <thead><tr><th width="40">№</th><th>ПАРАМЕТР</th><th>ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ</th></tr></thead>
            <tbody>
                <tr class="section-title"><td colspan="3">1. ВНЕШНИЕ ГАБАРИТЫ (мм)</td></tr>
                <tr><td>1.1</td><td>Высота (H)</td><td><div class="unit-box"><input type="number" id="val_1_1" value="850"><span>мм</span></div></td></tr>
                <tr><td>1.2</td><td>Ширина (W)</td><td><div class="unit-box"><input type="number" id="val_1_2" value="1200"><span>мм</span></div></td></tr>
                <tr><td>1.3</td><td>Глубина (D)</td><td><div class="unit-box"><input type="number" id="val_1_3" value="700"><span>мм</span></div></td></tr>
                <tr class="section-title"><td colspan="3">2. СПОСОБ ИСПОЛНЕНИЯ</td></tr>
                <tr><td>2.1</td><td>Материал / Тип</td><td><div style="display:flex; gap:10px;">${renderSelect('val_2_1_mat', 'materials')}${renderSelect('val_2_1_con', 'constructions')}</div></td></tr>
                <tr class="section-title"><td colspan="3">3. МЕТОД ОХЛАЖДЕНИЯ</td></tr>
                <tr><td>3.1</td><td>Тип системы</td><td>${renderSelect('val_3_1', 'coolingMethods')}</td></tr>
                <tr class="section-title"><td colspan="3">4. КОМПЛЕКТАЦИЯ</td></tr>
                <tr><td>4.1</td><td>Столешница</td><td><div style="display:flex; gap:10px;">${renderSelect('val_4_1', 'tabletops')}${renderSelect('val_4_1_mat', 'tabletopMaterials')}</div></td></tr>
                <tr><td>4.2</td><td>Гастроёмкости</td><td><div class="unit-box">${renderSelect('sel_4_2', 'gnTypes')}<span>гл.</span><input type="number" id="val_4_2" value="150" style="width:60px"><span>мм</span></div></td></tr>
                <tr><td>4.3</td><td>Количество GN</td><td><div class="unit-box"><input type="number" id="val_4_3" value="0"><span>шт.</span></div></td></tr>
                <tr><td>4.4</td><td>Двери</td><td><div class="unit-box">${renderSelect('sel_4_4', 'doorTypes')}<input type="number" id="val_4_4" value="2" style="width:60px"><span>шт.</span></div></td></tr>
                <tr><td>4.5</td><td>Ящики / Салазки</td><td><div class="compact-row">${renderSelect('sel_4_5', 'drawerTypes')}<input type="number" id="val_4_5" value="0"><span>шт.</span><b class="compact-sep">|</b>${renderSelect('val_4_5_slides', 'slideTypes')}<input type="number" id="val_4_5_slides_qty" value="0"><span>шт.</span></div></td></tr>
                <tr><td>4.6</td><td>Полки</td><td><div class="unit-box">${renderSelect('sel_4_6', 'shelfTypes')}<input type="number" id="val_4_6" value="2" style="width:60px"><span>шт.</span></div></td></tr>
                <tr><td>4.7</td><td>Нагрузка полки</td><td><div class="unit-box"><input type="number" id="val_4_7" value="40"><span>кг</span></div></td></tr>
                <tr><td>4.8</td><td>Подсветка</td><td>${renderSelect('val_4_8', 'lighting')}</td></tr>
                <tr><td>4.9</td><td>Ножки</td><td><div class="unit-box">${renderSelect('sel_4_9', 'legs')}<input type="number" id="val_4_9" value="4" style="width:60px"><span>шт.</span></div></td></tr>
                <tr><td>4.10</td><td>Колеса (торм.)</td><td><div class="unit-box">${renderSelect('sel_4_10', 'wheels')}<input type="number" id="val_4_10" value="2" style="width:60px"><span>шт.</span></div></td></tr>
                <tr><td>4.11</td><td>Колеса (б/торм)</td><td><div class="unit-box">${renderSelect('sel_4_11', 'wheels')}<input type="number" id="val_4_11" value="2" style="width:60px"><span>шт.</span></div></td></tr>
                <tr><td>4.12</td><td>Вентиляция</td><td>${renderSelect('val_4_12', 'ventilation')}</td></tr>
                <tr class="section-title"><td colspan="3">5. ТЕМПЕРАТУРА</td></tr>
                <tr><td>5.1</td><td>Режим в камере</td><td><div class="unit-box"><b>t°</b><input type="text" id="val_5_1" value="+2...+8" style="width:80px; text-align:center;"><div id="dual_temp_zone" style="display:none; align-items:center; margin-left:10px;"><b style="color:var(--pronto)">/ t°</b><input type="text" id="val_5_1_2" value="-18" style="width:80px; text-align:center;"></div></div></td></tr>
                <tr class="section-title"><td colspan="3">6. СРЕДА / 7. ГАРАНТИЯ / 8. СРОК</td></tr>
                <tr><td>6.1</td><td>T / Влажность</td><td><div class="unit-box"><span>до +</span><input type="number" id="val_6_1" value="32" style="width:50px"><span>/ до</span><input type="number" id="val_6_2" value="60" style="width:60px"><span>%</span></div></td></tr>
                <tr><td>7.1 / 8.1</td><td>Гарантия / Срок</td><td><div class="unit-box"><input type="number" id="val_7_1" value="12" style="width:50px"><span>мес. /</span><input type="number" id="val_8_1" value="10" style="width:50px"><span>лет</span></div></td></tr>
                <tr class="section-title break-before"><td colspan="3">9. ЭСКИЗ И ПРИМЕЧАНИЯ</td></tr>
                <tr><td colspan="3">
                    <div class="split-field">
                        <div class="split-left"><textarea id="val_9_1" placeholder="Примечания..."></textarea></div>
                        <div class="split-right" onclick="document.getElementById('file_input').click()">
                            <img id="preview_img" src="" style="display:none;">
                            <div id="img_text" class="no-print">ФОТО +</div>
                            <input type="file" id="file_input" style="display:none;" onchange="handleFile(this)">
                        </div>
                    </div>
                </td></tr>
            </tbody>
        </table>
        <div class="footer-btns no-print">
            <button class="btn btn-success" onclick="saveToArchive()">💾 СОХРАНИТЬ</button>
            <button class="btn btn-secondary" onclick="window.print()">🖨️ ПЕЧАТЬ</button>
            <button class="btn" onclick="genPDF('download')">📄 PDF</button>
        </div>
        ${modalsHTML}
    </div>`;

// --- 5. ЛОГИКА (ВСЕ ФУНКЦИИ ВОССТАНОВЛЕНЫ) ---
function populateSelects() {
    const keys = ['equipment', 'materials', 'constructions', 'coolingMethods', 'tabletops', 'tabletopMaterials', 'gnTypes', 'doorTypes', 'drawerTypes', 'slideTypes', 'shelfTypes', 'lighting', 'legs', 'wheels', 'wheels', 'ventilation'];
    const ids = ['equipment_select', 'val_2_1_mat', 'val_2_1_con', 'val_3_1', 'val_4_1', 'val_4_1_mat', 'sel_4_2', 'sel_4_4', 'sel_4_5', 'val_4_5_slides', 'sel_4_6', 'val_4_8', 'sel_4_9', 'sel_4_10', 'sel_4_11', 'val_4_12'];
    ids.forEach((id, i) => {
        const el = document.getElementById(id);
        if(el) {
            el.innerHTML = '<option disabled selected>Выбор</option>';
            if (APP_CONFIG[keys[i]]) APP_CONFIG[keys[i]].forEach(v => el.add(new Option(v, v)));
        }
    });
}

function checkDualTemp() {
    const el = document.getElementById('equipment_select'); if(!el) return;
    const zone = document.getElementById('dual_temp_zone');
    if(zone) zone.style.display = el.value.toLowerCase().includes('комби') ? 'flex' : 'none';
}

function checkLogin() {
    if(document.getElementById('inputPassword').value === APP_CONFIG.adminPassword) {
        localStorage.setItem('pronto_settings', JSON.stringify({role:'admin', theme:'light'}));
        closeModals(); navigate('settings');
    } else alert('Ошибка');
}

function saveNewCredentials() {
    const p = document.getElementById('newPassword').value.trim();
    if(p.length < 3) return alert('Пароль слишком короткий!');
    APP_CONFIG.adminPassword = p;
    syncToCloud(); closeModals();
}

function handleRole(el) { if(el.value==='admin') { document.getElementById('loginModal').style.display='flex'; el.value='participant'; } }
function closeModals() { document.querySelectorAll('.modal').forEach(m => m.style.display='none'); }
function saveSettings() { localStorage.setItem('pronto_settings', JSON.stringify({role:document.getElementById('role_select').value, theme:'light'})); applyTheme(); navigate('home'); }
function handleFile(input) { const f = input.files[0]; if(f) { const r = new FileReader(); r.onload = e => { uploadedImageBase64 = e.target.result; const img = document.getElementById('preview_img'); if(img){img.src = uploadedImageBase64; img.style.display='block';} document.getElementById('img_text').style.display='none'; }; r.readAsDataURL(f); } }
function saveToArchive() { const arc = getArchive(); arc.unshift({ tz_no: document.getElementById('tz_no').value || '?', eq: document.getElementById('equipment_select').value, date: new Date().toLocaleDateString(), image: uploadedImageBase64 }); localStorage.setItem('pronto_archive', JSON.stringify(arc)); navigate('home'); }
function deleteFromArchive(i) { const arc = getArchive(); arc.splice(i,1); localStorage.setItem('pronto_archive', JSON.stringify(arc)); navigate('home'); }
function editFromArchive(i) { const d = getArchive()[i]; navigate('template'); setTimeout(() => { document.getElementById('tz_no').value = d.tz_no; document.getElementById('equipment_select').value = d.eq; if(d.image) { uploadedImageBase64=d.image; const img=document.getElementById('preview_img'); img.src=d.image; img.style.display='block'; document.getElementById('img_text').style.display='none'; } }, 50); }
function createNewTZ() { uploadedImageBase64=null; navigate('template'); }

async function genPDF(action) {
    const el = document.querySelector('.document-sheet');
    const canvas = await html2canvas(el, { scale: 2 });
    const img = canvas.toDataURL('image/png');
    const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
    pdf.addImage(img, 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
    pdf.save(`TZ_${document.getElementById('tz_no').value}.pdf`);
}
