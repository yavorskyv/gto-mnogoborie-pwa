/**
 * Official Tournament Media Registry & Synchronizer
 * Connects Calendar Tournaments with Verified Rutube/VK Broadcasts and VK Photo Albums.
 */
import { GTO_VK_ALBUMS } from './vk_albums_data.js?v=2';
import { GTO_VIDEOS } from './gto_data.js?v=84';
import { VERIFIED_VIDEO_EVENT_LINKS } from './verified_media_links.js?v=2';

// Specific tournament media mapping
export const TOURNAMENT_MEDIA_MAP = {
  // 1. Финал 4 сезона «Народных Игр ГТО» & I Чемпионат России (Сириус, 3-7 апреля 2026)
  99: {
    videos: [
      {
        title: "Отчётный ролик • Финал 4 сезона и Чемпионат России",
        embedUrl: "https://rutube.ru/play/embed/909056aa1ac71b1ba47e4f6955400ec6/",
        badge: "ГРАНД-ФИНАЛ",
        duration: "04:02",
        platform: "rutube"
      },
      {
        title: "Прямой эфир: Герой ГТО I Степени, Титаны, награждение",
        embedUrl: "https://rutube.ru/play/embed/6ddbce7e8f58c912a7396abda93c66c9/",
        badge: "ПРЯМОЙ ЭФИР",
        duration: "2ч 08м",
        platform: "rutube"
      },
      {
        title: "День 2 • Комплекс «Выносливость»",
        embedUrl: "https://rutube.ru/play/embed/1c419187972d7464755a1dfe67078707/",
        badge: "СИРИУС",
        duration: "2ч 29м",
        platform: "rutube"
      },
      {
        title: "День 1 • Комплексы «Сила» и «Гимнастика»",
        embedUrl: "https://rutube.ru/play/embed/7847ed114c99275577d5949e1fe9c269/",
        badge: "СИРИУС",
        duration: "1ч 58м",
        platform: "rutube"
      },
      {
        title: "День 3 • Любители и Профессионалы",
        embedUrl: "https://rutube.ru/play/embed/36dfe4492ecd8c722e2a2613787be399/",
        badge: "СИРИУС",
        duration: "1ч 22м",
        platform: "rutube"
      },
      {
        title: "День 2 • Без границ и Специальная Олимпиада",
        embedUrl: "https://rutube.ru/play/embed/efabed51102e6027a5b2886449ea7df1/",
        badge: "СИРИУС",
        duration: "31:25",
        platform: "rutube"
      },
      {
        title: "Многоборье ГТО на фестивале ВОИ в Сириусе • Категории «Без границ» и ПОДА",
        embedUrl: "https://rutube.ru/play/embed/a1fee8305350d18a403c2012faf2d090/",
        badge: "АДАПТИВ",
        duration: "02:18",
        platform: "rutube"
      }
    ],
    albumIds: ["313399796", "313397364", "313393134", "311538069"]
  },

  // 2. Народные Игры ГТО «Герой ГТО» в Лужниках (4 июля 2026, День Московского спорта)
  104: {
    videos: [
      {
        title: "Лучшие моменты «Герой ГТО» 2026 в Лужниках (4012 участников)",
        embedUrl: "https://rutube.ru/play/embed/ca9ec7edd411edf1078211cc6d6340f7/",
        badge: "ЛУЖНИКИ 2026",
        duration: "01:16",
        platform: "rutube"
      },
      {
        title: "Официальный промо-ролик «Герой ГТО» в Лужниках",
        embedUrl: "https://rutube.ru/play/embed/f55c1d6d2c30e3b0610273ed1972a960/",
        badge: "ПРОМО",
        duration: "02:06",
        platform: "rutube"
      }
    ],
    albumIds: ["313997875", "313952850"] // 1637 фото суммарно
  },

  // 3. День физкультурника (8 августа 2026, Лужники)
  107: {
    videos: [],
    albumIds: ["314218650"] // 407 фото
  },

  // 3b. V Открытый Кубок Дальнего Востока «Игры ГТО» 2026 (31 августа - 7 сентября 2026, Владивосток, о. Русский, ВЭФ)
  109: {
    videos: [
      {
        title: "Интро-ролик V Открытого Кубка Дальнего Востока «Игры ГТО» 2026",
        embedUrl: "https://rutube.ru/play/embed/edda989b9e1955776caab415f5f81bf8/",
        badge: "ИНТРО ДФО 2026",
        duration: "01:38",
        platform: "rutube"
      },
      {
        title: "День 7. Отчетный ролик V открытого Кубка Дальнего Востока «Игры ГТО» 2026",
        embedUrl: "https://rutube.ru/play/embed/f1c30716320ebbab21583b9dd311cb75/",
        badge: "ДЕНЬ 7 • ФИНАЛ",
        duration: "02:34",
        platform: "rutube"
      },
      {
        title: "День 6. Отчетный ролик V открытого кубка Дальнего Востока «Игры ГТО» 2026",
        embedUrl: "https://rutube.ru/play/embed/915a1becc48828ef36bdb4213e8892a3/",
        badge: "ДЕНЬ 6",
        duration: "02:56",
        platform: "rutube"
      },
      {
        title: "День 5. Отчетный ролик V открытого кубка Дальнего Востока «Игры ГТО» 2026",
        embedUrl: "https://rutube.ru/play/embed/b858aa9e68174b1be6a1dcf646b283ab/",
        badge: "ДЕНЬ 5",
        duration: "02:46",
        platform: "rutube"
      },
      {
        title: "День 4. Отчетный ролик V открытого кубка Дальнего Востока «Игры ГТО» 2026",
        embedUrl: "https://rutube.ru/play/embed/2ac73452736717e1afc4833b313f2ef3/",
        badge: "ДЕНЬ 4",
        duration: "02:56",
        platform: "rutube"
      },
      {
        title: "День 3. Отчетный ролик V открытого кубка Дальнего Востока «Игры ГТО» 2026",
        embedUrl: "https://rutube.ru/play/embed/d7bc2ca7ecfaad10e7802bb7d0ebce11/",
        badge: "ДЕНЬ 3",
        duration: "01:49",
        platform: "rutube"
      },
      {
        title: "День 2. Отчетный ролик V открытого кубка Дальнего Востока «Игры ГТО» 2026",
        embedUrl: "https://rutube.ru/play/embed/f2d488bbf9c999460fbf09a4dd44f9cb/",
        badge: "ДЕНЬ 2 • ОТКРЫТИЕ",
        duration: "02:38",
        platform: "rutube"
      },
      {
        title: "День 1. Отчетный ролик V открытого кубка Дальнего Востока «Игры ГТО» 2026",
        embedUrl: "https://rutube.ru/play/embed/90ac8e3ed17295d6985427d8099df2f2/",
        badge: "ДЕНЬ 1",
        duration: "02:37",
        platform: "rutube"
      }
    ],
    albumIds: []
  },

  // 4. IV Всероссийский фестиваль чемпионов ГТО «Игры ГТО» 2024 в Сочи (18-22 апреля 2024)
  21: {
    videos: [
      {
        title: "IV Всероссийские Игры ГТО 2024, Сочи • День 1",
        embedUrl: "https://rutube.ru/play/embed/f8ab40ac386c7623fd4bc579557fb232/",
        badge: "СОЧИ 2024",
        duration: "День 1",
        platform: "rutube"
      },
      {
        title: "IV Всероссийские Игры ГТО 2024, Сочи • День 2",
        embedUrl: "https://rutube.ru/play/embed/50287bc2e11539e028b567d1613de033/",
        badge: "СОЧИ 2024",
        duration: "День 2",
        platform: "rutube"
      },
      {
        title: "Шоу «Иду на рекорд» • Сочи 2024",
        embedUrl: "https://rutube.ru/play/embed/02267031b589784a79aa852f814e23d3/",
        badge: "РЕКОРДЫ",
        duration: "Эфир",
        platform: "rutube"
      },
      {
        title: "Фестиваль чемпионов «Игры ГТО» в Сочи • День 3 (Финал)",
        embedUrl: "https://vk.com/video_ext.php?oid=-211529393&id=456240060&hd=2",
        badge: "ФИНАЛ",
        duration: "День 3",
        platform: "vk"
      }
    ],
    albumIds: ["304924875"] // 451 фото
  },

  // 5. III Всероссийские Игры ГТО в Самаре 2022 (15-18 декабря 2022)
  5: {
    videos: [
      {
        title: "III Всероссийские Игры ГТО 2022, Самара • Отчётный ролик за все дни",
        embedUrl: "https://rutube.ru/play/embed/a7765bf92b49fa9899b3b2bb2fa57941/",
        badge: "САМАРА 2022",
        duration: "Итоги",
        platform: "rutube"
      },
      {
        title: "III Всероссийские Игры ГТО 2022, Самара • День 1",
        embedUrl: "https://rutube.ru/play/embed/0079be6ef600729decb0c3716030e7d4/",
        badge: "САМАРА 2022",
        duration: "День 1",
        platform: "rutube"
      },
      {
        title: "III Всероссийские Игры ГТО 2022, Самара • День 2",
        embedUrl: "https://rutube.ru/play/embed/ef89f2a296f31a0deee80e5827e4d921/",
        badge: "САМАРА 2022",
        duration: "День 2",
        platform: "rutube"
      },
      {
        title: "III Всероссийские Игры ГТО 2022, Самара • День 3 (Финал)",
        embedUrl: "https://rutube.ru/play/embed/117365c81656691584e2360d0249cf25/",
        badge: "САМАРА 2022",
        duration: "Финал",
        platform: "rutube"
      }
    ],
    albumIds: ["292482469", "292481197", "292387578"]
  },

  // 6. IV Открытый Кубок Дальнего Востока «Игры ГТО» 2025 (Владивосток, ВЭФ)
  75: {
    videos: [
      {
        title: "IV Открытый Кубок Дальнего Востока «Игры ГТО» 2025 • Отчётный ролик",
        embedUrl: "https://rutube.ru/play/embed/afde534d967fdde5f420c9a3120d1be6/",
        badge: "ВЭФ 2025",
        duration: "Итоги",
        platform: "rutube"
      },
      {
        title: "Интро-ролик церемонии открытия Кубка Дальнего Востока 2025",
        embedUrl: "https://rutube.ru/play/embed/233138e7f42e45ec57f48b4d6714c734/",
        badge: "ВЭФ 2025",
        duration: "Интро",
        platform: "rutube"
      }
    ],
    albumIds: ["311318165"] // 1357 фото
  },

  // 7. 3-й открытый Кубок Дальнего Востока «Игры ГТО» 2024 (Владивосток, ВЭФ)
  36: {
    videos: [
      {
        title: "III открытый Кубок Дальнего Востока «Игры ГТО» 2024 • Отчётный ролик",
        embedUrl: "https://rutube.ru/play/embed/f6b63ef3946bac3e49ca0952fb17c7cb/",
        badge: "ВЭФ 2024",
        duration: "Итоги",
        platform: "rutube"
      },
      {
        title: "III открытый Кубок Дальнего Востока 2024 • День 1",
        embedUrl: "https://rutube.ru/play/embed/52e39ef05b985b70de7779d795080fb5/",
        badge: "ВЭФ 2024",
        duration: "День 1",
        platform: "rutube"
      },
      {
        title: "III открытый Кубок Дальнего Востока 2024 • День 2",
        embedUrl: "https://rutube.ru/play/embed/17d8f1c46c3a7d9d5fc30cf26a0b9dd1/",
        badge: "ВЭФ 2024",
        duration: "День 2",
        platform: "rutube"
      },
      {
        title: "III открытый Кубок Дальнего Востока 2024 • День 3",
        embedUrl: "https://rutube.ru/play/embed/8cee1a1363b602d1e9876ecfdb37f87c/",
        badge: "ВЭФ 2024",
        duration: "День 3",
        platform: "rutube"
      }
    ],
    albumIds: ["306589314"] // 859 фото
  },

  // 8. 2-й открытый Кубок Дальнего Востока «Игры ГТО» 2023 (Владивосток, ВЭФ)
  7: {
    videos: [
      {
        title: "II открытый Кубок Дальнего Востока «Игры ГТО» 2023 • Итоговый ролик",
        embedUrl: "https://rutube.ru/play/embed/309c49f67e167db77304c31555fb8a0f/",
        badge: "ВЭФ 2023",
        duration: "Итоги",
        platform: "rutube"
      }
    ],
    albumIds: ["299094258", "299039537", "299038830", "298976136", "298953292", "298888258", "298850978", "298806598"]
  },

  // 9. 1-й открытый Кубок Дальнего Востока «Игры ГТО 2022» (Владивосток, ВЭФ)
  4: {
    videos: [
      {
        title: "ВЭФ 2022 Кубок Дальнего Востока Игры ГТО • Итоговый ролик",
        embedUrl: "https://rutube.ru/play/embed/08277ba7843d3cbd49bda7c7f3586dae/",
        badge: "ВЭФ 2022",
        duration: "Итоги",
        platform: "rutube"
      }
    ],
    albumIds: ["289152873", "289152170", "289151664", "289043353", "289043167", "289042108", "289041800", "289040914", "289019352", "289018795", "289018894", "289017382", "289017370", "288994039", "288994015", "288973669"]
  },

  // 10. 3-й открытый Кубок Москвы «Игры ГТО» 2024 (2-4 августа 2024, Лужники)
  33: {
    videos: [
      {
        title: "3-й Открытый Кубок Москвы по многоборью ГТО",
        embedUrl: "https://vk.com/video_ext.php?oid=-211529393&id=456240063&hd=2",
        badge: "КУБОК МОСКВЫ",
        duration: "20:45",
        platform: "vk"
      }
    ],
    albumIds: ["305876766"] // 1326 фото
  },

  // 11. 2-й открытый Кубок Москвы «Игры ГТО» 2023 (18-20 августа 2023, Лужники)
  6: {
    videos: [
      {
        title: "2-й открытый Кубок Москвы «Игры ГТО» 2023, Лужники • Отчётный ролик",
        embedUrl: "https://rutube.ru/play/embed/5d4da66f00440309384e2b5a1dd28ba3/",
        badge: "МОСКВА 2023",
        duration: "Итоги",
        platform: "rutube"
      },
      {
        title: "2-й открытый Кубок Москвы «Игры ГТО» 2023, Лужники • День 1",
        embedUrl: "https://rutube.ru/play/embed/114979e273fdfc7eb6fbfa402e1c9e83/",
        badge: "ДЕНЬ 1",
        duration: "Эфир",
        platform: "rutube"
      },
      {
        title: "2-й открытый Кубок Москвы «Игры ГТО» 2023, Лужники • День 2",
        embedUrl: "https://rutube.ru/play/embed/9c1ebdb42c94ca3c0b0fb05f520973a0/",
        badge: "ДЕНЬ 2",
        duration: "Эфир",
        platform: "rutube"
      },
      {
        title: "2-й открытый Кубок Москвы «Игры ГТО» 2023, Лужники • День 3 (Финал)",
        embedUrl: "https://rutube.ru/play/embed/5a2dca58bc8d910feee3c333066a98fb/",
        badge: "ФИНАЛ",
        duration: "Эфир",
        platform: "rutube"
      }
    ],
    albumIds: ["298204890", "298188620", "298169283"]
  },

  // 12. 1-й открытый международный Кубок Москвы «Игры ГТО 2022»
  3: {
    videos: [
      {
        title: "1-й Кубок Москвы Игры ГТО 2022 • Итоговый ролик",
        embedUrl: "https://rutube.ru/play/embed/530c38ea7e2b07998fb68f930b8a344b/",
        badge: "МОСКВА 2022",
        duration: "Итоги",
        platform: "rutube"
      },
      {
        title: "1-й Кубок Москвы Игры ГТО 2022 • День 1",
        embedUrl: "https://rutube.ru/play/embed/7ea82e75e1a148a049d56ff6d9361a93/",
        badge: "ДЕНЬ 1",
        duration: "Эфир",
        platform: "rutube"
      },
      {
        title: "1-й Кубок Москвы Игры ГТО 2022 • День 2",
        embedUrl: "https://rutube.ru/play/embed/3a8c54117b3531b79f67a21ca740445d/",
        badge: "ДЕНЬ 2",
        duration: "Эфир",
        platform: "rutube"
      },
      {
        title: "1-й Кубок Москвы Игры ГТО 2022 • День 3",
        embedUrl: "https://rutube.ru/play/embed/c02f0616b2eb34d34ad539a2f64a5c9f/",
        badge: "ДЕНЬ 3",
        duration: "Эфир",
        platform: "rutube"
      }
    ],
    albumIds: ["287353695", "287352854", "287352371", "287352171", "287352076", "287351109", "287350393", "287234864", "287220310", "287217498", "287220226", "287205082", "287263227", "287263366", "287202946"]
  },

  // 13. Герой ГТО – Финал 3-го сезона «Народные Игры ГТО Спортлото» 2025
  80: {
    videos: [],
    albumIds: ["311322447"] // 1241 фото
  },

  // 14. Народные игры ГТО Спортлото 2024 (2-й сезон)
  70: {
    videos: [],
    albumIds: []
  },

  // Финал 2-го сезона Народных Игр ГТО Спортлото, Лужники, 5 июля 2025
  71: {
    videos: [],
    albumIds: ["311356105"] // 678 фото
  },

  // 15. Первые «Народные Игры ГТО» 2024
  8: {
    videos: [],
    albumIds: ["303137820"] // 507 фото
  },

  // 16. Всемирный фестиваль молодёжи 2024 (Сириус)
  15: {
    videos: [],
    albumIds: ["304541466"] // 355 фото
  },

  // Игры ГТО 2021, Белгород — семь официальных альбомов по дням соревнований
  2: {
    videos: [],
    albumIds: ["286840471", "286840276", "286840216", "286839552", "286837716", "286396060", "286395830"]
  },

  // Игры ГТО 2020, Кисловодск — архив первого всероссийского турнира
  1: {
    videos: [],
    albumIds: ["286395628", "286395373", "286395176", "286394907", "286393220"]
  },

  // «Техноспорт Первых» 2024, г. Грозный
  14: {
    videos: [
      {
        title: "Соревнования по многоборью ГТО на фестивале «Техноспорт Первых» 2024",
        embedUrl: "https://rutube.ru/play/embed/9e24685ffb1574a2cb93786cf816ff25/",
        badge: "ГРОЗНЫЙ",
        duration: "02:15",
        platform: "rutube"
      }
    ],
    albumIds: ["304540403"] // 262 фото
  },

};

