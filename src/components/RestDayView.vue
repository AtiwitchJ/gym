<template>
  <div class="py-2 space-y-4">
    <!-- Header -->
    <div class="archive-card p-5">
      <span class="text-[10px] font-mono font-bold tracking-widest text-sky uppercase">
        วันพัก
      </span>
      <h2 class="text-xl font-bold font-heading text-ink tracking-tight">
        วันนี้เป็นวันพัก ฟื้นฟูร่างกาย
      </h2>
      <p class="text-xs text-ink-muted mt-1 font-body">
        กล้ามเนื้อไม่ได้เติบโตตอนยกในยิม แต่เติบโตตอนนอนหลับและซ่อมแซมเส้นใยกล้ามเนื้อ
      </p>
    </div>

    <!-- Next session (step 4 of the 3-day A/B rule): shows the program after the last completed session -->
    <div class="archive-card p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="min-w-0">
        <span class="text-[10px] font-mono font-bold tracking-widest text-emerald uppercase block">NEXT SESSION</span>
        <p class="text-sm font-bold font-heading text-ink">{{ nextHint }}</p>
      </div>
      <button
        type="button"
        @click="openNext"
        class="min-h-[44px] min-w-[44px] px-4 py-2 rounded-xl border-2 border-plate bg-flame hover:bg-flame-glow text-white font-heading font-bold text-sm shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
        :title="`เปิด ${nextLabel} (ไม่ต้องรอวัน)`"
      >
        เปิด {{ nextLabel }} ›
      </button>
    </div>

    <!-- Muscle Recovery Indicator (SPEC 2.3) -->
    <RecoveryPanel />

    <!-- Pillars of Recovery -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <!-- Nutrition -->
      <div class="archive-card p-4 bg-white">
        <div class="text-xs font-mono text-flame font-bold mb-1.5 uppercase flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-flame"></span>
          01 • PROTEIN & WATER
        </div>
        <h4 class="text-sm font-bold text-ink font-heading mb-1">โภชนาการฟื้นฟู</h4>
        <p class="text-xs text-ink-muted leading-relaxed font-body">
          รับประทานโปรตีน 1.6–2.0g ต่อน้ำหนักตัว 1 kg เพื่อซ่อมแซมกล้ามเนื้อ พร้อมดื่มน้ำสะอาด 2.5–3 ลิตรต่อวัน
        </p>
      </div>

      <!-- Sleep -->
      <div class="archive-card p-4 bg-white">
        <div class="text-xs font-mono text-sky font-bold mb-1.5 uppercase flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-sky"></span>
          02 • DEEP SLEEP (7-8 HRS)
        </div>
        <h4 class="text-sm font-bold text-ink font-heading mb-1">การนอนหลับลึก</h4>
        <p class="text-xs text-ink-muted leading-relaxed font-body">
          โกรทฮอร์โมน (Growth Hormone) จะหลั่งมากที่สุดตอนหลับลึก ควรนอนหลับให้มีคุณภาพ 7–8 ชั่วโมง
        </p>
      </div>

      <!-- Mobility -->
      <div class="archive-card p-4 bg-white">
        <div class="text-xs font-mono text-gold font-bold mb-1.5 uppercase flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-gold"></span>
          03 • FOAM ROLLING & STRETCH
        </div>
        <h4 class="text-sm font-bold text-ink font-heading mb-1">คลายพังผืด</h4>
        <p class="text-xs text-ink-muted leading-relaxed font-body">
          ใช้ Foam Roller คลึงต้นขา ก้น และหลัง 10–15 นาที ช่วยสลายจุดเกร็งตึง (Trigger Points)
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import RecoveryPanel from './RecoveryPanel.vue';
import { useWorkoutStore } from '../composables/useWorkoutStore.js';
import { programLabel, nextProgramHint } from '../composables/useRestPanel.js';

const { todayProgramKey, switchDay } = useWorkoutStore();

const nextLabel = computed(() => programLabel(todayProgramKey.value));
const nextHint = computed(() => nextProgramHint(todayProgramKey.value));

// Open the next program's day view directly (the rest view is only shown on วันนี้ on rest weekdays).
function openNext() {
  switchDay(todayProgramKey.value);
}
</script>
