<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-plate/60 backdrop-blur-sm select-none"
    @click.self="$emit('close')"
  >
    <div
      class="w-full max-w-lg bg-paper border-4 border-plate rounded-t-3xl sm:rounded-3xl shadow-[0_12px_40px_rgba(30,34,32,0.35)] p-4 sm:p-6 max-h-[90vh] flex flex-col font-body text-ink"
      role="dialog"
      aria-modal="true"
      aria-labelledby="substitution-modal-title"
    >
      <!-- Modal Header -->
      <div class="flex items-start justify-between gap-3 border-b-2 border-plate/20 pb-3">
        <div class="min-w-0 flex-1">
          <span class="text-[11px] font-mono font-bold tracking-widest text-emerald-text uppercase block">
            EXERCISE SUBSTITUTION · สลับท่าฝึกทดแทน
          </span>
          <h3 id="substitution-modal-title" class="text-base sm:text-lg font-extrabold font-heading text-ink leading-tight truncate mt-0.5">
            ท่าปัจจุบัน: 🏋️ {{ exercise?.name || 'ท่าฝึก' }}
          </h3>
          <div class="text-[11px] font-mono text-ink-muted mt-1 flex flex-wrap items-center gap-1.5">
            <span>กลุ่มกล้ามเนื้อ: 🎯 {{ formatMuscleGroup(exercise?.mainMuscle) }}</span>
            <span>•</span>
            <span>อุปกรณ์เดิม: {{ formatEquipment(exercise?.equipment) }}</span>
          </div>
        </div>
        <button
          type="button"
          class="min-h-[44px] min-w-[44px] w-11 h-11 rounded-full border-2 border-plate bg-white flex items-center justify-center text-ink font-bold shadow-[2px_2px_0px_#1e2220] hover:bg-paper-subtle active:translate-x-[0.5px] active:translate-y-[0.5px] touch-manipulation flex-shrink-0"
          title="ปิด"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Equipment Filter Chips -->
      <div class="py-2.5 border-b border-plate/20">
        <div class="text-xs font-heading font-bold text-ink mb-1.5">
          ฟิลเตอร์อุปกรณ์ที่ว่างในยิม:
        </div>
        <div class="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
          <button
            v-for="opt in EQUIPMENT_OPTIONS"
            :key="opt.key"
            type="button"
            class="min-h-[44px] px-3 py-1.5 rounded-xl border-2 border-plate font-mono text-xs font-bold transition-all select-none whitespace-nowrap touch-manipulation flex-shrink-0"
            :class="selectedEquipment === opt.key
              ? 'bg-flame text-white shadow-[2px_2px_0px_#1e2220]'
              : 'bg-white hover:bg-paper-subtle text-ink shadow-[1px_1px_0px_#1e2220]'"
            @click="selectFilter(opt.key)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <!-- Candidate Substitutes List -->
      <div class="overflow-y-auto flex-1 my-3 pr-1 space-y-2.5 max-h-[46vh]">
        <div v-if="loading" class="text-xs font-mono text-ink-muted text-center py-8">
          กำลังค้นหาท่าทดแทนที่เหมาะสม...
        </div>
        <div v-else-if="currentSubstitutes.length === 0" class="text-xs font-mono text-ink-muted text-center py-8 bg-surface-low rounded-2xl border-2 border-dashed border-plate/30">
          ไม่พบท่าทดแทนในหมวดอุปกรณ์นี้
        </div>
        <div
          v-for="sub in currentSubstitutes"
          :key="sub.id"
          class="bg-white border-2 border-plate rounded-2xl p-3 sm:p-3.5 shadow-[2px_2px_0px_#1e2220] transition-all cursor-pointer"
          :class="selectedSubstitute?.id === sub.id ? 'border-flame ring-2 ring-flame bg-flame-bg/20' : 'hover:bg-paper-subtle'"
          @click="selectedSubstitute = sub"
        >
          <!-- Top Row: Name and Badges -->
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-sm select-none">{{ sub.isUserFavorite ? '⭐' : '🔹' }}</span>
                <span class="font-heading font-extrabold text-sm text-ink leading-snug">
                  {{ sub.name }}
                </span>
                <span
                  v-if="sub.isUserFavorite"
                  class="text-[11px] font-mono font-bold text-flame-text bg-flame-bg px-1.5 py-0.5 rounded border border-flame/30"
                >
                  ท่าโปรด
                </span>
              </div>
              <div class="text-[11px] font-mono text-ink-muted mt-0.5">
                อุปกรณ์: {{ formatEquipment(sub.equipment) }}
              </div>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
              <span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-bg text-emerald-text border border-emerald/30 whitespace-nowrap">
                {{ sub.matchScore }}% ตรงจุด
              </span>
              <button
                type="button"
                class="min-h-[44px] min-w-[44px] p-1 text-ink hover:text-flame transition-colors touch-manipulation flex items-center justify-center"
                :title="sub.isUserFavorite ? 'นำออกจากท่าโปรด' : 'ปักหมุดเป็นท่าโปรด'"
                @click.stop="toggleFavorite(sub)"
              >
                <span class="text-base">{{ sub.isUserFavorite ? '★' : '☆' }}</span>
              </button>
            </div>
          </div>

          <!-- Reason & Biomechanical Details -->
          <p class="text-xs font-body text-ink mt-1.5 leading-relaxed">
            {{ sub.matchReason }}
          </p>

          <!-- Weight Conversion Advice -->
          <div class="mt-2 p-2 rounded-xl bg-surface border border-plate/20 text-xs font-mono">
            <div class="font-bold text-ink">
              💡 น้ำหนักแนะนำ: {{ getCalculatedWeightAdvice(sub) }}
            </div>
            <div class="text-[11px] text-ink-muted mt-0.5">
              {{ sub.ratioExplanation }}
            </div>
          </div>

          <!-- Select Button -->
          <button
            type="button"
            class="min-h-[44px] min-w-[44px] w-full mt-2.5 rounded-xl border-2 border-plate font-heading font-bold text-xs flex items-center justify-center gap-1.5 transition-all touch-manipulation"
            :class="selectedSubstitute?.id === sub.id
              ? 'bg-gold text-ink shadow-[2px_2px_0px_#1e2220]'
              : 'bg-white hover:bg-paper-dim text-ink shadow-[1.5px_1.5px_0px_#1e2220]'"
            @click.stop="selectedSubstitute = sub"
          >
            <span>{{ selectedSubstitute?.id === sub.id ? '✓ เลือกท่านี้แล้ว' : 'เลือกท่านี้' }}</span>
          </button>
        </div>
      </div>

      <!-- Bottom Option & Confirm Actions -->
      <div class="border-t-2 border-plate/20 pt-2.5 space-y-2.5">
        <label class="min-h-[44px] flex items-center gap-2.5 cursor-pointer select-none text-xs font-heading font-bold text-ink touch-manipulation">
          <input
            v-model="convertSetsOption"
            type="checkbox"
            class="w-5 h-5 rounded border-2 border-plate text-flame accent-flame"
          />
          <span>คงจำนวนเซ็ตและปรับสัดส่วนน้ำหนักอัตโนมัติ (Preserve &amp; Convert Sets)</span>
        </label>

        <div class="flex items-center justify-between gap-2">
          <button
            type="button"
            class="min-h-[44px] px-4 py-2 rounded-xl border-2 border-plate bg-white hover:bg-paper-subtle text-ink font-heading font-bold text-sm shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] touch-manipulation"
            @click="$emit('close')"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            :disabled="!selectedSubstitute"
            class="min-h-[44px] px-4 py-2 rounded-xl border-2 border-plate bg-flame hover:bg-flame/90 text-white font-heading font-extrabold text-sm shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] touch-manipulation disabled:opacity-50"
            @click="confirmSwap"
          >
            🔄 ยืนยันการสลับท่า
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useExerciseSubstitutes, EQUIPMENT_OPTIONS, formatWeightAdvice } from '../composables/useExerciseSubstitutes.js';
import { useWorkoutStore } from '../composables/useWorkoutStore.js';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  exercise: { type: Object, default: () => ({}) },
  exerciseIndex: { type: Number, default: 0 },
  dayKey: { type: String, default: '' }
});

