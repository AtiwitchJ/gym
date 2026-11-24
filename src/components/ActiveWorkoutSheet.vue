<template>
  <div
    v-if="isWorkoutActive && activeSession"
    class="fixed inset-0 z-[45] flex flex-col bg-paper text-ink overflow-hidden select-none"
  >
    <!-- Sticky Top Runner Header -->
    <header class="sticky top-0 z-20 bg-paper/95 backdrop-blur-md border-b-2 border-plate shadow-[0_2px_12px_rgba(30,34,32,0.1)] flex-shrink-0">
      <div class="max-w-3xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        <!-- Title & Live Stopwatch Readout -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-bg border border-emerald text-emerald-text text-[11px] font-mono font-bold">
              <span class="w-2 h-2 rounded-full bg-emerald animate-pulse"></span>
              <span>LIVE WORKOUT</span>
            </span>
            <!-- Live Stopwatch Timer -->
            <span class="font-mono tabular-nums text-xs sm:text-sm font-bold text-flame-text bg-flame-bg px-2 py-0.5 rounded-md border border-flame/30">
              ⏱ {{ formattedStopwatch }}
            </span>
          </div>

          <h2 class="text-sm sm:text-base font-bold font-heading text-ink tracking-tight truncate">
            {{ activeSession.title || 'Active Workout Session' }}
          </h2>
          <p v-if="activeSession.subtitle" class="text-[11px] text-ink-muted font-body truncate">
            {{ activeSession.subtitle }}
          </p>
        </div>

        <!-- Header Actions: Add Exercise, Minimize, Discard & Finish Buttons -->
        <div class="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <!-- Minimize Sheet Button -->
          <button
            type="button"
            @click="emit('minimize')"
            class="min-h-[44px] min-w-[44px] px-2 py-1.5 rounded-xl border-2 border-plate bg-surface hover:bg-paper-subtle text-ink font-heading font-bold text-xs shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1"
            title="ย่อหน้าต่างออกกำลังกาย (Minimize)"
          >
            <svg class="w-3.5 h-3.5 stroke-current fill-none stroke-2 text-ink-muted" viewBox="0 0 24 24">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            <span class="hidden sm:inline">ย่อ</span>
          </button>

          <!-- Compact Add Exercise Button -->
          <button
            type="button"
            @click="isPickerOpen = true"
            class="min-h-[44px] min-w-[44px] px-2 sm:px-2.5 py-1.5 rounded-xl border-2 border-plate bg-surface hover:bg-paper-subtle text-ink font-heading font-bold text-xs shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1"
            title="เพิ่มท่าฝึก (Add Exercise)"
          >
            <svg class="w-3.5 h-3.5 stroke-current fill-none stroke-2 text-flame-text" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>+ ท่า</span>
          </button>

          <!-- Discard Button -->
          <button
            type="button"
            @click="handleDiscard"
            class="min-h-[44px] min-w-[44px] px-2.5 sm:px-3 py-1.5 rounded-xl border-2 border-plate/40 hover:border-rose-600 bg-surface hover:bg-rose-50 text-ink-muted hover:text-rose-600 font-heading font-bold text-xs shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1"
            title="ยกเลิกการออกกำลังกายนี้"
          >
            <svg class="w-3.5 h-3.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span class="hidden xs:inline">ยกเลิก</span>
          </button>

          <!-- Finish Session Button -->
          <button
            type="button"
            @click="handleFinish"
            class="min-h-[44px] min-w-[44px] px-3.5 sm:px-4 py-1.5 rounded-xl border-2 border-plate bg-emerald hover:bg-emerald-600 text-white font-heading font-bold text-xs sm:text-sm shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1.5"
            title="บันทึกการฝึกและจบรอบนี้"
          >
            <svg class="w-4 h-4 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>บันทึกการฝึก</span>
          </button>
        </div>
      </div>

      <!-- Quick Session Live Progress Strip -->
      <div class="bg-paper-subtle border-t border-plate/15 px-3 sm:px-4 py-1.5 text-[11px] font-mono flex items-center justify-between text-ink-muted">
        <div class="flex items-center gap-2">
          <span>ความคืบหน้า:</span>
          <strong class="text-ink font-bold">{{ completedSetsTotal }} / {{ totalSetsTotal }} เซ็ต</strong>
          <span class="text-plate/30">•</span>
          <span class="text-flame-text font-bold">{{ sessionProgressPercent }}%</span>
        </div>
        <div class="flex items-center gap-1">
          <span>ปริมาณสะสม:</span>
          <strong class="text-ink font-bold">{{ formatNumber(liveVolumeKg) }} กก.</strong>
        </div>
      </div>
    </header>

    <!-- Scrollable Exercises List -->
    <main class="flex-1 overflow-y-auto px-2.5 sm:px-4 py-3 sm:py-4 space-y-3.5 pb-36">
      <div class="max-w-3xl mx-auto space-y-3.5">
        <!-- Empty Workout State -->
        <div
          v-if="!activeSession.exercises || activeSession.exercises.length === 0"
          class="text-center py-12 px-4 bg-surface border-2 border-dashed border-plate/30 rounded-2xl"
        >
          <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-paper-dim border-2 border-plate/20 flex items-center justify-center text-ink-muted">
            <svg class="w-6 h-6 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
              <path d="M4 6h16M4 18h16M9 6v12M15 6v12M2 9h2v6H2zM20 9h2v6h-2z" />
            </svg>
          </div>
          <p class="text-sm font-bold font-heading text-ink mb-1">
            ยังไม่มีท่าออกกำลังกายในรอบนี้
          </p>
          <p class="text-xs text-ink-muted mb-4 font-body">
            กดปุ่มด้านล่างเพื่อเพิ่มท่าที่คุณต้องการเล่น
          </p>
          <button
            type="button"
            @click="isPickerOpen = true"
            class="px-4 py-2 text-xs font-heading font-bold border-2 border-plate bg-flame hover:bg-flame-glow text-white rounded-xl shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            + เพิ่มท่าเล่นแรก
          </button>
        </div>

        <!-- Exercise Cards -->
        <div
          v-for="(exercise, exIdx) in activeSession.exercises"
          :key="exercise.exerciseId + '_' + exIdx"
          class="archive-card p-3 sm:p-4 bg-surface border-2 border-plate rounded-2xl shadow-[2.5px_2.5px_0px_#1e2220] space-y-2.5"
        >
          <!-- Exercise Header -->
          <div class="pb-2 border-b-2 border-plate/15 space-y-1.5">
            <!-- Top Row: Sequence Badge, Reorder Controls, Badges, and Delete Button -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                <span class="w-5 h-5 rounded-md bg-plate text-white text-[11px] font-mono font-bold flex items-center justify-center flex-shrink-0">
                  #{{ exIdx + 1 }}
                </span>

                <!-- Reorder Exercise Controls (Move Up / Down) -->
                <div class="inline-flex items-center rounded-lg border-2 border-plate/30 bg-white shadow-xs overflow-hidden flex-shrink-0">
                  <button
                    type="button"
                    @click="handleMoveExerciseUp(exIdx)"
                    :disabled="exIdx === 0"
                    class="min-h-[44px] min-w-[44px] px-1.5 flex items-center justify-center text-xs font-bold text-ink hover:bg-paper-dim disabled:opacity-20 disabled:cursor-not-allowed border-r-2 border-plate/20 touch-manipulation focus-visible:ring-2 focus-visible:ring-plate transition-colors"
                    :title="`เลื่อนท่าที่ ${exIdx + 1} (${exercise.name}) ขึ้น`"
                    :aria-label="`เลื่อนท่าที่ ${exIdx + 1} ขึ้น`"
                  >
                    <svg class="w-3.5 h-3.5 stroke-current fill-none stroke-[2.5]" viewBox="0 0 24 24">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    @click="handleMoveExerciseDown(exIdx)"
                    :disabled="exIdx === activeSession.exercises.length - 1"
                    class="min-h-[44px] min-w-[44px] px-1.5 flex items-center justify-center text-xs font-bold text-ink hover:bg-paper-dim disabled:opacity-20 disabled:cursor-not-allowed touch-manipulation focus-visible:ring-2 focus-visible:ring-plate transition-colors"
                    :title="`เลื่อนท่าที่ ${exIdx + 1} (${exercise.name}) ลง`"
                    :aria-label="`เลื่อนท่าที่ ${exIdx + 1} ลง`"
                  >
                    <svg class="w-3.5 h-3.5 stroke-current fill-none stroke-[2.5]" viewBox="0 0 24 24">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>

                <span
                  class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border flex-shrink-0"
                  :class="getMuscleBadgeClass(exercise.muscleGroup)"
                >
                  {{ getMuscleLabel(exercise.muscleGroup) }}
                </span>
                <span class="text-[11px] font-mono px-2 py-0.5 rounded-full capitalize bg-surface-card border border-plate/20 text-ink-muted flex-shrink-0">
                  {{ exercise.equipment || 'อุปกรณ์' }}
                </span>
                <span v-if="exercise.restSec" class="text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-paper-subtle text-ink-muted flex-shrink-0">
                  พัก {{ exercise.restSec }}s
                </span>
                <!-- Exercise Header PR Badge if any set has a PR -->
                <span
                  v-if="exerciseHasPr(exercise)"
                  class="live-ex-pr-badge text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-gold text-ink border-2 border-plate select-none flex-shrink-0 animate-in zoom-in-75 duration-200"
                  title="มีเซ็ตที่ทำสถิติใหม่ (PR) ในรอบนี้"
                >
                  🏆 PR
                </span>
              </div>

              <!-- Delete Exercise Button (Placed on top right corner for safety and symmetry) -->
              <button
                type="button"
                @click="handleRemoveExercise(exIdx, exercise.name)"
                class="min-h-[44px] min-w-[44px] w-8 h-8 rounded-lg border-2 border-rose-300 hover:border-rose-600 bg-rose-50 text-rose-600 flex items-center justify-center shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex-shrink-0"
                title="ลบท่านี้ออกจากรอบฝึก"
                :aria-label="`ลบท่าที่ ${exIdx + 1}`"
              >
                <svg class="w-4 h-4 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>

            <!-- Middle Row: Exercise Title with Full Width -->
            <div class="pt-0.5">
              <h3 class="text-sm sm:text-base font-bold font-heading text-ink leading-snug">
                {{ exercise.name }}
              </h3>
            </div>

            <!-- Bottom Row: Action Toolbar (Video, Substitute, Add Set) -->
            <div class="flex items-center gap-1.5 flex-wrap pt-0.5">
              <!-- Video Demo Button -->
              <button
                v-if="getExerciseVideoInfo(exercise.exerciseId, exIdx).videoId || getExerciseVideoInfo(exercise.exerciseId, exIdx).machineOptions.length > 0"
                type="button"
                @click="toggleExerciseVideo(exIdx)"
                class="min-h-[44px] min-w-[44px] px-2.5 py-1 text-[11px] font-heading font-bold rounded-lg border-2 border-plate shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1 select-none"
                :class="activeVideos[exIdx] ? 'bg-flame text-white' : 'bg-paper hover:bg-paper-dim text-ink'"
                :title="activeVideos[exIdx] ? 'ปิดคลิป' : 'ดูคลิปสาธิต YouTube'"
              >
                <span>{{ activeVideos[exIdx] ? '✕ ปิด' : (getExerciseVideoInfo(exercise.exerciseId, exIdx).hasMultiMachine ? '🎬 3 เครื่อง' : '🎬 คลิป') }}</span>
              </button>

              <!-- Substitute Exercise Button -->
              <button
                type="button"
                @click="openSubstituteModal(exIdx)"
                :disabled="isAllSetsDone(exercise)"
                class="min-h-[44px] min-w-[44px] px-3 py-1 text-[11px] font-heading font-bold rounded-lg border-2 border-plate shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1 select-none disabled:opacity-25 disabled:cursor-not-allowed"
                :class="isAllSetsDone(exercise) ? 'bg-paper-dim text-ink-muted' : 'bg-paper hover:bg-paper-dim text-ink'"
                :title="isAllSetsDone(exercise) ? 'ทำครบทุกเซ็ตแล้ว ไม่สามารถสลับท่าได้' : `สลับท่าทดแทนสำหรับ ${exercise.name}`"
                :aria-label="`สลับท่าทดแทนสำหรับท่าที่ ${exIdx + 1}`"
              >
                <span class="text-xs">🔄</span>
                <span>สลับท่า</span>
              </button>

              <!-- Exercise Setup & Form Note Button -->
              <button
                type="button"
                @click="openNoteModal(exercise, exIdx)"
                class="min-h-[44px] min-w-[44px] px-2.5 py-1 text-[11px] font-heading font-bold rounded-lg border-2 border-plate shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1 select-none"
                :class="hasNote(exercise.exerciseId) ? 'bg-emerald-bg text-emerald-text border-emerald hover:bg-emerald-bg/80' : 'bg-paper hover:bg-paper-dim text-ink'"
                :title="hasNote(exercise.exerciseId) ? 'ดู/แก้ไขการตั้งค่าเครื่องและคิวฟอร์ม' : 'บันทึกการตั้งค่าเครื่องและคิวฟอร์มสำหรับท่านี้'"
                :aria-label="`การตั้งค่าและโน้ตสำหรับท่า ${exercise.name}`"
              >
                <span>{{ hasNote(exercise.exerciseId) ? '⚙️' : '📝' }}</span>
                <span>{{ hasNote(exercise.exerciseId) ? 'ตั้งค่า/โน้ต' : '+ โน้ตเครื่อง' }}</span>
              </button>

              <!-- Warmup Sets Helper Button -->
              <button
                type="button"
                @click="handleInsertWarmup(exIdx)"
                :disabled="hasWarmupSets(exercise)"
                class="btn-add-warmup min-h-[44px] min-w-[44px] px-2.5 py-1 text-[11px] font-heading font-bold rounded-lg border-2 border-plate shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1 select-none disabled:opacity-40 disabled:cursor-not-allowed"
                :class="hasWarmupSets(exercise) ? 'bg-paper-dim text-ink-muted' : 'bg-gold-bg hover:bg-gold-bg/80 text-ink border-gold/70'"
                :title="hasWarmupSets(exercise) ? 'มีเซ็ตวอร์มแล้ว — ไม่เพิ่มซ้ำ' : 'เพิ่มเซ็ตวอร์มคำนวณอัตโนมัติ 40% · 60% · 80% (ค่าประมาณให้ปรับเอง)'"
                :aria-label="`เพิ่มเซ็ตวอร์มสำหรับ ${exercise.name}`"
              >
                <span>🔥</span>
                <span>{{ hasWarmupSets(exercise) ? 'มีวอร์มแล้ว' : '+ วอร์ม' }}</span>
              </button>

              <!-- Barbell Plate Calculator Button for Exercise -->
              <button
                v-if="isBarbellExercise(exercise)"
                type="button"
                @click="openPlatesForExercise(exercise, exIdx)"
                class="btn-exercise-plate-calc min-h-[44px] min-w-[44px] px-2.5 py-1 text-[11px] font-heading font-bold rounded-lg border-2 border-plate shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1 select-none bg-gold hover:bg-gold-glow text-ink"
                :title="`คำนวณแผ่นน้ำหนักบาร์เบลสำหรับ ${exercise.name}`"
                :aria-label="`คำนวณแผ่นน้ำหนักบาร์เบลสำหรับ ${exercise.name}`"
              >
                <span>🏋️</span>
                <span>คำนวณแผ่น</span>
              </button>

              <!-- Add Set Button -->
              <button
                type="button"
                @click="addSet(exIdx)"
                class="min-h-[44px] min-w-[44px] px-3 py-1 text-[11px] font-heading font-bold rounded-lg border-2 border-plate bg-paper hover:bg-paper-dim text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1"
                title="เพิ่มเซ็ตใหม่สำหรับท่านี้"
              >
                <span class="text-flame-text font-bold">+</span>
                <span>เพิ่มเซ็ต</span>
              </button>
            </div>
          </div>

          <!-- Expandable Video Player Box -->
          <div
            v-if="activeVideos[exIdx]"
            class="p-2.5 bg-paper-subtle rounded-xl border-2 border-plate shadow-xs"
          >
            <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-xs font-mono font-bold text-ink flex items-center gap-1">
                  <span class="text-flame-text">🔴</span>
                  <span>YouTube สอนเล่น</span>
                </span>
                <span
                  v-if="getExerciseVideoInfo(exercise.exerciseId, exIdx).hasMultiMachine"
                  class="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-flame-bg text-flame-text border border-flame/30"
                >
                  3 เครื่องทางเลือก
                </span>
              </div>
              <div class="flex items-center gap-2">
                <a
                  v-if="getExerciseVideoInfo(exercise.exerciseId, exIdx).videoUrl"
                  :href="getExerciseVideoInfo(exercise.exerciseId, exIdx).videoUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[11px] font-mono font-bold text-flame-text hover:underline"
                >
                  เปิด YouTube ↗
                </a>
                <button
                  type="button"
                  @click="activeVideos[exIdx] = false"
                  class="min-h-[44px] min-w-[44px] text-[11px] font-mono font-bold text-ink-muted hover:text-ink px-1.5 py-0.5 bg-surface rounded border border-plate/20"
                >
                  ✕ ปิดคลิป
                </button>
              </div>
            </div>

            <!-- 3-Machine Selector (When exercise has alternative machines in gym) -->
            <div
              v-if="getExerciseVideoInfo(exercise.exerciseId, exIdx).hasMultiMachine"
              class="mb-2 p-1.5 bg-surface rounded-lg border border-plate/30"
            >
              <div class="text-[11px] font-mono text-ink-muted mb-1 flex items-center justify-between">
                <span>เลือกเครื่องที่ยิมมี (เผื่อยิมไม่มีเครื่องหลัก):</span>
                <span class="text-flame-text font-bold">แบบ {{ getExerciseVideoInfo(exercise.exerciseId, exIdx).selectedIdx + 1 }}/{{ getExerciseVideoInfo(exercise.exerciseId, exIdx).machineOptions.length }}</span>
              </div>
              <div class="grid grid-cols-3 gap-1">
                <button
                  v-for="(m, mIdx) in getExerciseVideoInfo(exercise.exerciseId, exIdx).machineOptions"
                  :key="mIdx"
                  type="button"
                  @click="selectExerciseMachine(exIdx, mIdx)"
                  class="p-1 rounded text-left border transition-all text-[11px] flex flex-col justify-between"
                  :class="getExerciseVideoInfo(exercise.exerciseId, exIdx).selectedIdx === mIdx
                    ? 'bg-flame text-white border-plate shadow-xs font-bold'
                    : 'bg-paper-subtle text-ink border-plate/30'"
                >
                  <span class="truncate">เครื่องที่ {{ mIdx + 1 }}</span>
                  <span class="truncate opacity-80">{{ m.shortName || m.name }}</span>
                </button>
              </div>
            </div>

            <!-- YouTube Video Player -->
            <div class="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-plate bg-black">
              <iframe
                v-if="getExerciseVideoInfo(exercise.exerciseId, exIdx).activeEmbedUrl"
                :src="getExerciseVideoInfo(exercise.exerciseId, exIdx).activeEmbedUrl"
                class="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              ></iframe>
            </div>
          </div>

          <!-- Progressive Overload Advice Chip Banner -->
          <div
            v-if="getOverloadAdvice(exercise.exerciseId)"
            class="p-2 rounded-xl bg-flame-bg/70 border border-flame/40 flex items-center justify-between gap-2 text-xs font-mono"
          >
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="text-flame-text font-bold flex-shrink-0">⚡ คำแนะนำ:</span>
              <span class="text-ink font-bold truncate">
                {{ getOverloadAdvice(exercise.exerciseId).headline }}
              </span>
            </div>
            <span
              class="px-2 py-0.5 rounded-full text-[11px] font-bold border border-plate flex-shrink-0"
              :class="getOverloadAdvice(exercise.exerciseId).badgeClass"
            >
              {{ getOverloadAdvice(exercise.exerciseId).badgeText }}
            </span>
          </div>

          <!-- Exercise Machine Setup & Form Cues Pill Banner (Visible when note has content) -->
          <div
            v-if="hasNote(exercise.exerciseId)"
            @click="openNoteModal(exercise, exIdx)"
            class="exercise-note-pill p-2 sm:p-2.5 rounded-xl bg-paper-subtle border border-plate/30 hover:border-plate/60 flex items-center justify-between gap-2 text-xs font-mono cursor-pointer transition-all min-h-[44px] touch-manipulation shadow-xs"
            title="แตะเพื่อดูหรือแก้ไขการตั้งค่าเครื่องและคิวฟอร์ม"
            :aria-label="`การตั้งค่าเครื่องและคิวฟอร์ม: ${formatSummaryPill(exercise.exerciseId)}`"
          >
            <div class="flex items-center gap-1.5 min-w-0 flex-1">
              <span class="text-sm select-none flex-shrink-0">📌</span>
              <span class="text-ink font-bold truncate text-[11px] sm:text-xs">
                {{ formatSummaryPill(exercise.exerciseId) }}
              </span>
            </div>
            <button
              type="button"
              @click.stop="openNoteModal(exercise, exIdx)"
              class="min-h-[44px] min-w-[44px] px-2.5 py-1 rounded-lg border border-plate/30 bg-white hover:bg-paper text-ink font-mono font-bold text-[11px] flex items-center gap-1 flex-shrink-0 shadow-xs active:translate-x-[0.5px] active:translate-y-[0.5px] touch-manipulation"
              title="แก้ไขการตั้งค่าและคิวฟอร์ม"
            >
              ✏️ แก้ไข
            </button>
          </div>

          <!-- Warmup Guidance Banner (Visible when exercise has warmup sets) -->
          <div
            v-if="hasWarmupSets(exercise)"
            class="warmup-notice-banner p-2 sm:p-2.5 rounded-xl bg-gold-bg/60 border border-gold/50 flex items-center justify-between gap-2 text-xs font-mono select-none shadow-xs"
            title="เซ็ตวอร์มคำนวณจากเปอร์เซ็นต์ของเซ็ตจริง เป็นค่าประมาณที่สามารถปรับน้ำหนักและจำนวนครั้งได้ตามความเหมาะสม"
            :aria-label="`เซ็ตวอร์มสำหรับ ${exercise.name}: 40% · 60% · 80% เป็นค่าประมาณให้ปรับเอง`"
          >
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="text-sm select-none flex-shrink-0">🔥</span>
              <span class="text-ink font-bold truncate text-[11px] sm:text-xs">
                เซ็ตวอร์ม: 40% · 60% · 80% (ค่าประมาณให้ปรับเอง)
              </span>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white text-ink border border-gold/40 flex-shrink-0 shadow-xs">
              ค่าประมาณให้ปรับเอง
            </span>
          </div>

          <!-- Sets Table -->
          <div class="space-y-1.5">
            <!-- Table Header: เซ็ต | ครั้งก่อน | น้ำหนัก | ครั้ง | เสร็จ -->
            <div class="grid grid-cols-12 gap-1.5 text-center text-[11px] font-mono font-bold text-ink-muted uppercase py-1 px-1 border-b border-plate/15">
              <div class="col-span-2 text-left pl-1">เซ็ต</div>
              <div class="col-span-3 text-center">ครั้งก่อน</div>
              <div class="col-span-3 text-center">น้ำหนัก (กก.)</div>
              <div class="col-span-2 text-center">จำนวนครั้ง</div>
              <div class="col-span-2 text-center">✓</div>
            </div>

            <!-- Set Rows -->
            <div
              v-for="(set, setIdx) in exercise.sets"
              :key="setIdx"
              class="rounded-xl border p-2 transition-all"
              :class="set.completed
                ? 'bg-emerald-bg/40 border-emerald/50'
                : 'bg-paper-subtle border-plate/25 hover:border-plate/60'"
            >
              <!-- Line 1: set number, type, previous record, Done (56 px) -->
              <div class="flex items-center gap-2">
                <div class="flex items-center gap-1.5 min-w-0 flex-1">
                  <span class="font-mono font-bold text-xs tabular-nums text-ink">{{ setIdx + 1 }}</span>
                  <button
                    type="button"
                    @click="cycleSetType(exIdx, setIdx)"
                    class="min-h-[44px] min-w-[44px] px-2 rounded text-[11px] font-mono font-bold uppercase border leading-none transition-colors"
                    :class="getSetTypeBadgeClass(set.type)"
                    :title="`ประเภทเซ็ต: ${getSetTypeShort(set.type)} (แตะเพื่อสลับ วอร์ม / ทำจริง / ดรอป / ล้มเหลว)`"
                  >
                    {{ getSetTypeShort(set.type) }}
                  </button>
                  <!-- Warmup estimate hint on set row -->
                  <span
                    v-if="isWarmSetType(set.type) || Boolean(set.isWarm)"
                    class="warmup-estimate-tag text-[11px] font-mono font-bold text-gold px-1.5 py-0.5 rounded bg-gold-bg/70 border border-gold/40 flex-shrink-0"
                    title="น้ำหนักและจำนวนครั้งสำหรับเซ็ตวอร์มเป็นค่าประมาณ สามารถแตะปรับได้ตามความรู้สึก"
                  >
                    ค่าประมาณ
                  </span>
                  <span class="text-[11px] font-mono font-medium text-ink-muted truncate">{{ getPreviousPerformanceText(exercise.exerciseId, setIdx) }}</span>
                  <!-- Live PR Badge on Qualifying Set -->
                  <span
                    v-if="set.isPr"
                    class="live-pr-badge text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-gold text-ink border-2 border-plate select-none flex-shrink-0 animate-in zoom-in-75 duration-200"
                    title="ทำสถิติใหม่ (PR) เมื่อเทียบกับสถิติที่บันทึกไว้"
                  >🏆 PR</span>
                  <!-- Plate Calculator Button for Set (Barbell only) -->
                  <button
                    v-if="isBarbellExercise(exercise)"
                    type="button"
                    @click="openPlatesForSet(exercise, exIdx, set, setIdx)"
                    class="btn-set-plate-calc min-h-[44px] min-w-[44px] px-2 py-0.5 rounded-lg border border-plate/30 bg-gold/15 hover:bg-gold/30 text-ink text-[11px] font-mono font-bold flex items-center gap-1 shadow-xs active:translate-x-[0.5px] active:translate-y-[0.5px] transition-all flex-shrink-0 touch-manipulation"
                    :title="`คำนวณแผ่นบาร์เบลสำหรับเซ็ตที่ ${setIdx + 1} (${formatWeight(set.weight ?? set.targetWeight)} กก.)`"
                    :aria-label="`คำนวณแผ่นบาร์เบลเซ็ตที่ ${setIdx + 1}`"
                  >
                    <span class="text-xs">🏋️</span>
                    <span>แผ่น</span>
                  </button>
                </div>
                <button
                  type="button"
                  @click="handleToggleSet(exIdx, setIdx)"
                  class="w-14 h-14 flex-shrink-0 rounded-xl border-2 border-plate flex items-center justify-center transition-all select-none touch-manipulation"
                  :class="set.completed
                    ? 'bg-emerald text-white shadow-[1.5px_1.5px_0px_#059669]'
                    : 'bg-white hover:bg-paper-dim text-ink-muted shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'"
                  :title="set.completed ? 'ทำเครื่องหมายว่ายังไม่เสร็จ' : 'ทำเครื่องหมายว่าเสร็จแล้ว (เริ่มนับเวลาพัก)'"
                >
                  <svg class="w-5 h-5 stroke-current fill-none stroke-[2.5]" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              </div>

              <!-- Line 2: ± steppers for weight and reps (tap the value to type it) -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <div class="flex items-center gap-1 min-w-0">
                  <button type="button" @click="stepSheetWeight(exIdx, setIdx, -1, set)" class="w-14 h-14 flex-shrink-0 rounded-xl border-2 border-plate bg-surface text-xl font-extrabold text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none touch-manipulation" aria-label="ลดน้ำหนัก">−</button>
                  <button
                    type="button"
                    @click="openWeightKeypad(exercise, exIdx, set, setIdx)"
                    class="flex-1 min-w-0 h-14 rounded-xl border-2 border-plate bg-white flex flex-col items-center justify-center touch-manipulation"
                    :title="`ใส่น้ำหนักเซ็ตที่ ${setIdx + 1}`"
                  >
                    <span class="tabular-nums font-extrabold text-base text-ink leading-none">{{ formatWeight(set.weight ?? set.targetWeight) }}</span>
                    <span class="text-[11px] text-flame-text font-bold leading-none mt-0.5">kg</span>
                  </button>
                  <button type="button" @click="stepSheetWeight(exIdx, setIdx, 1, set)" class="w-14 h-14 flex-shrink-0 rounded-xl border-2 border-plate bg-surface text-xl font-extrabold text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none touch-manipulation" aria-label="เพิ่มน้ำหนัก">+</button>
                </div>
                <div class="flex items-center gap-1 min-w-0">
                  <button type="button" @click="stepSheetReps(exIdx, setIdx, -1, set)" class="w-14 h-14 flex-shrink-0 rounded-xl border-2 border-plate bg-surface text-xl font-extrabold text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none touch-manipulation" aria-label="ลดจำนวนครั้ง">−</button>
                  <button
                    type="button"
                    @click="openRepsKeypad(exercise, exIdx, set, setIdx)"
                    class="flex-1 min-w-0 h-14 rounded-xl border-2 border-plate bg-white flex flex-col items-center justify-center touch-manipulation"
                    :title="`ใส่จำนวนครั้งเซ็ตที่ ${setIdx + 1}`"
                  >
                    <span class="tabular-nums font-extrabold text-base text-ink leading-none">{{ set.reps ?? set.targetReps ?? 8 }}</span>
                    <span class="text-[11px] text-sky-text font-bold leading-none mt-0.5">ครั้ง</span>
                  </button>
                  <button type="button" @click="stepSheetReps(exIdx, setIdx, 1, set)" class="w-14 h-14 flex-shrink-0 rounded-xl border-2 border-plate bg-surface text-xl font-extrabold text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none touch-manipulation" aria-label="เพิ่มจำนวนครั้ง">+</button>
                </div>
              </div>

              <!-- Line 3: Per-set RIR Recording (Optional, appears when set is completed or has RIR) -->
              <div
                v-if="set.completed || set.rir !== null"
                class="mt-2.5 pt-2 border-t border-plate/15 flex flex-col gap-1.5"
                data-testid="set-rir-container"
              >
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs font-mono font-bold text-ink">ความเหนื่อย RIR</span>
                    <span class="text-[11px] font-mono text-ink-muted">(ไม่บังคับ)</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <button
                      v-for="opt in RIR_CHOICES"
                      :key="opt.value"
                      type="button"
                      @click="handlePickSetRir(exIdx, setIdx, opt)"
                      :aria-label="`เซ็ตที่ ${setIdx + 1} RIR ${opt.label}`"
                      :title="opt.title"
                      class="btn-set-rir min-h-[44px] min-w-[44px] px-3 rounded-xl border-2 border-plate text-xs font-heading font-bold transition-all touch-manipulation flex items-center justify-center select-none"
                      :class="isSetRirChoiceSelected(set, opt)
                        ? 'bg-flame text-white shadow-[1.5px_1.5px_0px_#1e2220] border-plate ring-2 ring-flame/30'
                        : 'bg-surface hover:bg-paper-subtle text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                </div>
                <p class="text-[11px] font-body text-ink-muted leading-tight">
                  เหลือ 2+ = ยกต่อได้ 2 ครั้งขึ้นไป · เหลือ 1 = อีก 1 ครั้ง · ล้ม = ยกต่อไม่ได้
                </p>
              </div>

              <!-- Remove set (only when there is more than one set) -->
              <div v-if="exercise.sets.length > 1" class="flex justify-end mt-1">
                <button
                  type="button"
                  @click="removeSet(exIdx, setIdx)"
                  class="min-h-[44px] px-3 rounded-lg text-xs font-bold text-ink-muted hover:text-rose-600 hover:bg-rose-50"
                  title="ลบเซ็ตนี้"
                >
                  ลบเซ็ต ✕
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Add Exercise on the Fly Action Button -->
        <div class="pt-1">
          <button
            type="button"
            @click="isPickerOpen = true"
            class="w-full py-3 px-4 bg-surface hover:bg-paper-subtle text-ink font-heading font-bold text-xs sm:text-sm rounded-2xl border-2 border-plate shadow-[2.5px_2.5px_0px_#1e2220] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all flex items-center justify-center gap-2 touch-manipulation"
          >
            <svg class="w-4 h-4 stroke-current fill-none stroke-2 text-flame-text" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>+ เพิ่มท่าเล่นระหว่างออกกำลัง (Add Exercise)</span>
          </button>
        </div>
      </div>
    </main>

    <!-- Docked Rest Timer & Bottom Controller Bar -->
    <div class="fixed bottom-0 left-0 right-0 z-30 bg-paper/95 backdrop-blur-md border-t-2 border-plate shadow-[0_-4px_20px_rgba(30,34,32,0.15)] flex-shrink-0">
      <RestTimer />
    </div>

    <!-- Embedded Exercise Library Picker Modal -->
    <ExerciseLibraryModal
      :is-open="isPickerOpen"
      mode="picker"
      @close="isPickerOpen = false"
      @select="handleExerciseSelected"
    />

    <!-- Embedded Exercise Substitution Modal -->
    <ExerciseSubstitutionModal
      :is-open="isSubstituteModalOpen"
      :exercise="activeSubstituteExercise"
      :exercise-index="activeSubstituteIndex"
      :active-sets="activeSubstituteExercise?.sets || []"
      mode="active_session"
      @close="isSubstituteModalOpen = false"
      @confirm-active="handleActiveSubstituteSwapped"
    />

    <!-- Embedded Exercise Note Modal: Machine Setup & Form Cues -->
    <ExerciseNoteModal
      :is-open="isNoteModalOpen"
      :exercise-id="activeNoteExercise?.exerciseId"
      :exercise-name="activeNoteExercise?.name"
      @close="isNoteModalOpen = false"
      @saved="handleNoteSaved"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useActiveSessionStore } from '../composables/useActiveSessionStore.js';
