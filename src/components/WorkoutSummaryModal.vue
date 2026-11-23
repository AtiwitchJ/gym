<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-plate/65 backdrop-blur-sm select-none overflow-y-auto"
      @click.self="emit('close')"
    >
      <div
        class="w-full max-w-lg bg-paper border-2 border-plate shadow-[4px_4px_0px_#1e2220] rounded-2xl flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-200"
      >
        <!-- Modal Top Celebratory Banner -->
        <div class="relative bg-gradient-to-b from-flame/15 to-paper p-5 sm:p-6 text-center border-b-2 border-plate/20">
          <!-- Floating Trophy Badge -->
          <div class="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 rounded-2xl bg-gold border-2 border-plate shadow-[3px_3px_0px_#1e2220] flex items-center justify-center text-3xl sm:text-4xl">
            🏆
          </div>

          <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-flame text-white text-[11px] font-mono font-bold uppercase tracking-wider mb-1.5 shadow-[1px_1px_0px_#1e2220]">
            <span>⚡ WORKOUT COMPLETE</span>
          </div>

          <button
            type="button"
            @click="emit('close')"
            class="absolute top-2 right-2 min-h-[44px] min-w-[44px] rounded-full border-2 border-plate bg-white text-ink font-bold flex items-center justify-center focus-visible:ring-2 focus-visible:ring-plate touch-manipulation"
            title="ปิดหน้าสรุป (ไม่บันทึกซ้ำ)"
            aria-label="ปิด"
          >✕</button>

          <h2 class="text-xl sm:text-2xl font-extrabold font-heading text-ink tracking-tight">
            สุดยอดมาก! ฝึกสำเร็จแล้ว
          </h2>
          <p class="text-xs sm:text-sm font-heading font-bold text-flame-text mt-0.5">
            {{ summary?.title || 'Workout Session' }}
          </p>
          <p v-if="summary?.subtitle" class="text-[11px] text-ink-muted font-body mt-0.5">
            {{ summary.subtitle }}
          </p>
        </div>

        <!-- Stat Cards Grid: Volume, Duration, Completed Sets -->
        <div class="p-4 sm:p-5 space-y-4">
          <div class="grid grid-cols-3 gap-2 sm:gap-2.5">
            <!-- Total Volume Card -->
            <div class="bg-surface border-2 border-plate rounded-xl p-2.5 sm:p-3 text-center shadow-[2px_2px_0px_#1e2220] flex flex-col justify-center">
              <span class="text-[11px] font-mono font-bold text-ink-muted uppercase tracking-wider mb-1">
                ปริมาณยก (Volume)
              </span>
              <div class="flex items-baseline justify-center gap-0.5 text-flame-text">
                <span class="font-mono tabular-nums text-base sm:text-lg font-extrabold">
                  {{ formattedVolume }}
                </span>
                <span class="text-[11px] font-mono font-bold text-ink-muted">กก.</span>
              </div>
            </div>

            <!-- Workout Duration Card -->
            <div class="bg-surface border-2 border-plate rounded-xl p-2.5 sm:p-3 text-center shadow-[2px_2px_0px_#1e2220] flex flex-col justify-center">
              <span class="text-[11px] font-mono font-bold text-ink-muted uppercase tracking-wider mb-1">
                เวลาที่ใช้ (Duration)
              </span>
              <div class="font-mono tabular-nums text-base sm:text-lg font-extrabold text-ink">
                {{ formattedDuration }}
              </div>
            </div>

            <!-- Completed Sets Card -->
            <div class="bg-surface border-2 border-plate rounded-xl p-2.5 sm:p-3 text-center shadow-[2px_2px_0px_#1e2220] flex flex-col justify-center">
              <span class="text-[11px] font-mono font-bold text-ink-muted uppercase tracking-wider mb-1">
                เซ็ตสำเร็จ (Sets)
              </span>
              <div class="font-mono tabular-nums text-base sm:text-lg font-extrabold text-emerald-text">
                {{ setsRatioText }}
              </div>
            </div>
          </div>

          <!-- Session time analytics: time under tension vs time resting -->
          <div v-if="sessionAnalytics.hasTimestamps" class="grid grid-cols-3 gap-2 sm:gap-2.5">
            <div class="bg-white border-2 border-plate rounded-xl p-2.5 sm:p-3 text-center shadow-[2px_2px_0px_#1e2220] flex flex-col justify-center">
              <span class="text-[11px] font-mono font-bold text-ink-muted uppercase tracking-wider mb-1">เวลาออกแรง (Active)</span>
              <div class="font-mono tabular-nums text-sm sm:text-base font-extrabold text-emerald-text">
                {{ formatDuration(sessionAnalytics.activeSec) }}
              </div>
            </div>
            <div class="bg-white border-2 border-plate rounded-xl p-2.5 sm:p-3 text-center shadow-[2px_2px_0px_#1e2220] flex flex-col justify-center">
              <span class="text-[11px] font-mono font-bold text-ink-muted uppercase tracking-wider mb-1">เวลาพัก (Rest)</span>
              <div class="font-mono tabular-nums text-sm sm:text-base font-extrabold text-sky-text">
                {{ formatDuration(sessionAnalytics.restSec) }}
              </div>
            </div>
            <div class="bg-white border-2 border-plate rounded-xl p-2.5 sm:p-3 text-center shadow-[2px_2px_0px_#1e2220] flex flex-col justify-center">
              <span class="text-[11px] font-mono font-bold text-ink-muted uppercase tracking-wider mb-1">พักเฉลี่ย/เซ็ต</span>
              <div class="font-mono tabular-nums text-sm sm:text-base font-extrabold text-flame-text">
                {{ formatDuration(sessionAnalytics.avgRestSec) }}
              </div>
            </div>
          </div>

          <!-- Exercises Breakdown List -->
          <div v-if="summary?.exercises && summary.exercises.length > 0" class="bg-surface border-2 border-plate rounded-xl p-3 shadow-[2px_2px_0px_#1e2220] space-y-2">
            <div class="flex items-center justify-between text-xs font-mono font-bold text-ink border-b border-plate/15 pb-1.5 px-0.5">
              <span>ท่าที่ฝึกในรอบนี้ ({{ summary.exercises.length }} ท่า)</span>
              <span class="text-ink-muted text-[11px]">เซ็ตที่ทำได้</span>
            </div>

            <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <div
                v-for="(ex, exIdx) in summary.exercises"
                :key="exIdx"
                class="flex items-center justify-between text-xs font-mono p-1.5 rounded-lg bg-paper-subtle border border-plate/15"
              >
                <div class="flex items-center gap-1.5 min-w-0 pr-2">
                  <span class="w-4 h-4 rounded bg-plate text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                    {{ exIdx + 1 }}
                  </span>
                  <span class="font-bold text-ink truncate">{{ ex.name }}</span>
                </div>

                <div class="flex items-center gap-1 flex-shrink-0 text-[11px]">
                  <span class="text-emerald-text font-bold">{{ countExerciseCompletedSets(ex) }}</span>
                  <span class="text-ink-muted">/</span>
                  <span class="text-ink-muted">{{ ex.sets ? ex.sets.length : 0 }} เซ็ต</span>
                </div>
              </div>
            </div>
          </div>

          <!-- PR list for this session (set when a set beat the stored PR; step 6b) -->
          <div v-if="summary?.prs && summary.prs.length > 0" class="bg-white border-2 border-plate rounded-xl p-3 shadow-[2px_2px_0px_#1e2220]">
            <div class="text-xs font-mono font-bold text-ink mb-1.5">🏆 PR ในรอบนี้</div>
            <ul class="space-y-1">
              <li v-for="pr in prRows" :key="`${pr.exerciseId}-${pr.setIndex}`" class="text-xs font-body text-ink">
                {{ pr.label }}
              </li>
            </ul>
          </div>

          <!-- Post-Workout Debrief (sRPE, Muscle Pump & Joint Comfort) -->
          <div class="bg-paper-subtle border-2 border-plate shadow-[3px_3px_0px_#1e2220] rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
            <!-- Header -->
            <div class="flex items-center justify-between border-b-2 border-plate/15 pb-2.5">
              <div class="flex items-center gap-2">
                <span class="text-xl">📊</span>
                <div>
                  <span class="text-[11px] font-mono font-bold tracking-widest text-flame-text uppercase block">
                    POST-WORKOUT DEBRIEF
                  </span>
                  <h3 class="text-sm sm:text-base font-heading font-extrabold text-ink leading-tight">
                    ประเมินความล้า & ความพร้อมร่างกาย
                  </h3>
                </div>
              </div>
              <div class="text-right">
                <span class="text-[11px] font-mono font-bold text-ink-muted uppercase block">SESSION LOAD</span>
                <span class="font-mono tabular-nums text-sm sm:text-base font-extrabold text-flame-text">
                  {{ currentSessionLoadAu }} AU
                </span>
              </div>
            </div>

            <!-- Session RPE Stepper (1-10) -->
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <label class="text-xs font-mono font-bold text-ink">
                  ความหนักโดยรวม (Session RPE: 1–10)
                </label>
                <span class="text-[11px] font-mono font-bold text-flame-text">
                  {{ currentSrpeText }}
                </span>
              </div>

              <div class="flex items-center justify-between bg-white border-2 border-plate rounded-xl p-2 shadow-[2px_2px_0px_#1e2220]">
                <button
                  type="button"
                  @click="decrementRpe"
                  :disabled="currentRpe <= 1"
                  class="min-h-[48px] min-w-[48px] w-12 h-12 rounded-lg border-2 border-plate bg-paper-subtle hover:bg-paper active:translate-x-[1px] active:translate-y-[1px] text-ink font-mono font-extrabold text-lg flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none touch-manipulation focus-visible:ring-2 focus-visible:ring-plate"
                  aria-label="ลด RPE"
                >
                  −
                </button>

                <div class="flex flex-col items-center">
                  <div class="flex items-baseline gap-1">
                    <span class="font-mono tabular-nums text-2xl sm:text-3xl font-extrabold text-ink">
                      {{ currentRpe }}
                    </span>
                    <span class="font-mono text-xs font-bold text-ink-muted">/ 10</span>
                  </div>
                  <span class="text-[11px] font-heading font-bold text-ink-muted">
                    {{ currentSrpeText }}
                  </span>
                </div>

                <button
                  type="button"
                  @click="incrementRpe"
                  :disabled="currentRpe >= 10"
                  class="min-h-[48px] min-w-[48px] w-12 h-12 rounded-lg border-2 border-plate bg-paper-subtle hover:bg-paper active:translate-x-[1px] active:translate-y-[1px] text-ink font-mono font-extrabold text-lg flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none touch-manipulation focus-visible:ring-2 focus-visible:ring-plate"
                  aria-label="เพิ่ม RPE"
                >
                  +
                </button>
              </div>
            </div>

            <!-- Muscle Pump Rating Pills -->
            <div class="flex flex-col gap-1.5">
              <span class="text-xs font-mono font-bold text-ink">
                ระดับการปั๊มของกล้ามเนื้อ (Muscle Pump)
              </span>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="opt in pumpOptions"
                  :key="opt.id"
                  type="button"
                  @click="setPump(opt.id)"
                  class="min-h-[44px] min-w-[44px] px-2.5 py-2 rounded-xl border-2 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-plate"
                  :class="currentPump === opt.id
                    ? 'bg-flame text-white border-plate shadow-[2px_2px_0px_#1e2220]'
                    : 'bg-white text-ink border-plate/40 hover:border-plate hover:bg-paper-subtle'"
                >
                  <span>{{ opt.emoji }}</span>
                  <span class="truncate">{{ opt.shortLabel }}</span>
                </button>
              </div>
            </div>

            <!-- Joint Comfort Rating Pills -->
            <div class="flex flex-col gap-1.5">
              <span class="text-xs font-mono font-bold text-ink">
                สภาพข้อต่อและเส้นเอ็น (Joint Comfort)
              </span>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="opt in jointOptions"
                  :key="opt.id"
                  type="button"
                  @click="setJoint(opt.id)"
                  class="min-h-[44px] min-w-[44px] px-2.5 py-2 rounded-xl border-2 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-plate"
                  :class="currentJoint === opt.id
                    ? 'bg-emerald text-white border-plate shadow-[2px_2px_0px_#1e2220]'
                    : 'bg-white text-ink border-plate/40 hover:border-plate hover:bg-paper-subtle'"
                >
                  <span>{{ opt.emoji }}</span>
                  <span class="truncate">{{ opt.shortLabel }}</span>
                </button>
              </div>
            </div>

            <!-- Session Load Calculation Summary -->
            <div class="bg-white/80 border border-plate/20 rounded-xl p-2.5 flex items-center justify-between text-[11px] font-mono text-ink-muted">
              <span>สูตรคำนวณ: (เวลา {{ Math.round(currentDurationSec / 60) }} นาที ÷ 60) × sRPE {{ currentRpe }}</span>
              <span class="font-bold text-ink">{{ currentSessionLoadAu }} AU</span>
            </div>
          </div>

          <!-- Shareable workout card (Hevy-style social summary card) -->
          <ShareCard :summary="summary" />

          <!-- Motivational Encouragement Banner -->
          <div class="p-3 bg-emerald-bg/50 border-2 border-emerald rounded-xl flex items-center gap-2.5">
            <span class="text-xl">💪</span>
            <div class="text-[11px] font-body text-ink leading-relaxed">
              <strong class="font-bold text-emerald-text">ฟื้นฟูร่างกายและพักผ่อนให้เพียงพอ:</strong>
              ดื่มน้ำ ทานโปรตีน และนอนหลับ 7–8 ชม. เพื่อให้กล้ามเนื้อพร้อมสำหรับการฝึกรอบถัดไป!
            </div>
          </div>

          <!-- Action Button: close (no save) -->
          <button
            type="button"
            @click="emit('close')"
            class="w-full min-h-[44px] py-3.5 px-4 rounded-xl border-2 border-plate bg-flame hover:bg-flame-glow text-white font-heading font-extrabold text-sm sm:text-base tracking-wide shadow-[3px_3px_0px_#1e2220] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all flex items-center justify-center gap-2 touch-manipulation focus-visible:ring-2 focus-visible:ring-plate"
          >
            <span>ปิดและกลับสู่หน้าหลัก (ไม่บันทึกซ้ำ)</span>
            <svg class="w-4 h-4 fill-current" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { prLabel } from '../composables/useSessionSummary.js';
import { computeSessionAnalytics, formatDuration } from '../composables/useSessionAnalytics.js';
import {
  normalizeSrpe,
  normalizePumpRating,
  normalizeJointComfort,
  computeSessionLoadAu,
  getSrpeLabel,
  PUMP_CONFIG,
  JOINT_CONFIG,
  DEFAULT_SESSION_RPE,
  DEFAULT_PUMP_RATING,
  DEFAULT_JOINT_COMFORT
} from '../composables/useSessionDebrief.js';
import ShareCard from './ShareCard.vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  summary: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close']);

