<template>
  <div class="min-h-screen bg-paper text-ink pb-44 sm:pb-48 font-body selection:bg-flame selection:text-white">
    <!-- Floating Toast Notification -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="-translate-y-12 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-12 opacity-0"
    >
      <div
        v-if="toastMessage"
        class="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald text-white font-heading font-bold text-xs px-4 py-2.5 rounded-xl shadow-[3px_3px_0px_#1e2220] border-2 border-plate pointer-events-none flex items-center gap-2"
      >
        <svg class="w-4 h-4 fill-current" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
        <span>{{ toastMessage }}</span>
      </div>
    </transition>

    <!-- Header -->
    <HeaderBar />

    <!-- Main Container -->
    <!-- Main Container -->
    <main
      class="max-w-3xl mx-auto px-2.5 sm:px-4 py-3 sm:py-4 overflow-x-hidden"
      :class="isWorkoutDay ? 'pb-36 sm:pb-40' : 'pb-24 sm:pb-28'"
    >
      <!-- 1. Workouts View (Global Tab) -->
      <WorkoutsView
        v-if="currentTab === 'workouts'"
        @create-routine="openNewRoutine"
        @edit-routine="openEditRoutine"
        @open-runner="isRunnerMinimized = false"
      />

      <!-- 2. Exercises View (Global Tab) -->
      <ExerciseLibraryModal
        v-else-if="currentTab === 'exercises'"
        :is-open="true"
        :inline="true"
        mode="browse"
        @close="currentTab = 'workouts'"
      />

      <!-- 3. History View (Global Tab) -->
      <HistoryView v-else-if="currentTab === 'history'" />

      <!-- 4. Profile View (Global Tab) -->
      <ProfileView v-else-if="currentTab === 'profile'" />

      <!-- Fallback / Legacy Day View (if currentDay or currentTab is mon/tue/wed/thu) -->
      <div v-else-if="isWorkoutDay && currentDayData && !showRestToday">
        <!-- Routine Banner -->
        <div class="archive-card p-4 mb-4">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[10px] font-mono font-bold tracking-widest text-flame uppercase">
              DAILY PROTOCOL
            </span>
            <span class="text-plate/30">•</span>
            <span class="text-[11px] font-mono text-ink-muted">
              ท่าละ 4 เซ็ต (1 วอร์ม + 3 เล่นจริง)
            </span>
          </div>
          <h2 class="text-lg font-bold font-heading text-ink tracking-tight">
            {{ currentDayData.title }}
          </h2>
          <p class="text-xs text-ink-muted mt-0.5 font-body">
            {{ currentDayData.subtitle }}
          </p>

          <!-- Progress Bar -->
          <div class="mt-3.5 pt-3 border-t-2 border-plate/10">
            <div class="flex items-center justify-between text-xs font-mono mb-1.5">
              <span class="text-ink-muted font-bold">
                ความคืบหน้าท่าประจำวัน:
                <strong class="text-ink tabular-nums">{{ completedSetsCount }}</strong> / {{ totalSetsCount }} เซ็ต
              </span>
              <span class="text-flame font-bold tabular-nums">{{ progressPercent }}%</span>
            </div>
            <div class="w-full h-2.5 bg-surface-card border-2 border-plate rounded-full overflow-hidden p-[1px]">
              <div
                class="h-full bg-flame transition-all duration-300 rounded-full"
                :style="{ width: `${progressPercent}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Next Session Overview Bar -->
        <NextSessionOverview
          :day-key="currentDay"
          :day-data="currentDayData"
          :user-state="userState"
          :last-weights="lastWeights"
        />

        <!-- Exercise Cards List -->
        <div class="space-y-3">
          <ExerciseCard
            v-for="(ex, idx) in currentDayData.exercises"
            :key="ex.id"
            :exercise="ex"
            :index="idx"
          />
        </div>

        <!-- Bonus Touch-Up Exercises -->
        <div v-if="currentDayData.bonusExercises && currentDayData.bonusExercises.length > 0" class="mt-6 mb-4">
          <div class="flex items-center gap-2.5 mb-3 px-1">
            <span class="w-2.5 h-2.5 rounded-full bg-flame"></span>
            <div>
              <h3 class="text-sm font-bold font-heading text-flame tracking-tight">
                ซ้อมเสริมท่าหลักส่วนที่เหลือท้ายคาบ (Bonus Touch-Up)
              </h3>
              <p class="text-[11px] text-ink-muted font-body">
                เลือกซ้อมเพิ่ม 2 เซ็ตต่อส่วน (1 วอร์ม 15 ครั้ง + 1 เล่นจริง 6–8 ครั้ง) RPE 7–8 ห้ามหมดแรงคาเครื่อง
              </p>
            </div>
          </div>

          <div class="space-y-3">
            <BonusCard
              v-for="(bEx, bIdx) in currentDayData.bonusExercises"
              :key="bEx.id"
              :bonus="bEx"
              :index="bIdx"
            />
          </div>
        </div>

        <!-- Finish & Commit Session Button -->
        <div class="mt-8 mb-6">
          <button
            @click="finishAndSaveWorkout"
            class="w-full bg-flame hover:bg-flame-glow text-white font-heading font-bold text-sm tracking-wide py-3.5 px-4 rounded-xl border-2 border-plate shadow-[3px_3px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-2.5"
          >
            <svg class="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span>บันทึกประวัติและจำน้ำหนักวันนี้ (Save Session)</span>
          </button>
        </div>
      </div>

      <!-- Rest Day View Fallback -->
      <RestDayView v-else-if="currentDay === 'rest' || currentTab === 'rest' || showRestToday" />

      <!-- Todo View Fallback -->
      <TodoView v-else-if="currentDay === 'todo' || currentTab === 'todo'" />
    </main>

    <!-- Fixed Bottom Mobile Navigation & Timer Dock -->
    <div class="fixed bottom-0 left-0 right-0 z-40 bg-paper/95 backdrop-blur-md border-t-2 border-plate shadow-[0_-6px_25px_rgba(30,34,32,0.12)]">
      <!-- Rest Timer Bar (Workout days or whenever timer is actively running) -->
      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <RestTimer v-if="isWorkoutDay || isTimerRunning" />
      </transition>

      <!-- 4-Tab Global Navigation Bottom Bar -->
      <DayTabs v-model:current-tab="currentTab" />
    </div>

    <!-- In-App Numeric PIN Keypad Bottom Sheet (z-50) -->
    <PinKeypad />

    <!-- Barbell Plate Calculator Modal (z-50) -->
    <PlateCalculatorModal />

    <!-- Exercise Library Modal (Browse / Search / Create Custom) -->
    <ExerciseLibraryModal
      :is-open="showExerciseLibrary"
      mode="browse"
      @close="showExerciseLibrary = false"
    />

    <!-- Routine Builder Modal (Create / Edit Routine) -->
    <RoutineBuilderModal
      :is-open="showRoutineBuilder"
      :initial-routine="editingRoutine"
      @close="showRoutineBuilder = false"
      @saved="onRoutineSaved"
    />

    <!-- Active Live Workout Runner Sheet -->
    <ActiveWorkoutSheet
      v-if="isWorkoutActive && !isRunnerMinimized"
      @finish="handleWorkoutFinished"
      @discard="isRunnerMinimized = false"
      @minimize="isRunnerMinimized = true"
    />

    <!-- Workout Summary Celebration Modal -->
    <WorkoutSummaryModal
      :is-open="isSummaryModalOpen"
      :summary="lastWorkoutSummary"
      @close="isSummaryModalOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useWorkoutStore } from './composables/useWorkoutStore';
