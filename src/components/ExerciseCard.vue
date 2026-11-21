<template>
  <div
    class="archive-card mb-2 sm:mb-4 overflow-hidden"
    :class="[
      isAllCompleted ? 'bg-emerald-bg/30 border-emerald shadow-[3px_3px_0px_#059669]' : '',
      myGroup ? 'border-l-[6px] border-l-gold' : ''
    ]"
  >
    <!-- Top Flame Accent Line -->
    <div
      class="h-1.5 border-b-2 border-plate"
      :class="isAllCompleted
        ? 'bg-emerald'
        : exercise.isMain
          ? 'bg-gradient-to-r from-flame to-gold'
          : 'bg-surface-high'"
    ></div>

    <!-- Card Header -->
    <div class="p-3 sm:p-4 bg-surface-low/50 border-b-2 border-plate">
      <div class="flex items-start justify-between gap-2.5 sm:gap-3">
        <!-- Number & Titles -->
        <div class="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
          <span class="font-mono text-xs sm:text-sm font-bold text-flame-text mt-0.5 select-none bg-flame-bg px-1.5 py-0.5 rounded border border-flame/30 flex-shrink-0">
            {{ String(index + 1).padStart(2, '0') }}
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 mb-1 flex-wrap">
              <span
                class="text-[11px] sm:text-[11px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full tracking-wide uppercase border select-none"
                :class="exercise.isMain
                  ? 'bg-flame-bg text-flame-text border-flame'
                  : 'bg-surface text-ink-muted border-plate/30'"
              >
                {{ exercise.isMain ? 'ท่าหลัก' : 'ท่าช่วย' }}
              </span>
              <span
                v-if="myGroup"
                class="text-[11px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-gold text-ink border-2 border-plate select-none"
              >
                🔗 ซูเปอร์เซ็ต {{ myGroupNo }}
              </span>
              <span
                v-if="isDumbbell"
                class="text-[11px] sm:text-[11px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-paper-subtle text-ink border border-plate/40 select-none inline-flex items-center gap-1"
              >
                ใส่น้ำหนักต่อข้าง (Per Dumbbell)
              </span>
            </div>
            <h3 class="text-sm sm:text-lg font-bold text-ink font-heading tracking-tight leading-snug">
              {{ exercise.name }}
            </h3>
            <!-- Superset partners and remove (44 px). Shown only for grouped exercises. -->
            <div v-if="myGroup" class="mt-1 flex items-center gap-1.5 flex-wrap">
              <span class="text-[11px] font-mono text-ink-muted min-w-0 truncate">คู่กับ {{ partnerLabel }}</span>
              <button
                type="button"
                class="min-h-[44px] px-2.5 rounded-xl border-2 border-plate bg-white text-ink font-heading font-bold text-[11px] touch-manipulation"
                @click="unlinkMe"
              >นำออกจากซูเปอร์เซ็ต</button>
            </div>
            <!-- Description: hidden on phones until "รายละเอียด" is tapped (density step 5) -->
            <p
              :class="showDetail ? 'block' : 'hidden sm:block'"
              class="text-[11px] sm:text-xs text-ink-muted mt-0.5 font-body"
            >
              {{ exercise.altName }}
            </p>
            <div class="flex flex-wrap items-center gap-1 mt-1">
              <button
                type="button"
                class="min-h-[44px] min-w-[44px] text-[11px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border-2 border-plate bg-white hover:bg-paper-subtle text-ink shadow-[1px_1px_0px_#1e2220] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none transition-all"
                title="ดูประวัติและ PR ของท่านี้"
                @click="showHistory = true"
              >
                📈 ประวัติ &amp; PR
              </button>
              <button
                type="button"
                class="sm:hidden min-h-[44px] text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border-2 border-plate bg-surface text-ink-muted touch-manipulation"
                :aria-expanded="showDetail ? 'true' : 'false'"
                @click="showDetail = !showDetail"
              >
                {{ showDetail ? 'ซ่อนรายละเอียด' : 'รายละเอียด' }}
              </button>
            </div>
            <button
              v-if="isBarbell"
              type="button"
              class="min-h-[44px] min-w-[44px] mt-1 ml-1 text-[11px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border-2 border-plate bg-gold hover:bg-gold-glow text-ink shadow-[1px_1px_0px_#1e2220] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none transition-all"
              title="คำนวณแผ่นน้ำหนักบาร์เบล"
              @click="openPlatesForExercise"
            >
              🏋️ คำนวณแผ่น
            </button>
          </div>
        </div>

        <!-- Superset link mode: pick this exercise (44 px). Grouped exercises cannot be picked. -->
        <button
          v-if="linkMode && !myGroup"
          type="button"
          :aria-pressed="isSelected ? 'true' : 'false'"
          class="min-h-[44px] px-2.5 flex-shrink-0 rounded-xl border-2 border-plate font-heading font-bold text-xs transition-all touch-manipulation"
          :class="isSelected ? 'bg-gold text-ink shadow-[1.5px_1.5px_0px_#1e2220]' : 'bg-white text-ink'"
          @click="superset.toggle(exercise.id)"
        >{{ isSelected ? '✓ เลือกแล้ว' : 'เลือก' }}</button>

        <!-- Compact Thumbnail Box or Toggle Button -->
        <div v-if="hasVideo" class="flex-shrink-0">
          <!-- 1. Compact Thumbnail Preview (When Images Enabled) -->
          <div
            v-if="showExerciseImages && !isPlayingVideo"
            @click="isPlayingVideo = true"
            class="relative hidden sm:block w-24 sm:w-36 aspect-video rounded-xl overflow-hidden border-2 border-plate shadow-[2px_2px_0px_#1e2220] group cursor-pointer bg-plate transition-transform active:scale-95"
            title="แตะเพื่อเปิดเล่นคลิปในหน้านี้"
          >
            <img
              v-if="thumbnailUrl"
              :src="thumbnailUrl"
              :alt="exercise.name"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 opacity-90 group-hover:opacity-100"
              loading="lazy"
            />
            <div
              v-else
              class="w-full h-full bg-plate flex flex-col items-center justify-center p-1 text-center"
            >
              <span class="text-[11px] font-mono text-emerald-text font-bold">🎬 ในเครื่อง</span>
              <span class="text-[11px] font-mono text-white/70 truncate max-w-full">เล่นออฟไลน์</span>
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
              class="absolute bottom-1 right-1 text-[11px] sm:text-[11px] font-mono font-bold text-white px-1 sm:px-1.5 py-0.5 rounded backdrop-blur-xs border border-white/20 select-none bg-plate/85"
            >
              {{ hasMultiMachineVideos ? '🎬 3 เครื่อง' : 'YouTube' }}
            </span>
          </div>

          <!-- Phone: a small chip instead of the thumbnail (density step 5; the thumbnail shows from 640 px) -->
          <button
            v-if="showExerciseImages && !isPlayingVideo"
            type="button"
            @click="isPlayingVideo = true"
            class="sm:hidden min-h-[44px] flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-1 rounded-lg border-2 border-plate bg-surface hover:bg-paper-subtle text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all whitespace-nowrap touch-manipulation"
            title="แตะเพื่อเปิดเล่นคลิปในหน้านี้"
          >
            ▶ 🎬 {{ hasMultiMachineVideos ? '3 เครื่อง' : 'คลิป' }}
          </button>

          <!-- 2. Action Button (When Video is playing OR Images disabled) -->
          <button
            v-else
            type="button"
            @click="toggleVideo"
            class="min-h-[44px] min-w-[44px] flex items-center gap-1.5 text-[11px] sm:text-[11px] font-mono font-bold px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border-2 border-plate shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all whitespace-nowrap"
            :class="isPlayingVideo
              ? 'bg-flame text-white'
              : 'bg-surface hover:bg-paper-subtle text-ink'"
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

      <!-- Muscles & Guidance -->
      <!-- One line on phones (the second muscle group shows from 640 px) -->
      <div class="mt-2 min-w-0 text-[11px] sm:text-xs text-ink-muted flex sm:flex-wrap gap-x-2.5 gap-y-0.5">
        <span class="truncate min-w-0"><strong class="text-ink font-semibold">เป้าหมาย:</strong> {{ exercise.mainMuscle }}</span>
        <span v-if="exercise.subMuscle" class="hidden sm:inline text-ink-muted">• {{ exercise.subMuscle }}</span>
      </div>

      <!-- Phone: the plan table is collapsed under a one-line summary (density step 6; open from 640 px) -->
      <button
        type="button"
        class="sm:hidden mt-2.5 w-full min-h-[44px] flex items-center justify-between gap-2 px-2.5 rounded-lg border-2 border-plate bg-white text-left font-mono text-[11px] font-bold text-ink touch-manipulation"
        :aria-expanded="showPlan ? 'true' : 'false'"
        @click="showPlan = !showPlan"
      >
        <span class="truncate">แผนและเป้าหมายรอบหน้า · {{ exercise.sets.length }} เซ็ต</span>
        <span class="flex-shrink-0 text-ink-muted">{{ showPlan ? 'ซ่อน ▴' : 'ดู ▾' }}</span>
      </button>

      <!-- Progressive Overload Plan & Target Table (Directly in Card) -->
      <div
        :class="showPlan ? '' : 'hidden sm:block'"
        class="mt-2.5 rounded-lg border-2 border-plate bg-white overflow-hidden shadow-[1.5px_1.5px_0px_#1e2220] font-mono"
      >
        <div class="px-2.5 py-1.5 bg-paper-subtle border-b-2 border-plate flex items-center justify-between gap-1 flex-wrap">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[11px] font-bold text-ink uppercase tracking-wider">แผนและเป้าหมายรอบหน้า</span>
            <span
              v-if="linkedSourceBadge"
              class="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-sky-bg text-sky-text border border-sky/30 inline-flex items-center gap-1 select-none"
              :title="`สถิตินี้เชื่อมโยงอัตโนมัติมาจาก ${linkedSourceBadge}`"
            >
              🔗 ซิงค์จาก {{ linkedSourceBadge }}
            </span>
          </div>
          <button
            v-if="hasAnyPrev"
            type="button"
            @click="applyAllPrev"
            class="min-h-[44px] min-w-[44px] text-[11px] sm:text-[11px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded bg-flame-bg text-flame-text hover:bg-flame hover:text-white border border-flame/30 transition-all select-none shadow-[1px_1px_0px_#1e2220] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
            title="ดึงสถิติล่าสุดทั้งน้ำหนักและจำนวนครั้งมาใส่ทุกเซ็ต"
          >
            ดึงสถิติเดิมทั้งหมด
          </button>
        </div>

        <table class="w-full text-left border-collapse text-[11px] sm:text-[11px]">
          <thead>
            <tr class="bg-paper-subtle/50 text-ink-muted border-b border-plate/20 text-[11px] sm:text-[11px]">
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
                  class="inline-block px-1.5 py-0.5 rounded text-[11px] font-bold border border-plate shadow-[0.5px_0.5px_0px_#1e2220]"
                  :class="exerciseAdvice.warmAdvice.badgeClass"
                >
                  {{ exerciseAdvice.warmAdvice.delta > 0 ? '+2 kg' : exerciseAdvice.warmAdvice.delta < 0 ? '-2 kg' : '0 kg' }}
                </span>
                <span v-else class="text-ink-muted">-</span>
              </td>
            </tr>

            <!-- เล่นจริง -->
            <tr>
              <td class="py-1.5 px-2.5 font-bold text-ink whitespace-nowrap">
                เล่นจริง ({{ workRepTargetLabel }})
              </td>
              <td class="py-1.5 px-2 text-center whitespace-nowrap">
                <span v-if="displayWorkWeight !== 0 || displayWorkReps !== null" class="font-bold">
                  {{ displayWorkWeight }} kg × {{ displayWorkReps || '—' }}
                </span>
                <span v-else class="text-ink-muted">-</span>
              </td>
              <td class="py-1.5 px-2 text-center font-bold text-ink whitespace-nowrap">
                <span v-if="exerciseAdvice?.workAdvice">
                  {{ exerciseAdvice.workAdvice.suggestedWeight }} kg
                </span>
                <span v-else-if="displayWorkWeight !== 0">
                  {{ displayWorkWeight }} kg
                </span>
                <span v-else class="text-ink-muted">-</span>
              </td>
              <td class="py-1.5 px-2 text-center whitespace-nowrap">
                <span
                  v-if="exerciseAdvice?.workAdvice && (displayWorkWeight !== 0 || displayWorkReps !== null)"
                  class="inline-block px-1.5 py-0.5 rounded text-[11px] font-bold border border-plate shadow-[0.5px_0.5px_0px_#1e2220]"
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
              <span class="text-flame-text">🔴</span>
              <span>YouTube สอนเล่น</span>
            </span>
            <span
              v-if="hasMultiMachineVideos"
              class="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-flame-bg text-flame-text border border-flame/30"
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
              class="text-[11px] font-mono font-bold text-flame-text hover:underline flex items-center gap-1"
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
          <div class="text-[11px] font-mono font-bold text-ink-muted mb-1.5 flex items-center justify-between">
            <span>🏋️ เผื่อยิมไม่มีเครื่องหลัก เลือกดูคลิปเครื่องที่มีแทนได้:</span>
            <span class="text-flame-text font-bold text-[11px] tabular-nums">แบบ {{ activeMachineIndex + 1 }}/{{ machineOptions.length }}</span>
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
                <span class="text-[11px] font-mono font-bold truncate">เครื่องที่ {{ mIdx + 1 }}</span>
                <span v-if="activeMachineIndex === mIdx" class="text-[11px]">●</span>
              </div>
              <span class="text-[11px] font-heading font-medium leading-tight line-clamp-1 opacity-90">
                {{ m.shortName || m.name }}
              </span>
            </button>
          </div>

          <p class="text-[11px] text-ink-muted font-body mt-1.5 flex items-center gap-1">
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

    <!-- Rest time for this exercise, shown before the user ticks a set -->
    <div class="px-2.5 sm:px-4 py-1 text-[11px] font-mono text-ink-muted select-none">
      เวลาพักหลังเซ็ตของท่านี้: <span class="font-bold text-ink">{{ restLabel }}</span>
    </div>

    <!-- Warm-up plan from the working weight (percent calculator; an estimate, not applied to the sets) -->
    <div
      v-if="warmupPlan.length"
      class="px-2.5 sm:px-4 pb-1 text-[11px] font-mono text-ink-muted select-none"
      title="คำนวณจาก % ของน้ำหนักเซ็ตแรก — ค่าเริ่มต้น 40%×5, 60%×5, 80%×3 (ยังไม่ได้ทดสอบในแอป)"
    >
      วอร์มอัพแนะนำ (ประมาณ):
      <span class="font-bold text-ink">{{ warmupPlan.map((s) => `${s.weight} กก.×${s.reps}`).join(' · ') }}</span>
    </div>

    <!-- Sets Table Header -->
    <div class="px-2.5 sm:px-4 py-1.5 bg-paper-subtle border-y-2 border-plate text-[11px] sm:text-[11px] font-mono font-bold text-ink-muted uppercase tracking-wider flex items-center justify-between gap-2 select-none">
      <span>เซ็ต · แนะนำ · เสร็จ</span>
      <span :title="isDumbbell ? 'น้ำหนักดัมเบลต่อข้าง (Per Dumbbell)' : 'น้ำหนักยก'">
        {{ isDumbbell ? 'น.น./ข้าง' : 'น้ำหนัก' }} / ครั้ง (แตะค่าเพื่อพิมพ์)
      </span>
    </div>

    <!-- Sets List -->
    <div class="divide-y-2 divide-plate/10 bg-white">
      <div
        v-for="(set, sIdx) in exercise.sets"
        :key="sIdx"
        class="px-2.5 sm:px-4 py-2 sm:py-3 transition-colors touch-pan-y"
        :class="isSetDone(sIdx) ? 'bg-emerald-bg/50' : 'hover:bg-surface-low/40'"
        @pointerdown="onRowPointerDown($event, sIdx)"
        @pointerup="onRowPointerUp($event, sIdx)"
        @pointercancel="onRowPointerCancel"
      >
        <!-- Top line: set label, previous record, copy (tap alternative to the swipe), advice, Done -->
        <div class="flex items-center gap-2">
          <div class="flex flex-col justify-center min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span
                class="text-[11px] sm:text-[11px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded tracking-wider uppercase border select-none flex-shrink-0"
                :class="set.type === 'warm'
                  ? 'bg-sky-bg text-sky-text border-sky/40'
                  : 'bg-surface-card text-ink border-plate/30'"
              >
                {{ set.type === 'warm' ? 'วอร์ม' : `เซ็ต ${sIdx}` }}
              </span>
              <span class="text-xs sm:text-sm font-mono font-bold text-ink select-none truncate">
                {{ getCleanTargetReps(set.reps) }}
              </span>
              <span
                v-if="getPrFlag(sIdx)"
                class="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-gold text-ink border-2 border-plate select-none flex-shrink-0"
                title="ทำสถิติใหม่ (PR) เมื่อเทียบกับสถิติที่บันทึกไว้"
              >🏆 PR</span>
            </div>
            <span
              v-if="hasPrevForSet(sIdx)"
              class="text-[11px] sm:text-[11px] font-mono text-ink-muted select-none truncate"
            >
              ครั้งก่อน {{ getPrevWeight(sIdx) }} กก. × {{ getPrevReps(sIdx) || '—' }}
            </span>
            <span
              v-if="getSetNote(set.reps)"
              class="text-[11px] sm:text-[11px] font-mono text-ink-muted truncate select-none mt-0.5"
              :title="getSetNote(set.reps)"
            >
              {{ getSetNote(set.reps) }}
            </span>
          </div>

          <!-- Copy to the next empty set (same as the swipe). Shown only when there is a target. -->
          <button
            v-if="copyTargetFor(sIdx) !== null"
            type="button"
            @click="copySetTo(sIdx)"
            class="min-h-[44px] min-w-[44px] px-2 flex-shrink-0 rounded-xl border-2 border-plate bg-white text-ink font-heading font-bold text-[11px] shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
            :aria-label="`คัดลอกน้ำหนัก ครั้ง และ RIR ไปเซ็ต ${copyTargetFor(sIdx)}`"
            title="คัดลอกน้ำหนัก ครั้ง และ RIR ไปเซ็ตว่างถัดไป"
          >คัดลอก</button>

          <!-- Progressive Overload Advice Badge -->
          <div class="flex items-center justify-center w-14 flex-shrink-0">
            <div
              v-if="getSetAdvice(sIdx)"
              class="w-full h-7 rounded-md border-2 border-plate shadow-[0.5px_0.5px_0px_#1e2220] select-none text-[11px] sm:text-[11px] font-mono font-bold flex items-center justify-center whitespace-nowrap"
              :class="getSetAdvice(sIdx).badgeClass"
              :title="getSetAdvice(sIdx).reasonText"
            >
              {{ getSetAdvice(sIdx).delta > 0 ? '+2 kg' : getSetAdvice(sIdx).delta < 0 ? '-2 kg' : 'พอดี' }}
            </div>
            <span v-else class="text-ink-muted font-mono text-xs select-none">—</span>
          </div>

        </div>

        <!-- Bottom line: weight and reps steppers side by side, then Done (tap the value to type it) -->
        <div class="flex items-stretch gap-1.5 mt-1.5">
          <div class="flex flex-1 items-center gap-0.5 sm:gap-1 min-w-0">
            <button
              type="button"
              @click="stepWeight(sIdx, -1)"
              class="w-11 h-11 sm:w-14 sm:h-14 flex-shrink-0 rounded-xl border-2 border-plate bg-surface text-xl font-extrabold text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
              aria-label="ลดน้ำหนัก"
            >−</button>
            <button
              type="button"
              @click="openWeightKeypad(sIdx)"
              class="flex-1 min-w-0 h-11 sm:h-14 rounded-xl border-2 border-plate bg-white flex items-baseline justify-center gap-1 touch-manipulation"
              title="แตะเพื่อพิมพ์น้ำหนัก"
            >
              <span class="tabular-nums font-extrabold text-sm sm:text-base text-ink leading-none">{{ getWeight(sIdx) !== '' ? getWeight(sIdx) : '—' }}</span>
              <span class="text-[11px] text-flame-text font-bold leading-none">กก.</span>
            </button>
            <button
              type="button"
              @click="stepWeight(sIdx, 1)"
              class="w-11 h-11 sm:w-14 sm:h-14 flex-shrink-0 rounded-xl border-2 border-plate bg-surface text-xl font-extrabold text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
              aria-label="เพิ่มน้ำหนัก"
            >+</button>
          </div>

          <div class="flex flex-1 items-center gap-0.5 sm:gap-1 min-w-0">
            <button
              type="button"
              @click="stepReps(sIdx, -1)"
              class="w-11 h-11 sm:w-14 sm:h-14 flex-shrink-0 rounded-xl border-2 border-plate bg-surface text-xl font-extrabold text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
              aria-label="ลดจำนวนครั้ง"
            >−</button>
            <button
              type="button"
              @click="openRepsKeypad(sIdx, set.reps)"
              class="flex-1 min-w-0 h-11 sm:h-14 rounded-xl border-2 border-plate bg-white flex items-baseline justify-center gap-1 touch-manipulation"
              title="แตะเพื่อพิมพ์จำนวนครั้งจริง"
            >
              <span class="tabular-nums font-extrabold text-sm sm:text-base text-ink leading-none">{{ getReps(sIdx) !== '' ? getReps(sIdx) : '—' }}</span>
              <span class="text-[11px] text-sky-text font-bold leading-none">ครั้ง</span>
            </button>
            <button
              type="button"
              @click="stepReps(sIdx, 1)"
              class="w-11 h-11 sm:w-14 sm:h-14 flex-shrink-0 rounded-xl border-2 border-plate bg-surface text-xl font-extrabold text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
              aria-label="เพิ่มจำนวนครั้ง"
            >+</button>
          </div>
          <!-- Done (44 px on phones, 56 px from 640 px) -->
          <button
            type="button"
            @click="onToggle(sIdx)"
            class="w-11 h-11 sm:w-14 sm:h-14 flex-shrink-0 rounded-xl flex items-center justify-center font-bold text-base transition-all select-none border-2 border-plate touch-manipulation"
            :class="isSetDone(sIdx)
              ? 'bg-emerald text-white shadow-[1.5px_1.5px_0px_#059669]'
              : 'bg-surface hover:bg-paper-subtle text-ink-muted shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'"
            title="ทำเซ็ตนี้สำเร็จ"
          >
            <svg v-if="isSetDone(sIdx)" class="w-5 h-5 fill-current" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            <span v-else class="text-lg font-mono opacity-50 font-bold">✓</span>
          </button>
        </div>

        <!-- RIR after Done (optional): 3 buttons -->
        <div v-if="isSetDone(sIdx)" class="mt-2 flex items-center gap-1.5 flex-wrap">
          <span class="text-[11px] sm:text-[11px] font-mono text-ink-muted select-none" title="RIR = จำนวนครั้งที่ยังเหลือแรงยกต่อได้ (ไม่บังคับ)">ความเหนื่อย RIR (ไม่บังคับ):</span>
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
          <p class="w-full text-[11px] font-body text-ink-muted leading-snug">เหลือ 2+ = ยังเหลือแรงอีก 2 ครั้งขึ้นไป · เหลือ 1 = อีก 1 ครั้ง · ล้ม = ยกต่อไม่ได้</p>
        </div>
      </div>
    </div>

    <!-- Exercise history & PR (opened from the header; set rows are unchanged) -->
    <ExerciseHistoryModal
      :is-open="showHistory"
      :exercise-id="exercise.id"
      :exercise-name="exercise.name"
      @close="showHistory = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useWorkoutStore } from '../composables/useWorkoutStore';
