<template>
  <nav
    ref="navContainer"
    class="w-full bg-paper/95 backdrop-blur-md border-t-2 border-plate shadow-[0_-4px_20px_rgba(30,34,32,0.12)] px-2 sm:px-4 py-1.5 pb-[max(8px,env(safe-area-inset-bottom))] overflow-x-auto scrollbar-none select-none"
  >
    <!-- 3-Day A/B Program Quick Switcher Toggle -->
    <div class="max-w-3xl mx-auto flex items-center justify-between gap-2 px-1 pb-1.5 border-b border-plate/10 text-xs">
      <div class="flex items-center gap-1.5">
        <span class="text-[10px] font-mono font-bold text-flame uppercase tracking-wider">
          3-Day A/B Split:
        </span>
        <span class="text-[10px] font-body text-ink-muted hidden sm:inline">
          (สลับ A-B-A / B-A-B)
        </span>
      </div>

      <!-- Program A / B Toggle Pills -->
      <div class="inline-flex rounded-lg p-0.5 bg-surface border-2 border-plate shadow-[1px_1px_0px_#1e2220]">
        <button
          type="button"
          @click="selectProgram('prog_a')"
          class="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-heading font-bold transition-all touch-manipulation"
          :class="(activeTabId === 'prog_a' || activeProgram === 'prog_a')
            ? 'bg-flame text-white shadow-sm'
            : 'text-ink-muted hover:text-ink'"
          title="Program A: อก + หลัง + ท้อง (6 ท่า)"
        >
          <span>⚡ Program A</span>
          <span class="text-[9px] font-mono opacity-80 hidden md:inline">(อก/หลัง/ท้อง)</span>
        </button>

        <button
          type="button"
          @click="selectProgram('prog_b')"
          class="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-heading font-bold transition-all touch-manipulation"
          :class="(activeTabId === 'prog_b' || activeProgram === 'prog_b')
            ? 'bg-flame text-white shadow-sm'
            : 'text-ink-muted hover:text-ink'"
          title="Program B: ขา + แขน + ไหล่/บ่า (7 ท่า)"
        >
          <span>⚡ Program B</span>
          <span class="text-[9px] font-mono opacity-80 hidden md:inline">(ขา/แขน/ไหล่)</span>
        </button>
      </div>
    </div>

    <!-- Main Tabs Row -->
    <div class="max-w-3xl mx-auto flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 min-w-max px-1 pt-1.5">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :data-tab-id="tab.id"
        type="button"
        @click="selectTab(tab.id)"
        class="flex flex-col items-center justify-center py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl transition-all relative font-heading border-2 touch-manipulation group flex-shrink-0"
        :class="activeTabId === tab.id
          ? tab.id === 'history'
            ? 'bg-emerald text-white border-plate shadow-[2px_2px_0px_#1e2220] -translate-y-0.5 font-bold'
            : tab.id === 'profile'
              ? 'bg-ink text-white border-plate shadow-[2px_2px_0px_#ea580c] -translate-y-0.5 font-bold'
              : 'bg-flame text-white border-plate shadow-[2px_2px_0px_#1e2220] -translate-y-0.5 font-bold'
          : 'bg-surface text-ink hover:text-ink border-plate/30 hover:border-plate shadow-[1px_1px_0px_#1e2220] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none'"
        :title="tab.label"
      >
        <!-- Active Workout Running Dot Indicator on Workouts Tab -->
        <span
          v-if="tab.id === 'workouts' && isWorkoutActive"
          class="absolute -top-1 right-2 w-2.5 h-2.5 rounded-full bg-emerald border-2 border-plate shadow-sm animate-pulse pointer-events-none"
        ></span>

        <!-- Tab Icon or Short Badge -->
        <div class="w-4 h-4 flex items-center justify-center mb-0.5 transition-transform group-active:scale-90">
          <!-- Mon: Legs / Program A -->
          <svg v-if="tab.id === 'mon'" class="w-3.5 h-3.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M4 4v7a4 4 0 0 0 4 4h0a4 4 0 0 0 4-4V4M12 4v7a4 4 0 0 0 4 4h0a4 4 0 0 0 4-4V4" />
          </svg>
          <!-- Tue: Chest -->
          <svg v-else-if="tab.id === 'tue'" class="w-3.5 h-3.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M6 5v14M18 5v14M2 12h20M9 8h6M9 16h6" />
          </svg>
          <!-- Wed: Back / Program B -->
          <svg v-else-if="tab.id === 'wed'" class="w-3.5 h-3.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M12 2v20M4 12h16M7 6l10 12M17 6L7 18" />
          </svg>
          <!-- Thu: Shoulders -->
          <svg v-else-if="tab.id === 'thu'" class="w-3.5 h-3.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
          <!-- Fri: Program A/B -->
          <svg v-else-if="tab.id === 'fri'" class="w-3.5 h-3.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <!-- Rest -->
          <svg v-else-if="tab.id === 'rest'" class="w-3.5 h-3.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <!-- Workouts -->
          <svg v-else-if="tab.id === 'workouts'" class="w-3.5 h-3.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M6 5v14M18 5v14M2 12h20M9 8h6M9 16h6" />
          </svg>
          <!-- Exercises -->
          <svg v-else-if="tab.id === 'exercises'" class="w-3.5 h-3.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <!-- History -->
          <svg v-else-if="tab.id === 'history'" class="w-3.5 h-3.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M3 3v18h18" />
            <path d="M18 9l-5 5-4-4-3 3" />
          </svg>
          <!-- Profile -->
          <svg v-else-if="tab.id === 'profile'" class="w-3.5 h-3.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>

        <!-- Tab Label -->
        <span class="text-[11px] sm:text-xs tracking-tight truncate leading-tight font-bold">
          {{ tab.label }}
        </span>
        <span class="text-[9px] opacity-80 tracking-normal font-body font-normal truncate mt-0.5">
          {{ tab.sub }}
        </span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useWorkoutStore } from '../composables/useWorkoutStore.js';
