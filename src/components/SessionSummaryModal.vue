<template>
  <div
    v-if="summary"
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-plate/60 backdrop-blur-sm select-none"
    @click.self="$emit('close')"
  >
    <div class="w-full max-w-md bg-paper border-4 border-plate rounded-t-3xl sm:rounded-3xl shadow-[0_12px_40px_rgba(30,34,32,0.35)] p-4 sm:p-6 max-h-[90vh] overflow-y-auto flex flex-col gap-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <span class="text-[10px] font-mono font-bold tracking-widest text-emerald uppercase block">
            SESSION SAVED
          </span>
          <h3 class="text-base font-extrabold font-heading text-ink leading-tight">{{ summary.title }}</h3>
        </div>
        <button
          type="button"
          class="w-9 h-9 rounded-full border-2 border-plate bg-white flex items-center justify-center text-ink font-bold shadow-[2px_2px_0px_#1e2220]"
          title="ปิด"
          @click="$emit('close')"
        >✕</button>
      </div>

      <div class="bg-white border-2 border-plate rounded-2xl p-4 shadow-[3px_3px_0px_#1e2220]">
        <div class="text-[11px] font-mono font-bold text-ink-muted">เซ็ตที่ทำเสร็จ</div>
        <div class="text-2xl font-mono font-extrabold text-ink tabular-nums">
          {{ summary.setsDone }} <span class="text-sm text-ink-muted">/ {{ summary.setsTotal }}</span>
        </div>
      </div>

      <div class="bg-white border-2 border-plate rounded-2xl p-4 shadow-[3px_3px_0px_#1e2220]">
        <div class="text-[11px] font-mono font-bold text-ink-muted mb-2">🏆 PR ในรอบนี้</div>
        <ul v-if="summary.prs.length" class="space-y-1.5">
          <li
            v-for="pr in prs"
            :key="`${pr.exerciseId}-${pr.setIndex}`"
            class="text-sm font-body text-ink"
          >
            {{ pr.label }}
          </li>
        </ul>
        <p v-else class="text-xs font-body text-ink-muted">ยังไม่มี PR ในรอบนี้ (ต้องมีสถิติเดิมให้เทียบก่อน)</p>
      </div>

      <button
        type="button"
        class="w-full py-3 rounded-xl border-2 border-plate bg-flame text-white font-heading font-bold text-sm shadow-[3px_3px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
        @click="$emit('close')"
      >
        ปิด
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { prLabel } from '../composables/useSessionSummary.js';

const props = defineProps({
  summary: { type: Object, default: null }
});

defineEmits(['close']);

const prs = computed(() => (props.summary?.prs || []).map((pr) => ({ ...pr, label: prLabel(pr) })));
</script>
