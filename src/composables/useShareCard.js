/**
 * Shareable Workout Summary Card (Hevy-style social card).
 * Pure helpers only: no store, no DOM. The card is an SVG string so the preview
 * and the download use exactly the same source of truth.
 */

export const SHARE_CARD_DIMENSIONS = { width: 640, height: 820 };

/** Escape every dynamic value before it becomes SVG markup (OWASP: no injection). */
export function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** MM:SS or H:MM:SS — same shape as the on-screen summary. */
export function formatShareDuration(sec) {
  const total = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function formatThaiDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function clip(value, max) {
  const str = String(value ?? '');
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

/**
 * Build a flat, render-ready model from a session summary.
 * Accepts both the runner summary and buildSessionSummary() field names.
 */
export function buildShareCardModel(summary, date = new Date()) {
  const s = summary && typeof summary === 'object' ? summary : {};
  const exercises = Array.isArray(s.exercises) ? s.exercises : [];
  const prs = Array.isArray(s.prs) ? s.prs : [];

  const completed = s.completedSetsCount ?? s.setsDone ?? 0;
  const total = s.totalSetsCount ?? s.setsTotal ?? exercises.reduce(
    (sum, ex) => sum + (Array.isArray(ex?.sets) ? ex.sets.length : 0),
    0
  );
  const volume = Number(s.totalVolumeKg) || 0;

  const exerciseLines = exercises.slice(0, 6).map((ex, i) => {
    const sets = Array.isArray(ex?.sets) ? ex.sets : [];
    return {
      index: i + 1,
      name: String(ex?.name ?? ex?.id ?? '—'),
      done: sets.filter(set => set && set.completed).length,
      total: sets.length
    };
  });

  const prLines = prs.slice(0, 4).map(pr => {
    const weight = pr?.weight !== '' && pr?.weight !== undefined && pr?.weight !== null ? `${pr.weight} กก.` : '';
    const reps = pr?.reps !== '' && pr?.reps !== undefined && pr?.reps !== null ? ` × ${pr.reps}` : '';
    return `${pr?.exerciseName || '—'} ${weight}${reps}`.trim();
  });

  return {
    title: String(s.title || 'Workout Session'),
    dateLabel: formatThaiDate(date),
    volumeLabel: `${volume.toLocaleString('en-US')} กก.`,
    durationLabel: formatShareDuration(s.durationSec),
    setsLabel: `${completed} / ${total}`,
    exerciseLines,
    prLines,
    extraExercises: Math.max(0, exercises.length - exerciseLines.length),
    extraPrs: Math.max(0, prs.length - prLines.length)
  };
}

/** Render the model as a standalone, self-contained SVG string. */
export function buildShareCardSvg(model) {
  const m = model || buildShareCardModel(null);
  const { width, height } = SHARE_CARD_DIMENSIONS;
  const parts = [];

  const line = (markup) => parts.push(markup);
  const text = (x, y, value, opts = {}) => {
    const {
      size = 20,
      fill = '#1e2220',
      weight = '700',
      anchor = 'start',
      family = "'Noto Sans Thai','Sarabun',system-ui,sans-serif"
    } = opts;
    line(`<text x="${x}" y="${y}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${escapeXml(value)}</text>`);
  };
  const box = (x, y, w, h, fill = '#ffffff', stroke = '#1e2220', strokeWidth = 4) => {
    line(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`);
  };

  // Canvas + border
  line(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Workout share card">`);
  box(4, 4, width - 8, height - 8, '#fdfbf7', '#1e2220', 8);

  // Header band
  line(`<rect x="4" y="4" width="${width - 8}" height="150" rx="12" fill="#fff7ed"/>`);
  line(`<rect x="4" y="146" width="${width - 8}" height="8" fill="#ea580c"/>`);
  text(28, 60, '🏆', { size: 44, weight: '400' });
  text(92, 54, '⚡ WORKOUT COMPLETE', { size: 17, fill: '#c2410c', family: 'monospace' });
  text(28, 104, clip(m.title, 30), { size: 30, weight: '800' });
  text(28, 134, m.dateLabel, { size: 17, fill: '#4a544f' });

  // Stat boxes
  const stats = [
    { x: 20, label: 'VOLUME', value: m.volumeLabel, color: '#c2410c', size: 25 },
    { x: 225, label: 'DURATION', value: m.durationLabel, color: '#1e2220', size: 27 },
    { x: 430, label: 'SETS', value: m.setsLabel, color: '#047857', size: 27 }
  ];
  for (const stat of stats) {
    box(stat.x, 178, 189, 112);
    text(stat.x + 94, 207, stat.label, { size: 14, fill: '#4a544f', anchor: 'middle', family: 'monospace' });
    text(stat.x + 94, 258, stat.value, { size: stat.size, fill: stat.color, anchor: 'middle', family: 'monospace' });
  }

  // Exercises
  box(20, 312, 600, 330, '#ffffff', '#1e2220', 4);
  text(40, 346, `ท่าที่ฝึก (${m.exerciseLines.length + m.extraExercises})`, { size: 21, weight: '800' });
  m.exerciseLines.forEach((ex, i) => {
    const y = 382 + i * 44;
    box(38, y - 25, 564, 36, '#faf4e8', '#f4ece0', 2);
    text(52, y, String(ex.index), { size: 15, fill: '#4a544f', family: 'monospace' });
    text(80, y, clip(ex.name, 32), { size: 18 });
    text(586, y, `${ex.done}/${ex.total}`, { size: 16, fill: '#047857', anchor: 'end', family: 'monospace' });
  });
  if (m.extraExercises > 0) {
    text(40, 382 + m.exerciseLines.length * 44 + 4, `+ อีก ${m.extraExercises} ท่า`, { size: 15, fill: '#4a544f' });
  }

  // PRs
  box(20, 658, 600, 122, '#fefce8', '#f59e0b', 4);
  text(40, 690, '🏆 PR ในรอบนี้', { size: 20, weight: '800', fill: '#92400e' });
  if (m.prLines.length === 0) {
    text(40, 721, 'ไม่มี PR ใหม่ในรอบนี้', { size: 16, fill: '#92400e' });
  } else {
    m.prLines.forEach((label, i) => {
      text(40, 720 + i * 22, `• ${clip(label, 48)}`, { size: 16, fill: '#92400e' });
    });
    if (m.extraPrs > 0) {
      text(40, 720 + m.prLines.length * 22, `+ อีก ${m.extraPrs} รายการ`, { size: 14, fill: '#92400e' });
    }
  }

  // Footer
  text(28, 800, '💪 GYM App — Train. Track. Progress.', { size: 15, fill: '#4a544f' });
  line('</svg>');
  return parts.join('');
}

/** data URL usable for both the <img> preview and the download anchor. */
export function svgToDataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
