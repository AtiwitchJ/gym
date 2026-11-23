<template>
  <div class="archive-card p-4 sm:p-5">
    <div class="flex items-center justify-between gap-3 mb-3">
      <div>
        <span class="text-[11px] font-mono font-bold tracking-widest text-flame-text uppercase block">
          ACHIEVEMENTS & MILESTONES
        </span>
        <span class="text-[11px] text-ink-muted font-body">
          ความสำเร็จสะสมจากข้อมูลการฝึกของคุณ
        </span>
      </div>
      <button
        type="button"
        :disabled="loading"
        @click="load"
        class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border-2 border-plate bg-paper hover:bg-paper-dim text-ink font-heading font-bold text-xs shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] touch-manipulation disabled:opacity-60"
        aria-label="รีเฟรชความสำเร็จ"
      >
        {{ loading ? '⏳' : '🔄 รีเฟรช' }}
      </button>
    </div>

    <div v-if="error" class="bg-red-50 border-2 border-red-600 text-red-700 rounded-xl p-3 text-xs font-body mb-3">
      {{ error }}
      <button type="button" class="min-h-[44px] underline font-bold ml-2 touch-manipulation" @click="load">
        ลองอีกครั้ง
      </button>
    </div>

    <template v-else-if="data">
      <!-- Summary strip -->
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-gold-bg text-flame-text border-2 border-gold shadow-[2px_2px_0px_#1e2220]">
          🏆 {{ summary.unlockedCount }}/{{ summary.total }} ปลดล็อกแล้ว
        </span>
        <span class="text-[11px] font-mono text-ink-muted bg-paper-subtle px-2 py-1 rounded-lg border border-plate/20">
          {{ summary.totalSessions }} รอบ · {{ summary.totalSets }} เซ็ต
        </span>
        <span class="text-[11px] font-mono text-ink-muted bg-paper-subtle px-2 py-1 rounded-lg border border-plate/20">
          {{ formatNumber(summary.totalVolume) }} กก. รวม
        </span>
        <span v-if="summary.bestStreakWeeks > 0" class="text-[11px] font-mono text-flame-text bg-flame-bg px-2 py-1 rounded-lg border border-flame/40">
          🔥 {{ summary.bestStreakWeeks }} สัปดาห์ติดต่อกัน
        </span>
      </div>

      <!-- Unlocked badges -->
      <div v-if="unlocked.length" class="mb-3">
        <p class="text-[11px] font-mono font-bold tracking-wider text-ink-muted uppercase mb-2">
          ปลดล็อกแล้ว ({{ unlocked.length }})
        </p>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <div
            v-for="badge in unlocked"
            :key="badge.id"
            class="p-2.5 bg-gold-bg rounded-xl border-2 border-gold shadow-[2px_2px_0px_#1e2220] text-center"
            :title="badge.description"
          >
            <div class="text-2xl leading-none mb-1">{{ badge.icon }}</div>
            <div class="text-[11px] font-heading font-bold text-ink leading-tight">{{ badge.name }}</div>
            <div class="text-[11px] font-mono text-ink-muted mt-0.5">{{ badge.nameEn }}</div>
            <div v-if="badge.unlockedAt" class="text-[11px] font-mono text-flame-text mt-0.5">{{ badge.unlockedAt }}</div>
          </div>
        </div>
      </div>

      <!-- Locked badges with progress -->
      <div v-if="locked.length">
        <p class="text-[11px] font-mono font-bold tracking-wider text-ink-muted uppercase mb-2">
          กำลังพัฒนา ({{ locked.length }})
        </p>
        <div class="space-y-2">
          <div
            v-for="badge in locked"
            :key="badge.id"
            class="p-2.5 bg-surface-card rounded-xl border-2 border-plate shadow-[2px_2px_0px_#1e2220]"
          >
            <div class="flex items-center justify-between gap-2 mb-1.5">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-lg leading-none opacity-60">{{ badge.icon }}</span>
                <div class="min-w-0">
                  <div class="text-xs font-heading font-bold text-ink truncate">{{ badge.name }}</div>
                  <div class="text-[11px] font-mono text-ink-muted truncate">{{ badge.description }}</div>
                </div>
              </div>
              <span class="text-[11px] font-mono font-bold text-ink-muted whitespace-nowrap tabular-nums">
                {{ formatNumber(badge.progress.current) }}/{{ formatNumber(badge.progress.target) }}
              </span>
            </div>
            <div class="h-2 w-full bg-paper-dim rounded-full border border-plate/20 overflow-hidden">
              <div
                class="h-full bg-emerald rounded-full transition-all"
                :style="{ width: badge.progress.percent + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="text-xs font-body text-ink-muted p-3 bg-paper-subtle rounded-xl border border-plate/20">
      กำลังโหลดข้อมูลความสำเร็จ...
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useAchievements } from '../composables/useAchievements.js';

const { data, loading, error, summary, unlocked, locked, load } = useAchievements();

function formatNumber(value) {
  const num = Number(value) || 0;
  return num >= 1000 ? num.toLocaleString('en-US') : String(Math.round(num * 10) / 10);
}

onMounted(load);
</script>
