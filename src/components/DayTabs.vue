<template>
  <nav
    ref="navContainer"
    class="w-full bg-paper/95 backdrop-blur-md border-t-2 border-plate shadow-[0_-4px_20px_rgba(30,34,32,0.12)] px-2 sm:px-4 py-2 pb-[max(8px,env(safe-area-inset-bottom))] overflow-x-auto scrollbar-none"
  >
    <div class="max-w-3xl mx-auto flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 min-w-max px-1">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :data-tab-id="tab.id"
        @click="switchDay(tab.id)"
        class="flex flex-col items-center justify-center px-3 py-1.5 rounded-xl text-xs transition-all relative font-heading border-2 border-plate touch-manipulation select-none flex-shrink-0"
        :class="currentDay === tab.id
          ? tab.id === 'history'
            ? 'bg-emerald text-white shadow-[2px_2px_0px_#1e2220] translate-x-[-1px] translate-y-[-1px]'
            : tab.id === 'todo'
              ? 'bg-gold text-ink font-bold shadow-[2px_2px_0px_#1e2220] translate-x-[-1px] translate-y-[-1px]'
              : 'bg-plate text-white shadow-[2px_2px_0px_#ea580c] translate-x-[-1px] translate-y-[-1px]'
          : 'bg-surface text-ink shadow-[1.5px_1.5px_0px_#1e2220] hover:bg-paper-subtle active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'"
      >
        <span class="font-bold text-xs tracking-tight">{{ tab.name }}</span>
        <span class="text-[9px] opacity-80 mt-0.5 tracking-normal font-body">{{ tab.sub }}</span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue';
import { useWorkoutStore } from '../composables/useWorkoutStore';

const { currentDay, switchDay } = useWorkoutStore();

const navContainer = ref(null);

const tabs = [
  { id: 'mon', name: 'จันทร์', sub: 'ขา + ก้น' },
  { id: 'tue', name: 'อังคาร', sub: 'อก + หลังแขน' },
  { id: 'wed', name: 'พุธ', sub: 'หลัง + หน้าแขน' },
  { id: 'thu', name: 'พฤหัส', sub: 'ไหล่ + ท้อง' },
  { id: 'rest', name: 'ศุกร์-อาทิตย์', sub: 'พักฟื้น' },
  { id: 'history', name: 'ประวัติ', sub: 'Excel / DB' },
  { id: 'todo', name: 'สิ่งที่ต้องทำ', sub: 'Checklist' }
];

function scrollToActiveTab() {
  nextTick(() => {
    if (!navContainer.value) return;
    const activeBtn = navContainer.value.querySelector(`[data-tab-id="${currentDay.value}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });
}

watch(currentDay, () => {
  scrollToActiveTab();
});

onMounted(() => {
  scrollToActiveTab();
});
</script>