import { useTimer } from './composables/useTimer';
import { useActiveSessionStore } from './composables/useActiveSessionStore';
import HeaderBar from './components/HeaderBar.vue';
import DayTabs from './components/DayTabs.vue';
import NextSessionOverview from './components/NextSessionOverview.vue';
import ExerciseCard from './components/ExerciseCard.vue';
import BonusCard from './components/BonusCard.vue';
import RestTimer from './components/RestTimer.vue';
import HistoryView from './components/HistoryView.vue';
import TodoView from './components/TodoView.vue';
import RestDayView from './components/RestDayView.vue';
import PinKeypad from './components/PinKeypad.vue';
import PlateCalculatorModal from './components/PlateCalculatorModal.vue';
import ExerciseLibraryModal from './components/ExerciseLibraryModal.vue';
import RoutineBuilderModal from './components/RoutineBuilderModal.vue';
import ActiveWorkoutSheet from './components/ActiveWorkoutSheet.vue';
import WorkoutSummaryModal from './components/WorkoutSummaryModal.vue';
import WorkoutsView from './components/WorkoutsView.vue';
import ProfileView from './components/ProfileView.vue';
import { isRestWeekday } from './data/workouts.js';

const {
  currentDay,
  currentTab,
  workoutData,
  userState,
  lastWeights,
  toastMessage,
  showToast,
  finishAndSaveWorkout,
  fetchServerState
} = useWorkoutStore();

