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
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-plate/60 backdrop-blur-sm select-none"
      @click.self="closePlateCalculator"
    >
      <div
        class="w-full max-w-lg bg-paper border-4 border-plate rounded-3xl shadow-[0_12px_40px_rgba(30,34,32,0.35)] p-4 sm:p-6 max-h-[92vh] overflow-y-auto flex flex-col gap-4 select-none"
        @click.stop
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b-2 border-plate/20 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-flame-bg border-2 border-plate flex items-center justify-center text-flame text-xl shadow-[2px_2px_0px_#1e2220]">
              🏋️
            </div>
            <div>
              <span class="text-[10px] font-mono font-bold tracking-widest text-flame uppercase block">
                BARBELL UTILITY
              </span>
              <h3 class="text-lg font-heading font-extrabold text-ink leading-tight">
                Plate Calculator
              </h3>
            </div>
          </div>

          <button
            @click="closePlateCalculator"
            class="w-8 h-8 rounded-full border-2 border-plate bg-white hover:bg-paper-dim flex items-center justify-center text-ink font-bold shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            title="ปิดหน้าต่าง"
          >
            ✕
          </button>
        </div>

        <!-- Weight Display & Steppers -->
        <div class="bg-white border-2 border-plate shadow-[3px_3px_0px_#1e2220] rounded-2xl p-4 flex flex-col gap-3">
          <div class="flex items-baseline justify-between">
            <span class="text-xs font-mono font-bold text-ink-muted">น้ำหนักเป้าหมายรวมบาร์</span>
            <span class="text-xs font-mono font-bold text-flame">
              ข้างละ {{ calculation.perSideWeight }} กก.
            </span>
          </div>

          <div class="flex items-center justify-between gap-3">
            <div class="flex items-baseline gap-2">
              <span class="font-mono tabular-nums text-4xl sm:text-5xl font-extrabold text-ink tracking-tight">
                {{ targetWeight }}
              </span>
              <span class="font-mono text-base font-bold text-flame">กก.</span>
            </div>

            <!-- Stepper Buttons -->
            <div class="flex items-center gap-1.5 flex-wrap justify-end">
              <button
                v-for="delta in [-10, -2.5, 2.5, 10]"
                :key="delta"
                @click="adjustWeight(delta)"
                class="px-2.5 py-1.5 rounded-xl border-2 border-plate text-xs font-mono font-bold shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                :class="delta < 0 ? 'bg-paper-subtle hover:bg-paper-dim text-ink' : 'bg-flame-bg hover:bg-flame hover:text-white text-flame'"
              >
                {{ delta > 0 ? `+${delta}` : delta }}
              </button>
            </div>
          </div>

          <!-- Barbell Selector -->
          <div class="pt-2 border-t border-plate/15">
            <span class="text-[11px] font-mono font-bold text-ink-muted block mb-1.5">
              เลือกขนาดบาร์ (Bar Weight):
            </span>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              <button
                v-for="bar in barPresets"
                :key="bar.id"
                @click="selectBarPreset(bar)"
                class="px-2 py-1.5 rounded-xl border-2 border-plate text-left text-xs font-mono transition-all flex items-center justify-between"
                :class="selectedBar.id === bar.id
                  ? 'bg-ink text-white font-bold shadow-[2px_2px_0px_#e11d48]'
                  : 'bg-paper-subtle hover:bg-paper-dim text-ink shadow-[1px_1px_0px_#1e2220]'"
              >
                <span class="truncate">{{ bar.name.split('(')[0] }}</span>
                <span class="font-bold ml-1">{{ bar.weight }}k</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Visual Barbell Sleeve Simulator -->
        <div class="bg-paper-subtle border-2 border-plate shadow-[3px_3px_0px_#1e2220] rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono font-bold text-ink uppercase tracking-wider">
              ภาพจำลองใส่แผ่น (1 ข้าง / One Side)
            </span>
            <span class="text-[11px] font-mono text-ink-muted">
              {{ calculation.platesPerSide.length }} แผ่น
            </span>
          </div>

          <!-- Horizontal Bar & Plates Graphic -->
          <div class="h-36 sm:h-40 bg-white border-2 border-plate rounded-xl p-2 sm:p-4 flex items-center overflow-x-auto shadow-inner relative">
            <!-- Left Collar (Sleeve Stop) -->
            <div class="w-3.5 h-32 sm:h-36 bg-stone-800 rounded-l border border-stone-900 flex-shrink-0 relative shadow-md">
              <div class="absolute inset-y-0 right-0 w-1 bg-stone-700"></div>
            </div>

            <!-- Sleeve Axis extending right -->
            <div class="h-6 bg-gradient-to-b from-stone-300 via-stone-200 to-stone-400 border-y border-stone-400 absolute left-6 right-4 z-0"></div>

            <!-- Plates Stacked on Sleeve -->
            <div class="flex items-center gap-1 z-10 pl-1.5 flex-shrink-0">
              <div
                v-for="(p, idx) in calculation.platesPerSide"
                :key="idx"
                :style="{ backgroundColor: p.color, color: p.textColor }"
                class="rounded-lg border-2 border-plate shadow-[2px_2px_0px_#1e2220] flex flex-col items-center justify-between py-1 transition-all flex-shrink-0 select-none animate-fadeIn"
                :class="[p.widthClass, p.heightClass]"
                :title="`${p.name}`"
              >
                <span class="text-[8px] sm:text-[9px] font-mono font-bold leading-none opacity-80">KG</span>
                <span class="text-xs sm:text-sm font-mono font-extrabold leading-none tracking-tight">
                  {{ p.weight }}
                </span>
                <span class="text-[8px] sm:text-[9px] font-mono font-bold leading-none opacity-80">KG</span>
              </div>

              <!-- Empty Bar Sleeve Indicator if 0 plates -->
              <div
                v-if="calculation.platesPerSide.length === 0"
                class="flex items-center gap-2 pl-4 text-xs font-mono font-bold text-ink-muted/70 italic"
              >
                ← บาร์เปล่า {{ selectedBar.weight }} กก. ไม่ต้องใส่แผ่นเพิ่ม
              </div>
            </div>
          </div>

          <!-- Plate Breakdown Badges -->
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-mono font-bold text-ink">แผ่นที่ต้องใส่:</span>
            <div
              v-for="item in calculation.plateSummary"
              :key="item.weight"
              :style="{ backgroundColor: item.color, color: item.textColor }"
              class="px-2.5 py-1 rounded-lg border border-plate text-xs font-mono font-bold shadow-[1px_1px_0px_#1e2220] flex items-center gap-1.5"
            >
              <span>{{ item.weight }} kg</span>
              <span class="bg-black/20 px-1.5 py-0.2 rounded-full text-[10px]">x{{ item.count }}</span>
            </div>

            <div
              v-if="calculation.remainder > 0"
              class="px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-500 text-amber-900 text-xs font-mono font-bold flex items-center gap-1"
            >
              <span>⚠️ เศษข้างละ {{ calculation.remainder }} กก. (รวม {{ calculation.remainder * 2 }} กก.)</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3 pt-2">
          <button
            @click="closePlateCalculator"
            class="flex-1 h-12 rounded-xl bg-paper-subtle hover:bg-paper-dim border-2 border-plate text-ink font-heading font-bold text-sm shadow-[2.5px_2.5px_0px_#1e2220] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all"
          >
            ยกเลิก (Cancel)
          </button>

          <button
            @click="applyWeight"
            class="flex-2 h-12 rounded-xl bg-flame hover:bg-flame-glow border-2 border-plate text-white font-heading font-extrabold text-base shadow-[3px_3px_0px_#1e2220] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all flex items-center justify-center gap-2"
          >
            <span>นำค่าน้ำหนักนี้ไปใช้ ({{ targetWeight }} กก.)</span>
            <svg class="w-5 h-5 fill-current" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { usePlateCalculator } from '../composables/usePlateCalculator';

const {
  isOpen,
  targetWeight,
  selectedBar,
  barPresets,
  calculation,
  closePlateCalculator,
  adjustWeight,
  selectBarPreset,
  applyWeight
} = usePlateCalculator();
</script>
