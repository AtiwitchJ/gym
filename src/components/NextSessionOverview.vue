<template>
  <div
    v-if="dayData && totalCount > 0"
    class="mb-3 p-2 sm:px-3 sm:py-2.5 rounded-lg border-2 border-plate bg-paper shadow-[2px_2px_0px_#1e2220] flex items-center justify-between gap-2 font-mono text-xs select-none"
  >
    <!-- Left: Tally Badges -->
    <div class="flex items-center gap-1.5 flex-wrap">
      <span class="text-[11px] sm:text-[11px] font-bold text-ink-muted uppercase tracking-wider mr-1">
        แผนรอบหน้ารวม:
      </span>
      <span
        v-if="increaseCount > 0"
        class="px-1.5 sm:px-2 py-0.5 rounded text-[11px] sm:text-[11px] font-bold bg-flame text-white border border-plate shadow-[1px_1px_0px_#1e2220]"
      >
        +2 kg ({{ increaseCount }} ท่า)
      </span>
      <span
        v-if="optimalCount > 0"
        class="px-1.5 sm:px-2 py-0.5 rounded text-[11px] sm:text-[11px] font-bold bg-emerald text-white border border-plate shadow-[1px_1px_0px_#059669]"
      >
        0 kg ({{ optimalCount }} ท่า)
      </span>
      <span
        v-if="decreaseCount > 0"
        class="px-1.5 sm:px-2 py-0.5 rounded text-[11px] sm:text-[11px] font-bold bg-amber-500 text-white border border-plate shadow-[1px_1px_0px_#1e2220]"
      >
        -2 kg ({{ decreaseCount }} ท่า)
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useWeightAdvisor } from '../composables/useWeightAdvisor';
import { useWorkoutStore } from '../composables/useWorkoutStore';

const props = defineProps({
  dayKey: { type: String, default: 'mon' },
  dayData: { type: Object, default: () => ({}) },
  userState: { type: Object, default: () => ({}) },
  lastWeights: { type: Object, default: () => ({}) }
});

defineEmits(['open-plan']);

const { getExerciseOverallAdvice } = useWeightAdvisor();
const { getExerciseLastRecord } = useWorkoutStore();

const stats = computed(() => {
  let inc = 0;
  let dec = 0;
  let opt = 0;
  let total = 0;

  if (!props.dayData) return { inc, dec, opt, total };

  const daySt = props.userState[props.dayKey] || {};

  function checkEx(ex) {
    total++;
    const exSt = daySt[ex.id] || {};
    const exLast = getExerciseLastRecord(ex.id);
    const setsData = ex.sets.map((s, idx) => {
      let wt = (exSt[`wt_${idx}`] !== undefined && exSt[`wt_${idx}`] !== '')
        ? exSt[`wt_${idx}`]
        : (exLast[`wt_${idx}`] !== undefined && exLast[`wt_${idx}`] !== '')
          ? exLast[`wt_${idx}`]
          : '';

      let reps = (exSt[`reps_${idx}`] !== undefined && exSt[`reps_${idx}`] !== '')
        ? exSt[`reps_${idx}`]
        : (exLast[`reps_${idx}`] !== undefined && exLast[`reps_${idx}`] !== '')
          ? exLast[`reps_${idx}`]
          : '';

      if (idx >= 1 && (wt === '' || wt === undefined)) {
        if (exLast.wt_1 !== undefined && exLast.wt_1 !== '') wt = exLast.wt_1;
        else if (exLast.wt_2 !== undefined && exLast.wt_2 !== '') wt = exLast.wt_2;
        else if (exLast.wt_3 !== undefined && exLast.wt_3 !== '') wt = exLast.wt_3;
      }
      if (idx >= 1 && (reps === '' || reps === undefined)) {
        if (exLast.reps_1 !== undefined && exLast.reps_1 !== '') reps = exLast.reps_1;
        else if (exLast.reps_2 !== undefined && exLast.reps_2 !== '') reps = exLast.reps_2;
        else if (exLast.reps_3 !== undefined && exLast.reps_3 !== '') reps = exLast.reps_3;
      }

      return {
        type: s.type,
        weight: wt,
        reps
      };
    });

    const advice = getExerciseOverallAdvice(setsData);
    if (advice?.workAdvice) {
      if (advice.workAdvice.delta > 0) inc++;
      else if (advice.workAdvice.delta < 0) dec++;
      else opt++;
    } else if (advice?.warmAdvice && advice.warmAdvice.delta !== 0) {
      if (advice.warmAdvice.delta > 0) inc++;
      else dec++;
    } else {
      opt++;
    }
  }

  if (props.dayData.exercises) {
    props.dayData.exercises.forEach(checkEx);
  }
  if (props.dayData.bonusExercises) {
    props.dayData.bonusExercises.forEach(checkEx);
  }

  return { inc, dec, opt, total };
});

const increaseCount = computed(() => stats.value.inc);
const decreaseCount = computed(() => stats.value.dec);
const optimalCount = computed(() => stats.value.opt);
const totalCount = computed(() => stats.value.total);
</script>
