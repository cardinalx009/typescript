import { useMemo } from 'react';
import { User } from '../types';
import { getLeaderboard, getUserRecords } from '../storage';
import Layout from './Layout';

interface LeaderboardProps {
  user: User;
  onLogout: () => void;
}

export default function Leaderboard({ user, onLogout }: LeaderboardProps) {
  const users = useMemo(() => getLeaderboard(), [user]);
  const myRecords = getUserRecords(user.id);
  const myRank = users.findIndex((u) => u.id === user.id) + 1;
  const myAudioCount = myRecords.length;

  const getMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}.`;
  };

  const getRankBg = (rank: number, isMe: boolean) => {
    if (isMe) return 'bg-gradient-to-r from-blue-50 to-sky-50 ring-2 ring-blue-400';
    if (rank === 1) return 'bg-gradient-to-r from-yellow-50 to-amber-50';
    if (rank === 2) return 'bg-gradient-to-r from-gray-50 to-slate-100';
    if (rank === 3) return 'bg-gradient-to-r from-orange-50 to-amber-50';
    return 'bg-white hover:bg-gray-50';
  };

  const top3 = users.slice(0, 3);
  const others = users.slice(3);

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <span>🏆</span> Leaderboard — King School Learning Center
          </h2>
          <p className="text-gray-500 text-sm">
            Yozilgan so'zlar soniga ko'ra barcha o'quvchilar reytingi
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm opacity-90 mb-1">Sizning natijangiz</div>
              <div className="flex items-center gap-3">
                <div className="text-4xl font-bold">#{myRank}</div>
                <div>
                  <div className="text-lg font-semibold">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-sm opacity-90">{user.email}</div>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-center bg-white/20 backdrop-blur rounded-xl px-5 py-3">
                <div className="text-sm opacity-90">So'zlar</div>
                <div className="text-2xl font-bold">{user.totalWords}</div>
              </div>
              <div className="text-center bg-white/20 backdrop-blur rounded-xl px-5 py-3">
                <div className="text-sm opacity-90">Audiodan</div>
                <div className="text-2xl font-bold">{myAudioCount}</div>
              </div>
            </div>
          </div>
        </div>

        {top3.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 0, 2].map((i) => {
              if (!top3[i]) return null;
              const u = top3[i];
              const rank = i + 1;
              const heights = [
                'h-48',
                'h-56',
                'h-40',
              ];
              const colors = [
                'from-gray-300 to-gray-400',
                'from-yellow-400 to-amber-500',
                'from-orange-400 to-amber-600',
              ];
              return (
                <div key={u.id} className="flex flex-col items-center justify-end">
                  <div
                    className={`w-full rounded-t-2xl bg-gradient-to-t ${colors[i]} ${heights[i]} p-5 flex flex-col items-center justify-between text-white shadow-xl`}
                  >
                    <div className="text-5xl">{getMedal(rank)}</div>
                    <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur flex items-center justify-center font-bold text-2xl">
                      {u.firstName[0]}
                      {u.lastName[0]}
                    </div>
                    <div className="text-center w-full">
                      <div className="font-bold truncate">
                        {u.firstName} {u.lastName}
                      </div>
                      <div className="text-2xl font-extrabold mt-1">
                        {u.totalWords} so'z
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span>📋</span> Barcha o'quvchilar ({users.length})
            </h3>
            <a
              href="https://t.me/asadbekposts"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg font-medium transition-all"
            >
              ✈️ King School Learning Center Telegram
            </a>
          </div>

          {users.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-3">👥</div>
              <div className="text-gray-500">Hali o'quvchilar yo'q</div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {top3.map((u) => {
                const rank = users.findIndex((x) => x.id === u.id) + 1;
                const isMe = u.id === user.id;
                if (rank > 3) return null;
                return (
                  <div
                    key={u.id}
                    className={`p-4 flex items-center justify-between gap-4 transition-all ${getRankBg(rank, isMe)}`}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-10 flex-shrink-0 text-center font-bold text-lg">
                        {getMedal(rank)}
                      </div>
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow">
                        {u.firstName[0]}
                        {u.lastName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-800 truncate flex items-center gap-2">
                          {u.firstName} {u.lastName}
                          {isMe && (
                            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                              Siz
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {u.email}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-blue-700 text-lg">
                        {u.totalWords}
                      </div>
                      <div className="text-xs text-gray-500">so'z</div>
                    </div>
                  </div>
                );
              })}
              {others.map((u, idx) => {
                const rank = idx + 4;
                const isMe = u.id === user.id;
                return (
                  <div
                    key={u.id}
                    className={`p-4 flex items-center justify-between gap-4 transition-all ${getRankBg(rank, isMe)}`}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-10 flex-shrink-0 text-center font-bold text-lg text-gray-700">
                        {getMedal(rank)}
                      </div>
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center text-white font-bold flex-shrink-0 shadow">
                        {u.firstName[0]}
                        {u.lastName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-800 truncate flex items-center gap-2">
                          {u.firstName} {u.lastName}
                          {isMe && (
                            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                              Siz
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {u.email}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-blue-700 text-lg">
                        {u.totalWords}
                      </div>
                      <div className="text-xs text-gray-500">so'z</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
