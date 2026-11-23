<template>
  <section class="archive-card p-4 sm:p-5" role="region" aria-label="ความสม่ำเสมอในการฝึก 12 เดือน">
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
      <div>
        <span class="text-[11px] font-mono font-bold tracking-widest text-emerald-text uppercase block">CONSISTENCY HEATMAP · 12 เดือน</span>
        <h3 class="text-sm font-extrabold font-heading text-ink mt-0.5">ความสม่ำเสมอในการฝึก</h3>
        <p class="text-[11px] text-ink-muted font-body mt-1 leading-snug">
          ภาพรวมรายปีแบบ Hevy / Strong — ทุกช่องคือวันที่คุณขึ้นยิม
        </p>
      </div>
      <button
        type="button"
        :disabled="loading"
        @click="load()"
        class="min-h-[44px] min-w-[44px] px-3 rounded-xl border-2 border-plate bg-paper-subtle hover:bg-paper-dim disabled:opacity-50 text-xs font-mono font-bold text-ink shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
        aria-label="รีเฟรชข้อมูลความสม่ำเสมอ"
      >
        ↻ รีเฟรช
      </button>
    </div>

    <p v-if="error" role="alert" class="mt-3 text-xs font-body text-flame-text font-bold">⚠️ {{ error }}</p>
    <p v-else-if="loading && !data" role="status" class="mt-3 text-xs font-body text-ink-muted">⏳ กำลังโหลดข้อมูลความสม่ำเสมอ…</p>

    <template v-if="data">
      <div class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2" role="list">
        <div v-for="stat in statCards" :key="stat.key" role="listitem" class="rounded-xl border-2 border-plate bg-white p-2.5 shadow-[2px_2px_0px_#1e2220]">
          <p class="text-[11px] font-mono font-bold text-ink-muted">{{ stat.label }}</p>
          <p class="text-base font-mono font-extrabold text-ink tabular-nums mt-0.5">{{ stat.value }} <span class="text-[11px] font-bold text-ink-muted">{{ stat.unit }}</span></p>
        </div>
      </div>

      <p class="mt-2 text-[11px] font-mono text-ink-muted">
        {{ data.range.start }} → {{ data.range.end }} · ฝึกจริง {{ data.summary.activeDays }}/{{ data.summary.totalDays }} วัน ({{ data.summary.coveragePct }}%)
      </p>

      <!-- Week (column) × weekday (row) grid, horizontally scrollable on phones. -->
      <div class="mt-3 overflow-x-auto pb-1" role="group" aria-label="ตารางความถี่การฝึกแต่ละวัน">
        <div class="flex gap-[3px] min-w-max">
          <!-- Weekday labels -->
          <div class="flex flex-col gap-[3px] pr-1">
            <span class="h-[13px]"></span>
            <span
              v-for="wd in data.weekdayDistribution"
              :key="wd.day"
              class="h-[13px] text-[11px] leading-[13px] font-mono text-ink-muted w-5"
            >{{ wd.labelTh }}</span>
          </div>
          <!-- Week columns -->
          <div v-for="(week, wi) in data.weeks" :key="wi" class="flex flex-col gap-[3px]">
            <span class="h-[13px]"></span>
            <template v-for="(cell, di) in week" :key="di">
              <span v-if="!cell" class="w-[13px] h-[13px]" aria-hidden="true"></span>
              <span
                v-else
                class="w-[13px] h-[13px] rounded-[3px] border border-plate/20"
                :class="levelClass[cell.level]"
                :title="`${cell.date} · ${cell.sessions} เซสชัน · ${cell.sets} เซ็ต`"
                :aria-label="`${cell.date} ${cell.sessions > 0 ? `ฝึก ${cell.sets} เซ็ต` : 'ไม่ได้ฝึก'}`"
                role="img"
              ></span>
            </template>
          </div>
        </div>
      </div>

      <!-- Legend: text labels so colour is never the only signal. -->
      <div class="mt-2 flex flex-wrap items-center gap-2" role="list" aria-label="เฉดความเข้มของการฝึก">
        <span class="text-[11px] font-mono text-ink-muted">ไม่ได้ฝึก</span>
        <span
          v-for="(cls, lv) in levelClass"
          :key="lv"
          class="w-[13px] h-[13px] rounded-[3px] border border-plate/20 inline-block"
          :class="cls"
          role="listitem"
          :aria-label="`ความเข้มระดับ ${lv}`"
        ></span>
        <span class="text-[11px] font-mono text-ink-muted">ฝึกหนักขึ้น →</span>
      </div>

      <!-- Weekday insight -->
      <div v-if="data.weekdayDistribution.length" class="mt-3">
        <p class="text-[11px] font-mono font-bold text-ink-muted uppercase tracking-widest">วันที่ฝึกบ่อยที่สุด</p>
        <div class="mt-1.5 space-y-1" role="list">
          <div v-for="w in busiestWeekdays" :key="w.day" class="flex items-center gap-2" role="listitem">
            <span class="text-[11px] font-mono font-bold text-ink w-6">{{ w.labelTh }}</span>
            <div class="flex-1 h-2 rounded-full bg-surface-high overflow-hidden">
              <div class="h-full rounded-full bg-emerald" :style="{ width: `${w.pct}%` }"></div>
            </div>
            <span class="text-[11px] font-mono font-bold text-ink tabular-nums w-14 text-right">{{ w.sessions }} ครั้ง</span>
          </div>
        </div>
      </div>

      <p v-if="data.summary.lastActiveDate" class="mt-3 text-[11px] font-body text-ink-muted">
        ล่าสุด {{ data.summary.lastActiveDate }} · สตรีคปัจจุบัน {{ data.summary.currentStreakDays }} วัน · สตรีคดีที่สุด {{ data.summary.bestStreakDays }} วัน
      </p>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useTrainingHeatmap } from '../composables/useTrainingHeatmap.js';

const { data, loading, error, load } = useTrainingHeatmap();

const levelClass = {
  0: 'bg-surface-low',
  1: 'bg-emerald-bg',
  2: 'bg-emerald/50',
  3: 'bg-emerald/80',
  4: 'bg-emerald'
};

const statCards = computed(() => {
  const s = data.value?.summary || {};
  return [
    { key: 'active', label: 'วันที่ฝึกจริง', value: s.activeDays || 0, unit: 'วัน' },
    { key: 'sessions', label: 'เซสชันรวม', value: s.totalSessions || 0, unit: 'ครั้ง' },
    { key: 'current', label: 'สตรีคปัจจุบัน', value: s.currentStreakDays || 0, unit: 'วัน' },
    { key: 'best', label: 'สตรีคดีที่สุด', value: s.bestStreakDays || 0, unit: 'วัน' }
  ];
});

const busiestWeekdays = computed(() => {
  const rows = data.value?.weekdayDistribution || [];
  const max = Math.max(1, ...rows.map((w) => w.sessions || 0));
  return rows
    .filter((w) => w.sessions > 0)
    .slice()
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 3)
    .map((w) => ({ ...w, pct: Math.round(((w.sessions || 0) / max) * 100) }));
});

onMounted(() => { load(); });
</script>
