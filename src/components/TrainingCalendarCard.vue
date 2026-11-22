<template>
  <div class="archive-card p-4 sm:p-5 space-y-4" aria-labelledby="training-calendar-title">
    <!-- Card Header -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <span class="text-[11px] font-mono font-bold tracking-widest text-emerald-text uppercase block">
          TRAINING CALENDAR & STREAK
        </span>
        <h3 id="training-calendar-title" class="text-sm sm:text-base font-bold font-heading text-ink flex items-center gap-2">
          <span>ปฏิทินการฝึกซ้อมและความสม่ำเสมอ</span>
        </h3>
      </div>
      <div class="text-[11px] font-mono text-ink-muted">
        ความต่อเนื่องรายสัปดาห์
      </div>
    </div>

    <!-- Consistency Streak & Weekly Target Banner -->
    <div class="p-3.5 sm:p-4 rounded-xl border-2 border-plate bg-surface space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xl leading-none">🔥</span>
            <span class="text-sm font-bold font-heading text-ink">
              ซ้อมต่อเนื่อง <strong class="font-mono text-flame-text text-base tabular-nums">{{ streakData.currentStreakWeeks }}</strong> สัปดาห์ติด!
            </span>
          </div>
          <p class="text-[11px] font-mono text-ink-muted mt-0.5">
            สถิติดีที่สุด: {{ streakData.bestStreakWeeks }} สัปดาห์
            <span v-if="streakData.lastWorkoutDate"> · ล่าสุด: {{ formatDateThaiShort(streakData.lastWorkoutDate) }}</span>
          </p>
        </div>

        <div
          v-if="streakData.isTargetMetThisWeek"
          class="self-start sm:self-auto px-2.5 py-1 rounded-lg bg-emerald-bg border-2 border-emerald text-emerald-text font-bold text-xs flex items-center gap-1.5"
        >
          <span>🎉</span>
          <span>บรรลุเป้าหมายสัปดาห์นี้แล้ว!</span>
        </div>
        <div
          v-else
          class="self-start sm:self-auto text-xs font-mono font-bold text-ink px-2.5 py-1 rounded-lg bg-surface-low border border-plate/20"
        >
          สัปดาห์นี้ฝึกแล้ว {{ streakData.thisWeekWorkouts }}/{{ streakData.weeklyTarget }} วัน
        </div>
      </div>

      <!-- Target Progress Boxes & Stepper Control -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t-2 border-plate/10">
        <!-- Visual Target Progress Blocks -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-xs font-heading font-bold text-ink mr-1">เป้าหมาย:</span>
          <div class="flex items-center gap-1">
            <div
              v-for="d in streakData.weeklyTarget"
              :key="d"
              class="w-8 h-8 rounded-lg border-2 flex items-center justify-center font-mono text-xs font-bold tabular-nums transition-colors"
              :class="d <= streakData.thisWeekWorkouts
                ? 'bg-emerald-bg border-emerald text-emerald-text shadow-[1px_1px_0px_#059669]'
                : 'bg-surface-low border-plate/30 text-ink-muted'"
              :title="d <= streakData.thisWeekWorkouts ? 'ฝึกแล้ว' : 'ยังไม่ถึงเป้า'"
            >
              {{ d <= streakData.thisWeekWorkouts ? '✓' : d }}
            </div>
          </div>
        </div>

        <!-- Target Stepper Adjustment -->
        <div class="flex items-center gap-1.5">
          <span class="text-[11px] font-mono text-ink-muted hidden sm:inline">ปรับเป้า:</span>
          <button
            type="button"
            @click="updateWeeklyTarget(streakData.weeklyTarget - 1)"
            :disabled="streakData.weeklyTarget <= 1"
            aria-label="ลดเป้าหมายการฝึกต่อสัปดาห์"
            class="min-h-[44px] min-w-[44px] rounded-xl border-2 border-plate bg-surface hover:bg-paper-dim text-ink font-heading font-bold text-base touch-manipulation disabled:opacity-40 flex items-center justify-center active:translate-x-[1px] active:translate-y-[1px]"
          >
            -
          </button>
          <span class="w-12 text-center font-mono font-bold text-xs text-ink tabular-nums">
            {{ streakData.weeklyTarget }} วัน/สัปดาห์
          </span>
          <button
            type="button"
            @click="updateWeeklyTarget(streakData.weeklyTarget + 1)"
            :disabled="streakData.weeklyTarget >= 7"
            aria-label="เพิ่มเป้าหมายการฝึกต่อสัปดาห์"
            class="min-h-[44px] min-w-[44px] rounded-xl border-2 border-plate bg-surface hover:bg-paper-dim text-ink font-heading font-bold text-base touch-manipulation disabled:opacity-40 flex items-center justify-center active:translate-x-[1px] active:translate-y-[1px]"
          >
            +
          </button>
        </div>
      </div>
    </div>

    <!-- Error Alert Box -->
    <div
      v-if="error"
      role="alert"
      class="text-xs font-body text-red-700 bg-red-50 border-2 border-red-600 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2"
    >
      <span>{{ error }}</span>
      <button
        type="button"
        class="min-h-[44px] min-w-[44px] px-3 rounded-xl border-2 border-plate bg-white text-ink font-heading font-bold text-xs touch-manipulation"
        @click="retry"
      >
        ลองอีกครั้ง
      </button>
    </div>

    <!-- Month Navigation Bar -->
    <div class="flex items-center justify-between gap-2 pt-1 border-t-2 border-plate/10">
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          class="min-h-[44px] min-w-[44px] rounded-xl border-2 border-plate bg-surface hover:bg-paper-dim text-ink font-heading font-bold text-base touch-manipulation disabled:opacity-50 flex items-center justify-center active:translate-x-[1px] active:translate-y-[1px]"
          aria-label="เดือนก่อนหน้า"
          :disabled="loading"
          @click="prevMonth"
        >
          ‹
        </button>
        <span class="min-w-[8.5rem] sm:min-w-[10rem] text-center text-xs sm:text-sm font-heading font-bold text-ink" aria-live="polite">
          {{ formatThaiMonth(currentYear, currentMonth) }}
        </span>
        <button
          type="button"
          class="min-h-[44px] min-w-[44px] rounded-xl border-2 border-plate bg-surface hover:bg-paper-dim text-ink font-heading font-bold text-base touch-manipulation disabled:opacity-50 flex items-center justify-center active:translate-x-[1px] active:translate-y-[1px]"
          aria-label="เดือนถัดไป"
          :disabled="loading"
          @click="nextMonth"
        >
          ›
        </button>
      </div>

      <button
        type="button"
        class="min-h-[44px] px-3.5 rounded-xl border-2 border-plate bg-surface hover:bg-paper-dim text-ink font-heading font-bold text-xs touch-manipulation active:translate-x-[1px] active:translate-y-[1px]"
        @click="goToToday"
      >
        วันนี้
      </button>
    </div>

    <!-- Month Summary Stats -->
    <div class="flex items-center justify-between text-xs text-ink-muted font-body">
      <span>
        ฝึกแล้วเดือนนี้: <strong class="text-ink font-mono font-bold">{{ monthData.totalWorkoutsThisMonth }} วัน</strong> ({{ monthData.totalSetsThisMonth }} เซ็ต)
      </span>
      <span v-if="loading" class="text-[11px] font-mono text-ink-muted">
        กำลังโหลด...
      </span>
    </div>

    <!-- 7-Column Calendar Grid -->
    <div class="space-y-1">
      <!-- Weekday Headers -->
      <div class="grid grid-cols-7 gap-1 sm:gap-1.5 text-center font-mono font-bold text-xs text-ink-muted">
        <div v-for="wd in weekdays" :key="wd" class="py-1">
          {{ wd }}
        </div>
      </div>

      <!-- Calendar Cells -->
      <div class="grid grid-cols-7 gap-1 sm:gap-1.5">
        <template v-for="cell in calendarGrid" :key="cell.id">
          <!-- Blank cell padding outside month -->
          <div
            v-if="!cell.isCurrentMonth"
            class="min-h-[44px] rounded-xl bg-surface-low/30 border border-transparent select-none"
          ></div>

          <!-- Day cell in current month -->
          <button
            v-else
            type="button"
            @click="selectDay(cell.dateString)"
            class="min-h-[44px] p-1 rounded-xl border-2 flex flex-col items-center justify-between touch-manipulation relative transition-all"
            :class="[
              cell.hasWorkout
                ? 'bg-emerald-bg border-emerald text-emerald-text font-bold shadow-[1px_1px_0px_#059669]'
                : 'bg-surface border-plate/20 text-ink hover:border-plate/60 hover:bg-paper-dim',
              cell.isToday
                ? 'ring-2 ring-flame border-flame shadow-[2px_2px_0px_#ea580c]'
                : '',
              selectedDate === cell.dateString
                ? 'ring-2 ring-plate bg-paper-dim shadow-[2px_2px_0px_#1e2220]'
                : ''
            ]"
            :aria-label="cell.hasWorkout
              ? `วันที่ ${cell.dayNumber} ฝึกซ้อม ${cell.totalSetsDone} เซ็ต`
              : `วันที่ ${cell.dayNumber}`"
          >
            <div class="flex items-center justify-between w-full px-0.5 sm:px-1">
              <span
                class="text-xs font-mono tabular-nums leading-tight"
                :class="{ 'font-extrabold text-flame-text': cell.isToday }"
              >
                {{ cell.dayNumber }}
              </span>
              <span v-if="cell.isToday" class="text-[11px] leading-none" title="วันนี้">🔥</span>
            </div>

            <!-- Workout indicator inside cell -->
            <div v-if="cell.hasWorkout" class="flex items-center justify-center gap-0.5 mt-0.5">
              <span class="text-[11px] leading-none">🏋️</span>
              <span class="text-[11px] font-mono font-bold leading-none tabular-nums">
                {{ cell.totalSetsDone }}
              </span>
            </div>
            <div v-else class="h-3"></div>
          </button>
        </template>
      </div>
    </div>

    <!-- Day Detail Banner (when day is clicked) -->
    <div
      v-if="selectedDayInfo"
      class="rounded-xl border-2 border-plate bg-white p-3.5 sm:p-4 space-y-2.5 transition-all"
    >
      <div class="flex items-center justify-between gap-2 border-b-2 border-plate/10 pb-2">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-heading font-bold text-ink">
            วันที่ {{ formatDateThaiShort(selectedDayInfo.date) }}
          </span>
          <span
            v-if="selectedDayInfo.hasWorkout"
            class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-bg text-emerald-text border border-emerald"
          >
            ฝึกแล้ว {{ selectedDayInfo.totalSetsDone }} เซ็ต
          </span>
        </div>
        <button
          type="button"
          @click="selectDay(selectedDayInfo.date)"
          class="min-h-[44px] min-w-[44px] text-xs font-bold text-ink-muted hover:text-ink flex items-center justify-center touch-manipulation"
          aria-label="ปิดรายละเอียดวันที่"
        >
          ✕
        </button>
      </div>

      <!-- Has Workout(s) on selected day -->
      <div v-if="selectedDayInfo.hasWorkout" class="space-y-2">
        <div
          v-for="w in selectedDayInfo.workouts"
          :key="w.sessionId"
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-surface-low border border-plate/20"
        >
          <div>
            <div class="text-xs font-heading font-bold text-ink">
              {{ w.dayTitle || w.dayKey }}
            </div>
            <div class="text-[11px] font-mono text-ink-muted mt-0.5">
              รวม {{ w.totalSetsDone }} เซ็ตที่สำเร็จ
            </div>
          </div>
          <button
            type="button"
            @click="scrollToSession(w.sessionId)"
            class="min-h-[44px] px-3.5 rounded-xl border-2 border-plate bg-emerald hover:bg-emerald/90 text-white font-heading font-bold text-xs flex items-center justify-center gap-1.5 touch-manipulation shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px]"
          >
            <span>ดูประวัติรอบนี้</span>
            <span>→</span>
          </button>
        </div>
      </div>

      <!-- Rest Day / No Workout -->
      <div v-else class="text-xs text-ink-muted font-body py-1 flex items-center gap-2">
        <span>🛌 ไม่มีประวัติการฝึกซ้อมในวันนี้ (วันพักผ่อน / Rest Day)</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import {
  useTrainingCalendar,
  formatThaiMonth,
  formatDateThaiShort
} from '../composables/useTrainingCalendar.js';

const emit = defineEmits(['jump']);

const {
  currentYear,
  currentMonth,
  monthData,
  streakData,
  loading,
  error,
  selectedDate,
  selectedDayInfo,
  calendarGrid,
  weekdays,
  fetchMonth,
  fetchStreak,
  updateWeeklyTarget,
  nextMonth,
  prevMonth,
  goToToday,
  selectDay
} = useTrainingCalendar();

async function retry() {
  await Promise.all([fetchMonth(), fetchStreak()]);
}

function scrollToSession(sessionId) {
  if (!sessionId) return;
  emit('jump', sessionId);
  const targetId = `session-${sessionId}`;
  const el = document.getElementById(targetId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-4', 'ring-emerald', 'transition-all');
    setTimeout(() => {
      el.classList.remove('ring-4', 'ring-emerald');
    }, 2500);
  }
}

onMounted(async () => {
  await Promise.all([fetchMonth(), fetchStreak()]);
});
</script>
