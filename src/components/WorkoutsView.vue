<template>
  <div class="space-y-4 pb-6">
    <!-- Active Session Recovery Banner (if isWorkoutActive === true) -->
    <div
      v-if="isWorkoutActive && activeSession"
      @click="emit('open-runner')"
      class="bg-emerald-bg border-2 border-emerald rounded-2xl p-3.5 sm:p-4 shadow-[3px_3px_0px_#059669] flex items-center justify-between gap-3 cursor-pointer hover:bg-emerald/10 transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none select-none group"
    >
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-9 h-9 rounded-xl bg-emerald text-white flex items-center justify-center flex-shrink-0 shadow-[1.5px_1.5px_0px_#1e2220]">
          <span class="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald text-white uppercase tracking-wider">
              กำลังฝึกซ้อมอยู่
            </span>
            <span class="text-xs font-mono font-bold text-emerald tabular-nums">
              ⏱ {{ formattedDuration }}
            </span>
          </div>
          <p class="text-xs sm:text-sm font-bold font-heading text-ink truncate">
            กำลังฝึกซ้อมอยู่: {{ activeSession.title || 'Workout Session' }} - แตะเพื่อเปิดแผ่นบันทึก
          </p>
        </div>
      </div>

      <div class="w-8 h-8 rounded-lg bg-emerald/20 text-emerald flex items-center justify-center flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
        <svg class="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>

    <!-- Quick Start & Create Routine Top Bar -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      <!-- Quick Start Bar -->
      <button
        type="button"
        @click="handleQuickStart"
        class="flex items-center justify-center gap-2 py-3 px-4 bg-flame hover:bg-flame-glow text-white font-heading font-bold text-xs sm:text-sm rounded-xl border-2 border-plate shadow-[3px_3px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
      >
        <span class="text-base leading-none">⚡</span>
        <span>Quick Start (เริ่มเล่นแบบอิสระ)</span>
      </button>

      <!-- Create Routine Button -->
      <button
        type="button"
        @click="emit('create-routine')"
        class="flex items-center justify-center gap-2 py-3 px-4 bg-surface hover:bg-paper-subtle text-ink font-heading font-bold text-xs sm:text-sm rounded-xl border-2 border-plate shadow-[3px_3px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
      >
        <svg class="w-4 h-4 stroke-current fill-none stroke-2 text-emerald" viewBox="0 0 24 24">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>+ สร้าง Routine ใหม่</span>
      </button>
    </div>

    <!-- Atiwitch's 4-Day Schedule Quick Chips (1-Click Launch) -->
    <div class="archive-card p-3 sm:p-4">
      <div class="flex items-center justify-between mb-2.5">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-mono font-bold tracking-widest text-flame uppercase">
            ATIWITCH 4-DAY PROTOCOL
          </span>
          <span class="text-plate/30">•</span>
          <span class="text-[11px] font-mono text-ink-muted">
            1-Click Launch
          </span>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2">
        <button
          v-for="chip in scheduleChips"
          :key="chip.id"
          type="button"
          @click="handleChipLaunch(chip)"
          class="flex flex-col items-center justify-center p-2 rounded-xl border-2 border-plate shadow-[2px_2px_0px_#1e2220] text-center transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none touch-manipulation group"
          :class="chip.isRest
            ? 'bg-surface hover:bg-paper-subtle text-ink-muted hover:text-ink col-span-2 sm:col-span-1'
            : todayChipId === chip.id
              ? 'bg-flame-bg hover:bg-flame/15 border-flame text-ink'
              : 'bg-surface hover:bg-paper-subtle text-ink'"
        >
          <div class="flex items-center gap-1 mb-0.5">
            <span class="text-xs font-bold font-heading truncate">{{ chip.dayName }}</span>
            <span
              v-if="todayChipId === chip.id"
              class="w-1.5 h-1.5 rounded-full bg-flame"
              title="ตารางประจำวันนี้"
            ></span>
          </div>
          <span class="text-[10px] font-mono text-flame font-bold truncate">{{ chip.targetMuscle }}</span>
          <span class="text-[9px] text-ink-muted mt-0.5 truncate">{{ chip.sub }}</span>
        </button>
      </div>
    </div>

    <!-- Routines List Section Header -->
    <div class="flex items-center justify-between pt-1 px-1">
      <div class="flex items-center gap-2">
        <h3 class="text-sm sm:text-base font-bold font-heading text-ink tracking-tight">
          ตารางออกกำลังกายทั้งหมด (Routines)
        </h3>
        <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-paper-subtle border border-plate/30 text-ink-muted">
          {{ routines.length }}
        </span>
      </div>
    </div>

    <!-- Routine Cards Grid / Stack -->
    <div class="space-y-3">
      <div
        v-for="routine in routines"
        :key="routine.id"
        class="archive-card p-4 sm:p-4.5 transition-all hover:border-plate shadow-[3px_3px_0px_#1e2220]"
      >
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <!-- Routine Info -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-paper-subtle border border-plate/30 text-ink-muted">
                {{ routine.exercises?.length || 0 }} ท่า
              </span>
              <span v-if="getTotalSets(routine)" class="text-[10px] font-mono text-ink-muted">
                • รวม {{ getTotalSets(routine) }} เซ็ต
              </span>
            </div>

            <h4 class="text-base font-bold font-heading text-ink tracking-tight">
              {{ routine.title }}
            </h4>
            <p v-if="routine.subtitle" class="text-xs text-ink-muted mt-0.5 font-body">
              {{ routine.subtitle }}
            </p>

            <!-- Exercise Tags Preview -->
            <div v-if="routine.exercises && routine.exercises.length > 0" class="flex flex-wrap gap-1 mt-2.5">
              <span
                v-for="(ex, exIdx) in routine.exercises.slice(0, 4)"
                :key="exIdx"
                class="text-[10px] font-body px-2 py-0.5 bg-surface-card rounded-md border border-plate/20 text-ink-muted truncate max-w-[140px]"
              >
                {{ getExerciseName(ex.exerciseId) }}
              </span>
              <span
                v-if="routine.exercises.length > 4"
                class="text-[10px] font-mono px-1.5 py-0.5 text-ink-muted"
              >
                +{{ routine.exercises.length - 4 }} ท่า
              </span>
            </div>
          </div>

          <!-- Routine Actions: Start, Edit, Delete -->
          <div class="flex items-center gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-plate/10">
            <!-- Start Routine Button -->
            <button
              type="button"
              @click="handleStartRoutine(routine)"
              class="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-3.5 bg-flame hover:bg-flame-glow text-white font-heading font-bold text-xs rounded-xl border-2 border-plate shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
              title="เริ่มการฝึกซ้อมตาม Routine นี้"
            >
              <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>เริ่มฝึก (Start)</span>
            </button>

            <!-- Edit Routine Button -->
            <button
              type="button"
              @click="emit('edit-routine', routine)"
              class="flex items-center justify-center gap-1 py-2 px-3 bg-surface hover:bg-paper-subtle text-ink font-heading font-bold text-xs rounded-xl border-2 border-plate shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
              title="แก้ไข Routine นี้"
            >
              <svg class="w-3.5 h-3.5 stroke-current fill-none stroke-2 text-ink-muted" viewBox="0 0 24 24">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>แก้ไข (Edit)</span>
            </button>

            <!-- Delete Routine Button -->
            <button
              type="button"
              @click="handleDeleteRoutine(routine)"
              class="p-2 bg-surface hover:bg-rose-50 text-ink-muted hover:text-rose-600 rounded-xl border-2 border-plate/40 hover:border-rose-600 shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
              title="ลบ Routine นี้"
            >
              <svg class="w-3.5 h-3.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoutineStore } from '../composables/useRoutineStore.js';
import { useActiveSessionStore } from '../composables/useActiveSessionStore.js';
import { useExerciseStore } from '../composables/useExerciseStore.js';

const emit = defineEmits(['create-routine', 'edit-routine', 'open-runner']);

const { routines, deleteRoutine, getRoutineById } = useRoutineStore();
const { isWorkoutActive, activeSession, sessionDurationSec, startSessionFromRoutine, startEmptySession } = useActiveSessionStore();
const { getExerciseById } = useExerciseStore();

const formattedDuration = computed(() => {
  const sec = sessionDurationSec.value || 0;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

function getTotalSets(routine) {
  if (!routine || !Array.isArray(routine.exercises)) return 0;
  return routine.exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0);
}

function getExerciseName(exerciseId) {
  const ex = getExerciseById(exerciseId);
  return ex ? ex.name : exerciseId;
}

function handleStartRoutine(routine) {
  startSessionFromRoutine(routine);
  emit('open-runner');
}

function handleQuickStart() {
  startEmptySession({ title: 'Quick Workout (เริ่มเล่นแบบอิสระ)' });
  emit('open-runner');
}

function handleDeleteRoutine(routine) {
  if (confirm(`คุณต้องการลบตาราง "${routine.title}" หรือไม่?`)) {
    deleteRoutine(routine.id);
  }
}

// 4-Day Protocol Chips
const currentDayOfWeek = new Date().getDay(); // 0 = Sun, 1 = Mon...
const dayMap = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu' };
const todayChipId = dayMap[currentDayOfWeek] || 'rest';

const scheduleChips = [
  { id: 'mon', routineId: 'atiwitch_mon_legs', dayName: 'จันทร์', targetMuscle: 'ขา', sub: 'Legs', isRest: false },
  { id: 'tue', routineId: 'atiwitch_tue_chest', dayName: 'อังคาร', targetMuscle: 'อก', sub: 'Chest', isRest: false },
  { id: 'wed', routineId: 'atiwitch_wed_back', dayName: 'พุธ', targetMuscle: 'หลัง', sub: 'Back', isRest: false },
  { id: 'thu', routineId: 'atiwitch_thu_shoulders', dayName: 'พฤหัส', targetMuscle: 'ไหล่', sub: 'Shoulders', isRest: false },
  { id: 'rest', routineId: null, dayName: 'ศุกร์-อาทิตย์', targetMuscle: 'พัก', sub: 'Rest', isRest: true }
];

function handleChipLaunch(chip) {
  if (chip.isRest) {
    alert('วันพักฟื้น (Rest Day): ฟื้นฟูกล้ามเนื้อ พักผ่อนให้เต็มที่เพื่อเตรียมพร้อมสำหรับสัปดาห์หน้า!');
    return;
  }
  const routine = getRoutineById(chip.routineId) || routines.value.find(r => r.id === chip.routineId || r.title.includes(chip.dayName));
  if (routine) {
    handleStartRoutine(routine);
  } else {
    handleQuickStart();
  }
}
</script>