/**
 * Resolves which tournament a photo album belongs to.
 */
export function getTournamentByAlbumId(albumId) {
  const strId = String(albumId);
  for (const [eventIdStr, data] of Object.entries(TOURNAMENT_MEDIA_MAP)) {
    if (data.albumIds && data.albumIds.some(id => String(id) === strId)) {
      return Number(eventIdStr);
    }
  }
  return null;
}

/**
 * Resolves which tournament a video belongs to.
 */
export function getTournamentByVideoUrl(url) {
  if (!url) return null;
  for (const [eventIdStr, data] of Object.entries(TOURNAMENT_MEDIA_MAP)) {
    if (data.videos && data.videos.some(v => v.embedUrl === url || url.includes(v.embedUrl) || v.embedUrl.includes(url))) {
      return Number(eventIdStr);
    }
  }
  const video = GTO_VIDEOS.find(v => v.embedUrl === url || url.includes(v.embedUrl) || v.embedUrl.includes(url));
  if (video && VERIFIED_VIDEO_EVENT_LINKS[video.id]) return VERIFIED_VIDEO_EVENT_LINKS[video.id];
  return null;
}

/**
 * Resolves full media package for a tournament.
 * Guarantees that:
 * 1. Upcoming tournaments (status != finished or id >= 110) never return bogus historical video broadcasts.
 * 2. Past tournaments with verified media receive accurate videos and photo albums with preview images.
 */
