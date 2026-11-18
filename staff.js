/* RISE staff tools: rota, clock in/out and hours (timesheet to Google Sheets).
   Lives inside the #staff view of index.html. English and Thai. */
(() => {
  'use strict';
  const R = window.RISE;
  if (!R) return;

  /* =========================================================
     SETTINGS: edit here
     ========================================================= */
  // Google Sheet sync. Paste the web app URL from tools/google-sheets-timesheet.gs
  // and the same key you set there. Leave SHEET_URL empty to keep hours on this device only.
  const SHEET_URL = '';
  const SHEET_KEY = '';
  const BREAK_MIN = 60;            // unpaid break taken off any shift longer than BREAK_AFTER
  const BREAK_AFTER = 5 * 60;      // Thai law: 1-hour break after 5 hours of work
  const DAY_LIMIT = 8;             // Thai Labour Protection Act normal hours per day
  const WEEK_LIMIT = 48;           // ... and per week
  const LATE_GRACE = 10;           // minutes before a clock-in counts as late
  const OT_GRACE = 15;             // minutes over the limit before a shift is flagged
  const STORE = 'rise-staff-v2';

  const ROLE_ORDER = ['manager', 'bar', 'floor', 'host', 'kitchen', 'dj'];
  const ROLE_COL = { manager: '#F5D9A4', bar: '#E4B66C', floor: '#8FB8FF', host: '#C6A6FF', kitchen: '#F2A866', dj: '#4FD8A0' };
  const NEED = { manager: 1, bar: 2, floor: 2, kitchen: 1, dj: 1 };   // minimum cover each night
  const TPL = [
    { k: 'early', s: 14 * 60, e: 23 * 60 },
    { k: 'late', s: 16 * 60, e: 25 * 60 },
    { k: 'kitchen', s: 14 * 60 + 30, e: 23 * 60 + 30 },
    { k: 'dj', s: 17 * 60, e: 23 * 60 },
  ];

  /* =========================================================
     TEXT
     ========================================================= */
  const D = {
    en: {
      roles: { manager: 'Manager', bar: 'Bar', floor: 'Floor', host: 'Host', kitchen: 'Kitchen', dj: 'DJ' },
      tpl: { early: 'Early', late: 'Late', kitchen: 'Kitchen', dj: 'DJ set' },
      days: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], dow: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], mon: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      rota: 'Rota', weekOf: 'Week of {d}', prevWeek: 'Previous week', nextWeek: 'Next week', thisWeek: 'This week', copyLast: 'Copy last week',
      rotaHint: 'Tap any day to add, change or hand over a shift. Hours are paid time, after a {b}-minute break on shifts over 5 hours.',
      staff: 'Staff', hoursCol: 'Hours', nOn: '{n} on', off: 'Off', covered: 'All covered', short: 'Short:',
      workingToday: 'Working today, {d}', nobodyRota: 'Nobody is on the rota today.', inSince: 'In since {t}', notIn: 'Not clocked in',
      newShift: 'New shift', start: 'Start', end: 'Finish', who: 'Who works this shift', paidLine: '{h} paid hours after a {b}-minute break.', paidShort: '{h} paid hours.',
      replaceWarn: '{name} already has a shift that day. Saving replaces it.', saveShift: 'Save shift', removeShift: 'Remove shift', cancel: 'Cancel',
      shiftSaved: 'Shift saved', shiftRemoved: 'Shift removed', badTime: 'Add a start and finish time.',
      copyT: "Copy last week's rota?", copyP: 'This replaces every shift in the week of {d} with last week\'s shifts.', copyBtn: 'Replace this week', copied: 'Rota copied from last week', copyNone: 'Last week has no shifts to copy.',
      clockIn: 'Clock in', tapName: 'Tap your name', onNow: 'On shift now', nobodyIn: 'Nobody is clocked in.', notOnRota: 'Not on the rota today',
      hi: 'Hi {name}', pinIn: 'Enter your PIN to clock in.', pinOut: 'Enter your PIN to clock out.', wrongPin: "That PIN doesn't match. Try again.", del: 'Delete',
      inAt: 'Clocked in at {t}', inSub: 'Have a good shift, {name}.', outAt: 'Clocked out at {t}', outSub: '{d} on site today. Thanks, {name}.', done: 'Done',
      sheetOn: 'Google Sheet connected', sheetOff: 'Google Sheet not connected yet. Hours are saved on this device.', sentSheet: 'Sent to the Google Sheet.', savedDevice: 'Saved on this device.',
      demoPins: 'Demo PINs: Aom 1111, Nok 2222, Beam 3333, Ploy 4444 and so on.',
      hours: 'Hours', hWorked: 'Paid hours worked', hSched: 'Paid hours scheduled', hLate: 'Late arrivals', hMissing: 'Missing clock-outs',
      total: 'Total', sched: 'Rota', diff: 'Difference', sendWeek: 'Send week to Google Sheet', download: 'Download spreadsheet (.csv)',
      fLate: 'Late', fOver: 'Over 8 hours', fMissing: 'No clock-out', fNorota: 'Not on rota', fNoshow: 'No clock-in', fLive: 'On shift now', fWeek: 'Over 48 hours this week',
      hoursNote: 'Paid hours run from clock-in to clock-out, minus a {b}-minute break on shifts over 5 hours. Flags follow Thailand\'s 8-hour day and 48-hour week.',
      tapRow: 'Tap a name to see each shift and fix missed clock-outs.',
      date: 'Date', in: 'In', out: 'Out', paid: 'Paid', fix: 'Fix', addTimes: 'Add times', fixT: 'Fix times for {name}', fixP: '{d}. Leave Out empty if they are still on shift.',
      save: 'Save', timesSaved: 'Times updated', weekSent: 'Week sent to the Google Sheet', connectFirst: 'Connect the Google Sheet first. Download the spreadsheet for now.',
      downloaded: 'Spreadsheet downloaded', demoNote: 'Sample staff and hours, saved on this device. In the live version the rota and hours are shared across every phone and tablet, behind a manager login.', reset: 'Reset sample data', resetDone: 'Sample data reset',
      bookings: 'Bookings',
    },
    th: {
      roles: { manager: 'ผู้จัดการ', bar: 'บาร์', floor: 'พนักงานบริการ', host: 'ต้อนรับ', kitchen: 'ครัว', dj: 'ดีเจ' },
      tpl: { early: 'กะแรก', late: 'กะดึก', kitchen: 'กะครัว', dj: 'ดีเจ' },
      days: ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'], dow: ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'], mon: ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'],
      rota: 'ตารางกะ', weekOf: 'สัปดาห์ของ {d}', prevWeek: 'สัปดาห์ก่อน', nextWeek: 'สัปดาห์ถัดไป', thisWeek: 'สัปดาห์นี้', copyLast: 'คัดลอกสัปดาห์ก่อน',
      rotaHint: 'แตะช่องวันเพื่อเพิ่ม แก้ไข หรือโอนกะให้คนอื่น ชั่วโมงงานหักพัก {b} นาทีสำหรับกะที่เกิน 5 ชั่วโมง',
      staff: 'พนักงาน', hoursCol: 'ชั่วโมง', nOn: 'ทำงาน {n} คน', off: 'หยุด', covered: 'คนครบ', short: 'ขาด:',
      workingToday: 'ทำงานวันนี้ {d}', nobodyRota: 'วันนี้ไม่มีใครในตารางกะ', inSince: 'เข้างาน {t}', notIn: 'ยังไม่ลงเวลา',
      newShift: 'กะใหม่', start: 'เริ่ม', end: 'เลิก', who: 'ผู้ทำกะนี้', paidLine: 'ชั่วโมงงาน {h} ชม. หลังหักพัก {b} นาที', paidShort: 'ชั่วโมงงาน {h} ชม.',
      replaceWarn: 'วันนั้น {name} มีกะอยู่แล้ว การบันทึกจะแทนที่กะเดิม', saveShift: 'บันทึกกะ', removeShift: 'ลบกะ', cancel: 'ยกเลิก',
      shiftSaved: 'บันทึกกะแล้ว', shiftRemoved: 'ลบกะแล้ว', badTime: 'กรุณาใส่เวลาเริ่มและเวลาเลิก',
      copyT: 'คัดลอกตารางกะสัปดาห์ก่อน?', copyP: 'ระบบจะแทนที่กะทั้งหมดในสัปดาห์ของ {d} ด้วยกะของสัปดาห์ก่อน', copyBtn: 'แทนที่สัปดาห์นี้', copied: 'คัดลอกตารางกะจากสัปดาห์ก่อนแล้ว', copyNone: 'สัปดาห์ก่อนไม่มีกะให้คัดลอก',
      clockIn: 'ลงเวลา', tapName: 'แตะชื่อของคุณ', onNow: 'กำลังทำงานอยู่', nobodyIn: 'ยังไม่มีใครลงเวลาเข้า', notOnRota: 'วันนี้ไม่มีกะ',
      hi: 'สวัสดี {name}', pinIn: 'ใส่รหัส PIN เพื่อลงเวลาเข้างาน', pinOut: 'ใส่รหัส PIN เพื่อลงเวลาออก', wrongPin: 'รหัส PIN ไม่ถูกต้อง ลองอีกครั้ง', del: 'ลบ',
      inAt: 'ลงเวลาเข้างาน {t}', inSub: 'ขอให้ทำงานราบรื่นนะ {name}', outAt: 'ลงเวลาออก {t}', outSub: 'วันนี้อยู่ที่ร้าน {d} ขอบคุณนะ {name}', done: 'เสร็จสิ้น',
      sheetOn: 'เชื่อมต่อ Google Sheet แล้ว', sheetOff: 'ยังไม่ได้เชื่อมต่อ Google Sheet ข้อมูลบันทึกไว้ในเครื่องนี้', sentSheet: 'ส่งไปยัง Google Sheet แล้ว', savedDevice: 'บันทึกไว้ในเครื่องนี้แล้ว',
      demoPins: 'PIN ทดลอง: Aom 1111, Nok 2222, Beam 3333, Ploy 4444 ฯลฯ',
      hours: 'ชั่วโมงงาน', hWorked: 'ชั่วโมงทำงานจริง', hSched: 'ชั่วโมงตามตาราง', hLate: 'มาสาย', hMissing: 'ไม่ได้ลงเวลาออก',
      total: 'รวม', sched: 'ตาราง', diff: 'ส่วนต่าง', sendWeek: 'ส่งสัปดาห์นี้ไป Google Sheet', download: 'ดาวน์โหลดสเปรดชีต (.csv)',
      fLate: 'มาสาย', fOver: 'เกิน 8 ชั่วโมง', fMissing: 'ไม่ลงเวลาออก', fNorota: 'ไม่มีในตาราง', fNoshow: 'ไม่ลงเวลาเข้า', fLive: 'กำลังทำงาน', fWeek: 'เกิน 48 ชั่วโมงในสัปดาห์นี้',
      hoursNote: 'ชั่วโมงงานนับจากเวลาเข้าถึงเวลาออก หักพัก {b} นาทีสำหรับกะที่เกิน 5 ชั่วโมง การแจ้งเตือนอิงตามเกณฑ์ 8 ชั่วโมงต่อวันและ 48 ชั่วโมงต่อสัปดาห์',
      tapRow: 'แตะชื่อเพื่อดูแต่ละกะ และแก้ไขกรณีลืมลงเวลาออก',
      date: 'วันที่', in: 'เข้า', out: 'ออก', paid: 'ชั่วโมง', fix: 'แก้ไข', addTimes: 'เพิ่มเวลา', fixT: 'แก้ไขเวลาของ {name}', fixP: '{d} เว้นช่องเวลาออกว่างไว้หากยังทำงานอยู่',
      save: 'บันทึก', timesSaved: 'อัปเดตเวลาแล้ว', weekSent: 'ส่งข้อมูลสัปดาห์ไป Google Sheet แล้ว', connectFirst: 'ต้องเชื่อมต่อ Google Sheet ก่อน ตอนนี้ดาวน์โหลดสเปรดชีตไปก่อนได้',
      downloaded: 'ดาวน์โหลดสเปรดชีตแล้ว', demoNote: 'ข้อมูลพนักงานและชั่วโมงงานตัวอย่าง บันทึกไว้ในเครื่องนี้ ในเวอร์ชันจริงตารางกะและชั่วโมงงานจะใช้ร่วมกันทุกเครื่อง และต้องล็อกอินผู้จัดการ', reset: 'รีเซ็ตข้อมูลตัวอย่าง', resetDone: 'รีเซ็ตข้อมูลตัวอย่างแล้ว',
      bookings: 'การจอง',
    },
  };

  /* =========================================================
     Helpers
     ========================================================= */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const L = () => D[R.lang()] || D.en;
  const t = (k, v = {}) => String(L()[k] ?? D.en[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const hm = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
  const H = 3600e3, BKK = 7 * H;
  const bkk = ms => new Date((ms ?? Date.now()) + BKK);
  const clock = ms => { const d = bkk(ms); return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()); };
  const keyOf = ms => bkk(ms).toISOString().slice(0, 10);
  const bizKey = ms => keyOf(ms - 6 * H);              // 00:00–05:59 belongs to the night before
  const today = () => bizKey(Date.now());
  const parse = k => new Date(k + 'T00:00:00Z');
  const addDays = (k, n) => { const d = parse(k); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const weekOf = k => addDays(k, -((parse(k).getUTCDay() + 6) % 7));   // Monday
  const epoch = (k, min) => parse(k).getTime() + min * 60000 - BKK;    // Bangkok minutes on day k → UTC ms
  const minOf = (ms, k) => Math.round((ms - epoch(k, 0)) / 60000);
  const dayShort = k => { const d = parse(k); return L().dow[d.getUTCDay()] + ' ' + d.getUTCDate(); };
  const dayLong = k => { const d = parse(k); return L().days[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + L().mon[d.getUTCMonth()]; };
  const dur = m => { m = Math.max(0, Math.round(m)); const h = Math.floor(m / 60), x = m % 60; return R.lang() === 'th' ? (h ? h + ' ชม. ' : '') + x + ' นาที' : (h ? h + 'h ' : '') + x + 'm'; };
  const paidMin = onsite => onsite > BREAK_AFTER ? onsite - BREAK_MIN : onsite;
  const hrs = m => (m / 60).toFixed(1);
  const toMin = v => { const m = /^(\d{1,2}):(\d{2})/.exec(v || ''); return m ? +m[1] * 60 + +m[2] : null; };
  function rng(seed) {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    let a = h >>> 0;
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
  }

  /* =========================================================
     Data (sample, saved on this device)
     ========================================================= */
  function sample() {
    const staff = [
      { id: 's1', name: 'Aom', role: 'manager', pin: '1111' },
      { id: 's2', name: 'Nok', role: 'bar', pin: '2222' },
      { id: 's3', name: 'Beam', role: 'bar', pin: '3333' },
      { id: 's4', name: 'Ploy', role: 'floor', pin: '4444' },
      { id: 's5', name: 'Mint', role: 'floor', pin: '5555' },
      { id: 's6', name: 'Toey', role: 'host', pin: '6666' },
      { id: 's7', name: 'Ton', role: 'kitchen', pin: '7777' },
      { id: 's8', name: 'Joy', role: 'kitchen', pin: '8888' },
      { id: 's9', name: 'May', role: 'dj', pin: '9999' },
      { id: 's10', name: 'Kai', role: 'dj', pin: '1010' },
      { id: 's11', name: 'Fern', role: 'bar', pin: '1212' },
      { id: 's12', name: 'Bank', role: 'floor', pin: '1313' },
      { id: 's13', name: 'Pond', role: 'manager', pin: '1414' },
    ];
    const r = rng('rise-rota'), shifts = [], punches = [];
    const w0 = addDays(weekOf(today()), -14);
    let seq = 0;
    for (let d = 0; d < 28; d++) {
      const k = addDays(w0, d), dw = d % 7, wk = Math.floor(d / 7);
      staff.forEach((p, i) => {
        let tpl;
        if (p.role === 'dj') {
          const kaiNight = dw === 1 || dw === 2;
          if ((p.id === 's10') !== kaiNight) return;
          tpl = 'dj';
        } else {
          if (dw === (i * 3 + wk) % 7) return;                 // one day off, rotating weekly
          tpl = p.role === 'kitchen' ? 'kitchen' : p.role === 'manager' ? 'early' : ((i + wk + (dw > 3 ? 1 : 0)) % 2 ? 'late' : 'early');
        }
        const T0 = TPL.find(x => x.k === tpl);
        shifts.push({ id: 'h' + (++seq), staff: p.id, date: k, s: T0.s, e: T0.e, role: p.role });
      });
    }
    const now = Date.now();
    shifts.forEach(sh => {
      const start = epoch(sh.date, sh.s), end = epoch(sh.date, sh.e);
      if (start > now || r() < 0.03) return;                  // not started yet, or a no-show
      const late = r() < 0.1 ? 11 + Math.floor(r() * 25) : Math.floor(r() * 16) - 9;
      const pin = start + late * 60000;
      if (pin > now) return;
      let out = end + (Math.floor(r() * 22) - 6 + (r() < 0.12 ? 40 : 0)) * 60000;
      if (out > now) out = null;
      punches.push({ id: 'p' + (++seq), staff: sh.staff, in: pin, out, note: '' });
    });
    const lastWeek = punches.filter(p => p.out && bizKey(p.in) < weekOf(today()));
    if (lastWeek.length > 6) lastWeek[lastWeek.length - 6].out = null;      // one forgotten clock-out
    return { v: 1, staff, shifts, punches, seq: seq + 1 };
  }
  let S;
  try { const v = JSON.parse(localStorage.getItem(STORE)); if (v && v.v === 1) S = v; } catch (_) {}
  if (!S) S = sample();
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (_) {} };
  save();

  const ui = { tab: 'bookings', rotaWeek: weekOf(today()), hoursWeek: weekOf(today()), open: null };
  const person = id => S.staff.find(p => p.id === id);
  const roleName = r => L().roles[r] || r;
  const shiftOf = (pid, k) => S.shifts.find(x => x.staff === pid && x.date === k);
  const isMissing = p => !p.out && Date.now() - p.in >= 16 * H;
  const openPunch = pid => S.punches.find(p => p.staff === pid && !p.out && !isMissing(p));
  const byRole = list => list.slice().sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.name.localeCompare(b.name));

  /* =========================================================
     Google Sheet sync
     ========================================================= */
  const sheetOn = () => !!SHEET_URL;
  function rowFor(p) {
    const k = bizKey(p.in), who = person(p.staff) || { name: '?', role: '' }, sh = shiftOf(p.staff, k);
    const onsite = p.out ? Math.round((p.out - p.in) / 60000) : null;
    return {
      id: p.id, week: weekOf(k), date: k, staff: who.name, role: D.en.roles[who.role] || who.role,
      clockIn: clock(p.in), clockOut: p.out ? clock(p.out) : '',
      onsite: onsite == null ? '' : +(onsite / 60).toFixed(2), breakMin: onsite != null && onsite > BREAK_AFTER ? BREAK_MIN : 0,
      paid: onsite == null ? '' : +(paidMin(onsite) / 60).toFixed(2), scheduled: sh ? +(paidMin(sh.e - sh.s) / 60).toFixed(2) : 0,
      late: sh ? Math.max(0, minOf(p.in, k) - sh.s) : '', notes: [p.note, sh ? '' : 'Not on rota', isMissing(p) ? 'No clock-out' : ''].filter(Boolean).join('; '),
    };
  }
  function send(list) {
    if (!sheetOn() || !list.length) return false;
    try {
      fetch(SHEET_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key: SHEET_KEY, rows: list.map(rowFor) }) }).catch(() => {});
    } catch (_) { return false; }
    list.forEach(p => { p.sent = Date.now(); });
    save();
    return true;
  }

  let toastT;
  function toast(msg) {
    let el = $('#stoast');
    if (!el) { el = document.createElement('div'); el.id = 'stoast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('is-on'), 2600);
  }
  const demoNote = () => `<p class="fine demo-note">${t('demoNote')} <button type="button" class="linkbtn" data-s="reset">${t('reset')}</button></p>`;

  /* =========================================================
     Rota
     ========================================================= */
  function renderRota() {
    const el = $('#tab-rota'), wk = ui.rotaWeek, td = today();
    const days = [...Array(7)].map((_, i) => addDays(wk, i));
    const cov = days.map(k => {
      const on = S.shifts.filter(x => x.date === k), by = {};
      on.forEach(x => { by[x.role] = (by[x.role] || 0) + 1; });
      return { n: on.length, short: Object.keys(NEED).filter(r => (by[r] || 0) < NEED[r]).map(r => `${roleName(r)} ${by[r] || 0}/${NEED[r]}`) };
    });
    let html = `<div class="tool-bar"><h2>${t('rota')}</h2>
      <div class="daynav"><button type="button" data-s="rw" data-n="-7" aria-label="${t('prevWeek')}">&lsaquo;</button><strong>${t('weekOf', { d: dayLong(wk) })}</strong><button type="button" data-s="rw" data-n="7" aria-label="${t('nextWeek')}">&rsaquo;</button></div>
      <div class="tool-actions"><button type="button" class="btn btn--small" data-s="rw" data-n="0">${t('thisWeek')}</button><button type="button" class="btn btn--small" data-s="rcopy">${t('copyLast')}</button></div></div>
      <p class="tool-hint">${t('rotaHint', { b: BREAK_MIN })}</p>
      <div class="rota-scroll"><table class="rota"><thead><tr><th scope="col" class="r-name">${t('staff')}</th>`;
    days.forEach((k, i) => {
      html += `<th scope="col" class="${k === td ? 'is-today' : ''}"><span>${dayShort(k)}</span><small>${t('nOn', { n: cov[i].n })}</small>${cov[i].short.length ? `<em class="r-short">${t('short')} ${cov[i].short.map(esc).join(', ')}</em>` : `<em class="r-ok">${t('covered')}</em>`}</th>`;
    });
    html += `<th scope="col" class="r-tot">${t('hoursCol')}</th></tr></thead><tbody>`;
    byRole(S.staff).forEach(p => {
      let tot = 0;
      html += `<tr><th scope="row" class="r-name"><span class="r-dot" style="--c:${ROLE_COL[p.role]}"></span>${esc(p.name)}<small>${roleName(p.role)}</small></th>`;
      days.forEach(k => {
        const sh = shiftOf(p.id, k);
        if (sh) tot += paidMin(sh.e - sh.s);
        html += `<td class="${k === td ? 'is-today' : ''}"><button type="button" class="rcell" data-s="rc" data-p="${p.id}" data-k="${k}" aria-label="${esc(p.name)}, ${dayLong(k)}: ${sh ? hm(sh.s) + '–' + hm(sh.e) : t('off')}">${sh ? `<span class="shift" style="--c:${ROLE_COL[sh.role] || ROLE_COL[p.role]}">${hm(sh.s)}–${hm(sh.e)}</span>` : `<span class="off">${t('off')}</span>`}</button></td>`;
      });
      html += `<td class="r-tot${tot / 60 > WEEK_LIMIT ? ' is-over' : ''}" title="${tot / 60 > WEEK_LIMIT ? esc(t('fWeek')) : ''}">${hrs(tot)}</td></tr>`;
    });
    html += '</tbody></table></div>';
    const on = S.shifts.filter(x => x.date === td).sort((a, b) => a.s - b.s);
    html += `<div class="today-box"><h3>${t('workingToday', { d: dayLong(td) })}</h3>` + (on.length
      ? '<ul class="today-list">' + on.map(x => {
          const p = person(x.staff), op = openPunch(x.staff);
          return `<li><span class="r-dot" style="--c:${ROLE_COL[x.role]}"></span><b>${esc(p ? p.name : '?')}</b><span>${roleName(x.role)}</span><span class="num">${hm(x.s)}–${hm(x.e)}</span><span class="${op ? 'st-in' : 'st-out'}">${op ? t('inSince', { t: clock(op.in) }) : t('notIn')}</span></li>`;
        }).join('') + '</ul>'
      : `<p class="fine">${t('nobodyRota')}</p>`) + '</div>';
    el.innerHTML = html + demoNote();
  }

  function shiftEditor(pid, k) {
    const p = person(pid), sh = shiftOf(pid, k);
    const def = TPL.find(x => x.k === (p.role === 'kitchen' ? 'kitchen' : p.role === 'dj' ? 'dj' : 'early'));
    const s0 = sh ? sh.s : def.s, e0 = sh ? sh.e : def.e;
    R.openModal(`<h3 id="mTitle">${esc(p.name)}, ${dayLong(k)}</h3><p>${roleName(p.role)}${sh ? '' : '. ' + t('newShift')}</p>
      <div class="tpls">${TPL.map(x => `<button type="button" class="chip" data-s="tpl" data-a="${x.s}" data-b="${x.e}">${L().tpl[x.k]}<small>${hm(x.s)}–${hm(x.e)}</small></button>`).join('')}</div>
      <div class="field-row"><div class="field"><label for="eS">${t('start')}</label><input type="time" id="eS" value="${hm(s0)}" step="900"></div><div class="field"><label for="eE">${t('end')}</label><input type="time" id="eE" value="${hm(e0)}" step="900"></div></div>
      <div class="field"><label for="eW">${t('who')}</label><select id="eW">${byRole(S.staff).map(x => `<option value="${x.id}"${x.id === pid ? ' selected' : ''}>${esc(x.name)}, ${roleName(x.role)}</option>`).join('')}</select></div>
      <p class="fine" id="ePaid"></p><p class="form-msg" id="eMsg" role="alert"></p>
      <div class="m-actions"><button type="button" class="btn btn--primary" data-s="sh-save" data-p="${pid}" data-k="${k}">${t('saveShift')}</button>${sh ? `<button type="button" class="btn" data-s="sh-del" data-p="${pid}" data-k="${k}">${t('removeShift')}</button>` : ''}</div>`);
    ui.open = { type: 'shift', pid, k };
    shiftPreview();
  }
  function shiftTimes() {
    const s = toMin($('#eS') && $('#eS').value); let e = toMin($('#eE') && $('#eE').value);
    if (s == null || e == null) return null;
    if (e <= s) e += 1440;
    return { s, e };
  }
  function shiftPreview() {
    if (!ui.open || ui.open.type !== 'shift') return;
    const tm = shiftTimes(), who = $('#eW') ? $('#eW').value : ui.open.pid;
    $('#ePaid').textContent = tm ? ((tm.e - tm.s) > BREAK_AFTER ? t('paidLine', { h: hrs(paidMin(tm.e - tm.s)), b: BREAK_MIN }) : t('paidShort', { h: hrs(tm.e - tm.s) })) : '';
    const clash = who !== ui.open.pid && shiftOf(who, ui.open.k);
    $('#eMsg').textContent = clash ? t('replaceWarn', { name: person(who).name }) : '';
  }
  function shiftSave(pid, k) {
    const tm = shiftTimes();
    if (!tm) { $('#eMsg').textContent = t('badTime'); return; }
    const who = $('#eW').value;
    S.shifts = S.shifts.filter(x => !(x.date === k && (x.staff === pid || x.staff === who)));
    S.shifts.push({ id: 'h' + (S.seq++), staff: who, date: k, s: tm.s, e: tm.e, role: person(who).role });
    save(); ui.open = null; R.closeModal(); toast(t('shiftSaved')); render();
  }

  /* =========================================================
     Clock in / out
     ========================================================= */
  function renderClock() {
    const el = $('#tab-clock'), td = today();
    const ppl = S.staff.slice().sort((a, b) => {
      const sa = shiftOf(a.id, td), sb = shiftOf(b.id, td);
      if (!!sa !== !!sb) return sa ? -1 : 1;
      return ((sa ? sa.s : 0) - (sb ? sb.s : 0)) || a.name.localeCompare(b.name);
    });
    const inNow = S.punches.filter(p => !p.out && !isMissing(p)).sort((a, b) => a.in - b.in);
    el.innerHTML = `<div class="kiosk-top"><div><p class="k-time" id="kTime"></p><p class="k-date">${dayLong(keyOf(Date.now()))}</p></div><p class="k-sync${sheetOn() ? ' is-on' : ''}">${sheetOn() ? t('sheetOn') : t('sheetOff')}</p></div>
      <h2 class="k-h">${t('tapName')}</h2>
      <div class="kgrid">${ppl.map(p => {
        const sh = shiftOf(p.id, td), op = openPunch(p.id);
        return `<button type="button" class="kbtn${op ? ' is-in' : ''}" data-s="kpick" data-p="${p.id}"><span class="k-name">${esc(p.name)}</span><span class="k-role">${roleName(p.role)}</span><span class="k-shift num">${sh ? hm(sh.s) + '–' + hm(sh.e) : t('notOnRota')}</span><span class="k-state">${op ? t('inSince', { t: clock(op.in) }) : t('notIn')}</span></button>`;
      }).join('')}</div>
      <div class="today-box"><h3>${t('onNow')}</h3>${inNow.length ? '<ul class="today-list">' + inNow.map(p => {
        const who = person(p.staff) || { name: '?', role: 'bar' };
        return `<li><span class="r-dot" style="--c:${ROLE_COL[who.role]}"></span><b>${esc(who.name)}</b><span>${roleName(who.role)}</span><span class="st-in">${t('inSince', { t: clock(p.in) })}</span><span class="num">${dur((Date.now() - p.in) / 60000)}</span></li>`;
      }).join('') + '</ul>' : `<p class="fine">${t('nobodyIn')}</p>`}</div>
      <p class="fine">${t('demoPins')}</p>` + demoNote();
    tick();
  }
  function tick() {
    const el = $('#kTime'); if (!el) return;
    const d = bkk();
    el.innerHTML = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}<small>:${pad(d.getUTCSeconds())}</small>`;
  }
  let pinBuf = '';
  function pinPad(pid) {
    const p = person(pid), op = openPunch(pid);
    pinBuf = '';
    ui.open = { type: 'pin', pid };
    R.openModal(`<div class="pin"><h3 id="mTitle">${t('hi', { name: esc(p.name) })}</h3><p>${op ? t('pinOut') : t('pinIn')}</p>
      <div class="pin-dots" id="pinDots" aria-hidden="true"><i></i><i></i><i></i><i></i></div><p class="form-msg" id="pinMsg" role="alert"></p>
      <div class="pin-pad">${[1,2,3,4,5,6,7,8,9].map(n => `<button type="button" data-s="pk" data-n="${n}">${n}</button>`).join('')}<span></span><button type="button" data-s="pk" data-n="0">0</button><button type="button" data-s="pdel" aria-label="${t('del')}">&#9003;</button></div></div>`);
  }
  function pinKey(n) {
    if (!ui.open || ui.open.type !== 'pin' || pinBuf.length >= 4) return;
    pinBuf += n;
    $$('#pinDots i').forEach((d, i) => d.classList.toggle('on', i < pinBuf.length));
    if (pinBuf.length < 4) return;
    const p = person(ui.open.pid);
    if (pinBuf === p.pin) { punch(p.id); return; }
    $('#pinMsg').textContent = t('wrongPin');
    const dots = $('#pinDots'); dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake');
    setTimeout(() => { pinBuf = ''; $$('#pinDots i').forEach(d => d.classList.remove('on')); }, 450);
  }
  function punch(pid) {
    const p = person(pid), op = openPunch(pid), now = Date.now();
    let title, sub, rec;
    if (op) { op.out = now; rec = op; title = t('outAt', { t: clock(now) }); sub = t('outSub', { d: dur((now - op.in) / 60000), name: esc(p.name) }); }
    else { rec = { id: 'p' + (S.seq++), staff: pid, in: now, out: null, note: '' }; S.punches.push(rec); title = t('inAt', { t: clock(now) }); sub = t('inSub', { name: esc(p.name) }); }
    save();
    const sent = send([rec]);
    const token = {};
    ui.open = { type: 'done', token };
    $('#mBody').innerHTML = `<div class="pin"><div class="tick" style="margin:0 auto 16px" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0A0E20" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
      <h3 id="mTitle">${title}</h3><p>${sub}</p><p class="fine">${sent ? t('sentSheet') : t('savedDevice')}</p>
      <button type="button" class="btn btn--primary btn--block" data-s="mclose">${t('done')}</button></div>`;
    $('#mBody [data-s="mclose"]').focus();
    render();
    setTimeout(() => { if (ui.open && ui.open.token === token && !$('#modal').hidden) { ui.open = null; R.closeModal(); } }, 4000);
  }

  /* =========================================================
     Hours
     ========================================================= */
  function weekData(wk) {
    const days = [...Array(7)].map((_, i) => addDays(wk, i)), now = Date.now();
    const rows = byRole(S.staff).map(p => {
      const cells = days.map(k => {
        const ps = S.punches.filter(x => x.staff === p.id && bizKey(x.in) === k).sort((a, b) => a.in - b.in);
        const sh = shiftOf(p.id, k), flags = new Set();
        let paid = 0;
        ps.forEach(x => {
          if (isMissing(x)) flags.add('missing');
          else { if (!x.out) flags.add('live'); paid += paidMin(((x.out || now) - x.in) / 60000); }
          if (sh && minOf(x.in, k) > sh.s + LATE_GRACE) flags.add('late');
          if (!sh) flags.add('norota');
        });
        if (paid > DAY_LIMIT * 60 + OT_GRACE) flags.add('over');
        if (sh && !ps.length && epoch(k, sh.e) < now) flags.add('noshow');
        return { k, ps, sh, paid, sched: sh ? paidMin(sh.e - sh.s) : 0, flags };
      });
      const paid = cells.reduce((a, c) => a + c.paid, 0), sched = cells.reduce((a, c) => a + c.sched, 0);
      return { p, cells, paid, sched, over: paid > WEEK_LIMIT * 60 + OT_GRACE };
    });
    return { days, rows };
  }
  const FLAG_KEYS = ['late', 'over', 'missing', 'norota', 'noshow', 'live'];
  const flagLabel = f => ({ late: t('fLate'), over: t('fOver'), missing: t('fMissing'), norota: t('fNorota'), noshow: t('fNoshow'), live: t('fLive') }[f]);
  const flagDots = set => set.size ? `<span class="flags">${FLAG_KEYS.filter(f => set.has(f)).map(f => `<i class="f-${f}" title="${esc(flagLabel(f))}"></i>`).join('')}</span>` : '';

  function renderHours() {
    const el = $('#tab-hours'), wk = ui.hoursWeek, td = today();
    const { days, rows } = weekData(wk);
    const totPaid = rows.reduce((a, r) => a + r.paid, 0), totSched = rows.reduce((a, r) => a + r.sched, 0);
    const late = rows.reduce((a, r) => a + r.cells.filter(c => c.flags.has('late')).length, 0);
    const miss = rows.reduce((a, r) => a + r.cells.filter(c => c.flags.has('missing')).length, 0);
    let html = `<div class="tool-bar"><h2>${t('hours')}</h2>
      <div class="daynav"><button type="button" data-s="hw" data-n="-7" aria-label="${t('prevWeek')}">&lsaquo;</button><strong>${t('weekOf', { d: dayLong(wk) })}</strong><button type="button" data-s="hw" data-n="7" aria-label="${t('nextWeek')}">&rsaquo;</button></div>
      <div class="tool-actions"><button type="button" class="btn btn--small${sheetOn() ? ' btn--primary' : ''}" data-s="hsend">${t('sendWeek')}</button><button type="button" class="btn btn--small" data-s="hcsv">${t('download')}</button></div></div>
      <div class="stats"><div class="stat"><b>${hrs(totPaid)}</b><span>${t('hWorked')}</span></div><div class="stat"><b>${hrs(totSched)}</b><span>${t('hSched')}</span></div><div class="stat"><b>${late}</b><span>${t('hLate')}</span></div><div class="stat"><b>${miss}</b><span>${t('hMissing')}</span></div></div>
      <p class="tool-hint">${t('tapRow')} <span class="k-sync${sheetOn() ? ' is-on' : ''}" style="margin-left:6px">${sheetOn() ? t('sheetOn') : t('sheetOff')}</span></p>
      <div class="hours-scroll"><table class="hours-t"><thead><tr><th scope="col" class="r-name">${t('staff')}</th>`;
    days.forEach(k => { html += `<th scope="col" class="${k === td ? 'is-today' : ''}">${dayShort(k)}</th>`; });
    html += `<th scope="col" class="r-tot">${t('total')}</th><th scope="col" class="r-tot">${t('sched')}</th><th scope="col" class="r-tot">${t('diff')}</th></tr></thead><tbody>`;
    rows.forEach(r => {
      const diff = r.paid - r.sched, openRow = ui.hoursOpen === r.p.id;
      html += `<tr class="h-row${openRow ? ' is-open' : ''}" data-s="hrow" data-p="${r.p.id}" tabindex="0" aria-expanded="${openRow}"><th scope="row" class="r-name"><span class="r-dot" style="--c:${ROLE_COL[r.p.role]}"></span>${esc(r.p.name)}<small>${roleName(r.p.role)}</small></th>`;
      r.cells.forEach(c => { html += `<td class="${c.k === td ? 'is-today' : ''}">${c.paid ? hrs(c.paid) : (c.sh ? '<span class="dim">–</span>' : '')}${flagDots(c.flags)}</td>`; });
      html += `<td class="r-tot${r.over ? ' is-over' : ''}" title="${r.over ? esc(t('fWeek')) : ''}">${hrs(r.paid)}</td><td class="r-tot dim">${hrs(r.sched)}</td><td class="r-tot ${diff < -30 ? 'neg' : diff > 30 ? 'pos' : 'dim'}">${diff >= 0 ? '+' : ''}${hrs(diff)}</td></tr>`;
      if (openRow) {
        const lines = r.cells.filter(c => c.ps.length || c.flags.has('noshow'));
        html += `<tr class="h-detail"><td colspan="${days.length + 4}"><table class="plist"><thead><tr><th>${t('date')}</th><th>${t('in')}</th><th>${t('out')}</th><th>${t('paid')}</th><th></th><th></th></tr></thead><tbody>` +
          lines.map(c => c.ps.length ? c.ps.map(x => {
            const pm = isMissing(x) ? null : paidMin(((x.out || Date.now()) - x.in) / 60000);
            const fl = new Set([...c.flags].filter(f => f !== 'over' || pm > DAY_LIMIT * 60 + OT_GRACE));
            return `<tr><td>${dayLong(c.k)}</td><td class="num">${clock(x.in)}</td><td class="num">${x.out ? clock(x.out) : (isMissing(x) ? `<span class="neg">${t('fMissing')}</span>` : `<span class="st-in">${t('fLive')}</span>`)}</td><td class="num">${pm == null ? '' : hrs(pm)}</td><td>${[...fl].filter(f => f !== 'live' && f !== 'missing').map(flagLabel).join(', ')}</td><td><button type="button" class="btn btn--small" data-s="pfix" data-id="${x.id}">${t('fix')}</button></td></tr>`;
          }).join('') : `<tr><td>${dayLong(c.k)}</td><td colspan="3" class="dim">${t('fNoshow')}</td><td></td><td><button type="button" class="btn btn--small" data-s="padd" data-p="${r.p.id}" data-k="${c.k}">${t('addTimes')}</button></td></tr>`).join('') +
          '</tbody></table></td></tr>';
      }
    });
    html += `</tbody></table></div>
      <ul class="flag-key">${FLAG_KEYS.map(f => `<li><i class="fk f-${f}"></i>${flagLabel(f)}</li>`).join('')}</ul>
      <p class="fine">${t('hoursNote', { b: BREAK_MIN })}</p>` + demoNote();
    el.innerHTML = html;
  }

  function punchEditor(rec, pid, k) {
    const p = person(rec ? rec.staff : pid), day = rec ? bizKey(rec.in) : k, sh = shiftOf(p.id, day);
    ui.open = { type: 'punch', id: rec ? rec.id : null, pid: p.id, k: day };
    R.openModal(`<h3 id="mTitle">${t('fixT', { name: esc(p.name) })}</h3><p>${t('fixP', { d: dayLong(day) })}</p>
      <div class="field-row"><div class="field"><label for="pI">${t('in')}</label><input type="time" id="pI" value="${rec ? clock(rec.in) : (sh ? hm(sh.s) : '')}"></div><div class="field"><label for="pO">${t('out')}</label><input type="time" id="pO" value="${rec && rec.out ? clock(rec.out) : (rec ? '' : (sh ? hm(sh.e) : ''))}"></div></div>
      <p class="form-msg" id="pMsg" role="alert"></p>
      <div class="m-actions"><button type="button" class="btn btn--primary" data-s="psave">${t('save')}</button></div>`);
  }
  function punchSave() {
    const o = ui.open, iMin = toMin($('#pI').value); let oMin = toMin($('#pO').value);
    if (iMin == null) { $('#pMsg').textContent = t('badTime'); return; }
    const inMs = epoch(o.k, iMin < 6 * 60 ? iMin + 1440 : iMin);
    let outMs = null;
    if (oMin != null) { let om = oMin; const im = iMin < 6 * 60 ? iMin + 1440 : iMin; while (om <= im) om += 1440; outMs = epoch(o.k, om); }
    let rec = o.id && S.punches.find(x => x.id === o.id);
    if (!rec) { rec = { id: 'p' + (S.seq++), staff: o.pid, in: inMs, out: outMs, note: 'Added by manager' }; S.punches.push(rec); }
    else { rec.in = inMs; rec.out = outMs; rec.note = 'Edited by manager'; }
    save(); send([rec]); ui.open = null; R.closeModal(); toast(t('timesSaved')); render();
  }

  function csv(wk) {
    const { rows } = weekData(wk);
    const out = [['Week starting', 'Date', 'Staff', 'Role', 'Clock in', 'Clock out', 'On site (h)', 'Break (min)', 'Paid hours', 'Scheduled (h)', 'Late (min)', 'Notes']];
    S.punches.filter(p => weekOf(bizKey(p.in)) === wk).sort((a, b) => a.in - b.in).forEach(p => {
      const r = rowFor(p);
      out.push([r.week, r.date, r.staff, r.role, r.clockIn, r.clockOut, r.onsite, r.breakMin, r.paid, r.scheduled, r.late, r.notes]);
    });
    out.push([]);
    out.push(['Week totals', wk, 'Staff', 'Role', '', '', '', '', 'Paid hours', 'Scheduled (h)', '', 'Notes']);
    rows.forEach(r => out.push(['', '', r.p.name, D.en.roles[r.p.role], '', '', '', '', +(r.paid / 60).toFixed(2), +(r.sched / 60).toFixed(2), '', r.over ? 'Over 48 hours' : '']));
    return '﻿' + out.map(l => l.map(v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n');
  }
  function downloadCsv(wk) {
    const blob = new Blob([csv(wk)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `rise-timesheet-${wk}.csv`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast(t('downloaded'));
  }

  /* =========================================================
     Tabs, events
     ========================================================= */
  const TABS = ['bookings', 'rota', 'clock', 'hours'];
  function render() {
    if (!location.hash.startsWith('#staff')) return;
    if (ui.tab === 'rota') renderRota();
    else if (ui.tab === 'clock') renderClock();
    else if (ui.tab === 'hours') renderHours();
  }
  function syncTab() {
    const h = location.hash;
    if (!h.startsWith('#staff')) return;
    const tab = h === '#staff' ? 'bookings' : h.replace('#staff-', '');
    ui.tab = TABS.includes(tab) ? tab : 'bookings';
    TABS.forEach(x => { const el = $('#tab-' + x); if (el) el.hidden = x !== ui.tab; });
    $$('.stabs [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === ui.tab)));
    render();
  }
  window.addEventListener('hashchange', syncTab);
  R.onLang.push(render);

  $('#staff').addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    const a = b.dataset.s;
    if (a === 'rw') { const n = +b.dataset.n; ui.rotaWeek = n ? addDays(ui.rotaWeek, n) : weekOf(today()); renderRota(); }
    else if (a === 'rc') shiftEditor(b.dataset.p, b.dataset.k);
    else if (a === 'rcopy') {
      ui.open = { type: 'copy' };
      R.openModal(`<h3 id="mTitle">${t('copyT')}</h3><p>${t('copyP', { d: dayLong(ui.rotaWeek) })}</p><div class="m-actions"><button type="button" class="btn btn--primary" data-s="rcopy-ok">${t('copyBtn')}</button><button type="button" class="btn" data-s="mclose">${t('cancel')}</button></div>`);
    }
    else if (a === 'kpick') pinPad(b.dataset.p);
    else if (a === 'hw') { ui.hoursWeek = addDays(ui.hoursWeek, +b.dataset.n); renderHours(); }
    else if (a === 'hrow') { ui.hoursOpen = ui.hoursOpen === b.dataset.p ? null : b.dataset.p; renderHours(); }
    else if (a === 'pfix') { e.stopPropagation(); punchEditor(S.punches.find(x => x.id === b.dataset.id)); }
    else if (a === 'padd') { e.stopPropagation(); punchEditor(null, b.dataset.p, b.dataset.k); }
    else if (a === 'hsend') {
      if (!sheetOn()) { toast(t('connectFirst')); return; }
      send(S.punches.filter(p => weekOf(bizKey(p.in)) === ui.hoursWeek)); toast(t('weekSent'));
    }
    else if (a === 'hcsv') downloadCsv(ui.hoursWeek);
    else if (a === 'reset') { S = sample(); save(); toast(t('resetDone')); render(); }
  });
  $('#staff').addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.h-row')) { e.preventDefault(); e.target.click(); }
  });

  const mBody = $('#mBody');
  mBody.addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    const a = b.dataset.s;
    if (a === 'tpl') { $('#eS').value = hm(+b.dataset.a); $('#eE').value = hm(+b.dataset.b); shiftPreview(); }
    else if (a === 'sh-save') shiftSave(b.dataset.p, b.dataset.k);
    else if (a === 'sh-del') { S.shifts = S.shifts.filter(x => !(x.staff === b.dataset.p && x.date === b.dataset.k)); save(); ui.open = null; R.closeModal(); toast(t('shiftRemoved')); render(); }
    else if (a === 'rcopy-ok') {
      const prev = addDays(ui.rotaWeek, -7), src = S.shifts.filter(x => weekOf(x.date) === prev);
      if (!src.length) { toast(t('copyNone')); ui.open = null; R.closeModal(); return; }
      S.shifts = S.shifts.filter(x => weekOf(x.date) !== ui.rotaWeek).concat(src.map(x => ({ ...x, id: 'h' + (S.seq++), date: addDays(x.date, 7) })));
      save(); ui.open = null; R.closeModal(); toast(t('copied')); render();
    }
    else if (a === 'pk') pinKey(b.dataset.n);
    else if (a === 'pdel') { pinBuf = pinBuf.slice(0, -1); $$('#pinDots i').forEach((d, i) => d.classList.toggle('on', i < pinBuf.length)); $('#pinMsg').textContent = ''; }
    else if (a === 'psave') punchSave();
    else if (a === 'mclose') { ui.open = null; R.closeModal(); }
  });
  mBody.addEventListener('input', e => { if (e.target.matches('#eS, #eE, #eW')) shiftPreview(); });
  mBody.addEventListener('change', e => { if (e.target.matches('#eW')) shiftPreview(); });
  document.addEventListener('keydown', e => {
    if ($('#modal').hidden || !ui.open || ui.open.type !== 'pin') return;
    if (/^\d$/.test(e.key)) { e.preventDefault(); pinKey(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); mBody.querySelector('[data-s="pdel"]').click(); }
  });

  setInterval(() => { if (ui.tab === 'clock' && location.hash.startsWith('#staff')) tick(); }, 1000);
  setInterval(() => { if (location.hash.startsWith('#staff') && $('#modal').hidden && ui.tab !== 'bookings') render(); }, 60000);

  syncTab();
  window.__staff = { S: () => S, weekData, csv, rowFor, send, today };
})();
