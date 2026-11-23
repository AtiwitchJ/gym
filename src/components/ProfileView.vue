<template>
  <div class="space-y-4 pb-6 select-none">
    <!-- User Profile & System Status Card -->
    <div class="archive-card p-4 sm:p-5">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <!-- Account Info -->
        <div class="flex items-center gap-3.5">
          <div class="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-flame text-white font-heading font-extrabold text-xl sm:text-2xl flex items-center justify-center border-2 border-plate shadow-[3px_3px_0px_#1e2220] flex-shrink-0">
            AJ
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base sm:text-lg font-bold font-heading text-ink tracking-tight">
                Atiwitch J.
              </h2>
              <span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-flame-bg text-flame-text border border-flame/40">
                PRO
              </span>
            </div>
            <p class="text-xs text-ink-muted font-body mt-0.5">
              Atiwitch 3-Day A/B Split Protocol (จันทร์ • พุธ • ศุกร์)
            </p>
            <div class="flex items-center gap-2 mt-1.5 flex-wrap">
              <!-- Local Mode / PocketBase Status -->
              <span class="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-bg border border-emerald text-emerald-text">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse"></span>
                <span>Local Mode (ออฟไลน์ / บันทึกในเครื่อง)</span>
              </span>
              <span class="inline-flex items-center gap-1 text-[11px] font-mono text-ink-muted bg-paper-subtle px-2 py-0.5 rounded-full border border-plate/20">
                <span>PocketBase:</span>
                <span class="font-bold text-ink">Ready</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 1RM Calculator (standalone; no session needed) -->
    <div class="archive-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <span class="text-[11px] font-mono font-bold tracking-widest text-emerald-text uppercase block">1RM CALCULATOR</span>
        <p class="text-xs text-ink-muted font-body">ประเมิน 1RM จากเซ็ตย่อย โดยไม่ต้องบันทึกเซสชัน</p>
      </div>
      <button
        type="button"
        @click="openOneRm"
        class="min-h-[44px] min-w-[44px] px-4 py-2 rounded-xl border-2 border-plate bg-emerald hover:bg-emerald/90 text-white font-heading font-bold text-sm shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
      >
        🧮 คำนวณ 1RM
      </button>
    </div>

    <!-- Barbell Plate Calculator & Inventory (standalone; no session needed) -->
    <div class="archive-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <span class="text-[11px] font-mono font-bold tracking-widest text-flame-text uppercase block">PLATE CALCULATOR & INVENTORY</span>
        <p class="text-xs text-ink-muted font-body">คำนวณการใส่แผ่นบาร์เบล และตั้งค่าจำนวนแผ่นเหล็กในยิม</p>
      </div>
      <button
        type="button"
        @click="openPlateCalculator(60)"
        class="min-h-[44px] min-w-[44px] px-4 py-2 rounded-xl border-2 border-plate bg-flame hover:bg-flame-glow text-white font-heading font-bold text-sm shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
      >
        🏋️ คำนวณแผ่น / คลังแผ่น
      </button>
    </div>

    <!-- Body Weight Tracker & Daily Trend -->
    <BodyWeightCard />

    <!-- Body Measurements Tracker (waist / chest / arm / thigh / hip) -->
    <BodyMeasurementsCard />

    <!-- All-Time Stats Overview -->
    <div class="archive-card p-4 sm:p-5">
      <div class="flex items-center justify-between mb-3">
        <span class="text-[11px] font-mono font-bold tracking-widest text-flame-text uppercase">
          LIFETIME STATS OVERVIEW
        </span>
        <span class="text-[11px] font-mono text-ink-muted">
          สถิติรวมทั้งหมด
        </span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <!-- Workouts Completed -->
        <div class="p-3 bg-surface-card rounded-xl border-2 border-plate shadow-[2px_2px_0px_#1e2220]">
          <span class="text-[11px] font-mono text-ink-muted uppercase block mb-1">
            รอบฝึกทั้งหมด
          </span>
          <span class="text-lg sm:text-xl font-mono font-bold text-ink tabular-nums">
            {{ totalWorkoutsCount }}
          </span>
          <span class="text-[11px] font-body text-ink-muted block mt-0.5">
            รอบที่บันทึกแล้ว
          </span>
        </div>

        <!-- Total Volume Lifted -->
        <div class="p-3 bg-surface-card rounded-xl border-2 border-plate shadow-[2px_2px_0px_#1e2220]">
          <span class="text-[11px] font-mono text-ink-muted uppercase block mb-1">
            ปริมาณรวม (Volume)
          </span>
          <span class="text-lg sm:text-xl font-mono font-bold text-flame-text tabular-nums">
            {{ formatNumber(totalVolumeLifted) }}
          </span>
          <span class="text-[11px] font-body text-ink-muted block mt-0.5">
            {{ weightUnit.toUpperCase() }} สะสม · ไม่รวมวอร์ม
          </span>
        </div>

        <!-- Custom Routines Count -->
        <div class="p-3 bg-surface-card rounded-xl border-2 border-plate shadow-[2px_2px_0px_#1e2220]">
          <span class="text-[11px] font-mono text-ink-muted uppercase block mb-1">
            ตาราง Routine
          </span>
          <span class="text-lg sm:text-xl font-mono font-bold text-ink tabular-nums">
            {{ routines.length }}
          </span>
          <span class="text-[11px] font-body text-ink-muted block mt-0.5">
            ตารางฝึกที่พร้อมใช้
          </span>
        </div>

        <!-- Custom Exercises Count -->
        <div class="p-3 bg-surface-card rounded-xl border-2 border-plate shadow-[2px_2px_0px_#1e2220]">
          <span class="text-[11px] font-mono text-ink-muted uppercase block mb-1">
            ท่า Custom
          </span>
          <span class="text-lg sm:text-xl font-mono font-bold text-emerald-text tabular-nums">
            {{ customExercisesCount }}
          </span>
          <span class="text-[11px] font-body text-ink-muted block mt-0.5">
            ท่าที่สร้างขึ้นเอง
          </span>
        </div>
      </div>
    </div>

    <!-- Workout Achievements & Milestones (Hevy/Strong parity, derived from existing data) -->
    <AchievementsCard />

    <!-- User Preferences & Settings Card -->
    <div class="archive-card p-4 sm:p-5">
      <div class="flex items-center justify-between mb-3">
        <span class="text-[11px] font-mono font-bold tracking-widest text-ink-muted uppercase">
          PREFERENCES & APP SETTINGS
        </span>
        <span class="text-[11px] font-mono text-ink-muted">
          การตั้งค่า
        </span>
      </div>

      <div class="space-y-4">
        <!-- Weight Unit Toggle (kg / lbs) -->
        <div class="flex items-center justify-between gap-3 p-3 bg-surface rounded-xl border-2 border-plate shadow-[2px_2px_0px_#1e2220]">
          <div>
            <span class="text-xs sm:text-sm font-bold font-heading text-ink block">
              หน่วยน้ำหนัก (Weight Unit)
            </span>
            <span class="text-[11px] text-ink-muted font-body">
              เลือกหน่วยที่แสดงบนตารางและแป้นพิมพ์
            </span>
          </div>

          <div class="flex items-center bg-paper border-2 border-plate rounded-xl p-0.5 shadow-[1.5px_1.5px_0px_#1e2220]">
            <button
              type="button"
              @click="setUnit('kg')"
              class="px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all"
              :class="weightUnit === 'kg' ? 'bg-flame text-white shadow-sm' : 'text-ink-muted hover:text-ink'"
            >
              KG
            </button>
            <button
              type="button"
              @click="setUnit('lbs')"
              class="px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all"
              :class="weightUnit === 'lbs' ? 'bg-flame text-white shadow-sm' : 'text-ink-muted hover:text-ink'"
            >
              LBS
            </button>
          </div>
        </div>

        <!-- Default Rest Time Selector -->
        <div class="p-3 bg-surface rounded-xl border-2 border-plate shadow-[2px_2px_0px_#1e2220]">
          <div class="flex items-center justify-between mb-2">
            <div>
              <span class="text-xs sm:text-sm font-bold font-heading text-ink block">
                เวลาพักระหว่างเซ็ตเริ่มต้น (Default Rest Time)
              </span>
              <span class="text-[11px] text-ink-muted font-body">
                นับถอยหลังอัตโนมัติเมื่อกดติ๊กถูกเซ็ต
              </span>
            </div>
            <span class="text-xs font-mono font-bold text-flame-text px-2 py-0.5 rounded-md bg-flame-bg border border-flame/30">
              {{ defaultRestSec }} วินาที
            </span>
          </div>

          <div class="grid grid-cols-4 gap-1.5 sm:gap-2">
            <button
              v-for="sec in [60, 90, 120, 180]"
              :key="sec"
              type="button"
              @click="setRestTime(sec)"
              class="py-2 px-1 rounded-xl border-2 border-plate font-mono font-bold text-xs transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              :class="defaultRestSec === sec
                ? 'bg-plate text-white shadow-[2px_2px_0px_#ea580c] -translate-y-0.5'
                : 'bg-paper text-ink shadow-[1.5px_1.5px_0px_#1e2220] hover:bg-paper-subtle'"
            >
              {{ sec >= 60 ? `${sec / 60}m` : `${sec}s` }}
              <span class="text-[11px] block opacity-70">({{ sec }}s)</span>
            </button>
          </div>
        </div>

        <!-- Rest sound: on/off and level (restAlerts.js) -->
        <div class="p-3 bg-surface rounded-xl border-2 border-plate shadow-[2px_2px_0px_#1e2220] space-y-2.5">
          <div class="flex items-center justify-between gap-3">
            <div>
              <span class="text-xs sm:text-sm font-bold font-heading text-ink block">เสียงเตือนเวลาพัก</span>
              <span class="text-[11px] text-ink-muted font-body">เสียงใกล้ครบและเสียงพักครบ (ปิดเสียงแล้วการสั่นยังทำงาน)</span>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="restSound.enabled ? 'true' : 'false'"
              @click="toggleRestSound"
              class="min-h-[44px] min-w-[64px] px-3 rounded-xl border-2 border-plate font-mono font-bold text-xs touch-manipulation"
              :class="restSound.enabled ? 'bg-emerald text-white' : 'bg-paper text-ink'"
            >{{ restSound.enabled ? 'เปิด' : 'ปิด' }}</button>
          </div>
          <div class="grid grid-cols-3 gap-1.5 sm:gap-2" :class="restSound.enabled ? '' : 'opacity-50'">
            <button
              v-for="opt in SOUND_LEVEL_OPTIONS"
              :key="opt.value"
              type="button"
              :disabled="!restSound.enabled"
              :aria-pressed="restSound.level === opt.value ? 'true' : 'false'"
              @click="setRestSoundLevel(opt.value)"
              class="min-h-[44px] rounded-xl border-2 border-plate font-heading font-bold text-xs touch-manipulation"
              :class="restSound.level === opt.value ? 'bg-plate text-white' : 'bg-paper text-ink'"
            >{{ opt.label }}</button>
          </div>
        </div>

        <!-- Rest-done notification: opt-in, asks permission only on this tap -->
        <div class="p-3 bg-surface rounded-xl border-2 border-plate shadow-[2px_2px_0px_#1e2220] space-y-2">
          <div class="flex items-center justify-between gap-3">
            <div>
              <span class="text-xs sm:text-sm font-bold font-heading text-ink block">แจ้งเตือนเมื่อพักครบ</span>
              <span class="text-[11px] text-ink-muted font-body">แจ้งเตือนเฉพาะตอนที่ออกจากแท็บนี้ระหว่างพัก</span>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="restNotify ? 'true' : 'false'"
              @click="toggleRestNotify"
              class="min-h-[44px] min-w-[64px] px-3 rounded-xl border-2 border-plate font-mono font-bold text-xs touch-manipulation"
              :class="restNotify ? 'bg-emerald text-white' : 'bg-paper text-ink'"
            >{{ restNotify ? 'เปิด' : 'ปิด' }}</button>
          </div>
          <p v-if="notifyStatus" class="text-[11px] text-ink-muted font-body" role="status">{{ notifyStatus }}</p>
        </div>
      </div>
    </div>

    <!-- Data Management (Backup, Export, Reset) -->
    <div class="archive-card p-4 sm:p-5">
      <div class="flex items-center justify-between mb-3">
        <span class="text-[11px] font-mono font-bold tracking-widest text-emerald-text uppercase">
          DATA MANAGEMENT & BACKUP
        </span>
        <span class="text-[11px] font-mono text-ink-muted">
          จัดการข้อมูล
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <!-- Export JSON Backup -->
        <button
          type="button"
          @click="exportJsonBackup"
          class="flex items-center justify-center gap-2 py-2.5 px-3 bg-surface hover:bg-paper-subtle text-ink font-heading font-bold text-xs rounded-xl border-2 border-plate shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
        >
          <svg class="w-4 h-4 fill-none stroke-current stroke-2 text-flame-text" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>สำรองข้อมูล (JSON)</span>
        </button>

        <!-- Export Excel -->
        <button
          type="button"
          @click="exportExcelHistory"
          class="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald hover:bg-emerald-600 text-white font-heading font-bold text-xs rounded-xl border-2 border-plate shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
        >
          <svg class="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>ส่งออก Excel (.xlsx)</span>
        </button>

        <!-- Reset Data Button -->
        <button
          type="button"
          @click="handleResetData"
          class="flex items-center justify-center gap-2 py-2.5 px-3 bg-surface hover:bg-rose-50 text-rose-600 font-heading font-bold text-xs rounded-xl border-2 border-rose-300 hover:border-rose-600 shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
        >
          <svg class="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
          <span>รีเซ็ตข้อมูลเริ่มต้น (Reset)</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoutineStore } from '../composables/useRoutineStore.js';
