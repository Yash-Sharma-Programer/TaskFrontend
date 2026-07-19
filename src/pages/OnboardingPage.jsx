import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { invitationsApi, organisationsApi } from '../api';
import { useAppStore } from '../store/useAppStore.js';
import { Button } from '../components/ui.jsx';
import { Bell, FolderKanban } from 'lucide-react';

export default function OnboardingPage() {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      name: 'My Team',
      description: 'Our shared TaskFlow organisation',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });
  const [responding, setResponding] = useState(null);
  const { setOrganisations, selectOrganisation } = useAppStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: invitations = [] } = useQuery({
    queryKey: ['invitations'],
    queryFn: () =>
      invitationsApi.list().then((response) => response.data.data.invitations),
    refetchInterval: 30000,
  });

  const submit = async (values) => {
    try {
      const { data } = await organisationsApi.create(values);
      setOrganisations([data.data.organisation]);
      selectOrganisation(data.data.organisation);
      toast.success('Workspace created');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not create organisation');
    }
  };

  const respond = async (invitation, action) => {
    setResponding(invitation.id);
    try {
      await invitationsApi.respond(invitation.id, action);
      if (action === 'accept') {
        const organisations = (await organisationsApi.list()).data.data
          .organisations;
        setOrganisations(organisations);
        const joined = organisations.find(
          (organisation) => organisation.id === invitation.organisation.id,
        );
        if (joined) selectOrganisation(joined);
        toast.success(`You joined ${invitation.organisation.name}`);
        navigate('/dashboard');
      } else {
        toast.success('Invitation declined');
        queryClient.invalidateQueries({ queryKey: ['invitations'] });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not respond to invitation');
    } finally {
      setResponding(null);
    }
  };

  return (
    <div className="min-h-screen bg-canvas p-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        {invitations.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-coral/10 text-coral">
                <Bell size={20} />
              </span>
              <div>
                <h2 className="font-black">Pending team invitations</h2>
                <p className="text-sm text-muted">
                  Accept a request to join an existing organisation.
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {invitations.map((invitation) => (
                <div
                  className="flex flex-col gap-3 rounded-xl border border-line p-4 sm:flex-row sm:items-center"
                  key={invitation.id}
                >
                  <div className="min-w-0 flex-1">
                    <strong>{invitation.organisation.name}</strong>
                    <p className="text-xs text-muted">
                      Invited by {invitation.invitedBy.fullName} as {invitation.role}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      disabled={responding === invitation.id}
                      onClick={() => respond(invitation, 'reject')}
                    >
                      Decline
                    </Button>
                    <Button
                      loading={responding === invitation.id}
                      onClick={() => respond(invitation, 'accept')}
                    >
                      Accept
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card p-7 sm:p-10">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-coral text-white">
            <FolderKanban />
          </span>
          <h1 className="mt-6 text-3xl font-black">Create your organisation</h1>
          <p className="mt-2 text-muted">
            This keeps your team, projects and data securely separated.
          </p>
          <form className="mt-8 space-y-5" onSubmit={handleSubmit(submit)}>
            <div>
              <label className="label" htmlFor="organisation-name">
                Organisation name
              </label>
              <input
                id="organisation-name"
                className="input"
                required
                minLength={2}
                {...register('name')}
              />
            </div>
            <div>
              <label className="label" htmlFor="organisation-description">
                Description
              </label>
              <textarea
                id="organisation-description"
                className="input min-h-24"
                {...register('description')}
              />
            </div>
            <div>
              <label className="label" htmlFor="organisation-timezone">
                Time zone
              </label>
              <input
                id="organisation-timezone"
                className="input"
                {...register('timezone')}
              />
            </div>
            <Button className="w-full" loading={isSubmitting}>
              Create organisation
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