import { usePinKeypad } from '../composables/usePinKeypad';
import { useWeightAdvisor } from '../composables/useWeightAdvisor';
import { useTimer } from '../composables/useTimer';
import { getYoutubeId } from '../utils/youtube';
import ExerciseHistoryModal from './ExerciseHistoryModal.vue';
import { stepFrom, WEIGHT_STEP_KG, REPS_STEP } from '../composables/useSetStepper.js';
import { RIR_CHOICES, normalizeRir, nextRirSelection, isRirChoiceSelected } from '../composables/useRir.js';
import { getCustomRest, formatRestLabel, restRevision } from '../composables/useCustomRest.js';
import { isNewPr, getBaselineE1rm } from '../composables/usePersonalRecords.js';
import { buildWarmupSets } from '../composables/warmupCalc.js';
import { useSupersetStore, groupForExercise, groupNumber, partnerNames } from '../composables/useSupersets.js';
import { shouldRestAfterTick, doneFromState, countFromExercises } from '../composables/supersetRound.js';
import { setHasValues, findCopyTarget, planCopy, isHorizontalSwipe, copiedMessage } from '../composables/setCopy.js';
import { usePlateCalculator, isBarbellExercise } from '../composables/usePlateCalculator.js';

const showHistory = ref(false);
// Phone: the description (altName) is behind the "รายละเอียด" toggle (density step 5)
const showDetail = ref(false);
// Phone: the plan table is collapsed until its summary line is tapped (density step 6)
const showPlan = ref(false);

