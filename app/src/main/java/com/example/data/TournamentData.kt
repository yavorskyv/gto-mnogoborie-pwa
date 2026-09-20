package com.example.data

data class TeamStanding(
    val rank: Int,
    val region: String,
    val teamName: String,
    val captain: String,
    val totalPoints: Int,
    val pointsDiff: String,
    val rankDelta: Int, // +1, 0, -2, etc.
    val logoUrl: String,
    val w1Points: Int,
    val w1Rank: String,
    val w2Points: Int,
    val w2Rank: String,
    val w3Points: Int,
    val w3Rank: String,
    val w4Points: Int,
    val w4Rank: String
)

data class ComplexItem(
    val id: Int,
    val title: String,
    val status: String, // "LIVE", "COMPLETED", "LOCKED"
    val badge: String,
    val cluster: String,
    val timeLimit: String,
    val format: String,
    val venue: String,
    val taskTitle: String,
    val taskLines: List<Pair<String, String>>,
    val note: String = "",
    val leaderResult: String = "",
    val leaderName: String = "",
    val movementStandards: List<String> = emptyList(),
    val isExpandable: Boolean = false
)

data class LaneHeat(
    val laneNumber: Int,
    val region: String,
    val athletes: String,
    val status: String,
    val weight: String,
    val isLeader: Boolean = false
)

data class ScheduleEntry(
    val id: Int,
    val timeRange: String,
    val title: String,
    val description: String,
    val status: String, // "Завершено", "ИДЕТ СЕЙЧАС", "ЧЕРЕЗ 35 МИН", "Вечер"
    val venue: String,
    val isLive: Boolean = false,
    val heatInfo: String = "",
    val timeCap: String = "",
    val lanes: List<LaneHeat> = emptyList(),
    val callTime: String = ""
)

data class FeedPost(
    val id: Int,
    val author: String,
    val initials: String,
    val timeAgo: String,
    val text: String,
    val isOfficial: Boolean = false,
    val likesCount: Int = 0,
    val commentsCount: Int = 0,
    val isLiked: Boolean = false
)

object TournamentDataRepository {
    const val HERO_IMAGE_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuA-zuRmBx7sg1haoaGHoh21yY3S9505yFWMWKoYZu-z9Az2py0yWWMRdftLtjmntJNWp_38CSjpIbNPGRiDVERc8zqf0JfSIvCzlWg9tfgOzqRpUjHM4AtZmNkJQAzSs8LWf0iL2kxfptGNC3SsnV7g9kGzKJ1Cn6KABgnKva5gEK8vYiyi7OcxVc0JXRy7hu721KfdrZPxzmO9GGIRedvsEqv5RBs3WKTnJ0UbVrEXHjB81ITT38pQcg"
    const val ATHLETE_PHOTO_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuBH9ALM5d94f_dVs-EWLJm-W17thDlbDpB-AGCk7_1CXINhGiKDa9QvbF3cuJmObw7L0i5JBdTC0DdG9wPASfmrAEQPiv-zcasPIPGJgq3yyzMuNtu137P8j2Tf5a4aPzCVinQr1EZwXkgLsFEpIJ74HvAwPeUAJ0RMceEOARkTKbxKZvqYSBQtabYtt8WREkkZNyzUNqvpdHbvnrkjEINOsyuxlGgzZPGjF1H8vRtMBdMa6qa3UqpOEg"