import { useExerciseStore } from '../composables/useExerciseStore.js';
import { useWorkoutStore } from '../composables/useWorkoutStore.js';
import { usePinKeypad } from '../composables/usePinKeypad.js';
import { useWeightAdvisor } from '../composables/useWeightAdvisor.js';
import { getYoutubeId } from '../utils/youtube.js';
import { stepFrom, WEIGHT_STEP_KG, REPS_STEP } from '../composables/useSetStepper.js';
import { getBaselineE1rm, getCachedBaseline, evaluateExercisePrs } from '../composables/usePersonalRecords.js';
import { useExerciseNotes } from '../composables/useExerciseNotes.js';
import { isWarmSetType } from '../composables/warmupCalc.js';
import { usePlateCalculator, isBarbellExercise } from '../composables/usePlateCalculator.js';
import { RIR_CHOICES, normalizeRir, nextRirSelection, isRirChoiceSelected } from '../composables/useRir.js';
import RestTimer from './RestTimer.vue';
import ExerciseLibraryModal from './ExerciseLibraryModal.vue';
import ExerciseSubstitutionModal from './ExerciseSubstitutionModal.vue';
import ExerciseNoteModal from './ExerciseNoteModal.vue';

const emit = defineEmits(['finish', 'discard', 'minimize']);

