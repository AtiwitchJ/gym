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
      <div class="mt-2.5 flex items-center justify-between gap-2 text-[11px] font-mono bg-white px-3 py-1.5 rounded-lg border border-plate/20 text-ink flex-wrap">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-ink-muted font-bold uppercase tracking-wider text-[10px]">สถิติล่าสุด:</span>
          <span>วอร์ม <strong class="tabular-nums font-bold text-flame">{{ prevWarm }}</strong> กก.<template v-if="prevWarmReps !== null"> (<strong class="tabular-nums font-bold text-sky">{{ prevWarmReps }}</strong> ครั้ง)</template></span>
          <span class="text-plate/30">|</span>
          <span>เล่นเสริม <strong class="tabular-nums font-bold text-flame">{{ prevTouch }}</strong> กก.<template v-if="prevTouchReps !== null"> (<strong class="tabular-nums font-bold text-sky">{{ prevTouchReps }}</strong> ครั้ง)</template></span>
        </div>
        <button
          v-if="hasAnyPrev"
          type="button"
          @click="applyAllPrev"
          class="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-flame-bg text-flame hover:bg-flame hover:text-white border border-flame/30 transition-all select-none shadow-[1px_1px_0px_#1e2220] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
          title="ดึงสถิติล่าสุดทั้งน้ำหนักและจำนวนครั้งมาใส่ทุกเซ็ต"
        >
          ใช้สถิติเดิมทั้งหมด
        </button>
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
        class="px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3 transition-colors"
        :class="isSetDone(sIdx) ? 'bg-emerald-bg/50' : 'hover:bg-surface-low/40'"
      >
        <!-- Set Indicator & Target Reps -->
        <div class="flex items-center gap-2 min-w-[70px] sm:min-w-[85px] flex-shrink-0">
          <span
            class="text-[11px] font-mono font-bold px-2 py-0.5 rounded tracking-wider uppercase border select-none"
            :class="set.type === 'warm'
              ? 'bg-sky-bg text-sky border-sky/40'
              : 'bg-flame-bg text-flame border-flame/40'"
          >
            {{ set.type === 'warm' ? 'W1' : 'T1' }}
          </span>
          <span class="text-[11px] font-mono text-ink-muted select-none">
            {{ set.reps.replace(' ครั้ง', '') }}
          </span>
        </div>

        <!-- Interactive PIN Trigger Buttons (No OS Keyboard) -->
        <div class="flex items-center gap-1.5 sm:gap-2 flex-1 justify-end max-w-xs">
          <!-- 1. Weight Button -->
          <button
            type="button"
            @click="openWeightKeypad(sIdx)"
            class="h-9 px-2.5 rounded-lg border-2 border-plate flex items-center justify-center gap-1 font-mono text-xs font-bold transition-all select-none min-w-[76px] sm:min-w-[84px]"
            :class="getWeight(sIdx) !== ''
              ? 'bg-white text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
              : 'bg-surface-low text-ink-muted/80 border-dashed hover:border-solid hover:bg-white'"
            title="แตะเพื่อระบุน้ำหนักด้วยแป้น PIN"
          >
            <span class="tabular-nums font-extrabold text-sm" :class="getWeight(sIdx) !== '' ? 'text-ink' : 'text-ink-muted/60'">
              {{ getWeight(sIdx) !== '' ? getWeight(sIdx) : (getPrevWeight(sIdx) || '0') }}
            </span>
            <span class="text-[10px] text-flame font-bold">กก.</span>
          </button>

          <!-- 2. Reps Button -->
          <button
            type="button"
            @click="openRepsKeypad(sIdx, set.reps)"
            class="h-9 px-2 sm:px-2.5 rounded-lg border-2 border-plate flex items-center justify-center gap-1 font-mono text-xs font-bold transition-all select-none min-w-[68px] sm:min-w-[74px]"
            :class="getReps(sIdx) !== ''
              ? 'bg-white text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
              : 'bg-surface-low text-ink-muted/80 border-dashed hover:border-solid hover:bg-white'"
            title="แตะเพื่อระบุจำนวนครั้งจริงด้วยแป้น PIN"
          >
            <span class="tabular-nums font-extrabold text-sm" :class="getReps(sIdx) !== '' ? 'text-ink' : 'text-ink-muted/60'">
              {{ getReps(sIdx) !== '' ? getReps(sIdx) : (getPrevReps(sIdx) || targetRepNumber(set.reps) || '—') }}
            </span>
            <span class="text-[10px] text-sky font-bold">ครั้ง</span>
          </button>

          <!-- 3. Quick Copy Set Record (Desktop/Tablet) -->
          <button
            v-if="hasPrevRecord(sIdx)"
            type="button"
            @click="applyPrevRecordForSet(sIdx)"
            class="hidden md:inline-flex text-[10px] font-mono font-bold px-1.5 py-1 rounded border border-plate/30 bg-paper-subtle hover:bg-flame-bg hover:text-flame text-ink-muted transition-all select-none whitespace-nowrap"
            :title="`ดึงสถิติเดิม: ${getPrevWeight(sIdx)} กก. (${getPrevReps(sIdx) || '—'} ครั้ง)`"
          >
            เดิม
          </button>

          <!-- 4. Complete Checkbox Button -->
          <button
            type="button"
            @click="onToggle(sIdx)"
            class="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-bold text-base transition-all select-none border-2 border-plate flex-shrink-0"
            :class="isSetDone(sIdx)
              ? 'bg-emerald text-white shadow-[2px_2px_0px_#059669]'
              : 'bg-surface hover:bg-paper-subtle text-ink-muted shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'"
            title="ทำเซ็ตนี้สำเร็จ"
          >
            <svg v-if="isSetDone(sIdx)" class="w-5 h-5 fill-current" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            <span v-else class="text-xs font-mono opacity-50 font-bold">✓</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useWorkoutStore } from '../composables/useWorkoutStore';
