<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-plate/60 backdrop-blur-sm select-none"
    @click.self="$emit('close')"
  >
    <div class="w-full max-w-lg bg-paper border-4 border-plate rounded-t-3xl sm:rounded-3xl shadow-[0_12px_40px_rgba(30,34,32,0.35)] p-4 sm:p-6 max-h-[90vh] overflow-y-auto flex flex-col gap-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <span class="text-[10px] font-mono font-bold tracking-widest text-emerald uppercase block">
            EXERCISE HISTORY · PR
          </span>
          <h3 class="text-lg font-extrabold font-heading text-ink leading-tight">{{ exerciseName }}</h3>
        </div>
        <button
          type="button"
          class="w-9 h-9 rounded-full border-2 border-plate bg-white flex items-center justify-center text-ink font-bold shadow-[2px_2px_0px_#1e2220]"
          title="ปิด"
          @click="$emit('close')"
        >✕</button>
      </div>

      <p v-if="error" class="text-xs font-body text-red-700 bg-red-50 border-2 border-red-600 rounded-xl p-3">
        {{ error }}
      </p>
      <p v-else-if="loading" class="text-xs text-ink-muted font-body">กำลังโหลดประวัติ...</p>

      <template v-else>
        <!-- PR card -->
        <div class="bg-white border-2 border-plate rounded-2xl p-4 shadow-[3px_3px_0px_#1e2220]">
          <div class="text-[11px] font-mono font-bold text-ink-muted mb-2">🏆 PR (สถิติสูงสุดของท่านี้)</div>
          <div class="grid grid-cols-3 gap-2">
            <div v-for="row in prRows" :key="row.label" class="text-center">
              <div class="text-base sm:text-lg font-mono font-extrabold text-ink tabular-nums">{{ row.value }}</div>
              <div class="text-[10px] font-body text-ink-muted leading-tight">{{ row.label }}</div>
            </div>
          </div>
          <p v-if="!hasAnyPr" class="text-[11px] text-ink-muted font-body mt-2">ยังไม่มี PR: เซ็ตวอร์มไม่นับเป็น PR และ PR จะอัปเดตหลังบันทึกเซสชัน</p>
        </div>

        <!-- History rows -->
        <div v-if="sessions.length === 0" class="text-xs text-ink-muted font-body">
          {{ emptyMessage }}
        </div>
        <ul v-else class="space-y-2">
          <li
            v-for="session in sessions"
            :key="session.sessionId"
            class="border-2 border-plate rounded-2xl p-3 bg-surface"
          >
            <div class="flex items-center justify-between gap-2 mb-1.5">
              <span class="text-xs font-bold font-heading text-ink">{{ formatDate(session.date) }}</span>
              <span class="text-[10px] font-mono text-ink-muted truncate">{{ session.dayTitle }}</span>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="row in labelSets(session.sets)"
                :key="row.key"
                class="text-[11px] font-mono px-2 py-0.5 rounded-lg border-2 border-plate"
                :class="row.status === 'done' ? 'bg-emerald-bg text-ink' : 'bg-paper-subtle text-ink-muted'"
              >
                {{ row.label }} {{ setLabel(row.set) }}
              </span>
            </div>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useExerciseHistory, formatPr, hasPr, setText, HISTORY_EMPTY_MESSAGE } from '../composables/useExerciseHistory.js';
import { labelSets } from '../composables/setLabels.js';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  exerciseId: { type: String, default: '' },
  exerciseName: { type: String, default: '' }
});

defineEmits(['close']);

const { sessions, pr, loading, error, load } = useExerciseHistory();

const emptyMessage = HISTORY_EMPTY_MESSAGE;
const prRows = computed(() => formatPr(pr.value));
const hasAnyPr = computed(() => hasPr(pr.value));
const setLabel = (set) => setText(set);

function formatDate(iso) {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

watch(
  () => [props.isOpen, props.exerciseId],
  ([open, id]) => {
    if (open && id) load(id);
  },
  { immediate: true }
);
</script>