const {
  isWorkoutActive,
  activeSession,
  sessionDurationSec,
  sessionHistory,
  addExerciseToActiveSession,
  removeExerciseFromActiveSession,
  moveExercise,
  moveExerciseUp,
  moveExerciseDown,
  substituteExercise,
  insertWarmupSetsToActiveExercise,
  hasWarmupSets,
  getExerciseWorkingWeight,
  applyPlateWeightToActiveSet,
  addSet: storeAddSet,
  removeSet: storeRemoveSet,
  updateSetMetric,
  updateSetRir,
  toggleSetComplete,
  finishSession,
  discardSession,
  calculateTotalWorkingVolume,
  persistDraft
} = useActiveSessionStore();

const { showToast } = useWorkoutStore();
const { openKeypad } = usePinKeypad();
const { openPlateCalculator } = usePlateCalculator();
const { getExerciseOverallAdvice } = useWeightAdvisor();
const { getExerciseById } = useExerciseStore();

const isPickerOpen = ref(false);
const isSubstituteModalOpen = ref(false);
const activeSubstituteExercise = ref(null);
const activeSubstituteIndex = ref(-1);
const activeVideos = ref({});
const activeMachineIndices = ref({});

// Exercise Machine Setup & Form Cues Modal State
const { hasNote, formatSummaryPill } = useExerciseNotes();
const isNoteModalOpen = ref(false);
const activeNoteExercise = ref(null);
const activeNoteIndex = ref(-1);

