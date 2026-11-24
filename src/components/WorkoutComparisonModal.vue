<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="isOpen"
      role="dialog"
      aria-modal="true"
      class="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-plate/65 backdrop-blur-sm select-none overflow-y-auto"
      @click.self="closeModal"
    >
      <div
        class="w-full max-w-2xl bg-paper border-2 border-plate shadow-[4px_4px_0px_#1e2220] rounded-2xl flex flex-col overflow-hidden my-auto max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        <!-- Modal Top Header -->
        <div class="p-4 sm:p-5 bg-surface-low/80 border-b-2 border-plate flex items-center justify-between gap-3 flex-shrink-0">
          <div>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface border border-plate/30 text-[11px] font-mono font-bold text-ink-muted uppercase tracking-wider mb-1">
              <span>⚡ SESSION COMPARATOR</span>
            </div>
            <h2 class="text-base sm:text-lg font-extrabold font-heading text-ink tracking-tight">
              เปรียบเทียบผลการฝึกซ้อม (Workout Comparison)
            </h2>
          </div>

          <button
            type="button"
            @click="closeModal"
            class="min-h-[44px] min-w-[44px] rounded-full border-2 border-plate bg-white hover:bg-paper-dim text-ink font-bold flex items-center justify-center focus-visible:ring-2 focus-visible:ring-plate shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
            title="ปิดหน้าต่างเปรียบเทียบ"
            aria-label="ปิดหน้าต่างเปรียบเทียบ"
          >
            ✕
          </button>
        </div>

        <!-- Modal Body (Scrollable) -->
        <div class="p-4 sm:p-5 overflow-y-auto space-y-4">
          <!-- Loading State -->
          <div v-if="loading" class="text-center py-12 space-y-3">
            <div class="w-10 h-10 border-4 border-plate border-t-flame rounded-full animate-spin mx-auto"></div>
            <p class="text-xs font-mono font-bold text-ink">กำลังวิเคราะห์ผลการเปรียบเทียบเซสชัน...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="p-4 rounded-xl border-2 border-flame bg-flame-bg text-center space-y-2.5">
            <div class="text-2xl">⚠️</div>
            <p class="text-xs font-heading font-bold text-flame-text">{{ error }}</p>
            <button
              type="button"
              @click="retryFetch"
              class="min-h-[44px] px-4 py-2 rounded-xl border-2 border-plate bg-white hover:bg-paper text-ink font-mono font-bold text-xs shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-plate"
            >
              🔄 ลองใหม่อีกครั้ง
            </button>
          </div>

          <!-- Empty State: No previous comparison session -->
          <div v-else-if="!hasComparison" class="p-5 rounded-2xl border-2 border-plate bg-white shadow-[2px_2px_0px_#1e2220] text-center space-y-3">
            <div class="text-3xl">🌱</div>
            <h3 class="text-sm sm:text-base font-extrabold font-heading text-ink">
              เซสชันแรกของโปรแกรม
            </h3>
            <p class="text-xs font-body text-ink-muted max-w-md mx-auto leading-relaxed">
              {{ messageTh || 'นี่เป็นการฝึกซ้อมครั้งแรกของโปรแกรมนี้ ยังไม่มีรอบก่อนหน้าให้เปรียบเทียบ ระบบจะเริ่มบันทึกเป็นสถิติอ้างอิงสำหรับการฝึกรอบถัดไป' }}
            </p>
            <div v-if="baseSession" class="p-3 rounded-xl border border-plate/20 bg-paper-subtle max-w-sm mx-auto text-left space-y-1">
              <div class="text-[11px] font-mono text-ink-muted">เซสชันปัจจุบัน:</div>
              <div class="text-xs font-bold text-ink font-heading">{{ baseSession.dayTitle }}</div>
              <div class="text-[11px] font-mono text-ink-muted">{{ baseSession.date }} {{ baseSession.time }} น.</div>
            </div>
            <button
              type="button"
              @click="closeModal"
              class="min-h-[44px] px-5 py-2.5 rounded-xl border-2 border-plate bg-flame hover:bg-flame-glow text-white font-heading font-bold text-xs shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-plate"
            >
              รับทราบ
            </button>
          </div>

          <!-- Comparison Loaded Content -->
          <template v-else>
            <!-- 1. Side-by-Side Session Headers & Switcher -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <!-- Base Session (A - ล่าสุด) -->
              <div class="p-3 rounded-xl border-2 border-plate bg-surface shadow-[2px_2px_0px_#1e2220]">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-bg text-emerald-text border border-emerald">
                    เซสชัน A (ล่าสุด)
                  </span>
                  <span class="text-[11px] font-mono text-ink-muted tabular-nums">
                    {{ baseSession?.time }} น.
                  </span>
                </div>
                <div class="text-xs sm:text-sm font-bold text-ink font-heading truncate">
                  {{ baseSession?.dayTitle }}
                </div>
                <div class="text-[11px] font-mono text-ink-muted mt-0.5">
                  📅 {{ baseSession?.date }}
                </div>
              </div>

              <!-- Target Session (B - ก่อนหน้า) -->
              <div class="p-3 rounded-xl border-2 border-plate bg-paper-subtle shadow-[2px_2px_0px_#1e2220]">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-paper border border-plate/30 text-ink">
                    เซสชัน B (ก่อนหน้า)
                  </span>
                  <span class="text-[11px] font-mono text-ink-muted tabular-nums">
                    {{ targetSession?.time }} น.
                  </span>
                </div>
                <div class="text-xs sm:text-sm font-bold text-ink font-heading truncate">
                  {{ targetSession?.dayTitle }}
                </div>
                <div class="text-[11px] font-mono text-ink-muted mt-0.5 flex items-center justify-between">
                  <span>📅 {{ targetSession?.date }}</span>
                  <button
                    class="min-h-[44px] inline-flex items-center text-[11px] font-mono font-bold text-flame-text underline hover:text-flame touch-manipulation focus-visible:ring-2 focus-visible:ring-plate"
                    v-if="availableTargetSessions.length > 1"
                    type="button"
                    @click="showTargetPicker = !showTargetPicker"
                  >
                    {{ showTargetPicker ? 'ซ่อนตัวเลือก' : 'เปลี่ยนคู่เทียบ ▾' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Optional Target Session Selector -->
            <div v-if="showTargetPicker && availableTargetSessions.length > 0" class="p-3 rounded-xl border-2 border-plate bg-white shadow-[2px_2px_0px_#1e2220] space-y-2">
              <label class="text-[11px] font-mono font-bold text-ink block">
                เลือกเซสชันในประวัติเพื่อเปรียบเทียบกับเซสชัน A:
              </label>
              <select
                v-model="selectedTargetId"
                @change="switchTargetSession"
                class="w-full min-h-[44px] px-3 py-2 rounded-xl border-2 border-plate bg-paper text-xs font-mono text-ink focus-visible:ring-2 focus-visible:ring-plate"
              >
                <option
                  v-for="s in availableTargetSessions"
                  :key="s.id"
                  :value="s.id"
                >
                  {{ s.date }} • {{ s.dayTitle }} ({{ s.time }} น.)
                </option>
              </select>
            </div>

            <!-- 2. Overload Verdict Card -->
            <div class="p-4 sm:p-5 rounded-2xl border-2 border-plate bg-white shadow-[3px_3px_0px_#1e2220] space-y-2.5">
              <div class="flex items-center justify-between flex-wrap gap-2">
                <div class="flex items-center gap-2">
                  <span class="text-2xl">{{ verdictMeta.icon }}</span>
                  <div>
                    <span class="text-[11px] font-mono font-bold tracking-wider text-ink-muted uppercase block">
                      OVERLOAD VERDICT
                    </span>
                    <h3 class="text-sm sm:text-base font-extrabold font-heading text-ink leading-tight">
                      {{ verdictMeta.label }}
                    </h3>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <span
                    class="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border-2"
                    :class="verdictMeta.badge"
                  >
                    {{ verdictMeta.shortLabel }}
                  </span>
                  <span
                    v-if="summary?.verdictScore !== undefined"
                    class="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-surface border border-plate/30 text-ink tabular-nums"
                  >
                    คะแนน: {{ summary.verdictScore }}%
                  </span>
                </div>
              </div>

              <p class="text-xs font-body text-ink leading-relaxed border-t border-plate/15 pt-2">
                {{ summary?.summaryTextTh }}
              </p>
            </div>

            <!-- 3. Macro Delta Metrics Grid -->
            <div>
              <div class="text-[11px] font-mono font-bold text-ink-muted uppercase tracking-wider mb-2 px-0.5">
                สถิติมหภาคเปรียบเทียบ (Macro Metrics)
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <!-- Volume Card -->
                <div class="p-2.5 sm:p-3 rounded-xl border-2 border-plate bg-surface shadow-[1.5px_1.5px_0px_#1e2220]">
                  <span class="text-[11px] font-mono font-bold text-ink-muted block mb-0.5">โวลุ่มรวม (Volume)</span>
                  <div class="text-xs font-mono font-bold text-ink tabular-nums">
                    {{ formatNum(macroDelta.totalVolumeKg?.base) }} kg
                  </div>
                  <div class="text-[11px] font-mono text-ink-muted tabular-nums">
                    เทียบ: {{ formatNum(macroDelta.totalVolumeKg?.target) }} kg
                  </div>
                  <div
                    class="text-[11px] font-mono font-extrabold mt-1"
                    :class="deltaClass(macroDelta.totalVolumeKg?.diff)"
                  >
                    {{ formatDelta(macroDelta.totalVolumeKg?.diff, 'kg') }} ({{ formatDelta(macroDelta.totalVolumeKg?.pct, '%', true) }})
                  </div>
                </div>

                <!-- Reps Card -->
                <div class="p-2.5 sm:p-3 rounded-xl border-2 border-plate bg-surface shadow-[1.5px_1.5px_0px_#1e2220]">
                  <span class="text-[11px] font-mono font-bold text-ink-muted block mb-0.5">จำนวนครั้ง (Reps)</span>
                  <div class="text-xs font-mono font-bold text-ink tabular-nums">
                    {{ macroDelta.totalReps?.base ?? 0 }} ครั้ง
                  </div>
                  <div class="text-[11px] font-mono text-ink-muted tabular-nums">
                    เทียบ: {{ macroDelta.totalReps?.target ?? 0 }} ครั้ง
                  </div>
                  <div
                    class="text-[11px] font-mono font-extrabold mt-1"
                    :class="deltaClass(macroDelta.totalReps?.diff)"
                  >
                    {{ formatDelta(macroDelta.totalReps?.diff, 'ครั้ง') }}
                  </div>
                </div>

                <!-- Sets Done Card -->
                <div class="p-2.5 sm:p-3 rounded-xl border-2 border-plate bg-surface shadow-[1.5px_1.5px_0px_#1e2220]">
                  <span class="text-[11px] font-mono font-bold text-ink-muted block mb-0.5">เซ็ตสำเร็จ (Working Sets)</span>
                  <div class="text-xs font-mono font-bold text-ink tabular-nums">
                    {{ macroDelta.totalSetsDone?.base ?? 0 }} เซ็ต
                  </div>
                  <div class="text-[11px] font-mono text-ink-muted tabular-nums">
                    เทียบ: {{ macroDelta.totalSetsDone?.target ?? 0 }} เซ็ต
                  </div>
                  <div
                    class="text-[11px] font-mono font-extrabold mt-1"
                    :class="deltaClass(macroDelta.totalSetsDone?.diff)"
                  >
                    {{ formatDelta(macroDelta.totalSetsDone?.diff, 'เซ็ต') }}
                  </div>
                </div>

                <!-- Duration Card (if present) -->
                <div v-if="hasDuration" class="p-2.5 sm:p-3 rounded-xl border-2 border-plate bg-surface shadow-[1.5px_1.5px_0px_#1e2220]">
                  <span class="text-[11px] font-mono font-bold text-ink-muted block mb-0.5">ระยะเวลา (Duration)</span>
                  <div class="text-xs font-mono font-bold text-ink tabular-nums">
                    {{ Math.round((macroDelta.durationSec?.base || 0) / 60) }} นาที
                  </div>
                  <div class="text-[11px] font-mono text-ink-muted tabular-nums">
                    เทียบ: {{ Math.round((macroDelta.durationSec?.target || 0) / 60) }} นาที
                  </div>
                  <div
                    v-if="macroDelta.durationSec?.diff !== null"
                    class="text-[11px] font-mono font-extrabold mt-1"
                    :class="macroDelta.durationSec.diff <= 0 ? 'text-emerald-text' : 'text-ink-muted'"
                  >
                    {{ formatDelta(Math.round(macroDelta.durationSec.diff / 60), 'นาที') }}
                  </div>
                </div>

                <!-- Density Card (Work Rate kg/min) -->
                <div v-if="hasDensity" class="p-2.5 sm:p-3 rounded-xl border-2 border-plate bg-surface shadow-[1.5px_1.5px_0px_#1e2220]">
                  <span class="text-[11px] font-mono font-bold text-ink-muted block mb-0.5">ความหนาแน่น (Work Rate)</span>
                  <div class="text-xs font-mono font-bold text-ink tabular-nums">
                    {{ formatNum(macroDelta.densityKgPerMin?.base) }} kg/น.
                  </div>
                  <div class="text-[11px] font-mono text-ink-muted tabular-nums">
                    เทียบ: {{ formatNum(macroDelta.densityKgPerMin?.target) }} kg/น.
                  </div>
                  <div
                    v-if="macroDelta.densityKgPerMin?.diff !== null"
                    class="text-[11px] font-mono font-extrabold mt-1"
                    :class="deltaClass(macroDelta.densityKgPerMin.diff)"
                  >
                    {{ formatDelta(macroDelta.densityKgPerMin.diff, 'kg/น.') }}
                  </div>
                </div>

                <!-- Session Load Card -->
                <div v-if="hasLoad" class="p-2.5 sm:p-3 rounded-xl border-2 border-plate bg-surface shadow-[1.5px_1.5px_0px_#1e2220]">
                  <span class="text-[11px] font-mono font-bold text-ink-muted block mb-0.5">ความหนัก (Session Load)</span>
                  <div class="text-xs font-mono font-bold text-ink tabular-nums">
                    {{ formatNum(macroDelta.sessionLoadAu?.base) }} AU
                  </div>
                  <div class="text-[11px] font-mono text-ink-muted tabular-nums">
                    เทียบ: {{ formatNum(macroDelta.sessionLoadAu?.target) }} AU
                  </div>
                  <div
                    v-if="macroDelta.sessionLoadAu?.diff !== null"
                    class="text-[11px] font-mono font-extrabold mt-1"
                    :class="macroDelta.sessionLoadAu.diff <= 0 ? 'text-emerald-text' : 'text-flame-text'"
                  >
                    {{ formatDelta(macroDelta.sessionLoadAu.diff, 'AU') }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 4. Filter Tabs for Exercises -->
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-plate/15">
              <button
                type="button"
                @click="filterStatus = 'all'"
                class="min-h-[44px] px-3 py-2 rounded-xl border-2 font-mono text-xs font-bold transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-plate"
                :class="filterStatus === 'all'
                  ? 'bg-plate text-white border-plate shadow-[1.5px_1.5px_0px_#1e2220]'
                  : 'bg-white text-ink border-plate/30 hover:bg-paper-subtle'"
              >
                ทั้งหมด ({{ exercises.length }})
              </button>
              <button
                type="button"
                @click="filterStatus = 'progressed'"
                class="min-h-[44px] px-3 py-2 rounded-xl border-2 font-mono text-xs font-bold transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-plate"
                :class="filterStatus === 'progressed'
                  ? 'bg-emerald text-white border-plate shadow-[1.5px_1.5px_0px_#1e2220]'
                  : 'bg-white text-ink border-plate/30 hover:bg-paper-subtle'"
              >
                🟢 ก้าวหน้า ({{ exerciseCounts.progressed }})
              </button>
              <button
                type="button"
                @click="filterStatus = 'maintained'"
                class="min-h-[44px] px-3 py-2 rounded-xl border-2 font-mono text-xs font-bold transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-plate"
                :class="filterStatus === 'maintained'
                  ? 'bg-paper-dim text-ink border-plate shadow-[1.5px_1.5px_0px_#1e2220]'
                  : 'bg-white text-ink border-plate/30 hover:bg-paper-subtle'"
              >
                ⚪ คงที่ ({{ exerciseCounts.maintained }})
              </button>
              <button
                type="button"
                @click="filterStatus = 'regressed'"
                class="min-h-[44px] px-3 py-2 rounded-xl border-2 font-mono text-xs font-bold transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-plate"
                :class="filterStatus === 'regressed'
                  ? 'bg-flame text-white border-plate shadow-[1.5px_1.5px_0px_#1e2220]'
                  : 'bg-white text-ink border-plate/30 hover:bg-paper-subtle'"
              >
                🔴 ลดลง ({{ exerciseCounts.regressed }})
              </button>
            </div>

            <!-- 5. Exercise Breakdown & Set-by-Set Tables -->
            <div class="space-y-3">
              <div
                v-for="ex in filteredExercises"
                :key="ex.exerciseId"
                class="border-2 border-plate rounded-xl bg-white shadow-[2px_2px_0px_#1e2220] overflow-hidden"
              >
                <!-- Exercise Header -->
                <div class="p-3 bg-surface-low/50 border-b border-plate/20 flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="text-xs sm:text-sm font-bold font-heading text-ink">
                        {{ ex.name }}
                      </span>
                      <span v-if="ex.category" class="text-[11px] font-mono text-ink-muted">
                        • {{ ex.category }}
                      </span>
                    </div>
                    <div class="text-[11px] font-mono text-ink-muted mt-0.5">
                      โวลุ่ม: {{ formatNum(ex.volumeDelta?.base) }} kg vs {{ formatNum(ex.volumeDelta?.target) }} kg
                      <span
                        class="font-bold ml-1"
                        :class="deltaClass(ex.volumeDelta?.diff)"
                      >
                        ({{ formatDelta(ex.volumeDelta?.diff, 'kg') }} / {{ formatDelta(ex.volumeDelta?.pct, '%', true) }})
                      </span>
                    </div>
                  </div>

                  <span
                    class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border"
                    :class="getStatusBadgeClass(ex.status)"
                  >
                    {{ ex.statusLabelTh || ex.status }}
                  </span>
                </div>

                <!-- Set-by-Set Comparison Table -->
                <div class="p-2 sm:p-3 overflow-x-auto">
                  <table class="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr class="border-b border-plate/20 text-[11px] text-ink-muted font-bold">
                        <th class="py-1 px-1.5 w-12 text-center">เซ็ต</th>
                        <th class="py-1 px-1.5">เซสชัน A (ล่าสุด)</th>
                        <th class="py-1 px-1.5">เซสชัน B (ก่อนหน้า)</th>
                        <th class="py-1 px-1.5 text-right">ผลต่าง / หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-plate/10">
                      <tr
                        v-for="s in ex.setComparisons"
                        :key="s.setIndex"
                        class="hover:bg-surface-low/30"
                      >
                        <td class="py-1.5 px-1.5 text-center font-bold text-ink">
                          {{ s.setIndex + 1 }}
                        </td>
                        <td class="py-1.5 px-1.5 text-ink">
                          <span v-if="s.baseSet" class="tabular-nums font-bold">
                            {{ s.baseSet.weight }} kg × {{ s.baseSet.reps }} ครั้ง
                          </span>
                          <span v-else class="text-ink-muted">—</span>
                        </td>
                        <td class="py-1.5 px-1.5 text-ink-muted">
                          <span v-if="s.targetSet" class="tabular-nums">
                            {{ s.targetSet.weight }} kg × {{ s.targetSet.reps }} ครั้ง
                          </span>
                          <span v-else class="text-ink-muted">—</span>
                        </td>
                        <td class="py-1.5 px-1.5 text-right">
                          <span
                            class="inline-block text-[11px] font-bold px-1.5 py-0.5 rounded"
                            :class="getSetBadgeClass(s.status)"
                          >
                            {{ s.noteTh }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- 6. New Exercises (if any) -->
            <div v-if="newExercises.length > 0" class="p-3 rounded-xl border-2 border-emerald/50 bg-emerald-bg/30 space-y-2">
              <div class="text-xs font-mono font-bold text-emerald-text flex items-center gap-1.5">
                <span>✨</span>
                <span>ท่าฝึกที่เพิ่มเข้ามาใหม่ในรอบนี้ ({{ newExercises.length }} ท่า)</span>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="nx in newExercises"
                  :key="nx.exerciseId"
                  class="text-[11px] font-mono font-bold px-2 py-1 rounded-md bg-white border border-emerald/40 text-ink"
                >
                  {{ nx.name }} ({{ nx.workingSetsCount }} เซ็ต, {{ formatNum(nx.totalVolumeKg) }} kg)
                </span>
              </div>
            </div>

            <!-- 7. Dropped Exercises (if any) -->
            <div v-if="droppedExercises.length > 0" class="p-3 rounded-xl border-2 border-plate/30 bg-paper-subtle space-y-2">
              <div class="text-xs font-mono font-bold text-ink-muted flex items-center gap-1.5">
                <span>⏸️</span>
                <span>ท่าฝึกจากรอบก่อนที่ไม่ได้เล่นในรอบนี้ ({{ droppedExercises.length }} ท่า)</span>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="dx in droppedExercises"
                  :key="dx.exerciseId"
                  class="text-[11px] font-mono text-ink-muted px-2 py-1 rounded-md bg-white border border-plate/20"
                >
                  {{ dx.name }} (เคยเล่น {{ dx.workingSetsCount }} เซ็ต)
                </span>
              </div>
            </div>
          </template>
        </div>

        <!-- Modal Footer -->
        <div class="p-4 sm:p-5 bg-surface-low/60 border-t-2 border-plate flex items-center justify-between gap-2.5 flex-wrap flex-shrink-0">
          <button
            v-if="hasComparison"
            type="button"
            @click="copySummaryText"
            class="min-h-[44px] px-3.5 py-2 rounded-xl border-2 border-plate bg-white hover:bg-paper text-ink font-heading font-bold text-xs shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-plate"
          >
            <span>📋</span>
            <span>{{ copySuccess ? 'คัดลอกแล้ว!' : 'คัดลอกผลสรุป' }}</span>
          </button>

          <button
            type="button"
            @click="closeModal"
            class="min-h-[44px] px-5 py-2.5 rounded-xl border-2 border-plate bg-flame hover:bg-flame-glow text-white font-heading font-extrabold text-xs sm:text-sm shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation flex items-center gap-1.5 ml-auto focus-visible:ring-2 focus-visible:ring-plate"
          >
            <span>ปิดหน้าต่างเปรียบเทียบ</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed } from 'vue';
import {
  useWorkoutComparison,
  formatDelta,
  getVerdictMeta,
  getSetStatusMeta
} from '../composables/useWorkoutComparison.js';
import { useWorkoutStore } from '../composables/useWorkoutStore.js';

const {
  isOpen,
  data,
  loading,
  error,
  hasComparison,
  baseSession,
  targetSession,
  summary,
  verdictMeta,
  macroDelta,
  exerciseCounts,
  exercises,
  newExercises,
  droppedExercises,
  messageTh,
  fetchComparison,
  fetchLatestPair,
  close
} = useWorkoutComparison();

const { workoutHistory } = useWorkoutStore();

const filterStatus = ref('all');
const showTargetPicker = ref(false);
const selectedTargetId = ref('');
const copySuccess = ref(false);

const availableTargetSessions = computed(() => {
  const list = Array.isArray(workoutHistory.value) ? workoutHistory.value : [];
  if (!baseSession.value) return [];
  return list.filter((s) => s && s.id !== baseSession.value.id);
});

const filteredExercises = computed(() => {
  if (filterStatus.value === 'all') return exercises.value;
  return exercises.value.filter((e) => e.status === filterStatus.value);
});

const hasDuration = computed(() => {
  const d = macroDelta.value?.durationSec;
  return d && d.base !== null && Number.isFinite(d.base) && d.base > 0;
});

const hasDensity = computed(() => {
  const dens = macroDelta.value?.densityKgPerMin;
  return dens && dens.base !== null && Number.isFinite(dens.base) && dens.base > 0;
});

const hasLoad = computed(() => {
  const l = macroDelta.value?.sessionLoadAu;
  return l && l.base !== null && Number.isFinite(l.base);
});

function formatNum(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '0';
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 1 });
}

function deltaClass(diff) {
  if (diff === null || diff === undefined || diff === 0) return 'text-ink-muted';
  return diff > 0 ? 'text-emerald-text' : 'text-flame-text';
}

function getStatusBadgeClass(status) {
  if (status === 'progressed') return 'bg-emerald-bg text-emerald-text border-emerald';
  if (status === 'regressed') return 'bg-flame-bg text-flame-text border-flame';
  return 'bg-paper-subtle text-ink-muted border-plate/30';
}

function getSetBadgeClass(status) {
  if (status === 'progressed') return 'bg-emerald-bg text-emerald-text';
  if (status === 'regressed') return 'bg-flame-bg text-flame-text';
  return 'bg-paper-subtle text-ink-muted';
}

async function switchTargetSession() {
  if (!baseSession.value?.id || !selectedTargetId.value) return;
  try {
    await fetchComparison(baseSession.value.id, selectedTargetId.value);
    showTargetPicker.value = false;
  } catch (err) {}
}

async function retryFetch() {
  if (baseSession.value?.id) {
    if (selectedTargetId.value) {
      await fetchComparison(baseSession.value.id, selectedTargetId.value).catch(() => {});
    } else {
      await fetchLatestPair(baseSession.value.id).catch(() => {});
    }
  }
}

function closeModal() {
  close();
  showTargetPicker.value = false;
  filterStatus.value = 'all';
}

async function copySummaryText() {
  if (!summary.value) return;
  const b = baseSession.value;
  const t = targetSession.value;
  const text = `📊 ผลเปรียบเทียบการฝึกซ้อม GYM:
เซสชัน A: ${b?.date || ''} (${b?.dayTitle || ''})
เซสชัน B: ${t?.date || ''} (${t?.dayTitle || ''})
ข้อสรุป: ${verdictMeta.value.label} (${verdictMeta.value.shortLabel})
${summary.value.summaryTextTh || ''}
โวลุ่ม: ${formatDelta(macroDelta.value.totalVolumeKg?.diff, 'kg')} (${formatDelta(macroDelta.value.totalVolumeKg?.pct, '%', true)})`;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      copySuccess.value = true;
      setTimeout(() => {
        copySuccess.value = false;
      }, 2000);
    }
  } catch (e) {}
}
</script>
