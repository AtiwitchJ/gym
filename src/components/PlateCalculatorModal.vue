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
      class="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-plate/60 backdrop-blur-sm select-none"
      @click.self="closePlateCalculator"
    >
      <div
        class="w-full max-w-lg bg-paper border-4 border-plate rounded-3xl shadow-[0_12px_40px_rgba(30,34,32,0.35)] p-4 sm:p-6 max-h-[92vh] overflow-y-auto flex flex-col gap-4 select-none"
        @click.stop
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b-2 border-plate/20 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-flame-bg border-2 border-plate flex items-center justify-center text-flame-text text-xl shadow-[2px_2px_0px_#1e2220]">
              🏋️
            </div>
            <div>
              <span class="text-[11px] font-mono font-bold tracking-widest text-flame-text uppercase block">
                BARBELL UTILITY
              </span>
              <h3 class="text-lg font-heading font-extrabold text-ink leading-tight">
                Plate Calculator
              </h3>
            </div>
          </div>

          <button
            @click="closePlateCalculator"
            class="min-h-[44px] min-w-[44px] w-9 h-9 rounded-full border-2 border-plate bg-white hover:bg-paper-dim flex items-center justify-center text-ink font-bold shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
            title="ปิดหน้าต่าง"
          >
            ✕
          </button>
        </div>

        <!-- Weight Display & Steppers -->
        <div class="bg-white border-2 border-plate shadow-[3px_3px_0px_#1e2220] rounded-2xl p-4 flex flex-col gap-3">
          <div class="flex items-baseline justify-between">
            <span class="text-xs font-mono font-bold text-ink-muted">น้ำหนักเป้าหมายรวมบาร์</span>
            <span class="text-xs font-mono font-bold text-flame-text">
              <template v-if="targetWeight && targetWeight > 0">
                ข้างละ {{ calculation.perSideWeight }} กก.
              </template>
              <template v-else>
                ข้างละ — กก.
              </template>
            </span>
          </div>

          <!-- Weight Origin / Guidance Notice -->
          <div
            v-if="!targetWeight || targetWeight <= 0"
            class="px-3 py-2 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-xs font-mono font-bold flex items-center gap-2 shadow-xs"
          >
            <span class="text-base flex-shrink-0">⚠️</span>
            <span>เซ็ตนี้ยังไม่ได้ระบุน้ำหนัก: กรุณาเลือกหรือระบุน้ำหนักก่อนนำไปใช้</span>
          </div>
          <div
            v-else-if="!isWeightFromSet"
            class="px-2.5 py-1 rounded-lg bg-paper-subtle border border-plate/30 text-ink-muted text-xs font-mono flex items-center justify-between"
          >
            <span>⚙️ ระบุน้ำหนักเริ่มต้น: {{ targetWeight }} กก.</span>
            <span class="text-[11px] text-amber-700 font-bold">(ไม่ได้ดึงค่าจากเซ็ต)</span>
          </div>
          <div
            v-else
            class="px-2.5 py-1 rounded-lg bg-gold/15 border border-gold/40 text-ink text-xs font-mono flex items-center justify-between"
          >
            <span>🏋️ ค่าน้ำหนักจากเซ็ต: {{ targetWeight }} กก.</span>
            <span class="text-[11px] text-emerald-700 font-bold">✓ ดึงจากเซ็ต</span>
          </div>

          <div class="flex items-center justify-between gap-3">
            <div class="flex items-baseline gap-2">
              <span v-if="targetWeight && targetWeight > 0" class="font-mono tabular-nums text-4xl sm:text-5xl font-extrabold text-ink tracking-tight">
                {{ targetWeight }}
              </span>
              <span v-else class="font-mono text-3xl sm:text-4xl font-extrabold text-ink-muted/50 tracking-tight">
                —
              </span>
              <span class="font-mono text-base font-bold text-flame-text">กก.</span>
            </div>

            <!-- Stepper Buttons -->
            <div class="flex items-center gap-1.5 flex-wrap justify-end">
              <button
                v-for="delta in [-10, -2.5, 2.5, 10]"
                :key="delta"
                @click="adjustWeight(delta)"
                class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border-2 border-plate text-xs font-mono font-bold shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation flex items-center justify-center"
                :class="delta < 0 ? 'bg-paper-subtle hover:bg-paper-dim text-ink' : 'bg-flame-bg hover:bg-flame hover:text-white text-flame-text'"
              >
                {{ delta > 0 ? `+${delta}` : delta }}
              </button>
            </div>
          </div>

          <!-- Quick presets when setting weight -->
          <div class="pt-1 flex items-center gap-1.5 flex-wrap">
            <span class="text-[11px] font-mono text-ink-muted">เลือกด่วน:</span>
            <button
              v-for="presetWt in [selectedBar.weight, 40, 60, 80]"
              :key="presetWt"
              type="button"
              @click="setTargetWeight(presetWt)"
              class="min-h-[44px] px-2.5 py-1 rounded-xl border-2 border-plate/30 hover:border-plate bg-paper-subtle hover:bg-gold/20 text-xs font-mono font-bold text-ink shadow-[1px_1px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
              :class="targetWeight === presetWt ? 'bg-gold/30 border-plate font-extrabold' : ''"
            >
              {{ presetWt === selectedBar.weight ? `บาร์เปล่า (${presetWt}k)` : `${presetWt}k` }}
            </button>
            <button
              v-if="targetWeight !== null"
              type="button"
              @click="setTargetWeight(null)"
              class="min-h-[44px] px-2.5 py-1 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-mono font-bold transition-all shadow-[1px_1px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none touch-manipulation ml-auto"
              title="ล้างค่าน้ำหนักเป็นค่าว่าง"
            >
              ล้างค่า
            </button>
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
                class="min-h-[44px] px-2 py-1.5 rounded-xl border-2 border-plate text-left text-xs font-mono transition-all flex items-center justify-between touch-manipulation"
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
                <span class="text-[11px] sm:text-[11px] font-mono font-bold leading-none opacity-80">KG</span>
                <span class="text-xs sm:text-sm font-mono font-extrabold leading-none tracking-tight">
                  {{ p.weight }}
                </span>
                <span class="text-[11px] sm:text-[11px] font-mono font-bold leading-none opacity-80">KG</span>
              </div>

              <!-- Empty Bar Sleeve Indicator if 0 plates or empty target -->
              <div
                v-if="!targetWeight || targetWeight <= 0"
                class="flex items-center gap-2 pl-4 text-xs font-mono font-bold text-amber-800 italic"
              >
                ← เซ็ตยังไม่มีน้ำหนัก: โปรดเลือกหรือเพิ่มน้ำหนักเพื่อดูแผ่นเหล็ก
              </div>
              <div
                v-else-if="calculation.platesPerSide.length === 0"
                class="flex items-center gap-2 pl-4 text-xs font-mono font-bold text-ink-muted/70 italic"
              >
                ← บาร์เปล่า {{ selectedBar.weight }} กก. ไม่ต้องใส่แผ่นเพิ่ม
              </div>
            </div>
          </div>

          <!-- Plate Breakdown Badges & Remainder/Shortage Alerts -->
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-mono font-bold text-ink">แผ่นที่ต้องใส่:</span>
            <div
              v-for="item in calculation.plateSummary"
              :key="item.weight"
              :style="{ backgroundColor: item.color, color: item.textColor }"
              class="px-2.5 py-1 rounded-lg border border-plate text-xs font-mono font-bold shadow-[1px_1px_0px_#1e2220] flex items-center gap-1.5"
            >
              <span>{{ item.weight }} kg</span>
              <span class="bg-black/20 px-1.5 py-0.2 rounded-full text-[11px]">x{{ item.count }}</span>
            </div>

            <!-- Shortage Alert: when plates in inventory are insufficient -->
            <div
              v-if="calculation.hasShortage || calculation.shortage > 0"
              class="w-full mt-1 px-3 py-2 rounded-xl bg-red-100 border-2 border-red-500 text-red-950 text-xs font-mono font-bold flex items-center gap-2 shadow-[2px_2px_0px_#1e2220]"
            >
              <span class="text-base flex-shrink-0">⚠️</span>
              <div>
                <span>แผ่นเหล็กในคลังไม่พอ: ขาดอีก {{ calculation.shortage }} กก. (จัดได้จริงรวม {{ calculation.achievedTotal }} กก.)</span>
              </div>
            </div>

            <!-- Remainder Alert: when target has odd fractions not made by plates -->
            <div
              v-else-if="calculation.remainder > 0"
              class="px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-500 text-amber-900 text-xs font-mono font-bold flex items-center gap-1"
            >
              <span>⚠️ เศษข้างละ {{ calculation.remainder }} กก. (รวม {{ calculation.remainder * 2 }} กก.)</span>
            </div>
          </div>
        </div>

        <!-- Plate Inventory Settings Section -->
        <div class="bg-white border-2 border-plate shadow-[3px_3px_0px_#1e2220] rounded-2xl p-4 flex flex-col gap-3">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold text-ink uppercase tracking-wider">
                คลังแผ่นเหล็กในยิม (Gym Inventory)
              </span>
              <span class="text-[11px] font-mono text-ink-muted">
                (คู่ / Pairs)
              </span>
            </div>

            <button
              type="button"
              @click="resetPlateInventory"
              class="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl border border-plate/30 hover:border-flame bg-paper-subtle hover:bg-flame-bg text-ink-muted hover:text-flame-text text-xs font-mono font-bold transition-all shadow-[1px_1px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1 touch-manipulation"
              title="รีเซ็ตจำนวนแผ่นกลับเป็นค่าเริ่มต้น"
            >
              <span>↺</span>
              <span>คืนค่าเริ่มต้น</span>
            </button>
          </div>

          <p class="text-[11px] font-body text-ink-muted leading-tight">
            กำหนดจำนวนคู่ของแผ่นเหล็กที่มีในยิม (1 คู่ = ข้างละ 1 แผ่น) ระบบจะคำนวณไม่เกินจำนวนที่มี
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <div
              v-for="plate in availablePlates"
              :key="plate.weight"
              class="flex items-center justify-between p-2 rounded-xl border border-plate/20 bg-paper-subtle"
            >
              <div class="flex items-center gap-2">
                <span
                  class="w-3.5 h-6 rounded border border-plate/40 flex-shrink-0"
                  :style="{ backgroundColor: plate.color }"
                ></span>
                <span class="text-xs font-mono font-bold text-ink">
                  {{ plate.name }}
                </span>
              </div>

              <!-- Steppers: -1, count, +1 with strict 44px touch target -->
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  @click="setPlatePairs(plate.weight, (plateInventory[plate.weight] || 0) - 1)"
                  :disabled="(plateInventory[plate.weight] || 0) <= 0"
                  class="min-h-[44px] min-w-[44px] w-11 h-11 rounded-xl border-2 border-plate bg-white hover:bg-paper-dim disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center font-mono font-bold text-sm text-ink shadow-[1px_1px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
                  :aria-label="`ลดแผ่น ${plate.name}`"
                >
                  -
                </button>

                <span class="w-8 text-center font-mono font-extrabold text-sm text-ink tabular-nums">
                  {{ plateInventory[plate.weight] ?? 0 }}
                </span>

                <button
                  type="button"
                  @click="setPlatePairs(plate.weight, (plateInventory[plate.weight] || 0) + 1)"
                  class="min-h-[44px] min-w-[44px] w-11 h-11 rounded-xl border-2 border-plate bg-white hover:bg-paper-dim flex items-center justify-center font-mono font-bold text-sm text-ink shadow-[1px_1px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
                  :aria-label="`เพิ่มแผ่น ${plate.name}`"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3 pt-2">
          <button
            @click="closePlateCalculator"
            class="flex-1 min-h-[44px] h-12 rounded-xl bg-paper-subtle hover:bg-paper-dim border-2 border-plate text-ink font-heading font-bold text-sm shadow-[2.5px_2.5px_0px_#1e2220] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all touch-manipulation"
          >
            ยกเลิก (Cancel)
          </button>

          <button
            @click="applyWeight"
            :disabled="!targetWeight || targetWeight <= 0"
            class="flex-2 min-h-[44px] h-12 rounded-xl border-2 font-heading font-extrabold text-base transition-all flex items-center justify-center gap-2 touch-manipulation"
            :class="(!targetWeight || targetWeight <= 0)
              ? 'bg-stone-200 border-stone-300 text-stone-400 cursor-not-allowed shadow-none'
              : 'bg-flame hover:bg-flame-glow border-plate text-white shadow-[3px_3px_0px_#1e2220] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none'"
          >
            <span v-if="targetWeight && targetWeight > 0">นำค่าน้ำหนักนี้ไปใช้ ({{ targetWeight }} กก.)</span>
            <span v-else>โปรดเลือก/ระบุน้ำหนักก่อน</span>
            <svg v-if="targetWeight && targetWeight > 0" class="w-5 h-5 fill-current" viewBox="0 0 20 20">
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
  isWeightFromSet,
  selectedBar,
  barPresets,
  availablePlates,
  plateInventory,
  setPlatePairs,
  resetPlateInventory,
  calculation,
  openPlateCalculator,
  closePlateCalculator,
  setTargetWeight,
  adjustWeight,
  selectBarPreset,
  applyWeight
} = usePlateCalculator();
</script>