import { usePinKeypad } from '../composables/usePinKeypad';
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
  updateReps,
  applyPrevRecord,
  toggleSetDone,
  showExerciseImages
} = useWorkoutStore();

const { openKeypad } = usePinKeypad();
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
const prevWarmReps = computed(() => (exLast.value.reps_0 !== undefined && exLast.value.reps_0 !== '') ? exLast.value.reps_0 : null);
const prevTouchReps = computed(() => (exLast.value.reps_1 !== undefined && exLast.value.reps_1 !== '') ? exLast.value.reps_1 : null);

const hasAnyPrev = computed(() => {
  return prevWarm.value > 0 || prevTouch.value > 0 || prevWarmReps.value !== null || prevTouchReps.value !== null;
});

function getPrevWeight(sIdx) {
  return (exLast.value[`wt_${sIdx}`] !== undefined && exLast.value[`wt_${sIdx}`] !== '')
    ? exLast.value[`wt_${sIdx}`]
    : 0;
}

function getPrevReps(sIdx) {
  return (exLast.value[`reps_${sIdx}`] !== undefined && exLast.value[`reps_${sIdx}`] !== '')
    ? exLast.value[`reps_${sIdx}`]
    : '';
}

function getWeight(sIdx) {
  return exState.value[`wt_${sIdx}`] !== undefined ? exState.value[`wt_${sIdx}`] : '';
}

function getReps(sIdx) {
  return exState.value[`reps_${sIdx}`] !== undefined ? exState.value[`reps_${sIdx}`] : '';
}

function targetRepNumber(repStr) {
  if (!repStr) return '';
  const match = String(repStr).match(/\d+/);
  return match ? match[0] : '';
}

function hasPrevRecord(sIdx) {
  const pw = exLast.value[`wt_${sIdx}`];
  const pr = exLast.value[`reps_${sIdx}`];
  return (pw !== undefined && pw !== '') || (pr !== undefined && pr !== '');
}

function applyPrevRecordForSet(sIdx) {
  const pw = getPrevWeight(sIdx);
  const pr = getPrevReps(sIdx);
  applyPrevRecord(currentDay.value, props.bonus.id, sIdx, pw, pr);
}

function applyAllPrev() {
  props.bonus.sets.forEach((_, sIdx) => {
    const pw = getPrevWeight(sIdx);
    const pr = getPrevReps(sIdx);
    if ((pw !== undefined && pw !== '') || (pr !== undefined && pr !== '')) {
      applyPrevRecord(currentDay.value, props.bonus.id, sIdx, pw, pr);
    }
  });
}

function openWeightKeypad(sIdx) {
  const currentVal = getWeight(sIdx);
  const prevVal = getPrevWeight(sIdx);
  openKeypad({
    mode: 'weight',
    unit: 'กก.',
    title: props.bonus.name,
    subtitle: `เซ็ต ${sIdx === 0 ? 'วอร์ม (W1)' : `เล่นเสริม (T1)`} • น้ำหนักยก`,
    currentValue: currentVal !== '' ? currentVal : (prevVal || ''),
    prevHint: prevVal ? `${prevVal}` : '',
    presets: [1.25, 2.5, 5, -2.5],
    onConfirm: (val) => {
      updateWeight(currentDay.value, props.bonus.id, sIdx, val);
    }
  });
}

function openRepsKeypad(sIdx, targetStr) {
  const currentVal = getReps(sIdx);
  const prevVal = getPrevReps(sIdx);
  const targetNum = targetRepNumber(targetStr);
  openKeypad({
    mode: 'reps',
    unit: 'ครั้ง',
    title: props.bonus.name,
    subtitle: `เซ็ต ${sIdx === 0 ? 'วอร์ม (W1)' : `เล่นเสริม (T1)`} • จำนวนครั้งที่ยกจริง`,
    currentValue: currentVal !== '' ? currentVal : (prevVal || targetNum || ''),
    targetHint: targetNum ? `${targetNum}` : '',
    prevHint: prevVal ? `${prevVal}` : '',
    presets: [1, 2, -1],
    onConfirm: (val) => {
      updateReps(currentDay.value, props.bonus.id, sIdx, val);
    }
  });
}

function isSetDone(sIdx) {
  return !!exState.value[`set_${sIdx}`];
}

const isAllCompleted = computed(() => {
  if (!props.bonus.sets || props.bonus.sets.length === 0) return false;
  return props.bonus.sets.every((_, idx) => isSetDone(idx));
});

function onToggle(sIdx) {
  const isNowChecked = toggleSetDone(currentDay.value, props.bonus.id, sIdx);
  if (isNowChecked) {
    triggerHaptic([35]);
    startTimer();
  }
}
</script>
