<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-plate/60 backdrop-blur-sm select-none"
    @click.self="close"
  >
    <div class="w-full max-w-md bg-paper border-4 border-plate rounded-t-3xl sm:rounded-3xl shadow-[0_12px_40px_rgba(30,34,32,0.35)] p-4 sm:p-6 max-h-[90vh] overflow-y-auto flex flex-col gap-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <span class="text-[10px] font-mono font-bold tracking-widest text-emerald uppercase block">
            1RM CALCULATOR
          </span>
          <h3 class="text-lg font-extrabold font-heading text-ink leading-tight">ประเมิน 1RM จากเซ็ตย่อย</h3>
        </div>
        <button
          type="button"
          class="min-h-[44px] min-w-[44px] rounded-full border-2 border-plate bg-white flex items-center justify-center text-ink font-bold shadow-[2px_2px_0px_#1e2220]"
          title="ปิด"
          @click="close"
        >✕</button>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <label class="flex flex-col gap-1">
          <span class="text-[11px] font-mono font-bold text-ink-muted">น้ำหนัก (kg)</span>
          <input
            v-model="weight"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.5"
            placeholder="80"
            class="min-h-[44px] w-full px-3 rounded-xl border-2 border-plate bg-white text-base font-mono font-bold text-ink"
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-[11px] font-mono font-bold text-ink-muted">ครั้งที่ยกได้</span>
          <input
            v-model="reps"
            type="number"
            inputmode="numeric"
            min="0"
            step="1"
            placeholder="8"
            class="min-h-[44px] w-full px-3 rounded-xl border-2 border-plate bg-white text-base font-mono font-bold text-ink"
          />
        </label>
      </div>

      <div class="flex flex-col gap-1.5">
        <span class="text-[11px] font-mono font-bold text-ink-muted">เหลืออีกกี่ครั้ง (RIR)</span>
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="choice in choices"
            :key="choice.value"
            type="button"
            class="min-h-[44px] min-w-[44px] rounded-xl border-2 border-plate text-xs font-heading font-bold transition-all"
            :class="rir === choice.value ? 'bg-flame text-white shadow-[1.5px_1.5px_0px_#1e2220]' : 'bg-surface text-ink'"
            @click="rir = choice.value"
          >{{ choice.label }}</button>
        </div>
      </div>

      <div class="bg-white border-2 border-plate rounded-2xl p-4 shadow-[3px_3px_0px_#1e2220] text-center">
        <div class="text-[11px] font-mono font-bold text-ink-muted">1RM ประมาณ (e1RM)</div>
        <div class="text-3xl font-mono font-extrabold text-ink tabular-nums">
          {{ result }}<span v-if="result !== '—'" class="text-base text-ink-muted"> kg</span>
        </div>
        <p class="text-[10px] font-mono text-ink-muted mt-2">
          สูตร: น้ำหนัก × (1 + (ครั้ง + RIR) / 30) — สูตรเดียวกับ PR ของเซ็ต
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useOneRmCalculator, formatOneRm, ONE_RM_RIR_CHOICES } from '../composables/useOneRm.js';

const { isOpen, close } = useOneRmCalculator();

const weight = ref('');
const reps = ref('');
const rir = ref(0);
const choices = ONE_RM_RIR_CHOICES;

const result = computed(() => formatOneRm(weight.value, reps.value, rir.value));
</script>
