import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  Calendar,
  Grid2X2,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { projectsApi, workspacesApi } from "../api";
import { useAppStore } from "../store/useAppStore";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Modal,
  PageHeader,
  Progress,
  Skeleton,
} from "../components/ui";

const ProjectForm = ({ open, onClose, project }) => {
  const qc = useQueryClient();
  const org = useAppStore((s) => s.organisation);
  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces", org?.id],
    queryFn: () => workspacesApi.list().then((r) => r.data.data.workspaces),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    values: project
      ? {
          ...project,
          workspaceId: project.workspaceId?.id || project.workspaceId,
          startDate: project.startDate?.slice(0, 10),
          deadline: project.deadline?.slice(0, 10),
        }
      : {
          name: "",
          description: "",
          color: "#FF745F",
          status: "active",
          workspaceId: workspaces[0]?.id,
          startDate: "",
          deadline: "",
        },
  });
  const done = () => {
    qc.invalidateQueries({ queryKey: ["projects"] });
    reset();
    onClose();
  };
  const submit = async (v) => {
    try {
      const data = {
        ...v,
        startDate: v.startDate || null,
        deadline: v.deadline || null,
      };
      project
        ? await projectsApi.update(project.id, data)
        : await projectsApi.create(data);
      toast.success(project ? "Project updated" : "Project created");
      done();
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not save project");
    }
  };
  const archive = async () => {
    try {
      await projectsApi.archive(project.id);
      toast.success("Project archived");
      done();
    } catch (e) {
      toast.error(e.response?.data?.message);
    }
  };
  const remove = async () => {
    if (!confirm(`Delete ${project.name} and all of its tasks?`)) return;
    try {
      await projectsApi.remove(project.id);
      toast.success("Project deleted");
      done();
    } catch (e) {
      toast.error(e.response?.data?.message);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? "Edit project" : "Create project"}
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit)}>
        <div>
          <label className="label" htmlFor="project-name">Project name</label>
          <input
            id="project-name"
            className="input"
            required
            minLength={2}
            {...register("name")}
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-24" {...register("description")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Workspace</label>
            <select className="input" required {...register("workspaceId")}>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" {...register("status")}>
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="on-hold">On hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="label">Start date</label>
            <input type="date" className="input" {...register("startDate")} />
          </div>
          <div>
            <label className="label">Deadline</label>
            <input type="date" className="input" {...register("deadline")} />
          </div>
        </div>
        <div>
          <label className="label">Project colour</label>
          <input
            type="color"
            className="h-11 w-20 rounded-xl border border-line p-1"
            {...register("color")}
          />
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          {project ? (
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={archive}>
                Archive
              </Button>
              <Button type="button" variant="danger" onClick={remove}>
                Delete
              </Button>
            </div>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={isSubmitting}>Save project</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
export const ProjectCard = ({ project, view, onEdit }) => {
  const navigate = useNavigate();
  const openProject = () => navigate(`/projects/${project.id}/board`);
  const editProject = (event) => {
    event.stopPropagation();
    onEdit(project);
  };
  return (
  <Card
    role="link"
    tabIndex={0}
    aria-label={`Open ${project.name}`}
    onClick={openProject}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openProject();
      }
    }}
    className={`${
      view === "list"
        ? "flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
        : "p-5"
    } cursor-pointer transition hover:-translate-y-0.5 hover:border-coral/30 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-coral/40`}
  >
    <div
      className={
        view === "list" ? "flex min-w-0 flex-1 items-center gap-4" : ""
      }
    >
      <span
        className={`${view === "list" ? "h-11 w-11" : "mb-4 h-12 w-12"} grid shrink-0 place-items-center rounded-2xl text-white`}
        style={{ backgroundColor: project.color }}
      >
        <span className="font-black">{project.name[0]}</span>
      </span>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold group-hover:text-coral">
              {project.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted">
              {project.description || "No description"}
            </p>
          </div>
          {view !== "list" && (
            <button
              aria-label="Edit project"
              onClick={editProject}
              className="rounded-lg p-1 text-muted hover:bg-canvas"
            >
              <MoreHorizontal />
            </button>
          )}
        </div>
        {view !== "list" && (
          <>
            <div className="mt-5 flex items-center justify-between text-xs">
              <span className="text-muted">Progress</span>
              <strong>{project.completionPercentage}%</strong>
            </div>
            <div className="mt-2">
              <Progress value={project.completionPercentage} />
            </div>
          </>
        )}
      </div>
    </div>
    <div
      className={`${view === "list" ? "flex items-center gap-5 sm:w-[45%] sm:justify-end" : "mt-5 flex items-center justify-between"} text-xs text-muted`}
    >
      <Badge>{project.status}</Badge>
      {project.deadline && (
        <span className="flex items-center gap-1">
          <Calendar size={14} />
          {format(new Date(project.deadline), "dd MMM")}
        </span>
      )}
      <div className="flex -space-x-2">
        {project.teamMembers?.slice(0, 3).map((m) => (
          <Avatar key={m.id} user={m} size="sm" />
        ))}
      </div>
      {view === "list" && (
        <Button variant="secondary" onClick={editProject}>
          Edit
        </Button>
      )}
    </div>
  </Card>
  );
};
export default function ProjectsPage() {
  const [create, setCreate] = useState(false),
    [edit, setEdit] = useState(null),
    [view, setView] = useState("grid"),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [sort, setSort] = useState("createdAt");
  const org = useAppStore((s) => s.organisation);
  const query = useQuery({
    queryKey: ["projects", org?.id, search, status, sort],
    queryFn: () =>
      projectsApi
        .list({ search: search || undefined, status, sort })
        .then((r) => r.data.data.projects),
  });
  return (
    <div className="animate-fade">
      <PageHeader
        title="Projects"
        description="Plan and track every initiative in one place."
        actions={
          <Button onClick={() => setCreate(true)}>
            <Plus size={17} />
            New project
          </Button>
        }
      />
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-line bg-card p-3 dark:border-white/10 dark:bg-plum-900 md:flex-row">
        <label className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            size={18}
          />
          <input
            className="input pl-10"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          className="input md:w-40"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="planned">Planned</option>
          <option value="on-hold">On hold</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
        <select
          className="input md:w-44"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="createdAt">Newest first</option>
          <option value="name">Name</option>
          <option value="deadline">Deadline</option>
        </select>
        <div className="flex rounded-xl border border-line bg-white p-1 dark:border-white/10 dark:bg-white/5">
          <button
            aria-label="Grid view"
            onClick={() => setView("grid")}
            className={`rounded-lg p-2 ${view === "grid" ? "bg-coral text-white" : ""}`}
          >
            <Grid2X2 size={18} />
          </button>
          <button
            aria-label="List view"
            onClick={() => setView("list")}
            className={`rounded-lg p-2 ${view === "list" ? "bg-coral text-white" : ""}`}
          >
            <List size={18} />
          </button>
        </div>
      </div>
      {query.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((v) => (
            <Skeleton key={v} className="h-64" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          message={query.error.response?.data?.message}
          retry={query.refetch}
        />
      ) : query.data.length === 0 ? (
        <EmptyState
          title="No projects found"
          text="Create a project or adjust your filters."
          action={
            <Button onClick={() => setCreate(true)}>Create project</Button>
          }
        />
      ) : (
        <div
          className={
            view === "grid"
              ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              : "space-y-3"
          }
        >
          {query.data.map((p) => (
            <ProjectCard key={p.id} project={p} view={view} onEdit={setEdit} />
          ))}
        </div>
      )}
      <ProjectForm
        open={create || Boolean(edit)}
        onClose={() => {
          setCreate(false);
          setEdit(null);
        }}
        project={edit}
      />
    </div>
  );
}
