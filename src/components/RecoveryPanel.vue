<template>
  <div class="archive-card p-4 bg-white space-y-3">
    <div class="flex items-center justify-between gap-2">
      <div>
        <span class="text-[10px] font-mono font-bold tracking-widest text-flame uppercase block">
          MUSCLE RECOVERY
        </span>
        <h3 class="text-sm font-bold font-heading text-ink">สถานะการฟื้นตัวของกล้ามเนื้อ</h3>
      </div>
      <button
        type="button"
        class="px-2.5 py-1.5 rounded-xl border-2 border-plate text-xs font-mono font-bold bg-paper-subtle hover:bg-paper-dim shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50"
        :disabled="loading"
        @click="load"
      >
        {{ loading ? 'กำลังโหลด...' : 'รีเฟรช' }}
      </button>
    </div>

    <p v-if="error" class="text-xs font-body text-red-700 bg-red-50 border-2 border-red-600 rounded-xl p-3">
      {{ error }}
    </p>

    <p v-else-if="!loading && items.length === 0" class="text-xs text-ink-muted font-body">
      ยังไม่มีข้อมูลการฝึกเพื่อคำนวณการฟื้นตัว
    </p>

    <ul v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <li
        v-for="item in items"
        :key="item.muscle"
        class="border-2 border-plate rounded-2xl p-3 bg-paper-subtle flex flex-col gap-2"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-bold font-heading text-ink truncate">{{ item.muscle }}</span>
          <span
            class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border-2 whitespace-nowrap"
            :class="meta(item.status).badge"
          >
            {{ meta(item.status).label }} • {{ item.recoveryPct }}%
          </span>
        </div>
        <div class="h-2 w-full rounded-full bg-paper-dim border border-plate overflow-hidden">
          <div
            class="h-full transition-all"
            :class="meta(item.status).bar"
            :style="{ width: item.recoveryPct + '%' }"
          ></div>
        </div>
        <span class="text-[11px] font-mono text-ink-muted">
          {{ formatLastTrained(item.lastTrainedAt) }}
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRecovery, getRecoveryMeta } from '../composables/useRecovery.js';

const { items, loading, error, load } = useRecovery();

const meta = getRecoveryMeta;

function formatLastTrained(iso) {
  if (!iso) return 'ยังไม่เคยฝึก';
  return 'ฝึกล่าสุด ' + new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

onMounted(() => {
  load();
});
</script>