export function getTournamentMedia(eventId, event = {}) {
  const isUpcoming = Number(eventId) >= 110 ||
    String(event.period || "").includes("сентября") && (Number(eventId) === 112 || Number(eventId) === 113) ||
    String(event.actionText || "").toLowerCase().includes("скоро");

  // UPCOMING TOURNAMENTS: Never return past competition broadcasts!
  if (isUpcoming) {
    return {
      isUpcoming: true,
      videos: [],
      primaryVideo: null,
      albums: [],
      hasPhotos: false,
      hasVideo: false,
      totalPhotosCount: 0,
      totalPhotosText: ""
    };
  }

  const mapData = TOURNAMENT_MEDIA_MAP[eventId];

  const linked = GTO_VIDEOS.filter(video => Number(VERIFIED_VIDEO_EVENT_LINKS[video.id]) === Number(eventId));
  // The complete media catalogue is canonical. Legacy hand-written cards are only a fallback.
  const videos = linked.length ? linked : (mapData && Array.isArray(mapData.videos) ? [...mapData.videos] : []);

  // Sourced albums from GTO_VK_ALBUMS
  let albums = [];
  let totalPhotosCount = 0;

  if (mapData && Array.isArray(mapData.albumIds)) {
    mapData.albumIds.forEach(aId => {
      const album = GTO_VK_ALBUMS.find(a => String(a.id) === String(aId));
      if (album) {
        const countNum = parseInt((album.totalPhotosText || "").replace(/\D+/g, ""), 10) || (album.photos ? album.photos.length : 0);
        totalPhotosCount += countNum;

        // Take up to 6 preview photos from the album
        const previewPhotos = (album.photos || []).slice(0, 6);

        albums.push({
          id: album.id,
          title: album.title,
          totalPhotosText: album.totalPhotosText,
          count: countNum,
          cover: album.cover || (previewPhotos[0] ? previewPhotos[0].thumb : ""),
          vkUrl: album.vkUrl,
          previewPhotos
        });
      }
    });
  }

  const primaryVideo = videos.length > 0 ? videos[0] : null;

  return {
    isUpcoming: false,
    videos,
    primaryVideo,
    albums,
    hasPhotos: albums.length > 0,
    hasVideo: videos.length > 0,
    totalPhotosCount,
    totalPhotosText: totalPhotosCount > 0 ? `${totalPhotosCount.toLocaleString('ru-RU')} фото` : ""
  };
}
