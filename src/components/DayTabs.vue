<template>
  <nav class="w-full px-2 sm:px-4 py-2 pb-[max(8px,env(safe-area-inset-bottom))] select-none">
    <div class="max-w-md mx-auto grid grid-cols-4 gap-1.5 sm:gap-2">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        @click="selectTab(tab.id)"
        class="flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 rounded-xl transition-all relative font-heading border-2 touch-manipulation group"
        :class="activeTabId === tab.id
          ? 'bg-flame text-white border-plate shadow-[2px_2px_0px_#1e2220] -translate-y-0.5 font-bold'
          : 'bg-surface/90 text-ink/75 hover:text-ink border-plate/30 hover:border-plate shadow-[1px_1px_0px_#1e2220] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none'"
        :title="tab.label"
      >
        <!-- Active Workout Running Dot Indicator on Workouts Tab -->
        <span
          v-if="tab.id === 'workouts' && isWorkoutActive"
          class="absolute -top-1 right-2 w-2.5 h-2.5 rounded-full bg-emerald border-2 border-plate shadow-sm animate-pulse pointer-events-none"
        ></span>

        <!-- Tab Icon -->
        <div class="w-5 h-5 flex items-center justify-center mb-1 transition-transform group-active:scale-90">
          <!-- 1. Workouts: Dumbbell / Barbell -->
          <svg v-if="tab.id === 'workouts'" class="w-4.5 h-4.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M6 5v14M18 5v14M2 12h20M9 8h6M9 16h6" />
          </svg>

          <!-- 2. Exercises: Book / Muscle -->
          <svg v-else-if="tab.id === 'exercises'" class="w-4.5 h-4.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>

          <!-- 3. History: Bar Chart / Clock -->
          <svg v-else-if="tab.id === 'history'" class="w-4.5 h-4.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M3 3v18h18" />
            <path d="M18 9l-5 5-4-4-3 3" />
          </svg>

          <!-- 4. Profile: User -->
          <svg v-else-if="tab.id === 'profile'" class="w-4.5 h-4.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>

        <!-- Tab Label -->
        <span class="text-[11px] sm:text-xs tracking-tight truncate leading-tight font-bold">
          {{ tab.label }}
        </span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue';
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

const tabs = [
  { id: 'workouts', label: 'โปรแกรม', icon: 'dumbbell' },
  { id: 'exercises', label: 'ท่าฝึก', icon: 'book' },
  { id: 'history', label: 'ประวัติ', icon: 'chart' },
  { id: 'profile', label: 'บัญชี', icon: 'user' }
];

const activeTabId = computed(() => {
  return props.currentTab || props.modelValue || workoutStore.currentTab?.value || 'workouts';
});

function selectTab(id) {
  if (workoutStore.switchTab) {
    workoutStore.switchTab(id);
  }
  emit('update:currentTab', id);
  emit('update:modelValue', id);
  emit('switch-tab', id);
  emit('change', id);
}
</script>
