import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/spmtrade",
  }),
});

const PASSWORD = "spmtrade123";

type SeedUser = {
  username: string;
  name: string;
  email: string;
  role?: string;
  bio: string;
  location: string;
  avatar: string;
  banner: string;
  badges: string[];
  stats: {
    totalSignals: number;
    tpsHit: number;
    slsHit: number;
    expired: number;
    winRate: number;
    avgPnl: number;
  };
};

const users: SeedUser[] = [
  {
    username: "admin",
    name: "Admin SPMTrade",
    email: "admin@spmtrade.local",
    role: "admin",
    bio: "Akun admin SPMTrade. Mengelola badge, kurasi trader, dan operasional platform.",
    location: "Jakarta",
    avatar: "/seed/avatar-admin.svg",
    banner: "/seed/banner-blue.svg",
    badges: ["verified", "curator"],
    stats: {
      totalSignals: 1,
      tpsHit: 0,
      slsHit: 0,
      expired: 0,
      winRate: 0,
      avgPnl: 0,
    },
  },
  {
    username: "papaeemas",
    name: "Papa Emas",
    email: "papa@spmtrade.local",
    bio: "Gold & silver saja. Sell the rip, buy the dip, sabar menunggu konfirmasi H4.",
    location: "Surabaya",
    avatar: "/seed/avatar-papaeemas.svg",
    banner: "/seed/banner-gold.svg",
    badges: ["verified", "sniper"],
    stats: {
      totalSignals: 42,
      tpsHit: 28,
      slsHit: 9,
      expired: 5,
      winRate: 0.757,
      avgPnl: 2.4,
    },
  },
  {
    username: "ibukoin",
    name: "Ibu Koin",
    email: "ibukoin@spmtrade.local",
    bio: "BTC & ETH swing. Struktur dulu, opini belakangan. Tidak pernah chase candle.",
    location: "Bandung",
    avatar: "/seed/avatar-ibukoin.svg",
    banner: "/seed/banner-blue.svg",
    badges: ["verified", "consistent"],
    stats: {
      totalSignals: 50,
      tpsHit: 31,
      slsHit: 19,
      expired: 0,
      winRate: 0.62,
      avgPnl: 1.35,
    },
  },
  {
    username: "whalex",
    name: "Whale X",
    email: "whalex@spmtrade.local",
    bio: "Mengikuti aliran likuiditas. Setup sedikit, ukuran besar, risiko terukur.",
    location: "Singapore",
    avatar: "/seed/avatar-whalex.svg",
    banner: "/seed/banner-teal.svg",
    badges: ["verified", "curator", "profit_hunter"],
    stats: {
      totalSignals: 28,
      tpsHit: 22,
      slsHit: 6,
      expired: 0,
      winRate: 0.786,
      avgPnl: 3.1,
    },
  },
  {
    username: "risetkucing",
    name: "Riset Kucing",
    email: "risetkucing@spmtrade.local",
    bio: "Menulis riset on-chain dan makro kucing. Sinyal sesekali, catatan selalu.",
    location: "Yogyakarta",
    avatar: "/seed/avatar-risetkucing.svg",
    banner: "/seed/banner-gold.svg",
    badges: ["verified"],
    stats: {
      totalSignals: 20,
      tpsHit: 8,
      slsHit: 12,
      expired: 0,
      winRate: 0.4,
      avgPnl: -0.4,
    },
  },
];

const followPairs: Array<[string, string]> = [
  ["papaeemas", "ibukoin"],
  ["papaeemas", "whalex"],
  ["ibukoin", "papaeemas"],
  ["ibukoin", "whalex"],
  ["whalex", "papaeemas"],
  ["risetkucing", "papaeemas"],
  ["risetkucing", "ibukoin"],
  ["risetkucing", "whalex"],
  ["admin", "papaeemas"],
  ["admin", "ibukoin"],
  ["admin", "whalex"],
  ["admin", "risetkucing"],
];

type SeedSignal = {
  market: "CRYPTO" | "METAL";
  symbol: string;
  direction: "LONG" | "SHORT";
  entry: number;
  takeProfit: number;
  stopLoss: number;
  timeframe: string;
  status?: "OPEN" | "TP_HIT" | "SL_HIT";
  pnlPercent?: number;
};

type SeedPost = {
  key: string;
  author: string;
  content: string;
  hoursAgo: number;
  replyToKey?: string;
  signal?: SeedSignal;
  likes?: string[];
};