function openNoteModal(exercise, exIdx) {
  activeNoteExercise.value = exercise;
  activeNoteIndex.value = exIdx;
  isNoteModalOpen.value = true;
}

function handleNoteSaved(payload) {
  const isOffline = payload && payload.offline;
  if (isOffline) {
    showToast(`บันทึกโน้ต «${activeNoteExercise.value?.name || 'ท่าฝึก'}» ในเครื่องเรียบร้อย (ออฟไลน์)`);
  } else {
    showToast(`บันทึกการตั้งค่าเครื่อง «${activeNoteExercise.value?.name || 'ท่าฝึก'}» เรียบร้อย`);
  }
}

function getExerciseVideoInfo(exerciseId, exIdx = null) {
  const meta = getExerciseById(exerciseId);
  if (!meta) {
    return {
      videoUrl: null,
      videoId: null,
      machineOptions: [],
      hasMultiMachine: false,
      activeEmbedUrl: null,
      activeMachine: {},
      selectedIdx: 0
    };
  }

  let machineOptions = [];
  if (Array.isArray(meta.machineVideos) && meta.machineVideos.length > 0) {
    machineOptions = meta.machineVideos;
  } else if (meta.videoUrl) {
    machineOptions = [{
      name: meta.name,
      shortName: 'เครื่องหลัก',
      equipment: meta.equipment || meta.name,
      videoUrl: meta.videoUrl
    }];
  }

  const selectedIdx = (exIdx !== null && activeMachineIndices.value[exIdx] !== undefined)
    ? activeMachineIndices.value[exIdx]
    : 0;

  const activeMachine = machineOptions[selectedIdx] || machineOptions[0] || {};
  const activeVideoUrl = activeMachine.videoUrl || meta.videoUrl || '';
  const videoId = getYoutubeId(activeVideoUrl);
  const activeEmbedUrl = videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0` : null;

  return {
    videoUrl: activeVideoUrl,
    videoId,
    machineOptions,
    hasMultiMachine: machineOptions.length > 1,
    activeEmbedUrl,
    activeMachine,
    selectedIdx
  };
}

function selectExerciseMachine(exIdx, mIdx) {
  activeMachineIndices.value[exIdx] = mIdx;
}

function toggleExerciseVideo(exIdx) {
  activeVideos.value[exIdx] = !activeVideos.value[exIdx];
}

// Format Stopwatch Elapsed Time (MM:SS or HH:MM:SS)
const formattedStopwatch = computed(() => {
  const total = sessionDurationSec.value || 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

// Live Working Volume
const liveVolumeKg = computed(() => {
  if (!activeSession.value || !activeSession.value.exercises) return 0;
  return calculateTotalWorkingVolume(activeSession.value.exercises);
});

// Total Sets & Completed Sets
const totalSetsTotal = computed(() => {
  if (!activeSession.value || !Array.isArray(activeSession.value.exercises)) return 0;
  return activeSession.value.exercises.reduce((acc, ex) => acc + (ex.sets ? ex.sets.length : 0), 0);
});

const completedSetsTotal = computed(() => {
  if (!activeSession.value || !Array.isArray(activeSession.value.exercises)) return 0;
  let count = 0;
  activeSession.value.exercises.forEach(ex => {
    (ex.sets || []).forEach(s => {
      if (s && s.completed) count++;
    });
  });
  return count;
});

const sessionProgressPercent = computed(() => {
  if (totalSetsTotal.value === 0) return 0;
  return Math.round((completedSetsTotal.value / totalSetsTotal.value) * 100);
});

// Overload advice cache for exercises
function getOverloadAdvice(exerciseId) {
  if (!exerciseId || !Array.isArray(sessionHistory.value)) return null;
  for (const session of sessionHistory.value) {
    if (!session || !Array.isArray(session.exercises)) continue;
    const match = session.exercises.find(e => e.exerciseId === exerciseId);
    if (match && Array.isArray(match.sets) && match.sets.length > 0) {
      return getExerciseOverallAdvice(match.sets);
    }
  }
  return null;
}

// Previous session performance text for a specific exercise and set
function getPreviousPerformanceText(exerciseId, setIdx) {
  if (!exerciseId || !Array.isArray(sessionHistory.value)) return '—';
  for (const session of sessionHistory.value) {
    if (!session || !Array.isArray(session.exercises)) continue;
    const match = session.exercises.find(e => e.exerciseId === exerciseId);
    if (match && Array.isArray(match.sets) && match.sets[setIdx]) {
      const prevSet = match.sets[setIdx];
      const w = prevSet.weight !== undefined ? prevSet.weight : prevSet.targetWeight;
      const r = prevSet.reps !== undefined ? prevSet.reps : prevSet.targetReps;
      if (w !== undefined && r !== undefined) {
        return `${w}kg × ${r}`;
      }
    }
  }
  return '—';
}

function getPrevWeightOnly(exerciseId, setIdx) {
  if (!exerciseId || !Array.isArray(sessionHistory.value)) return '';
  for (const session of sessionHistory.value) {
    if (!session || !Array.isArray(session.exercises)) continue;
    const match = session.exercises.find(e => e.exerciseId === exerciseId);
    if (match && Array.isArray(match.sets) && match.sets[setIdx]) {
      const prevSet = match.sets[setIdx];
      return prevSet.weight !== undefined ? prevSet.weight : prevSet.targetWeight;
    }
  }
  return '';
}

// Live PR tracking in Active Workout
function exerciseHasPr(exercise) {
  if (!exercise || !Array.isArray(exercise.sets)) return false;
  return exercise.sets.some(s => Boolean(s.completed && s.isPr));
}

async function loadBaselineForExercise(exerciseId) {
  if (!exerciseId) return undefined;
  return await getBaselineE1rm(exerciseId);
}

async function recheckExercisePrs(exIdx, targetSetIdx = null) {
  const ex = activeSession.value?.exercises?.[exIdx];
  if (!ex) return;

  const wasPr = (targetSetIdx !== null && ex.sets?.[targetSetIdx]) ? Boolean(ex.sets[targetSetIdx].isPr) : false;

  await loadBaselineForExercise(ex.exerciseId);
  const baseline = getCachedBaseline(ex.exerciseId);
  evaluateExercisePrs(ex, baseline);
  persistDraft();

  if (targetSetIdx !== null && ex.sets?.[targetSetIdx]) {
    const targetSet = ex.sets[targetSetIdx];
    const isNowCompleted = Boolean(targetSet.completed);
    const isNowPr = Boolean(targetSet.isPr);
    if (isNowCompleted && isNowPr && !wasPr) {
      const w = targetSet.weight ?? targetSet.targetWeight ?? 0;
      const r = targetSet.reps ?? targetSet.targetReps ?? 0;
      const e1rm = targetSet.e1rm || 0;
      showToast(`🏆 PR ใหม่: ${ex.name} ${w} kg × ${r} (e1RM ≈ ${e1rm.toFixed(1)} kg)`);
    }
  }
}

// Add Set & Remove Set wrappers that recheck PRs
function addSet(exIdx) {
  storeAddSet(exIdx);
  recheckExercisePrs(exIdx);
}

function removeSet(exIdx, setIdx) {
  storeRemoveSet(exIdx, setIdx);
  recheckExercisePrs(exIdx);
}

// Cycle Set Type: warmup -> working -> dropset -> failure -> warmup
function cycleSetType(exIdx, setIdx) {
  const rawType = activeSession.value?.exercises?.[exIdx]?.sets?.[setIdx]?.type || 'working';
  const current = rawType === 'warm' ? 'warmup' : rawType;
  const order = ['warmup', 'working', 'dropset', 'failure'];
  const nextIdx = (order.indexOf(current) + 1) % order.length;
  updateSetMetric(exIdx, setIdx, 'type', order[nextIdx]);
  recheckExercisePrs(exIdx, setIdx);
}

function getSetTypeShort(type) {
  switch (type) {
    case 'warm':
    case 'warmup':
      return 'วอร์ม';
    case 'dropset':
      return 'ดรอป';
    case 'failure':
      return 'ล้มเหลว';
    case 'working':
    default:
      return 'ทำจริง';
  }
}

function getSetTypeBadgeClass(type) {
  switch (type) {
    case 'warm':
    case 'warmup':
      return 'bg-gold-bg text-gold border-gold';
    case 'dropset':
      return 'bg-sky-bg text-sky-text border-sky';
    case 'failure':
      return 'bg-rose-50 text-rose-600 border-rose-400';
    case 'working':
    default:
      return 'bg-flame-bg text-flame-text border-flame';
  }
}

// Keypad Numeric Tap Targets
function openWeightKeypad(exercise, exIdx, set, setIdx) {
  const isWarm = set.type === 'warm' || set.type === 'warmup';
  const advice = getOverloadAdvice(exercise.exerciseId);
  const prevW = getPrevWeightOnly(exercise.exerciseId, setIdx);
  const currentVal = set.weight !== undefined && set.weight !== null ? set.weight : (set.targetWeight ?? 0);

  const suggestedWeightVal = isWarm && advice?.warmAdvice?.suggestedWeight !== undefined
    ? advice.warmAdvice.suggestedWeight
    : (advice?.suggestedWeight !== undefined ? advice.suggestedWeight : (set.suggestedWeight !== undefined ? set.suggestedWeight : ''));

  const suggestedLabelVal = isWarm && advice?.warmAdvice?.actionLabel
    ? `แนะนำ: ${advice.warmAdvice.actionLabel}`
    : (advice?.actionLabel ? `แนะนำ: ${advice.actionLabel}` : '');

  openKeypad({
    title: exercise.name,
    subtitle: `เซ็ตที่ ${setIdx + 1} (${isWarm ? 'วอร์ม' : 'เล่นจริง'}) - ใส่น้ำหนัก (กก.)`,
    mode: 'weight',
    unit: 'กก.',
    currentValue: currentVal,
    prevHint: prevW !== '' ? String(prevW) : '',
    suggestedHint: suggestedWeightVal !== '' ? String(suggestedWeightVal) : '',
    suggestedLabel: suggestedLabelVal,
    presets: [1.25, 2.5, 5, -2.5],
    onConfirm: (val) => {
      const num = parseFloat(val);
      updateSetMetric(exIdx, setIdx, 'weight', isNaN(num) ? 0 : num);
      recheckExercisePrs(exIdx, setIdx);
    }
  });
}

// ± steppers on the recording sheet (same step rules as the set rows, step 3)
function stepSheetWeight(exIdx, setIdx, dir, set) {
  const next = stepFrom(set.weight ?? set.targetWeight ?? '', '', dir, WEIGHT_STEP_KG);
  updateSetMetric(exIdx, setIdx, 'weight', next);
  recheckExercisePrs(exIdx, setIdx);
}

function stepSheetReps(exIdx, setIdx, dir, set) {
  const next = stepFrom(set.reps ?? set.targetReps ?? '', '', dir, REPS_STEP);
  updateSetMetric(exIdx, setIdx, 'reps', next);
  recheckExercisePrs(exIdx, setIdx);
}

function openRepsKeypad(exercise, exIdx, set, setIdx) {
  const isWarm = set.type === 'warm' || set.type === 'warmup';
  const currentVal = set.reps !== undefined && set.reps !== null ? set.reps : (set.targetReps ?? 8);
  const targetVal = String(set.targetReps || (isWarm ? 15 : 8));

  openKeypad({
    title: exercise.name,
    subtitle: `เซ็ตที่ ${setIdx + 1} (${isWarm ? 'วอร์ม' : 'เล่นจริง'}) - ใส่จำนวนครั้ง`,
    mode: 'reps',
    unit: 'ครั้ง',
    currentValue: currentVal,
    targetHint: targetVal,
    presets: [1, 2, -1],
    onConfirm: (val) => {
      const num = parseInt(val, 10);
      updateSetMetric(exIdx, setIdx, 'reps', isNaN(num) ? 0 : num);
      recheckExercisePrs(exIdx, setIdx);
    }
  });
}

// Checkmark Completion Toggle
function handleToggleSet(exIdx, setIdx) {
  toggleSetComplete(exIdx, setIdx);
  recheckExercisePrs(exIdx, setIdx);
}

// RIR (Reps in Reserve) Set Feedback
function isSetRirChoiceSelected(set, opt) {
  if (!set) return false;
  return isRirChoiceSelected(set.rir, set.rirPlus, opt);
}

async function handlePickSetRir(exIdx, setIdx, opt) {
  const ex = activeSession.value?.exercises?.[exIdx];
  const set = ex?.sets?.[setIdx];
  if (!set) return;
  const next = nextRirSelection(set.rir, set.rirPlus, opt);
  updateSetRir(exIdx, setIdx, next.rir, next.rirPlus);
  await recheckExercisePrs(exIdx, setIdx);
}

// Add Exercise From Picker
async function handleExerciseSelected(exercise) {
  if (!exercise || !exercise.id) return;
  const newEx = addExerciseToActiveSession(exercise.id);
  isPickerOpen.value = false;
  if (newEx && activeSession.value?.exercises) {
    const idx = activeSession.value.exercises.length - 1;
    await recheckExercisePrs(idx);
  }
}

// Remove Exercise
function handleRemoveExercise(exIdx, name) {
  if (confirm(`คุณต้องการลบท่า "${name}" ออกจากรอบนี้หรือไม่?`)) {
    removeExerciseFromActiveSession(exIdx);
  }
}

// Move Exercise Up / Down
function handleMoveExerciseUp(exIdx) {
  if (exIdx <= 0) return;
  const ok = moveExerciseUp(exIdx);
  if (ok) {
    swapLocalExerciseUiState(exIdx, exIdx - 1);
  }
}

function handleMoveExerciseDown(exIdx) {
  const exercises = activeSession.value?.exercises;
  if (!Array.isArray(exercises) || exIdx >= exercises.length - 1) return;
  const ok = moveExerciseDown(exIdx);
  if (ok) {
    swapLocalExerciseUiState(exIdx, exIdx + 1);
  }
}

function swapLocalExerciseUiState(idxA, idxB) {
  const vidA = activeVideos.value[idxA];
  activeVideos.value[idxA] = activeVideos.value[idxB];
  activeVideos.value[idxB] = vidA;

  const machA = activeMachineIndices.value[idxA];
  activeMachineIndices.value[idxA] = activeMachineIndices.value[idxB];
  activeMachineIndices.value[idxB] = machA;
}

// Exercise Substitution in Active Workout
function isAllSetsDone(ex) {
  if (!ex || !Array.isArray(ex.sets) || ex.sets.length === 0) return false;
  return ex.sets.every(s => Boolean(s.completed));
}

function openSubstituteModal(exIdx) {
  activeSubstituteIndex.value = exIdx;
  activeSubstituteExercise.value = activeSession.value?.exercises?.[exIdx] || null;
  isSubstituteModalOpen.value = true;
}

async function handleActiveSubstituteSwapped({ substitute, customWeight, exerciseIndex }) {
  const idx = typeof exerciseIndex === 'number' ? exerciseIndex : activeSubstituteIndex.value;
  const res = substituteExercise(idx, substitute, { customWeight });
  if (res && res.success) {
    isSubstituteModalOpen.value = false;
    await recheckExercisePrs(idx);
    if (res.mode === 'split') {
      await recheckExercisePrs(idx + 1);
      activeVideos.value[idx + 1] = false;
      showToast(`สลับเซ็ตที่เหลือเป็น «${substitute.name}» สำเร็จ (คงเซ็ตที่ทำเสร็จแล้วในท่าเดิม)`);
    } else {
      activeVideos.value[idx] = false;
      showToast(`สลับเป็นท่า «${substitute.name}» สำเร็จ`);
    }
  }
}

// Warmup Sets Helper
async function handleInsertWarmup(exIdx) {
  const res = insertWarmupSetsToActiveExercise(exIdx);
  if (res && res.success) {
    showToast(`🔥 ${res.message} (ค่าประมาณให้ปรับเอง)`);
    await recheckExercisePrs(exIdx);
  } else if (res) {
    showToast(res.message || 'ไม่สามารถเพิ่มเซ็ตวอร์มได้');
  }
}

// Barbell Plate Calculator Integration
function openPlatesForSet(exercise, exIdx, set, setIdx) {
  if (!exercise || !set) return;
  const rawWeight = set.weight !== undefined && set.weight !== null && set.weight !== ''
    ? Number(set.weight)
    : (set.targetWeight !== undefined && set.targetWeight !== null && set.targetWeight !== '' ? Number(set.targetWeight) : null);

  // If set weight is empty or invalid, do not prefill with arbitrary or silent defaults.
  // Must be null so modal requires user to explicitly select or specify weight.
  const hasValidSetWeight = Boolean(rawWeight && !isNaN(rawWeight) && rawWeight > 0);
  const startWeight = hasValidSetWeight ? rawWeight : null;

  // Ensure unique persistent identity for the target set to guard against reorder/deletion
  if (!set._setId) {
    set._setId = `set_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  const targetSetId = set._setId;
  const targetSetRef = set;

  openPlateCalculator(startWeight, (newWeight) => {
    handlePlateWeightApplied(newWeight, targetSetRef, targetSetId);
  }, {
    isFromSet: hasValidSetWeight,
    setIndex: setIdx
  });
}