const props = defineProps({
  exercise: { type: Object, required: true },
  index: { type: Number, required: true }
});

const isPlayingVideo = ref(false);

const {
  currentDay,
  workoutData,
  userState,
  lastWeights,
  getExerciseLastRecord,
  updateWeight,
  updateReps,
  updateRir,
  setPrFlag,
  showToast,
  applyPrevRecord,
  toggleSetDone,
  showExerciseImages
} = useWorkoutStore();

const { openKeypad } = usePinKeypad();
const { startTimer, triggerHaptic, setTimerDuration } = useTimer();

const activeMachineIndex = ref(0);

const machineOptions = computed(() => {
  if (Array.isArray(props.exercise.machineVideos) && props.exercise.machineVideos.length > 0) {
    return props.exercise.machineVideos;
  }
  if (props.exercise.videoUrl) {
    return [{
      name: props.exercise.name,
      shortName: 'เครื่องหลัก',
      equipment: props.exercise.altName || props.exercise.name,
      videoUrl: props.exercise.videoUrl
    }];
  }
  return [];
});

const hasMultiMachineVideos = computed(() => machineOptions.value.length > 1);

const activeMachine = computed(() => {
  return machineOptions.value[activeMachineIndex.value] || machineOptions.value[0] || {};
});

const activeVideoUrl = computed(() => {
  return activeMachine.value.videoUrl || props.exercise.videoUrl || '';
});

