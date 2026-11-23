<template>
  <div class="muscle-heatmap-container flex flex-col items-center w-full">
    <!-- 2D Anatomical SVG Silhouette -->
    <div class="relative w-full max-w-[320px] aspect-[320/420] flex items-center justify-center p-1">
      <svg
        viewBox="0 0 320 420"
        class="w-full h-full select-none touch-manipulation drop-shadow-sm"
        role="img"
        :aria-label="view === 'front' ? 'แบบจำลองกล้ามเนื้อด้านหน้า' : 'แบบจำลองกล้ามเนื้อด้านหลัง'"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Defs for filter and styling -->
        <defs>
          <filter id="neobrutal-shadow" x="-5%" y="-5%" width="115%" height="115%">
            <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="#1e2220" />
          </filter>
        </defs>

        <!-- Base Anatomical Body Silhouette (Neutral Background Structure) -->
        <g class="body-base opacity-40">
          <!-- Head & Neck -->
          <ellipse cx="160" cy="40" rx="22" ry="26" fill="#E5E7EB" stroke="#1E2220" stroke-width="2" />
          <rect x="152" y="62" width="16" height="22" fill="#E5E7EB" stroke="#1E2220" stroke-width="2" />

          <!-- Torso Base Silhouette -->
          <path
            d="M 124 84 L 196 84 L 210 136 L 180 220 L 140 220 L 110 136 Z"
            fill="#F3F4F6"
            stroke="#1E2220"
            stroke-width="2"
            stroke-linejoin="round"
          />

          <!-- Arms Base -->
          <!-- Left Arm Base -->
          <path
            d="M 108 90 L 92 136 L 80 190 L 70 246 L 84 248 L 98 196 L 114 142 Z"
            fill="#F3F4F6"
            stroke="#1E2220"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <!-- Right Arm Base -->
          <path
            d="M 212 90 L 228 136 L 240 190 L 250 246 L 236 248 L 222 196 L 206 142 Z"
            fill="#F3F4F6"
            stroke="#1E2220"
            stroke-width="2"
            stroke-linejoin="round"
          />

          <!-- Legs Base -->
          <!-- Left Leg Base -->
          <path
            d="M 130 220 L 156 220 L 152 312 L 148 392 L 130 392 L 126 312 Z"
            fill="#F3F4F6"
            stroke="#1E2220"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <!-- Right Leg Base -->
          <path
            d="M 164 220 L 190 220 L 194 312 L 190 392 L 172 392 L 168 312 Z"
            fill="#F3F4F6"
            stroke="#1E2220"
            stroke-width="2"
            stroke-linejoin="round"
          />

          <!-- Feet Base -->
          <path d="M 128 392 L 148 392 L 146 406 L 120 406 Z" fill="#E5E7EB" stroke="#1E2220" stroke-width="2" />
          <path d="M 172 392 L 192 392 L 200 406 L 174 406 Z" fill="#E5E7EB" stroke="#1E2220" stroke-width="2" />
        </g>

        <!-- ================= FRONT VIEW MUSCLES ================= -->
        <g v-if="view === 'front'" class="front-muscles">
          <!-- Traps (Front) -->
          <g
            role="button"
            tabindex="0"
            :aria-label="ariaLabelFor('traps')"
            class="cursor-pointer transition-transform hover:opacity-95"
            @click="selectMuscle('traps')"
            @keydown.enter="selectMuscle('traps')"
            @keydown.space.prevent="selectMuscle('traps')"
          >
            <title>{{ titleFor('traps') }}</title>
            <path
              d="M 148 68 L 124 88 L 138 94 L 152 74 Z M 172 68 L 196 88 L 182 94 L 168 74 Z"
              :fill="getFillColor('traps')"
              stroke="#1E2220"
              :stroke-width="selectedMuscleKey === 'traps' ? 3.5 : 2"
              stroke-linejoin="round"
            />
          </g>

          <!-- Delts (Front Shoulders) -->
          <g
            role="button"
            tabindex="0"
            :aria-label="ariaLabelFor('delts')"
            class="cursor-pointer transition-transform hover:opacity-95"
            @click="selectMuscle('delts')"
            @keydown.enter="selectMuscle('delts')"
            @keydown.space.prevent="selectMuscle('delts')"
          >
            <title>{{ titleFor('delts') }}</title>
            <path
              d="M 124 88 C 108 92 98 106 98 122 C 98 132 104 140 114 140 C 122 134 126 122 126 106 Z M 196 88 C 212 92 222 106 222 122 C 222 132 216 140 206 140 C 198 134 194 122 194 106 Z"
              :fill="getFillColor('delts')"
              stroke="#1E2220"
              :stroke-width="selectedMuscleKey === 'delts' ? 3.5 : 2"
              stroke-linejoin="round"
            />
          </g>

          <!-- Chest (Pectorals) -->
          <g
            role="button"
            tabindex="0"
            :aria-label="ariaLabelFor('chest')"
            class="cursor-pointer transition-transform hover:opacity-95"
            @click="selectMuscle('chest')"
            @keydown.enter="selectMuscle('chest')"
            @keydown.space.prevent="selectMuscle('chest')"
          >
            <title>{{ titleFor('chest') }}</title>
            <path
              d="M 128 98 C 142 96 155 98 158 102 L 158 138 C 146 142 128 140 122 128 C 120 116 122 106 128 98 Z M 192 98 C 178 96 165 98 162 102 L 162 138 C 174 142 192 140 198 128 C 200 116 198 106 192 98 Z"
              :fill="getFillColor('chest')"
              stroke="#1E2220"
              :stroke-width="selectedMuscleKey === 'chest' ? 3.5 : 2"
              stroke-linejoin="round"
            />
          </g>

          <!-- Biceps (Front Arms) -->
          <g
            role="button"
            tabindex="0"
            :aria-label="ariaLabelFor('biceps')"
            class="cursor-pointer transition-transform hover:opacity-95"
            @click="selectMuscle('biceps')"
            @keydown.enter="selectMuscle('biceps')"
            @keydown.space.prevent="selectMuscle('biceps')"
          >
            <title>{{ titleFor('biceps') }}</title>
            <path
              d="M 112 140 C 104 144 102 158 104 172 C 106 180 112 184 116 182 C 120 178 122 166 120 152 C 118 144 115 141 112 140 Z M 208 140 C 216 144 218 158 216 172 C 214 180 208 184 204 182 C 200 178 198 166 200 152 C 202 144 205 141 208 140 Z"
              :fill="getFillColor('biceps')"
              stroke="#1E2220"
              :stroke-width="selectedMuscleKey === 'biceps' ? 3.5 : 2"
              stroke-linejoin="round"
            />
          </g>

          <!-- Abs (Rectus Abdominis & Core) -->
          <g
            role="button"
            tabindex="0"
            :aria-label="ariaLabelFor('abs')"
            class="cursor-pointer transition-transform hover:opacity-95"
            @click="selectMuscle('abs')"
            @keydown.enter="selectMuscle('abs')"
            @keydown.space.prevent="selectMuscle('abs')"
          >
            <title>{{ titleFor('abs') }}</title>
            <!-- 6-pack anatomical structure -->
            <path
              d="M 140 142 L 157 142 L 157 164 L 141 164 Z M 163 142 L 180 142 L 179 164 L 163 164 Z M 141 167 L 157 167 L 157 189 L 143 189 Z M 163 167 L 179 167 L 177 189 L 163 189 Z M 143 192 L 157 192 L 157 214 L 145 214 Z M 163 192 L 177 192 L 175 214 L 163 214 Z"
              :fill="getFillColor('abs')"
              stroke="#1E2220"
              :stroke-width="selectedMuscleKey === 'abs' ? 3.5 : 2"
              stroke-linejoin="round"
            />
          </g>

          <!-- Quads (Front Thighs) -->
          <g
            role="button"
            tabindex="0"
            :aria-label="ariaLabelFor('quads')"
            class="cursor-pointer transition-transform hover:opacity-95"
            @click="selectMuscle('quads')"
            @keydown.enter="selectMuscle('quads')"
            @keydown.space.prevent="selectMuscle('quads')"
          >
            <title>{{ titleFor('quads') }}</title>
            <path
              d="M 130 220 C 142 218 156 222 156 238 L 154 298 C 148 306 136 306 130 298 C 124 282 124 244 130 220 Z M 190 220 C 178 218 164 222 164 238 L 166 298 C 172 306 184 306 190 298 C 196 282 196 244 190 220 Z"
              :fill="getFillColor('quads')"
              stroke="#1E2220"
              :stroke-width="selectedMuscleKey === 'quads' ? 3.5 : 2"
              stroke-linejoin="round"
            />
          </g>

          <!-- Calves (Front Shins & Calves) -->
          <g
            role="button"
            tabindex="0"
            :aria-label="ariaLabelFor('calves')"
            class="cursor-pointer transition-transform hover:opacity-95"
            @click="selectMuscle('calves')"
            @keydown.enter="selectMuscle('calves')"
            @keydown.space.prevent="selectMuscle('calves')"
          >
            <title>{{ titleFor('calves') }}</title>
            <path
              d="M 134 316 C 142 316 148 328 148 350 C 148 370 144 388 138 388 C 132 388 130 370 130 350 C 130 328 132 316 134 316 Z M 186 316 C 178 316 172 328 172 350 C 172 370 176 388 182 388 C 188 388 190 370 190 350 C 190 328 188 316 186 316 Z"
              :fill="getFillColor('calves')"
              stroke="#1E2220"
              :stroke-width="selectedMuscleKey === 'calves' ? 3.5 : 2"
              stroke-linejoin="round"
            />
          </g>
        </g>

        <!-- ================= BACK VIEW MUSCLES ================= -->
        <g v-else class="back-muscles">
          <!-- Traps (Back Trapezius - Diamond Shape) -->
          <g
            role="button"
            tabindex="0"
            :aria-label="ariaLabelFor('traps')"
            class="cursor-pointer transition-transform hover:opacity-95"
            @click="selectMuscle('traps')"
            @keydown.enter="selectMuscle('traps')"
            @keydown.space.prevent="selectMuscle('traps')"
          >
            <title>{{ titleFor('traps') }}</title>
            <path
              d="M 160 66 L 132 88 C 144 104 152 128 160 152 C 168 128 176 104 188 88 Z"
              :fill="getFillColor('traps')"
              stroke="#1E2220"
              :stroke-width="selectedMuscleKey === 'traps' ? 3.5 : 2"
              stroke-linejoin="round"
            />
          </g>

          <!-- Delts (Posterior Deltoids) -->
          <g
            role="button"
            tabindex="0"
            :aria-label="ariaLabelFor('delts')"
            class="cursor-pointer transition-transform hover:opacity-95"
            @click="selectMuscle('delts')"
            @keydown.enter="selectMuscle('delts')"
            @keydown.space.prevent="selectMuscle('delts')"
          >
            <title>{{ titleFor('delts') }}</title>
            <path
              d="M 124 88 C 108 92 98 106 98 122 C 100 132 106 140 114 138 C 120 130 124 118 126 104 Z M 196 88 C 212 92 222 106 222 122 C 220 132 214 140 206 138 C 200 130 196 118 194 104 Z"
              :fill="getFillColor('delts')"
              stroke="#1E2220"
              :stroke-width="selectedMuscleKey === 'delts' ? 3.5 : 2"
              stroke-linejoin="round"
            />
          </g>

          <!-- Triceps (Back Arms) -->
          <g
            role="button"
            tabindex="0"
            :aria-label="ariaLabelFor('triceps')"
            class="cursor-pointer transition-transform hover:opacity-95"
            @click="selectMuscle('triceps')"
            @keydown.enter="selectMuscle('triceps')"
            @keydown.space.prevent="selectMuscle('triceps')"
          >
            <title>{{ titleFor('triceps') }}</title>
            <path
              d="M 112 138 C 102 144 102 160 104 176 C 106 184 114 186 118 182 C 120 176 120 162 118 148 Z M 208 138 C 218 144 218 160 216 176 C 214 184 206 186 202 182 C 200 176 200 162 202 148 Z"
              :fill="getFillColor('triceps')"
              stroke="#1E2220"
              :stroke-width="selectedMuscleKey === 'triceps' ? 3.5 : 2"
              stroke-linejoin="round"
            />
          </g>

          <!-- Lats (Latissimus Dorsi / Back Wings) -->
          <g
            role="button"
            tabindex="0"
            :aria-label="ariaLabelFor('lats')"
            class="cursor-pointer transition-transform hover:opacity-95"
            @click="selectMuscle('lats')"
            @keydown.enter="selectMuscle('lats')"
            @keydown.space.prevent="selectMuscle('lats')"
          >
            <title>{{ titleFor('lats') }}</title>
            <path
              d="M 134 116 C 124 132 126 164 136 194 C 146 194 154 182 156 160 C 150 144 142 128 134 116 Z M 186 116 C 196 132 194 164 184 194 C 174 194 166 182 164 160 C 170 144 178 128 186 116 Z"
              :fill="getFillColor('lats')"
              stroke="#1E2220"
              :stroke-width="selectedMuscleKey === 'lats' ? 3.5 : 2"
              stroke-linejoin="round"
            />
          </g>

          <!-- Glutes (Buttocks) -->
          <g
            role="button"
            tabindex="0"
            :aria-label="ariaLabelFor('glutes')"
            class="cursor-pointer transition-transform hover:opacity-95"
            @click="selectMuscle('glutes')"
            @keydown.enter="selectMuscle('glutes')"
            @keydown.space.prevent="selectMuscle('glutes')"
          >
            <title>{{ titleFor('glutes') }}</title>
            <path
              d="M 132 202 C 124 212 122 232 128 248 C 136 256 152 256 158 244 C 160 232 158 216 158 202 Z M 188 202 C 196 212 198 232 192 248 C 184 256 168 256 162 244 C 160 232 162 216 162 202 Z"
              :fill="getFillColor('glutes')"
              stroke="#1E2220"
              :stroke-width="selectedMuscleKey === 'glutes' ? 3.5 : 2"
              stroke-linejoin="round"
            />
          </g>

          <!-- Hamstrings (Back of Thighs) -->
          <g
            role="button"
            tabindex="0"
            :aria-label="ariaLabelFor('hamstrings')"
            class="cursor-pointer transition-transform hover:opacity-95"
            @click="selectMuscle('hamstrings')"
            @keydown.enter="selectMuscle('hamstrings')"
            @keydown.space.prevent="selectMuscle('hamstrings')"
          >
            <title>{{ titleFor('hamstrings') }}</title>
            <path
              d="M 132 252 C 128 270 128 292 134 308 C 142 312 152 310 154 296 C 156 280 156 264 156 250 C 148 254 138 254 132 252 Z M 188 252 C 192 270 192 292 186 308 C 178 312 168 310 166 296 C 164 280 164 264 164 250 C 172 254 182 254 188 252 Z"
              :fill="getFillColor('hamstrings')"
              stroke="#1E2220"
              :stroke-width="selectedMuscleKey === 'hamstrings' ? 3.5 : 2"
              stroke-linejoin="round"
            />
          </g>

          <!-- Calves (Back Calves / Gastrocnemius) -->
          <g
            role="button"
            tabindex="0"
            :aria-label="ariaLabelFor('calves')"
            class="cursor-pointer transition-transform hover:opacity-95"
            @click="selectMuscle('calves')"
            @keydown.enter="selectMuscle('calves')"
            @keydown.space.prevent="selectMuscle('calves')"
          >
            <title>{{ titleFor('calves') }}</title>
            <path
              d="M 132 318 C 124 330 124 354 132 374 C 136 386 146 386 148 370 C 150 352 148 332 142 318 Z M 188 318 C 196 330 196 354 188 374 C 184 386 174 386 172 370 C 170 352 172 332 178 318 Z"
              :fill="getFillColor('calves')"
              stroke="#1E2220"
              :stroke-width="selectedMuscleKey === 'calves' ? 3.5 : 2"
              stroke-linejoin="round"
            />
          </g>
        </g>
      </svg>
    </div>

    <!-- Active Muscle Info Popover / Detail Sheet -->
    <div class="w-full mt-2">
      <div
        v-if="selectedItem"
        class="p-3.5 bg-paper-subtle border-2 border-plate rounded-2xl shadow-[2px_2px_0px_#1e2220] flex flex-col gap-2 transition-all"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <span class="text-[11px] font-mono font-bold tracking-wider text-ink-muted uppercase block">
              {{ selectedItem.muscleKey }}
            </span>
            <h4 class="text-sm font-bold font-heading text-ink truncate">
              {{ selectedItem.displayName }}
            </h4>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border-2 whitespace-nowrap"
              :class="meta(selectedItem.status).badge"
            >
              {{ meta(selectedItem.status).label }} • {{ selectedItem.recoveryPct }}%
            </span>
            <button
              type="button"
              class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border-2 border-plate bg-white hover:bg-paper-dim text-xs font-bold text-ink shadow-[1px_1px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-plate"
              aria-label="ปิดรายละเอียดกล้ามเนื้อ"
              @click="selectedMuscleKey = null"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="h-2.5 w-full rounded-full bg-paper-dim border border-plate overflow-hidden">
          <div
            class="h-full transition-all"
            :class="meta(selectedItem.status).bar"
            :style="{ width: selectedItem.recoveryPct + '%' }"
          ></div>
        </div>

        <div class="flex items-center justify-between text-[11px] font-mono text-ink-muted pt-1 border-t border-plate/20">
          <span>{{ formatLastTrained(selectedItem.lastTrainedAt) }}</span>
          <span class="font-bold text-ink">
            {{ selectedItem.hoursRemaining > 0 ? `พักฟื้นอีก ~${selectedItem.hoursRemaining} ชม.` : 'พร้อมฝึกเต็มที่' }}
          </span>
        </div>
      </div>

      <div
        v-else
        class="py-3 text-center border-2 border-dashed border-plate/30 rounded-2xl bg-paper-subtle/40"
      >
        <p class="text-[11px] font-mono text-ink-muted">
          แตะที่ส่วนกล้ามเนื้อบนหุ่นเพื่อดูระดับการฟื้นตัวและเวลาที่เหลือ
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import {
  STATUS_COLORS,
  MUSCLE_DISPLAY_NAMES,
  inferMuscleKey,
  getRecoveryMeta
} from '../composables/useRecovery.js';

const props = defineProps({
  recoveryData: {
    type: Array,
    default: () => []
  },
  view: {
    type: String,
    default: 'front',
    validator: (v) => ['front', 'back'].includes(v)
  }
});

const emit = defineEmits(['select-muscle']);

const selectedMuscleKey = ref(null);
const meta = getRecoveryMeta;

// Build lookup map from input data
const muscleMap = computed(() => {
  const map = {};
  for (const item of props.recoveryData) {
    const key = item.muscleKey || inferMuscleKey(item.muscle || item.displayName);
    if (key) {
      map[key] = item;
    }
  }
  return map;
});

function getItem(key) {
  if (muscleMap.value[key]) {
    return muscleMap.value[key];
  }
  return {
    muscleKey: key,
    displayName: MUSCLE_DISPLAY_NAMES[key] || key,
    status: 'untrained',
    recoveryPct: 0,
    lastTrainedAt: null,
    hoursRemaining: 0
  };
}

const selectedItem = computed(() => {
  if (!selectedMuscleKey.value) return null;
  return getItem(selectedMuscleKey.value);
});

function getFillColor(key) {
  const item = getItem(key);
  return STATUS_COLORS[item.status] || STATUS_COLORS.untrained;
}

function titleFor(key) {
  const item = getItem(key);
  return `${item.displayName}: ${item.recoveryPct}% (${meta(item.status).label})`;
}

function ariaLabelFor(key) {
  const item = getItem(key);
  return `${item.displayName} สถานะ ${meta(item.status).label} ฟื้นตัว ${item.recoveryPct}%`;
}

function selectMuscle(key) {
  if (selectedMuscleKey.value === key) {
    selectedMuscleKey.value = null;
  } else {
    selectedMuscleKey.value = key;
    emit('select-muscle', getItem(key));
  }
}

function formatLastTrained(iso) {
  if (!iso) return 'ยังไม่เคยฝึก';
  return 'ฝึกล่าสุด ' + new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}
</script>
