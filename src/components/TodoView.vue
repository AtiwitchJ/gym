<template>
  <div class="py-2">
    <!-- Header Card -->
    <div class="archive-card p-5 mb-5">
      <span class="text-[10px] font-mono font-bold tracking-widest text-flame uppercase">
        DAILY DISCIPLINE
      </span>
      <h2 class="text-xl font-bold font-heading text-ink tracking-tight">
        สิ่งที่ต้องทำในการฝึก (Workout Checklist)
      </h2>
      <p class="text-xs text-ink-muted mt-1 font-body">
        วินัยประจำวันสำหรับการสร้างกล้ามเนื้อและการฟื้นฟูร่างกายอย่างมีประสิทธิภาพ
      </p>

      <!-- Add New Item Form -->
      <form @submit.prevent="handleAddNew" class="mt-4 flex gap-2">
        <input
          v-model="newTodoText"
          type="text"
          placeholder="+ เพิ่มข้อปฏิบัติของคุณที่นี่..."
          class="flex-1 bg-surface-low border-2 border-plate focus:border-flame focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-ink outline-none transition-colors shadow-inner"
        />
        <button
          type="submit"
          class="bg-flame hover:bg-flame-glow text-white font-bold text-xs px-4 py-2.5 rounded-xl border-2 border-plate shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all whitespace-nowrap"
        >
          เพิ่มรายการ
        </button>
      </form>
    </div>

    <!-- Todo List -->
    <div class="archive-card divide-y-2 divide-plate/10 overflow-hidden bg-white">
      <div
        v-for="todo in userTodos"
        :key="todo.id"
        class="p-4 flex items-center justify-between gap-3 transition-colors"
        :class="todo.done ? 'bg-surface-low/50' : 'hover:bg-surface-low/30'"
      >
        <label class="flex items-center gap-3 cursor-pointer flex-1 select-none">
          <input
            type="checkbox"
            :checked="todo.done"
            @change="toggleTodo(todo.id)"
            class="w-5 h-5 rounded-md border-2 border-plate text-flame focus:ring-0 focus:ring-offset-0 bg-surface-low cursor-pointer accent-flame"
          />
          <span
            class="text-xs transition-colors font-body"
            :class="todo.done ? 'text-ink-muted line-through opacity-70' : 'text-ink font-semibold'"
          >
            {{ todo.text }}
          </span>
        </label>

        <!-- Delete button -->
        <button
          @click="deleteTodo(todo.id)"
          class="text-ink-muted hover:text-flame p-1.5 rounded transition-colors"
          title="ลบรายการนี้"
        >
          <svg class="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useWorkoutStore } from '../composables/useWorkoutStore';

const { userTodos, addTodo, toggleTodo, deleteTodo } = useWorkoutStore();
const newTodoText = ref('');

function handleAddNew() {
  if (!newTodoText.value.trim()) return;
  addTodo(newTodoText.value);
  newTodoText.value = '';
}
</script>
