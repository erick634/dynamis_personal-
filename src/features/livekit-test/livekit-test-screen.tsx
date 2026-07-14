import { useCallback, useEffect, useRef, useState } from 'react';

import { Room, RoomEvent } from 'livekit-client';
import type { RemoteParticipant } from 'livekit-client';

import { API_BASE_URL, DYNAMIS_JWT } from '@/lib/config';
import { useCurrentUser } from '@/stores/current-user';

/**
 * TEMPORARY proof-of-concept screen for the planned LiveKit voice migration.
 *
 * Not part of the product surface: it is unlinked from the nav, dev-only, and
 * its copy is intentionally hardcoded English rather than routed through i18n.
 * Delete this folder (and its `/livekit-test` route) once the real LiveKit
 * pipeline lands.
 */

const ROOM_NAME = 'dynamis-test';
const FALLBACK_USER_ID = 'test-user';

type ConnectionState =
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'connected' }
  | { status: 'error'; message: string };

type TokenResponse = {
  token: string;
  url: string;
};

/** Mirrors `buildAuthHeaders()` in the other *-api.ts services. */
function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (DYNAMIS_JWT.trim()) {
    headers.Authorization = `Bearer ${DYNAMIS_JWT}`;
  }
  return headers;
}

async function fetchLiveKitTestToken(userId: string, roomName: string): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE_URL}/livekit/token`, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({ userId, roomName }),
  });

  if (!response.ok) {
    throw new Error(`Token request failed: ${String(response.status)} ${response.statusText}`);
  }

  const data = (await response.json()) as Partial<TokenResponse>;
  if (!data.token || !data.url) {
    throw new Error('Token response is missing `token` or `url`.');
  }

  return { token: data.token, url: data.url };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function LiveKitTestScreen() {
  const user = useCurrentUser((state) => state.user);
  const userId = user?.userId ?? FALLBACK_USER_ID;

  const roomRef = useRef<Room | null>(null);
  const [connection, setConnection] = useState<ConnectionState>({ status: 'idle' });
  const [serverUrl, setServerUrl] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);

  const syncParticipants = useCallback((room: Room) => {
    setParticipants(
      Array.from(room.remoteParticipants.values()).map(
        (participant: RemoteParticipant) => participant.identity,
      ),
    );
  }, []);

  const disconnect = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      await room.disconnect();
    }
    setConnection({ status: 'idle' });
    setServerUrl('');
    setParticipants([]);
  }, []);

  // Leave the room behind if the page is navigated away from mid-session.
  useEffect(() => {
    return () => {
      void roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, []);

  const connect = useCallback(async () => {
    setConnection({ status: 'connecting' });

    try {
      const { token, url } = await fetchLiveKitTestToken(userId, ROOM_NAME);
      const room = new Room();

      room.on(RoomEvent.ParticipantConnected, () => {
        syncParticipants(room);
      });
      room.on(RoomEvent.ParticipantDisconnected, () => {
        syncParticipants(room);
      });
      room.on(RoomEvent.Disconnected, () => {
        roomRef.current = null;
        setConnection({ status: 'idle' });
        setServerUrl('');
        setParticipants([]);
      });

      await room.connect(url, token);

      roomRef.current = room;
      setServerUrl(url);
      syncParticipants(room);
      setConnection({ status: 'connected' });
    } catch (error) {
      roomRef.current = null;
      setConnection({ status: 'error', message: describeError(error) });
    }
  }, [syncParticipants, userId]);

  const room = roomRef.current;
  const isBusy = connection.status === 'connecting';

  return (
    <div className="min-h-dvh bg-bg px-6 py-10 font-body text-ink">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <h1 className="font-display text-2xl font-semibold md:text-3xl">
            LiveKit connection test
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            Temporary proof of concept. Connects to room <code>{ROOM_NAME}</code> as{' '}
            <code>{userId}</code>
            {user ? '' : ' (no profile found, using fallback identity)'}.
          </p>
        </header>

        <section className="rounded-[20px] border border-line-soft bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void connect()}
              disabled={isBusy || connection.status === 'connected'}
              className="rounded-full bg-blue px-5 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            >
              {isBusy ? 'Connecting…' : 'Connect to LiveKit'}
            </button>

            {connection.status === 'connected' ? (
              <button
                type="button"
                onClick={() => void disconnect()}
                className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink-2"
              >
                Disconnect
              </button>
            ) : null}
          </div>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex gap-2">
              <dt className="w-40 shrink-0 text-ink-3">State</dt>
              <dd className="font-semibold">{connection.status}</dd>
            </div>

            {connection.status === 'error' ? (
              <div className="flex gap-2">
                <dt className="w-40 shrink-0 text-ink-3">Error</dt>
                <dd className="break-words text-red">{connection.message}</dd>
              </div>
            ) : null}

            {connection.status === 'connected' && room ? (
              <>
                <div className="flex gap-2">
                  <dt className="w-40 shrink-0 text-ink-3">Room</dt>
                  <dd className="font-semibold">{room.name || ROOM_NAME}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-40 shrink-0 text-ink-3">Local identity</dt>
                  <dd>{room.localParticipant.identity}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-40 shrink-0 text-ink-3">Server URL</dt>
                  <dd className="break-all text-ink-2">{serverUrl}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-40 shrink-0 text-ink-3">Participants</dt>
                  <dd>
                    {participants.length + 1} total
                    {participants.length > 0
                      ? ` — remote: ${participants.join(', ')}`
                      : ' (only you)'}
                  </dd>
                </div>
              </>
            ) : null}
          </dl>
        </section>
      </div>
    </div>
  );
}
