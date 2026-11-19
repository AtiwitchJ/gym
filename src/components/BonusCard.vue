<template>
  <div
    class="archive-card mb-4 overflow-hidden border-2 border-plate shadow-[3px_3px_0px_#ea580c]"
    :class="isAllCompleted ? 'bg-emerald-bg/30 border-emerald shadow-[3px_3px_0px_#059669]' : ''"
  >
    <!-- Top Line -->
    <div
      class="h-1.5 border-b-2 border-plate"
      :class="isAllCompleted ? 'bg-emerald' : 'bg-flame'"
    ></div>

    <!-- Card Header -->
    <div class="p-3 sm:p-4 bg-flame-bg/40 border-b-2 border-plate">
      <div class="flex items-start justify-between gap-2.5 sm:gap-3">
        <!-- Number & Titles -->
        <div class="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
          <span class="font-mono text-xs sm:text-sm font-bold text-flame mt-0.5 select-none bg-white px-1.5 py-0.5 rounded border border-flame/40 flex-shrink-0">
            +{{ index + 1 }}
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 mb-1 flex-wrap">
              <span class="text-[9px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full tracking-wide uppercase bg-flame-bg text-flame border border-flame select-none">
                TOUCH-UP: {{ bonus.part }}
              </span>
              <span
                v-if="isDumbbell"
                class="text-[9px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-paper-subtle text-ink border border-plate/40 select-none inline-flex items-center gap-1"
              >
                ใส่น้ำหนักต่อข้าง (Per Dumbbell)
              </span>
            </div>
            <h3 class="text-sm sm:text-lg font-bold text-ink font-heading tracking-tight leading-snug">
              {{ bonus.name }}
            </h3>
            <p class="text-[11px] sm:text-xs text-ink-muted mt-0.5 font-body">
              {{ bonus.altName }}
            </p>
          </div>
        </div>

        <!-- Compact Thumbnail Box or Toggle Button -->
        <div v-if="hasVideo" class="flex-shrink-0">
          <!-- 1. Compact Thumbnail Preview (When Images Enabled) -->
          <div
            v-if="showExerciseImages && !isPlayingVideo"
            @click="isPlayingVideo = true"
            class="relative w-24 sm:w-36 aspect-video rounded-xl overflow-hidden border-2 border-plate shadow-[2px_2px_0px_#1e2220] group cursor-pointer bg-plate transition-transform active:scale-95"
            title="แตะเพื่อเปิดเล่นคลิปในหน้านี้"
          >
            <img
              v-if="thumbnailUrl"
              :src="thumbnailUrl"
              :alt="bonus.name"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 opacity-90 group-hover:opacity-100"
              loading="lazy"
            />
            <div
              v-else
              class="w-full h-full bg-plate flex flex-col items-center justify-center p-1 text-center"
            >
              <span class="text-[10px] font-mono text-emerald font-bold">🎬 ในเครื่อง</span>
              <span class="text-[8px] font-mono text-white/70 truncate max-w-full">เล่นออฟไลน์</span>
            </div>
            <!-- Play Overlay -->
            <div class="absolute inset-0 bg-plate/25 group-hover:bg-plate/10 transition-colors flex items-center justify-center">
              <div class="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-flame text-white border border-plate flex items-center justify-center shadow-[1px_1px_0px_#1e2220] group-hover:scale-110 transition-transform">
                <svg class="w-3 h-3 sm:w-4 sm:h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            <span
              class="absolute bottom-1 right-1 text-[8px] sm:text-[9px] font-mono font-bold text-white px-1 sm:px-1.5 py-0.5 rounded backdrop-blur-xs border border-white/20 select-none bg-plate/85"
            >
              {{ hasMultiMachineVideos ? '🎬 3 เครื่อง' : 'YouTube' }}
            </span>
          </div>

          <!-- 2. Action Button (When Video is playing OR Images disabled) -->
          <button
            v-else
            type="button"
            @click="toggleVideo"
            class="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono font-bold px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border-2 border-plate shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all whitespace-nowrap"
            :class="isPlayingVideo
              ? 'bg-flame text-white'
              : 'bg-white hover:bg-paper-subtle text-ink'"
            :title="isPlayingVideo ? 'ปิดคลิป' : 'เปิดดูคลิปในหน้านี้'"
          >
            <svg v-if="!isPlayingVideo" class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <svg v-else class="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>{{ isPlayingVideo ? 'ปิดคลิป' : (hasMultiMachineVideos ? '🎬 ดูคลิป (3 เครื่อง)' : 'ดูคลิป') }}</span>
          </button>
        </div>
      </div>

      <div class="mt-2 text-[11px] sm:text-xs text-ink bg-white/80 p-2 sm:p-2.5 rounded-lg border border-plate/20 shadow-sm font-body">
        <strong class="text-flame">คำแนะนำ:</strong> {{ bonus.tip }}
      </div>

      <!-- Progressive Overload Plan & Target Table (Directly in Card) -->
      <div class="mt-2.5 rounded-lg border-2 border-plate bg-white overflow-hidden shadow-[1.5px_1.5px_0px_#1e2220] font-mono">
        <div class="px-2.5 py-1.5 bg-paper-subtle border-b-2 border-plate flex items-center justify-between gap-1 flex-wrap">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[10px] font-bold text-ink uppercase tracking-wider">แผนและเป้าหมายรอบหน้า</span>
            <span
              v-if="linkedSourceBadge"
              class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-sky-bg text-sky border border-sky/30 inline-flex items-center gap-1 select-none"
              :title="`สถิตินี้เชื่อมโยงอัตโนมัติมาจาก ${linkedSourceBadge}`"
            >
              🔗 ซิงค์จาก {{ linkedSourceBadge }}
            </span>
          </div>
          <button
            v-if="hasAnyPrev"
            type="button"
            @click="applyAllPrev"
            class="text-[9px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded bg-flame-bg text-flame hover:bg-flame hover:text-white border border-flame/30 transition-all select-none shadow-[1px_1px_0px_#1e2220] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
            title="ดึงสถิติล่าสุดทั้งน้ำหนักและจำนวนครั้งมาใส่ทุกเซ็ต"
          >
            ดึงสถิติเดิมทั้งหมด
          </button>
        </div>

        <table class="w-full text-left border-collapse text-[10px] sm:text-[11px]">
          <thead>
            <tr class="bg-paper-subtle/50 text-ink-muted border-b border-plate/20 text-[9px] sm:text-[10px]">
              <th class="py-1 px-2.5 font-bold">ประเภท</th>
              <th class="py-1 px-2 text-center font-bold">สถิติล่าสุด</th>
              <th class="py-1 px-2 text-center font-bold">เป้าหมายรอบหน้า</th>
              <th class="py-1 px-2 text-center font-bold">ปรับ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-plate/15">
            <!-- วอร์ม -->
            <tr>
              <td class="py-1.5 px-2.5 font-bold text-sky-700 whitespace-nowrap">
                วอร์ม (15–20)
              </td>
              <td class="py-1.5 px-2 text-center whitespace-nowrap">
                <span v-if="displayWarmWeight !== 0 || displayWarmReps !== null" class="font-bold">
                  {{ displayWarmWeight }} kg × {{ displayWarmReps || '—' }}
                </span>
                <span v-else class="text-ink-muted">-</span>
              </td>
              <td class="py-1.5 px-2 text-center font-bold text-sky-800 whitespace-nowrap">
                <span v-if="exerciseAdvice?.warmAdvice">
                  {{ exerciseAdvice.warmAdvice.suggestedWeight }} kg
                </span>
                <span v-else-if="displayWarmWeight !== 0">
                  {{ displayWarmWeight }} kg
                </span>
                <span v-else class="text-ink-muted">-</span>
              </td>
              <td class="py-1.5 px-2 text-center whitespace-nowrap">
                <span
                  v-if="exerciseAdvice?.warmAdvice && (displayWarmWeight !== 0 || displayWarmReps !== null)"
                  class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border border-plate shadow-[0.5px_0.5px_0px_#1e2220]"
                  :class="exerciseAdvice.warmAdvice.badgeClass"
                >
                  {{ exerciseAdvice.warmAdvice.delta > 0 ? '+2 kg' : exerciseAdvice.warmAdvice.delta < 0 ? '-2 kg' : '0 kg' }}
                </span>
                <span v-else class="text-ink-muted">-</span>
              </td>
            </tr>

            <!-- ซ้อมเสริม -->
            <tr>
              <td class="py-1.5 px-2.5 font-bold text-ink whitespace-nowrap">
                ซ้อมเสริม ({{ workRepTargetLabel }})
              </td>
              <td class="py-1.5 px-2 text-center whitespace-nowrap">
                <span v-if="displayTouchWeight !== 0 || displayTouchReps !== null" class="font-bold">
                  {{ displayTouchWeight }} kg × {{ displayTouchReps || '—' }}
                </span>
                <span v-else class="text-ink-muted">-</span>
              </td>
              <td class="py-1.5 px-2 text-center font-bold text-ink whitespace-nowrap">
                <span v-if="exerciseAdvice?.workAdvice">
                  {{ exerciseAdvice.workAdvice.suggestedWeight }} kg
                </span>
                <span v-else-if="displayTouchWeight !== 0">
                  {{ displayTouchWeight }} kg
                </span>
                <span v-else class="text-ink-muted">-</span>
              </td>
              <td class="py-1.5 px-2 text-center whitespace-nowrap">
                <span
                  v-if="exerciseAdvice?.workAdvice && (displayTouchWeight !== 0 || displayTouchReps !== null)"
                  class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border border-plate shadow-[0.5px_0.5px_0px_#1e2220]"
                  :class="exerciseAdvice.workAdvice.badgeClass"
                >
                  {{ exerciseAdvice.workAdvice.delta > 0 ? '+2 kg' : exerciseAdvice.workAdvice.delta < 0 ? '-2 kg' : '0 kg' }}
                </span>
                <span v-else class="text-ink-muted">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Inline Video Player (Smooth Slide-Down when active) -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="isPlayingVideo && hasVideo" class="p-3 bg-paper-subtle/90 border-b-2 border-plate">
        <!-- Video Header & Direct YouTube link -->
        <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-xs font-mono font-bold text-ink flex items-center gap-1">
              <span class="text-flame">🔴</span>
              <span>YouTube สอนเล่น</span>
            </span>
            <span
              v-if="hasMultiMachineVideos"
              class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-flame-bg text-flame border border-flame/30"
            >
              3 เครื่องทางเลือก
            </span>
          </div>

          <div class="flex items-center gap-2">
            <a
              v-if="activeVideoUrl"
              :href="activeVideoUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-[10px] font-mono font-bold text-flame hover:underline flex items-center gap-1"
              title="เปิดดูในแอป YouTube"
            >
              <span>เปิด YouTube ↗</span>
            </a>
            <button
              @click="isPlayingVideo = false"
              class="text-[11px] font-mono font-bold text-ink-muted hover:text-ink px-2 py-0.5 rounded border border-plate/20 bg-surface shadow-xs active:translate-y-0.5"
            >
              ✕ ปิดคลิป
            </button>
          </div>
        </div>

        <!-- 3-Machine Selector (When exercise has alternative machines in gym) -->
        <div v-if="hasMultiMachineVideos" class="mb-2.5 p-2 bg-surface rounded-xl border-2 border-plate shadow-xs">
          <div class="text-[10px] font-mono font-bold text-ink-muted mb-1.5 flex items-center justify-between">
            <span>🏋️ เผื่อยิมไม่มีเครื่องหลัก เลือกดูคลิปเครื่องที่มีแทนได้:</span>
            <span class="text-flame font-bold text-[9px] tabular-nums">แบบ {{ activeMachineIndex + 1 }}/{{ machineOptions.length }}</span>
          </div>

          <div class="grid grid-cols-3 gap-1.5">
            <button
              v-for="(m, mIdx) in machineOptions"
              :key="mIdx"
              type="button"
              @click="activeMachineIndex = mIdx"
              class="p-1.5 rounded-lg border-2 text-left transition-all active:scale-[0.98] select-none flex flex-col justify-between"
              :class="activeMachineIndex === mIdx
                ? 'bg-flame text-white border-plate shadow-[1.5px_1.5px_0px_#1e2220]'
                : 'bg-paper-subtle hover:bg-white text-ink border-plate/30 shadow-xs'"
            >
              <div class="flex items-center justify-between w-full mb-0.5">
                <span class="text-[10px] font-mono font-bold truncate">เครื่องที่ {{ mIdx + 1 }}</span>
                <span v-if="activeMachineIndex === mIdx" class="text-[9px]">●</span>
              </div>
              <span class="text-[9px] font-heading font-medium leading-tight line-clamp-1 opacity-90">
                {{ m.shortName || m.name }}
              </span>
            </button>
          </div>

          <p class="text-[10px] text-ink-muted font-body mt-1.5 flex items-center gap-1">
            <strong class="text-ink font-semibold flex-shrink-0">เครื่องนี้:</strong>
            <span class="truncate">{{ activeMachine.equipment || activeMachine.name }}</span>
          </p>
        </div>

        <!-- YouTube Video Player -->
        <div class="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-plate shadow-[3px_3px_0px_#1e2220] bg-black">
          <iframe
            v-if="activeEmbedUrl"
            :src="activeEmbedUrl"
            class="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          ></iframe>
        </div>
      </div>
    </transition>

    <!-- Sets Table Header -->
    <div class="px-2.5 sm:px-4 py-1.5 bg-paper-subtle border-y-2 border-plate text-[9px] sm:text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider grid grid-cols-[1fr_72px_58px_50px_34px] sm:grid-cols-[1fr_84px_70px_56px_38px] gap-1.5 sm:gap-2 items-center select-none">
      <div>เซ็ต</div>
      <div class="text-center" :title="isDumbbell ? 'น้ำหนักดัมเบลต่อข้าง (Per Dumbbell)' : 'น้ำหนักยก'">
        {{ isDumbbell ? 'น.น./ข้าง' : 'น้ำหนัก' }}
      </div>
      <div class="text-center">ครั้ง</div>
      <div class="text-center">แนะนำ</div>
      <div class="text-center">เสร็จ</div>
    </div>

    <!-- Sets List -->
    <div class="divide-y-2 divide-plate/10 bg-white">
      <div
        v-for="(set, sIdx) in bonus.sets"
        :key="sIdx"
        class="px-2.5 sm:px-4 py-2 sm:py-2.5 grid grid-cols-[1fr_72px_58px_50px_34px] sm:grid-cols-[1fr_84px_70px_56px_38px] gap-1.5 sm:gap-2 items-center transition-colors"
        :class="isSetDone(sIdx) ? 'bg-emerald-bg/50' : 'hover:bg-surface-low/40'"
      >
        <!-- 1. Set Indicator & Target Reps -->
        <div class="flex flex-col justify-center min-w-0 pr-1 overflow-hidden">
          <div class="flex items-center gap-1.5">
            <span
              class="text-[10px] sm:text-[11px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded tracking-wider uppercase border select-none flex-shrink-0"
              :class="set.type === 'warm'
                ? 'bg-sky-bg text-sky border-sky/40'
                : 'bg-flame-bg text-flame border-flame/40'"
            >
              {{ set.type === 'warm' ? 'W1' : 'T1' }}
            </span>
            <span class="text-xs sm:text-sm font-mono font-bold text-ink select-none truncate">
              {{ getCleanTargetReps(set.reps) }}
            </span>
          </div>
          <span
            v-if="getSetNote(set.reps)"
            class="text-[8px] sm:text-[9px] font-mono text-ink-muted/80 truncate select-none mt-0.5"
            :title="getSetNote(set.reps)"
          >
            {{ getSetNote(set.reps) }}
          </span>
        </div>

        <!-- 2. Weight Button (Column-Aligned) -->
        <button
          type="button"
          @click="openWeightKeypad(sIdx)"
          class="w-full h-8 sm:h-9 rounded-lg border-2 border-plate flex items-center justify-center gap-0.5 font-mono text-xs font-bold transition-all select-none touch-manipulation"
          :class="getWeight(sIdx) !== ''
            ? 'bg-white text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
            : 'bg-surface-low text-ink-muted/80 border-dashed hover:border-solid hover:bg-white'"
          title="แตะเพื่อระบุน้ำหนักด้วยแป้น PIN"
        >
          <template v-if="getWeight(sIdx) !== ''">
            <span class="tabular-nums font-extrabold text-xs sm:text-sm text-ink">
              {{ getWeight(sIdx) }}
            </span>
            <span class="text-[9px] sm:text-[10px] text-flame font-bold">กก.</span>
          </template>
          <template v-else>
            <span class="text-xs sm:text-sm text-ink-muted/40 font-bold">—</span>
          </template>
        </button>

        <!-- 3. Reps Button (Column-Aligned) -->
        <button
          type="button"
          @click="openRepsKeypad(sIdx, set.reps)"
          class="w-full h-8 sm:h-9 rounded-lg border-2 border-plate flex items-center justify-center gap-0.5 font-mono text-xs font-bold transition-all select-none touch-manipulation"
          :class="getReps(sIdx) !== ''
            ? 'bg-white text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
            : 'bg-surface-low text-ink-muted/80 border-dashed hover:border-solid hover:bg-white'"
          title="แตะเพื่อระบุจำนวนครั้งจริงด้วยแป้น PIN"
        >
          <template v-if="getReps(sIdx) !== ''">
            <span class="tabular-nums font-extrabold text-xs sm:text-sm text-ink">
              {{ getReps(sIdx) }}
            </span>
            <span class="text-[9px] sm:text-[10px] text-sky font-bold">ครั้ง</span>
          </template>
          <template v-else>
            <span class="text-xs sm:text-sm text-ink-muted/40 font-bold">—</span>
          </template>
        </button>

        <!-- 4. Progressive Overload Advice Badge (Column-Aligned) -->
        <div class="flex items-center justify-center w-full">
          <div
            v-if="getSetAdvice(sIdx)"
            class="w-full h-7 sm:h-8 rounded-md border-2 border-plate shadow-[0.5px_0.5px_0px_#1e2220] select-none text-[9px] sm:text-[10px] font-mono font-bold flex items-center justify-center whitespace-nowrap"
            :class="getSetAdvice(sIdx).badgeClass"
            :title="getSetAdvice(sIdx).reasonText"
          >
            {{ getSetAdvice(sIdx).delta > 0 ? '+2 kg' : getSetAdvice(sIdx).delta < 0 ? '-2 kg' : 'พอดี' }}
          </div>
          <span v-else class="text-ink-muted/30 font-mono text-xs select-none">—</span>
        </div>

        <!-- 5. Complete Checkbox Button (Column-Aligned) -->
        <button
          type="button"
          @click="onToggle(sIdx)"
          class="w-full h-8 sm:h-9 rounded-lg flex items-center justify-center font-bold text-sm sm:text-base transition-all select-none border-2 border-plate"
          :class="isSetDone(sIdx)
            ? 'bg-emerald text-white shadow-[1.5px_1.5px_0px_#059669]'
            : 'bg-surface hover:bg-paper-subtle text-ink-muted shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'"
          title="ทำเซ็ตนี้สำเร็จ"
        >
          <svg v-if="isSetDone(sIdx)" class="w-4 h-4 fill-current" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          <span v-else class="text-[11px] sm:text-xs font-mono opacity-50 font-bold">✓</span>
        </button>
        <!-- RIR after Done (optional): 3 buttons, same as ExerciseCard -->
        <div v-if="isSetDone(sIdx)" class="col-span-full mt-1 flex items-center gap-1.5 flex-wrap">
          <span class="text-[10px] sm:text-[11px] font-mono text-ink-muted select-none">ความเหนื่อย (ไม่บังคับ):</span>
          <button
            v-for="opt in RIR_CHOICES"
            :key="opt.value"
            type="button"
            @click="pickRir(sIdx, opt)"
            class="min-h-[44px] min-w-[44px] px-3 rounded-xl border-2 border-plate text-xs font-heading font-bold transition-all touch-manipulation"
            :class="isRirSelected(sIdx, opt)
              ? 'bg-flame text-white shadow-[1.5px_1.5px_0px_#1e2220]'
              : 'bg-surface text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'"
            :title="opt.title"
          >{{ opt.label }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { RIR_CHOICES, normalizeRir, nextRirSelection, isRirChoiceSelected } from '../composables/useRir.js';
import { ref, computed } from 'vue';
import { useWorkoutStore } from '../composables/useWorkoutStore';
import { usePinKeypad } from '../composables/usePinKeypad';
import { useWeightAdvisor } from '../composables/useWeightAdvisor';
import { useTimer } from '../composables/useTimer';
import { getYoutubeId } from '../utils/youtube';

const props = defineProps({
  bonus: { type: Object, required: true },
  index: { type: Number, required: true }
});

const isPlayingVideo = ref(false);

const {
  currentDay,
  userState,
  lastWeights,
  updateWeight,
  updateReps,
  updateRir,
  applyPrevRecord,
  toggleSetDone,
  showExerciseImages,
  getExerciseLastRecord
} = useWorkoutStore();

const { openKeypad } = usePinKeypad();
const { startTimer, triggerHaptic } = useTimer();


const activeMachineIndex = ref(0);

const machineOptions = computed(() => {
  if (Array.isArray(props.bonus.machineVideos) && props.bonus.machineVideos.length > 0) {
    return props.bonus.machineVideos;
  }
  if (props.bonus.videoUrl) {
    return [{
      name: props.bonus.name,
      shortName: 'เครื่องหลัก',
      equipment: props.bonus.altName || props.bonus.name,
      videoUrl: props.bonus.videoUrl
    }];
  }
  return [];
});

const hasMultiMachineVideos = computed(() => machineOptions.value.length > 1);

const activeMachine = computed(() => {
  return machineOptions.value[activeMachineIndex.value] || machineOptions.value[0] || {};
});

const activeVideoUrl = computed(() => {
  return activeMachine.value.videoUrl || props.bonus.videoUrl || '';
});

const activeVideoId = computed(() => {
  return getYoutubeId(activeVideoUrl.value);
});

const hasVideo = computed(() => !!activeVideoId.value || machineOptions.value.length > 0);

const thumbnailUrl = computed(() => {
  const primaryId = getYoutubeId(props.bonus.videoUrl) || (machineOptions.value[0] && getYoutubeId(machineOptions.value[0].videoUrl));
  return primaryId ? `https://img.youtube.com/vi/${primaryId}/hqdefault.jpg` : null;
});

const activeEmbedUrl = computed(() => {
  return activeVideoId.value ? `https://www.youtube-nocookie.com/embed/${activeVideoId.value}?autoplay=1&rel=0` : null;
});

// Backward compatibility alias for tests
const videoId = computed(() => activeVideoId.value);
const embedUrl = computed(() => activeEmbedUrl.value);

const isDumbbell = computed(() => {
  const n = (props.bonus.name || '').toLowerCase();
  const a = (props.bonus.altName || '').toLowerCase();
  return n.includes('dumbbell') || n.includes('ดัมเบล') || a.includes('dumbbell') || a.includes('ดัมเบล');
});

function toggleVideo() {
  isPlayingVideo.value = !isPlayingVideo.value;
}

const exState = computed(() => (userState[currentDay.value] && userState[currentDay.value][props.bonus.id]) || {});
const exLast = computed(() => getExerciseLastRecord(props.bonus.id));

const linkedSourceBadge = computed(() => {
  const srcId = exLast.value?._linkedSourceId;
  if (!srcId || srcId === props.bonus.id) return null;
  if (srcId.startsWith('b_m_')) return 'เซ็ตเสริม วันจันทร์';
  if (srcId.startsWith('b_t_')) return 'เซ็ตเสริม วันอังคาร';
  if (srcId.startsWith('b_w_')) return 'เซ็ตเสริม วันพุธ';
  if (srcId.startsWith('b_th_')) return 'เซ็ตเสริม วันพฤหัสบดี';
  if (srcId === 'th1') return 'ท่าหลัก วันพฤหัสบดี';
  if (srcId === 't1') return 'ท่าหลัก วันอังคาร';
  if (srcId === 'w2') return 'ท่าหลัก วันพุธ';
  if (srcId === 'm1') return 'ท่าหลัก วันจันทร์';
  return 'วันที่เชื่อมโยง';
});

const prevWarm = computed(() => {
  const w = exLast.value.wt_0;
  return (w !== undefined && w !== '') ? w : 0;
});
const prevTouch = computed(() => {
  if (exLast.value.wt_1 !== undefined && exLast.value.wt_1 !== '') return exLast.value.wt_1;
  if (exLast.value.wt_2 !== undefined && exLast.value.wt_2 !== '') return exLast.value.wt_2;
  if (exLast.value.wt_3 !== undefined && exLast.value.wt_3 !== '') return exLast.value.wt_3;
  return 0;
});
const prevWarmReps = computed(() => {
  const r = exLast.value.reps_0;
  return (r !== undefined && r !== '') ? r : null;
});
const prevTouchReps = computed(() => {
  if (exLast.value.reps_1 !== undefined && exLast.value.reps_1 !== '') return exLast.value.reps_1;
  if (exLast.value.reps_2 !== undefined && exLast.value.reps_2 !== '') return exLast.value.reps_2;
  if (exLast.value.reps_3 !== undefined && exLast.value.reps_3 !== '') return exLast.value.reps_3;
  return null;
});

const hasAnyPrev = computed(() => {
  return prevWarm.value > 0 || prevTouch.value > 0 || prevWarmReps.value !== null || prevTouchReps.value !== null;
});

const displayWarmWeight = computed(() => {
  if (prevWarm.value > 0) return prevWarm.value;
  const cur = getWeight(0);
  return (cur !== '' && Number(cur) > 0) ? Number(cur) : 0;
});

const displayWarmReps = computed(() => {
  if (prevWarmReps.value !== null) return prevWarmReps.value;
  const cur = getReps(0);
  return (cur !== '' && Number(cur) > 0) ? Number(cur) : null;
});

const displayTouchWeight = computed(() => {
  if (prevTouch.value > 0) return prevTouch.value;
  for (let i = props.bonus.sets.length - 1; i >= 1; i--) {
    const cur = getWeight(i);
    if (cur !== '' && Number(cur) > 0) return Number(cur);
  }
  return 0;
});

const displayTouchReps = computed(() => {
  if (prevTouchReps.value !== null) return prevTouchReps.value;
  for (let i = props.bonus.sets.length - 1; i >= 1; i--) {
    const cur = getReps(i);
    if (cur !== '' && Number(cur) > 0) return Number(cur);
  }
  return null;
});

function getPrevWeight(sIdx) {
  if (exLast.value[`wt_${sIdx}`] !== undefined && exLast.value[`wt_${sIdx}`] !== '') {
    return exLast.value[`wt_${sIdx}`];
  }
  if (sIdx >= 1) {
    if (exLast.value.wt_1 !== undefined && exLast.value.wt_1 !== '') return exLast.value.wt_1;
    if (exLast.value.wt_2 !== undefined && exLast.value.wt_2 !== '') return exLast.value.wt_2;
    if (exLast.value.wt_3 !== undefined && exLast.value.wt_3 !== '') return exLast.value.wt_3;
  }
  return 0;
}

function getPrevReps(sIdx) {
  if (exLast.value[`reps_${sIdx}`] !== undefined && exLast.value[`reps_${sIdx}`] !== '') {
    return exLast.value[`reps_${sIdx}`];
  }
  if (sIdx >= 1) {
    if (exLast.value.reps_1 !== undefined && exLast.value.reps_1 !== '') return exLast.value.reps_1;
    if (exLast.value.reps_2 !== undefined && exLast.value.reps_2 !== '') return exLast.value.reps_2;
    if (exLast.value.reps_3 !== undefined && exLast.value.reps_3 !== '') return exLast.value.reps_3;
  }
  return '';
}

function getWeight(sIdx) {
  return exState.value[`wt_${sIdx}`] !== undefined ? exState.value[`wt_${sIdx}`] : '';
}

function getReps(sIdx) {
  return exState.value[`reps_${sIdx}`] !== undefined ? exState.value[`reps_${sIdx}`] : '';
}

function targetRepNumber(repStr) {
  if (!repStr) return '';
  const match = String(repStr).match(/\d+/);
  return match ? match[0] : '';
}

function getCleanTargetReps(repStr) {
  if (!repStr) return '';
  const parsed = parseRepTarget(repStr);
  return parsed.min === parsed.max ? `${parsed.min}` : `${parsed.min}–${parsed.max}`;
}

function getSetNote(repStr) {
  if (!repStr) return '';
  const match = String(repStr).match(/\(([^)]+)\)/);
  return match ? match[1] : '';
}

function hasPrevRecord(sIdx) {
  const pw = getPrevWeight(sIdx);
  const pr = getPrevReps(sIdx);
  return (pw !== undefined && pw !== '' && Number(pw) > 0) || (pr !== undefined && pr !== '');
}

function applyPrevRecordForSet(sIdx) {
  const pw = getPrevWeight(sIdx);
  const pr = getPrevReps(sIdx);
  applyPrevRecord(currentDay.value, props.bonus.id, sIdx, pw, pr);
}

function applyAllPrev() {
  props.bonus.sets.forEach((_, sIdx) => {
    const pw = getPrevWeight(sIdx);
    const pr = getPrevReps(sIdx);
    if ((pw !== undefined && pw !== '') || (pr !== undefined && pr !== '')) {
      applyPrevRecord(currentDay.value, props.bonus.id, sIdx, pw, pr);
    }
  });
}

const { isWarmupType, parseRepTarget, calculateWeightAdvice, getExerciseOverallAdvice } = useWeightAdvisor();

const workRepTargetLabel = computed(() => {
  const touchSet = props.bonus.sets.find(s => !isWarmupType(s.type));
  if (touchSet && touchSet.reps) {
    const parsed = parseRepTarget(touchSet.reps);
    return parsed.min === parsed.max ? `${parsed.min}` : `${parsed.min}–${parsed.max}`;
  }
  return '6–8';
});

function getSetAdvice(sIdx) {
  const set = props.bonus.sets[sIdx];
  if (!set) return null;

  const reps = getReps(sIdx);
  if (!reps || reps === '' || Number(reps) <= 0) return null;

  const wt = getWeight(sIdx) !== '' ? getWeight(sIdx) : getPrevWeight(sIdx);
  return calculateWeightAdvice({ weight: wt, reps, type: set.type, targetReps: set.reps });
}

function applySetAdvice(sIdx) {
  const advice = getSetAdvice(sIdx);
  if (advice && advice.suggestedWeight !== undefined) {
    updateWeight(currentDay.value, props.bonus.id, sIdx, advice.suggestedWeight);
  }
}

const exerciseAdvice = computed(() => {
  // คำนวณคำแนะนำและเป้าหมายรอบหน้าเฉพาะเซ็ตที่เล่นเสร็จจริง (completed) และมีจำนวนครั้งของรอบปัจจุบันเท่านั้น
  // ห้ามนำน้ำหนักร่าง (draft) ไปจับคู่กับจำนวนครั้งเดิมของสัปดาห์ก่อน
  const completedSets = [];
  props.bonus.sets.forEach((set, sIdx) => {
    if (isSetDone(sIdx)) {
      const curReps = getReps(sIdx);
      if (curReps !== '' && Number(curReps) > 0) {
        const curWeight = getWeight(sIdx);
        completedSets.push({
          type: set.type,
          weight: curWeight !== '' ? curWeight : getPrevWeight(sIdx),
          reps: curReps,
          targetReps: set.reps
        });
      }
    }
  });

  if (completedSets.length === 0) return null;
  return getExerciseOverallAdvice(completedSets);
});

function applyRecommendedWeightAll() {
  const targetWt = exerciseAdvice.value?.workAdvice?.suggestedWeight || exerciseAdvice.value?.suggestedWeight;
  if (!targetWt) return;
  props.bonus.sets.forEach((set, sIdx) => {
    // ข้ามเซ็ตวอร์มโดยเด็ดขาด ห้ามนำน้ำหนักเล่นเสริมไปทับเซ็ตวอร์ม
    if (!isWarmupType(set.type)) {
      updateWeight(currentDay.value, props.bonus.id, sIdx, targetWt);
    }
  });
}

function applyRecommendedWarmupWeight() {
  if (!exerciseAdvice.value?.warmAdvice?.suggestedWeight) return;
  const targetWt = exerciseAdvice.value.warmAdvice.suggestedWeight;
  props.bonus.sets.forEach((set, sIdx) => {
    if (isWarmupType(set.type)) {
      updateWeight(currentDay.value, props.bonus.id, sIdx, targetWt);
    }
  });
}

function openWeightKeypad(sIdx) {
  const set = props.bonus.sets[sIdx];
  const isWarm = isWarmupType(set?.type);
  const prevVal = getPrevWeight(sIdx);
  const advice = getSetAdvice(sIdx);

  let suggestedVal = null;
  let suggestedLabel = '';

  if (isWarm) {
    if (advice && advice.delta !== 0) {
      suggestedVal = advice.suggestedWeight;
      suggestedLabel = `แนะนำวอร์ม: ${suggestedVal} กก. (${advice.delta > 0 ? '+2' : '-2'})`;
    } else if (exerciseAdvice.value?.warmAdvice && exerciseAdvice.value.warmAdvice.delta !== 0) {
      suggestedVal = exerciseAdvice.value.warmAdvice.suggestedWeight;
      suggestedLabel = `แนะนำวอร์ม: ${suggestedVal} กก. (${exerciseAdvice.value.warmAdvice.delta > 0 ? '+2' : '-2'})`;
    }
  } else {
    if (advice && advice.delta !== 0) {
      suggestedVal = advice.suggestedWeight;
      suggestedLabel = `แนะนำเล่นเสริม: ${suggestedVal} กก. (${advice.delta > 0 ? '+2' : '-2'})`;
    } else if (exerciseAdvice.value?.workAdvice && exerciseAdvice.value.workAdvice.delta !== 0) {
      suggestedVal = exerciseAdvice.value.workAdvice.suggestedWeight;
      suggestedLabel = `แนะนำเล่นเสริม: ${suggestedVal} กก. (${exerciseAdvice.value.workAdvice.delta > 0 ? '+2' : '-2'})`;
    }
  }

  const setLabel = isWarm ? 'วอร์ม (W1)' : `เล่นเสริม (T1)`;
  const subtitle = isDumbbell.value
    ? `เซ็ต ${setLabel} • ใส่น้ำหนักต่อข้าง (เช่น ถือข้างละ 18 ให้ใส่ 18)`
    : `เซ็ต ${setLabel} • น้ำหนักยก`;

  openKeypad({
    mode: 'weight',
    unit: isDumbbell.value ? 'กก./ข้าง' : 'กก.',
    title: props.bonus.name,
    subtitle,
    currentValue: '',
    suggestedHint: suggestedVal,
    suggestedLabel,
    prevHint: prevVal ? `${prevVal}` : '',
    presets: [1.25, 2.5, 5, -2.5],
    onConfirm: (val) => {
      updateWeight(currentDay.value, props.bonus.id, sIdx, val);
    }
  });
}

function openRepsKeypad(sIdx, targetStr) {
  const set = props.bonus.sets[sIdx];
  const isWarm = isWarmupType(set?.type);
  const prevVal = getPrevReps(sIdx);
  const targetNum = targetRepNumber(targetStr);
  openKeypad({
    mode: 'reps',
    unit: 'ครั้ง',
    title: props.bonus.name,
    subtitle: `เซ็ต ${isWarm ? 'วอร์ม (W1)' : `เล่นเสริม (T1)`} • จำนวนครั้งที่ยกจริง`,
    currentValue: '',
    targetHint: targetNum ? `${targetNum}` : '',
    prevHint: prevVal ? `${prevVal}` : '',
    presets: [1, 2, -1],
    onConfirm: (val) => {
      updateReps(currentDay.value, props.bonus.id, sIdx, val);
    }
  });
}

// RIR after Done (review item 2): tap the chosen button again to clear it.
function getRir(sIdx) {
  return normalizeRir(exState.value[`rir_${sIdx}`]);
}

function getRirPlus(sIdx) {
  return !!exState.value[`rirPlus_${sIdx}`];
}

function isRirSelected(sIdx, opt) {
  return isRirChoiceSelected(getRir(sIdx), getRirPlus(sIdx), opt);
}

function pickRir(sIdx, opt) {
  const next = nextRirSelection(getRir(sIdx), getRirPlus(sIdx), opt);
  updateRir(currentDay.value, props.bonus.id, sIdx, next.rir, next.rirPlus);
}

function isSetDone(sIdx) {
  return !!exState.value[`set_${sIdx}`];
}

const isAllCompleted = computed(() => {
  if (!props.bonus.sets || props.bonus.sets.length === 0) return false;
  return props.bonus.sets.every((_, idx) => isSetDone(idx));
});

function onToggle(sIdx) {
  const isNowChecked = toggleSetDone(currentDay.value, props.bonus.id, sIdx);
  if (isNowChecked) {
    triggerHaptic([35]);
    startTimer();
  }
}
</script>
