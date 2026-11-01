<template>
  <div
    class="archive-card mb-4 overflow-hidden border-2 border-plate shadow-[3px_3px_0px_#ea580c]"
    :class="isAllCompleted ? 'bg-emerald-bg/30 border-emerald shadow-[3px_3px_0px_#059669]' : ''"
  >
    <!-- Top Line -->
    <div
      class="h-1.5 border-b-2 border-plate"
      :class="isAllCompleted ? 'bg-emerald' : 'bg-flame'"
    ></div>

    <!-- Card Header -->
    <div class="p-4 bg-flame-bg/40 border-b-2 border-plate">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-3">
          <span class="font-mono text-sm font-bold text-flame mt-0.5 select-none bg-white px-1.5 py-0.5 rounded border border-flame/40">
            +{{ index + 1 }}
          </span>
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full tracking-wide uppercase bg-flame-bg text-flame border border-flame">
                TOUCH-UP: {{ bonus.part }}
              </span>
            </div>
            <h3 class="text-base font-bold text-ink font-heading tracking-tight leading-snug">
              {{ bonus.name }}
            </h3>
            <p class="text-xs text-ink-muted mt-0.5 font-body">
              {{ bonus.altName }}
            </p>
          </div>
        </div>

        <!-- Inline Video Toggle Button -->
        <button
          v-if="videoId"
          type="button"
          @click="toggleVideo"
          class="flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1.5 rounded-lg border-2 border-plate shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all whitespace-nowrap"
          :class="isPlayingVideo
            ? 'bg-flame text-white'
            : 'bg-white hover:bg-paper-subtle text-ink'"
          :title="isPlayingVideo ? 'ซ่อนคลิป' : 'เปิดดูคลิปในหน้านี้'"
        >
          <svg v-if="!isPlayingVideo" class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          <svg v-else class="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <span>{{ isPlayingVideo ? 'ปิดคลิป' : 'ดูคลิป' }}</span>
        </button>
      </div>

      <div class="mt-2.5 text-xs text-ink bg-white p-2.5 rounded-lg border border-plate/20 shadow-sm font-body">
        <strong class="text-flame">คำแนะนำ:</strong> {{ bonus.tip }}
      </div>

      <!-- Last Record Hint -->
      <div class="mt-2.5 flex items-center gap-2 text-[11px] font-mono bg-white px-3 py-1.5 rounded-lg border border-plate/20 text-ink">
        <span class="text-ink-muted font-bold uppercase tracking-wider text-[10px]">สถิติล่าสุด:</span>
        <span>วอร์ม <strong class="tabular-nums font-bold text-flame">{{ prevWarm }}</strong> กก.</span>
        <span class="text-plate/30">|</span>
        <span>เล่นเสริม <strong class="tabular-nums font-bold text-flame">{{ prevTouch }}</strong> กก.</span>
      </div>
    </div>

    <!-- Visual Demonstration / Inline Video Player -->
    <div v-if="showExerciseImages && videoId" class="p-3 bg-paper-subtle/50 border-b-2 border-plate">
      <!-- 1. Inline Video Player -->
      <div v-if="isPlayingVideo" class="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-plate shadow-[3px_3px_0px_#1e2220] bg-black">
        <iframe
          :src="embedUrl"
          class="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
        <button
          @click="isPlayingVideo = false"
          class="absolute top-2 right-2 bg-plate/80 hover:bg-plate text-white font-mono text-[11px] font-bold px-2.5 py-1 rounded-md border border-white/30 backdrop-blur-sm shadow-md transition-all flex items-center gap-1 select-none"
        >
          <span>✕ ปิดคลิป</span>
        </button>
      </div>

      <!-- 2. Preview Thumbnail Image with Quick Play Trigger -->
      <div
        v-else
        @click="isPlayingVideo = true"
        class="relative w-full aspect-[21/9] sm:aspect-video rounded-xl overflow-hidden border-2 border-plate shadow-[3px_3px_0px_#1e2220] group cursor-pointer bg-plate"
        title="แตะเพื่อเล่นคลิปตัวอย่างในหน้านี้ทันที"
      >
        <img
          :src="thumbnailUrl"
          :alt="bonus.name"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
          loading="lazy"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-plate/85 via-plate/25 to-transparent flex items-end justify-between p-3 select-none">
          <div class="flex items-center gap-1.5 text-[11px] font-mono text-white font-bold bg-plate/70 px-2.5 py-1 rounded-lg backdrop-blur-sm border border-white/20">
            <svg class="w-3.5 h-3.5 fill-flame" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span>แตะดูคลิปสาธิตในแอป</span>
          </div>
          <div class="w-9 h-9 rounded-full bg-flame text-white border-2 border-plate flex items-center justify-center shadow-[2px_2px_0px_#1e2220] group-hover:scale-110 transition-transform">
            <svg class="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Sets List -->
    <div class="divide-y-2 divide-plate/10 bg-white">
      <div
        v-for="(set, sIdx) in bonus.sets"
        :key="sIdx"
        class="px-4 py-2.5 flex items-center justify-between gap-3 transition-colors"
        :class="isSetDone(sIdx) ? 'bg-emerald-bg/50' : 'hover:bg-surface-low/40'"
      >
        <div class="flex items-center gap-2.5 min-w-[70px]">
          <span
            class="text-[11px] font-mono font-bold px-2 py-0.5 rounded tracking-wider uppercase border"
            :class="set.type === 'warm'
              ? 'bg-sky-bg text-sky border-sky/40'
              : 'bg-flame-bg text-flame border-flame/40'"
          >
            {{ set.type === 'warm' ? 'W1' : 'T1' }}
          </span>
          <span class="text-xs text-ink-muted hidden sm:inline">{{ set.reps }}</span>
        </div>

        <span class="text-xs text-ink-muted sm:hidden flex-1">{{ set.reps }}</span>

        <!-- Weight Input -->
        <div class="flex items-center gap-1.5">
          <div class="relative w-24">
            <input
              type="number"
              step="0.5"
              inputmode="decimal"
              pattern="[0-9]*"
              :value="getWeight(sIdx)"
              @input="onWeightChange(sIdx, $event.target.value)"
              :placeholder="`${getPrevWeight(sIdx)}`"
              class="w-full bg-surface-low border-2 border-plate focus:border-flame focus:bg-white rounded-lg px-2.5 py-1.5 text-center font-mono tabular-nums text-sm font-bold text-ink outline-none transition-colors shadow-inner"
            />
            <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-ink-muted pointer-events-none">
              กก.
            </span>
          </div>
        </div>

        <!-- Complete Button -->
        <button
          type="button"
          @click="onToggle(sIdx)"
          class="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base transition-all select-none border-2 border-plate"
          :class="isSetDone(sIdx)
            ? 'bg-emerald text-white shadow-[2px_2px_0px_#059669]'
            : 'bg-surface hover:bg-paper-subtle text-ink-muted shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'"
        >
          <svg v-if="isSetDone(sIdx)" class="w-5 h-5 fill-current" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          <span v-else class="text-xs font-mono opacity-50 font-bold">✓</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useWorkoutStore } from '../composables/useWorkoutStore';