import { useActiveSessionStore } from '../composables/useActiveSessionStore.js';
import { useExerciseStore } from '../composables/useExerciseStore.js';
import { useWorkoutStore } from '../composables/useWorkoutStore.js';
import { accountTotals } from '../composables/workingVolume.js';
import { useExcelExport } from '../composables/useExcelExport.js';
import { useTimer } from '../composables/useTimer.js';
import {
  readSoundSettings,
  saveSoundSettings,
  readNotifyEnabled,
  writeNotifyEnabled,
  enableRestNotifications,
  SOUND_LEVEL_OPTIONS,
  NOTIFY_STATUS_TEXT
} from '../composables/restAlerts.js';
import { useOneRmCalculator } from '../composables/useOneRm.js';
import { usePlateCalculator } from '../composables/usePlateCalculator.js';
import BodyWeightCard from './BodyWeightCard.vue';
import BodyMeasurementsCard from './BodyMeasurementsCard.vue';
import AchievementsCard from './AchievementsCard.vue';

const { open: openOneRm } = useOneRmCalculator();
const { openPlateCalculator } = usePlateCalculator();

const { routines, resetToDefaults } = useRoutineStore();
const { sessionHistory, discardSession } = useActiveSessionStore();
const { exercises } = useExerciseStore();
const { workoutHistory, showToast } = useWorkoutStore();
const { exportWorkoutHistory } = useExcelExport();
const { timerDuration, setTimerDuration } = useTimer();

