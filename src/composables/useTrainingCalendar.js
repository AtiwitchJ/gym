import { ref, computed, watch, onMounted } from 'vue';

export const CALENDAR_STORAGE_KEY = 'gym_training_calendar_cache_v1';
export const CALENDAR_LOAD_ERROR = 'โหลดปฏิทินการฝึกไม่สำเร็จ';
export const CALENDAR_TARGET_ERROR = 'บันทึกเป้าหมายรายสัปดาห์ไม่สำเร็จ';
export const CALENDAR_ERROR_MESSAGE = CALENDAR_LOAD_ERROR;

export const THAI_WEEKDAYS = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
export const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

/**
 * Format Year and Month to Thai display: e.g. "พฤศจิกายน 2026"
 */
export function formatThaiMonth(year, month) {
  const mName = THAI_MONTH_NAMES[month - 1] || '';
  return `${mName} ${year}`;
}

/**
 * Return 'YYYY-MM-DD' string for given year, month (1-12), and day (1-31)
 */
export function toIsoDateString(year, month, day) {
  const y = String(year);
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format ISO date string 'YYYY-MM-DD' into readable Thai text, e.g. "20 พ.ย. 2026"
 */
export function formatDateThaiShort(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const date = new Date(y, m, d);
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Return today's date in local time as 'YYYY-MM-DD'
 */
export function getTodayDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Number of days in month (handles leap years)
 */
export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * First day of week index: 0 = Monday ... 6 = Sunday
 */
export function getFirstDayOfWeek(year, month) {
  const jsDay = new Date(year, month - 1, 1).getDay(); // 0 = Sun ... 6 = Sat
  return (jsDay + 6) % 7;
}

// LocalStorage cache helpers
function loadCache() {
  if (typeof localStorage === 'undefined') return { months: {}, streak: null };
  try {
    const raw = localStorage.getItem(CALENDAR_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { months: {}, streak: null };
  } catch (e) {
    return { months: {}, streak: null };
  }
}

function saveCache(cache) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(cache));
  } catch (e) {
    // ignore
  }
}

// Reactive singleton state
const now = new Date();
const currentYear = ref(now.getFullYear());
const currentMonth = ref(now.getMonth() + 1);

const monthData = ref({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  daysInMonth: getDaysInMonth(now.getFullYear(), now.getMonth() + 1),
  firstDayOfWeek: getFirstDayOfWeek(now.getFullYear(), now.getMonth() + 1),
  workouts: [],
  totalWorkoutsThisMonth: 0,
  totalSetsThisMonth: 0
});

const streakData = ref({
  currentStreakWeeks: 0,
  bestStreakWeeks: 0,
  thisWeekWorkouts: 0,
  weeklyTarget: 4,
  isTargetMetThisWeek: false,
  lastWorkoutDate: null,
  weeklyHistory: []
});

const loading = ref(false);
const error = ref('');
const selectedDate = ref(null);

