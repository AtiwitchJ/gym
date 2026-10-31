<template>
  <div class="py-2">
    <!-- Header Card -->
    <div class="bg-surface rounded-xl border border-surface-border p-5 mb-5 shadow-sm">
      <span class="text-[10px] font-mono tracking-widest text-amber-400 uppercase">
        DAILY DISCIPLINE
      </span>
      <h2 class="text-xl font-bold font-display text-white tracking-tight">
        สิ่งที่ต้องทำในการฝึก (Gym Checklist)
      </h2>
      <p class="text-xs text-titanium-400 mt-1">
        ทำครบทุกข้อเพื่อรักษาฟอร์มการเล่นและฟื้นฟูกล้ามเนื้อให้เต็มประสิทธิภาพ
      </p>

      <!-- Add New Item Form -->
      <form @submit.prevent="handleAddNew" class="mt-4 flex gap-2">
        <input
          v-model="newTodoText"
          type="text"
          placeholder="+ พิมพ์เพิ่มข้อปฏิบัติของคุณที่นี่..."
          class="flex-1 bg-titanium-950 border border-surface-border focus:border-amber-400 rounded-lg px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
        />
        <button
          type="submit"
          class="bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs px-4 py-2.5 rounded-lg border border-amber-500 transition-colors whitespace-nowrap"
        >
          เพิ่มรายการ
        </button>
      </form>
    </div>

    <!-- Todo List -->
    <div class="bg-surface rounded-xl border border-surface-border divide-y divide-surface-border overflow-hidden">
      <div
        v-for="todo in userTodos"
        :key="todo.id"
        class="p-4 flex items-center justify-between gap-3 transition-colors"
        :class="todo.done ? 'bg-surface-card/40' : 'hover:bg-surface-card/20'"
      >
        <label class="flex items-center gap-3 cursor-pointer flex-1 select-none">
          <input
            type="checkbox"
            :checked="todo.done"
            @change="toggleTodo(todo.id)"
            class="w-5 h-5 rounded border-surface-border text-amber-500 focus:ring-0 focus:ring-offset-0 bg-titanium-950 cursor-pointer accent-amber-500"
          />
          <span
            class="text-xs transition-colors"
            :class="todo.done ? 'text-titanium-500 line-through' : 'text-titanium-200 font-medium'"
          >
            {{ todo.text }}
          </span>
        </label>

        <!-- Delete button -->
        <button
          @click="deleteTodo(todo.id)"
          class="text-titanium-500 hover:text-crimson p-1.5 rounded transition-colors"
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
