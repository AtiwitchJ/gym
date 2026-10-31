<template>
  <nav class="bg-titanium-900 border-b border-surface-border px-4 py-2 overflow-x-auto scrollbar-none">
    <div class="max-w-3xl mx-auto flex gap-2 min-w-max">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="switchDay(tab.id)"
        class="flex flex-col items-center justify-center px-3.5 py-2 rounded-lg text-xs transition-all relative"
        :class="currentDay === tab.id
          ? tab.id === 'history'
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950 font-medium'
            : tab.id === 'todo'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-950 font-medium'
              : 'bg-crimson text-white shadow-lg shadow-crimson-dark font-medium'
          : 'bg-surface hover:bg-surface-muted text-titanium-400 hover:text-titanium-200 border border-surface-border'"
      >
        <span class="font-bold text-xs tracking-tight">{{ tab.name }}</span>
        <span class="text-[10px] opacity-80 mt-0.5 tracking-normal">{{ tab.sub }}</span>
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