import { useActiveSessionStore } from '../composables/useActiveSessionStore.js';

const props = defineProps({
  currentTab: {
    type: String,
    default: undefined
  },
  modelValue: {
    type: String,
    default: undefined
  }
});

const emit = defineEmits(['update:currentTab', 'update:modelValue', 'switch-tab', 'change']);

const workoutStore = useWorkoutStore();
const { isWorkoutActive } = useActiveSessionStore();
const navContainer = ref(null);
const activeProgram = ref(workoutStore.currentProgram?.value || 'prog_a');

const tabs = [
  { id: 'mon', label: 'จันทร์', sub: 'Program A/B' },
  { id: 'tue', label: 'อังคาร', sub: 'อก + หลังแขน' },
  { id: 'wed', label: 'พุธ', sub: 'Program B/A' },
  { id: 'thu', label: 'พฤหัส', sub: 'ไหล่ + ท้อง' },
  { id: 'fri', label: 'ศุกร์', sub: 'Program A/B' },
  { id: 'rest', label: 'วันพัก', sub: 'ฟื้นฟู' },
  { id: 'exercises', label: 'ท่าฝึก', sub: '51 ท่า' },
  { id: 'history', label: 'ประวัติ', sub: 'Excel / DB' },
  { id: 'profile', label: 'บัญชี', sub: 'สถิติ / ตั้งค่า' },
  { id: 'workouts', label: 'โปรแกรม', sub: 'Routines' }
];

const activeTabId = computed(() => {
  return props.currentTab || props.modelValue || workoutStore.currentTab?.value || workoutStore.currentDay?.value || 'mon';
});

function scrollToActiveTab() {
  nextTick(() => {
    if (!navContainer.value) return;
    const activeBtn = navContainer.value.querySelector(`[data-tab-id="${activeTabId.value}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });
}

function selectTab(id) {
  if (['mon', 'tue', 'wed', 'thu', 'fri', 'prog_a', 'prog_b', 'rest', 'todo'].includes(id)) {
    if (workoutStore.switchDay) workoutStore.switchDay(id);
  }
  if (workoutStore.switchTab) {
    workoutStore.switchTab(id);
  }
  emit('update:currentTab', id);
  emit('update:modelValue', id);
  emit('switch-tab', id);
  emit('change', id);
}

function selectProgram(progId) {
  activeProgram.value = progId;
  if (workoutStore.switchProgram) workoutStore.switchProgram(progId);
  selectTab(progId);
}

watch(activeTabId, () => {
  scrollToActiveTab();
});

onMounted(() => {
  scrollToActiveTab();
});
</script>
