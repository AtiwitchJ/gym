<template>
  <nav class="bg-paper border-b-2 border-plate px-4 py-2.5 overflow-x-auto scrollbar-none">
    <div class="max-w-3xl mx-auto flex gap-2 min-w-max">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="switchDay(tab.id)"
        class="flex flex-col items-center justify-center px-3.5 py-1.5 rounded-xl text-xs transition-all relative font-heading border-2 border-plate"
        :class="currentDay === tab.id
          ? tab.id === 'history'
            ? 'bg-emerald text-white shadow-[3px_3px_0px_#1e2220] translate-x-[-1px] translate-y-[-1px]'
            : tab.id === 'todo'
              ? 'bg-gold text-ink font-bold shadow-[3px_3px_0px_#1e2220] translate-x-[-1px] translate-y-[-1px]'
              : 'bg-plate text-white shadow-[3px_3px_0px_#ea580c] translate-x-[-1px] translate-y-[-1px]'
          : 'bg-surface text-ink shadow-[2px_2px_0px_#1e2220] hover:bg-paper-subtle active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'"
      >
        <span class="font-bold text-xs tracking-tight">{{ tab.name }}</span>
        <span class="text-[10px] opacity-80 mt-0.5 tracking-normal font-body">{{ tab.sub }}</span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { useWorkoutStore } from '../composables/useWorkoutStore';

const { currentDay, switchDay } = useWorkoutStore();

const tabs = [
  { id: 'mon', name: 'จันทร์', sub: 'ขา + ก้น' },
  { id: 'tue', name: 'อังคาร', sub: 'อก + หลังแขน' },
  { id: 'wed', name: 'พุธ', sub: 'หลัง + หน้าแขน' },
  { id: 'thu', name: 'พฤหัส', sub: 'ไหล่ + ท้อง' },
  { id: 'rest', name: 'ศุกร์-อาทิตย์', sub: 'พักฟื้น' },
  { id: 'history', name: 'ประวัติ', sub: 'Excel / DB' },
  { id: 'todo', name: 'สิ่งที่ต้องทำ', sub: 'Checklist' }
];
</script>
