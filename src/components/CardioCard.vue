<template>
  <section class="archive-card p-4 sm:p-5" role="region" aria-label="บันทึกการออกกำลังกายคาร์ดิโอ">
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
      <div>
        <span class="text-[11px] font-mono font-bold tracking-widest text-sky-text uppercase block">CARDIO LOG · สัปดาห์นี้</span>
        <h3 class="text-sm font-extrabold font-heading text-ink mt-0.5">บันทึกคาร์ดิโอ</h3>
        <p class="text-[11px] text-ink-muted font-body mt-1 leading-snug">
          วิ่ง · เดิน · ปั่น · พาย · ว่าย — สถิติรายสัปดาห์แบบ Hevy / Strong
        </p>
      </div>
      <button
        v-if="sessions.length || error"
        type="button"
        :disabled="loading"
        @click="load"
        class="min-h-[44px] min-w-[44px] px-3 rounded-xl border-2 border-plate bg-paper-subtle hover:bg-paper-dim disabled:opacity-50 text-xs font-mono font-bold text-ink shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
        aria-label="รีเฟรชข้อมูลคาร์ดิโอ"
      >
        ↻ รีเฟรช
      </button>
    </div>

    <p v-if="error" role="alert" class="mt-3 text-xs font-body text-flame-text font-bold">⚠️ {{ error }}</p>
    <p v-if="actionError" role="alert" class="mt-1 text-xs font-body text-flame-text font-bold">⚠️ {{ actionError }}</p>
    <p v-else-if="loading && !summary" role="status" class="mt-3 text-xs font-body text-ink-muted">⏳ กำลังโหลดข้อมูลคาร์ดิโอ…</p>

    <template v-if="summary">
      <!-- Weekly summary -->
      <div class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2" role="list">
        <div v-for="stat in statCards" :key="stat.key" role="listitem" class="rounded-xl border-2 border-plate bg-white p-2.5 shadow-[2px_2px_0px_#1e2220]">
          <p class="text-[11px] font-mono font-bold text-ink-muted">{{ stat.label }}</p>
          <p class="text-base font-mono font-extrabold text-ink tabular-nums mt-0.5">{{ stat.value }} <span class="text-[11px] font-bold text-ink-muted">{{ stat.unit }}</span></p>
          <p class="text-[11px] font-mono font-bold mt-0.5" :class="stat.deltaClass">
            {{ stat.deltaText }} <span class="text-ink-muted font-normal">vs สัปดาห์ก่อน</span>
          </p>
        </div>
      </div>

      <p class="mt-2 text-[11px] font-mono text-ink-muted">
        สัปดาห์นี้ {{ summary.weekStart }} → {{ summary.weekEnd }} · รวมทั้งหมด {{ summary.allTime.sessions }} ครั้ง
      </p>

      <div v-if="summary.byType.length" class="flex flex-wrap gap-1.5 mt-2">
        <span
          v-for="t in summary.byType"
          :key="t.id"
          class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border border-plate/30 bg-sky-bg text-sky-text"
        >
          {{ t.icon }} {{ t.labelTh }} {{ t.sessions }} ครั้ง · {{ t.totalMinutes }} นาที
        </span>
      </div>

      <!-- Quick add form -->
      <form class="mt-3 rounded-xl border-2 border-plate bg-paper-subtle p-3 space-y-2" @submit.prevent="submit">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <label class="flex flex-col gap-1 col-span-2 sm:col-span-1">
            <span class="text-[11px] font-mono font-bold text-ink-muted">ประเภท</span>
            <select v-model="form.type" aria-label="ประเภทคาร์ดิโอ" class="min-h-[44px] w-full px-2 rounded-xl border-2 border-plate bg-white text-sm font-body text-ink">
              <option v-for="(meta, id) in CARDIO_TYPE_META" :key="id" :value="id">{{ meta.icon }} {{ meta.labelTh }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-[11px] font-mono font-bold text-ink-muted">เวลา (นาที)</span>
            <input v-model="form.durationMin" type="number" inputmode="numeric" min="1" max="600" placeholder="30" aria-label="ระยะเวลาเป็นนาที" class="min-h-[44px] w-full px-3 rounded-xl border-2 border-plate bg-white text-base font-mono font-bold text-ink" />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-[11px] font-mono font-bold text-ink-muted">ระยะ (กม.)</span>
            <input v-model="form.distanceKm" type="number" inputmode="decimal" min="0" max="500" step="0.1" placeholder="5.0" aria-label="ระยะทางเป็นกิโลเมตร" class="min-h-[44px] w-full px-3 rounded-xl border-2 border-plate bg-white text-base font-mono font-bold text-ink" />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-[11px] font-mono font-bold text-ink-muted">แคลอรี (ไม่บังคับ)</span>
            <input v-model="form.calories" type="number" inputmode="numeric" min="0" max="10000" placeholder="อัตโนมัติ" aria-label="แคลอรี" class="min-h-[44px] w-full px-3 rounded-xl border-2 border-plate bg-white text-base font-mono font-bold text-ink" />
          </label>
        </div>
        <button
          type="submit"
          :disabled="saving"
          class="min-h-[44px] min-w-[44px] w-full px-4 rounded-xl border-2 border-plate bg-sky hover:bg-sky/90 disabled:opacity-50 text-white font-heading font-bold text-sm shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
        >
          ➕ บันทึกเซสชันคาร์ดิโอ
        </button>
        <p class="text-[11px] font-body text-ink-muted">หากไม่กรอกแคลอรี ระบบจะประมาณจากประเภทและเวลา (อ้างอิงน้ำหนัก 70 กก.)</p>
      </form>

      <!-- Recent sessions -->
      <div v-if="sessions.length" class="mt-3">
        <p class="text-[11px] font-mono font-bold text-ink-muted uppercase tracking-widest">รายการล่าสุด</p>
        <ul role="list" class="mt-1.5 space-y-1.5">
          <li v-for="s in sessions.slice(0, 5)" :key="s.id" class="flex items-center gap-2 rounded-xl border-2 border-plate bg-white p-2 shadow-[1.5px_1.5px_0px_#1e2220]">
            <span class="text-lg" aria-hidden="true">{{ CARDIO_TYPE_META[s.type]?.icon || '🎯' }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-heading font-bold text-ink truncate">
                {{ CARDIO_TYPE_META[s.type]?.labelTh || s.type }} · {{ s.durationMin }} นาที
              </p>
              <p class="text-[11px] font-mono text-ink-muted">
                {{ s.date }}<template v-if="s.distanceKm !== null"> · {{ s.distanceKm }} กม.</template> · {{ s.calories !== null ? s.calories + ' แคลอรี' : 'แคลอรีโดยประมาณ' }}
              </p>
            </div>
            <button
              type="button"
              :disabled="saving"
              @click="removeSession(s.id)"
              :aria-label="`ลบเซสชันคาร์ดิโอวันที่ ${s.date}`"
              class="min-h-[44px] min-w-[44px] px-2 rounded-xl border-2 border-plate bg-flame-bg hover:bg-flame/20 disabled:opacity-50 text-sm font-bold text-flame-text shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
            >
              ✕
            </button>
          </li>
        </ul>
      </div>

      <div v-else class="mt-3 rounded-xl border-2 border-dashed border-plate bg-paper-subtle p-4 text-center">
        <p class="text-sm font-heading font-bold text-ink">🏃 ยังไม่มีเซสชันคาร์ดิโอ</p>
        <p class="text-xs font-body text-ink-muted mt-1">บันทึกครั้งแรกด้านบนเพื่อเริ่มติดตามสถิติรายสัปดาห์</p>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive } from 'vue';
import { CARDIO_TYPE_META, useCardio } from '../composables/useCardio.js';

const { sessions, summary, loading, saving, error, actionError, load, add, remove } = useCardio();

const form = reactive({
  type: 'run',
  durationMin: '',
  distanceKm: '',
  calories: ''
});

function deltaText(n, unit) {
  const rounded = Math.round(Number(n) * 10) / 10;
  if (rounded > 0) return `+${rounded}${unit}`;
  if (rounded < 0) return `${rounded}${unit}`;
  return `±0${unit}`;
}

function deltaClass(n) {
  const v = Number(n);
  return v > 0 ? 'text-emerald-text' : v < 0 ? 'text-flame-text' : 'text-ink-muted';
}

const statCards = computed(() => {
  const s = summary.value;
  if (!s) return [];
  const d = s.delta;
  return [
    { key: 'sessions', label: 'ครั้ง', value: s.thisWeek.sessions, unit: 'ครั้ง', deltaText: deltaText(d.sessions, ''), deltaClass: deltaClass(d.sessions) },
    { key: 'minutes', label: 'เวลา', value: s.thisWeek.totalMinutes, unit: 'นาที', deltaText: deltaText(d.totalMinutes, ''), deltaClass: deltaClass(d.totalMinutes) },
    { key: 'distance', label: 'ระยะทาง', value: s.thisWeek.totalDistanceKm, unit: 'กม.', deltaText: deltaText(d.totalDistanceKm, ''), deltaClass: deltaClass(d.totalDistanceKm) },
    { key: 'calories', label: 'แคลอรี', value: s.thisWeek.totalCalories, unit: 'kcal', deltaText: deltaText(d.totalCalories, ''), deltaClass: deltaClass(d.totalCalories) }
  ];
});

async function submit() {
  const ok = await add({
    type: form.type,
    durationMin: form.durationMin,
    distanceKm: form.distanceKm,
    calories: form.calories
  });
  if (ok) {
    form.durationMin = '';
    form.distanceKm = '';
    form.calories = '';
  }
}

async function removeSession(id) {
  await remove(id);
}

onMounted(load);
</script>