const activeVideoId = computed(() => {
  return getYoutubeId(activeVideoUrl.value);
});

const hasVideo = computed(() => !!activeVideoId.value || machineOptions.value.length > 0);

const thumbnailUrl = computed(() => {
  const primaryId = getYoutubeId(props.exercise.videoUrl) || (machineOptions.value[0] && getYoutubeId(machineOptions.value[0].videoUrl));
  return primaryId ? `https://img.youtube.com/vi/${primaryId}/hqdefault.jpg` : null;
});

const activeEmbedUrl = computed(() => {
  return activeVideoId.value ? `https://www.youtube-nocookie.com/embed/${activeVideoId.value}?autoplay=1&rel=0` : null;
});

// Backward compatibility alias for tests
const videoId = computed(() => activeVideoId.value);
const embedUrl = computed(() => activeEmbedUrl.value);

const isDumbbell = computed(() => {
  const n = (props.exercise.name || '').toLowerCase();
  const a = (props.exercise.altName || '').toLowerCase();
  return n.includes('dumbbell') || n.includes('ดัมเบล') || a.includes('dumbbell') || a.includes('ดัมเบล');
});

function toggleVideo() {
  isPlayingVideo.value = !isPlayingVideo.value;
}

const exState = computed(() => (userState[currentDay.value] && userState[currentDay.value][props.exercise.id]) || {});
const exLast = computed(() => getExerciseLastRecord(props.exercise.id));