export function useTrainingCalendar(fetchImpl = globalThis.fetch) {
  // Restore cached streak & month if present
  const cache = loadCache();
  if (cache.streak) {
    streakData.value = { ...streakData.value, ...cache.streak };
  }
  const cacheKey = `${currentYear.value}-${currentMonth.value}`;
  if (cache.months && cache.months[cacheKey]) {
    monthData.value = { ...monthData.value, ...cache.months[cacheKey] };
  }

  async function fetchMonth(year = currentYear.value, month = currentMonth.value) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || y < 2000 || y > 2100 || m < 1 || m > 12) {
      error.value = 'ปีหรือเดือนไม่ถูกต้อง';
      return;
    }

    currentYear.value = y;
    currentMonth.value = m;
    loading.value = true;
    error.value = '';

    try {
      const res = await fetchImpl(`/api/calendar/month?year=${y}&month=${m}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      monthData.value = {
        year: data.year ?? y,
        month: data.month ?? m,
        daysInMonth: data.daysInMonth ?? getDaysInMonth(y, m),
        firstDayOfWeek: data.firstDayOfWeek ?? getFirstDayOfWeek(y, m),
        workouts: Array.isArray(data.workouts) ? data.workouts : [],
        totalWorkoutsThisMonth: data.totalWorkoutsThisMonth ?? (data.workouts?.length || 0),
        totalSetsThisMonth: data.totalSetsThisMonth ?? 0
      };

      // Save to cache
      const c = loadCache();
      c.months = c.months || {};
      c.months[`${y}-${m}`] = monthData.value;
      saveCache(c);
    } catch (err) {
      error.value = CALENDAR_LOAD_ERROR;
    } finally {
      loading.value = false;
    }
  }

  async function fetchStreak() {
    try {
      const res = await fetchImpl('/api/calendar/streak');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      streakData.value = {
        currentStreakWeeks: data.currentStreakWeeks ?? 0,
        bestStreakWeeks: data.bestStreakWeeks ?? 0,
        thisWeekWorkouts: data.thisWeekWorkouts ?? 0,
        weeklyTarget: data.weeklyTarget ?? 4,
        isTargetMetThisWeek: !!data.isTargetMetThisWeek,
        lastWorkoutDate: data.lastWorkoutDate || null,
        weeklyHistory: Array.isArray(data.weeklyHistory) ? data.weeklyHistory : []
      };

      // Save to cache
      const c = loadCache();
      c.streak = streakData.value;
      saveCache(c);
    } catch (err) {
      // Keep existing data on error
    }
  }

  async function updateWeeklyTarget(targetDays) {
    const val = parseInt(targetDays, 10);
    if (isNaN(val) || val < 1 || val > 7) {
      error.value = 'เป้าหมายต้องอยู่ระหว่าง 1 ถึง 7 วัน';
      return false;
    }

    const prevTarget = streakData.value.weeklyTarget;
    // Optimistic update
    streakData.value.weeklyTarget = val;
    streakData.value.isTargetMetThisWeek = streakData.value.thisWeekWorkouts >= val;

    try {
      const res = await fetchImpl('/api/calendar/target', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeklyTarget: val })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.weeklyTarget) {
        streakData.value.weeklyTarget = data.weeklyTarget;
      }
      return true;
    } catch (err) {
      // Rollback on failure
      streakData.value.weeklyTarget = prevTarget;
      streakData.value.isTargetMetThisWeek = streakData.value.thisWeekWorkouts >= prevTarget;
      error.value = CALENDAR_TARGET_ERROR;
      return false;
    }
  }

  function nextMonth() {
    let y = currentYear.value;
    let m = currentMonth.value + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    selectedDate.value = null;
    return fetchMonth(y, m);
  }

  function prevMonth() {
    let y = currentYear.value;
    let m = currentMonth.value - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    selectedDate.value = null;
    return fetchMonth(y, m);
  }

  function shiftMonth(delta) {
    let y = currentYear.value;
    let m = currentMonth.value + delta;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    selectedDate.value = null;
    return fetchMonth(y, m);
  }

  function goToToday() {
    const d = new Date();
    selectedDate.value = getTodayDateString(d);
    return fetchMonth(d.getFullYear(), d.getMonth() + 1);
  }

  function selectDay(dateOrCell) {
    const dateStr = typeof dateOrCell === 'object' && dateOrCell !== null ? dateOrCell.date : dateOrCell;
    if (!dateStr) return;
    if (selectedDate.value === dateStr) {
      selectedDate.value = null;
    } else {
      selectedDate.value = dateStr;
    }
  }

  // 7-column Calendar Matrix
  const calendarGrid = computed(() => {
    const y = currentYear.value;
    const m = currentMonth.value;
    const daysCount = monthData.value.daysInMonth || getDaysInMonth(y, m);
    const leadingBlanks = monthData.value.firstDayOfWeek ?? getFirstDayOfWeek(y, m);
    const todayStr = getTodayDateString();

    const workoutMap = new Map();
    for (const w of monthData.value.workouts) {
      if (!w || !w.date) continue;
      const list = workoutMap.get(w.date) || [];
      list.push(w);
      workoutMap.set(w.date, list);
    }

    const cells = [];

    // Leading padding cells before 1st of month
    for (let i = 0; i < leadingBlanks; i++) {
      cells.push({
        id: `blank-start-${i}`,
        blank: true,
        key: `blank-start-${i}`,
        dayNumber: null,
        day: null,
        dateString: null,
        date: null,
        isCurrentMonth: false,
        isToday: false,
        workouts: [],
        workout: null,
        hasWorkout: false,
        trained: false,
        totalSetsDone: 0
      });
    }

    // Days of current month
    for (let day = 1; day <= daysCount; day++) {
      const dateStr = toIsoDateString(y, m, day);
      const dayWorkouts = workoutMap.get(dateStr) || [];
      const totalSets = dayWorkouts.reduce((acc, w) => acc + (Number(w.totalSetsDone) || 0), 0);

      cells.push({
        id: `day-${dateStr}`,
        blank: false,
        key: dateStr,
        dayNumber: day,
        day,
        dateString: dateStr,
        date: dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        workouts: dayWorkouts,
        workout: dayWorkouts[0] || null,
        hasWorkout: dayWorkouts.length > 0,
        trained: dayWorkouts.length > 0,
        totalSetsDone: totalSets,
        dayKey: dayWorkouts[0]?.dayKey || null,
        dayTitle: dayWorkouts[0]?.dayTitle || null
      });
    }

    // Trailing padding cells to fill the last row
    const remainder = cells.length % 7;
    if (remainder > 0) {
      const trailingBlanks = 7 - remainder;
      for (let i = 0; i < trailingBlanks; i++) {
        cells.push({
          id: `blank-end-${i}`,
          blank: true,
          key: `blank-end-${i}`,
          dayNumber: null,
          day: null,
          dateString: null,
          date: null,
          isCurrentMonth: false,
          isToday: false,
          workouts: [],
          workout: null,
          hasWorkout: false,
          trained: false,
          totalSetsDone: 0
        });
      }
    }

    return cells;
  });

  const selectedDayInfo = computed(() => {
    if (!selectedDate.value) return null;
    const workouts = monthData.value.workouts.filter(w => w.date === selectedDate.value);
    const totalSets = workouts.reduce((acc, w) => acc + (Number(w.totalSetsDone) || 0), 0);
    return {
      date: selectedDate.value,
      hasWorkout: workouts.length > 0,
      workouts,
      totalSetsDone: totalSets,
      primaryWorkout: workouts[0] || null
    };
  });

  const selectedWorkout = computed(() => selectedDayInfo.value?.primaryWorkout || null);
  const monthLabel = computed(() => formatThaiMonth(currentYear.value, currentMonth.value));

  return {
    year: currentYear,
    month: currentMonth,
    currentYear,
    currentMonth,
    monthData,
    streak: streakData,
    streakData,
    loading,
    error,
    selectedDate,
    today: getTodayDateString(),
    monthLabel,
    days: calendarGrid,
    selectedWorkout,
    selectedDayInfo,
    calendarGrid,
    weekdays: THAI_WEEKDAYS,
    fetchMonth,
    fetchStreak,
    refresh: () => Promise.all([fetchMonth(), fetchStreak()]),
    updateWeeklyTarget,
    setTarget: updateWeeklyTarget,
    nextMonth,
    prevMonth,
    shiftMonth,
    goToToday,
    selectDay
  };
}
