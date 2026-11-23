<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-plate/60 backdrop-blur-sm select-none"
    @click.self="$emit('close')"
  >
    <div
      class="bg-paper border-4 border-plate rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_12px_40px_rgba(30,34,32,0.35)] max-w-md w-full max-h-[90vh] overflow-y-auto flex flex-col gap-4 text-ink font-body"
      role="dialog"
      aria-modal="true"
      aria-labelledby="set-type-modal-title"
    >
      <!-- Modal Header -->
      <div class="flex items-start justify-between gap-3 border-b-2 border-plate/20 pb-3">
        <div class="min-w-0 flex-1">
          <span class="text-[11px] font-mono font-bold tracking-widest text-emerald-text uppercase block">
            🏷️ เลือกประเภทเซ็ต (SET CLASSIFICATION)
          </span>
          <h3 id="set-type-modal-title" class="text-base sm:text-lg font-extrabold font-heading text-ink leading-tight truncate mt-0.5">
            {{ exerciseName || 'ท่าฝึก' }} · เซ็ตที่ {{ setNumber }}
          </h3>
        </div>
        <button
          type="button"
          class="min-h-[44px] min-w-[44px] w-11 h-11 rounded-full border-2 border-plate bg-white flex items-center justify-center text-ink font-bold shadow-[2px_2px_0px_#1e2220] hover:bg-paper-subtle active:translate-x-[0.5px] active:translate-y-[0.5px] touch-manipulation flex-shrink-0 focus-visible:ring-2 focus-visible:ring-plate"
          title="ปิด"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Instruction Hint -->
      <p class="text-xs text-ink-muted font-body leading-snug">
        แตะเลือกประเภทเซ็ตที่ต้องการสำหรับเซ็ตนี้:
      </p>

      <!-- Option Cards -->
      <div class="space-y-2.5">
        <button
          v-for="opt in options"
          :key="opt.id"
          type="button"
          @click="selectType(opt.id)"
          class="w-full min-h-[52px] p-3 rounded-2xl border-2 border-plate flex items-center justify-between gap-3 text-left transition-all active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none focus-visible:ring-2 focus-visible:ring-plate touch-manipulation select-none"
          :class="currentNormalized === opt.id
            ? 'bg-gold/20 shadow-[2px_2px_0px_#1e2220] border-plate ring-1 ring-plate'
            : 'bg-white hover:bg-paper-subtle shadow-[1.5px_1.5px_0px_#1e2220]'"
        >
          <!-- Left: Badge -->
          <div
            class="min-w-[40px] h-10 px-2 rounded-xl flex items-center justify-center text-center flex-shrink-0"
            :class="opt.badgeClass"
          >
            <span class="text-sm font-mono font-extrabold">
              {{ opt.id === 'normal' ? setNumber : opt.badge }}
            </span>
          </div>

          <!-- Center: Text Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-xs sm:text-sm font-heading font-extrabold text-ink leading-tight">
                {{ opt.name }}
              </span>
              <span class="text-[11px] font-mono text-ink-muted">
                ({{ opt.enName }})
              </span>
            </div>
            <p class="text-[11px] text-ink-muted font-body mt-0.5 leading-tight">
              {{ opt.desc }}
            </p>
          </div>

          <!-- Right: Selection indicator -->
          <div class="flex-shrink-0">
            <span
              v-if="currentNormalized === opt.id"
              class="min-h-[44px] px-2.5 py-1.5 rounded-lg border-2 border-plate bg-gold text-ink font-mono font-bold text-[11px] inline-flex items-center gap-1 shadow-[1px_1px_0px_#1e2220]"
            >
              เลือกแล้ว ✓
            </span>
            <span
              v-else
              class="min-h-[44px] px-2 py-1.5 rounded-lg border border-plate/30 bg-surface-low text-ink-muted font-mono font-medium text-[11px] inline-flex items-center"
            >
              เลือก
            </span>
          </div>
        </button>
      </div>

      <!-- Footer Close Button -->
      <div class="pt-2 border-t-2 border-plate/15">
        <button
          type="button"
          class="w-full min-h-[44px] px-4 py-2.5 rounded-xl border-2 border-plate bg-white hover:bg-paper-subtle text-ink font-heading font-bold text-sm shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-plate"
          @click="$emit('close')"
        >
          ปิดหน้าต่าง
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { SET_TYPE_CONFIG, normalizeSetType } from '../composables/useSetTypes.js';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  exerciseName: { type: String, default: '' },
  setNumber: { type: [Number, String], default: 1 },
  currentType: { type: String, default: 'normal' }
});

const emit = defineEmits(['close', 'select']);

const currentNormalized = computed(() => normalizeSetType(props.currentType));

const options = computed(() => [
  SET_TYPE_CONFIG.normal,
  SET_TYPE_CONFIG.warmup,
  SET_TYPE_CONFIG.drop,
  SET_TYPE_CONFIG.failure
]);

function selectType(typeId) {
  emit('select', typeId);
}
</script>
