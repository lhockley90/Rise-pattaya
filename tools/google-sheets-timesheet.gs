/**
 * RISE Rooftop timesheet for Google Sheets.
 *
 * The website sends every clock-in, clock-out and manager fix here. This script
 * keeps one row per shift on the "Hours" tab (a clock-out updates the row its
 * clock-in created) and builds a "Weekly totals" tab per person.
 *
 * Setup, once, on a computer (about 5 minutes):
 *  1. In Google Drive, create a new Google Sheet called "RISE Timesheet".
 *  2. Extensions > Apps Script. Delete the sample code and paste this whole file.
 *  3. Change SHARED_KEY below to a long random word. Click Save.
 *  4. Deploy > New deployment > Select type: Web app.
 *       Execute as: Me.   Who has access: Anyone.
 *     Click Deploy and allow the permissions it asks for.
 *  5. Copy the Web app URL. In staff.js set SHEET_URL to that URL and
 *     SHEET_KEY to the same word as SHARED_KEY. Push to GitHub.
 *  6. Share the Google Sheet with Garry (and the accountant) as you would any sheet.
 */

const SHARED_KEY = 'change-this-to-a-long-random-word';

const HEADERS = ['Week starting', 'Date', 'Staff', 'Role', 'Clock in', 'Clock out', 'On site (h)', 'Break (min)', 'Paid hours', 'Scheduled (h)', 'Late (min)', 'Notes', 'Punch ID', 'Last update'];
const ID_COL = 13;

function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return reply_('bad request'); }
  if (body.key !== SHARED_KEY) return reply_('forbidden');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = hoursSheet_();
    const last = sheet.getLastRow();
    const ids = last > 1 ? sheet.getRange(2, ID_COL, last - 1, 1).getValues().map(r => String(r[0])) : [];
    (body.rows || []).forEach(r => {
      const row = [r.week, r.date, r.staff, r.role, r.clockIn, r.clockOut, r.onsite, r.breakMin, r.paid, r.scheduled, r.late, r.notes, r.id, new Date()];
      const i = ids.indexOf(String(r.id));
      if (i >= 0) {
        sheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
      } else {
        sheet.appendRow(row);
        ids.push(String(r.id));
      }
    });
    totalsSheet_();
    return reply_('ok');
  } finally {
    lock.releaseLock();
  }
}

// Visiting the web app URL in a browser shows this, which confirms it is deployed.
function doGet() {
  return reply_('RISE timesheet is connected.');
}

function hoursSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName('Hours');
  if (!sheet) {
    sheet = ss.insertSheet('Hours', 0);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.getRange('A:B').setNumberFormat('@');
    sheet.getRange('E:F').setNumberFormat('@');
  }
  return sheet;
}

function totalsSheet_() {
  const ss = SpreadsheetApp.getActive();
  if (ss.getSheetByName('Weekly totals')) return;
  const t = ss.insertSheet('Weekly totals');
  t.getRange('A1').setFormula(
    "=QUERY(Hours!A:K, \"select A, C, sum(I), sum(J), sum(K) where C is not null group by A, C order by A desc, C " +
    "label A 'Week starting', C 'Staff', sum(I) 'Paid hours', sum(J) 'Scheduled hours', sum(K) 'Minutes late'\", 1)"
  );
  t.setFrozenRows(1);
}

function reply_(text) {
  return ContentService.createTextOutput(text);
}
