import { ref } from 'vue';

export const BACKUP_FORMAT_ERROR = 'รูปแบบไฟล์ไม่ถูกต้อง หรือไม่พบข้อมูลเซสชันการฝึกที่รองรับ';
export const BACKUP_NETWORK_ERROR = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';

/**
 * Robust CSV parser that handles quoted commas and line breaks
 */
export function parseCsvRows(text) {
  if (!text || typeof text !== 'string') return { headers: [], rows: [] };
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };

  function parseLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  }

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map((h) => h.replace(/^["']|["']$/g, '').trim());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx].replace(/^["']|["']$/g, '') : '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Detect format and extract quick summary from CSV rows
 */
export function analyzeCsvContent(text) {
  const { headers, rows } = parseCsvRows(text);
  if (!rows.length) {
    throw new Error(BACKUP_FORMAT_ERROR);
  }

  const lowerHeaders = headers.map((h) => h.toLowerCase());
  const has = (key) => lowerHeaders.some((h) => h.includes(key));

  let detectedType = 'CSV ทั่วไป';
  if (has('workout name') && has('set order')) {
    detectedType = 'Strong CSV';
  } else if (has('exercise title') || (has('workout name') && has('set type'))) {
    detectedType = 'Hevy CSV';
  } else if (has('day') || has('sets')) {
    detectedType = 'GYM CSV';
  }

  // Find date column
  const dateCol = headers.find((h) => h.toLowerCase().includes('date')) || headers[0];
  const workoutCol = headers.find((h) => {
    const l = h.toLowerCase();
    return l.includes('workout') || l.includes('routine') || l.includes('title') || l.includes('day');
  }) || dateCol;

  const sessionKeys = new Set();
  const dates = [];

  for (const r of rows) {
    const d = r[dateCol] || '';
    const w = r[workoutCol] || '';
    if (d) {
      sessionKeys.add(`${d}__${w}`);
      const cleanDate = d.split(' ')[0];
      if (cleanDate && cleanDate.length >= 8) dates.push(cleanDate);
    }
  }

  dates.sort();
  const dateRange = dates.length > 0
    ? `${dates[0]} ถึง ${dates[dates.length - 1]}`
    : 'ไม่ระบุช่วงวัน';

  return {
    format: 'csv',
    detectedType,
    sessionsCount: Math.max(1, sessionKeys.size),
    setsCount: rows.length,
    bodyWeightsCount: 0,
    dateRange,
    rawContent: text,
    sampleRows: rows.slice(0, 3)
  };
}

/**
 * Analyze JSON file content
 */
export function analyzeJsonContent(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error('รูปแบบไฟล์ JSON ไม่ถูกต้อง ไม่สามารถอ่านข้อมูลได้');
  }

  if (!parsed || (typeof parsed !== 'object')) {
    throw new Error(BACKUP_FORMAT_ERROR);
  }

  const sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
  const bodyWeights = Array.isArray(parsed.bodyWeights) ? parsed.bodyWeights : [];

  if (sessions.length === 0 && bodyWeights.length === 0) {
    throw new Error(BACKUP_FORMAT_ERROR);
  }

  let setsCount = 0;
  const dates = [];

  for (const s of sessions) {
    if (s.date) dates.push(s.date);
    if (Array.isArray(s.exercises)) {
      for (const ex of s.exercises) {
        if (Array.isArray(ex.sets)) {
          setsCount += ex.sets.length;
        }
      }
    } else if (s.totalSetsDone) {
      setsCount += Number(s.totalSetsDone) || 0;
    }
  }

  dates.sort();
  const dateRange = dates.length > 0
    ? `${dates[0]} ถึง ${dates[dates.length - 1]}`
    : 'ไม่ระบุช่วงวัน';

  return {
    format: 'json',
    detectedType: 'GYM Full Backup (JSON)',
    sessionsCount: sessions.length,
    setsCount,
    bodyWeightsCount: bodyWeights.length,
    dateRange,
    rawContent: parsed,
    sampleRows: sessions.slice(0, 3).map((s) => ({
      วันที่: s.date || '—',
      รอบฝึก: s.dayTitle || s.dayKey || '—',
      จำนวนท่า: s.exercises ? s.exercises.length : '—'
    }))
  };
}

export function useDataBackup(fetchImpl = globalThis.fetch) {
  const isImporting = ref(false);
  const isExporting = ref(false);
  const importError = ref('');
  const importResult = ref(null);
  const previewData = ref(null);
  const dedupeOption = ref(true);

  function resetState() {
    isImporting.value = false;
    isExporting.value = false;
    importError.value = '';
    importResult.value = null;
    previewData.value = null;
    dedupeOption.value = true;
  }

  /**
   * Read and parse selected file via FileReader API
   */
  async function parseFile(file) {
    if (!file) return null;
    importError.value = '';
    importResult.value = null;

    const filename = file.name.toLowerCase();
    const isJson = filename.endsWith('.json');
    const isCsv = filename.endsWith('.csv');

    if (!isJson && !isCsv) {
      importError.value = 'รองรับเฉพาะไฟล์ .json หรือ .csv เท่านั้น';
      return null;
    }

    try {
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('เกิดข้อผิดพลาดในการอ่านไฟล์'));
        reader.readAsText(file, 'UTF-8');
      });

      let preview;
      if (isJson) {
        preview = analyzeJsonContent(text);
      } else {
        preview = analyzeCsvContent(text);
      }

      previewData.value = preview;
      return preview;
    } catch (err) {
      importError.value = err.message || BACKUP_FORMAT_ERROR;
      previewData.value = null;
      return null;
    }
  }

  /**
   * Execute Import to backend API
   */
  async function submitImport(dedupe = dedupeOption.value) {
    if (!previewData.value) {
      importError.value = 'กรุณาเลือกไฟล์ก่อนนำเข้า';
      return false;
    }

    isImporting.value = true;
    importError.value = '';

    try {
      const res = await fetchImpl('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: previewData.value.format,
          content: previewData.value.rawContent,
          dedupe: Boolean(dedupe)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || BACKUP_FORMAT_ERROR);
      }

      importResult.value = {
        sessionsImported: data.sessionsImported || 0,
        setsImported: data.setsImported || 0,
        duplicatesSkipped: data.duplicatesSkipped || 0,
        bodyWeightsImported: data.bodyWeightsImported || 0
      };

      return true;
    } catch (err) {
      importError.value = err.message || BACKUP_NETWORK_ERROR;
      return false;
    } finally {
      isImporting.value = false;
    }
  }

  /**
   * Export full JSON backup from server and trigger browser download
   */
  async function downloadFullBackup() {
    isExporting.value = true;
    try {
      const res = await fetchImpl('/api/backup/export/json');
      if (!res.ok) throw new Error('ส่งออกข้อมูลไม่สำเร็จ');
      const data = await res.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gym-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      alert(err.message || 'ส่งออกไฟล์สำรองไม่สำเร็จ');
      return false;
    } finally {
      isExporting.value = false;
    }
  }

  return {
    isImporting,
    isExporting,
    importError,
    importResult,
    previewData,
    dedupeOption,
    resetState,
    parseFile,
    submitImport,
    downloadFullBackup
  };
}
