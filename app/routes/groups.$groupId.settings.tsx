import { requireUserId } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { PageWrapper } from '~/components/ui/page-wrapper';
import { redirect, Link } from 'react-router';
import { Input } from '~/components/ui/input';
import { useEffect, useRef, useState } from 'react';

export async function loader({ request, params }: any) {
  const userId = await requireUserId(request);
  const { groupId } = params;
  const group = await db.groupChat.findUnique({ where: { id: groupId } });
  if (!group) throw new Response('Group not found', { status: 404 });
  if (!group.participantIds.includes(userId)) throw new Response('Unauthorized', { status: 403 });

  const participants = await db.user.findMany({ where: { id: { in: group.participantIds } }, select: { id: true, displayName: true, profilePhotoUrl: true } });
  const gearLists = await db.gearList.findMany({ where: { groupId } });

  return { group, participants, userId, gearLists };
}

export async function action({ request, params }: any) {
  const userId = await requireUserId(request);
  const { groupId } = params;
  const form = await request.formData();
  const action = form.get('_action') as string | null;

  const group = await db.groupChat.findUnique({ where: { id: groupId } });
  if (!group) throw new Response('Group not found', { status: 404 });
  if (!group.participantIds.includes(userId)) throw new Response('Unauthorized', { status: 403 });

  if (action === 'change-name') {
    const name = (form.get('name') as string) || group.name;
    await db.groupChat.update({ where: { id: groupId }, data: { name } });
    return redirect(`/groups/${groupId}/settings`);
  }

  if (action === 'add-participant') {
    const userId = form.get('userId') as string;
    if (!userId) return redirect(`/groups/${groupId}/settings`);
    const userToAdd = await db.user.findUnique({ where: { id: userId } });
    if (!userToAdd) throw new Response('User not found', { status: 404 });

    if (!group.participantIds.includes(userToAdd.id)) {
      const updated = [...group.participantIds, userToAdd.id];
      await db.groupChat.update({ where: { id: groupId }, data: { participantIds: updated } });
      await db.groupChatParticipant.upsert({
        where: { groupChatId_participantId: { groupChatId: groupId, participantId: userToAdd.id } } as any,
        create: { groupChatId: groupId, participantId: userToAdd.id, lastReadAt: null },
        update: {},
      });

      // Create notification for invited user
      await db.notification.create({
        data: {
          userId: userToAdd.id,
          type: 'group_invite',
          relatedEntityId: group.id,
          relatedEntityType: 'group_chat',
          content: { message: `You've been added to group: ${group.name}` },
          readStatus: false,
        },
      });
    }

    return redirect(`/groups/${groupId}/settings`);
  }

  if (action === 'remove-participant') {
    const participantId = form.get('participantId') as string;
    if (!participantId) return redirect(`/groups/${groupId}/settings`);
    // Only allow the group creator to remove other participants. Any participant may remove themselves.
    if (participantId !== userId && userId !== group.creatorId) {
      throw new Response('Forbidden', { status: 403 });
    }
    const remaining = group.participantIds.filter((p: string) => p !== participantId);
    await db.groupChat.update({ where: { id: groupId }, data: { participantIds: remaining } });
    await db.groupChatParticipant.deleteMany({ where: { groupChatId: groupId, participantId } });
    // If user removed themselves, redirect to messages
    if (participantId === userId) return redirect('/messages');
    return redirect(`/groups/${groupId}/settings`);
  }

  if (action === 'leave') {
    const remaining = group.participantIds.filter((p: string) => p !== userId);
    await db.groupChat.update({ where: { id: groupId }, data: { participantIds: remaining } });
    await db.groupChatParticipant.deleteMany({ where: { groupChatId: groupId, participantId: userId } });
    return redirect('/messages');
  }

  if (action === 'create-gearlist') {
    const name = (form.get('gearName') as string) || `${group.name} Gear List`;
    const gear = await db.gearList.create({
      data: { creatorId: userId, name, participantIds: group.participantIds, groupId },
    });
    return redirect(`/gear/${gear.id}`);
  }

  if (action === 'plan-trip') {
    // Redirect to a trip planner (not implemented) with group context
    return redirect(`/trips/new?groupId=${encodeURIComponent(groupId)}`);
  }

  return redirect(`/groups/${groupId}/settings`);
}

