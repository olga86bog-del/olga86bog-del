/**
 * PRONTO SPECS 2.1 HD - FULL VERSION
 * DEVELOPED BY TIMUR | 2026
 */

// --- 1. СИНХРОНИЗАЦИЯ С ОБЛАКОМ ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("Запуск... Подключение к Firebase");
    
    // Предохранитель: убираем лоадер через 3.5 сек в любом случае
    setTimeout(hideLoader, 3500);

    db.ref('settings').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            console.log("🔄 База обновлена");
            APP_CONFIG = data;
            if (document.getElementById('equipment_select')) populateSelects();
        } else {
            db.ref('settings').set(APP_CONFIG);
        }
        hideLoader(); 
    });

    applyTheme();
    navigate('home');
});

function hideLoader() {
    const l = document.getElementById('loader');
    if(l && l.style.display !== 'none') {
        l.style.opacity = '0';
        setTimeout(() => l.style.display = 'none', 500);
    }
}

// --- 2. ПЕРЕМЕННЫЕ ---
let uploadedImageBase64 = null;
let currentManageKey = null;

const getArchive = () => JSON.parse(localStorage.getItem('pronto_archive') || '[]');
const getSettings = () => JSON.parse(localStorage.getItem('pronto_settings') || '{"role":"participant", "theme":"light"}');

function applyTheme() {
    const s = getSettings();
    document.body.className = s.theme === 'dark' ? 'dark-theme' : '';
}

function syncToCloud() {
    db.ref('settings').set(APP_CONFIG).then(() => console.log("💾 Облако обновлено"));
}

function navigate(v) {
    const app = document.getElementById('app');
    if(!app) return;
    if(v==='template') app.innerHTML = templateView();
    else if(v==='settings') app.innerHTML = settingsView();
    else app.innerHTML = homeView();
    
    if(v==='template') { populateSelects(); checkDualTemp(); }
    window.scrollTo(0,0);
}

// --- 3. АДМИН-ФУНКЦИИ ---
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
    items.forEach(item => modalSelect.add(new Option(item, item)));
}

function manAdd() {
    const val = prompt("Добавить новый пункт:");
    if (val && val.trim()) { APP_CONFIG[currentManageKey].push(val.trim()); refreshAfterChange(); }
}

function manEdit() {
    const modalSelect = document.getElementById('manageListSelect');
    const oldVal = modalSelect.value;
    if (!oldVal) return;
    const newVal = prompt("Изменить название:", oldVal);
    if (newVal && newVal.trim()) {
        const idx = APP_CONFIG[currentManageKey].indexOf(oldVal);
        APP_CONFIG[currentManageKey][idx] = newVal.trim();
        refreshAfterChange();
    }
}

function manDel() {
    const modalSelect = document.getElementById('manageListSelect');
    if (confirm(`Удалить ${modalSelect.value}?`)) {
        APP_CONFIG[currentManageKey] = APP_CONFIG[currentManageKey].filter(v => v !== modalSelect.value);
        refreshAfterChange();
    }
}

function refreshAfterChange() {
    renderManageList(); populateSelects(); syncToCloud();
}

function renderSelect(id, configKey) {
    const isAdmin = getSettings().role === 'admin';
    const btnHTML = isAdmin ? `<button onclick="openManageMenu('${configKey}', '${id}')" class="admin-add-btn no-print" style="margin-left:5px; background:#10b981; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">+</button>` : '';
    return `<div style="display:flex; align-items:center; width:100%; gap:5px;"><select id="${id}" style="flex-grow:1; padding:8px; border-radius:4px; border:1px solid #ccc;"></select>${btnHTML}</div>`;
}