    val teams = listOf(
        TeamStanding(
            rank = 1,
            region = "Приморский край",
            teamName = "Тигры Востока",
            captain = "А. Воронин",
            totalPoints = 415,
            pointsDiff = "Лидер",
            rankDelta = 1,
            logoUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuBpm97XAf96utwIQVOCWwzIpILs2V0D7ey8eY-Ogo5nO3J_-RW5I2dN7PnAm1sjP48Hx1a2uUv6iKnV0M-L0R7m3iGWwnkE5bqulEEZcsdHfDJyrofnGsumwiUafboMmXlNUPYbWSY2Toyq6Vt3S09INPVwco1_PcuvRz7Gk39Z-ZOHoLNZ75s2zSlJQtuILcKPIembuvkynaYQF8tWPqhhfD3OjorvJzF2pWsUE9PApmMvYoaXFFM0Lg",
            w1Points = 100,
            w1Rank = "1 место",
            w2Points = 95,
            w2Rank = "2 место",
            w3Points = 110,
            w3Rank = "PR рек.",
            w4Points = 110,
            w4Rank = "1 место"
        ),
        TeamStanding(
            rank = 2,
            region = "Хабаровский край",
            teamName = "Сборная Хабаровска",
            captain = "Д. Кравцов",
            totalPoints = 382,
            pointsDiff = "-33 PTS",
            rankDelta = 0,
            logoUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuCA_2vn3qScQGSoCyYhzrjVr14IMAJI440YENKShLbjJxDkoCCU6__VKKVsXjaLZQImMaxSijSR6SnOrsabpR4KRTduqCLPp7FRyO0R6bDaHEfijKmPHz8FiMU0KFlw_MslKzeM5tUt660cArCvgrHPcWAA7YKYEr4dLDB2DtpIN7MLXRXDRpF5E0cLdAuNq9Yd4shI81ARWcHvnQT4MS8-tvAkxSZYP-GPitS9PIGPwqAAljZNBv0Aqg",
            w1Points = 95,
            w1Rank = "2 место",
            w2Points = 100,
            w2Rank = "1 место",
            w3Points = 92,
            w3Rank = "4 место",
            w4Points = 95,
            w4Rank = "2 место"
        ),
        TeamStanding(
            rank = 3,
            region = "Сахалинская обл.",
            teamName = "Островные Атлеты",
            captain = "М. Игнатьев",
            totalPoints = 364,
            pointsDiff = "-51 PTS",
            rankDelta = 2,
            logoUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuDfNJqOqP4jy69AJVDDx3pQFoGArmp1MpnCCzqLXT440Eh6aUQLSuitDLuJyBNI0ZmeVxPSoSWyk5tCO_nNyc9xDbDnQro3XjkPksEOTRIHax04gRRpXL3PDpTG05cSEdnZMPRhVhHqHVSpv5WzeWg7LTAelHZWE1r_-SoOh6t_vkCHCz-sTAZZQUy8T-OAFC6N9QRfom_temrMrQHQj0fLEvUQMO6TnKm6-ZljuZ_Y_SXxWVOjyVnpxA",
            w1Points = 88,
            w1Rank = "5 место",
            w2Points = 86,
            w2Rank = "6 место",
            w3Points = 100,
            w3Rank = "1 место",
            w4Points = 90,
            w4Rank = "4 место"
        ),
        TeamStanding(
            rank = 4,
            region = "Республика Саха (Якутия)",
            teamName = "Северный Десант",
            captain = "Е. Васильев",
            totalPoints = 351,
            pointsDiff = "-64 PTS",
            rankDelta = -2,
            logoUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuBuv8_K0RLgWmZI5ut7rf9VBggL3978Dy6fVicThoKARpxhdFaBYikfGPlQJdUNYrNlXKN_DbqHmLRcb2X-wSvMPdghtgSjD3Gb99exJrbVOw8_J59It3qh5PjqTyBysouoVI42JKV2oAvqBrW-ImXt5oa1uhKj0TUjLOJKW47ijCbtUdh_6plNRTy0IbhQuF5zXJWutavwwSgvJIrXsHbeDkewJfSRaPROD_Zy_tPceFS-yja_vOThkA",
            w1Points = 92,
            w1Rank = "3 место",
            w2Points = 89,
            w2Rank = "4 место",
            w3Points = 85,
            w3Rank = "7 место",
            w4Points = 85,
            w4Rank = "5 место"
        ),
        TeamStanding(
            rank = 5,
            region = "Камчатский край",
            teamName = "Вулканы Камчатки",
            captain = "И. Соловьев",
            totalPoints = 338,
            pointsDiff = "-77 PTS",
            rankDelta = 1,
            logoUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuAWH2pbBmQzEYqHZj-5O1PDpo31ljd9_godWc682khAnS8ZTupDhGZv6SgoF4fTjY3XraaN-EesbFmFIPHvTi4NH0XzidczdE86gsDNOwB9sm5-mPH121qOt94AQK6BrGwm_ZtqdFYODRQJoEbc6DqlFw16LbHM00b5kMgJRyGxXhCgJgY7VEfz1WaDW8bA4kmnbMdVyNksK6nZQLshJsPTihPSTGz5q0kqO3X2w4LQKLOXqepFzXBckg",
            w1Points = 82,
            w1Rank = "7 место",
            w2Points = 90,
            w2Rank = "3 место",
            w3Points = 88,
            w3Rank = "5 место",
            w4Points = 78,
            w4Rank = "8 место"
        ),
        TeamStanding(
            rank = 6,
            region = "Амурская область",
            teamName = "Амурские Богатыри",
            captain = "С. Панов",
            totalPoints = 325,
            pointsDiff = "-90 PTS",
            rankDelta = -1,
            logoUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuBjXzsKo9nHuVbPaP7-ea2P8y2ffYAKTRuvS3cebOCTohH4ojas6tG-Atf_7FmW8uTp3237cZsItuVH-Xe4VWw9TgYj1SWD4ioU1js2uaSnEVQvraou-a6JMAFDA8XYNgQM1hjd-idF-u7i0MDLJVG1vWxodW2PCrnXbc3hS_ofnKP6ko2XTapIPc4d3SM93n_srQxQciLEzODjB6tS1vSy8Sw4AdD8nkAbXyGSb22OPZwGZ1pjBQ2JBg",
            w1Points = 85,
            w1Rank = "6 место",
            w2Points = 80,
            w2Rank = "8 место",
            w3Points = 80,
            w3Rank = "9 место",
            w4Points = 80,
            w4Rank = "7 место"
        )
    )

