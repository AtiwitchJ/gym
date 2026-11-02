<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
    @click.self="$emit('close')"
  >
    <div
      class="w-full max-w-lg max-h-[90vh] flex flex-col bg-paper border-2 border-plate rounded-xl shadow-[4px_4px_0px_#1e2220] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between px-3.5 py-2.5 bg-paper-subtle border-b-2 border-plate">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-flame border border-plate"></span>
          <h3 class="text-sm sm:text-base font-bold font-mono text-ink tracking-tight">
            ตารางแผนรอบหน้า (Next Session)
          </h3>
        </div>
        <button
          type="button"
          @click="$emit('close')"
          class="w-7 h-7 flex items-center justify-center rounded-md border-2 border-plate bg-white hover:bg-paper text-ink font-mono font-bold text-xs shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
          title="ปิด"
        >
          ✕
        </button>
      </div>

      <!-- Table Body (Scrollable) -->
      <div class="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 font-mono text-xs">
        <!-- Exercise Target Rows -->
        <div class="border-2 border-plate rounded-lg overflow-hidden bg-white shadow-[2px_2px_0px_#1e2220]">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-paper-subtle border-b-2 border-plate text-[10px] sm:text-[11px] font-bold text-ink-muted">
                <th class="py-2 px-2.5">ท่าฝึก</th>
                <th class="py-2 px-2 text-center">สถิติล่าสุด</th>
                <th class="py-2 px-2 text-center">เป้าหมายรอบหน้า</th>
                <th class="py-2 px-2 text-center">ปรับ</th>
              </tr>
            </thead>
            <tbody class="divide-y border-plate">
              <tr
                v-for="item in planItems"
                :key="item.id"
                class="hover:bg-paper-subtle/40 transition-colors"
              >
                <!-- Exercise Name & Tag -->
                <td class="py-2 px-2.5 align-middle">
                  <div class="font-bold text-ink leading-tight">{{ item.name }}</div>
                  <div class="text-[9px] text-ink-muted">{{ item.category }}</div>
                </td>

                <!-- Last Stats -->
                <td class="py-2 px-2 text-center align-middle whitespace-nowrap">
                  <div v-if="item.lastWarmup" class="text-[10px] text-sky-600 font-bold">
                    วอร์ม: {{ item.lastWarmup }}
                  </div>
                  <div v-if="item.lastWork" class="text-[10px] text-ink font-bold">
                    จริง: {{ item.lastWork }}
                  </div>
                  <div v-if="!item.lastWarmup && !item.lastWork" class="text-[10px] text-ink-muted">
                    -
                  </div>
                </td>

                <!-- Next Targets -->
                <td class="py-2 px-2 text-center align-middle whitespace-nowrap">
                  <div v-if="item.nextWarmup !== null" class="text-[10px] text-sky-700 font-bold">
                    วอร์ม: {{ item.nextWarmup }} กก.
                  </div>
                  <div v-if="item.nextWork !== null" class="text-[11px] text-ink font-bold">
                    จริง: {{ item.nextWork }} กก.
                  </div>
                  <div v-if="item.nextWarmup === null && item.nextWork === null" class="text-[10px] text-ink-muted">
                    -
                  </div>
                </td>

                <!-- Status Badge -->
                <td class="py-2 px-2 text-center align-middle whitespace-nowrap">
                  <span
                    class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border border-plate shadow-[1px_1px_0px_#1e2220]"
                    :class="item.badgeClass"
                  >
                    {{ item.badgeText }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Rules Guide Box (Compact & Low Verbosity) -->
        <div class="p-2.5 rounded-lg border-2 border-plate bg-paper-subtle text-[11px] space-y-1">
          <div class="font-bold text-ink flex items-center justify-between border-b border-plate/30 pb-1">
            <span>กติกาการคำนวณ Progressive Overload</span>
            <span class="text-[9px] text-ink-muted font-normal">Hypertrophy Target</span>
          </div>
          <div class="space-y-0.5 text-[10px] text-ink leading-relaxed">
            <div class="flex items-center justify-between">
              <span>• เซ็ตเล่นจริง (เป้า 6–8 ครั้ง):</span>
              <span class="font-bold">&gt;8 ครั้ง: +2 kg | &lt;6 ครั้ง: -2 kg | 6–8: 0 kg</span>
            </div>
            <div class="flex items-center justify-between text-sky-700">
              <span>• เซ็ตวอร์ม (เป้า 15–20 ครั้ง):</span>
              <span class="font-bold">&gt;20 ครั้ง: +2 kg | &lt;12 ครั้ง: -2 kg | 15–20: 0 kg</span>
            </div>
            <div class="text-ink-muted text-[9px] pt-0.5">
              * ท่าซ้อมเสริมคำนวณแยกตามเกณฑ์วอร์มและเซ็ตเล่นจริงอิสระต่อกัน
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-3.5 py-2.5 bg-paper-subtle border-t-2 border-plate flex justify-end">
        <button
          type="button"
          @click="$emit('close')"
          class="px-4 py-1.5 text-xs font-mono font-bold rounded-md border-2 border-plate bg-white hover:bg-paper text-ink shadow-[2px_2px_0px_#1e2220] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
        >
          ปิดหน้าต่าง
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useWeightAdvisor } from '../composables/useWeightAdvisor';

const props = defineProps({
  show: { type: Boolean, default: false },
  dayKey: { type: String, default: 'mon' },
  dayData: { type: Object, default: () => ({}) },
  userState: { type: Object, default: () => ({}) },
  lastWeights: { type: Object, default: () => ({}) }
});

defineEmits(['close']);

const { isWarmupType, getExerciseOverallAdvice } = useWeightAdvisor();

const planItems = computed(() => {
  const items = [];
  if (!props.dayData) return items;

  const daySt = props.userState[props.dayKey] || {};

  function processEx(ex, category) {
    const exSt = daySt[ex.id] || {};
    const setsData = ex.sets.map((s, idx) => {
      const wt = (exSt[`wt_${idx}`] !== undefined && exSt[`wt_${idx}`] !== '')
        ? exSt[`wt_${idx}`]
        : (props.lastWeights[ex.id] && props.lastWeights[ex.id][`wt_${idx}`]) || '';

      const reps = (exSt[`reps_${idx}`] !== undefined && exSt[`reps_${idx}`] !== '')
        ? exSt[`reps_${idx}`]
        : (props.lastWeights[ex.id] && props.lastWeights[ex.id][`reps_${idx}`]) || '';

      return {
        type: s.type,
        weight: wt,
        reps
      };
    });

    const warmSets = setsData.filter(s => isWarmupType(s.type) && s.reps && Number(s.reps) > 0);
    const workSets = setsData.filter(s => !isWarmupType(s.type) && s.reps && Number(s.reps) > 0);

    const lastWarm = warmSets.length > 0 ? warmSets[warmSets.length - 1] : null;
    const lastWork = workSets.length > 0 ? workSets[workSets.length - 1] : null;

    const advice = getExerciseOverallAdvice(setsData);

    let nextWarmup = null;
    if (advice?.warmAdvice) {
      nextWarmup = advice.warmAdvice.suggestedWeight;
    } else if (lastWarm && lastWarm.weight !== '') {
      nextWarmup = Number(lastWarm.weight);
    }

    let nextWork = null;
    if (advice?.workAdvice) {
      nextWork = advice.workAdvice.suggestedWeight;
    } else if (lastWork && lastWork.weight !== '') {
      nextWork = Number(lastWork.weight);
    }

    let badgeText = '0 kg';
    let badgeClass = 'bg-emerald text-white';

    if (advice?.workAdvice) {
      if (advice.workAdvice.delta > 0) {
        badgeText = `+${advice.workAdvice.delta} kg`;
        badgeClass = 'bg-flame text-white';
      } else if (advice.workAdvice.delta < 0) {
        badgeText = `${advice.workAdvice.delta} kg`;
        badgeClass = 'bg-amber-500 text-white';
      }
    } else if (advice?.warmAdvice && advice.warmAdvice.delta !== 0) {
      badgeText = advice.warmAdvice.delta > 0 ? `+${advice.warmAdvice.delta} kg` : `${advice.warmAdvice.delta} kg`;
      badgeClass = advice.warmAdvice.delta > 0 ? 'bg-flame text-white' : 'bg-amber-500 text-white';
    }

    items.push({
      id: ex.id,
      name: ex.name,
      category,
      lastWarmup: lastWarm ? `${lastWarm.weight}kg × ${lastWarm.reps}` : null,
      lastWork: lastWork ? `${lastWork.weight}kg × ${lastWork.reps}` : null,
      nextWarmup,
      nextWork,
      badgeText,
      badgeClass
    });
  }

  if (props.dayData.exercises) {
    props.dayData.exercises.forEach(ex => {
      processEx(ex, ex.isMain ? 'ท่าหลัก' : 'ท่าเสริม');
    });
  }

  if (props.dayData.bonusExercises) {
    props.dayData.bonusExercises.forEach(bEx => {
      processEx(bEx, 'ซ้อมเสริม');
    });
  }

  return items;
});
</script>