// Rest sound and rest-done notification (restAlerts.js)
const restSound = ref(readSoundSettings());
const restNotify = ref(readNotifyEnabled());
const notifyStatus = ref('');

function toggleRestSound() {
  restSound.value = saveSoundSettings({ enabled: !restSound.value.enabled });
}

function setRestSoundLevel(level) {
  restSound.value = saveSoundSettings({ level });
}

async function toggleRestNotify() {
  if (restNotify.value) {
    writeNotifyEnabled(false);
    restNotify.value = false;
    notifyStatus.value = '';
    return;
  }
  const result = await enableRestNotifications();
  restNotify.value = result.ok;
  notifyStatus.value = result.ok ? '' : (NOTIFY_STATUS_TEXT[result.reason] || NOTIFY_STATUS_TEXT.error);
}

// Preferences
const weightUnit = ref(localStorage.getItem('atiwitch_weight_unit') || 'kg');
const defaultRestSec = ref(parseInt(localStorage.getItem('atiwitch_default_rest_time') || String(timerDuration.value || 90), 10));

function setUnit(unit) {
  weightUnit.value = unit;
  localStorage.setItem('atiwitch_weight_unit', unit);
  showToast(`เปลี่ยนหน่วยน้ำหนักเป็น ${unit.toUpperCase()}`);
}