const seedPosts: SeedPost[] = [
  {
    key: "gold-short",
    author: "papaeemas",
    hoursAgo: 2,
    content:
      "Gold sudah gagal reclaim 2335 dua kali. Aku ambil short di retest, target area likuiditas bawah 2312. Invalidasi kalau H4 close di atas 2343. $XAUUSD",
    signal: {
      market: "METAL",
      symbol: "XAUUSD",
      direction: "SHORT",
      entry: 2332.5,
      takeProfit: 2312,
      stopLoss: 2343,
      timeframe: "4H",
    },
    likes: ["whalex", "ibukoin", "risetkucing"],
  },
  {
    key: "btc-long",
    author: "ibukoin",
    hoursAgo: 5,
    content:
      "BTC masih bertahan di atas range 42k. Selama higher low terjaga, aku bias long menuju 45k. Sabar, jangan chase candle. $BTCUSDT",
    signal: {
      market: "CRYPTO",
      symbol: "BTCUSDT",
      direction: "LONG",
      entry: 42500,
      takeProfit: 45000,
      stopLoss: 41000,
      timeframe: "1D",
    },
    likes: ["papaeemas", "whalex"],
  },
  {
    key: "btc-tp",
    author: "whalex",
    hoursAgo: 50,
    content:
      "Result di sini — TP tercapai 2 hari sejak entry 👋 Disiplin bayar. $BTCUSDT",
    signal: {
      market: "CRYPTO",
      symbol: "BTCUSDT",
      direction: "LONG",
      entry: 42500,
      takeProfit: 45000,
      stopLoss: 41000,
      timeframe: "1D",
      status: "TP_HIT",
      pnlPercent: 5.88,
    },
    likes: ["papaeemas", "ibukoin", "risetkucing", "admin"],
  },
  {
    key: "research",
    author: "risetkucing",
    hoursAgo: 7,
    content:
      "Catatan on-chain: aliran stablecoin ke exchange mulai naik tipis, sementara open interest perp belum ikut meledak. Ini biasanya fase akumulasi, bukan euforia. Tetap kecilkan ukuran posisi sampai struktur daily memberi konfirmasi. Thread riset lengkap menyusul.",
    likes: ["papaeemas", "ibukoin"],
  },
  {
    key: "gold-scalp",
    author: "papaeemas",
    hoursAgo: 0.5,
    content:
      "Scalp emas: bid di 2318, stop ketat di 2312, target 2328. Risiko 0.5% saja. $XAUUSD",
    signal: {
      market: "METAL",
      symbol: "XAUUSD",
      direction: "LONG",
      entry: 2318,
      takeProfit: 2328,
      stopLoss: 2312,
      timeframe: "1H",
    },
    likes: ["whalex"],
  },
  {
    key: "gold-auto",
    author: "admin",
    hoursAgo: 0.25,
    content:
      "Uji auto-resolve Phase 4 — XAUUSD LONG dengan TP/SL tipis supaya cepat tersentuh feed Yahoo. $XAUUSD",
    signal: {
      market: "METAL",
      symbol: "XAUUSD",
      direction: "LONG",
      entry: 4000,
      takeProfit: 4001,
      stopLoss: 3999,
      timeframe: "1H",
    },
  },
  {
    key: "risk-note",
    author: "whalex",
    hoursAgo: 20,
    content:
      "Tiga hal yang paling sering bikin trader rugi: oversize, revenge trade, dan tidak punya invalidasi. Sisanya teknik.",
    likes: ["papaeemas", "ibukoin", "risetkucing"],
  },
  {
    key: "reply-btc-tp",
    author: "ibukoin",
    hoursAgo: 48,
    replyToKey: "btc-tp",
    content:
      "Mantap, aku telat entry tapi setuju sama alasannya. Struktur memang belum rusak waktu itu.",
  },
  {
    key: "reply-gold-short",
    author: "risetkucing",
    hoursAgo: 1,
    replyToKey: "gold-short",
    content:
      "@papaeemas setuju zona 2335 memang berat. Aku tunggu konfirmasi candle H4 dulu.",
  },
];

const seedReposts: Array<[reposter: string, postKey: string]> = [
  ["papaeemas", "btc-tp"],
  ["ibukoin", "gold-short"],
  ["whalex", "research"],
];