// --- 4. МОДАЛКИ ---
const modalsHTML = `
<div id="loginModal" class="modal" style="display:none"><div class="modal-content"><h3>Вход Админа</h3><input type="password" id="inputPassword" placeholder="Пароль" style="width:100%; padding:12px; margin-bottom:15px; border-radius:8px; border:1px solid #ddd;"><div style="display:flex; gap:10px;"><button onclick="closeModals()" class="btn btn-secondary" style="flex:1;">Отмена</button><button onclick="checkLogin()" class="btn" style="flex:1;">Войти</button></div></div></div>
<div id="changePassModal" class="modal" style="display:none"><div class="modal-content"><h3>Новый пароль</h3><input type="password" id="newPassword" placeholder="Минимум 3 знака" style="width:100%; padding:12px; margin-bottom:15px; border-radius:8px; border:1px solid #ddd;"><div style="display:flex; gap:10px;"><button onclick="closeModals()" class="btn btn-secondary" style="flex:1;">Отмена</button><button onclick="saveNewCredentials()" class="btn" style="flex:1; background:orange;">Сохранить</button></div></div></div>
<div id="manageModal" class="modal" style="display:none"><div class="modal-content" style="width:400px;"><h3>Управление списком</h3><select id="manageListSelect" style="width:100%; padding:12px; margin-bottom:20px; border-radius:10px; font-weight:bold;"></select><div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;"><button onclick="manAdd()" class="btn btn-success">➕ Добавить</button><button onclick="manEdit()" class="btn btn-warning">✏️ Изменить</button><button onclick="manDel()" class="btn btn-danger">🗑️ Удалить</button><button onclick="closeModals()" class="btn btn-secondary">Выйти</button></div></div></div>`;

const homeView = () => `
    <div class="home-card fade-in" style="background:var(--white); padding:50px; border-radius:20px; text-align:center; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
        <h1 class="main-title">PRODUCTION</h1><div class="subtitle">SPECS 2.1 HD</div>
        <button onclick="createNewTZ()" class="btn" style="height:75px; width:100%; font-size:18px; margin-bottom:15px; border-radius:15px;">+ СОЗДАТЬ ТЕХНИЧЕСКОЕ ЗАДАНИЕ</button>
        <button onclick="navigate('settings')" class="btn btn-secondary" style="width:100%; border-radius:15px;">НАСТРОЙКИ СИСТЕМЫ</button>
        <div style="margin-top:60px; text-align:left;">
            <h4 style="border-bottom:2px solid var(--border); padding-bottom:10px; color:var(--pronto); letter-spacing:1px;">АРХИВ ПРОЕКТОВ</h4>
            ${getArchive().map((item, i) => `
                <div class="archive-item" style="background:var(--white); border:1px solid var(--border); padding:20px; border-radius:15px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>№ ${item.tz_no}</b><div style="font-size:14px; margin-top:5px;">${item.eq} | Менеджер: ${item.manager || '—'}</div></div>
                    <button onclick="deleteFromArchive(${i})" class="btn" style="width:55px; background:red; margin:0; padding:15px;">🗑️</button>
                </div>`).join('')}
        </div>
    </div>`;

const settingsView = () => {
    const s = getSettings();
    const isAdmin = s.role === 'admin';
    return `
    <div class="home-card fade-in">
        <h1>НАСТРОЙКИ</h1>
        <div style="text-align:left; background:rgba(43, 108, 176, 0.1); padding:25px; border-radius:15px; margin-bottom:30px; font-size:14px; line-height:1.7; border-left:8px solid var(--pronto);">
            <strong>О ПЛАТФОРМЕ:</strong><br>
            PRONTO Specs 2.1 — это облачная инженерная экосистема. Она позволяет мгновенно синхронизировать базу материалов через Google Firebase. 
            Все изменения админа сразу видны остальным. PDF генерируется в HD качестве (Scale 3).
        </div>
        <div style="text-align:left; max-width:550px; margin:0 auto;">
            <label><b>🎨 Тема оформления:</b></label>
            <select id="theme_select" style="width:100%; padding:14px; border-radius:10px; border:1px solid var(--border); background:var(--white); color:var(--text-main); margin-bottom:25px;">
                <option value="light" ${s.theme==='light'?'selected':''}>Светлая тема (Дневная)</option>
                <option value="dark" ${s.theme==='dark'?'selected':''}>Темная тема (Ночная)</option>
            </select>
            <label><b>👤 Роль в системе:</b></label>
            <select id="role_select" onchange="handleRole(this)" style="width:100%; padding:14px; border-radius:10px; border:1px solid var(--border); background:var(--white); color:var(--text-main); margin-bottom:25px;">
                <option value="participant" ${!isAdmin?'selected':''}>Участник</option>
                <option value="admin" ${isAdmin?'selected':''}>Администратор</option>
            </select>
            ${isAdmin ? `<button onclick="document.getElementById('changePassModal').style.display='flex'" class="btn" style="background:#d69e2e; width:100%; margin-bottom:20px;">🔐 СМЕНИТЬ ПАРОЛЬ АДМИНА</button>` : ''}
            <button onclick="saveSettings()" class="btn btn-secondary" style="width:100%;">СОХРАНИТЬ И ВЫЙТИ</button>
        </div>
        ${modalsHTML}
    </div>`;
};

