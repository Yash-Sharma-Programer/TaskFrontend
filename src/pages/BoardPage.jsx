import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useForm } from "react-hook-form";
import {
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  MessageCircle,
  Paperclip,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { format, isPast } from "date-fns";
import toast from "react-hot-toast";
import {
  boardsApi,
  commentsApi,
  filesApi,
  organisationsApi,
  projectsApi,
  tasksApi,
} from "../api";
import { useAppStore } from "../store/useAppStore";
import { useSocket } from "../hooks/useSocket";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Modal,
  PageHeader,
  Skeleton,
} from "../components/ui";

const priorityTone = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};
function TaskCard({ task, onOpen, selected, onSelect }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", columnId: task.columnId?.id || task.columnId },
  });
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl border bg-card p-3.5 shadow-sm dark:bg-plum-900 ${selected ? "border-coral ring-2 ring-coral/15" : "border-line dark:border-white/10"} ${isDragging ? "z-20 rotate-2 opacity-70 shadow-xl" : ""}`}
      onClick={() => onOpen(task.id)}
    >
      <div className="flex items-start gap-2">
        <input
          aria-label={`Select ${task.title}`}
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(task.id)}
          onClick={(e) => e.stopPropagation()}
          className="mt-1"
        />
        <button
          aria-label="Drag task"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 cursor-grab text-muted/60"
        >
          <GripVertical size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-muted">
              TF-{task.taskNumber}
            </span>
            <Badge color={priorityTone[task.priority]}>{task.priority}</Badge>
          </div>
          <h3 className="mt-2 text-sm font-bold leading-snug">{task.title}</h3>
          {task.labels?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {task.labels.slice(0, 3).map((l, i) => (
                <span
                  key={i}
                  className="h-2 w-7 rounded-full"
                  title={l.name}
                  style={{ background: l.color || "#75667D" }}
                />
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center justify-between text-xs text-muted">
            <div className="flex gap-3">
              {task.deadline && (
                <span
                  className={`flex items-center gap-1 ${!task.completedAt && isPast(new Date(task.deadline)) ? "text-danger" : ""}`}
                >
                  <Calendar size={13} />
                  {format(new Date(task.deadline), "dd MMM")}
                </span>
              )}
              {task.checklist?.length > 0 && (
                <span className="flex items-center gap-1">
                  <CheckSquare size={13} />
                  {task.checklist.filter((i) => i.completed).length}/
                  {task.checklist.length}
                </span>
              )}
            </div>
            <div className="flex -space-x-2">
              {task.assignees?.slice(0, 3).map((m) => (
                <Avatar key={m.id} user={m} size="sm" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
export function TaskForm({ open, onClose, columns, projectId }) {
  const qc = useQueryClient();
  const org = useAppStore((s) => s.organisation);
  const { data: members = [] } = useQuery({
    queryKey: ["members", org?.id],
    queryFn: () =>
      organisationsApi.members(org.id).then((r) => r.data.data.members),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      columnId: columns?.[0]?.id,
      deadline: "",
      estimatedHours: 0,
      assignees: [],
      labelNames: "",
    },
  });
  const submit = async (v) => {
    try {
      const labels = v.labelNames
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name, index) => ({
          name,
          color: ["#FF745F", "#7C5CFC", "#3FB27F", "#F5A742"][index % 4],
        }));
      await tasksApi.create({
        ...v,
        labels,
        projectId,
        deadline: v.deadline || null,
        assignees: Array.isArray(v.assignees)
          ? v.assignees
          : v.assignees
            ? [v.assignees]
            : [],
        labelNames: undefined,
      });
      toast.success("Task created");
      qc.invalidateQueries({ queryKey: ["board", projectId] });
      reset();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not create task");
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Create task">
      <form className="space-y-4" onSubmit={handleSubmit(submit)}>
        <div>
          <label className="label" htmlFor="task-title">Task title</label>
          <input
            id="task-title"
            autoFocus
            className="input"
            required
            minLength={2}
            {...register("title")}
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-24" {...register("description")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Column</label>
            <select className="input" {...register("columnId")}>
              {columns?.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" {...register("priority")}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="label">Deadline</label>
            <input className="input" type="date" {...register("deadline")} />
          </div>
          <div>
            <label className="label">Estimated hours</label>
            <input
              className="input"
              type="number"
              min="0"
              {...register("estimatedHours")}
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="task-labels">Labels</label>
          <input
            id="task-labels"
            className="input"
            placeholder="frontend, bug, release"
            {...register("labelNames")}
          />
        </div>
        <div>
          <label className="label">Assignees</label>
          <select
            multiple
            className="input min-h-28"
            {...register("assignees")}
          >
            {members.map((m) => (
              <option value={m.userId.id} key={m.id}>
                {m.userId.fullName}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            Hold Ctrl/Cmd to select multiple people.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={isSubmitting}>Create task</Button>
        </div>
      </form>
    </Modal>
  );
}
function TaskDetail({ taskId, onClose, columns, projectId }) {
  const qc = useQueryClient();
  const [comment, setComment] = useState(""),
    [replyTo, setReplyTo] = useState(null),
    [check, setCheck] = useState(""),
    [subtask, setSubtask] = useState("");
  const currentUser = useAppStore((s) => s.user);
  const taskQuery = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => tasksApi.get(taskId).then((r) => r.data.data.task),
    enabled: Boolean(taskId),
  });
  const commentsQuery = useQuery({
    queryKey: ["comments", taskId],
    queryFn: () => commentsApi.list(taskId).then((r) => r.data.data.comments),
    enabled: Boolean(taskId),
  });
  const update = async (data) => {
    try {
      await tasksApi.update(taskId, data);
      qc.invalidateQueries({ queryKey: ["task", taskId] });
      qc.invalidateQueries({ queryKey: ["board", projectId] });
      toast.success("Task updated");
    } catch (e) {
      toast.error(e.response?.data?.message || "Update failed");
    }
  };
  const addComment = useMutation({
    mutationFn: (payload) => commentsApi.create({ taskId, ...payload }),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ["comments", taskId] });
      const old = qc.getQueryData(["comments", taskId]) || [];
      const user = useAppStore.getState().user;
      qc.setQueryData(
        ["comments", taskId],
        [
          ...old,
          {
            id: `temp-${Date.now()}`,
            body: payload.body,
            parentId: payload.parentId,
            author: user,
            createdAt: new Date().toISOString(),
          },
        ],
      );
      return { old };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(["comments", taskId], ctx.old);
      toast.error("Could not add comment");
    },
    onSuccess: () => {
      setComment("");
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: ["comments", taskId] });
    },
  });
  const addCheck = async () => {
    if (!check.trim()) return;
    await tasksApi.checklist(taskId, check);
    setCheck("");
    qc.invalidateQueries({ queryKey: ["task", taskId] });
    qc.invalidateQueries({ queryKey: ["board", projectId] });
  };
  const addSub = async () => {
    if (!subtask.trim()) return;
    await tasksApi.subtask(taskId, { title: subtask });
    setSubtask("");
    qc.invalidateQueries({ queryKey: ["task", taskId] });
  };
  const upload = async (e) => {
    if (!e.target.files.length) return;
    const form = new FormData();
    [...e.target.files].forEach((f) => form.append("files", f));
    form.append("projectId", projectId);
    form.append("taskId", taskId);
    try {
      await filesApi.upload(form);
      toast.success("Attachment uploaded");
      qc.invalidateQueries({ queryKey: ["task", taskId] });
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    }
  };
  const remove = async () => {
    if (!confirm("Delete this task?")) return;
    await tasksApi.remove(taskId);
    qc.invalidateQueries({ queryKey: ["board", projectId] });
    onClose();
    toast.success("Task deleted");
  };
  const editComment = async (c) => {
    const body = prompt("Edit comment", c.body);
    if (!body || body === c.body) return;
    await commentsApi.update(c.id, body);
    qc.invalidateQueries({ queryKey: ["comments", taskId] });
  };
  const deleteComment = async (c) => {
    if (!confirm("Delete this comment?")) return;
    await commentsApi.remove(c.id);
    qc.invalidateQueries({ queryKey: ["comments", taskId] });
  };
  const t = taskQuery.data;
  if (!taskId) return null;
  return (
    <Modal
      open={Boolean(taskId)}
      onClose={onClose}
      title={t ? `TF-${t.taskNumber} · ${t.title}` : "Task details"}
      size="max-w-4xl"
    >
      {taskQuery.isLoading ? (
        <Skeleton className="h-96" />
      ) : taskQuery.isError ? (
        <ErrorState message={taskQuery.error.response?.data?.message} />
      ) : (
        <div className="grid gap-7 lg:grid-cols-[1fr_280px]">
          <div className="space-y-7">
            <section>
              <h3 className="text-sm font-bold">Description</h3>
              <textarea
                className="input mt-2 min-h-28"
                defaultValue={t.description}
                onBlur={(e) =>
                  e.target.value !== t.description &&
                  update({ description: e.target.value })
                }
              />
            </section>
            <section>
              <h3 className="text-sm font-bold">Checklist</h3>
              <div className="mt-3 space-y-2">
                {t.checklist.map((i) => (
                  <label
                    key={i.id}
                    className="flex items-center gap-3 rounded-xl border border-line p-3 text-sm dark:border-white/10"
                  >
                    <input
                      type="checkbox"
                      checked={i.completed}
                      onChange={async () => {
                        await tasksApi.toggleChecklist(t.id, i.id);
                        qc.invalidateQueries({ queryKey: ["task", taskId] });
                        qc.invalidateQueries({
                          queryKey: ["board", projectId],
                        });
                      }}
                    />
                    <span
                      className={i.completed ? "line-through text-muted" : ""}
                    >
                      {i.text}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  className="input"
                  placeholder="Add checklist item"
                  value={check}
                  onChange={(e) => setCheck(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addCheck())
                  }
                />
                <Button variant="secondary" onClick={addCheck}>
                  <Plus size={17} />
                </Button>
              </div>
            </section>
            <section>
              <h3 className="text-sm font-bold">Subtasks</h3>
              <div className="mt-3 space-y-2">
                {t.subtasks.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={s.completed}
                      onChange={async () => {
                        await tasksApi.toggleSubtask(t.id, s.id);
                        qc.invalidateQueries({ queryKey: ["task", taskId] });
                      }}
                    />
                    <span
                      className={s.completed ? "line-through text-muted" : ""}
                    >
                      {s.title}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  className="input"
                  placeholder="Add subtask"
                  value={subtask}
                  onChange={(e) => setSubtask(e.target.value)}
                />
                <Button variant="secondary" onClick={addSub}>
                  Add
                </Button>
              </div>
            </section>
            <section>
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <Paperclip size={16} />
                Attachments
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {t.attachments.map((a) => (
                  <a
                    className="rounded-xl border border-line px-3 py-2 text-xs font-semibold hover:text-coral"
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    key={a.id}
                  >
                    {a.name}
                  </a>
                ))}
              </div>
              <label className="btn-secondary mt-3 cursor-pointer">
                Upload files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={upload}
                />
              </label>
            </section>
            <section>
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <MessageCircle size={16} />
                Comments
              </h3>
              {replyTo && (
                <p className="mt-2 text-xs text-coral">
                  Replying to a comment ·{" "}
                  <button
                    onClick={() => setReplyTo(null)}
                    className="underline"
                  >
                    cancel
                  </button>
                </p>
              )}
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (comment.trim())
                    addComment.mutate({ body: comment, parentId: replyTo });
                }}
              >
                <input
                  className="input"
                  placeholder="Write a comment — use @username to mention"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <Button loading={addComment.isPending}>Send</Button>
              </form>
              <div className="mt-4 space-y-4">
                {commentsQuery.data?.map((c) => (
                  <div
                    key={c.id}
                    className={`flex gap-3 ${c.parentId ? "ml-8 border-l-2 border-coral/20 pl-3" : ""}`}
                  >
                    <Avatar user={c.author} />
                    <div className="min-w-0 flex-1 rounded-xl bg-canvas p-3 dark:bg-white/5">
                      <div className="flex justify-between gap-3">
                        <strong className="text-sm">
                          {c.author?.fullName}
                        </strong>
                        <time className="text-xs text-muted">
                          {format(new Date(c.createdAt), "dd MMM, HH:mm")}
                        </time>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm">
                        {c.body}
                      </p>
                      <div className="mt-2 flex gap-3 text-xs font-semibold text-muted">
                        <button onClick={() => setReplyTo(c.id)}>Reply</button>
                        <button
                          onClick={async () => {
                            await commentsApi.react(c.id, "👍");
                            qc.invalidateQueries({
                              queryKey: ["comments", taskId],
                            });
                          }}
                        >
                          👍{" "}
                          {c.reactions?.find((r) => r.emoji === "👍")?.users
                            ?.length || ""}
                        </button>
                        {c.author?.id === currentUser.id && (
                          <>
                            <button onClick={() => editComment(c)}>Edit</button>
                            <button
                              className="text-danger"
                              onClick={() => deleteComment(c)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                      {c.editedAt && (
                        <span className="text-[10px] text-muted">edited</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <aside className="space-y-4">
            <div>
              <label className="label" htmlFor="task-status">Status</label>
              <select
                id="task-status"
                className="input"
                value={t.columnId.id}
                onChange={async (e) => {
                  await tasksApi.move(t.id, {
                    columnId: e.target.value,
                    position: 0,
                  });
                  qc.invalidateQueries({ queryKey: ["task", taskId] });
                  qc.invalidateQueries({ queryKey: ["board", projectId] });
                }}
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select
                className="input"
                value={t.priority}
                onChange={(e) => update({ priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="label">Labels</label>
              <input
                className="input"
                defaultValue={t.labels.map((l) => l.name).join(", ")}
                onBlur={(e) =>
                  update({
                    labels: e.target.value
                      .split(",")
                      .map((name, index) => ({
                        name: name.trim(),
                        color: ["#FF745F", "#7C5CFC", "#3FB27F"][index % 3],
                      }))
                      .filter((l) => l.name),
                  })
                }
              />
            </div>
            <div>
              <label className="label">Deadline</label>
              <input
                className="input"
                type="date"
                value={t.deadline?.slice(0, 10) || ""}
                onChange={(e) => update({ deadline: e.target.value || null })}
              />
            </div>
            <div>
              <span className="label">Reporter</span>
              <div className="flex items-center gap-2 text-sm">
                <Avatar user={t.reporter} />
                {t.reporter?.fullName}
              </div>
            </div>
            <div>
              <span className="label">Assignees</span>
              <div className="space-y-2">
                {t.assignees.map((a) => (
                  <div className="flex items-center gap-2 text-sm" key={a.id}>
                    <Avatar user={a} size="sm" />
                    {a.fullName}
                  </div>
                ))}
              </div>
            </div>
            <Button variant="danger" className="w-full" onClick={remove}>
              <Trash2 size={16} />
              Delete task
            </Button>
          </aside>
        </div>
      )}
    </Modal>
  );
}
function ColumnLane({
  column,
  tasks,
  index,
  total,
  manage,
  onOpen,
  selected,
  onSelect,
  onRename,
  onDelete,
  onShift,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { type: "column", columnId: column.id },
  });
  return (
    <section
      ref={setNodeRef}
      className={`w-72 shrink-0 rounded-2xl p-3 transition ${isOver ? "bg-coral/10 ring-2 ring-coral/20" : "bg-plum-900/[.04] dark:bg-white/5"}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <button
          className="flex min-w-0 items-center gap-2 text-sm font-bold"
          onDoubleClick={() => manage && onRename(column)}
          title={manage ? "Double-click to rename" : ""}
        >
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: column.color }}
          />
          <span className="truncate">{column.name}</span>
          <Badge>{tasks.length}</Badge>
        </button>
        {manage && (
          <div className="flex">
            <button
              title="Move column left"
              disabled={index === 0}
              className="rounded p-1 text-muted disabled:opacity-25"
              onClick={() => onShift(index, -1)}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              title="Move column right"
              disabled={index === total - 1}
              className="rounded p-1 text-muted disabled:opacity-25"
              onClick={() => onShift(index, 1)}
            >
              <ChevronRight size={14} />
            </button>
            <button
              title="Delete empty column"
              className="rounded p-1 text-muted hover:text-danger"
              onClick={() => onDelete(column)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onOpen={onOpen}
              selected={selected.includes(task.id)}
              onSelect={onSelect}
            />
          ))}
        </div>
      </SortableContext>
      {tasks.length === 0 && (
        <div className="grid h-24 place-items-center rounded-xl border border-dashed border-line text-xs text-muted dark:border-white/10">
          Drop tasks here
        </div>
      )}
    </section>
  );
}