    val complexes = listOf(
        ComplexItem(
            id = 3,
            title = "Комплекс 3: Морской десант",
            status = "LIVE",
            badge = "HEAT 4 • LIVE",
            cluster = "ВОДНЫЙ КЛАСТЕР",
            timeLimit = "10:00",
            format = "For Time (На время)",
            venue = "Бухта Новик, Пирс №2",
            taskTitle = "Задание этапа",
            taskLines = listOf(
                "300м Заплыв в открытой воде" to "Брасс/Кроль",
                "4 Подъема по канату без ног" to "Высота 4.5м",
                "50 Выпадов с мешком песка" to "30 кг"
            ),
            leaderResult = "06:14",
            leaderName = "А. Белов (Приморский край)"
        ),
        ComplexItem(
            id = 1,
            title = "Комплекс 1: Тихоокеанская тяга",
            status = "COMPLETED",
            badge = "ЗАВЕРШЕН",
            cluster = "ПОМОСТ А",
            timeLimit = "12:00",
            format = "For Time (21-15-9)",
            venue = "Арена ГТО",
            taskTitle = "21-15-9:",
            taskLines = listOf(
                "Становая тяга 100 кг" to "Гриф",
                "Выходы силой на кольцах" to "Гимнастика"
            ),
            note = "Финальный отрезок: Челночный бег 4 × 10 метров с касанием тумбы.",
            leaderResult = "07:42",
            leaderName = "Д. Ковалев (Хабаровский край)",
            movementStandards = listOf(
                "Становая тяга: Полное выпрямление в коленных и тазобедренных суставах, плечи за линией грифа.",
                "Выход силой: Фиксация в упоре на прямых руках, локти заблокированы в верхней точке."
            ),
            isExpandable = true
        ),
        ComplexItem(
            id = 2,
            title = "Комплекс 2: Штурм сопки",
            status = "COMPLETED",
            badge = "ЗАВЕРШЕН",
            cluster = "ОТКРЫТЫЙ СТАДИОН",
            timeLimit = "15:00",
            format = "AMRAP (Максимум кругов)",
            venue = "Стадион ДВФУ",
            taskTitle = "Интервальная связка:",
            taskLines = listOf(
                "400м бег с жилетом 15 кг" to "Круг",
                "30 бросков мяча 9 кг" to "Мишень 3.05м"
            ),
            note = "20 запрыгиваний на тумбу 60 см с полным контролем на вершине.",
            leaderResult = "5 раундов + 18",
            leaderName = "В. Степанов (Сахалинская обл.)",
            movementStandards = listOf(
                "Броски мяча: Таз опускается ниже колена в седе, касание мишени на высоте 3.05м.",
                "Запрыгивания: Разрешен шаг вниз, обязательна фиксация на двух стопах наверху."
            ),
            isExpandable = true
        ),
        ComplexItem(
            id = 4,
            title = "Комплекс 4: Финальное многоборье ГТО",
            status = "LOCKED",
            badge = "ЗАСЕКРЕЧЕНО",
            cluster = "ГЛАВНАЯ АРЕНА",
            timeLimit = "--:--",
            format = "Секретный финал",
            venue = "Арена ГТО",
            taskTitle = "Засекреченный протокол",
            taskLines = emptyList(),
            note = "Задание держится в тайне оргкомитетом до официального вечернего брифинга главных судей и капитанов команд."
        )
    )

