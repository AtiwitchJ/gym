<template>
  <div class="py-2">
    <!-- Action Header Card -->
    <div class="archive-card p-5 mb-5 overflow-hidden">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span class="text-[10px] font-mono font-bold tracking-widest text-emerald uppercase">
            DATA ARCHIVE & BACKUP
          </span>
          <h2 class="text-xl font-bold font-heading text-ink tracking-tight">
            ประวัติการฝึกซ้อม (Workout Archive)
          </h2>
          <p class="text-xs text-ink-muted mt-1 font-body">
            บันทึกไว้ในฐานข้อมูล SQLite ทั้งหมด {{ workoutHistory.length }} รอบการฝึก
          </p>
        </div>

        <!-- Export Buttons -->
        <div class="flex items-center gap-2.5 w-full sm:w-auto">
          <!-- Excel Export Button -->
          <button
            @click="exportWorkoutHistory(workoutHistory)"
            class="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald hover:bg-emerald/90 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl border-2 border-plate shadow-[3px_3px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          >
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" stroke-width="2" />
              <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" />
              <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" />
              <polyline points="10 9 9 9 8 9" stroke="currentColor" stroke-width="2" />
            </svg>
            <span>Export Excel (.xlsx)</span>
          </button>

          <!-- SQLite DB Download Button -->
          <button
            @click="downloadSqliteDatabase"
            class="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-surface hover:bg-paper-dim text-ink font-bold text-xs px-3.5 py-2.5 rounded-xl border-2 border-plate shadow-[3px_3px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            title="ดาวน์โหลดไฟล์ฐานข้อมูล gym.db สำหรับสำรองข้อมูล"
          >
            <svg class="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
            <span>ดาวน์โหลด .db</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Weekly Volume Chart (8 weeks, per muscle / per exercise) -->
    <div class="mb-5">
      <VolumeChart />
    </div>

    <!-- Empty State -->
    <div
      v-if="workoutHistory.length === 0"
      class="text-center py-16 archive-card text-ink-muted"
    >
      <svg class="w-10 h-10 mx-auto mb-3 opacity-40 fill-none stroke-current stroke-1.5" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      <p class="text-sm font-bold text-ink">ยังไม่มีประวัติการฝึกที่บันทึกไว้</p>
      <p class="text-xs text-ink-muted mt-1 font-body">
        เมื่อเล่นเสร็จในแต่ละวัน ให้กดปุ่ม "บันทึกประวัติและจำน้ำหนักวันนี้"
      </p>
    </div>

    <!-- History Session Cards -->
    <div v-else class="space-y-4">
      <div
        v-for="session in workoutHistory"
        :key="session.id"
        class="archive-card overflow-hidden"
      >
        <!-- Session Header -->
        <div class="p-4 bg-surface-low/60 flex items-center justify-between gap-3 border-b-2 border-plate">
          <div>
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <span class="text-xs font-mono font-bold text-ink tabular-nums">
                {{ session.date }}
              </span>
              <span class="text-[11px] font-mono text-ink-muted tabular-nums">
                {{ session.time }} น.
              </span>
              <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-bg text-emerald border border-emerald">
                สำเร็จ {{ session.totalSetsDone }} เซ็ต
              </span>
              <span
                v-if="session.totalVolumeKg"
                class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-surface text-ink border border-plate/30"
              >
                Volume: {{ Number(session.totalVolumeKg).toLocaleString() }} kg
              </span>
              <span
                v-if="session.durationSec"
                class="text-[10px] font-mono text-ink-muted"
              >
                ⏱ {{ Math.round(session.durationSec / 60) }} นาที
              </span>
            </div>
            <h4 class="text-sm font-bold text-ink font-heading tracking-tight">
              {{ session.dayTitle }}
            </h4>
          </div>

          <!-- Delete Session Button -->
          <button
            @click="confirmDelete(session.id)"
            class="p-2 text-ink-muted hover:text-flame hover:bg-flame-bg rounded-lg transition-colors border border-transparent hover:border-flame/30"
            title="ลบประวัตินี้"
          >
            <svg class="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>

        <!-- Session Exercises Summary -->
        <div class="p-4 divide-y-2 divide-plate/10 bg-white">
          <div
            v-for="ex in session.exercises"
            :key="ex.id"
            class="py-2.5 first:pt-0 last:pb-0"
          >
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-bold text-ink font-heading">{{ ex.name }}</span>
              <span class="text-[10px] font-mono text-ink-muted">{{ ex.category }}</span>
            </div>

            <!-- Sets Chips -->
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="set in ex.sets"
                :key="set.setIndex"
                class="text-[10px] font-mono font-bold px-2 py-1 rounded-md border tabular-nums"
                :class="set.done
                  ? 'bg-emerald-bg text-emerald border-emerald'
                  : 'bg-surface-low text-ink-muted border-plate/20 line-through'"
              >
                {{ set.type === 'วอร์ม' ? 'W' : 'S' }}{{ set.setIndex }}:
                {{ (set.weight !== undefined && set.weight !== '') ? set.weight : 0 }} กก.
                <span v-if="set.actualReps !== undefined && set.actualReps !== null && set.actualReps !== ''">
                  ({{ set.actualReps }} ครั้ง)
                </span>
                <span v-else>
                  ({{ set.target }})
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useWorkoutStore } from '../composables/useWorkoutStore';
import { useExcelExport } from '../composables/useExcelExport';
import VolumeChart from './VolumeChart.vue';

const { workoutHistory, deleteSession } = useWorkoutStore();
const { exportWorkoutHistory, downloadSqliteDatabase } = useExcelExport();

function confirmDelete(id) {
  if (confirm('คุณต้องการลบรายการประวัติตัวนี้ใช่หรือไม่?')) {
    deleteSession(id);
  }
}
</script>