const linkedSourceBadge = computed(() => {
  const srcId = exLast.value?._linkedSourceId;
  if (!srcId || srcId === props.exercise.id) return null;
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

const prevWarm = computed(() => (exLast.value.wt_0 !== undefined && exLast.value.wt_0 !== '') ? exLast.value.wt_0 : 0);
const prevWork = computed(() => (exLast.value.wt_1 !== undefined && exLast.value.wt_1 !== '') ? exLast.value.wt_1 : 0);
const prevWarmReps = computed(() => (exLast.value.reps_0 !== undefined && exLast.value.reps_0 !== '') ? exLast.value.reps_0 : null);
const prevWorkReps = computed(() => (exLast.value.reps_1 !== undefined && exLast.value.reps_1 !== '') ? exLast.value.reps_1 : null);

const hasAnyPrev = computed(() => {
  return prevWarm.value > 0 || prevWork.value > 0 || prevWarmReps.value !== null || prevWorkReps.value !== null;
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

const displayWorkWeight = computed(() => {
  if (prevWork.value > 0) return prevWork.value;
  for (let i = props.exercise.sets.length - 1; i >= 1; i--) {
    const cur = getWeight(i);
    if (cur !== '' && Number(cur) > 0) return Number(cur);
  }
  return 0;
});

const displayWorkReps = computed(() => {
  if (prevWorkReps.value !== null) return prevWorkReps.value;
  for (let i = props.exercise.sets.length - 1; i >= 1; i--) {
    const cur = getReps(i);
    if (cur !== '' && Number(cur) > 0) return Number(cur);
  }
  return null;
});

function getPrevWeight(sIdx) {
  if (exLast.value[`wt_${sIdx}`] !== undefined && exLast.value[`wt_${sIdx}`] !== '') {
    return exLast.value[`wt_${sIdx}`];
  }
  // For working sets (sIdx >= 2), if wt_2 or wt_3 isn't set, fall back to wt_1
  if (sIdx >= 1 && exLast.value.wt_1 !== undefined && exLast.value.wt_1 !== '') {
    return exLast.value.wt_1;
  }
  return 0;
}

function getPrevReps(sIdx) {
  if (exLast.value[`reps_${sIdx}`] !== undefined && exLast.value[`reps_${sIdx}`] !== '') {
    return exLast.value[`reps_${sIdx}`];
  }
  // For working sets (sIdx >= 2), if reps_2 or reps_3 isn't set, fall back to reps_1
  if (sIdx >= 1 && exLast.value.reps_1 !== undefined && exLast.value.reps_1 !== '') {
    return exLast.value.reps_1;
  }
  return '';
}

// Set-row steppers (step 3): ± one tap; an empty value starts from the previous record.
function hasPrevForSet(sIdx) {
  return getPrevWeight(sIdx) !== 0 || getPrevReps(sIdx) !== '';
}

function stepWeight(sIdx, dir) {
  const next = stepFrom(getWeight(sIdx), getPrevWeight(sIdx), dir, WEIGHT_STEP_KG);
  updateWeight(currentDay.value, props.exercise.id, sIdx, String(next));
  if (isSetDone(sIdx)) evaluatePrOnTick(sIdx); // PR depends on the values now, not only at Done
}

function stepReps(sIdx, dir) {
  const next = stepFrom(getReps(sIdx), getPrevReps(sIdx), dir, REPS_STEP);
  updateReps(currentDay.value, props.exercise.id, sIdx, String(next));
  if (isSetDone(sIdx)) evaluatePrOnTick(sIdx);
}

// RIR after Done (step 5): tap the chosen button again to clear it.
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
  updateRir(currentDay.value, props.exercise.id, sIdx, next.rir, next.rirPlus);
  // RIR is chosen after Done; without it the estimate is lower and a real PR can be missed (review fix).
  if (isSetDone(sIdx)) evaluatePrOnTick(sIdx);
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
  const pw = exLast.value[`wt_${sIdx}`];
  const pr = exLast.value[`reps_${sIdx}`];
  return (pw !== undefined && pw !== '') || (pr !== undefined && pr !== '');
}

function applyPrevRecordForSet(sIdx) {
  const pw = getPrevWeight(sIdx);
  const pr = getPrevReps(sIdx);
  applyPrevRecord(currentDay.value, props.exercise.id, sIdx, pw, pr);
}

function applyAllPrev() {
  props.exercise.sets.forEach((_, sIdx) => {
    const pw = getPrevWeight(sIdx);
    const pr = getPrevReps(sIdx);
    if ((pw !== undefined && pw !== '') || (pr !== undefined && pr !== '')) {
      applyPrevRecord(currentDay.value, props.exercise.id, sIdx, pw, pr);
    }
  });
}

const { isWarmupType, parseRepTarget, calculateWeightAdvice, getExerciseOverallAdvice, shouldFillWeight } = useWeightAdvisor();

const workRepTargetLabel = computed(() => {
  const workSet = props.exercise.sets.find(s => !isWarmupType(s.type));
  if (workSet && workSet.reps) {
    const parsed = parseRepTarget(workSet.reps);
    return parsed.min === parsed.max ? `${parsed.min}` : `${parsed.min}–${parsed.max}`;
  }
  return '6–8';
});

function getSetAdvice(sIdx) {
  const set = props.exercise.sets[sIdx];
  if (!set) return null;

  const reps = getReps(sIdx);
  if (!reps || reps === '' || Number(reps) <= 0) return null;

  const wt = getWeight(sIdx) !== '' ? getWeight(sIdx) : getPrevWeight(sIdx);
  return calculateWeightAdvice({ weight: wt, reps, type: set.type, targetReps: set.reps, rir: getRir(sIdx) });
}

function applySetAdvice(sIdx) {
  const advice = getSetAdvice(sIdx);
  // Advice only fills an empty weight; a value the user typed is never replaced.
  if (advice && advice.suggestedWeight !== undefined && shouldFillWeight(getWeight(sIdx))) {
    updateWeight(currentDay.value, props.exercise.id, sIdx, advice.suggestedWeight);
  }
}

const exerciseAdvice = computed(() => {
  // คำนวณคำแนะนำและเป้าหมายรอบหน้าเฉพาะเซ็ตที่เล่นเสร็จจริง (completed) และมีจำนวนครั้งของรอบปัจจุบันเท่านั้น
  // ห้ามนำน้ำหนักร่าง (draft) ไปจับคู่กับจำนวนครั้งเดิมของสัปดาห์ก่อน
  const completedSets = [];
  props.exercise.sets.forEach((set, sIdx) => {
    if (isSetDone(sIdx)) {
      const curReps = getReps(sIdx);
      if (curReps !== '' && Number(curReps) > 0) {
        const curWeight = getWeight(sIdx);
        completedSets.push({
          type: set.type,
          weight: curWeight !== '' ? curWeight : getPrevWeight(sIdx),
          reps: curReps,
          targetReps: set.reps,
          rir: getRir(sIdx)
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
  props.exercise.sets.forEach((set, sIdx) => {
    // ข้ามเซ็ตวอร์มโดยเด็ดขาด ห้ามนำน้ำหนักเล่นจริงไปทับเซ็ตวอร์ม
    if (!isWarmupType(set.type) && shouldFillWeight(getWeight(sIdx))) {
      updateWeight(currentDay.value, props.exercise.id, sIdx, targetWt);
    }
  });
}

function applyRecommendedWarmupWeight() {
  if (!exerciseAdvice.value?.warmAdvice?.suggestedWeight) return;
  const targetWt = exerciseAdvice.value.warmAdvice.suggestedWeight;
  props.exercise.sets.forEach((set, sIdx) => {
    if (isWarmupType(set.type) && shouldFillWeight(getWeight(sIdx))) {
      updateWeight(currentDay.value, props.exercise.id, sIdx, targetWt);
    }
  });
}

function openWeightKeypad(sIdx) {
  const set = props.exercise.sets[sIdx];
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
      suggestedLabel = `แนะนำ: ${suggestedVal} กก. (${advice.delta > 0 ? '+2' : '-2'})`;
    } else if (exerciseAdvice.value?.workAdvice && exerciseAdvice.value.workAdvice.delta !== 0) {
      suggestedVal = exerciseAdvice.value.workAdvice.suggestedWeight;
      suggestedLabel = `แนะนำ: ${suggestedVal} กก. (${exerciseAdvice.value.workAdvice.delta > 0 ? '+2' : '-2'})`;
    }
  }

  const setLabel = isWarm ? 'วอร์ม' : `เซ็ต ${sIdx}`;
  const subtitle = isDumbbell.value
    ? `เซ็ต ${setLabel} • ใส่น้ำหนักต่อข้าง (เช่น ถือข้างละ 18 ให้ใส่ 18)`
    : `เซ็ต ${setLabel} • น้ำหนักยก`;

  openKeypad({
    mode: 'weight',
    unit: isDumbbell.value ? 'กก./ข้าง' : 'กก.',
    title: props.exercise.name,
    subtitle,
    draftKey: { dayKey: currentDay.value, exId: props.exercise.id, field: 'wt', setIdx: sIdx },
    currentValue: '',
    suggestedHint: suggestedVal,
    suggestedLabel,
    prevHint: prevVal ? `${prevVal}` : '',
    presets: [1.25, 2.5, 5, -2.5],
    onConfirm: (val) => {
      updateWeight(currentDay.value, props.exercise.id, sIdx, val);
    }
  });
}

function openRepsKeypad(sIdx, targetStr) {
  const set = props.exercise.sets[sIdx];
  const isWarm = isWarmupType(set?.type);
  const prevVal = getPrevReps(sIdx);
  const targetNum = targetRepNumber(targetStr);
  const setLabel = isWarm ? 'วอร์ม' : `เซ็ต ${sIdx}`;
  openKeypad({
    mode: 'reps',
    unit: 'ครั้ง',
    title: props.exercise.name,
    subtitle: `เซ็ต ${setLabel} • จำนวนครั้งที่ยกจริง`,
    draftKey: { dayKey: currentDay.value, exId: props.exercise.id, field: 'reps', setIdx: sIdx },
    currentValue: '',
    targetHint: targetNum ? `${targetNum}` : '',
    prevHint: prevVal ? `${prevVal}` : '',
    presets: [1, 2, -1],
    onConfirm: (val) => {
      updateReps(currentDay.value, props.exercise.id, sIdx, val);
    }
  });
}

function isSetDone(sIdx) {
  return !!exState.value[`set_${sIdx}`];
}

const isAllCompleted = computed(() => {
  if (!props.exercise.sets || props.exercise.sets.length === 0) return false;
  return props.exercise.sets.every((_, idx) => isSetDone(idx));
});

// Plate calculator (step 6c): offered from the card header for barbell-style exercises only.
const { openPlateCalculator } = usePlateCalculator();
const isBarbell = isBarbellExercise(props.exercise);

// Saved rest for this exercise (re-reads after any save, via restRevision).
const restLabel = computed(() => {
  void restRevision.value;
  return formatRestLabel(getCustomRest(props.exercise.id));
});

// Supersets of this day: badge, partner names, remove, and the link-mode selection (useSupersets.js)
const superset = useSupersetStore();
const myGroup = computed(() => groupForExercise(superset.groups.value, props.exercise.id));
const myGroupNo = computed(() => groupNumber(superset.groups.value, myGroup.value && myGroup.value.groupId));
const linkMode = computed(() => superset.linkMode.value);
const isSelected = computed(() => superset.selected.value.includes(props.exercise.id));
const dayNameById = computed(() => {
  const day = workoutData[currentDay.value] || {};
  const all = [...(day.exercises || []), ...(day.bonusExercises || [])];
  return Object.fromEntries(all.map((e) => [e.id, e.name]));
});
const partnerLabel = computed(() =>
  partnerNames(myGroup.value, props.exercise.id, dayNameById.value).join(' + ')
);
async function unlinkMe() {
  if (!myGroup.value) return;
  await superset.unlink(currentDay.value, myGroup.value.groupId, props.exercise.id);
}

// Warm-up plan from the first working set's weight (typed value, else last record). [] when no weight.
const warmupPlan = computed(() => {
  const idx = props.exercise.sets.findIndex((s) => !isWarmupType(s.type));
  if (idx < 0) return [];
  const wt = getWeight(idx) !== '' ? getWeight(idx) : getPrevWeight(idx);
  return buildWarmupSets(wt);
});

function openPlatesForExercise() {
  const firstOpen = props.exercise.sets.findIndex((_, i) => !isSetDone(i));
  const idx = firstOpen >= 0 ? firstOpen : 0;
  const start = Number(getWeight(idx)) || Number(getPrevWeight(idx)) || 60;
  openPlateCalculator(start, (val) => {
    updateWeight(currentDay.value, props.exercise.id, idx, String(val));
  });
}

// PR badge (step 6): compare the ticked set with the stored PR for this exercise.
function getPrFlag(sIdx) {
  return !!exState.value[`pr_${sIdx}`];
}

async function evaluatePrOnTick(sIdx) {
  const set = props.exercise.sets[sIdx];
  const baseline = await getBaselineE1rm(props.exercise.id);
  if (!isSetDone(sIdx)) return; // unticked while the check was running
  const { isPr, e1rm } = isNewPr(
    { weight: getWeight(sIdx), reps: getReps(sIdx), rir: getRir(sIdx), isWarm: !!set && set.type === 'warm' },
    baseline
  );
  setPrFlag(currentDay.value, props.exercise.id, sIdx, isPr);
  if (isPr) {
    showToast(`🏆 PR ใหม่: ${props.exercise.name} ${getWeight(sIdx)} kg × ${getReps(sIdx)} (e1RM ≈ ${e1rm.toFixed(1)} kg)`);
  }
}

// Copy the set to the next empty set (swipe or the "คัดลอก" button). Never overwrites a set with values.
function copyTargetFor(sIdx) {
  if (!setHasValues(exState.value, sIdx)) return null;
  return findCopyTarget(props.exercise.sets, exState.value, sIdx);
}

function copySetTo(fromIdx) {
  const plan = planCopy(props.exercise.sets, exState.value, fromIdx);
  if (!plan.ok) {
    showToast(plan.message);
    return false;
  }
  const day = currentDay.value;
  const exId = props.exercise.id;
  if (plan.weight !== '') updateWeight(day, exId, plan.targetIdx, plan.weight);
  if (plan.reps !== '') updateReps(day, exId, plan.targetIdx, plan.reps);
  if (plan.rir !== null) updateRir(day, exId, plan.targetIdx, plan.rir, plan.rirPlus);
  showToast(copiedMessage(plan.targetIdx));
  return true;
}

// Swipe on a set row (touch or pen only; a drag that starts on a button does nothing).
// The row uses touch-action pan-y, so a vertical drag still scrolls the page.
let swipe = null;

function onRowPointerDown(e, sIdx) {
  if (e.pointerType === 'mouse') return;
  if (e.target && e.target.closest && e.target.closest('button, input, textarea, a')) return;
  swipe = { id: e.pointerId, sIdx, x0: e.clientX, y0: e.clientY };
}

function onRowPointerUp(e, sIdx) {
  if (!swipe || swipe.id !== e.pointerId || swipe.sIdx !== sIdx) {
    swipe = null;
    return;
  }
  const dx = e.clientX - swipe.x0;
  const dy = e.clientY - swipe.y0;
  swipe = null;
  if (isHorizontalSwipe(dx, dy)) copySetTo(sIdx);
}

function onRowPointerCancel() {
  swipe = null;
}

function onToggle(sIdx) {
  const isNowChecked = toggleSetDone(currentDay.value, props.exercise.id, sIdx);
  if (isNowChecked) {
    triggerHaptic([35]);
    // Superset round: rest only after the whole round is done (ungrouped exercises rest after every set, as before).
    const dayExercises = [
      ...((workoutData[currentDay.value] || {}).exercises || []),
      ...((workoutData[currentDay.value] || {}).bonusExercises || [])
    ];
    const startRest = shouldRestAfterTick(
      superset.groups.value,
      props.exercise.id,
      sIdx,
      doneFromState(userState[currentDay.value]),
      countFromExercises(dayExercises)
    );
    if (startRest) {
      // Custom rest (gap item 5): the rest uses the saved value of the exercise whose set was ticked,
      // the same value shown on the card.
      const saved = getCustomRest(props.exercise.id);
      if (saved) setTimerDuration(saved);
      startTimer();
    }
    evaluatePrOnTick(sIdx);
  } else {
    setPrFlag(currentDay.value, props.exercise.id, sIdx, false);
  }
}
</script>
