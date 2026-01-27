import { useEffect, useState, useCallback } from 'react';
import type { GearItem as GearItemType } from '~/types/db';
import { useGearList } from '~/hooks/use-socket';

interface Props {
  item: any;
  gearListId: string;
  currentUserId?: string;
}

export default function GearItem({ item, gearListId, currentUserId }: Props) {
  const [state, setState] = useState(() => ({
    quantityNeeded: item.quantityNeeded,
    quantityClaimed: item.quantityClaimed,
    // claimedByUsers: [{ id, displayName, profilePhotoUrl, quantity }]
    claimedByUsers: (() => {
      if (item.claimedByUsers && Array.isArray(item.claimedByUsers)) return item.claimedByUsers;
      const arr: string[] = item.claimedByUserIds || [];
      const counts: Record<string, number> = {};
      arr.forEach((id: string) => { counts[id] = (counts[id] || 0) + 1; });
      return Object.keys(counts).map(uid => ({ id: uid, displayName: 'Someone', profilePhotoUrl: null, quantity: counts[uid] }));
    })(),
    loading: false,
  }));

  const userOwnCount = state.claimedByUsers.reduce((sum: number, u: any) => (u.id === currentUserId ? sum + (u.quantity || 0) : sum), 0);
  const [inputValue, setInputValue] = useState<string>(userOwnCount ? String(userOwnCount) : '');

  const handleClaimToggle = useCallback(async (overrideQuantity?: number) => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      // determine quantity to request
      const remaining = state.quantityNeeded - state.quantityClaimed;
      const maxForUser = userOwnCount + Math.max(0, remaining);
      let desiredFromInput = 0;
      if (typeof overrideQuantity === 'number') {
        desiredFromInput = overrideQuantity;
      } else if (inputValue === '') {
        desiredFromInput = 0;
      } else {
        desiredFromInput = parseInt(inputValue, 10) || 0;
      }
      // clamp requested quantity to allowed range for this user
      const qty = Math.max(0, Math.min(maxForUser, desiredFromInput));
      const res = await fetch(`/api/gear/items/${item.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        console.error('Claim failed', json);
        setState(prev => ({ ...prev, loading: false }));
        return;
      }
      const data = await res.json();
      setState(prev => ({
        ...prev,
        quantityClaimed: data.item.quantityClaimed,
        claimedByUsers: data.claimedByUsers || prev.claimedByUsers,
        loading: false,
      }));
      // update inputValue to reflect new own count
      const newOwn = (data.claimedByUsers || []).find((u: any) => u.id === currentUserId)?.quantity || 0;
      setInputValue(newOwn > 0 ? String(newOwn) : '');
    } catch (err) {
      console.error('Claim error', err);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [item.id, inputValue, state.quantityNeeded, state.quantityClaimed, userOwnCount, currentUserId]);

  const socket = useGearList(gearListId);

  useEffect(() => {
    if (!socket) return;

    const onClaimed = (payload: any) => {
      if (payload.itemId !== item.id) return;
      setState(prev => ({
        ...prev,
        quantityClaimed: payload.quantityClaimed,
        claimedByUsers: payload.claimedByUsers || prev.claimedByUsers,
      }));
      // update inputValue for current user
      const newOwn = (payload.claimedByUsers || []).reduce((s: number, u: any) => (u.id === currentUserId ? s + (u.quantity || 0) : s), 0);
      setInputValue(newOwn > 0 ? String(newOwn) : '');
    };

    const onUnclaimed = (payload: any) => {
      if (payload.itemId !== item.id) return;
      setState(prev => ({
        ...prev,
        quantityClaimed: payload.quantityClaimed,
        claimedByUsers: payload.claimedByUsers || prev.claimedByUsers,
      }));
      const newOwn = (payload.claimedByUsers || []).reduce((s: number, u: any) => (u.id === currentUserId ? s + (u.quantity || 0) : s), 0);
      setInputValue(newOwn > 0 ? String(newOwn) : '');
    };

    socket.on('gear:claimed' as any, onClaimed);
    socket.on('gear:unclaimed' as any, onUnclaimed);

    return () => {
      socket.off('gear:claimed' as any, onClaimed);
      socket.off('gear:unclaimed' as any, onUnclaimed);
    };
  }, [socket, item.id, currentUserId]);

  const userCount = state.claimedByUsers.reduce((s: number, u: any) => s + (u.quantity || 0), 0);
  const remaining = state.quantityNeeded - state.quantityClaimed;
  const maxForUser = userOwnCount + Math.max(0, remaining);

  return (
    <div className="flex items-center justify-between rounded-md bg-surface p-3">
      <div>
        <p className="font-medium text-primary">{item.itemName}</p>
        <p className="text-xs text-secondary">{state.quantityClaimed}/{state.quantityNeeded} claimed</p>
        {state.claimedByUsers.length > 0 && (
          <p className="text-xs text-muted">
            Claimed by: {state.claimedByUsers.map((u: any) => `${u.displayName}${u.quantity > 1 ? ` (${u.quantity})` : ''}`).join(', ')}
          </p>
        )}
      </div>
      <div>
        {state.quantityNeeded === 1 ? (
          // single-quantity item
          userOwnCount > 0 ? (
            <button onClick={() => { handleClaimToggle(0); }} disabled={state.loading} className="rounded px-3 py-1 btn-destructive">
              {state.loading ? '...' : 'Unclaim'}
            </button>
          ) : (
            remaining <= 0 ? (
              <div className="text-sm text-muted">Fully claimed</div>
            ) : (
              <button onClick={() => { handleClaimToggle(1); }} disabled={state.loading} className="rounded px-3 py-1 btn-primary">
                {state.loading ? '...' : 'Claim'}
              </button>
            )
          )
        ) : (
          // multi-quantity item
          (remaining <= 0 && userOwnCount === 0) ? (
            <div className="text-sm text-muted">Fully claimed</div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={maxForUser}
                value={inputValue}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') {
                    setInputValue('');
                    return;
                  }
                  const n = parseInt(v, 10);
                  if (Number.isNaN(n)) {
                    setInputValue('');
                    return;
                  }
                  const clamped = Math.max(0, Math.min(maxForUser, n));
                  setInputValue(String(clamped));
                }}
                className="w-20 rounded border px-2 py-1"
              />
              {(() => {
                const desiredNumRaw = inputValue === '' ? 0 : (parseInt(inputValue, 10) || 0);
                const desiredNum = Math.max(0, Math.min(maxForUser, desiredNumRaw));
                let label = 'Claim';
                let buttonClass = 'btn-primary';
                if (state.loading) label = '...';
                else if (userOwnCount > 0) {
                  label = desiredNum === 0 ? 'Unclaim' : (desiredNum !== userOwnCount ? 'Change' : 'Unclaim');
                    buttonClass = desiredNum === 0 ? 'btn-destructive' : (desiredNum !== userOwnCount ? 'btn-primary' : 'btn-destructive');
                } else {
                  label = desiredNum > 0 ? 'Claim' : 'Claim';
                }
                const disabled = state.loading || (!userOwnCount && desiredNum === 0);
                return (
                  <button onClick={() => handleClaimToggle(desiredNum)} disabled={disabled} className={`rounded px-3 py-1 ${buttonClass}`}>
                    {label}
                  </button>
                );
              })()}
            </div>
          )
        )}
      </div>
    </div>
  );
}
