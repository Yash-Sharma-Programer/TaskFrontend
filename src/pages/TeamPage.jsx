import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { MailPlus, MoreHorizontal, Search, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { organisationsApi, usersApi } from "../api";
import { useAppStore } from "../store/useAppStore.js";
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
function InviteModal({ open, onClose }) {
  const org = useAppStore((s) => s.organisation);
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({ defaultValues: { role: "member" } });
  const submit = async (v) => {
    try {
      const { data } = await organisationsApi.invite(org.id, v);
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["members"] });
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not send invitation");
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Invite team member">
      <form className="space-y-4" onSubmit={handleSubmit(submit)}>
        <div>
          <label className="label" htmlFor="invite-username">TaskFlow username</label>
          <input
            id="invite-username"
            className="input"
            autoComplete="off"
            placeholder="example.username"
            required
            minLength={3}
            {...register("username")}
          />
        </div>
        <div>
          <label className="label">Organisation role</label>
          <select className="input" {...register("role")}>
            <option value="member">Member</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <p className="rounded-xl bg-canvas p-3 text-xs text-muted dark:bg-white/5">
          The user will receive this request in TaskFlow notifications. It
          expires after seven days.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={isSubmitting}>Send invitation</Button>
        </div>
      </form>
    </Modal>
  );
}
function MemberModal({ id, onClose }) {
  const query = useQuery({
    queryKey: ["member-profile", id],
    queryFn: () => usersApi.get(id).then((r) => r.data.data),
    enabled: Boolean(id),
  });

  // A disabled TanStack Query has no data. Do not render the modal body until
  // a member has actually been selected.
  if (!id) return null;

  return (
    <Modal open={Boolean(id)} onClose={onClose} title="Member profile">
      {query.isPending ? (
        <Skeleton className="h-80" />
      ) : query.isError ? (
        <ErrorState message={query.error.response?.data?.message} />
      ) : !query.data?.user ? (
        <ErrorState message="This member profile is no longer available." />
      ) : (
        <>
          <div className="flex items-center gap-4">
            <Avatar user={query.data.user} size="lg" />
            <div>
              <h3 className="text-lg font-black">{query.data.user.fullName}</h3>
              <p className="text-sm text-muted">
                {query.data.user.jobTitle || "Team member"} · {query.data.role}
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm text-muted">
            {query.data.user.bio || "No bio added yet."}
          </p>
          <h4 className="mt-7 font-bold">Task history</h4>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {(query.data.tasks || []).map((t) => (
              <div
                className="rounded-xl border border-line p-3 text-sm dark:border-white/10"
                key={t.id}
              >
                <strong>{t.title}</strong>
                <p className="mt-1 text-xs text-muted">
                  {t.projectId?.name || "Deleted project"} ·{" "}
                  {t.completedAt ? "Completed" : "Active"}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
export default function TeamPage() {
  const org = useAppStore((s) => s.organisation);
  const qc = useQueryClient();
  const [invite, setInvite] = useState(false),
    [search, setSearch] = useState(""),
    [role, setRole] = useState("all"),
    [profile, setProfile] = useState(null);
  const query = useQuery({
    queryKey: ["members", org?.id],
    queryFn: () =>
      organisationsApi.members(org.id).then((r) => r.data.data.members),
  });
  const changeRole = async (member, value) => {
    try {
      await organisationsApi.role(org.id, member.id, value);
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["members"] });
    } catch (e) {
      toast.error(e.response?.data?.message);
    }
  };
  const remove = async (member) => {
    if (!confirm(`Remove ${member.userId?.fullName || "this member"} from the organisation?`))
      return;
    try {
      await organisationsApi.removeMember(org.id, member.id);
      toast.success("Member removed");
      qc.invalidateQueries({ queryKey: ["members"] });
    } catch (e) {
      toast.error(e.response?.data?.message);
    }
  };
  const filtered =
    query.data?.filter(
      (m) =>
        m.userId &&
        (role === "all" || m.role === role) &&
        (!search ||
          `${m.userId.fullName} ${m.userId.email}`
            .toLowerCase()
            .includes(search.toLowerCase())),
    ) || [];
  const canManage = ["owner", "admin"].includes(org.role);
  return (
    <div className="animate-fade">
      <PageHeader
        title="Team"
        description="People, roles, availability and workload."
        actions={
          canManage && (
            <Button onClick={() => setInvite(true)}>
              <MailPlus size={17} />
              Invite member
            </Button>
          )
        }
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            size={17}
          />
          <input
            className="input pl-10"
            placeholder="Search people"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          className="input sm:w-44"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="all">All roles</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="member">Member</option>
        </select>
      </div>
      {query.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((v) => (
            <Skeleton className="h-64" key={v} />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState message={query.error.response?.data?.message} />
      ) : !filtered.length ? (
        <EmptyState title="No members found" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => {
            const assigned = m.taskStats?.assigned || 0,
              completed = m.taskStats?.completed || 0,
              workload = Math.min(assigned * 12, 100);
            const lastActiveAt = m.userId.lastActiveAt
              ? new Date(m.userId.lastActiveAt)
              : null;
            return (
              <Card className="p-5" key={m.id}>
                <div className="flex items-start">
                  <button
                    className="flex min-w-0 items-center gap-3 text-left"
                    onClick={() => setProfile(m.userId.id || m.userId._id)}
                  >
                    <span className="relative">
                      <Avatar user={m.userId} size="lg" />
                      <span
                        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${lastActiveAt && new Date() - lastActiveAt < 5 * 60 * 1000 ? "bg-success" : "bg-slate-400"}`}
                      />
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate">
                        {m.userId.fullName}
                      </strong>
                      <span className="block truncate text-xs text-muted">
                        {m.userId.email}
                      </span>
                    </span>
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Badge>{m.role}</Badge>
                  <span className="text-xs text-muted">
                    {lastActiveAt
                      ? `Active ${formatDistanceToNow(lastActiveAt, { addSuffix: true })}`
                      : "Activity unavailable"}
                  </span>
                </div>
                <div className="mt-5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Workload</span>
                    <strong>{workload}%</strong>
                  </div>
                  <div className="mt-2">
                    <Progress value={workload} />
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-xl bg-canvas p-3 dark:bg-white/5">
                    <strong>{assigned}</strong>
                    <p className="text-xs text-muted">Assigned</p>
                  </div>
                  <div className="rounded-xl bg-canvas p-3 dark:bg-white/5">
                    <strong>{completed}</strong>
                    <p className="text-xs text-muted">Completed</p>
                  </div>
                </div>
                {canManage && m.role !== "owner" && (
                  <div className="mt-4 flex gap-2">
                    <select
                      className="input py-2"
                      value={m.role}
                      onChange={(e) => changeRole(m, e.target.value)}
                    >
                      <option value="member">Member</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      aria-label="Remove member"
                      className="rounded-xl border border-danger/20 p-2.5 text-danger hover:bg-danger/10"
                      onClick={() => remove(m)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      <InviteModal open={invite} onClose={() => setInvite(false)} />
      <MemberModal id={profile} onClose={() => setProfile(null)} />
    </div>
  );
}
