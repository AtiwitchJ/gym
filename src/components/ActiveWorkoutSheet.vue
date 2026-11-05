<template>
  <div
    v-if="isWorkoutActive && activeSession"
    class="fixed inset-0 z-[45] flex flex-col bg-paper text-ink overflow-hidden select-none"
  >
    <!-- Sticky Top Runner Header -->
    <header class="sticky top-0 z-20 bg-paper/95 backdrop-blur-md border-b-2 border-plate shadow-[0_2px_12px_rgba(30,34,32,0.1)] flex-shrink-0">
      <div class="max-w-3xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        <!-- Title & Live Stopwatch Readout -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-bg border border-emerald text-emerald text-[10px] font-mono font-bold">
              <span class="w-2 h-2 rounded-full bg-emerald animate-pulse"></span>
              <span>LIVE WORKOUT</span>
            </span>
            <!-- Live Stopwatch Timer -->
            <span class="font-mono tabular-nums text-xs sm:text-sm font-bold text-flame bg-flame-bg px-2 py-0.5 rounded-md border border-flame/30">
              ⏱ {{ formattedStopwatch }}
            </span>
          </div>

          <h2 class="text-sm sm:text-base font-bold font-heading text-ink tracking-tight truncate">
            {{ activeSession.title || 'Active Workout Session' }}
          </h2>
          <p v-if="activeSession.subtitle" class="text-[11px] text-ink-muted font-body truncate">
            {{ activeSession.subtitle }}
          </p>
        </div>

        <!-- Header Actions: Add Exercise, Minimize, Discard & Finish Buttons -->
        <div class="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <!-- Minimize Sheet Button -->
          <button
            type="button"
            @click="emit('minimize')"
            class="px-2 py-1.5 rounded-xl border-2 border-plate bg-surface hover:bg-paper-subtle text-ink font-heading font-bold text-xs shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1"
            title="ย่อหน้าต่างออกกำลังกาย (Minimize)"
          >
            <svg class="w-3.5 h-3.5 stroke-current fill-none stroke-2 text-ink-muted" viewBox="0 0 24 24">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            <span class="hidden sm:inline">ย่อ</span>
          </button>

          <!-- Compact Add Exercise Button -->
          <button
            type="button"
            @click="isPickerOpen = true"
            class="px-2 sm:px-2.5 py-1.5 rounded-xl border-2 border-plate bg-surface hover:bg-paper-subtle text-ink font-heading font-bold text-xs shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1"
            title="เพิ่มท่าฝึก (Add Exercise)"
          >
            <svg class="w-3.5 h-3.5 stroke-current fill-none stroke-2 text-flame" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>+ ท่า</span>
          </button>

          <!-- Discard Button -->
          <button
            type="button"
            @click="handleDiscard"
            class="px-2.5 sm:px-3 py-1.5 rounded-xl border-2 border-plate/40 hover:border-rose-600 bg-surface hover:bg-rose-50 text-ink-muted hover:text-rose-600 font-heading font-bold text-xs shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1"
            title="ยกเลิกการออกกำลังกายนี้"
          >
            <svg class="w-3.5 h-3.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span class="hidden xs:inline">ยกเลิก</span>
          </button>

          <!-- Finish Session Button -->
          <button
            type="button"
            @click="handleFinish"
            class="px-3.5 sm:px-4 py-1.5 rounded-xl border-2 border-plate bg-emerald hover:bg-emerald-600 text-white font-heading font-bold text-xs sm:text-sm shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1.5"
            title="เสร็จสิ้นและบันทึกประวัติการออกกำลังกาย"
          >
            <svg class="w-4 h-4 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>เสร็จสิ้น</span>
          </button>
        </div>
      </div>

      <!-- Quick Session Live Progress Strip -->
      <div class="bg-paper-subtle border-t border-plate/15 px-3 sm:px-4 py-1.5 text-[11px] font-mono flex items-center justify-between text-ink-muted">
        <div class="flex items-center gap-2">
          <span>ความคืบหน้า:</span>
          <strong class="text-ink font-bold">{{ completedSetsTotal }} / {{ totalSetsTotal }} เซ็ต</strong>
          <span class="text-plate/30">•</span>
          <span class="text-flame font-bold">{{ sessionProgressPercent }}%</span>
        </div>
        <div class="flex items-center gap-1">
          <span>ปริมาณสะสม:</span>
          <strong class="text-ink font-bold">{{ formatNumber(liveVolumeKg) }} กก.</strong>
        </div>
      </div>
    </header>

    <!-- Scrollable Exercises List -->
    <main class="flex-1 overflow-y-auto px-2.5 sm:px-4 py-3 sm:py-4 space-y-3.5 pb-36">
      <div class="max-w-3xl mx-auto space-y-3.5">
        <!-- Empty Workout State -->
        <div
          v-if="!activeSession.exercises || activeSession.exercises.length === 0"
          class="text-center py-12 px-4 bg-surface border-2 border-dashed border-plate/30 rounded-2xl"
        >
          <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-paper-dim border-2 border-plate/20 flex items-center justify-center text-ink-faint">
            <svg class="w-6 h-6 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
              <path d="M4 6h16M4 18h16M9 6v12M15 6v12M2 9h2v6H2zM20 9h2v6h-2z" />
            </svg>
          </div>
          <p class="text-sm font-bold font-heading text-ink mb-1">
            ยังไม่มีท่าออกกำลังกายในรอบนี้
          </p>
          <p class="text-xs text-ink-muted mb-4 font-body">
            กดปุ่มด้านล่างเพื่อเพิ่มท่าที่คุณต้องการเล่น
          </p>
          <button
            type="button"
            @click="isPickerOpen = true"
            class="px-4 py-2 text-xs font-heading font-bold border-2 border-plate bg-flame hover:bg-flame-glow text-white rounded-xl shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            + เพิ่มท่าเล่นแรก
          </button>
        </div>

        <!-- Exercise Cards -->
        <div
          v-for="(exercise, exIdx) in activeSession.exercises"
          :key="exercise.exerciseId + '_' + exIdx"
          class="archive-card p-3 sm:p-4 bg-surface border-2 border-plate rounded-2xl shadow-[2.5px_2.5px_0px_#1e2220] space-y-2.5"
        >
          <!-- Exercise Header -->
          <div class="flex items-start justify-between gap-2 pb-2 border-b-2 border-plate/15">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap mb-1">
                <span class="w-5 h-5 rounded-md bg-plate text-white text-[10px] font-mono font-bold flex items-center justify-center">
                  #{{ exIdx + 1 }}
                </span>
                <span
                  class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border"
                  :class="getMuscleBadgeClass(exercise.muscleGroup)"
                >
                  {{ getMuscleLabel(exercise.muscleGroup) }}
                </span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full capitalize bg-surface-card border border-plate/20 text-ink-muted">
                  {{ exercise.equipment || 'อุปกรณ์' }}
                </span>
                <span v-if="exercise.restSec" class="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-paper-subtle text-ink-muted">
                  พัก {{ exercise.restSec }}s
                </span>
              </div>

              <h3 class="text-sm sm:text-base font-bold font-heading text-ink leading-tight">
                {{ exercise.name }}
              </h3>
            </div>

            <!-- Exercise Action Buttons: Video Demo, Add Set & Remove Exercise -->
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <!-- Video Demo Button -->
              <button
                v-if="getExerciseVideoInfo(exercise.exerciseId).videoId || getExerciseVideoInfo(exercise.exerciseId).localVideo"
                type="button"
                @click="toggleExerciseVideo(exIdx)"
                class="px-2 py-1 text-[11px] font-heading font-bold rounded-lg border-2 border-plate shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1 select-none"
                :class="activeVideos[exIdx] ? 'bg-flame text-white' : getExerciseVideoInfo(exercise.exerciseId).localVideo ? 'bg-emerald text-white' : 'bg-paper hover:bg-paper-dim text-ink'"
                :title="activeVideos[exIdx] ? 'ปิดคลิป' : 'ดูคลิปสาธิต'"
              >
                <span>{{ activeVideos[exIdx] ? '✕ ปิด' : getExerciseVideoInfo(exercise.exerciseId).localVideo ? '🎬 ในเครื่อง' : '🎬 คลิป' }}</span>
              </button>

              <button
                type="button"
                @click="addSet(exIdx)"
                class="px-2.5 py-1 text-[11px] font-heading font-bold rounded-lg border-2 border-plate bg-paper hover:bg-paper-dim text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1"
                title="เพิ่มเซ็ตใหม่สำหรับท่านี้"
              >
                <span class="text-flame font-bold">+</span>
                <span>เพิ่มเซ็ต</span>
              </button>

              <button
                type="button"
                @click="handleRemoveExercise(exIdx, exercise.name)"
                class="w-7 h-7 rounded-lg border-2 border-rose-300 hover:border-rose-600 bg-rose-50 text-rose-600 flex items-center justify-center shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                title="ลบท่านี้ออกจากรอบฝึก"
              >
                <svg class="w-3.5 h-3.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Expandable Video Player Box -->
          <div
            v-if="activeVideos[exIdx]"
            class="p-2.5 bg-paper-subtle rounded-xl border-2 border-plate shadow-xs"
          >
            <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div class="flex items-center gap-1.5 flex-wrap">
                <button
                  v-if="getExerciseVideoInfo(exercise.exerciseId).localVideo"
                  type="button"
                  @click="activeVideoSources[exIdx] = 'local'"
                  class="px-2 py-0.5 text-[10px] font-mono font-bold rounded border"
                  :class="(activeVideoSources[exIdx] || 'local') === 'local' ? 'bg-emerald text-white border-plate' : 'bg-surface text-ink border-plate/30'"
                >
                  🎬 คลิปในเครื่อง (3 เครื่อง)
                </button>
                <button
                  v-if="getExerciseVideoInfo(exercise.exerciseId).videoId"
                  type="button"
                  @click="activeVideoSources[exIdx] = 'youtube'"
                  class="px-2 py-0.5 text-[10px] font-mono font-bold rounded border"
                  :class="activeVideoSources[exIdx] === 'youtube' ? 'bg-flame text-white border-plate' : 'bg-surface text-ink border-plate/30'"
                >
                  🔴 YouTube
                </button>
              </div>
              <button
                type="button"
                @click="activeVideos[exIdx] = false"
                class="text-[10px] font-mono font-bold text-ink-muted hover:text-ink px-1.5 py-0.5 bg-surface rounded border border-plate/20"
              >
                ✕ ปิดคลิป
              </button>
            </div>

            <div class="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-plate bg-black">
              <video
                v-if="(activeVideoSources[exIdx] || 'local') === 'local' && getExerciseVideoInfo(exercise.exerciseId).localVideo"
                :src="getExerciseVideoInfo(exercise.exerciseId).localVideo"
                controls
                playsinline
                autoplay
                loop
                class="w-full h-full object-contain bg-black"
              ></video>
              <iframe
                v-else-if="getExerciseVideoInfo(exercise.exerciseId).videoId"
                :src="`https://www.youtube-nocookie.com/embed/${getExerciseVideoInfo(exercise.exerciseId).videoId}?autoplay=1&rel=0`"
                class="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              ></iframe>
            </div>
            <p v-if="getExerciseVideoInfo(exercise.exerciseId).localVideoTitle" class="text-[10px] font-mono text-emerald font-bold mt-1">
              ✓ {{ getExerciseVideoInfo(exercise.exerciseId).localVideoTitle }}
            </p>
          </div>

          <!-- Progressive Overload Advice Chip Banner -->
          <div
            v-if="getOverloadAdvice(exercise.exerciseId)"
            class="p-2 rounded-xl bg-flame-bg/70 border border-flame/40 flex items-center justify-between gap-2 text-xs font-mono"
          >
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="text-flame font-bold flex-shrink-0">⚡ คำแนะนำ:</span>
              <span class="text-ink font-bold truncate">
                {{ getOverloadAdvice(exercise.exerciseId).headline }}
              </span>
            </div>
            <span
              class="px-2 py-0.5 rounded-full text-[10px] font-bold border border-plate flex-shrink-0"
              :class="getOverloadAdvice(exercise.exerciseId).badgeClass"
            >
              {{ getOverloadAdvice(exercise.exerciseId).badgeText }}
            </span>
          </div>

          <!-- Sets Table -->
          <div class="space-y-1.5">
            <!-- Table Header: SET | PREV | KG | REPS | ✓ -->
            <div class="grid grid-cols-12 gap-1.5 text-center text-[10px] font-mono font-bold text-ink-muted uppercase py-1 px-1 border-b border-plate/15">
              <div class="col-span-2 text-left pl-1">SET</div>
              <div class="col-span-3 text-center">PREV</div>
              <div class="col-span-3 text-center">KG (นน.)</div>
              <div class="col-span-2 text-center">REPS (ครั้ง)</div>
              <div class="col-span-2 text-center">✓</div>
            </div>

            <!-- Set Rows -->
            <div
              v-for="(set, setIdx) in exercise.sets"
              :key="setIdx"
              class="grid grid-cols-12 gap-1.5 items-center p-1.5 rounded-xl border transition-all"
              :class="set.completed
                ? 'bg-emerald-bg/40 border-emerald/50'
                : 'bg-paper-subtle border-plate/25 hover:border-plate/60'"
            >
              <!-- SET Column: Number + Type Badge -->
              <div class="col-span-2 flex items-center gap-1 min-w-0 pl-1">
                <span class="font-mono font-bold text-xs tabular-nums text-ink">
                  {{ setIdx + 1 }}
                </span>
                <!-- Segmented Set Type Pill Button -->
                <button
                  type="button"
                  @click="cycleSetType(exIdx, setIdx)"
                  class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border leading-none transition-colors"
                  :class="getSetTypeBadgeClass(set.type)"
                  :title="`ประเภทเซ็ต: ${set.type} (แตะเพื่อสลับ W/R/D/F)`"
                >
                  {{ getSetTypeShort(set.type) }}
                </button>
              </div>

              <!-- PREV Column: Past Session Weight x Reps -->
              <div class="col-span-3 text-center text-[11px] font-mono font-medium text-ink-muted truncate">
                {{ getPreviousPerformanceText(exercise.exerciseId, setIdx) }}
              </div>

              <!-- KG Column: Interactive Tap Target for Weight -->
              <div class="col-span-3">
                <button
                  type="button"
                  @click="openWeightKeypad(exercise, exIdx, set, setIdx)"
                  class="w-full py-1.5 px-2 bg-white hover:bg-paper-dim border-2 border-plate rounded-lg shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-xs font-mono font-bold text-ink flex items-center justify-center gap-0.5 transition-all touch-manipulation"
                  :class="set.completed ? 'opacity-85' : ''"
                  :title="`ใส่น้ำหนักเซ็ตที่ ${setIdx + 1}`"
                >
                  <span class="tabular-nums">{{ formatWeight(set.weight ?? set.targetWeight) }}</span>
                  <span class="text-[9px] text-ink-muted font-normal">kg</span>
                </button>
              </div>

              <!-- REPS Column: Interactive Tap Target for Reps -->
              <div class="col-span-2">
                <button
                  type="button"
                  @click="openRepsKeypad(exercise, exIdx, set, setIdx)"
                  class="w-full py-1.5 px-1 bg-white hover:bg-paper-dim border-2 border-plate rounded-lg shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-xs font-mono font-bold text-ink flex items-center justify-center gap-0.5 transition-all touch-manipulation"
                  :class="set.completed ? 'opacity-85' : ''"
                  :title="`ใส่จำนวนครั้งเซ็ตที่ ${setIdx + 1}`"
                >
                  <span class="tabular-nums">{{ set.reps ?? set.targetReps ?? 8 }}</span>
                </button>
              </div>

              <!-- ✓ Column: Tactile Checkmark Button -->
              <div class="col-span-2 flex items-center justify-center gap-1">
                <button
                  type="button"
                  @click="handleToggleSet(exIdx, setIdx)"
                  class="w-8 h-8 rounded-lg border-2 border-plate flex items-center justify-center transition-all select-none touch-manipulation"
                  :class="set.completed
                    ? 'bg-emerald text-white shadow-[1.5px_1.5px_0px_#059669] scale-100'
                    : 'bg-white hover:bg-paper-dim text-ink-muted/40 shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'"
                  :title="set.completed ? 'ทำเครื่องหมายว่ายังไม่เสร็จ' : 'ทำเครื่องหมายว่าเสร็จแล้ว (เริ่มนับเวลาพัก)'"
                >
                  <svg class="w-4 h-4 stroke-current fill-none stroke-[2.5]" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>

                <!-- Remove Set Button (Visible when > 1 set) -->
                <button
                  v-if="exercise.sets.length > 1"
                  type="button"
                  @click="removeSet(exIdx, setIdx)"
                  class="w-5 h-5 rounded text-ink-faint hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center text-[10px] font-bold"
                  title="ลบเซ็ตนี้"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Add Exercise on the Fly Action Button -->
        <div class="pt-1">
          <button
            type="button"
            @click="isPickerOpen = true"
            class="w-full py-3 px-4 bg-surface hover:bg-paper-subtle text-ink font-heading font-bold text-xs sm:text-sm rounded-2xl border-2 border-plate shadow-[2.5px_2.5px_0px_#1e2220] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all flex items-center justify-center gap-2 touch-manipulation"
          >
            <svg class="w-4 h-4 stroke-current fill-none stroke-2 text-flame" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>+ เพิ่มท่าเล่นระหว่างออกกำลัง (Add Exercise)</span>
          </button>
        </div>
      </div>
    </main>

    <!-- Docked Rest Timer & Bottom Controller Bar -->
    <div class="fixed bottom-0 left-0 right-0 z-30 bg-paper/95 backdrop-blur-md border-t-2 border-plate shadow-[0_-4px_20px_rgba(30,34,32,0.15)] flex-shrink-0">
      <RestTimer />
    </div>

    <!-- Embedded Exercise Library Picker Modal -->
    <ExerciseLibraryModal
      :is-open="isPickerOpen"
      mode="picker"
      @close="isPickerOpen = false"
      @select="handleExerciseSelected"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useActiveSessionStore } from '../composables/useActiveSessionStore.js';
