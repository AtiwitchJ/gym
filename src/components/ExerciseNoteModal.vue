<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-plate/60 backdrop-blur-sm select-none"
    @click.self="$emit('close')"
  >
    <div
      class="w-full max-w-lg bg-paper border-4 border-plate rounded-t-3xl sm:rounded-3xl shadow-[0_12px_40px_rgba(30,34,32,0.35)] p-5 sm:p-6 max-h-[90vh] overflow-y-auto flex flex-col gap-4 text-ink font-body"
      role="dialog"
      aria-modal="true"
      aria-labelledby="note-modal-title"
    >
      <!-- Modal Header -->
      <div class="flex items-start justify-between gap-3 border-b-2 border-plate/20 pb-3">
        <div class="min-w-0 flex-1">
          <span class="text-[11px] font-mono font-bold tracking-widest text-emerald-text uppercase block">
            EXERCISE SETUP &amp; FORM CUES · ตั้งค่าเครื่อง &amp; คิวฟอร์ม
          </span>
          <h3 id="note-modal-title" class="text-base sm:text-lg font-extrabold font-heading text-ink leading-tight truncate mt-0.5">
            🏋️ {{ exerciseName || 'ท่าฝึก' }}
          </h3>
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

      <!-- Error / Offline Alert -->
      <div
        v-if="errorMessage"
        class="text-xs font-body text-red-700 bg-red-50 border-2 border-red-600 rounded-xl p-3 flex items-center justify-between gap-2"
      >
        <span>{{ errorMessage }}</span>
        <button
          type="button"
          class="text-[11px] font-mono font-bold text-red-700 underline"
          @click="errorMessage = ''"
        >
          ปิด
        </button>
      </div>

      <!-- Form Inputs -->
      <div class="space-y-4">
        <!-- 1. Machine & Seat Setup -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label for="note-pin-setting" class="text-xs font-heading font-bold text-ink flex items-center gap-1.5">
              <span>⚙️</span>
              <span>ตำแหน่งอุปกรณ์ / เบาะ / พิน (Machine &amp; Seat Setup)</span>
            </label>
            <span
              class="text-[11px] font-mono"
              :class="pinSetting.length > 500 ? 'text-flame-text font-bold' : 'text-ink-muted'"
            >
              {{ pinSetting.length }}/500
            </span>
          </div>
          <textarea
            id="note-pin-setting"
            v-model="pinSetting"
            rows="2"
            maxlength="500"
            placeholder="เช่น เบาะระดับ 3, พินเคเบิลเบอร์ 4, รูที่ล็อคขาระดับ 2"
            class="min-h-[44px] w-full px-3 py-2 rounded-xl border-2 border-plate bg-white text-sm font-body text-ink focus-visible:ring-2 focus-visible:ring-plate resize-y"
          ></textarea>
        </div>

        <!-- 2. Form & Technique Cues -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label for="note-form-cues" class="text-xs font-heading font-bold text-ink flex items-center gap-1.5">
              <span>💡</span>
              <span>คิวฟอร์ม &amp; เทคนิคสำคัญ (Technique &amp; Form Cues)</span>
            </label>
            <span
              class="text-[11px] font-mono"
              :class="formCues.length > 500 ? 'text-flame-text font-bold' : 'text-ink-muted'"
            >
              {{ formCues.length }}/500
            </span>
          </div>
          <textarea
            id="note-form-cues"
            v-model="formCues"
            rows="2"
            maxlength="500"
            placeholder="เช่น บีบสะบักกดลงล่าง, ศอก 45 องศา, ดันระเบิดขึ้น หายใจออก"
            class="min-h-[44px] w-full px-3 py-2 rounded-xl border-2 border-plate bg-white text-sm font-body text-ink focus-visible:ring-2 focus-visible:ring-plate resize-y"
          ></textarea>
        </div>

        <!-- 3. General Notes -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label for="note-general" class="text-xs font-heading font-bold text-ink flex items-center gap-1.5">
              <span>📝</span>
              <span>บันทึกเพิ่มเติม (General Notes)</span>
            </label>
            <span
              class="text-[11px] font-mono"
              :class="generalNote.length > 500 ? 'text-flame-text font-bold' : 'text-ink-muted'"
            >
              {{ generalNote.length }}/500
            </span>
          </div>
          <textarea
            id="note-general"
            v-model="generalNote"
            rows="2"
            maxlength="500"
            placeholder="เช่น ใช้กริปแบบ Thumbless, ระวังข้อมือซ้ายงอ"
            class="min-h-[44px] w-full px-3 py-2 rounded-xl border-2 border-plate bg-white text-sm font-body text-ink focus-visible:ring-2 focus-visible:ring-plate resize-y"
          ></textarea>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t-2 border-plate/20">
        <div>
          <button
            v-if="hasExistingContent"
            type="button"
            class="min-h-[44px] px-3 py-2 rounded-xl border-2 border-plate bg-surface hover:bg-paper-dim text-flame-text font-heading font-bold text-xs shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[0.5px] active:translate-y-[0.5px] touch-manipulation"
            :disabled="isSaving"
            @click="handleClear"
          >
            ล้างโน้ต
          </button>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="min-h-[44px] px-4 py-2 rounded-xl border-2 border-plate bg-white hover:bg-paper-subtle text-ink font-heading font-bold text-sm shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] touch-manipulation"
            @click="$emit('close')"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            :disabled="isSaving || isOverLimit"
            class="min-h-[44px] px-4 py-2 rounded-xl border-2 border-plate bg-emerald hover:bg-emerald/90 text-white font-heading font-extrabold text-sm shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] touch-manipulation disabled:opacity-50"
            @click="handleSave"
          >
            {{ isSaving ? 'กำลังบันทึก...' : '💾 บันทึกการตั้งค่า' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useExerciseNotes, MAX_NOTE_LENGTH } from '../composables/useExerciseNotes.js';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  exerciseId: { type: String, default: '' },
  exerciseName: { type: String, default: '' }
});

