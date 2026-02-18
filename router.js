/**
 * PRONTO SPECS 2.1 FINAL
 * ПОЛНАЯ РАЗВЕРНУТАЯ ВЕРСИЯ
 */

// --- 1. ЗАПУСК ПРИЛОЖЕНИЯ ---
document.addEventListener("DOMContentLoaded", () => {
    
    // Таймер на случай медленного интернета (3 сек)
    setTimeout(hideLoader, 3000);

    // Подключение к базе данных
    db.ref('settings').on('value', (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            APP_CONFIG = data;
            // Если мы уже на странице ТЗ, обновляем списки
            if (document.getElementById('equipment_select')) {
                populateSelects();
            }
        } else {
            // Если база пустая - инициализируем
            db.ref('settings').set(APP_CONFIG);
        }
        
        hideLoader();
    });

    applyTheme();
    navigate('home');
});

function hideLoader() {
    const l = document.getElementById('loader');
    if (l) {
        l.style.opacity = '0';
        setTimeout(() => {
            l.style.display = 'none';
        }, 500);
    }
}

// --- 2. ПЕРЕМЕННЫЕ ---
let uploadedImageBase64 = null;
let currentManageKey = null;

const getArchive = () => JSON.parse(localStorage.getItem('pronto_archive') || '[]');
const getSettings = () => JSON.parse(localStorage.getItem('pronto_settings') || '{"role":"participant", "theme":"light"}');

// --- 3. ФУНКЦИИ ИНТЕРФЕЙСА ---
function applyTheme() {
    const s = getSettings();
    if (s.theme === 'dark') {
        document.body.className = 'dark-theme';
    } else {
        document.body.className = '';
    }
}

function syncToCloud() {
    db.ref('settings').set(APP_CONFIG)
        .then(() => {
            console.log("Cloud Sync OK");
        })
        .catch((err) => {
            console.error(err);
        });
}

function navigate(view) {
    const app = document.getElementById('app');
    if (!app) return;

    if (view === 'home') {
        app.innerHTML = homeView();
    } else if (view === 'settings') {
        app.innerHTML = settingsView();
    } else if (view === 'template') {
        app.innerHTML = templateView();
    } else {
        app.innerHTML = homeView();
    }

    if (view === 'template') {
        populateSelects();
        checkDualTemp();
    }
    
    window.scrollTo(0, 0);
}

// --- 4. ЛОГИКА АДМИНКИ ---
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
    const val = prompt("Введите название:");
    if (val && val.trim()) {
        APP_CONFIG[currentManageKey].push(val.trim());
        refreshAfterChange();
    }
}

function manEdit() {
    const modalSelect = document.getElementById('manageListSelect');
    const oldVal = modalSelect.value;
    if (!oldVal) return;
    
    const newVal = prompt("Изменить на:", oldVal);
    if (newVal && newVal.trim() && newVal !== oldVal) {
        const idx = APP_CONFIG[currentManageKey].indexOf(oldVal);
        APP_CONFIG[currentManageKey][idx] = newVal.trim();
        refreshAfterChange();
    }
}

