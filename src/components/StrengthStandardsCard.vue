<template>
  <section class="archive-card p-4 sm:p-5" role="region" aria-label="มาตรฐานความแข็งแรง">
    <div>
      <span class="text-[11px] font-mono font-bold tracking-widest text-flame-text uppercase block">STRENGTH STANDARDS · RELATIVE STRENGTH</span>
      <h3 class="text-sm font-extrabold font-heading text-ink mt-0.5">มาตรฐานความแข็งแรงเทียบน้ำหนักตัว</h3>
      <p class="text-[11px] text-ink-muted font-body mt-1 leading-snug">
        เปรียบเทียบ e1RM กับเกณฑ์สากล (Kilgore / ExRx) เหมือนหน้า Strength Standards ใน Hevy — อัปเดตจากน้ำหนักตัวและสถิติการยกของคุณ
      </p>
    </div>

    <p v-if="error" role="alert" class="mt-3 text-xs font-body text-flame-text font-bold">
      ⚠️ {{ error }}
      <button type="button" @click="load" class="min-h-[44px] min-w-[44px] ml-2 px-3 rounded-xl border-2 border-plate bg-white text-ink font-bold touch-manipulation">ลองใหม่</button>
    </p>
    <p v-else-if="loading" role="status" class="mt-3 text-xs font-body text-ink-muted">⏳ กำลังคำนวณมาตรฐานความแข็งแรง…</p>

    <template v-if="!loading && data">
      <!-- Empty state: no body weight logged yet -->
      <div v-if="!data.hasBodyWeight" class="mt-3 rounded-xl border-2 border-plate bg-paper-subtle p-4">
        <p class="text-sm font-heading font-bold text-ink">⚖️ ยังไม่มีข้อมูลน้ำหนักตัวเพื่อคำนวณมาตรฐานความแข็งแรง</p>
        <p class="text-xs font-body text-ink-muted mt-1 leading-snug">
          บันทึกน้ำหนักตัวเพื่อประเมินว่า e1RM ของคุณอยู่ในระดับ Untrained, Novice, Intermediate, Advanced หรือ Elite เมื่อเทียบกับเกณฑ์สากล
        </p>
        <button
          type="button"
          @click="goToBodyWeight"
          class="min-h-[44px] min-w-[44px] mt-3 px-4 py-2 rounded-xl border-2 border-plate bg-flame hover:bg-flame-glow text-white font-heading font-bold text-sm shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
          aria-label="ไปบันทึกน้ำหนักตัว"
        >
          ⚖️ บันทึกน้ำหนักตัววันนี้
        </button>
      </div>

      <template v-else>
        <p class="text-[11px] font-mono font-bold text-ink-muted mt-3">
          อ้างอิงน้ำหนักตัว {{ data.bodyWeight }} กก.
          <span v-if="data.bodyWeightDate">(บันทึกล่าสุด {{ data.bodyWeightDate }})</span>
          <span v-if="stale" class="text-amber-700 font-bold"> · เก่าเกิน 30 วัน ควรอัปเดตน้ำหนักตัว</span>
        </p>

        <!-- Overall tier -->
        <div class="mt-3 rounded-xl border-2 border-plate bg-white p-3 shadow-[2px_2px_0px_#1e2220]">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-[11px] font-mono font-bold text-ink-muted uppercase">🏆 ระดับความแข็งแรงโดยรวม</p>
              <p class="text-base font-heading font-extrabold text-ink mt-1 leading-tight">{{ data.overall.levelLabelTh }}</p>
            </div>
            <span
              class="flex-shrink-0 text-xs font-mono font-bold px-2 py-1 rounded-full border-2 shadow-[1.5px_1.5px_0px_#1e2220]"
              :class="tierBadge(data.overall.level)"
            >{{ data.overall.strengthScore }} / 100</span>
          </div>
          <p class="text-[11px] font-body text-ink-muted mt-1 leading-snug">{{ data.overall.summaryTh }}</p>

          <div v-if="data.overall.balance" class="mt-3 space-y-2">
            <div v-for="cat in balanceRows" :key="cat.key">
              <div class="flex items-center justify-between gap-2">
                <span class="text-[11px] font-mono font-bold text-ink">{{ cat.icon }} {{ cat.label }}</span>
                <span class="text-[11px] font-mono font-bold text-ink tabular-nums">{{ cat.score }} / 100</span>
              </div>
              <div
                class="h-3 rounded-full bg-paper-subtle border border-plate/20 overflow-hidden"
                role="progressbar"
                :aria-valuemin="0"
                :aria-valuemax="100"
                :aria-valuenow="cat.score"
                :aria-valuetext="`${cat.label}: ${cat.score} จาก 100 คะแนน`"
              >
                <div class="h-full transition-all duration-500 ease-out" :style="{ width: cat.score + '%', backgroundColor: cat.color }"></div>
              </div>
            </div>
            <p class="text-[11px] font-body text-ink leading-snug">{{ data.overall.balance.recommendationTh }}</p>
          </div>
        </div>

        <!-- Benchmark table -->
        <div v-if="data.benchmarks.length" class="mt-3">
          <p class="text-[11px] font-mono font-bold text-ink-muted uppercase">📊 ตารางมาตรฐานรายท่าหลัก</p>
          <div class="flex flex-wrap gap-1.5 mt-2" role="group" aria-label="กรองหมวดหมู่ท่าฝึก">
            <button
              v-for="filter in filters"
              :key="filter.key"
              type="button"
              @click="activeFilter = filter.key"
              :aria-pressed="activeFilter === filter.key"
              class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border-2 border-plate text-xs font-heading font-bold touch-manipulation transition-all"
              :class="activeFilter === filter.key ? 'bg-flame text-white shadow-[2px_2px_0px_#1e2220]' : 'bg-white text-ink hover:bg-paper-subtle'"
            >{{ filter.label }}</button>
          </div>

          <ul role="list" class="space-y-2 mt-2">
            <li
              v-for="b in visibleBenchmarks"
              :key="b.exerciseId"
              class="rounded-xl border-2 border-plate bg-white p-3 shadow-[2px_2px_0px_#1e2220]"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-heading font-extrabold text-ink leading-tight">
                    <span class="mr-1" aria-hidden="true">{{ b.icon }}</span>{{ b.displayNameTh }}
                  </p>
                  <p class="text-[11px] font-body text-ink-muted leading-snug mt-0.5">
                    e1RM {{ b.bestE1rm }} กก. ({{ b.bestWeight }} กก. × {{ b.bestReps }} ครั้ง) · {{ b.ratio }}× BW
                  </p>
                </div>
                <span
                  class="flex-shrink-0 text-[11px] font-mono font-bold px-2 py-1 rounded-full border-2 shadow-[1.5px_1.5px_0px_#1e2220]"
                  :class="tierBadge(b.level)"
                >{{ b.levelLabelTh }}</span>
              </div>

              <div
                class="mt-2 h-3 rounded-full bg-paper-subtle border border-plate/20 overflow-hidden"
                role="progressbar"
                :aria-valuemin="0"
                :aria-valuemax="100"
                :aria-valuenow="b.progressPct"
                :aria-valuetext="`${b.displayNameTh}: ${b.progressPct}% ของช่วง levels ถัดไป`"
              >
                <div class="h-full transition-all duration-500 ease-out" :style="{ width: b.progressPct + '%', backgroundColor: tierColor(b.level) }"></div>
              </div>
              <p class="text-[11px] font-mono font-bold text-ink mt-1">
                {{ b.progressPct }}% ของช่วงนี้ ·
                <span v-if="b.nextLevel">🎯 ขาดอีก {{ b.kgToNextLevel }} กก. จะเลื่อนขั้นสู่ {{ b.nextLevelLabelTh }}</span>
                <span v-else>ระดับสูงสุดแล้ว ✓</span>
              </p>
              <p class="text-[11px] font-body text-ink-muted mt-1 leading-snug">
                Untrained &lt; {{ b.thresholds.novice }} · Novice {{ b.thresholds.novice }}–{{ b.thresholds.intermediate }} ·
                Intermediate {{ b.thresholds.intermediate }}–{{ b.thresholds.advanced }} ·
                Advanced {{ b.thresholds.advanced }}–{{ b.thresholds.elite }} · Elite &gt; {{ b.thresholds.elite }} กก.
              </p>
            </li>
          </ul>
        </div>

        <p v-else class="text-[11px] font-body text-ink-muted mt-3 leading-snug">
          ยังไม่มีเซ็ตที่ยกได้น้ำหนักและจำนวนครั้ง/BW พอสำหรับเทียบเกณฑ์ บันทึกเซ็ตเบนช์ โรว์ หรือสควอทเพื่อดูมาตรฐาน
        </p>

        <p class="text-[11px] font-body text-ink-muted mt-3 leading-snug">
          💡 เกณฑ์เป็นค่าสถิติอ้างอิงเพื่อการพัฒนาตนเอง — เครื่องเล่นแต่ละยี่ห้อมีแรงต้านต่างกัน ควรเทียบแนวโน้มของตนเองเป็นหลัก
        </p>
      </template>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { CATEGORY_META, TIER_META, useStrengthStandards } from '../composables/useStrengthStandards.js';