const emit = defineEmits(['close', 'swapped']);

const workoutStore = useWorkoutStore();
const {
  currentSubstitutes,
  loading,
  fetchSubstitutes,
  addFavoriteSubstitute,
  removeFavoriteSubstitute,
  swapExerciseInWorkout
} = useExerciseSubstitutes();

const selectedEquipment = ref('all');
const selectedSubstitute = ref(null);
const convertSetsOption = ref(true);

function selectFilter(eqKey) {
  selectedEquipment.value = eqKey;
  if (props.exercise?.id) {
    fetchSubstitutes(props.exercise, eqKey);
  }
}

watch(
  () => [props.isOpen, props.exercise?.id],
  ([open, id]) => {
    if (open && id) {
      selectedEquipment.value = 'all';
      selectedSubstitute.value = null;
      fetchSubstitutes(props.exercise, 'all');
    }
  },
  { immediate: true }
);

function formatMuscleGroup(raw) {
  if (!raw) return 'กล้ามเนื้อรวม';
  return String(raw).replace(/\(.*?\)/g, '').trim();
}

function formatEquipment(raw) {
  const eq = String(raw || '').toLowerCase();
  if (eq === 'dumbbell') return 'ดัมเบล (Dumbbell)';
  if (eq === 'cable') return 'เคเบิล (Cable)';
  if (eq === 'machine') return 'แมชชีน (Machine)';
  if (eq === 'smith_machine') return 'สมิธแมชชีน (Smith)';
  if (eq === 'barbell') return 'บาร์เบล (Barbell)';
  if (eq === 'bodyweight') return 'บอดี้เวท (Bodyweight)';
  return raw || 'อุปกรณ์ทั่วไป';
}

