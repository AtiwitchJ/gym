<template>
  <div class="py-2">
    <!-- Action Header Card -->
    <div class="bg-surface rounded-xl border border-surface-border p-5 mb-5 shadow-sm">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span class="text-[10px] font-mono tracking-widest text-emerald-400 uppercase">
            DATA EXPORT & BACKUP
          </span>
          <h2 class="text-xl font-bold font-display text-white tracking-tight">
            ประวัติการฝึกซ้อม (Workout History)
          </h2>
          <p class="text-xs text-titanium-400 mt-1">
            บันทึกไว้ใน SQLite Server ทั้งหมด {{ workoutHistory.length }} รอบการฝึก
          </p>
        </div>

        <!-- Export Buttons -->
        <div class="flex items-center gap-2.5 w-full sm:w-auto">
          <!-- Excel Export Button -->
          <button
            @click="exportWorkoutHistory(workoutHistory)"
            class="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-2.5 rounded-lg border border-emerald-500 shadow-md shadow-emerald-950 transition-colors"
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
            class="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-titanium-800 hover:bg-surface-muted text-titanium-200 hover:text-white font-medium text-xs px-3.5 py-2.5 rounded-lg border border-surface-border transition-colors"
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

    <!-- Empty State -->
    <div
      v-if="workoutHistory.length === 0"
      class="text-center py-16 bg-surface rounded-xl border border-surface-border text-titanium-500"
    >
      <svg class="w-10 h-10 mx-auto mb-3 opacity-40 fill-none stroke-current stroke-1.5" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      <p class="text-sm font-medium text-titanium-400">ยังไม่มีประวัติการฝึกที่บันทึกไว้</p>
      <p class="text-xs text-titanium-500 mt-1">
        เมื่อเล่นเสร็จในแต่ละวัน ให้กดปุ่ม "บันทึกประวัติและจำน้ำหนักวันนี้"
      </p>
    </div>

    <!-- History Session Cards -->
    <div v-else class="space-y-4">
      <div
        v-for="session in workoutHistory"
        :key="session.id"
        class="bg-surface rounded-xl border border-surface-border overflow-hidden"
      >
        <!-- Session Header -->
        <div class="p-4 bg-surface-card/60 flex items-center justify-between gap-3 border-b border-surface-border">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-mono font-bold text-white tabular-nums">
                {{ session.date }}
              </span>
              <span class="text-[11px] font-mono text-titanium-400 tabular-nums">
                {{ session.time }} น.
              </span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                สำเร็จ {{ session.totalSetsDone }} เซ็ต
              </span>
            </div>
            <h4 class="text-sm font-bold text-white tracking-tight">
              {{ session.dayTitle }}
            </h4>
          </div>

          <!-- Delete Session Button -->
          <button
            @click="confirmDelete(session.id)"
            class="p-2 text-titanium-500 hover:text-crimson hover:bg-crimson/10 rounded-lg transition-colors"
            title="ลบประวัตินี้"
          >
            <svg class="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>

        <!-- Session Exercises Summary -->
        <div class="p-4 divide-y divide-surface-border/40">
          <div
            v-for="ex in session.exercises"
            :key="ex.id"
            class="py-2.5 first:pt-0 last:pb-0"
          >
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-medium text-titanium-200">{{ ex.name }}</span>
              <span class="text-[10px] font-mono text-titanium-500">{{ ex.category }}</span>
            </div>

            <!-- Sets Chips -->
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="set in ex.sets"
                :key="set.setIndex"
                class="text-[10px] font-mono px-2 py-1 rounded border tabular-nums"
                :class="set.done
                  ? 'bg-confirmed-bg/30 text-emerald-300 border-confirmed/30'
                  : 'bg-titanium-950 text-titanium-500 border-surface-border line-through'"
              >
                {{ set.type === 'วอร์ม' ? 'W' : 'S' }}{{ set.setIndex }}:
                {{ (set.weight !== undefined && set.weight !== '') ? set.weight : 0 }} กก.
                ({{ set.target }})
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

const { workoutHistory, deleteSession } = useWorkoutStore();
const { exportWorkoutHistory, downloadSqliteDatabase } = useExcelExport();

function confirmDelete(id) {
  if (confirm('คุณต้องการลบรายการประวัติตัวนี้ใช่หรือไม่?')) {
    deleteSession(id);
  }
}
</script>