// Active time / rest time / average rest per set, derived from set completion timestamps.
const sessionAnalytics = computed(() => computeSessionAnalytics(props.summary));

// Formatted Total Volume with comma separator
const formattedVolume = computed(() => {
  const vol = props.summary?.totalVolumeKg || 0;
  return Number(vol).toLocaleString('en-US');
});

// Formatted Duration (MM:SS or HH:MM:SS)
const formattedDuration = computed(() => {
  const sec = props.summary?.durationSec || 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

// Sets Ratio Text e.g. "18 / 20"
const setsRatioText = computed(() => {
  if (!props.summary) return '0';
  const completed = props.summary.completedSetsCount !== undefined
    ? props.summary.completedSetsCount
    : (props.summary.totalSetsCompleted !== undefined ? props.summary.totalSetsCompleted : 0);

  const total = props.summary.totalSetsCount !== undefined
    ? props.summary.totalSetsCount
    : (props.summary.exercises ? props.summary.exercises.reduce((acc, ex) => acc + (ex.sets ? ex.sets.length : 0), 0) : completed);

  if (total > 0) {
    return `${completed} / ${total}`;
  }
  return String(completed);
});

const prRows = computed(() => (props.summary?.prs || []).map((pr) => ({ ...pr, label: prLabel(pr) })));

function countExerciseCompletedSets(exercise) {
  if (!exercise || !Array.isArray(exercise.sets)) return 0;
  return exercise.sets.filter(s => s && s.completed).length;
}

// Debrief options
const pumpOptions = [
  { id: 'low', ...PUMP_CONFIG.low },
  { id: 'good', ...PUMP_CONFIG.good },
  { id: 'insane', ...PUMP_CONFIG.insane }
];

const jointOptions = [
  { id: 'good', ...JOINT_CONFIG.good },
  { id: 'mild_ache', ...JOINT_CONFIG.mild_ache },
  { id: 'pain', ...JOINT_CONFIG.pain }
];

// Debrief Reactive State
const currentRpe = ref(DEFAULT_SESSION_RPE);
const currentPump = ref(DEFAULT_PUMP_RATING);
const currentJoint = ref(DEFAULT_JOINT_COMFORT);

const currentDurationSec = computed(() => Number(props.summary?.durationSec || 0));

const currentSessionLoadAu = computed(() => {
  return computeSessionLoadAu(currentDurationSec.value, currentRpe.value);
});

const currentSrpeText = computed(() => getSrpeLabel(currentRpe.value));

function syncDebriefToSession() {
  if (props.summary) {
    props.summary.sessionRpe = currentRpe.value;
    props.summary.sessionLoadAu = currentSessionLoadAu.value;
    props.summary.pumpRating = currentPump.value;
    props.summary.jointComfort = currentJoint.value;
  }
}

watch(
  () => [props.summary, props.isOpen],
  () => {
    if (props.summary) {
      currentRpe.value = normalizeSrpe(props.summary.sessionRpe ?? DEFAULT_SESSION_RPE);
      currentPump.value = normalizePumpRating(props.summary.pumpRating ?? DEFAULT_PUMP_RATING);
      currentJoint.value = normalizeJointComfort(props.summary.jointComfort ?? DEFAULT_JOINT_COMFORT);
      syncDebriefToSession();
    }
  },
  { immediate: true }
);

function incrementRpe() {
  if (currentRpe.value < 10) {
    currentRpe.value += 1;
    syncDebriefToSession();
  }
}

function decrementRpe() {
  if (currentRpe.value > 1) {
    currentRpe.value -= 1;
    syncDebriefToSession();
  }
}

function setPump(id) {
  currentPump.value = normalizePumpRating(id);
  syncDebriefToSession();
}

function setJoint(id) {
  currentJoint.value = normalizeJointComfort(id);
  syncDebriefToSession();
}
</script>
