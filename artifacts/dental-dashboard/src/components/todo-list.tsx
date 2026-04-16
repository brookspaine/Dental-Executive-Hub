import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type Todo = {
  id: string;
  text: string;
  done: boolean;
};

type Props = {
  storageKey: string;
  placeholder?: string;
  emptyText?: string;
};

export function TodoList({ storageKey, placeholder = "Add a to-do…", emptyText = "No to-dos yet" }: Props) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setTodos(parsed);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(todos));
    } catch {
      /* ignore */
    }
  }, [todos, storageKey, hydrated]);

  const addTodo = () => {
    const text = input.trim();
    if (!text) return;
    setTodos((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text, done: false },
    ]);
    setInput("");
  };

  const toggle = (id: string) =>
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const remove = (id: string) =>
    setTodos((prev) => prev.filter((t) => t.id !== id));

  const remaining = todos.filter((t) => !t.done).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 mb-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTodo();
            }
          }}
          placeholder={placeholder}
          className="h-9"
        />
        <Button size="sm" onClick={addTodo} disabled={!input.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto max-h-64">
        {todos.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-2">{emptyText}</p>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className="group flex items-center gap-2 p-2 rounded hover:bg-muted/50"
            >
              <Checkbox
                checked={todo.done}
                onCheckedChange={() => toggle(todo.id)}
              />
              <span
                className={`flex-1 text-sm ${
                  todo.done ? "line-through text-muted-foreground" : ""
                }`}
              >
                {todo.text}
              </span>
              <button
                onClick={() => remove(todo.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {todos.length > 0 && (
        <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
          {remaining} of {todos.length} remaining
        </div>
      )}
    </div>
  );
}