function getCalculatedWeightAdvice(sub) {
  // Try to find current recorded weight for this exercise
  const day = props.dayKey || workoutStore.currentDay.value;
  const currentDraft = workoutStore.userState?.[day]?.[props.exercise?.id];
  let currentWeight = null;
  if (currentDraft) {
    for (let i = 0; i < 5; i++) {
      if (currentDraft[`wt_${i}`] && !isNaN(Number(currentDraft[`wt_${i}`]))) {
        currentWeight = Number(currentDraft[`wt_${i}`]);
        break;
      }
    }
  }
  if (!currentWeight && workoutStore.lastWeights?.[props.exercise?.id]) {
    currentWeight = Number(workoutStore.lastWeights[props.exercise.id]);
  }

  return formatWeightAdvice(currentWeight, sub.weightRatio, sub.equipment);
}

async function toggleFavorite(sub) {
  if (sub.isUserFavorite) {
    await removeFavoriteSubstitute(props.exercise?.id, sub.id);
  } else {
    await addFavoriteSubstitute(props.exercise?.id, sub.id, 1, sub.matchReason);
  }
}

function confirmSwap() {
  if (!selectedSubstitute.value || !props.exercise) return;

  const result = swapExerciseInWorkout({
    dayKey: props.dayKey || workoutStore.currentDay.value,
    exerciseIndex: props.exerciseIndex,
    oldExercise: props.exercise,
    substitute: selectedSubstitute.value,
    convertSets: convertSetsOption.value
  });

  if (result.success) {
    emit('swapped', {
      oldExercise: props.exercise,
      substitute: selectedSubstitute.value,
      convertSets: convertSetsOption.value
    });
    emit('close');
  }
}
</script>