import { useExerciseStore } from '../composables/useExerciseStore.js';
import { usePinKeypad } from '../composables/usePinKeypad.js';
import { useWeightAdvisor } from '../composables/useWeightAdvisor.js';
import { getYoutubeId } from '../utils/youtube.js';
import RestTimer from './RestTimer.vue';
import ExerciseLibraryModal from './ExerciseLibraryModal.vue';

const emit = defineEmits(['finish', 'discard', 'minimize']);

const {
  isWorkoutActive,
  activeSession,
  sessionDurationSec,
  sessionHistory,
  addExerciseToActiveSession,
  removeExerciseFromActiveSession,
  addSet,
  removeSet,
  updateSetMetric,
  toggleSetComplete,
  finishSession,
  discardSession,
  calculateTotalWorkingVolume
} = useActiveSessionStore();

const { openKeypad } = usePinKeypad();
const { getExerciseOverallAdvice } = useWeightAdvisor();
const { getExerciseById } = useExerciseStore();

const isPickerOpen = ref(false);
const activeVideos = ref({});
const activeVideoSources = ref({});

function getExerciseVideoInfo(exerciseId) {
  const meta = getExerciseById(exerciseId);
  if (!meta) return { videoUrl: null, localVideo: null, localVideoTitle: null, videoId: null };
  const videoId = getYoutubeId(meta.videoUrl);
  return {
    videoUrl: meta.videoUrl,
    localVideo: meta.localVideo,
    localVideoTitle: meta.localVideoTitle,
    videoId
  };
}

