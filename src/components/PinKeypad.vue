<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-full"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-full"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex flex-col justify-end bg-plate/60 backdrop-blur-sm select-none touch-none"
      @click.self="closeKeypad"
    >
      <!-- Keypad Drawer Box -->
      <div
        class="w-full max-w-md mx-auto bg-paper border-t-4 sm:border-4 border-plate sm:rounded-3xl shadow-[0_-8px_35px_rgba(30,34,32,0.25)] p-4 sm:p-5 pb-[max(20px,env(safe-area-inset-bottom))] transition-all select-none touch-manipulation"
        @click.stop
      >
        <!-- Top Handle & Header -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex flex-col">
            <span class="text-[11px] font-mono font-bold tracking-widest text-flame-text uppercase">
              {{ mode === 'weight' ? 'WEIGHT INPUT' : 'REPS INPUT' }}
            </span>
            <h3 class="text-base font-bold font-heading text-ink leading-tight">
              {{ title }}
            </h3>
            <p class="text-xs text-ink-muted font-body">
              {{ subtitle }}
            </p>
          </div>

          <button
            @click="closeKeypad"
            class="w-8 h-8 rounded-full border-2 border-plate bg-white hover:bg-paper-dim flex items-center justify-center text-ink font-bold shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            title="ปิดแป้นตัวเลข"
          >
            ✕
          </button>
        </div>

        <!-- Big Display Plate -->
        <div class="bg-white border-2 border-plate shadow-[3px_3px_0px_#1e2220] rounded-2xl p-3 sm:p-4 mb-3 flex items-center justify-between">
          <div class="flex items-baseline gap-2 overflow-hidden">
            <span
              class="font-mono tabular-nums text-3xl sm:text-4xl font-extrabold tracking-tight truncate"
              :class="displayValue ? 'text-ink' : 'text-ink-muted'"
            >
              {{ displayValue || '—' }}
            </span>
            <span class="font-mono text-sm font-bold text-flame-text">
              {{ unit }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="clear"
              class="min-h-[44px] min-w-[44px] text-[11px] font-mono font-bold px-2 py-1 rounded border border-plate/30 text-ink-muted hover:text-flame-text bg-paper-subtle hover:bg-flame-bg transition-colors"
            >
              ล้าง
            </button>
          </div>
        </div>

        <!-- Quick Stepper / Hint Chips -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
          <!-- Progressive Overload Suggested Chip -->
          <button
            v-if="suggestedHint"
            @click="setValue(suggestedHint)"
            class="px-2.5 py-1 rounded-full border-2 border-plate bg-flame hover:bg-flame-glow text-white text-xs font-mono font-bold shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none whitespace-nowrap transition-all flex items-center gap-1 select-none"
            :title="`กดเพื่อใส่ค่าน้ำหนักแนะนำ ${suggestedHint} ${unit}`"
          >
            <span>⚡ {{ suggestedLabel || `แนะนำ: ${suggestedHint} ${unit}` }}</span>
          </button>

          <!-- Previous Hint Chip -->
          <button
            v-if="prevHint"
            @click="setValue(prevHint)"
            class="px-2.5 py-1 rounded-full border-2 border-plate bg-flame-bg hover:bg-flame hover:text-white text-flame-text text-xs font-mono font-bold shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none whitespace-nowrap transition-all"
          >
            ครั้งก่อน: {{ prevHint }}
          </button>

          <!-- Target Hint Chip (for reps) -->
          <button
            v-if="targetHint"
            @click="setValue(targetHint)"
            class="px-2.5 py-1 rounded-full border-2 border-plate bg-sky-bg hover:bg-sky hover:text-white text-sky-text text-xs font-mono font-bold shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none whitespace-nowrap transition-all"
          >
            เป้าหมาย: {{ targetHint }}
          </button>

          <!-- Stepper Adjust Chips -->
          <button
            v-for="p in presets"
            :key="p"
            @click="adjust(p)"
            class="px-2.5 py-1 rounded-full border-2 border-plate bg-white hover:bg-paper-dim text-ink text-xs font-mono font-bold shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none whitespace-nowrap transition-all"
          >
            {{ p > 0 ? `+${p}` : p }}
          </button>
        </div>

        <!-- 3x4 Numeric Keypad Grid -->
        <div class="grid grid-cols-3 gap-2 sm:gap-2.5 mb-3">
          <button
            v-for="n in [1, 2, 3, 4, 5, 6, 7, 8, 9]"
            :key="n"
            @click="append(n)"
            class="h-12 sm:h-14 rounded-xl bg-white hover:bg-paper-subtle active:bg-paper-dim border-2 border-plate shadow-[2.5px_2.5px_0px_#1e2220] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none text-2xl font-mono font-bold text-ink flex items-center justify-center transition-all select-none"
          >
            {{ n }}
          </button>

          <!-- Decimal Dot (Disabled or Hidden for Reps) -->
          <button
            v-if="mode === 'weight'"
            @click="append('.')"
            class="h-12 sm:h-14 rounded-xl bg-white hover:bg-paper-subtle active:bg-paper-dim border-2 border-plate shadow-[2.5px_2.5px_0px_#1e2220] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none text-2xl font-mono font-bold text-ink flex items-center justify-center transition-all select-none"
          >
            .
          </button>
          <button
            v-else
            @click="adjust(5)"
            class="h-12 sm:h-14 rounded-xl bg-paper-subtle hover:bg-paper-dim border-2 border-plate shadow-[2.5px_2.5px_0px_#1e2220] text-xs font-mono font-bold text-ink flex items-center justify-center transition-all select-none"
          >
            +5
          </button>

          <!-- Zero -->
          <button
            @click="append(0)"
            class="h-12 sm:h-14 rounded-xl bg-white hover:bg-paper-subtle active:bg-paper-dim border-2 border-plate shadow-[2.5px_2.5px_0px_#1e2220] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none text-2xl font-mono font-bold text-ink flex items-center justify-center transition-all select-none"
          >
            0
          </button>

          <!-- Backspace -->
          <button
            @click="backspace"
            class="h-12 sm:h-14 rounded-xl bg-paper-subtle hover:bg-paper-dim active:bg-paper-dim border-2 border-plate shadow-[2.5px_2.5px_0px_#1e2220] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none text-ink flex items-center justify-center transition-all select-none"
            title="ลบตัวเลขตัวล่าสุด"
          >
            <svg class="w-6 h-6 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
              <line x1="18" y1="9" x2="12" y2="15" />
              <line x1="12" y1="9" x2="18" y2="15" />
            </svg>
          </button>
        </div>

        <!-- Abnormal Weight Warning Guard Banner -->
        <div
          v-if="isAbnormal"
          class="mb-3 p-2.5 bg-amber-50 border-2 border-amber-500 rounded-xl flex items-start gap-2 shadow-[2px_2px_0px_#b45309] text-xs font-mono text-amber-950"
        >
          <span class="text-base leading-none">⚠️</span>
          <div class="flex-1">
            <span class="font-bold text-amber-900 block">ตรวจพบค่าน้ำหนักผิดปกติ</span>
            <span class="text-[11px] leading-tight block text-amber-800">{{ anomalyWarning }}</span>
            <span v-if="guardAcknowledged" class="text-[11px] font-bold text-flame-text block mt-0.5">
              ⚠️ กด "ยืนยันค่าน้ำหนักนี้" อีกครั้งหากต้องการใช้ค่านี้จริง
            </span>
          </div>
        </div>

        <!-- Big Confirmation Button -->
        <button
          @click="confirm"
          class="w-full h-12 sm:h-14 rounded-xl text-white font-heading font-extrabold text-base tracking-wide border-2 border-plate shadow-[3px_3px_0px_#1e2220] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center gap-2 transition-all select-none"
          :class="isAbnormal ? (guardAcknowledged ? 'bg-amber-600 hover:bg-amber-500' : 'bg-amber-500 hover:bg-amber-600') : 'bg-flame hover:bg-flame-glow'"
        >
          <span>{{ guardAcknowledged ? 'ยืนยันค่าน้ำหนักนี้ (Confirm Anyway)' : 'ตกลง (DONE)' }}</span>
          <svg class="w-5 h-5 fill-current" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { usePinKeypad } from '../composables/usePinKeypad';

const {
  isOpen,
  title,
  subtitle,
  mode,
  unit,
  displayValue,
  targetHint,
  prevHint,
  suggestedHint,
  suggestedLabel,
  presets,
  isAbnormal,
  anomalyWarning,
  guardAcknowledged,
  closeKeypad,
  append,
  backspace,
  clear,
  adjust,
  setValue,
  confirm
} = usePinKeypad();

</script>
