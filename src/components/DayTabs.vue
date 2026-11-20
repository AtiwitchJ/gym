<template>
  <nav
    class="w-full bg-paper/95 backdrop-blur-md border-t-2 border-plate shadow-[0_-4px_20px_rgba(30,34,32,0.12)] px-2 sm:px-4 py-1 pb-[max(4px,env(safe-area-inset-bottom))] select-none"
  >
    <!-- Four global tabs: วันนี้ · โปรแกรม · ประวัติ · บัญชี -->
    <div class="max-w-3xl mx-auto grid grid-cols-4 gap-1.5 sm:gap-2">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :data-tab-id="tab.id"
        type="button"
        @click="selectTab(tab.id)"
        class="flex flex-col items-center justify-center min-h-[44px] sm:min-h-[56px] py-1 sm:py-1.5 px-1 rounded-xl transition-all relative font-heading border-2 touch-manipulation"
        :class="activeTabId === tab.id
          ? 'bg-flame text-white border-plate shadow-[2px_2px_0px_#1e2220] -translate-y-0.5 font-bold'
          : 'bg-surface text-ink border-plate/30 hover:border-plate shadow-[1px_1px_0px_#1e2220]'"
        :title="tab.label"
      >
        <span
          v-if="tab.id === 'workouts' && isWorkoutActive"
          class="absolute -top-1 right-2 w-2.5 h-2.5 rounded-full bg-emerald border-2 border-plate animate-pulse pointer-events-none"
        ></span>
        <span class="text-[12px] sm:text-xs font-bold leading-tight">{{ tab.label }}</span>
        <!-- Sub-label: hidden on phones to keep the dock short (shows from 640 px) -->
        <span class="hidden sm:block text-[11px] opacity-80 font-body font-normal truncate max-w-full">{{ tabSub(tab) }}</span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useWorkoutStore } from '../composables/useWorkoutStore.js';
import { useActiveSessionStore } from '../composables/useActiveSessionStore.js';
import { isRestWeekday } from '../data/workouts.js';

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

const tabs = [
  { id: 'today', label: 'วันนี้' },
  { id: 'workouts', label: 'โปรแกรม', sub: 'Routines' },
  { id: 'history', label: 'ประวัติ', sub: 'Excel / DB' },
  { id: 'profile', label: 'บัญชี', sub: 'สถิติ / ตั้งค่า' }
];

// Old day keys (mon..fri, rest, prog_*) that are still stored or passed in must light up "วันนี้".
const TODAY_TAB_KEYS = ['today', 'mon', 'tue', 'wed', 'thu', 'fri', 'prog_a', 'prog_b', 'rest', 'todo'];

const activeTabId = computed(() => {
  const raw = props.currentTab || props.modelValue || workoutStore.currentTab?.value || 'today';
  if (raw === 'exercises') return 'workouts'; // library lives under โปรแกรม
  if (TODAY_TAB_KEYS.includes(raw)) return 'today';
  return raw;
});

// Subtitle: "วันนี้" shows the next program after the last completed session; others keep their text.
function tabSub(tab) {
  if (tab.id === 'today') {
    // One status: the same program name as the next-session card on the rest view (language item 2).
    return workoutStore.todayProgramKey?.value === 'prog_b' ? 'Program B' : 'Program A';
  }
  return tab.sub;
}

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
  if (id === 'today') {
    if (workoutStore.switchDay) workoutStore.switchDay('today');
  }
  if (workoutStore.switchTab) {
    workoutStore.switchTab(id);
  }
  emit('update:currentTab', id);
  emit('update:modelValue', id);
  emit('switch-tab', id);
  emit('change', id);
}

watch(activeTabId, () => {
  scrollToActiveTab();
});

onMounted(() => {
  scrollToActiveTab();
});
</script>