function toggleExerciseVideo(exIdx) {
  activeVideos.value[exIdx] = !activeVideos.value[exIdx];
}

// Format Stopwatch Elapsed Time (MM:SS or HH:MM:SS)
const formattedStopwatch = computed(() => {
  const total = sessionDurationSec.value || 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

// Live Working Volume
const liveVolumeKg = computed(() => {
  if (!activeSession.value || !activeSession.value.exercises) return 0;
  return calculateTotalWorkingVolume(activeSession.value.exercises);
});

// Total Sets & Completed Sets
const totalSetsTotal = computed(() => {
  if (!activeSession.value || !Array.isArray(activeSession.value.exercises)) return 0;
  return activeSession.value.exercises.reduce((acc, ex) => acc + (ex.sets ? ex.sets.length : 0), 0);
});

const completedSetsTotal = computed(() => {
  if (!activeSession.value || !Array.isArray(activeSession.value.exercises)) return 0;
  let count = 0;
  activeSession.value.exercises.forEach(ex => {
    (ex.sets || []).forEach(s => {
      if (s && s.completed) count++;
    });
  });
  return count;
});

const sessionProgressPercent = computed(() => {
  if (totalSetsTotal.value === 0) return 0;
  return Math.round((completedSetsTotal.value / totalSetsTotal.value) * 100);
});

// Overload advice cache for exercises
function getOverloadAdvice(exerciseId) {
  if (!exerciseId || !Array.isArray(sessionHistory.value)) return null;
  for (const session of sessionHistory.value) {
    if (!session || !Array.isArray(session.exercises)) continue;
    const match = session.exercises.find(e => e.exerciseId === exerciseId);
    if (match && Array.isArray(match.sets) && match.sets.length > 0) {
      return getExerciseOverallAdvice(match.sets);
    }
  }
  return null;
}

// Previous session performance text for a specific exercise and set
function getPreviousPerformanceText(exerciseId, setIdx) {
  if (!exerciseId || !Array.isArray(sessionHistory.value)) return '—';
  for (const session of sessionHistory.value) {
    if (!session || !Array.isArray(session.exercises)) continue;
    const match = session.exercises.find(e => e.exerciseId === exerciseId);
    if (match && Array.isArray(match.sets) && match.sets[setIdx]) {
      const prevSet = match.sets[setIdx];
      const w = prevSet.weight !== undefined ? prevSet.weight : prevSet.targetWeight;
      const r = prevSet.reps !== undefined ? prevSet.reps : prevSet.targetReps;
      if (w !== undefined && r !== undefined) {
        return `${w}kg × ${r}`;
      }
    }
  }
  return '—';
}

function getPrevWeightOnly(exerciseId, setIdx) {
  if (!exerciseId || !Array.isArray(sessionHistory.value)) return '';
  for (const session of sessionHistory.value) {
    if (!session || !Array.isArray(session.exercises)) continue;
    const match = session.exercises.find(e => e.exerciseId === exerciseId);
    if (match && Array.isArray(match.sets) && match.sets[setIdx]) {
      const prevSet = match.sets[setIdx];
      return prevSet.weight !== undefined ? prevSet.weight : prevSet.targetWeight;
    }
  }
  return '';
}

// Cycle Set Type: warmup -> working -> dropset -> failure -> warmup
function cycleSetType(exIdx, setIdx) {
  const rawType = activeSession.value?.exercises?.[exIdx]?.sets?.[setIdx]?.type || 'working';
  const current = rawType === 'warm' ? 'warmup' : rawType;
  const order = ['warmup', 'working', 'dropset', 'failure'];
  const nextIdx = (order.indexOf(current) + 1) % order.length;
  updateSetMetric(exIdx, setIdx, 'type', order[nextIdx]);
}

function getSetTypeShort(type) {
  switch (type) {
    case 'warm':
    case 'warmup':
      return 'W';
    case 'dropset':
      return 'D';
    case 'failure':
      return 'F';
    case 'working':
    default:
      return 'R';
  }
}

function getSetTypeBadgeClass(type) {
  switch (type) {
    case 'warm':
    case 'warmup':
      return 'bg-gold-bg text-gold border-gold';
    case 'dropset':
      return 'bg-sky-bg text-sky border-sky';
    case 'failure':
      return 'bg-rose-50 text-rose-600 border-rose-400';
    case 'working':
    default:
      return 'bg-flame-bg text-flame border-flame';
  }
}

// Keypad Numeric Tap Targets
function openWeightKeypad(exercise, exIdx, set, setIdx) {
  const isWarm = set.type === 'warm' || set.type === 'warmup';
  const advice = getOverloadAdvice(exercise.exerciseId);
  const prevW = getPrevWeightOnly(exercise.exerciseId, setIdx);
  const currentVal = set.weight !== undefined && set.weight !== null ? set.weight : (set.targetWeight ?? 0);

  const suggestedWeightVal = isWarm && advice?.warmAdvice?.suggestedWeight !== undefined
    ? advice.warmAdvice.suggestedWeight
    : (advice?.suggestedWeight !== undefined ? advice.suggestedWeight : (set.suggestedWeight !== undefined ? set.suggestedWeight : ''));

  const suggestedLabelVal = isWarm && advice?.warmAdvice?.actionLabel
    ? `แนะนำ: ${advice.warmAdvice.actionLabel}`
    : (advice?.actionLabel ? `แนะนำ: ${advice.actionLabel}` : '');

  openKeypad({
    title: exercise.name,
    subtitle: `เซ็ตที่ ${setIdx + 1} (${isWarm ? 'วอร์ม' : 'เล่นจริง'}) - ใส่น้ำหนัก (กก.)`,
    mode: 'weight',
    unit: 'กก.',
    currentValue: currentVal,
    prevHint: prevW !== '' ? String(prevW) : '',
    suggestedHint: suggestedWeightVal !== '' ? String(suggestedWeightVal) : '',
    suggestedLabel: suggestedLabelVal,
    presets: [1.25, 2.5, 5, -2.5],
    onConfirm: (val) => {
      const num = parseFloat(val);
      updateSetMetric(exIdx, setIdx, 'weight', isNaN(num) ? 0 : num);
    }
  });
}

function openRepsKeypad(exercise, exIdx, set, setIdx) {
  const isWarm = set.type === 'warm' || set.type === 'warmup';
  const currentVal = set.reps !== undefined && set.reps !== null ? set.reps : (set.targetReps ?? 8);
  const targetVal = String(set.targetReps || (isWarm ? 15 : 8));

  openKeypad({
    title: exercise.name,
    subtitle: `เซ็ตที่ ${setIdx + 1} (${isWarm ? 'วอร์ม' : 'เล่นจริง'}) - ใส่จำนวนครั้ง`,
    mode: 'reps',
    unit: 'ครั้ง',
    currentValue: currentVal,
    targetHint: targetVal,
    presets: [1, 2, -1],
    onConfirm: (val) => {
      const num = parseInt(val, 10);
      updateSetMetric(exIdx, setIdx, 'reps', isNaN(num) ? 0 : num);
    }
  });
}

// Checkmark Completion Toggle
function handleToggleSet(exIdx, setIdx) {
  toggleSetComplete(exIdx, setIdx);
}

// Add Exercise From Picker
function handleExerciseSelected(exercise) {
  if (!exercise || !exercise.id) return;
  addExerciseToActiveSession(exercise.id);
  isPickerOpen.value = false;
}

// Remove Exercise
function handleRemoveExercise(exIdx, name) {
  if (confirm(`คุณต้องการลบท่า "${name}" ออกจากรอบนี้หรือไม่?`)) {
    removeExerciseFromActiveSession(exIdx);
  }
}

// Discard Session with Confirmation
function handleDiscard() {
  const confirmed = confirm('คุณต้องการยกเลิกการออกกำลังกายนี้ใช่หรือไม่? ข้อมูลของรอบนี้จะไม่ถูกบันทึก');
  if (confirmed) {
    discardSession();
    emit('discard');
  }
}

// Finish Session
function handleFinish() {
  const summary = finishSession();
  if (summary) {
    emit('finish', summary);
  }
}

// Helpers
function formatNumber(num) {
  if (typeof num !== 'number') return '0';
  return num.toLocaleString('en-US');
}

function formatWeight(w) {
  if (w === undefined || w === null) return '0';
  return String(w);
}

// Thai muscle labels and badge classes
const muscleLabels = {
  chest: 'อก',
  back: 'หลัง',
  quads: 'ขาหน้า',
  hamstrings: 'ขาหลัง',
  delts: 'ไหล่',
  arms: 'แขน',
  abs: 'หน้าท้อง',
  cardio: 'คาร์ดิโอ',
  other: 'อื่นๆ'
};

function getMuscleLabel(group) {
  return muscleLabels[group] || group || 'ทั่วไป';
}

function getMuscleBadgeClass(group) {
  switch (group) {
    case 'chest':
      return 'bg-flame-bg text-flame border-flame';
    case 'back':
      return 'bg-sky-bg text-sky border-sky';
    case 'quads':
    case 'hamstrings':
      return 'bg-emerald-bg text-emerald border-emerald';
    case 'delts':
      return 'bg-gold-bg text-gold border-gold';
    case 'arms':
      return 'bg-purple-50 text-purple-700 border-purple-400';
    case 'abs':
      return 'bg-rose-50 text-rose-700 border-rose-400';
    case 'cardio':
      return 'bg-cyan-50 text-cyan-700 border-cyan-400';
    default:
      return 'bg-surface-card text-ink-muted border-plate/30';
  }
}
</script>