import { useTimer } from '../composables/useTimer';
import { getYoutubeId } from '../utils/youtube';

const props = defineProps({
  bonus: { type: Object, required: true },
  index: { type: Number, required: true }
});

const isPlayingVideo = ref(false);

const {
  currentDay,
  userState,
  lastWeights,
  updateWeight,
  toggleSetDone,
  showExerciseImages
} = useWorkoutStore();

const { startTimer, triggerHaptic } = useTimer();

const videoId = computed(() => getYoutubeId(props.bonus.videoUrl));
const thumbnailUrl = computed(() => videoId.value ? `https://img.youtube.com/vi/${videoId.value}/hqdefault.jpg` : null);
const embedUrl = computed(() => videoId.value ? `https://www.youtube-nocookie.com/embed/${videoId.value}?autoplay=1&rel=0` : null);

function toggleVideo() {
  isPlayingVideo.value = !isPlayingVideo.value;
}

const exState = computed(() => (userState[currentDay.value] && userState[currentDay.value][props.bonus.id]) || {});
const exLast = computed(() => lastWeights[props.bonus.id] || {});

const prevWarm = computed(() => (exLast.value.wt_0 !== undefined && exLast.value.wt_0 !== '') ? exLast.value.wt_0 : 0);
const prevTouch = computed(() => (exLast.value.wt_1 !== undefined && exLast.value.wt_1 !== '') ? exLast.value.wt_1 : 0);

function getPrevWeight(sIdx) {
  return (exLast.value[`wt_${sIdx}`] !== undefined && exLast.value[`wt_${sIdx}`] !== '')
    ? exLast.value[`wt_${sIdx}`]
    : 0;
}

function getWeight(sIdx) {
  return exState.value[`wt_${sIdx}`] !== undefined ? exState.value[`wt_${sIdx}`] : '';
}

function isSetDone(sIdx) {
  return !!exState.value[`set_${sIdx}`];
}

const isAllCompleted = computed(() => {
  if (!props.bonus.sets || props.bonus.sets.length === 0) return false;
  return props.bonus.sets.every((_, idx) => isSetDone(idx));
});

function onWeightChange(sIdx, val) {
  updateWeight(currentDay.value, props.bonus.id, sIdx, val);
}

function onToggle(sIdx) {
  const isNowChecked = toggleSetDone(currentDay.value, props.bonus.id, sIdx);
  if (isNowChecked) {
    triggerHaptic([35]);
    startTimer();
  }
}
</script>
