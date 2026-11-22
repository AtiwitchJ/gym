<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-plate/60 backdrop-blur-sm select-none"
    @click.self="handleClose"
  >
    <div class="w-full max-w-xl bg-paper border-4 border-plate rounded-t-3xl sm:rounded-3xl shadow-[0_12px_40px_rgba(30,34,32,0.35)] p-5 sm:p-6 max-h-[92vh] overflow-y-auto flex flex-col gap-4">
      <!-- Modal Header -->
      <div class="flex items-start justify-between gap-3 border-b-2 border-plate/10 pb-3">
        <div>
          <span class="text-[11px] font-mono font-bold tracking-widest text-emerald-text uppercase block">
            DATA BACKUP & RESTORE
          </span>
          <h3 class="text-lg font-extrabold font-heading text-ink leading-tight">
            สำรองและกู้คืนข้อมูลการฝึกซ้อม
          </h3>
          <p class="text-xs text-ink-muted font-body mt-0.5">
            นำเข้าประวัติเดิมจาก Strong / Hevy หรือส่งออกไฟล์สำรอง JSON
          </p>
        </div>

        <button
          type="button"
          class="min-h-[44px] min-w-[44px] rounded-full border-2 border-plate bg-white flex items-center justify-center text-ink font-bold shadow-[2px_2px_0px_#1e2220] touch-manipulation active:translate-x-[1px] active:translate-y-[1px]"
          title="ปิด"
          @click="handleClose"
        >
          ✕
        </button>
      </div>

      <!-- Mode Switcher Tabs (Import vs Export) -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="mode = 'import'"
          class="flex-1 min-h-[44px] px-3.5 py-2 font-heading font-bold text-xs rounded-xl border-2 border-plate touch-manipulation transition-all active:translate-x-[1px] active:translate-y-[1px]"
          :class="mode === 'import'
            ? 'bg-flame text-white shadow-[2px_2px_0px_#1e2220]'
            : 'bg-surface hover:bg-paper-dim text-ink shadow-[1px_1px_0px_#1e2220]'"
        >
          📥 นำเข้าข้อมูล (Import)
        </button>

        <button
          type="button"
          @click="mode = 'export'"
          class="flex-1 min-h-[44px] px-3.5 py-2 font-heading font-bold text-xs rounded-xl border-2 border-plate touch-manipulation transition-all active:translate-x-[1px] active:translate-y-[1px]"
          :class="mode === 'export'
            ? 'bg-flame text-white shadow-[2px_2px_0px_#1e2220]'
            : 'bg-surface hover:bg-paper-dim text-ink shadow-[1px_1px_0px_#1e2220]'"
        >
          📤 ส่งออกไฟล์สำรอง (Export)
        </button>
      </div>

      <!-- Error Alert Banner -->
      <div
        v-if="importError"
        class="p-3 rounded-xl bg-red-100 border-2 border-red-600 text-red-950 text-xs font-mono font-bold flex items-center justify-between shadow-[2px_2px_0px_#1e2220]"
      >
        <div class="flex items-center gap-1.5">
          <span>⚠️</span>
          <span>{{ importError }}</span>
        </div>
        <button
          type="button"
          @click="triggerFileInput"
          class="min-h-[44px] min-w-[44px] px-3 py-1 rounded-lg border border-red-600 bg-white text-red-900 text-xs font-bold hover:bg-red-50 active:translate-x-[1px] active:translate-y-[1px] touch-manipulation"
        >
          เลือกใหม่
        </button>
      </div>

      <!-- TAB 1: IMPORT MODE -->
      <div v-if="mode === 'import'" class="space-y-4">
        <!-- Success Outcome Box -->
        <div
          v-if="importResult"
          class="p-4 rounded-2xl bg-emerald-bg border-2 border-emerald text-emerald-text space-y-3"
        >
          <div class="flex items-center gap-2">
            <span class="text-xl">🎉</span>
            <span class="text-sm font-heading font-bold text-ink">
              นำเข้าข้อมูลสำเร็จเรียบร้อย!
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs font-mono bg-white p-3 rounded-xl border border-emerald/40 text-ink">
            <div>• เซสชันที่นำเข้า: <strong class="text-emerald-text font-bold">{{ importResult.sessionsImported }} รอบ</strong></div>
            <div>• เซ็ตทั้งหมด: <strong class="text-emerald-text font-bold">{{ importResult.setsImported }} เซ็ต</strong></div>
            <div>• ข้ามรายการซ้ำ: <strong class="text-ink-muted">{{ importResult.duplicatesSkipped }} รอบ</strong></div>
            <div>• น้ำหนักตัว: <strong class="text-ink-muted">{{ importResult.bodyWeightsImported }} รายการ</strong></div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              @click="finishImport"
              class="min-h-[44px] px-4 py-2 rounded-xl border-2 border-plate bg-emerald hover:bg-emerald/90 text-white font-heading font-bold text-xs shadow-[2px_2px_0px_#1e2220] touch-manipulation active:translate-x-[1px] active:translate-y-[1px]"
            >
              เสร็จสิ้น · ดูประวัติการฝึกซ้อม
            </button>
          </div>
        </div>

        <!-- File Dropzone (when no preview and not finished) -->
        <div
          v-else-if="!previewData"
          class="border-2 border-dashed border-plate rounded-2xl p-6 sm:p-8 bg-surface text-center hover:bg-paper-dim transition-all cursor-pointer touch-manipulation flex flex-col items-center justify-center gap-2.5"
          @click="triggerFileInput"
          @dragover.prevent
          @drop.prevent="onFileDrop"
        >
          <input
            ref="fileInputRef"
            type="file"
            accept=".json,.csv"
            class="hidden"
            @change="onFileChange"
          />

          <div class="w-12 h-12 rounded-2xl bg-flame-bg border-2 border-plate flex items-center justify-center text-2xl shadow-[2px_2px_0px_#1e2220]">
            📂
          </div>

          <div class="space-y-1">
            <div class="text-sm font-heading font-bold text-ink">
              แตะเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
            </div>
            <div class="text-xs text-ink-muted font-body">
              รองรับไฟล์ <strong class="text-ink">.json</strong> (GYM Backup) และ <strong class="text-ink">.csv</strong> (Strong / Hevy)
            </div>
          </div>

          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-low border border-plate/20 text-[11px] font-mono text-ink-muted mt-1">
            <span>💡 ตรวจจับและแปลงข้อมูลอัตโนมัติ</span>
          </div>
        </div>

        <!-- Preview Card Before Confirming Import -->
        <div
          v-else
          class="p-4 rounded-2xl bg-surface-low border-2 border-plate space-y-3.5"
        >
          <div class="flex items-center justify-between border-b-2 border-plate/10 pb-2">
            <span class="text-xs font-heading font-bold text-ink flex items-center gap-1.5">
              <span>📋</span>
              <span>ตัวอย่างข้อมูลที่ตรวจพบ (Import Preview)</span>
            </span>
            <span class="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-flame-bg text-flame-text border border-flame/30">
              {{ previewData.detectedType }}
            </span>
          </div>

          <!-- Summary Stats -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div class="p-2.5 rounded-xl border border-plate/20 bg-white text-center">
              <div class="text-[11px] font-mono font-bold text-ink-muted">รอบการฝึก (Sessions)</div>
              <div class="text-lg font-mono font-extrabold text-ink tabular-nums">{{ previewData.sessionsCount }}</div>
            </div>

            <div class="p-2.5 rounded-xl border border-plate/20 bg-white text-center">
              <div class="text-[11px] font-mono font-bold text-ink-muted">เซ็ตทั้งหมด (Sets)</div>
              <div class="text-lg font-mono font-extrabold text-ink tabular-nums">{{ previewData.setsCount }}</div>
            </div>

            <div class="p-2.5 rounded-xl border border-plate/20 bg-white text-center col-span-2 sm:col-span-1">
              <div class="text-[11px] font-mono font-bold text-ink-muted">ช่วงวันที่</div>
              <div class="text-xs font-mono font-bold text-ink truncate mt-1">{{ previewData.dateRange }}</div>
            </div>
          </div>

          <!-- Deduplication Options -->
          <div class="p-3 rounded-xl border border-plate/20 bg-white space-y-2">
            <span class="text-xs font-heading font-bold text-ink block">
              ตัวเลือกการนำเข้า (Deduplication):
            </span>

            <label class="flex items-start gap-2.5 cursor-pointer touch-manipulation">
              <input
                type="radio"
                :value="true"
                v-model="dedupeOption"
                class="mt-1 w-4 h-4 accent-emerald cursor-pointer"
              />
              <div class="text-xs font-body text-ink">
                <span class="font-bold">ข้ามรอบฝึกที่มีอยู่แล้วในเครื่อง (แนะนำ)</span>
                <p class="text-[11px] text-ink-muted">
                  ตรวจสอบจากวันและเวลา หากเคยบันทึกไว้แล้วจะไม่นำเข้าซ้ำซ้อน
                </p>
              </div>
            </label>

            <label class="flex items-start gap-2.5 cursor-pointer touch-manipulation">
              <input
                type="radio"
                :value="false"
                v-model="dedupeOption"
                class="mt-1 w-4 h-4 accent-emerald cursor-pointer"
              />
              <div class="text-xs font-body text-ink">
                <span class="font-bold">นำเข้าทั้งหมด</span>
                <p class="text-[11px] text-ink-muted">
                  นำเข้าทุกเซสชันในไฟล์ (อาจมีรอบการฝึกซ้ำกัน)
                </p>
              </div>
            </label>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              @click="resetPreview"
              :disabled="isImporting"
              class="min-h-[44px] min-w-[44px] px-3.5 rounded-xl border-2 border-plate bg-white text-ink text-xs font-heading font-bold shadow-[1px_1px_0px_#1e2220] touch-manipulation active:translate-x-[1px] active:translate-y-[1px]"
            >
              เลือกไฟล์ใหม่
            </button>

            <button
              type="button"
              @click="handleConfirmImport"
              :disabled="isImporting"
              class="min-h-[44px] px-4 py-2 rounded-xl border-2 border-plate bg-emerald hover:bg-emerald/90 text-white font-heading font-extrabold text-sm shadow-[3px_3px_0px_#1e2220] touch-manipulation active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span v-if="isImporting" class="animate-spin">↺</span>
              <span>{{ isImporting ? 'กำลังนำเข้าข้อมูล...' : '⚡ ยืนยันการนำเข้าข้อมูล' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- TAB 2: EXPORT MODE -->
      <div v-else class="space-y-4">
        <div class="p-4 rounded-2xl bg-surface-low border-2 border-plate space-y-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">💾</span>
            <div class="text-sm font-heading font-bold text-ink">
              ส่งออกข้อมูลสำรองแบบสมบูรณ์ (Full JSON Backup)
            </div>
          </div>

          <p class="text-xs font-body text-ink-muted">
            ไฟล์สำรอง <strong class="text-ink">.json</strong> จะรวบรวมข้อมูลประวัติการฝึกซ้อมทั้งหมด ท่าฝึก เซ็ต น้ำหนักตัว และเป้าหมาย เป็นข้อมูลต้นฉบับ สามารถนำกลับมา Restore บนเครื่องนี้หรือเครื่องอื่นได้ 100%
          </p>

          <div class="pt-2">
            <button
              type="button"
              @click="downloadFullBackup"
              :disabled="isExporting"
              class="w-full min-h-[44px] px-4 py-2.5 rounded-xl border-2 border-plate bg-emerald hover:bg-emerald/90 text-white font-heading font-extrabold text-sm shadow-[3px_3px_0px_#1e2220] touch-manipulation active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span v-if="isExporting" class="animate-spin">↺</span>
              <span>{{ isExporting ? 'กำลังเตรียมไฟล์สำรอง...' : '📤 ดาวน์โหลดไฟล์สำรอง (.json)' }}</span>
            </button>
          </div>
        </div>

        <div class="p-3.5 rounded-xl border border-plate/20 bg-white text-xs font-body text-ink-muted space-y-1">
          <div class="font-bold text-ink">💡 รูปแบบการส่งออกอื่น ๆ ในหน้าประวัติ:</div>
          <div>• <strong>Export Excel (.xlsx):</strong> สำหรับเปิดดูสถิติและพิมพ์รายงานใน Excel</div>
          <div>• <strong>ดาวน์โหลด .db:</strong> ไฟล์ฐานข้อมูล SQLite ดิบ สำหรับนักพัฒนาหรือแบ็กอัปทั้งระบบ</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useDataBackup } from '../composables/useDataBackup.js';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'imported']);

const mode = ref('import'); // 'import' | 'export'
const fileInputRef = ref(null);

const {
  isImporting,
  isExporting,
  importError,
  importResult,
  previewData,
  dedupeOption,
  resetState,
  parseFile,
  submitImport,
  downloadFullBackup
} = useDataBackup();

function triggerFileInput() {
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
    fileInputRef.value.click();
  }
}

async function onFileChange(e) {
  const file = e.target.files?.[0];
  if (file) {
    await parseFile(file);
  }
}

async function onFileDrop(e) {
  const file = e.dataTransfer.files?.[0];
  if (file) {
    await parseFile(file);
  }
}

function resetPreview() {
  resetState();
  if (fileInputRef.value) fileInputRef.value.value = '';
}

async function handleConfirmImport() {
  const success = await submitImport(dedupeOption.value);
  if (success) {
    emit('imported');
  }
}

function finishImport() {
  emit('imported');
  handleClose();
}

function handleClose() {
  resetState();
  emit('close');
}
</script>
