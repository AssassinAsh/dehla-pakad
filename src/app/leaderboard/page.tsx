import clientPromise from "@/lib/mongodb";
import Image from "next/image";
import Link from "next/link";

export const revalidate = 60; // ISR — rebuild every 60 seconds

interface LeaderboardEntry {
  _id: string;
  displayName: string;
  avatarUrl?: string;
  wins: number;
  losses: number;
  draws: number;
  games: number;
  kots: number;
  tensCaptured: number;
  winRate: number;
}

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const client = await clientPromise;
    const db = client.db();

    const results = await db
      .collection("game_results")
      .aggregate([
        {
          $group: {
            _id: "$userId",
            displayName: { $last: "$displayName" },
            wins: { $sum: { $cond: [{ $eq: ["$result", "win"] }, 1, 0] } },
            losses: { $sum: { $cond: [{ $eq: ["$result", "lose"] }, 1, 0] } },
            draws: { $sum: { $cond: [{ $eq: ["$result", "draw"] }, 1, 0] } },
            games: { $sum: 1 },
            kots: { $sum: { $cond: ["$isKot", 1, 0] } },
            tensCaptured: { $sum: "$tensCaptured" },
          },
        },
        {
          $addFields: {
            winRate: {
              $cond: [
                { $eq: ["$games", 0] },
                0,
                { $divide: ["$wins", "$games"] },
              ],
            },
          },
        },
        { $sort: { wins: -1, winRate: -1 } },
        { $limit: 50 },
      ])
      .toArray();

    return results as unknown as LeaderboardEntry[];
  } catch {
    return [];
  }
}

export default async function LeaderboardPage() {
  const leaders = await getLeaderboard();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#040e16] via-[#0a1420] to-[#040e16] text-white px-4 py-8 md:px-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-400">
              Leaderboard
            </h1>
            <p className="text-dp-neon/50 text-sm mt-1">
              Top 50 players · Updates every 60 seconds
            </p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 border border-dp-neon/30 text-dp-neon text-sm rounded-xl hover:bg-dp-neon/10 transition-all"
          >
            ← Back
          </Link>
        </div>

        {leaders.length === 0 ? (
          <div className="text-center py-24 text-dp-neon/40">
            <p className="text-4xl mb-4">🎴</p>
            <p className="text-lg">No games recorded yet.</p>
            <p className="text-sm mt-2">
              Sign in and play to appear on the leaderboard.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 text-dp-neon/50 uppercase text-xs tracking-widest">
                  <th className="py-3 px-4 text-left w-10">#</th>
                  <th className="py-3 px-4 text-left">Player</th>
                  <th className="py-3 px-4 text-right">Wins</th>
                  <th className="py-3 px-4 text-right">Games</th>
                  <th className="py-3 px-4 text-right">Win %</th>
                  <th className="py-3 px-4 text-right">KOTs</th>
                  <th className="py-3 px-4 text-right hidden sm:table-cell">
                    Tens
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((entry, index) => {
                  const rank = index + 1;
                  const medal =
                    rank === 1
                      ? "🥇"
                      : rank === 2
                        ? "🥈"
                        : rank === 3
                          ? "🥉"
                          : null;

                  return (
                    <tr
                      key={entry._id}
                      className={`border-t border-white/5 transition-colors hover:bg-white/5 ${
                        rank <= 3 ? "bg-yellow-500/5" : ""
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-4 text-dp-neon/40 font-mono">
                        {medal ?? rank}
                      </td>

                      {/* Player */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {entry.avatarUrl ? (
                            <Image
                              src={entry.avatarUrl}
                              alt={entry.displayName}
                              width={28}
                              height={28}
                              className="rounded-full border border-white/20"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-dp-neon/30 to-blue-400/30 flex items-center justify-center text-xs font-bold text-dp-neon border border-dp-neon/20">
                              {entry.displayName?.charAt(0)?.toUpperCase() ??
                                "?"}
                            </div>
                          )}
                          <span className="font-semibold text-white">
                            {entry.displayName ?? "Unknown"}
                          </span>
                        </div>
                      </td>

                      {/* Wins */}
                      <td className="py-3 px-4 text-right text-green-400 font-bold">
                        {entry.wins}
                      </td>

                      {/* Games */}
                      <td className="py-3 px-4 text-right text-dp-neon/60">
                        {entry.games}
                      </td>

                      {/* Win % */}
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-semibold ${
                            entry.winRate >= 0.6
                              ? "text-green-400"
                              : entry.winRate >= 0.4
                                ? "text-yellow-400"
                                : "text-red-400"
                          }`}
                        >
                          {Math.round(entry.winRate * 100)}%
                        </span>
                      </td>

                      {/* KOTs */}
                      <td className="py-3 px-4 text-right text-orange-400 font-semibold">
                        {entry.kots > 0 ? `⚡ ${entry.kots}` : "—"}
                      </td>

                      {/* Tens captured */}
                      <td className="py-3 px-4 text-right text-dp-neon/50 hidden sm:table-cell">
                        {entry.tensCaptured}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-center text-dp-neon/20 text-xs mt-8">
          Only signed-in players appear · Guest games are not tracked
        </p>
      </div>
    </div>
  );
}