export default function BoardPage() {
  const { projectId } = useParams(),
    org = useAppStore((s) => s.organisation);
  const qc = useQueryClient();
  useSocket(projectId);
  const [create, setCreate] = useState(false),
    [openTask, setOpenTask] = useState(
      new URLSearchParams(location.search).get("task"),
    ),
    [search, setSearch] = useState(""),
    [priority, setPriority] = useState("all"),
    [assignee, setAssignee] = useState("all"),
    [status, setStatus] = useState("all"),
    [label, setLabel] = useState("all"),
    [sort, setSort] = useState("position"),
    [selected, setSelected] = useState([]),
    [bulkPriority, setBulkPriority] = useState("medium");
  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsApi.get(projectId).then((r) => r.data.data.project),
  });
  const boardQuery = useQuery({
    queryKey: ["board", projectId],
    queryFn: () => boardsApi.get(projectId).then((r) => r.data.data),
  });
  const { data: members = [] } = useQuery({
    queryKey: ["members", org?.id],
    queryFn: () =>
      organisationsApi.members(org.id).then((r) => r.data.data.members),
  });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const manage = ["owner", "admin", "manager"].includes(org.role);
  const labels = useMemo(
    () => [
      ...new Set(
        (boardQuery.data?.tasks || []).flatMap((t) =>
          t.labels.map((l) => l.name),
        ),
      ),
    ],
    [boardQuery.data?.tasks],
  );
  const filtered = useMemo(() => {
    const weight = { urgent: 0, high: 1, medium: 2, low: 3 };
    return (boardQuery.data?.tasks || [])
      .filter(
        (t) =>
          (!search ||
            `${t.title} ${t.description}`
              .toLowerCase()
              .includes(search.toLowerCase())) &&
          (priority === "all" || t.priority === priority) &&
          (assignee === "all" || t.assignees.some((a) => a.id === assignee)) &&
          (status === "all" || (t.columnId.id || t.columnId) === status) &&
          (label === "all" || t.labels.some((l) => l.name === label)),
      )
      .sort((a, b) =>
        sort === "deadline"
          ? new Date(a.deadline || "9999-12-31") -
            new Date(b.deadline || "9999-12-31")
          : sort === "priority"
            ? weight[a.priority] - weight[b.priority]
            : sort === "createdAt"
              ? new Date(b.createdAt) - new Date(a.createdAt)
              : a.position - b.position,
      );
  }, [boardQuery.data?.tasks, search, priority, assignee, status, label, sort]);
  const refresh = () =>
    qc.invalidateQueries({ queryKey: ["board", projectId] });
  const dragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const data = boardQuery.data,
      task = data.tasks.find((t) => t.id === active.id),
      overTask = data.tasks.find((t) => t.id === over.id),
      destination = overTask
        ? overTask.columnId.id || overTask.columnId
        : over.data.current?.columnId;
    if (!task || !destination) return;
    const destTasks = data.tasks.filter(
      (t) => (t.columnId.id || t.columnId) === destination && t.id !== task.id,
    );
    const position = overTask
        ? Math.max(
            destTasks.findIndex((t) => t.id === overTask.id),
            0,
          )
        : destTasks.length,
      old = structuredClone(data);
    qc.setQueryData(["board", projectId], {
      ...data,
      tasks: data.tasks.map((t) =>
        t.id === task.id ? { ...t, columnId: destination, position } : t,
      ),
    });
    try {
      await tasksApi.move(task.id, { columnId: destination, position });
      refresh();
    } catch (e) {
      qc.setQueryData(["board", projectId], old);
      toast.error(e.response?.data?.message || "Could not move task");
    }
  };
  const addColumn = async () => {
    const name = prompt("Column name");
    if (!name) return;
    try {
      await boardsApi.addColumn(boardQuery.data.board.id, { name });
      refresh();
    } catch (e) {
      toast.error(e.response?.data?.message);
    }
  };
  const rename = async (column) => {
    const name = prompt("Rename column", column.name);
    if (!name || name === column.name) return;
    try {
      await boardsApi.updateColumn(column.id, { name });
      refresh();
    } catch (e) {
      toast.error(e.response?.data?.message);
    }
  };
  const deleteColumn = async (column) => {
    if (!confirm(`Delete empty column “${column.name}”?`)) return;
    try {
      await boardsApi.removeColumn(column.id);
      refresh();
    } catch (e) {
      toast.error(e.response?.data?.message);
    }
  };
  const shift = async (index, direction) => {
    const ids = boardQuery.data.columns.map((c) => c.id),
      target = index + direction;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try {
      await boardsApi.reorder(boardQuery.data.board.id, ids);
      refresh();
    } catch (e) {
      toast.error(e.response?.data?.message);
    }
  };
  const selectTask = (id) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((v) => v !== id) : [...s, id],
    );
  const bulk = async () => {
    try {
      await tasksApi.bulk({
        taskIds: selected,
        updates: { priority: bulkPriority },
      });
      toast.success(`${selected.length} tasks updated`);
      setSelected([]);
      refresh();
    } catch (e) {
      toast.error(e.response?.data?.message);
    }
  };
  if (boardQuery.isLoading || projectQuery.isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((v) => (
            <Skeleton key={v} className="h-[600px] min-w-72" />
          ))}
        </div>
      </div>
    );
  if (boardQuery.isError)
    return (
      <ErrorState
        message={boardQuery.error.response?.data?.message}
        retry={boardQuery.refetch}
      />
    );
  const { board, columns } = boardQuery.data;
  return (
    <div className="animate-fade">
      <PageHeader
        title={projectQuery.data.name}
        description="Drag tasks to move work through the process."
        actions={
          <>
            {manage && (
              <Button variant="secondary" onClick={addColumn}>
                <Plus size={17} />
                Column
              </Button>
            )}
            {manage && (
              <Button onClick={() => setCreate(true)}>
                <Plus size={17} />
                New task
              </Button>
            )}
          </>
        }
      />
      <div className="mb-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <label className="relative md:col-span-2">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            className="input pl-10"
            placeholder="Search this board"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          className="input"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          {columns.map((c) => (
            <option value={c.id} key={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="all">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <select
          className="input"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
        >
          <option value="all">All assignees</option>
          {members.map((m) => (
            <option value={m.userId.id} key={m.id}>
              {m.userId.fullName}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        >
          <option value="all">All labels</option>
          {labels.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select
          className="input"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="position">Board order</option>
          <option value="deadline">Deadline</option>
          <option value="priority">Priority</option>
          <option value="createdAt">Created date</option>
        </select>
      </div>
      {selected.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-coral/20 bg-coral/5 p-3">
          <strong className="text-sm">{selected.length} selected</strong>
          <select
            className="input w-36"
            value={bulkPriority}
            onChange={(e) => setBulkPriority(e.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <Button onClick={bulk}>Update priority</Button>
          <button
            className="text-sm text-muted"
            onClick={() => setSelected([])}
          >
            Clear
          </button>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={dragEnd}
      >
        <div className="scrollbar-thin flex min-h-[calc(100vh-270px)] gap-4 overflow-x-auto pb-4">
          {columns.map((column, index) => (
            <ColumnLane
              key={column.id}
              column={column}
              tasks={filtered.filter(
                (t) => (t.columnId.id || t.columnId) === column.id,
              )}
              index={index}
              total={columns.length}
              manage={manage}
              onOpen={setOpenTask}
              selected={selected}
              onSelect={selectTask}
              onRename={rename}
              onDelete={deleteColumn}
              onShift={shift}
            />
          ))}
        </div>
      </DndContext>
      <TaskForm
        open={create}
        onClose={() => setCreate(false)}
        columns={columns}
        projectId={projectId}
      />
      <TaskDetail
        taskId={openTask}
        onClose={() => setOpenTask(null)}
        columns={columns}
        projectId={projectId}
      />
    </div>
  );
}