const { isRunning: isTimerRunning } = useTimer();
const { isWorkoutActive, startSessionFromRoutine, startEmptySession } = useActiveSessionStore();

// Modal Visibility State
const showExerciseLibrary = ref(false);
const showRoutineBuilder = ref(false);
const editingRoutine = ref(null);
const isSummaryModalOpen = ref(false);
const lastWorkoutSummary = ref(null);
const isRunnerMinimized = ref(false);

function handleWorkoutFinished(summary) {
  lastWorkoutSummary.value = summary;
  isSummaryModalOpen.value = true;
  isRunnerMinimized.value = false;
  showToast('ยินดีด้วย! บันทึกรอบฝึกเรียบร้อย');
}

function startTodayLiveWorkout() {
  isRunnerMinimized.value = false;
  if (currentDayData.value && currentDayData.value.exercises) {
    const routine = {
      id: currentDay.value,
      title: currentDayData.value.title,
      subtitle: currentDayData.value.subtitle,
      exercises: currentDayData.value.exercises.map(ex => ({
        exerciseId: ex.id,
        name: ex.name,
        muscleGroup: ex.mainMuscle,
        equipment: ex.altName || ex.equipment,
        sets: (ex.sets || []).map(s => {
          const setType = s.type === 'warm' ? 'warmup' : (s.type || 'working');
          return {
            type: setType,
            targetReps: s.targetReps || (setType === 'warmup' ? 15 : 8),
            targetWeight: s.targetWeight || 0
          };
        })
      }))
    };
    startSessionFromRoutine(routine);
  } else {
    startEmptySession({ title: 'Quick Workout' });
  }
}

function openNewRoutine() {
  editingRoutine.value = null;
  showRoutineBuilder.value = true;
}

function openEditRoutine(routine) {
  editingRoutine.value = routine;
  showRoutineBuilder.value = true;
}

function onRoutineSaved(routine) {
  if (routine && routine.title) {
    showToast(`บันทึกตาราง "${routine.title}" เรียบร้อยแล้ว!`);
  }
}

onMounted(() => {
  fetchServerState();
});

// currentDay is always a resolved key: prog_a | prog_b | rest | todo | history (store resolves mon/wed/fri/tue/thu)
const activeDayKey = computed(() => currentDay.value);
const isWorkoutDay = computed(() => ['prog_a', 'prog_b'].includes(activeDayKey.value));
// วันนี้ on a rest weekday (Tue/Thu/Sat/Sun) shows the rest view; the program is still reachable from โปรแกรม.
const showRestToday = computed(() => currentTab.value === 'today' && isRestWeekday());
const currentDayData = computed(() => workoutData[activeDayKey.value]);

// Progress calculation
const totalSetsCount = computed(() => {
  if (!currentDayData.value) return 0;
  let total = currentDayData.value.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  if (Array.isArray(currentDayData.value.bonusExercises)) {
    total += currentDayData.value.bonusExercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  }
  return total;
});

const completedSetsCount = computed(() => {
  if (!currentDayData.value) return 0;
  const dayState = userState[activeDayKey.value] || {};
  let done = 0;
  currentDayData.value.exercises.forEach(ex => {
    const exState = dayState[ex.id] || {};
    ex.sets.forEach((_, sIdx) => {
      if (exState[`set_${sIdx}`]) done++;
    });
  });
  if (Array.isArray(currentDayData.value.bonusExercises)) {
    currentDayData.value.bonusExercises.forEach(ex => {
      const exState = dayState[ex.id] || {};
      ex.sets.forEach((_, sIdx) => {
        if (exState[`set_${sIdx}`]) done++;
      });
    });
  }
  return done;
});

const progressPercent = computed(() => {
  if (totalSetsCount.value === 0) return 0;
  return Math.round((completedSetsCount.value / totalSetsCount.value) * 100);
});
</script>