// --- КОНСТРУКТОР ТЗ (ГЛАВНАЯ ЧАСТЬ) ---
const templateView = () => `
    <div class="document-sheet fade-in">
        <div class="doc-header">
            <div style="flex-grow:1;">
                <div style="font-size:12px; color:#94a3b8; font-weight:900; letter-spacing:1px; text-transform:uppercase;">Техническое Задание</div>
                <div style="display:flex; align-items:center; margin-top:10px;">
                    <span style="font-weight:900; color:var(--pronto); font-size:32px; margin-right:15px;">SPECS №</span>
                    <input type="text" id="tz_no" style="width:150px; font-size:32px; border:none; font-weight:900; outline:none; background:transparent;" placeholder="000-00">
                </div>
                <div style="margin-top:15px; display:flex; align-items:center; gap:12px;">
                    <b>ОТВ. МЕНЕДЖЕР:</b> 
                    <input type="text" id="manager_name" style="border:none; border-bottom:1px solid #ccc; width:280px; font-size:15px; padding:4px;" placeholder="Имя и фамилия">
                </div>
            </div>
            <button onclick="navigate('home')" class="close-x no-print" title="Закрыть">✕</button>
        </div>
        
        <div class="top-info-grid">
            <div><label style="font-size:11px; font-weight:bold; color:#64748b; display:block; margin-bottom:8px;">ОБОРУДОВАНИЕ</label>${renderSelect('equipment_select', 'equipment')}</div>
            <div><label style="font-size:11px; font-weight:bold; color:#64748b; display:block; margin-bottom:8px;">ЕД. ИЗМ.</label><select id="unit" style="padding:10px; border-radius:8px; border:1px solid #ccc; width:100%;"><option>шт.</option><option>компл.</option></select></div>
            <div><label style="font-size:11px; font-weight:bold; color:#64748b; display:block; margin-bottom:8px;">КОЛ-ВО</label><input type="number" id="qty" value="1" style="padding:10px; border-radius:8px; border:1px solid #ccc; width:100%; font-weight:bold;"></div>
        </div>

        <table class="spec-table">
            <thead><tr><th width="45">№</th><th>ПАРАМЕТР</th><th>ТРЕБОВАНИЯ</th></tr></thead>
            <tbody>
                <tr class="section-title"><td colspan="3">1. ГЕОМЕТРИЯ (мм)</td></tr>
                <tr><td>1.1</td><td>Высота изделия (H)</td><td><input type="number" id="h" value="850" style="width:100px;"> мм</td></tr>
                <tr><td>1.2</td><td>Ширина изделия (W)</td><td><input type="number" id="w" value="1200" style="width:100px;"> мм</td></tr>
                <tr><td>1.3</td><td>Глубина изделия (D)</td><td><input type="number" id="d" value="700" style="width:100px;"> мм</td></tr>
                <tr><td>1.4</td><td>Допуск на габариты</td><td>± <input type="number" id="val_1_4" value="5" style="width:70px;"> мм</td></tr>
                
                <tr class="section-title"><td colspan="3">2. МАТЕРИАЛЫ</td></tr>
                <tr><td>2.1</td><td>Материал корпуса</td><td>${renderSelect('mat', 'materials')}</td></tr>
                <tr><td>2.2</td><td>Конструкция каркаса</td><td>${renderSelect('con', 'constructions')}</td></tr>
                
                <tr class="section-title"><td colspan="3">3. ОХЛАЖДЕНИЕ</td></tr>
                <tr><td>3.1</td><td>Тип системы</td><td>${renderSelect('cool', 'coolingMethods')}</td></tr>
                
                <tr class="section-title"><td colspan="3">4. КОМПЛЕКТАЦИЯ</td></tr>
                <tr><td>4.1</td><td>Столешница</td><td><div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">${renderSelect('val_4_1', 'tabletops')}${renderSelect('val_4_1_mat', 'tabletopMaterials')}</div></td></tr>
                <tr><td>4.2</td><td>Гастроёмкости (GN)</td><td><div style="display:flex; align-items:center; gap:10px;">${renderSelect('sel_4_2', 'gnTypes')} глуб: <input type="number" id="val_4_2" value="150" style="width:80px;"> мм</div></td></tr>
                <tr><td>4.3</td><td>Количество GN</td><td><input type="number" id="val_4_3" value="0" style="width:100px;"> шт.</td></tr>
                <tr><td>4.4</td><td>Дверная система</td><td><div style="display:flex; align-items:center; gap:10px;">${renderSelect('sel_4_4', 'doorTypes')} <input type="number" id="val_4_4" value="2" style="width:70px;"> шт.</div></td></tr>
                <tr><td>4.5</td><td>Ящики / Салазки</td><td><div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">${renderSelect('sel_4_5', 'drawerTypes')}${renderSelect('val_4_5_slides', 'slideTypes')}</div></td></tr>
                <tr><td>4.6</td><td>Полки</td><td><div style="display:flex; align-items:center; gap:10px;">${renderSelect('sel_4_6', 'shelfTypes')} <input type="number" id="val_4_6" value="2" style="width:70px;"> шт.</div></td></tr>
                <tr><td>4.8</td><td>Подсветка камеры</td><td>${renderSelect('val_4_8', 'lighting')}</td></tr>
                
                <tr class="section-title"><td colspan="3">4.9 - 4.12 ОПОРЫ И ВЕНТИЛЯЦИЯ</td></tr>
                <tr><td>4.9</td><td>Тип опор (ножки)</td><td><div style="display:flex; align-items:center; gap:10px;">${renderSelect('sel_4_9', 'legs')} <input type="number" id="val_4_9" value="4" style="width:80px;"> шт.</div></td></tr>
                <tr><td>4.10</td><td>Колеса (торм.)</td><td><div style="display:flex; align-items:center; gap:10px;">${renderSelect('sel_4_10', 'wheels')} <input type="number" id="val_4_10" value="2" style="width:80px;"> шт.</div></td></tr>
                <tr><td>4.11</td><td>Колеса (б/торм)</td><td><div style="display:flex; align-items:center; gap:10px;">${renderSelect('sel_4_11', 'wheels')} <input type="number" id="val_4_11" value="2" style="width:80px;"> шт.</div></td></tr>
                <tr><td>4.12</td><td>Вентиляция</td><td>${renderSelect('val_4_12', 'ventilation')}</td></tr>
                
                <tr class="section-title"><td colspan="3">5. ТЕМПЕРАТУРА / 6. СРЕДА</td></tr>
                <tr><td>5.1</td><td>Режим t°</td><td><div style="display:flex; align-items:center; gap:12px;"><b>t° :</b> <input type="text" id="val_5_1" value="+2...+8" style="width:90px; text-align:center;"> <div id="dual_temp_zone" style="display:none;"><b>/ t° :</b> <input type="text" id="val_5_1_2" value="-18" style="width:90px;"></div></div></td></tr>
                <tr><td>6.1</td><td>Раб. темп / Вл</td><td>до + <input type="number" id="val_6_1" value="32" style="width:50px"> / <input type="number" id="val_6_2" value="60" style="width:50px"> %</td></tr>
                
                <tr class="section-title"><td colspan="3">7. ГАРАНТИЯ / 8. СРОК</td></tr>
                <tr><td>7.1</td><td>Гарантия (мес)</td><td><input type="number" id="val_7_1" value="12" style="width:100px; font-weight:bold;"> мес.</td></tr>
                <tr><td>8.1</td><td>Срок (раб. дн)</td><td><input type="number" id="val_8_1" value="10" style="width:100px; font-weight:bold;"> дн.</td></tr>
                
                <tr class="section-title"><td colspan="3">9. ЭСКИЗ И ПРИМЕЧАНИЯ</td></tr>
                <tr><td colspan="3"><div style="display:grid; grid-template-columns: 1fr 300px; gap:25px; min-height:240px; padding:10px 0;"><textarea id="val_9_1" style="width:100%; height:100%; resize:none; padding:15px; border:1px solid #cbd5e1; border-radius:12px; font-size:14px;" placeholder="Доп. требования..."></textarea><div style="border:3px dashed #cbd5e1; border-radius:15px; display:flex; align-items:center; justify-content:center; cursor:pointer; background:#f8fafc;" onclick="document.getElementById('file_input').click()"><img id="preview_img" style="display:none; max-width:100%; max-height:100%; object-fit:contain;"><div id="img_text" style="text-align:center; color:#94a3b8; font-size:13px; font-weight:900;">📷 ЗАГРУЗИТЬ<br>ЭСКИЗ</div><input type="file" id="file_input" style="display:none;" onchange="handleFile(this)"></div></div></td></tr>
            </tbody>
        </table>

        <div class="footer-btns no-print">
            <button class="btn btn-success" onclick="saveToArchive()" style="flex:1.2;">💾 СОХРАНИТЬ В ОБЛАКО</button>
            <button class="btn" onclick="genPDF()" style="background:#2b6cb0; flex:1;">📄 СКАЧАТЬ PDF (HD)</button>
        </div>
        ${modalsHTML}
    </div>`;