function setRestTime(sec) {
  defaultRestSec.value = sec;
  setTimerDuration(sec);
  localStorage.setItem('atiwitch_default_rest_time', String(sec));
  showToast(`ตั้งเวลาพักเริ่มต้น ${sec} วินาที`);
}

// Stats Calculations
// Same saved sessions as the history page (workoutHistory). Not added to sessionHistory: that double-counted.
const accountSummary = computed(() => accountTotals(workoutHistory.value));
const totalWorkoutsCount = computed(() => accountSummary.value.workouts);

// Same rule as the weekly chart: completed working sets only (warm-ups excluded), weight × reps.
const totalVolumeLifted = computed(() => accountSummary.value.volumeKg);

const customExercisesCount = computed(() => {
  return exercises.value.filter(e => e.isCustom).length;
});

function formatNumber(num) {
  if (typeof num !== 'number') return '0';
  return num.toLocaleString('en-US');
}

// Data Management
function exportJsonBackup() {
  try {
    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      routines: routines.value,
      customExercises: exercises.value.filter(e => e.isCustom),
      sessionHistory: sessionHistory.value,
      workoutHistory: workoutHistory.value,
      preferences: {
        weightUnit: weightUnit.value,
        defaultRestTime: defaultRestSec.value
      }
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atiwitch_gym_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('ดาวน์โหลดไฟล์สำรองข้อมูลเรียบร้อย');
  } catch (err) {
    console.error('Backup error:', err);
    showToast('เกิดข้อผิดพลาดในการสำรองข้อมูล');
  }
}

function exportExcelHistory() {
  exportWorkoutHistory(workoutHistory.value);
}

function handleResetData() {
  const confirmed = confirm('คุณต้องการรีเซ็ตตารางฝึกและข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้นหรือไม่?');
  if (confirmed) {
    resetToDefaults();
    discardSession();
    showToast('รีเซ็ตข้อมูลเริ่มต้นเรียบร้อยแล้ว');
  }
}
</script>
