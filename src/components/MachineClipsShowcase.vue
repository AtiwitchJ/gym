<template>
  <div class="archive-card p-3 sm:p-4 mb-4 border-2 border-emerald shadow-[3px_3px_0px_#059669] overflow-hidden select-none">
    <!-- Top Bar Header -->
    <div class="flex items-center justify-between gap-2 pb-2.5 border-b-2 border-plate/20">
      <div class="flex items-center gap-2 min-w-0">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald animate-pulse flex-shrink-0"></span>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="text-xs sm:text-sm font-bold font-heading text-ink tracking-tight truncate">
              🎬 คลิปวิดีโอสาธิตในเครื่อง 3 ชนิดเครื่องเล่น (3 Machine Clips)
            </h3>
            <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald text-white border border-emerald uppercase">
              ในเครื่อง
            </span>
          </div>
          <p class="text-[10px] sm:text-[11px] text-ink-muted font-body mt-0.5 truncate">
            วิดีโอออฟไลน์ฝังในเครื่อง 3 เครื่องเล่นที่แตกต่างกัน ไม่ต้องต่อเน็ต
          </p>
        </div>
      </div>

      <!-- Expand / Collapse Toggle -->
      <button
        type="button"
        @click="isOpen = !isOpen"
        class="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono font-bold px-2 sm:px-2.5 py-1 rounded-lg border-2 border-plate bg-surface hover:bg-paper-subtle text-ink shadow-[1px_1px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex-shrink-0"
      >
        <span>{{ isOpen ? 'ย่อคลิป' : 'ขยายดูคลิป' }}</span>
        <svg
          class="w-3 h-3 stroke-current fill-none stroke-2 transition-transform duration-200"
          :class="isOpen ? 'rotate-180' : ''"
          viewBox="0 0 24 24"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>

    <!-- Collapsible Video Player Section -->
    <div v-show="isOpen" class="pt-3 space-y-3">
      <!-- Machine Switcher Tabs (3 Distinct Gym Machines) -->
      <div class="grid grid-cols-3 gap-1.5 sm:gap-2">
        <button
          v-for="(machine, mIdx) in machines"
          :key="machine.id"
          type="button"
          @click="selectedMachineIdx = mIdx"
          class="flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none touch-manipulation text-center"
          :class="selectedMachineIdx === mIdx
            ? 'bg-emerald text-white border-plate shadow-[2px_2px_0px_#1e2220] -translate-y-0.5 font-bold'
            : 'bg-surface hover:bg-paper-subtle text-ink border-plate/30 shadow-[1px_1px_0px_#1e2220]'"
        >
          <span class="text-[9px] font-mono uppercase tracking-wider block opacity-90">
            เครื่องที่ {{ mIdx + 1 }}
          </span>
          <span class="text-xs sm:text-sm font-heading font-bold truncate max-w-full">
            {{ machine.shortName }}
          </span>
          <span class="text-[9px] font-mono opacity-80 mt-0.5 truncate">
            {{ machine.musclePart }}
          </span>
        </button>
      </div>

      <!-- Active Machine Video Player Box -->
      <div class="bg-black rounded-xl overflow-hidden border-2 border-plate shadow-[3px_3px_0px_#1e2220]">
        <div class="relative w-full aspect-video bg-black">
          <video
            ref="videoPlayer"
            :key="currentMachine.videoUrl"
            :src="currentMachine.videoUrl"
            controls
            playsinline
            loop
            autoplay
            muted
            class="w-full h-full object-contain"
          ></video>
        </div>

        <!-- Video Bottom Info Strip -->
        <div class="bg-surface-card p-2.5 sm:p-3 border-t-2 border-plate flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap mb-0.5">
              <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-flame-bg text-flame border border-flame/30">
                {{ currentMachine.tag }}
              </span>
              <span class="text-[11px] font-mono text-ink-muted">
                {{ currentMachine.equipmentType }}
              </span>
            </div>
            <h4 class="text-sm font-bold font-heading text-ink">
              {{ currentMachine.title }}
            </h4>
          </div>

          <!-- Video Replay / Sound Controls -->
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <span class="text-[10px] font-mono font-bold px-2 py-1 rounded bg-emerald-bg text-emerald border border-emerald/40 flex items-center gap-1">
              <span>●</span>
              <span>เล่นวนซ้ำในเครื่อง</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Machine Coaching Cues & Guidelines -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-paper-subtle p-3 rounded-xl border border-plate/20">
        <div>
          <span class="font-bold text-flame font-mono text-[11px] uppercase block mb-1">
            🎯 โฟกัสกล้ามเนื้อหลัก
          </span>
          <p class="text-ink font-body">
            {{ currentMachine.targetMuscles }}
          </p>
        </div>
        <div>
          <span class="font-bold text-emerald font-mono text-[11px] uppercase block mb-1">
            ⚡ กฎฟอร์มมาตรฐาน & จุดปลอดภัย
          </span>
          <p class="text-ink font-body">
            {{ currentMachine.standardCue }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const isOpen = ref(true);
const selectedMachineIdx = ref(0);
const videoPlayer = ref(null);

const machines = [
  {
    id: 'leg_press',
    shortName: 'Leg Press',
    musclePart: 'ขา & ก้น',
    tag: 'MACHINE 1 • LEGS',
    equipmentType: '45° Incline Sled Plate-Loaded Machine',
    title: 'เครื่องที่ 1: 45° Incline Leg Press Machine (เครื่องบริหารขาและก้น)',
    videoUrl: '/videos/leg-press-machine.mp4',
    targetMuscles: 'ต้นขาด้านหน้า (Quadriceps) มวลรวม และ ก้น (Glutes) วางเท้าสูงดันส้น',
    standardCue: 'วางเท้ากลางแป้นกว้างระดับไหล่ ปลดเซฟตี้ ผ่อนลงจนเข่าทำมุม 90° ดันส้นเท้าขึ้นช้าๆ **ห้ามล็อกเข่าสุดเด็ดขาด**'
  },
  {
    id: 'lat_pulldown',
    shortName: 'Lat Pulldown',
    musclePart: 'หลัง & ปีก',
    tag: 'MACHINE 2 • BACK',
    equipmentType: 'Overhead Cable / Pin-Selected Pulldown Machine',
    title: 'เครื่องที่ 2: Wide-Grip Lat Pulldown Machine (เครื่องดึงปีกกว้างทรง V-Shape)',
    videoUrl: '/videos/lat-pulldown-machine.mp4',
    targetMuscles: 'กล้ามเนื้อปีกหลัง (Latissimus Dorsi) ขยายปีกกว้างทรง V-Shape',
    standardCue: 'จับบาร์กว้างกว่าไหล่เล็กน้อย แอ่นอก 15 องศา ล็อคต้นขาใต้เบาะ ดึงข้อศอกลงแนบลำตัว บีบปีกค้าง 1 วินาทีก่อนผ่อนกลับช้าๆ'
  },
  {
    id: 'chest_press',
    shortName: 'Chest Press',
    musclePart: 'อก & หลังแขน',
    tag: 'MACHINE 3 • CHEST',
    equipmentType: 'Pin-Selected Seated Converging Chest Press',
    title: 'เครื่องที่ 3: Seated Chest Press Machine (เครื่องผลักอกรวมทุกมุม)',
    videoUrl: '/videos/chest-press-machine.mp4',
    targetMuscles: 'กล้ามเนื้อหน้าอกมวลรวม (Pectoralis Major) และ หลังแขน (Triceps)',
    standardCue: 'ปรับระดับเบาะให้ราวมือจับตรงระดับราวนมพอดี บีบสะบักแนบเบาะ ผลักไปข้างหน้าโดยไม่งอข้อมือ คุมจังหวะต้านกลับลึกสุด'
  }
];

const currentMachine = computed(() => machines[selectedMachineIdx.value] || machines[0]);
</script>