const seedBookmarks: Array<[owner: string, postKey: string]> = [
  ["papaeemas", "btc-long"],
  ["papaeemas", "btc-tp"],
  ["ibukoin", "gold-short"],
];

type SeedNotification = {
  recipient: string;
  actor?: string | null;
  type:
    | "like"
    | "repost"
    | "reply"
    | "follow"
    | "signal_resolved"
    | "badge_awarded"
    | "mention";
  postKey?: string;
  hoursAgo: number;
  read?: boolean;
};

const seedNotifications: SeedNotification[] = [
  {
    recipient: "papaeemas",
    actor: "whalex",
    type: "like",
    postKey: "gold-short",
    hoursAgo: 2,
  },
  {
    recipient: "papaeemas",
    actor: "ibukoin",
    type: "repost",
    postKey: "gold-short",
    hoursAgo: 3,
  },
  {
    recipient: "papaeemas",
    actor: "risetkucing",
    type: "reply",
    postKey: "reply-gold-short",
    hoursAgo: 1,
  },
  {
    recipient: "papaeemas",
    actor: "risetkucing",
    type: "follow",
    hoursAgo: 5,
  },
  {
    recipient: "papaeemas",
    actor: "ibukoin",
    type: "like",
    postKey: "gold-scalp",
    hoursAgo: 30,
    read: true,
  },
  {
    recipient: "whalex",
    actor: "papaeemas",
    type: "repost",
    postKey: "btc-tp",
    hoursAgo: 1,
  },
  {
    recipient: "whalex",
    actor: "ibukoin",
    type: "reply",
    postKey: "reply-btc-tp",
    hoursAgo: 47,
  },
  {
    recipient: "risetkucing",
    actor: "whalex",
    type: "repost",
    postKey: "research",
    hoursAgo: 6,
  },
  {
    recipient: "ibukoin",
    actor: "papaeemas",
    type: "like",
    postKey: "btc-long",
    hoursAgo: 4,
  },
  {
    recipient: "whalex",
    type: "signal_resolved",
    postKey: "btc-tp",
    hoursAgo: 48,
  },
  {
    recipient: "papaeemas",
    type: "badge_awarded",
    hoursAgo: 49,
    read: true,
  },
  {
    recipient: "papaeemas",
    actor: "risetkucing",
    type: "mention",
    postKey: "reply-gold-short",
    hoursAgo: 1,
  },
];

