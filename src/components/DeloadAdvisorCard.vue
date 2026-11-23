<template>
  <div class="archive-card p-4 sm:p-5 flex flex-col gap-4 select-none" aria-labelledby="deload-card-title">
    <!-- Header -->
    <div class="flex items-center justify-between border-b-2 border-plate/20 pb-3">
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-2xl bg-paper-subtle border-2 border-plate flex items-center justify-center text-xl shadow-[2px_2px_0px_#1e2220] flex-shrink-0">
          <span>{{ statusMeta.icon }}</span>
        </div>
        <div>
          <span class="text-[11px] font-mono font-bold tracking-widest text-flame-text uppercase block">
            DELOAD & TAPERING ADVISOR
          </span>
          <h3 id="deload-card-title" class="text-base sm:text-lg font-heading font-extrabold text-ink leading-tight">
            ตรวจจับสัปดาห์ Deload & คำแนะนำลดโหลด
          </h3>
        </div>
      </div>

      <button
        type="button"
        @click="refresh"
        :disabled="loading"
        class="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl border border-plate/30 hover:border-flame bg-paper-subtle hover:bg-flame-bg text-ink-muted hover:text-flame-text text-xs font-mono font-bold transition-all shadow-[1px_1px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-1 touch-manipulation disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-plate"
        title="รีเฟรชข้อมูลคำแนะนำ Deload"
      >
        <span :class="{ 'animate-spin': loading }">↺</span>
        <span class="hidden sm:inline">รีเฟรช</span>
      </button>
    </div>

    <!-- Error Alert Banner -->
    <div
      v-if="error"
      role="alert"
      class="p-3 rounded-xl bg-red-100 border-2 border-red-500 text-red-950 text-xs font-mono font-bold flex items-center justify-between shadow-[2px_2px_0px_#1e2220]"
    >
      <div class="flex items-center gap-1.5">
        <span>⚠️</span>
        <span>{{ error }}</span>
      </div>
      <button
        type="button"
        @click="refresh"
        class="min-h-[44px] px-3 py-1 rounded-lg border border-red-600 bg-white text-red-900 text-xs font-bold hover:bg-red-50 active:translate-x-[1px] active:translate-y-[1px] touch-manipulation focus-visible:ring-2 focus-visible:ring-plate"
      >
        ลองใหม่
      </button>
    </div>

    <!-- Loading State -->
    <div v-else-if="loading && !data" class="py-8 text-center text-xs font-mono text-ink-muted">
      <span class="inline-block animate-spin mr-1.5">↺</span>
      กำลังวิเคราะห์ความล้าสะสมและโหลดการฝึก...
    </div>

    <!-- Main Content -->
    <template v-else>
      <!-- Recommendation Status Card -->
      <div
        class="border-2 border-plate shadow-[3px_3px_0px_#1e2220] rounded-2xl p-4 flex flex-col gap-3"
        :class="statusCardBgClass"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-extrabold border uppercase shadow-[1.5px_1.5px_0px_#1e2220]"
              :class="statusMeta.badge"
            >
              <span>{{ statusMeta.icon }}</span>
              <span>{{ recommendation.labelTh }}</span>
            </span>
            <span class="text-xs font-mono font-bold text-ink">
              (สถานะ: {{ status.toUpperCase() }})
            </span>
          </div>

          <!-- ACWR summary badge -->
          <div class="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border-2 border-plate bg-white shadow-[1px_1px_0px_#1e2220]">
            <span class="text-ink-muted">ACWR: </span>
            <span class="text-ink font-extrabold tabular-nums">{{ formatAcwr(current.acwr) }}</span>
          </div>
        </div>

        <p class="text-xs sm:text-sm font-heading font-bold text-ink leading-relaxed">
          {{ recommendation.reasonTh }}
        </p>

        <!-- Active Signals Pills -->
        <div v-if="signals.length > 0" class="flex flex-wrap items-center gap-1.5 pt-1">
          <span class="text-[11px] font-mono font-bold text-ink-muted">สัญญาณที่ตรวจพบ:</span>
          <span
            v-for="sig in signals"
            :key="sig"
            class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border"
            :class="getSignalBadgeClass(sig)"
          >
            {{ getSignalLabel(sig) }}
          </span>
        </div>
      </div>

      <!-- Acute vs Chronic & ACWR Metrics Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <!-- Acute Load (สัปดาห์นี้) -->
        <div class="bg-surface border-2 border-plate rounded-xl p-3 text-center shadow-[2px_2px_0px_#1e2220] flex flex-col justify-center">
          <span class="text-[11px] font-mono font-bold text-ink-muted uppercase tracking-wider mb-1">
            โหลดเฉียบพลัน (สัปดาห์นี้)
          </span>
          <div class="flex items-baseline justify-center gap-1 text-ink">
            <span class="font-mono tabular-nums text-xl sm:text-2xl font-extrabold text-flame-text">
              {{ current.acuteLoadAu }}
            </span>
            <span class="text-xs font-mono font-bold text-ink-muted">AU</span>
          </div>
          <span class="text-[11px] font-mono text-ink-muted mt-0.5">Acute Workload</span>
        </div>

        <!-- Chronic Load (เฉลี่ย 4 สัปดาห์) -->
        <div class="bg-surface border-2 border-plate rounded-xl p-3 text-center shadow-[2px_2px_0px_#1e2220] flex flex-col justify-center">
          <span class="text-[11px] font-mono font-bold text-ink-muted uppercase tracking-wider mb-1">
            โหลดเรื้อรัง (เฉลี่ย 4 สัปดาห์)
          </span>
          <div class="flex items-baseline justify-center gap-1 text-ink">
            <span class="font-mono tabular-nums text-xl sm:text-2xl font-extrabold">
              {{ current.chronicLoadAu }}
            </span>
            <span class="text-xs font-mono font-bold text-ink-muted">AU</span>
          </div>
          <span class="text-[11px] font-mono text-ink-muted mt-0.5">Chronic Workload</span>
        </div>

        <!-- Rising Weeks / ACWR Diagnosis -->
        <div class="bg-surface border-2 border-plate rounded-xl p-3 text-center shadow-[2px_2px_0px_#1e2220] flex flex-col justify-center">
          <span class="text-[11px] font-mono font-bold text-ink-muted uppercase tracking-wider mb-1">
            ความล้าสะสมต่อเนื่อง
          </span>
          <div class="flex items-baseline justify-center gap-1">
            <span class="font-mono tabular-nums text-xl sm:text-2xl font-extrabold" :class="current.risingWeeks >= 4 ? 'text-red-700' : 'text-ink'">
              {{ current.risingWeeks }}
            </span>
            <span class="text-xs font-mono font-bold text-ink-muted">สัปดาห์</span>
          </div>
          <span class="text-[11px] font-mono text-ink-muted mt-0.5">
            {{ current.risingWeeks >= 4 ? '⚠️ ยกหนักต่อเนื่องเกิน 4 สัปดาห์' : 'อยู่ในเกณฑ์บริหารจัดการได้' }}
          </span>
        </div>
      </div>

      <!-- Tapering Recommendation Box (RP Hypertrophy Standard) -->
      <div class="bg-paper-subtle border-2 border-plate shadow-[3px_3px_0px_#1e2220] rounded-2xl p-4 flex flex-col gap-2.5">
        <div class="flex items-center justify-between border-b border-plate/15 pb-2">
          <span class="text-xs font-mono font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
            <span>🎯</span>
            <span>คำแนะนำการปรับปริมาณและเป้าหมาย (Tapering Protocol)</span>
          </span>
          <span class="text-[11px] font-mono text-ink-muted">อ้างอิง RP Hypertrophy</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <!-- Set Reduction -->
          <div class="bg-white border-2 border-plate rounded-xl p-2.5 text-center shadow-[1.5px_1.5px_0px_#1e2220]">
            <span class="text-[11px] font-mono font-bold text-ink-muted block mb-0.5">ลดจำนวนเซ็ตลง</span>
            <span class="font-mono text-base font-extrabold text-flame-text">
              ลดเซ็ต {{ taper.setReductionPct }}%
            </span>
            <span class="text-[11px] font-body text-ink-muted block mt-0.5">จากโปรแกรมปกติ</span>
          </div>

          <!-- Target RIR -->
          <div class="bg-white border-2 border-plate rounded-xl p-2.5 text-center shadow-[1.5px_1.5px_0px_#1e2220]">
            <span class="text-[11px] font-mono font-bold text-ink-muted block mb-0.5">เป้าหมายแรงเหลือ</span>
            <span class="font-mono text-base font-extrabold text-emerald-text">
              เป้า RIR {{ taper.targetRir }}
            </span>
            <span class="text-[11px] font-body text-ink-muted block mt-0.5">เหลือแรง 3–4 ครั้ง</span>
          </div>

          <!-- Suggested Sets -->
          <div class="bg-white border-2 border-plate rounded-xl p-2.5 text-center shadow-[1.5px_1.5px_0px_#1e2220]">
            <span class="text-[11px] font-mono font-bold text-ink-muted block mb-0.5">จำนวนเซ็ตแนะนำ</span>
            <span class="font-mono text-base font-extrabold text-ink">
              จำกัด {{ taper.suggestedSetsPerExercise }} เซ็ต/ท่า
            </span>
            <span class="text-[11px] font-body text-ink-muted block mt-0.5">ไม่ฝึกจนหมดแรง (No Failure)</span>
          </div>
        </div>

        <div class="text-[11px] font-body text-ink-muted leading-relaxed bg-white/70 p-2 rounded-lg border border-plate/15">
          💡 <strong>หลักการ Deload:</strong> รักษาน้ำหนักยก (Intensity) ในระดับเดิม เพื่อคงการสั่งการของระบบประสาท แต่ลดจำนวนเซ็ตลง 50% และเว้นระยะจากจุดล้มเหลว (RIR 3–4) เพื่อให้เอ็นและข้อต่อฟื้นตัวเต็มที่
        </div>
      </div>

      <!-- Weekly Load Miniature Bars (6 Weeks) -->
      <div class="bg-white border-2 border-plate shadow-[3px_3px_0px_#1e2220] rounded-2xl p-4 flex flex-col gap-3">
        <div class="flex items-center justify-between border-b border-plate/15 pb-2">
          <div>
            <span class="text-xs font-mono font-bold text-ink uppercase tracking-wide block">
              แนวโน้มความล้า 6 สัปดาห์ล่าสุด (6-Week Load Trend)
            </span>
            <span class="text-[11px] font-mono text-ink-muted">
              หน่วย Session Load: Arbitrary Units (AU)
            </span>
          </div>
          <span class="text-[11px] font-mono font-bold text-ink-muted">
            สูงสุด: {{ maxLoadAu }} AU
          </span>
        </div>

        <!-- 6-Week Bars Container -->
        <div class="grid grid-cols-6 gap-1.5 sm:gap-2.5 pt-6 pb-2 items-end min-h-[160px]">
          <div
            v-for="(w, idx) in normalizedWeeks"
            :key="w.weekStart || idx"
            class="flex flex-col items-center justify-end h-full gap-1.5"
          >
            <!-- Load AU label above bar -->
            <span class="font-mono tabular-nums text-[11px] font-bold text-ink text-center truncate w-full">
              {{ w.loadAu }}
            </span>

            <!-- The Bar Column -->
            <div class="w-full bg-paper-subtle border-2 border-plate rounded-t-lg relative flex items-end justify-center overflow-hidden h-28 shadow-[1px_1px_0px_#1e2220]">
              <div
                class="w-full transition-all duration-300 rounded-t"
                :style="{ height: getBarHeightPercent(w.loadAu) }"
                :class="idx === normalizedWeeks.length - 1 ? currentBarColorClass : 'bg-slate-400'"
              />
            </div>

            <!-- Date / Week label below bar -->
            <div class="flex flex-col items-center text-center">
              <span class="text-[11px] font-mono font-bold text-ink leading-tight">
                {{ formatWeekDate(w.weekStart) }}
              </span>
              <span class="text-[11px] font-mono text-ink-muted leading-tight">
                {{ w.sessions }} วัน
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import {
  useDeload,
  formatAcwr,
  SIGNAL_META
} from '../composables/useDeload.js';

const {
  data,
  weeks,
  current,
  recommendation,
  status,
  statusMeta,
  signals,
  taper,
  loading,
  error,
  refresh
} = useDeload();

onMounted(() => {
  refresh();
});

const statusCardBgClass = computed(() => {
  if (status.value === 'deload') return 'bg-red-50/70 border-red-500';
  if (status.value === 'push') return 'bg-emerald-bg/50 border-emerald';
  return 'bg-yellow-50/70 border-yellow-500';
});

const currentBarColorClass = computed(() => {
  if (status.value === 'deload') return 'bg-red-600';
  if (status.value === 'push') return 'bg-emerald';
  return 'bg-yellow-400';
});

const normalizedWeeks = computed(() => {
  const list = weeks.value || [];
  if (list.length >= 6) return list.slice(-6);
  // Pad with leading zero weeks if fewer than 6
  const paddingCount = 6 - list.length;
  const padding = Array.from({ length: paddingCount }, () => ({
    weekStart: '',
    sessions: 0,
    loadAu: 0,
    workingSets: 0
  }));
  return [...padding, ...list];
});

const maxLoadAu = computed(() => {
  const vals = normalizedWeeks.value.map(w => w.loadAu || 0);
  const m = Math.max(100, ...vals);
  return m;
});

function getBarHeightPercent(load) {
  const val = Number(load) || 0;
  if (val <= 0) return '6%';
  const pct = Math.min(100, Math.max(6, Math.round((val / maxLoadAu.value) * 100)));
  return `${pct}%`;
}

function formatWeekDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  return `${d}/${m}`;
}

function getSignalLabel(sig) {
  return SIGNAL_META[sig]?.label || sig;
}

function getSignalBadgeClass(sig) {
  return SIGNAL_META[sig]?.tagClass || 'bg-paper-subtle text-ink border-plate/30';
}
</script>