export default function GroupSettings({ loaderData }: any) {
  const { group, participants, userId, gearLists } = loaderData;
  const [queryState, setQueryState] = useState('');
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const lastQueryRef = useRef<string>('');
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Live-search users as queryState changes (debounced)
  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    if (!queryState || queryState.length < 2) {
      setClientResults([]);
      setSearching(false);
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(queryState)}`, {
          signal: abortRef.current.signal,
        });
        if (!res.ok) {
          setSearching(false);
          return;
        }
        const data = await res.json();
        // Exclude already-added participants from the results
        const users = (data.users || []).filter((u: any) => 
          !participants.some((p: any) => p.id === u.id) && u.id !== userId
        );
        setClientResults(users);
        lastQueryRef.current = queryState;
        setSearching(false);
      } catch (err) {
        if ((err as any).name === 'AbortError') return;
        console.error('User search failed', err);
        setSearching(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [queryState, participants, userId]);

  return (
    <PageWrapper maxWidth="3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Group Settings</h1>
          <div className="text-sm text-secondary">{group.name}</div>
        </div>
        <div>
          <Link to={`/groups/${group.id}`} className="rounded-lg px-3 py-2 text-sm text-secondary hover:bg-secondary">Back</Link>
        </div>
      </div>

      <div className="space-y-6">
        <section className="rounded-lg bg-secondary p-4">
          <h2 className="text-lg font-semibold text-primary">Name</h2>
          <form method="post" className="mt-2 flex space-x-2">
            <input defaultValue={group.name} name="name" className="flex-1 rounded-md border p-2 bg-surface" />
            <input type="hidden" name="_action" value="change-name" />
            <button className="btn-primary px-4 py-2">Save</button>
          </form>
        </section>

        <section className="rounded-lg bg-secondary p-4">
          <h2 className="text-lg font-semibold text-primary">Participants</h2>
          <div className="mt-2 space-y-2">
            {participants.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between rounded-md p-2 bg-surface">
                <div className="flex items-center space-x-3">
                  {p.profilePhotoUrl ? (
                    <img src={p.profilePhotoUrl} alt={p.displayName} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-400" />
                  )}
                  <div>{p.displayName}</div>
                </div>
                <div>
                  {p.id === userId ? (
                    <form method="post" className="inline">
                      <input type="hidden" name="_action" value="leave" />
                      <button className="text-sm text-red-600">Leave Group</button>
                    </form>
                  ) : (
                    // Only group creator may remove other participants
                    userId === group.creatorId ? (
                      <form method="post" className="inline">
                        <input type="hidden" name="_action" value="remove-participant" />
                        <input type="hidden" name="participantId" value={p.id} />
                        <button className="text-sm text-red-600">Remove</button>
                      </form>
                    ) : (
                      <div className="text-sm text-secondary">Member</div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-medium text-primary mb-2">Add Participant</h3>
            
            <div className="mb-3">
              <Input
                type="text"
                name="q"
                id="search"
                value={queryState}
                onChange={(e) => setQueryState(e.target.value)}
                placeholder="Search for a user..."
                className="w-full rounded-lg border border-default px-4 py-2 text-sm focus:outline-none focus:ring-2 dark:border-default dark:bg-surface dark:text-primary"
                autoComplete="off"
              />
            </div>

            {/* Search Results */}
            {clientResults.length > 0 && (
              <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
                {clientResults.map((user) => (
                  <form key={user.id} method="post" className="inline-block w-full">
                    <input type="hidden" name="_action" value="add-participant" />
                    <input type="hidden" name="userId" value={user.id} />
                    <button
                      type="submit"
                      className="flex w-full items-center justify-between space-x-3 rounded-lg p-3 text-left hover:bg-surface dark:hover:bg-surface"
                    >
                      <div className="flex items-center space-x-3">
                        {user.profilePhotoUrl ? (
                          <img
                            src={user.profilePhotoUrl}
                            alt={user.displayName}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                            {user.displayName[0].toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-primary">
                          {user.displayName}
                        </span>
                      </div>
                      <span className="text-sm text-secondary">Add</span>
                    </button>
                  </form>
                ))}
              </div>
            )}

            {queryState && !searching && clientResults.length === 0 && lastQueryRef.current === queryState && (
              <p className="text-center text-sm text-muted mb-3">
                No users found matching "{queryState}"
              </p>
            )}

            {!queryState && (
              <p className="text-center text-sm text-muted mb-3">
                Type at least 2 characters to search for users
              </p>
            )}
          </div>
        </section>

        <section className="rounded-lg bg-secondary p-4">
          <h2 className="text-lg font-semibold text-primary">Plan Trip</h2>
          <div className="mt-2 space-y-2">
            <form method="post" className="flex flex-col gap-2 space-x-2">
              <input name="gearName" placeholder="Trip / gear list name (optional)" className="flex-1 rounded-md border p-2 bg-surface" />
              <input type="hidden" name="_action" value="create-gearlist" />
              <button className="btn-primary px-4 py-2 grow">Plan Trip With Group</button>
            </form>
          </div>
        </section>

        <section className="rounded-lg bg-secondary p-4">
          <h2 className="text-lg font-semibold text-primary">Group Gear Lists</h2>
          <div className="mt-2 space-y-2">
            {gearLists && gearLists.length > 0 ? (
              gearLists.map((g: any) => (
                <Link key={g.id} to={`/gear/${g.id}`} className="block rounded-md p-2 bg-surface">{g.name}</Link>
              ))
            ) : (
              <div className="text-sm text-secondary">No gear lists created for this group.</div>
            )}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