function openPlatesForExercise(exercise, exIdx) {
  if (!exercise || !Array.isArray(exercise.sets) || exercise.sets.length === 0) return;
  // Pick first uncompleted set, or set 0
  const uncompletedIdx = exercise.sets.findIndex(s => !s.completed);
  const targetSetIdx = uncompletedIdx >= 0 ? uncompletedIdx : 0;
  const targetSet = exercise.sets[targetSetIdx];
  openPlatesForSet(exercise, exIdx, targetSet, targetSetIdx);
}

async function handlePlateWeightApplied(appliedWeight, targetSetRef, targetSetId) {
  if (!isWorkoutActive.value || !activeSession.value) return;
  const numWeight = parseFloat(appliedWeight);
  if (isNaN(numWeight) || numWeight <= 0) return;

  const res = applyPlateWeightToActiveSet(numWeight, targetSetRef, targetSetId);
  if (res && res.success) {
    await recheckExercisePrs(res.exerciseIndex, res.setIndex);
    showToast(`🏋️ อัปเดตน้ำหนักเซ็ตที่ ${res.setIndex + 1} เป็น ${numWeight} กก. เรียบร้อย`);
  } else {
    showToast('⚠️ ไม่พบเซ็ตเป้าหมาย (อาจถูกลบหรือยกเลิกแล้ว) — ไม่มีการแก้ไขข้อมูล');
  }
}

