<template>
  <div
    role="button"
    tabindex="0"
    aria-label="กลับสู่รอบฝึกที่กำลังเล่นอยู่ (Active Workout)"
    :title="`กำลังฝึก: ${displayTitle} · แตะเพื่อเปิดแผ่นบันทึกรอบฝึก`"
    @click="$emit('restore')"
    @keydown.enter="$emit('restore')"
    @keydown.space.prevent="$emit('restore')"
    class="active-workout-mini-bar w-full bg-paper/95 backdrop-blur-md border-b-2 border-plate cursor-pointer select-none transition-all touch-manipulation hover:bg-paper-subtle active:bg-paper-dim group shadow-xs"
  >
    <!-- Progress line at top edge of mini-bar -->
    <div class="w-full h-1 bg-plate/15 overflow-hidden">
      <div
        class="h-full bg-emerald transition-all duration-300"
        :style="{ width: `${progressPercent}%` }"
      ></div>
    </div>

    <div class="max-w-3xl mx-auto px-2.5 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-3 min-h-[44px]">
      <!-- Left side: Live Pulse + Routine Title + Elapsed Time -->
      <div class="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-bg border border-emerald text-emerald-text font-mono font-extrabold text-[11px] tracking-wide uppercase flex-shrink-0">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald animate-ping inline-block"></span>
          LIVE
        </span>
        <div class="min-w-0 flex-1">
          <p class="font-heading font-extrabold text-xs sm:text-sm text-ink truncate leading-tight">
            {{ displayTitle }}
          </p>
          <div class="flex items-center gap-2 text-[11px] font-mono text-ink-muted leading-tight mt-0.5">
            <span class="tabular-nums flex items-center gap-1 font-bold text-ink">
              <span>⏱</span>
              <span>{{ formattedTime }}</span>
            </span>
            <span class="opacity-40">•</span>
            <span class="tabular-nums">
              <strong class="text-flame-text font-extrabold">{{ completedSets }}</strong>/{{ totalSets }} เซ็ต
            </span>
          </div>
        </div>
      </div>

      <!-- Right side: Expand / Return Action Button -->
      <div class="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          @click.stop="$emit('restore')"
          class="btn-restore-runner min-h-[44px] min-w-[44px] px-2.5 sm:px-3 py-1.5 rounded-xl border-2 border-plate bg-flame hover:bg-flame-glow text-white font-heading font-bold text-xs flex items-center justify-center gap-1 shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none transition-all touch-manipulation group-hover:scale-[1.02]"
          title="กลับสู่รอบฝึก (Active Workout)"
          aria-label="เปิดหน้ารอบฝึกต่อ"
        >
          <span>เปิดต่อ</span>
          <svg class="w-3.5 h-3.5 stroke-current fill-none stroke-[2.5]" viewBox="0 0 24 24">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  session: {
    type: Object,
    default: () => ({})
  },
  durationSec: {
    type: Number,
    default: 0
  }
});

defineEmits(['restore']);

const displayTitle = computed(() => {
  return props.session?.title || props.session?.dayTitle || 'Active Workout';
});

const totalSets = computed(() => {
  if (!props.session || !Array.isArray(props.session.exercises)) return 0;
  return props.session.exercises.reduce((acc, ex) => {
    return acc + (Array.isArray(ex.sets) ? ex.sets.length : 0);
  }, 0);
});

const completedSets = computed(() => {
  if (!props.session || !Array.isArray(props.session.exercises)) return 0;
  let count = 0;
  for (const ex of props.session.exercises) {
    if (Array.isArray(ex.sets)) {
      for (const set of ex.sets) {
        if (set && set.completed) count++;
      }
    }
  }
  return count;
});

const progressPercent = computed(() => {
  if (totalSets.value === 0) return 0;
  return Math.round((completedSets.value / totalSets.value) * 100);
});

const formattedTime = computed(() => {
  const s = Math.max(0, Math.floor(props.durationSec || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
});
</script>