// --- 5. ЛОГИКА ---
function populateSelects() {
    const map = { 'equipment_select':'equipment', 'mat':'materials', 'con':'constructions', 'cool':'coolingMethods', 'val_4_1':'tabletops', 'val_4_1_mat':'tabletopMaterials', 'sel_4_2':'gnTypes', 'sel_4_4':'doorTypes', 'sel_4_5':'drawerTypes', 'val_4_5_slides':'slideTypes', 'sel_4_6':'shelfTypes', 'val_4_8':'lighting', 'sel_4_9':'legs', 'sel_4_10':'wheels', 'sel_4_11':'wheels', 'val_4_12':'ventilation' };
    for(let id in map) {
        const el = document.getElementById(id);
        if(el) { el.innerHTML = '<option disabled selected>-- Выбор --</option>'; APP_CONFIG[map[id]].forEach(v => el.add(new Option(v,v))); }
    }
}

function checkDualTemp() {
    const el = document.getElementById('equipment_select'); if(el) document.getElementById('dual_temp_zone').style.display = el.value.toLowerCase().includes('комби') ? 'flex' : 'none';
}

function handleRole(el) { if(el.value==='admin') document.getElementById('loginModal').style.display='flex'; }
function closeModals() { document.querySelectorAll('.modal').forEach(m => m.style.display='none'); }