// Component mount: evaluate PRs for active session exercises
onMounted(async () => {
  if (activeSession.value && Array.isArray(activeSession.value.exercises)) {
    for (let i = 0; i < activeSession.value.exercises.length; i++) {
      await recheckExercisePrs(i);
    }
  }
});

// Discard Session with Confirmation
function handleDiscard() {
  const confirmed = confirm('คุณต้องการยกเลิกการออกกำลังกายนี้ใช่หรือไม่? ข้อมูลของรอบนี้จะไม่ถูกบันทึก');
  if (confirmed) {
    discardSession();
    emit('discard');
  }
}

// Finish Session
function handleFinish() {
  const summary = finishSession();
  if (summary) {
    emit('finish', summary);
  }
}

// Helpers
function formatNumber(num) {
  if (typeof num !== 'number') return '0';
  return num.toLocaleString('en-US');
}

function formatWeight(w) {
  if (w === undefined || w === null) return '0';
  return String(w);
}

// Thai muscle labels and badge classes
const muscleLabels = {
  chest: 'อก',
  back: 'หลัง',
  quads: 'ขาหน้า',
  hamstrings: 'ขาหลัง',
  delts: 'ไหล่',
  arms: 'แขน',
  abs: 'หน้าท้อง',
  cardio: 'คาร์ดิโอ',
  other: 'อื่นๆ'
};

function getMuscleLabel(group) {
  return muscleLabels[group] || group || 'ทั่วไป';
}

function getMuscleBadgeClass(group) {
  switch (group) {
    case 'chest':
      return 'bg-flame-bg text-flame-text border-flame';
    case 'back':
      return 'bg-sky-bg text-sky-text border-sky';
    case 'quads':
    case 'hamstrings':
      return 'bg-emerald-bg text-emerald-text border-emerald';
    case 'delts':
      return 'bg-gold-bg text-gold border-gold';
    case 'arms':
      return 'bg-purple-50 text-purple-700 border-purple-400';
    case 'abs':
      return 'bg-rose-50 text-rose-700 border-rose-400';
    case 'cardio':
      return 'bg-cyan-50 text-cyan-700 border-cyan-400';
    default:
      return 'bg-surface-card text-ink-muted border-plate/30';
  }
}
</script>