    val schedule = listOf(
        ScheduleEntry(
            id = 1,
            timeRange = "09:00 — 10:30",
            title = "Мандатная комиссия и разминка команд",
            description = "Разминочная зона Арены ГТО • Брифинг судейской коллегии",
            status = "Завершено",
            venue = "Арена ГТО"
        ),
        ScheduleEntry(
            id = 2,
            timeRange = "10:30 — 12:45",
            title = "Комплекс 1: Силовая эстафета (Заходы 1–4)",
            description = "Помосты 1–4 • 16 сборных • Протокол опубликован",
            status = "Завершено",
            venue = "Арена ГТО (Помост 1-4)"
        ),
        ScheduleEntry(
            id = 3,
            timeRange = "14:00 — 16:30",
            title = "Комплекс 2: Мужчины • Спринт & Тяга",
            description = "Заход 4 из 6 на площадке • Тайм-кап: 20 мин",
            status = "ИДЕТ СЕЙЧАС",
            venue = "Арена ГТО (Помост 1-4)",
            isLive = true,
            heatInfo = "ЗАХОД 4 ИЗ 6 НА ПЛОЩАДКЕ",
            timeCap = "20 мин",
            lanes = listOf(
                LaneHeat(1, "Приморский край", "В. Ковалев • М. Тихонов", "Круг 3/4", "120 кг"),
                LaneHeat(2, "Москва (Team 1)", "А. Белов • Д. Смирнов", "Круг 3/4", "125 кг"),
                LaneHeat(3, "Красноярский край", "С. Морозов • К. Павлов", "Финишный круг", "130 кг", isLeader = true),
                LaneHeat(4, "Республика Татарстан", "Р. Газизов • И. Хакимов", "Круг 2/4", "115 кг")
            )
        ),
        ScheduleEntry(
            id = 4,
            timeRange = "17:00 — 18:30",
            title = "Комплекс 3: Женщины и Смешанные пары",
            description = "Арена ГТО • Гимнастический блок и парная синхронная становая тяга",
            status = "ЧЕРЕЗ 35 МИН",
            venue = "Арена ГТО",
            callTime = "16:45"
        ),
        ScheduleEntry(
            id = 5,
            timeRange = "19:30",
            title = "Подведение итогов дня и награждение",
            description = "Главная сцена медиацентра • Награждение лидеров Комплексов 1-3",
            status = "Вечер",
            venue = "Главная сцена"
        )
    )

    val posts = listOf(
        FeedPost(
            id = 1,
            author = "Главный судья соревнований",
            initials = "ГТО",
            timeAgo = "12 мин назад",
            text = "Внимание атлетам заходов 5 и 6! Брифинг по гимнастическому комплексу начнется через 10 минут в разминочной зоне Арены ГТО.",
            isOfficial = true,
            likesCount = 34,
            commentsCount = 4
        ),
        FeedPost(
            id = 2,
            author = "Команда Приморья",
            initials = "ПК",
            timeAgo = "28 мин назад",
            text = "Парный комплекс закрыт с рекордом 08:42! Поддержка трибун ДВФУ невероятная 🔥 Готовимся к вечернему спринту!",
            isOfficial = false,
            likesCount = 46,
            commentsCount = 8
        ),
        FeedPost(
            id = 3,
            author = "Сахалинский десант",
            initials = "СХ",
            timeAgo = "45 мин назад",
            text = "Взяли максимум на выносливости в WOD 3! Островной дух не сломить 💪 Ждем выход второй двойки на помост.",
            isOfficial = false,
            likesCount = 29,
            commentsCount = 3
        )
    )
}