function checkLogin() {
    if(document.getElementById('inputPassword').value === APP_CONFIG.adminPassword) {
        localStorage.setItem('pronto_settings', JSON.stringify({role: 'admin', theme: getSettings().theme}));
        closeModals(); navigate('settings');
    } else alert("❌ Ошибка доступа!");
}

function saveNewCredentials() {
    const p = document.getElementById('newPassword').value;
    if(p.length < 3) return alert("Минимум 3 знака!");
    APP_CONFIG.adminPassword = p; syncToCloud(); closeModals(); alert("✅ Пароль изменен!");
}

function saveSettings() {
    const r = document.getElementById('role_select').value;
    const t = document.getElementById('theme_select').value;
    localStorage.setItem('pronto_settings', JSON.stringify({role: r, theme: t}));
    applyTheme(); navigate('home');
}

function handleFile(input) {
    const f = input.files[0];
    if(f) {
        const r = new FileReader();
        r.onload = e => {
            uploadedImageBase64 = e.target.result;
            const img = document.getElementById('preview_img');
            img.src = e.target.result; img.style.display='block';
            document.getElementById('img_text').style.display='none';
        };
        r.readAsDataURL(f);
    }
}

function saveToArchive() {
    const arc = getArchive();
    arc.unshift({ 
        tz_no: document.getElementById('tz_no').value || '?', 
        eq: document.getElementById('equipment_select').value,
        manager: document.getElementById('manager_name').value,
        date: new Date().toLocaleDateString() 
    });
    localStorage.setItem('pronto_archive', JSON.stringify(arc));
    navigate('home');
}

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
        pdf.save(`TZ_${document.getElementById('tz_no').value || 'NEW'}.pdf`);
    } catch (err) { alert("Ошибка PDF: " + err); } 
    finally { if (footer) footer.style.display = 'flex'; if (closeBtn) closeBtn.style.display = 'block'; }
}

function deleteFromArchive(i) {
    const arc = getArchive(); arc.splice(i,1);
    localStorage.setItem('pronto_archive', JSON.stringify(arc)); navigate('home');
}

function createNewTZ() { uploadedImageBase64 = null; navigate('template'); }



