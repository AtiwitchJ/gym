<template>
  <section class="archive-card p-4 sm:p-5" role="region" aria-label="โซนความเข้มข้นจาก 1RM">
    <div>
      <span class="text-[11px] font-mono font-bold tracking-widest text-flame-text uppercase block">INTENSITY ZONES · %1RM</span>
      <h3 class="text-sm font-extrabold font-heading text-ink mt-0.5">โซนความเข้มข้นจาก 1RM</h3>
      <p class="text-[11px] text-ink-muted font-body mt-1 leading-snug">
        แปลง 1RM เป็นน้ำหนักเป้าหมายต่อช่วงการฝึก — เหมือนตารางโซนความเข้มข้นใน Strong / Hevy
      </p>
    </div>

    <div class="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 mt-3">
      <label class="flex flex-col gap-1 flex-1">
        <span class="text-[11px] font-mono font-bold text-ink-muted">1RM (กก.)</span>
        <input
          v-model="oneRm"
          type="number"
          inputmode="decimal"
          min="1"
          max="1000"
          step="0.5"
          placeholder="100"
          aria-label="1RM เป็นกิโลกรัม"
          class="min-h-[44px] w-full px-3 rounded-xl border-2 border-plate bg-white text-base font-mono font-bold text-ink"
        />
      </label>
      <button
        type="button"
        :disabled="loading"
        @click="submit"
        class="min-h-[44px] min-w-[44px] px-4 py-2 rounded-xl border-2 border-plate bg-flame hover:bg-flame-glow disabled:opacity-50 text-white font-heading font-bold text-sm shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
      >
        ⚡ คำนวณโซน
      </button>
    </div>

    <p v-if="error" role="alert" class="mt-3 text-xs font-body text-flame-text font-bold">⚠️ {{ error }}</p>
    <p v-else-if="loading" role="status" class="mt-3 text-xs font-body text-ink-muted">⏳ กำลังคำนวณโซน…</p>

    <div v-if="!loading && zones.length" class="mt-3 space-y-2">
      <p class="text-[11px] font-mono font-bold text-ink-muted">
        e1RM {{ e1rm }} กก. · {{ summary.zoneCount }} โซน · ช่วงน้ำหนัก {{ summary.minWeight }}–{{ summary.maxWeight }} กก.
      </p>
      <ul role="list" class="space-y-2">
        <li
          v-for="z in zones"
          :key="z.id"
          class="rounded-xl border-2 border-plate bg-white p-3 shadow-[2px_2px_0px_#1e2220]"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-lg" aria-hidden="true">{{ z.icon }}</span>
              <div class="min-w-0">
                <p class="text-sm font-heading font-extrabold text-ink leading-tight">{{ z.nameTh }}</p>
                <p class="text-[11px] font-body text-ink-muted leading-snug mt-0.5">{{ z.focusTh }}</p>
              </div>
            </div>
            <span class="flex-shrink-0 text-base font-mono font-extrabold text-ink tabular-nums">
              {{ z.targetWeight }} <span class="text-[11px] font-bold text-ink-muted">กก.</span>
            </span>
          </div>
          <div class="flex flex-wrap gap-1.5 mt-2">
            <span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border border-plate/30 bg-paper-subtle text-ink">{{ z.pctMin }}–{{ z.pctMax }}% 1RM</span>
            <span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border border-plate/30 bg-paper-subtle text-ink">{{ z.repMin }}–{{ z.repMax }} ครั้ง</span>
            <span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border border-plate/30 bg-paper-subtle text-ink">ช่วง {{ z.weightMin }}–{{ z.weightMax }} กก.</span>
          </div>
          <div
            class="mt-2 h-2 rounded-full bg-paper-subtle border border-plate/20 overflow-hidden"
            role="progressbar"
            :aria-valuemin="0"
            :aria-valuemax="100"
            :aria-valuenow="z.targetPct"
            :aria-valuetext="`${z.nameTh}: ${z.pctMin}–${z.pctMax}% ของ 1RM (เป้าหมาย ${z.targetPct}%)`"
          >
            <div class="h-full bg-flame" :style="{ width: z.targetPct + '%' }"></div>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { useTrainingZones } from '../composables/useTrainingZones.js';

const { e1rm, zones, summary, loading, error, load } = useTrainingZones();
const oneRm = ref('');

async function submit() {
  await load(oneRm.value);
}
</script>