const emit = defineEmits(['close', 'saved']);

const { getNote, saveNote, clearNote, fetchNote } = useExerciseNotes();

const pinSetting = ref('');
const formCues = ref('');
const generalNote = ref('');
const isSaving = ref(false);
const errorMessage = ref('');

function loadCurrentValues() {
  if (!props.exerciseId) {
    pinSetting.value = '';
    formCues.value = '';
    generalNote.value = '';
    return;
  }
  const current = getNote(props.exerciseId);
  pinSetting.value = current.pinSetting || '';
  formCues.value = current.formCues || '';
  generalNote.value = current.generalNote || '';
  errorMessage.value = '';
}

watch(
  () => [props.isOpen, props.exerciseId],
  ([open, id]) => {
    if (open && id) {
      loadCurrentValues();
      fetchNote(id).then((fresh) => {
        if (fresh && props.isOpen && props.exerciseId === id) {
          pinSetting.value = fresh.pinSetting || '';
          formCues.value = fresh.formCues || '';
          generalNote.value = fresh.generalNote || '';
        }
      });
    }
  },
  { immediate: true }
);

const hasExistingContent = computed(() => {
  return Boolean(
    (pinSetting.value && pinSetting.value.trim()) ||
    (formCues.value && formCues.value.trim()) ||
    (generalNote.value && generalNote.value.trim())
  );
});

const isOverLimit = computed(() => {
  return (
    pinSetting.value.length > MAX_NOTE_LENGTH ||
    formCues.value.length > MAX_NOTE_LENGTH ||
    generalNote.value.length > MAX_NOTE_LENGTH
  );
});

async function handleSave() {
  if (isOverLimit.value) {
    errorMessage.value = `ข้อความต้องไม่เกิน ${MAX_NOTE_LENGTH} ตัวอักษรต่อฟิลด์`;
    return;
  }
  isSaving.value = true;
  errorMessage.value = '';
  try {
    const result = await saveNote(props.exerciseId, {
      pinSetting: pinSetting.value,
      formCues: formCues.value,
      generalNote: generalNote.value
    });
    if (!result.ok) {
      errorMessage.value = result.error || 'บันทึกไม่สำเร็จ';
      return;
    }
    emit('saved', result.note);
    emit('close');
  } catch (err) {
    errorMessage.value = err.message || 'บันทึกไม่สำเร็จ';
  } finally {
    isSaving.value = false;
  }
}

async function handleClear() {
  isSaving.value = true;
  errorMessage.value = '';
  try {
    const result = await clearNote(props.exerciseId);
    if (!result.ok) {
      errorMessage.value = result.error || 'ล้างโน้ตไม่สำเร็จ';
      return;
    }
    pinSetting.value = '';
    formCues.value = '';
    generalNote.value = '';
    emit('saved', result.note);
    emit('close');
  } catch (err) {
    errorMessage.value = err.message || 'ล้างโน้ตไม่สำเร็จ';
  } finally {
    isSaving.value = false;
  }
}
</script>