async function main() {
  const passwordHash = await hash(PASSWORD, 12);
  const ids = new Map<string, string>();

  for (const seed of users) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {
        username: seed.username,
        name: seed.name,
        bio: seed.bio,
        location: seed.location,
        avatarUrl: seed.avatar,
        bannerUrl: seed.banner,
        role: seed.role ?? "USER",
        passwordHash,
      },
      create: {
        username: seed.username,
        name: seed.name,
        email: seed.email,
        bio: seed.bio,
        location: seed.location,
        avatarUrl: seed.avatar,
        bannerUrl: seed.banner,
        role: seed.role ?? "USER",
        passwordHash,
      },
      select: { id: true },
    });
    ids.set(seed.username, user.id);

    await prisma.signalStat.upsert({
      where: { userId: user.id },
      update: seed.stats,
      create: { userId: user.id, ...seed.stats },
    });

    for (const type of seed.badges) {
      await prisma.userBadge.upsert({
        where: { userId_type: { userId: user.id, type } },
        update: {},
        create: { userId: user.id, type },
      });
    }
  }

  for (const [follower, following] of followPairs) {
    const followerId = ids.get(follower);
    const followingId = ids.get(following);
    if (!followerId || !followingId) continue;

    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      update: {},
      create: { followerId, followingId },
    });
  }

  // Post contoh idempoten: kunci = author + isi.
  const postIds = new Map<string, string>();
  for (const seed of seedPosts) {
    const authorId = ids.get(seed.author);
    if (!authorId) continue;

    const existing = await prisma.post.findFirst({
      where: { authorId, content: seed.content },
      select: { id: true },
    });

    let postId = existing?.id;
    if (!postId) {
      const createdAt = new Date(Date.now() - seed.hoursAgo * 3_600_000);
      const resolved = seed.signal?.status && seed.signal.status !== "OPEN";

      const created = await prisma.post.create({
        data: {
          authorId,
          content: seed.content,
          createdAt,
          replyToId: seed.replyToKey
            ? (postIds.get(seed.replyToKey) ?? null)
            : null,
          isSignal: Boolean(seed.signal),
          ...(seed.signal
            ? {
                market: seed.signal.market,
                symbol: seed.signal.symbol,
                direction: seed.signal.direction,
                entry: seed.signal.entry,
                takeProfit: seed.signal.takeProfit,
                stopLoss: seed.signal.stopLoss,
                timeframe: seed.signal.timeframe,
                status: seed.signal.status ?? "OPEN",
                pnlPercent: seed.signal.pnlPercent ?? null,
                resolvedAt: resolved
                  ? new Date(createdAt.getTime() + 2 * 3_600_000)
                  : null,
                resolvedBy: resolved ? "auto" : null,
              }
            : {}),
        },
        select: { id: true },
      });
      postId = created.id;
    }

    postIds.set(seed.key, postId);

    for (const liker of seed.likes ?? []) {
      const userId = ids.get(liker);
      if (!userId) continue;
      await prisma.like.upsert({
        where: { userId_postId: { userId, postId } },
        update: {},
        create: { userId, postId },
      });
    }
  }

  for (const [reposter, postKey] of seedReposts) {
    const userId = ids.get(reposter);
    const postId = postIds.get(postKey);
    if (!userId || !postId) continue;
    await prisma.repost.upsert({
      where: { userId_postId: { userId, postId } },
      update: {},
      create: { userId, postId },
    });
  }

  for (const [owner, postKey] of seedBookmarks) {
    const userId = ids.get(owner);
    const postId = postIds.get(postKey);
    if (!userId || !postId) continue;
    await prisma.bookmark.upsert({
      where: { userId_postId: { userId, postId } },
      update: {},
      create: { userId, postId },
    });
  }

  // View contoh 30 hari supaya dashboard punya kurva saat demo.
  const viewTargets = [
    "gold-short",
    "btc-long",
    "btc-tp",
    "research",
    "gold-scalp",
  ];
  for (const [targetIndex, key] of viewTargets.entries()) {
    const postId = postIds.get(key);
    if (!postId) continue;

    let total = 0;
    for (let daysAgo = 0; daysAgo < 30; daysAgo += 1) {
      const day = new Date(Date.now() - daysAgo * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const daily = 4 + ((daysAgo * 7 + targetIndex * 5) % 12);
      for (let index = 0; index < daily; index += 1) {
        await prisma.postView.upsert({
          where: {
            postId_viewerKey_day: {
              postId,
              viewerKey: `seed-${key}-${daysAgo}-${index}`,
              day,
            },
          },
          update: {},
          create: {
            postId,
            viewerKey: `seed-${key}-${daysAgo}-${index}`,
            day,
            count: 1,
          },
        });
        total += 1;
      }
    }

    // Seed = reset demo: samakan kolom views dengan baris PostView seed.
    await prisma.post.update({ where: { id: postId }, data: { views: total } });
  }

  for (const seed of seedNotifications) {
    const recipientId = ids.get(seed.recipient);
    const actorId = seed.actor ? (ids.get(seed.actor) ?? null) : null;
    const postId = seed.postKey ? (postIds.get(seed.postKey) ?? null) : null;
    if (!recipientId) continue;

    const existing = await prisma.notification.findFirst({
      where: { recipientId, actorId, type: seed.type, postId },
      select: { id: true },
    });
    if (existing) continue;

    const createdAt = new Date(Date.now() - seed.hoursAgo * 3_600_000);
    await prisma.notification.create({
      data: {
        recipientId,
        actorId,
        type: seed.type,
        postId,
        createdAt,
        readAt: seed.read
          ? new Date(createdAt.getTime() + 30 * 60_000)
          : null,
      },
    });
  }

  console.log(`[seed] ${users.length} user siap.`);
  console.log(`[seed] ${seedPosts.length} post contoh siap.`);
  console.log(
    `[seed] ${seedReposts.length} repost · ${seedBookmarks.length} simpanan · ${seedNotifications.length} notifikasi contoh.`,
  );
  console.log(`[seed] Login semua akun dengan password: ${PASSWORD}`);
  console.log(
    "[seed] Admin: admin@spmtrade.local · Dummy: papa@spmtrade.local, ibukoin@spmtrade.local, whalex@spmtrade.local, risetkucing@spmtrade.local",
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
