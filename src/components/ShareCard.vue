<template>
  <div class="bg-white border-2 border-plate rounded-2xl p-3 shadow-[3px_3px_0px_#1e2220] flex flex-col gap-3">
    <div class="flex items-center justify-between gap-2">
      <span class="text-xs font-mono font-bold text-ink uppercase tracking-wider">
        📤 การ์ดสรุปผลงาน (Share Card)
      </span>
      <button
        type="button"
        @click="toggleOpen"
        class="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl border-2 border-plate bg-paper-subtle hover:bg-paper-dim text-ink text-xs font-mono font-bold shadow-[1px_1px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none touch-manipulation"
        :aria-expanded="open ? 'true' : 'false'"
      >
        {{ open ? 'ซ่อนการ์ด' : 'ดูการ์ด' }}
      </button>
    </div>

    <div v-if="open" class="flex flex-col items-center gap-3">
      <img
        :src="cardDataUrl"
        :alt="`การ์ดสรุปผลงาน ${model.title}`"
        class="w-full max-w-[300px] rounded-xl border-2 border-plate shadow-[2px_2px_0px_#1e2220]"
      />

      <div class="flex items-center gap-2 w-full">
        <button
          type="button"
          @click="downloadPng"
          class="flex-1 min-h-[44px] py-2 rounded-xl border-2 border-plate bg-flame hover:bg-flame-glow text-white font-heading font-bold text-xs shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none touch-manipulation"
        >
          ⬇️ ดาวน์โหลด PNG
        </button>
        <button
          type="button"
          @click="downloadSvg"
          class="flex-1 min-h-[44px] py-2 rounded-xl border-2 border-plate bg-paper-subtle hover:bg-paper-dim text-ink font-heading font-bold text-xs shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none touch-manipulation"
        >
          ⬇️ SVG
        </button>
      </div>

      <p v-if="error" class="text-[11px] font-body text-red-700 text-center">
        {{ error }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import {
  buildShareCardModel,
  buildShareCardSvg,
  svgToDataUrl
} from '../composables/useShareCard.js';

const props = defineProps({
  summary: {
    type: Object,
    default: null
  }
});

const open = ref(false);
const error = ref('');

const model = computed(() => buildShareCardModel(props.summary));
const cardDataUrl = computed(() => svgToDataUrl(buildShareCardSvg(model.value)));

function toggleOpen() {
  open.value = !open.value;
  error.value = '';
}

function safeFileName() {
  const cleaned = String(model.value.title || 'workout')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return cleaned || 'workout';
}

function triggerDownload(href, filename) {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function downloadSvg() {
  triggerDownload(cardDataUrl.value, `${safeFileName()}-share-card.svg`);
}

function downloadPng() {
  error.value = '';
  const image = new Image();
  image.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || image.width || 640;
      canvas.height = image.naturalHeight || image.height || 820;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas unavailable');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      triggerDownload(canvas.toDataURL('image/png'), `${safeFileName()}-share-card.png`);
    } catch (e) {
      error.value = 'ดาวน์โหลด PNG ไม่ได้ในอุปกรณ์นี้ — ใช้ปุ่ม SVG แทนได้';
    }
  };
  image.onerror = () => {
    error.value = 'ดาวน์โหลด PNG ไม่ได้ในอุปกรณ์นี้ — ใช้ปุ่ม SVG แทนได้';
  };
  image.src = cardDataUrl.value;
}
</script>