const { data, loading, error, load } = useStrengthStandards();

const filters = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'push', label: '🤜 ผลัก' },
  { key: 'pull', label: '🤛 ดึง' },
  { key: 'legs', label: '🦵 ท่อนล่าง' }
];
const activeFilter = ref('all');

const visibleBenchmarks = computed(() => {
  if (!data.value) return [];
  if (activeFilter.value === 'all') return data.value.benchmarks;
  return data.value.benchmarks.filter((b) => b.category === activeFilter.value);
});

const balanceRows = computed(() => {
  const balance = data.value && data.value.overall.balance;
  if (!balance) return [];
  return [
    { key: 'push', ...CATEGORY_META.push, score: balance.pushScore, color: '#0284c7' },
    { key: 'pull', ...CATEGORY_META.pull, score: balance.pullScore, color: '#059669' },
    { key: 'legs', ...CATEGORY_META.legs, score: balance.legsScore, color: '#7c3aed' }
  ];
});

const stale = computed(() => {
  const date = data.value && data.value.bodyWeightDate;
  if (!date) return false;
  const days = (Date.now() - new Date(date).getTime()) / 86400000;
  return Number.isFinite(days) && days > 30;
});

function tierBadge(level) {
  return TIER_META[level] ? TIER_META[level].badge : TIER_META.unrated.badge;
}

function tierColor(level) {
  return TIER_META[level] ? TIER_META[level].bar : TIER_META.unrated.bar;
}

function goToBodyWeight() {
  const target = document.getElementById('body-weight');
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

onMounted(load);
</script>
