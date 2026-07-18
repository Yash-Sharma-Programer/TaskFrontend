import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, FileText, MessageCircle, MoreVertical, Paperclip, Search, Send, Smile, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { chatApi } from '../api';
import { useAppStore } from '../store/useAppStore';
import { Avatar, EmptyState, ErrorState, Skeleton } from '../components/ui';

const emojis = ['😀', '😂', '😊', '👍', '🎉', '❤️', '🔥', '✅', '🙏', '🚀'];
const fileSize = (size = 0) => size >= 1048576 ? `${(size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;
const getId = (item) => item?.id || item?._id;
const normalizeMessage = (message) => ({
  ...message,
  id: getId(message),
  attachments: (message.attachments || []).map((attachment) => ({
    ...attachment,
    id: getId(attachment),
  })),
});

function MemberList({ members, selected, onSelect, search, setSearch }) {
  return (
    <aside className={`${selected ? 'hidden md:flex' : 'flex'} min-h-0 flex-col border-r border-line dark:border-white/10 md:w-80`}>
      <div className="border-b border-line p-4 dark:border-white/10">
        <h1 className="text-xl font-black">Chat</h1>
        <p className="mt-1 text-xs text-muted">Message an organisation member</p>
        <label className="relative mt-4 block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input className="input py-2 pl-9" placeholder="Search members" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-2">
        {members.length ? members.map((member) => {
          const online = member.lastActiveAt && Date.now() - new Date(member.lastActiveAt).getTime() < 300000;
          return (
            <button className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-canvas dark:hover:bg-white/5 ${selected?.id === member.id ? 'bg-coral/10' : ''}`} key={member.id} onClick={() => onSelect(member)}>
              <span className="relative">
                <Avatar user={member} size="lg" />
                <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${online ? 'bg-success' : 'bg-slate-400'}`} />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm">{member.fullName}</strong>
                <span className="block truncate text-xs text-muted">@{member.username} · {member.role}</span>
              </span>
              {member.unread > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-coral px-1 text-xs font-bold text-white">{member.unread}</span>}
            </button>
          );
        }) : <p className="p-6 text-center text-sm text-muted">No members found.</p>}
      </div>
    </aside>
  );
}

function Attachment({ attachment, mine, onSave }) {
  if (attachment.mimeType?.startsWith('image/')) {
    return <div className="group/attachment relative"><a href={attachment.url} target="_blank" rel="noreferrer"><img className="max-h-52 w-full rounded-xl object-cover" src={attachment.url} alt={attachment.name} /></a><button type="button" aria-label={`Save ${attachment.name}`} title="Save image" className="absolute right-2 top-2 rounded-lg bg-black/60 p-2 text-white opacity-0 transition group-hover/attachment:opacity-100 focus:opacity-100" onClick={onSave}><Download size={16} /></button></div>;
  }
  return (
    <div className={`flex items-center gap-2 rounded-xl border p-2 ${mine ? 'border-white/30 bg-white/10' : 'border-line dark:border-white/10'}`}>
      <FileText size={18} />
      <a className="min-w-0 flex-1" href={attachment.url} target="_blank" rel="noreferrer"><strong className="block truncate text-xs">{attachment.name}</strong><span className="text-[10px] opacity-70">{fileSize(attachment.size)}</span></a>
      <button type="button" aria-label={`Save ${attachment.name}`} title="Save file" className="rounded-lg p-1.5 hover:bg-black/10" onClick={onSave}><Download size={16} /></button>
    </div>
  );
}

export default function ChatPage() {
  const user = useAppStore((state) => state.user);
  const organisation = useAppStore((state) => state.organisation);
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [messageMenu, setMessageMenu] = useState(null);
  const fileInput = useRef(null);
  const bottom = useRef(null);

  const membersQuery = useQuery({ queryKey: ['chat-members', organisation?.id], queryFn: () => chatApi.members().then((response) => response.data.data.members) });
  const messagesQuery = useQuery({
    queryKey: ['chat-messages', organisation?.id, selected?.id],
    queryFn: () => chatApi.messages(getId(selected)).then((response) => response.data.data.messages.map(normalizeMessage)),
    enabled: Boolean(selected),
    refetchInterval: 30000,
  });
  const members = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (membersQuery.data || []).filter((member) => !term || `${member.fullName} ${member.username}`.toLowerCase().includes(term));
  }, [membersQuery.data, search]);

  useEffect(() => {
    bottom.current?.scrollIntoView?.({ behavior: 'smooth' });
    if (selected) queryClient.invalidateQueries({ queryKey: ['chat-members'] });
  }, [messagesQuery.data?.length, selected?.id]);

  const sendMessage = useMutation({
    mutationFn: () => {
      const data = new FormData();
      if (text.trim()) data.append('body', text.trim());
      files.forEach((file) => data.append('files', file));
      return chatApi.send(getId(selected), data);
    },
    onSuccess: () => {
      setText(''); setFiles([]); setShowEmoji(false);
      if (fileInput.current) fileInput.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['chat-members'] });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not send message'),
  });
  const submit = (event) => {
    event.preventDefault();
    if ((text.trim() || files.length) && !sendMessage.isPending) sendMessage.mutate();
  };

  const deleteMessage = async (message, scope) => {
    if (scope === 'everyone' && !confirm('Delete this message and its attachments for everyone?')) return;
    const messageId = getId(message);
    if (!messageId) return toast.error('This message is missing its identifier. Refresh the chat and try again.');
    try {
      await chatApi.remove(messageId, scope);
      setMessageMenu(null);
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['chat-members'] });
      toast.success(scope === 'everyone' ? 'Message deleted for everyone' : 'Message deleted for you');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete message');
    }
  };

  const saveAttachment = async (message, attachment) => {
    const messageId = getId(message);
    const attachmentId = getId(attachment);
    if (!messageId || !attachmentId) return toast.error('This attachment is missing its identifier. Refresh the chat and try again.');
    try {
      const response = await chatApi.download(messageId, attachmentId);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.name || 'attachment';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save attachment');
    }
  };

  if (membersQuery.isLoading) return <Skeleton className="h-[calc(100vh-8rem)]" />;
  if (membersQuery.isError) return <ErrorState message={membersQuery.error.response?.data?.message} retry={membersQuery.refetch} />;

  return (
    <div className="card flex h-[calc(100vh-8rem)] min-h-[520px] overflow-hidden p-0">
      <MemberList members={members} selected={selected} onSelect={(member) => { setSelected(member); setText(''); setFiles([]); }} search={search} setSearch={setSearch} />
      {!selected ? (
        <div className="hidden flex-1 place-items-center md:grid"><EmptyState title="Select a team member" text="Choose someone from your organisation to start messaging." /></div>
      ) : (
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-4 dark:border-white/10">
            <button aria-label="Back to members" className="rounded-lg p-2 hover:bg-canvas md:hidden" onClick={() => setSelected(null)}><ArrowLeft size={19} /></button>
            <Avatar user={selected} />
            <div className="min-w-0"><strong className="block truncate text-sm">{selected.fullName}</strong><span className="block truncate text-xs text-muted">@{selected.username}</span></div>
          </header>
          <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto bg-canvas/50 p-4 dark:bg-black/10">
            {messagesQuery.isLoading ? <div className="space-y-3"><Skeleton className="ml-auto h-16 w-2/3" /><Skeleton className="h-20 w-2/3" /></div> : messagesQuery.isError ? <ErrorState message={messagesQuery.error.response?.data?.message} retry={messagesQuery.refetch} /> : messagesQuery.data?.length ? messagesQuery.data.map((message) => {
              const mine = (message.sender?.id || message.sender) === user.id;
              const messageId = getId(message);
              return (
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`} key={messageId}>
                  <div className={`relative max-w-[82%] rounded-2xl px-4 py-3 pr-9 text-sm shadow-sm ${mine ? 'rounded-br-md bg-coral text-white' : 'rounded-bl-md border border-line bg-card dark:border-white/10'}`}>
                    {message.deletedForEveryoneAt ? <p className="italic opacity-70">This message was deleted</p> : message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
                    {!message.deletedForEveryoneAt && message.attachments?.length > 0 && <div className={`${message.body ? 'mt-3' : ''} space-y-2`}>{message.attachments.map((attachment, index) => <Attachment attachment={attachment} mine={mine} onSave={() => saveAttachment(message, attachment)} key={getId(attachment) || `${messageId}-${attachment.name}-${index}`} />)}</div>}
                    <button type="button" aria-label="Message options" className={`absolute right-1.5 top-1.5 rounded-lg p-1 ${mine ? 'hover:bg-white/15' : 'hover:bg-canvas dark:hover:bg-white/5'}`} onClick={() => setMessageMenu((current) => current === messageId ? null : messageId)}><MoreVertical size={15} /></button>
                    {messageMenu === messageId && <div className="absolute right-2 top-8 z-20 min-w-44 rounded-xl border border-line bg-card p-1 text-ink shadow-xl dark:border-white/10 dark:bg-plum-900 dark:text-white"><button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-canvas dark:hover:bg-white/5" onClick={() => deleteMessage(message, 'me')}><Trash2 size={14} />Delete for me</button>{mine && !message.deletedForEveryoneAt && <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-danger hover:bg-danger/10" onClick={() => deleteMessage(message, 'everyone')}><Trash2 size={14} />Delete for everyone</button>}</div>}
                    <span className={`mt-1 block text-right text-[10px] ${mine ? 'text-white/70' : 'text-muted'}`}>{format(new Date(message.createdAt), 'HH:mm')}</span>
                  </div>
                </div>
              );
            }) : <div className="grid h-full place-items-center"><div className="text-center text-muted"><MessageCircle className="mx-auto mb-2" /><p className="text-sm">No messages yet. Say hello.</p></div></div>}
            <div ref={bottom} />
          </div>
          <form className="relative border-t border-line p-3 dark:border-white/10" onSubmit={submit}>
            {files.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{files.map((file, index) => <span className="flex max-w-52 items-center gap-2 rounded-lg bg-canvas px-2 py-1 text-xs dark:bg-white/5" key={`${file.name}-${index}`}><Paperclip size={13} /><span className="truncate">{file.name}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, item) => item !== index))}><X size={13} /></button></span>)}</div>}
            {showEmoji && <div className="absolute bottom-16 left-3 z-10 grid grid-cols-5 gap-1 rounded-xl border border-line bg-card p-2 shadow-xl dark:border-white/10">{emojis.map((emoji) => <button className="rounded-lg p-2 text-xl hover:bg-canvas dark:hover:bg-white/5" type="button" key={emoji} onClick={() => setText((current) => current + emoji)}>{emoji}</button>)}</div>}
            <div className="flex items-end gap-2">
              <button type="button" aria-label="Add emoji" className="rounded-xl p-2.5 text-muted hover:bg-canvas hover:text-coral dark:hover:bg-white/5" onClick={() => setShowEmoji((current) => !current)}><Smile size={20} /></button>
              <button type="button" aria-label="Attach files" className="rounded-xl p-2.5 text-muted hover:bg-canvas hover:text-coral dark:hover:bg-white/5" onClick={() => fileInput.current?.click()}><Paperclip size={20} /></button>
              <input ref={fileInput} type="file" multiple className="hidden" onChange={(event) => setFiles([...event.target.files].slice(0, 6))} />
              <textarea aria-label="Message" className="input max-h-28 min-h-11 flex-1 resize-none py-2.5" placeholder={`Message ${selected.fullName}`} rows={1} value={text} maxLength={5000} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(event); } }} />
              <button aria-label="Send message" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-coral text-white disabled:opacity-50" disabled={sendMessage.isPending || (!text.trim() && !files.length)}><Send size={18} /></button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