function manDel() {
    const modalSelect = document.getElementById('manageListSelect');
    if (confirm(`Удалить "${modalSelect.value}"?`)) {
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

function renderSelect(id, configKey) {
    const isAdmin = getSettings().role === 'admin';
    const btnHTML = isAdmin ? `<button onclick="openManageMenu('${configKey}', '${id}')" class="admin-add-btn no-print" style="margin-left:5px; background:#10b981; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">+</button>` : '';
    
    return `
    <div style="display:flex; align-items:center; width:100%; gap:5px;">
        <select id="${id}" style="flex-grow:1; padding:10px; border-radius:6px; border:1px solid #cbd5e1; font-size:13px;"></select>
        ${btnHTML}
    </div>`;
}

// --- 5. МОДАЛЬНЫЕ ОКНА (HTML) ---
const modalsHTML = `
<div id="loginModal" class="modal" style="display:none">
    <div class="modal-content">
        <h3 style="color:var(--pronto); margin-top:0;">ВХОД АДМИНА</h3>
        <input type="password" id="inputPassword" placeholder="Пароль" style="width:100%; padding:15px; margin-bottom:20px; border:1px solid #ccc; border-radius:10px; font-size:16px;">
        <div style="display:flex; gap:10px;">
            <button onclick="closeModals()" class="btn btn-secondary" style="flex:1;">ОТМЕНА</button>
            <button onclick="checkLogin()" class="btn" style="flex:1;">ВОЙТИ</button>
        </div>
    </div>
</div>

<div id="changePassModal" class="modal" style="display:none">
    <div class="modal-content">
        <h3>НОВЫЙ ПАРОЛЬ</h3>
        <input type="password" id="newPassword" placeholder="Минимум 3 знака" style="width:100%; padding:15px; margin-bottom:20px; border:1px solid #ccc; border-radius:10px;">
        <div style="display:flex; gap:10px;">
            <button onclick="closeModals()" class="btn btn-secondary" style="flex:1;">ОТМЕНА</button>
            <button onclick="saveNewCredentials()" class="btn" style="flex:1; background:orange;">СОХРАНИТЬ</button>
        </div>
    </div>
</div>

<div id="manageModal" class="modal" style="display:none">
    <div class="modal-content" style="width:450px;">
        <h3>РЕДАКТОР</h3>
        <select id="manageListSelect" style="width:100%; padding:15px; margin-bottom:20px; border-radius:10px; font-weight:bold;"></select>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <button onclick="manAdd()" class="btn btn-success">➕ ДОБАВИТЬ</button>
            <button onclick="manEdit()" class="btn btn-warning">✏️ ИЗМЕНИТЬ</button>
            <button onclick="manDel()" class="btn btn-danger">🗑️ УДАЛИТЬ</button>
            <button onclick="closeModals()" class="btn btn-secondary">ЗАКРЫТЬ</button>
        </div>
    </div>
</div>`;

// --- 6. ГЛАВНАЯ СТРАНИЦА ---
const homeView = () => `
    <div class="home-card fade-in">
        <h1 class="main-title">PRODUCTION</h1>
        <div class="subtitle">SPECS</div>
        
        <div style="text-align:left; background:#f8fafc; padding:30px; border-radius:15px; margin:30px 0; border-left:8px solid var(--pronto); color:#475569; font-size:15px; line-height:1.6;">
            <p><strong>PRODUCTION SPECS</strong> — цифровая экосистема компании PRONTO.</p>
            <p>Система предназначена для мгновенной синхронизации технических заданий между всеми подразделениями производства в режиме реального времени.</p>
        </div>

        <button onclick="createNewTZ()" class="btn" style="height:85px; width:100%; font-size:24px; margin-bottom:20px; box-shadow: 0 10px 25px rgba(43, 108, 176, 0.3);">+ СОЗДАТЬ ТЗ</button>
        <button onclick="navigate('settings')" class="btn btn-secondary" style="width:100%;">НАСТРОЙКИ СИСТЕМЫ</button>
        
        <div style="margin-top:70px; text-align:left;">
            <h4 style="border-bottom:3px solid var(--border); padding-bottom:15px; color:var(--pronto); font-weight:900;">ПОСЛЕДНИЕ ПРОЕКТЫ</h4>
            ${getArchive().map((item, i) => `
                <div class="archive-item">
                    ${item.image ? `<img src="${item.image}" class="archive-thumb">` : `<div class="archive-thumb" style="display:flex; align-items:center; justify-content:center; color:#ccc; font-weight:bold;">ФОТО</div>`}
                    <div style="flex:1;">
                        <b style="font-size:20px; color:var(--pronto);">№ ${item.tz_no}</b>
                        <div style="font-size:15px; margin-top:5px; font-weight:bold;">${item.eq}</div>
                        <div style="font-size:13px; color:#64748b; margin-top:3px;">Менеджер: ${item.manager || '—'} | ${item.date}</div>
                    </div>
                    <button onclick="deleteFromArchive(${i})" class="btn" style="width:55px; background:#ef4444; margin:0; padding:15px;">🗑️</button>
                    <button onclick="editFromArchive(${i})" class="btn" style="width:55px; background:#10b981; margin:0; padding:15px;">📂</button>
                </div>`).join('')}
        </div>
    </div>`;

// --- 7. НАСТРОЙКИ ---
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
            <label style="font-weight:bold; display:block; margin-bottom:10px;">ТЕМА ОФОРМЛЕНИЯ:</label>
            <select id="theme_select" style="width:100%; padding:15px; border-radius:10px; border:2px solid var(--border); margin-bottom:30px; font-size:16px;">
                <option value="light" ${s.theme==='light'?'selected':''}>Светлая тема</option>
                <option value="dark" ${s.theme==='dark'?'selected':''}>Темная тема</option>
            </select>

            <label style="font-weight:bold; display:block; margin-bottom:10px;">РОЛЬ ПОЛЬЗОВАТЕЛЯ:</label>
            <select id="role_select" onchange="handleRole(this)" style="width:100%; padding:15px; border-radius:10px; border:2px solid var(--border); margin-bottom:30px; font-size:16px;">
                <option value="participant" ${!isAdmin?'selected':''}>Участник</option>
                <option value="admin" ${isAdmin?'selected':''}>Администратор</option>
            </select>

            ${isAdmin ? `<button onclick="document.getElementById('changePassModal').style.display='flex'" class="btn" style="background:orange; width:100%; margin-bottom:20px;">🔐 СМЕНИТЬ ПАРОЛЬ</button>` : ''}
            
            <button onclick="saveSettings()" class="btn btn-secondary" style="width:100%; height:60px; font-size:18px;">СОХРАНИТЬ</button>
        </div>
        ${modalsHTML}
    </div>`;
};

// --- 8. ТАБЛИЦА ТЗ (ВСЕ РАЗДЕЛЫ) ---
const templateView = () => `
    <div class="document-sheet fade-in">
        <div class="doc-header">
            <div style="flex-grow:1;">
                <div style="display:flex; align-items:center; margin-top:5px;">
                    <span style="font-weight:900; color:var(--pronto); font-size:36px; margin-right:15px;">SPECS №</span>
                    <input type="text" id="tz_no" style="width:180px; font-size:36px; border:none; font-weight:900; outline:none; color:black; background:transparent;" placeholder="000-00">
                </div>
                <div style="margin-top:15px; display:flex; align-items:center; gap:10px;">
                    <b style="font-size:16px;">МЕНЕДЖЕР:</b> 
                    <input type="text" id="manager_name" style="border:none; border-bottom:2px solid #cbd5e1; width:300px; font-size:16px; padding:5px; color:black; font-weight:bold;" placeholder="Фамилия Имя">
                </div>
            </div>
            <button onclick="navigate('home')" class="close-x no-print">✕</button>
        </div>
        
        <div class="top-info-grid">
            <div>
                <label style="font-size:11px; font-weight:bold; color:#64748b; display:block; margin-bottom:5px; text-transform:uppercase;">ОБОРУДОВАНИЕ</label>
                ${renderSelect('equipment_select', 'equipment')}
            </div>
            <div>
                <label style="font-size:11px; font-weight:bold; color:#64748b; display:block; margin-bottom:5px; text-transform:uppercase;">ЕД. ИЗМ.</label>
                <select id="unit" style="padding:10px; border-radius:8px; border:1px solid #cbd5e1; width:100%; font-weight:bold;"><option>шт.</option><option>компл.</option></select>
            </div>
            <div>
                <label style="font-size:11px; font-weight:bold; color:#64748b; display:block; margin-bottom:5px; text-transform:uppercase;">КОЛИЧЕСТВО</label>
                <input type="number" id="qty" value="1" style="padding:10px; border-radius:8px; border:1px solid #cbd5e1; width:100%; font-weight:bold; font-size:16px;">
            </div>
        </div>

        <table class="spec-table">
            <thead>
                <tr><th width="45">№</th><th>ПАРАМЕТР</th><th>ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ</th></tr>
            </thead>
            <tbody>
                <tr class="section-title"><td colspan="3">1. ГАБАРИТЫ (мм)</td></tr>
                <tr><td>1.1</td><td>Высота (H)</td><td><input type="number" id="h" value="850" style="width:100px;"> мм</td></tr>
                <tr><td>1.2</td><td>Ширина (W)</td><td><input type="number" id="w" value="1200" style="width:100px;"> мм</td></tr>
                <tr><td>1.3</td><td>Глубина (D)</td><td><input type="number" id="d" value="700" style="width:100px;"> мм</td></tr>
                <tr><td>1.4</td><td>Допуск</td><td>± <input type="number" id="val_1_4" value="5" style="width:60px;"> мм</td></tr>
                
                <tr class="section-title"><td colspan="3">2. ИСПОЛНЕНИЕ</td></tr>
                <tr><td>2.1</td><td>Материал</td><td>${renderSelect('mat', 'materials')}</td></tr>
                <tr><td>2.2</td><td>Конструкция</td><td>${renderSelect('con', 'constructions')}</td></tr>
                
                <tr class="section-title"><td colspan="3">3. ОХЛАЖДЕНИЕ</td></tr>
                <tr><td>3.1</td><td>Тип системы</td><td>${renderSelect('cool', 'coolingMethods')}</td></tr>
                
                <tr class="section-title"><td colspan="3">4. КОМПЛЕКТАЦИЯ (ОБЩЕЕ)</td></tr>
                <tr><td>4.1</td><td>Столешница</td><td><div style="display:flex; gap:10px;">${renderSelect('val_4_1', 'tabletops')}${renderSelect('val_4_1_mat', 'tabletopMaterials')}</div></td></tr>
                <tr><td>4.2</td><td>Гастроёмкости</td><td><div style="display:flex; align-items:center; gap:10px;">${renderSelect('sel_4_2', 'gnTypes')} глуб: <input type="number" id="val_4_2" value="150" style="width:70px;"> мм</div></td></tr>
                <tr><td>4.3</td><td>Количество GN</td><td><input type="number" id="val_4_3" value="0" style="width:100px;"> шт.</td></tr>
                <tr><td>4.4</td><td>Двери</td><td><div style="display:flex; align-items:center; gap:10px;">${renderSelect('sel_4_4', 'doorTypes')} <input type="number" id="val_4_4" value="2" style="width:70px;"> шт.</div></td></tr>
                <tr><td>4.5</td><td>Ящики / Салазки</td><td><div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">${renderSelect('sel_4_5', 'drawerTypes')}${renderSelect('val_4_5_slides', 'slideTypes')}</div></td></tr>
                <tr><td>4.6</td><td>Полки</td><td><div style="display:flex; align-items:center; gap:10px;">${renderSelect('sel_4_6', 'shelfTypes')} <input type="number" id="val_4_6" value="2" style="width:70px;"> шт.</div></td></tr>
                <tr><td>4.7</td><td>Нагрузка полки</td><td><input type="number" id="val_4_7" value="40" style="width:80px;"> кг</td></tr>
                <tr><td>4.8</td><td>Подсветка</td><td>${renderSelect('val_4_8', 'lighting')}</td></tr>
                <tr><td>4.9</td><td>Ножки</td><td><div style="display:flex; align-items:center; gap:10px;">${renderSelect('sel_4_9', 'legs')} <input type="number" id="val_4_9" value="4" style="width:70px;"> шт.</div></td></tr>
                <tr><td>4.10</td><td>Колеса (торм.)</td><td><div style="display:flex; align-items:center; gap:10px;">${renderSelect('sel_4_10', 'wheels')} <input type="number" id="val_4_10" value="2" style="width:70px;"> шт.</div></td></tr>
                <tr><td>4.11</td><td>Колеса (б/торм)</td><td><div style="display:flex; align-items:center; gap:5px;">${renderSelect('sel_4_11', 'wheels')} <input type="number" id="val_4_11" value="2" style="width:70px;"> шт.</div></td></tr>
                <tr><td>4.12</td><td>Вентиляция</td><td>${renderSelect('val_4_12', 'ventilation')}</td></tr>
                
                <tr class="section-title"><td colspan="3">5. ТЕМПЕРАТУРА</td></tr>
                <tr><td>5.1</td><td>Режим</td><td><div style="display:flex; align-items:center; gap:15px;"><b>t° :</b> <input type="text" id="val_5_1" value="+2...+8" style="width:90px; text-align:center; font-weight:bold;"> <div id="dual_temp_zone" style="display:none;"><b>/ t° :</b> <input type="text" id="val_5_1_2" value="-18" style="width:90px; text-align:center;"></div></div></td></tr>
                
                <tr class="section-title"><td colspan="3">6. СРЕДА</td></tr>
                <tr><td>6.1</td><td>Раб. условия</td><td>+ <input type="number" id="val_6_1" value="32" style="width:50px"> / <input type="number" id="val_6_2" value="60" style="width:50px"> %</td></tr>

                <tr class="section-title"><td colspan="3">7. ГАРАНТИЯ</td></tr>
                <tr><td>7.1</td><td>Срок гарантии</td><td><input type="number" id="val_7_1" value="12" style="width:80px; font-weight:bold;"> мес.</td></tr>

                <tr class="section-title"><td colspan="3">8. СРОК ИЗГОТОВЛЕНИЯ</td></tr>
                <tr><td>8.1</td><td>Рабочих дней</td><td><input type="number" id="val_8_1" value="10" style="width:80px; font-weight:bold;"> дн.</td></tr>
                
                <tr class="section-title"><td colspan="3">9. ЭСКИЗ</td></tr>
                <tr><td colspan="3">
                    <div style="display:grid; grid-template-columns: 1fr 300px; gap:20px; min-height:250px; padding:10px 0;">
                        <textarea id="val_9_1" style="width:100%; height:100%; resize:none; padding:15px; border:1px solid #cbd5e1; border-radius:10px;" placeholder="Примечание..."></textarea>
                        <div style="border:3px dashed #cbd5e1; border-radius:15px; display:flex; align-items:center; justify-content:center; cursor:pointer; background:#f8fafc;" onclick="document.getElementById('file_input').click()">
                            <img id="preview_img" style="display:none; max-width:100%; max-height:100%; object-fit:contain;">
                            <div id="img_text" style="text-align:center; color:#94a3b8; font-weight:bold;">📷 ФОТО</div>
                            <input type="file" id="file_input" style="display:none;" onchange="handleFile(this)">
                        </div>
                    </div>
                </td></tr>
            </tbody>
        </table>

        <div class="footer-btns no-print">
            <button class="btn btn-success" onclick="saveToArchive()" style="flex:1.2;">В АРХИВ</button>
            <button class="btn btn-secondary" onclick="window.print()" style="flex:1;">ПЕЧАТЬ</button>
            <button class="btn" onclick="genPDF()" style="background:#2b6cb0; flex:1;">PDF</button>
        </div>
        ${modalsHTML}
    </div>`;

// --- 9. ЛОГИКА ---
function populateSelects() {
    const map = { 
        'equipment_select': 'equipment', 
        'mat': 'materials', 
        'con': 'constructions', 
        'cool': 'coolingMethods', 
        'val_4_1': 'tabletops', 
        'val_4_1_mat': 'tabletopMaterials', 
        'sel_4_2': 'gnTypes', 
        'sel_4_4': 'doorTypes', 
        'sel_4_5': 'drawerTypes', 
        'val_4_5_slides': 'slideTypes', 
        'sel_4_6': 'shelfTypes', 
        'val_4_8': 'lighting', 
        'sel_4_9': 'legs', 
        'sel_4_10': 'wheels', 
        'sel_4_11': 'wheels', 
        'val_4_12': 'ventilation' 
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
    if(el) document.getElementById('dual_temp_zone').style.display = el.value.toLowerCase().includes('комби') ? 'flex' : 'none';
}

function handleRole(el) { 
    if (el.value === 'admin') document.getElementById('loginModal').style.display = 'flex'; 
}

function closeModals() { 
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); 
}

function checkLogin() {
    if (document.getElementById('inputPassword').value === APP_CONFIG.adminPassword) {
        localStorage.setItem('pronto_settings', JSON.stringify({role: 'admin', theme: getSettings().theme}));
        closeModals(); navigate('settings');
    } else alert("Неверно!");
}

function saveNewCredentials() {
    const p = document.getElementById('newPassword').value;
    if (p.length < 3) return alert("Пароль короткий!");
    APP_CONFIG.adminPassword = p; syncToCloud(); closeModals(); alert("Пароль обновлен");
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
        date: new Date().toLocaleDateString(),
        image: uploadedImageBase64
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
        pdf.save(`TZ_${document.getElementById('tz_no').value || 'PRONTO'}.pdf`);
    } catch (err) { alert("Ошибка: " + err); } 
    finally { if (footer) footer.style.display = 'flex'; if (closeBtn) closeBtn.style.display = 'block'; }
}

function deleteFromArchive(i) {
    const arc = getArchive(); arc.splice(i,1);
    localStorage.setItem('pronto_archive', JSON.stringify(arc)); navigate('home');
}

function editFromArchive(i) {
    const d = getArchive()[i]; navigate('template');
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

function createNewTZ() { uploadedImageBase64 = null; navigate('template'); }



