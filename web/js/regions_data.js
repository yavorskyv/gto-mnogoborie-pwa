/**
 * GTO Regions Database & Statistics Engine
 * 85 Subjects of the Russian Federation with Normalization, Heatmap & Metrics
 */

export const GTO_REGIONS = [
  { id: 1, code: "AD", iso: "RU-AD", name: "Республика Адыгея", shortName: "Адыгея", capital: "Майкоп", district: "ЮФО", slug: "adygeya", aliases: ["адыге", "майкоп"] },
  { id: 2, code: "BA", iso: "RU-BA", name: "Республика Башкортостан", shortName: "Башкортостан", capital: "Уфа", district: "ПФО", slug: "bashkortostan", aliases: ["башкортостан", "башкир", "уфа", "стерлитамак", "салават", "нефтекамск", "октябрьский"] },
  { id: 3, code: "BU", iso: "RU-BU", name: "Республика Бурятия", shortName: "Бурятия", capital: "Улан-Удэ", district: "ДФО", slug: "buryatiya", aliases: ["бурят", "улан-удэ", "улан удэ", "северобайкальск", "кяхта"] },
  { id: 4, code: "AL", iso: "RU-AL", name: "Республика Алтай", shortName: "Республика Алтай", capital: "Горно-Алтайск", district: "СФО", slug: "respublika-altay", aliases: ["республика алтай", "горно-алтайск", "горно алтайск", "кош-агач"] },
  { id: 5, code: "DA", iso: "RU-DA", name: "Республика Дагестан", shortName: "Дагестан", capital: "Махачкала", district: "СКФО", slug: "dagestan", aliases: ["дагестан", "махачкала", "дербент", "каспийск", "хасавюрт", "буйнакск", "кизилюрт"] },
  { id: 6, code: "IN", iso: "RU-IN", name: "Республика Ингушетия", shortName: "Ингушетия", capital: "Магас", district: "СКФО", slug: "ingushetiya", aliases: ["ингушет", "магас", "назран", "карабулак", "малгобек"] },
  { id: 7, code: "KB", iso: "RU-KB", name: "Кабардино-Балкарская Республика", shortName: "Кабардино-Балкария", capital: "Нальчик", district: "СКФО", slug: "kabardino-balkariya", aliases: ["кабардин", "балкар", "кбр", "нальчик", "прохладн", "баксан"] },
  { id: 8, code: "KL", iso: "RU-KL", name: "Республика Калмыкия", shortName: "Калмыкия", capital: "Элиста", district: "ЮФО", slug: "kalmykiya", aliases: ["калмык", "элист", "лагань"] },
  { id: 9, code: "KC", iso: "RU-KC", name: "Карачаево-Черкесская Республика", shortName: "Карачаево-Черкесия", capital: "Черкесск", district: "СКФО", slug: "karachaevo-cherkesiya", aliases: ["карачаев", "черкес", "кчр", "черкесск", "усть-джегута", "карачаевск"] },
  { id: 10, code: "KR", iso: "RU-KR", name: "Республика Карелия", shortName: "Карелия", capital: "Петрозаводск", district: "СЗФО", slug: "kareliya", aliases: ["карели", "петрозаводск", "костомукш", "сортавал", "сегежа", "медвежьегорск", "кемь"] },
  { id: 11, code: "KO", iso: "RU-KO", name: "Республика Коми", shortName: "Коми", capital: "Сыктывкар", district: "СЗФО", slug: "komi", aliases: ["коми", "сыктывкар", "ухта", "воркута", "печора", "усинск", "инта"] },
  { id: 12, code: "ME", iso: "RU-ME", name: "Республика Марий Эл", shortName: "Марий Эл", capital: "Йошкар-Ола", district: "ПФО", slug: "mariy-el", aliases: ["марий", "йошкар-ола", "йошкар ола", "волжск", "козьмодемьянск"] },
  { id: 13, code: "MO", iso: "RU-MO", name: "Республика Мордовия", shortName: "Мордовия", capital: "Саранск", district: "ПФО", slug: "mordoviya", aliases: ["мордови", "саранск", "рузаевк"] },
  { id: 14, code: "SA", iso: "RU-SA", name: "Республика Саха (Якутия)", shortName: "Якутия", capital: "Якутск", district: "ДФО", slug: "yakutiya", aliases: ["республика саха", "саха якутия", "саха (якутия)", "якути", "якутск", "мирный", "нерюнгр", "алдан", "ленск", "мохсоголлох", "дохсун", "вилюй"] },
  { id: 15, code: "SE", iso: "RU-SE", name: "Республика Северная Осетия — Алания", shortName: "Северная Осетия", capital: "Владикавказ", district: "СКФО", slug: "severnaya-osetiya", aliases: ["осети", "владикавказ", "алани", "беслан", "моздок"] },
  { id: 16, code: "TA", iso: "RU-TA", name: "Республика Татарстан", shortName: "Татарстан", capital: "Казань", district: "ПФО", slug: "tatarstan", aliases: ["татарстан", "казань", "набережные челны", "челны", "нижнекамск", "альметьевск", "зеленодольск", "елабуга"] },
  { id: 17, code: "TY", iso: "RU-TY", name: "Республика Тыва", shortName: "Тыва", capital: "Кызыл", district: "СФО", slug: "tyva", aliases: ["тыва", "тува", "кызыл", "ак-довурак"] },
  { id: 18, code: "UD", iso: "RU-UD", name: "Удмуртская Республика", shortName: "Удмуртия", capital: "Ижевск", district: "ПФО", slug: "udmurtiya", aliases: ["удмурт", "ижевск", "сарапул", "глазов", "воткинск", "можга"] },
  { id: 19, code: "KK", iso: "RU-KK", name: "Республика Хакасия", shortName: "Хакасия", capital: "Абакан", district: "СФО", slug: "khakasiya", aliases: ["хакаси", "абакан", "саяногорск", "черногорск"] },
  { id: 20, code: "CE", iso: "RU-CE", name: "Чеченская Республика", shortName: "Чечня", capital: "Грозный", district: "СКФО", slug: "chechnya", aliases: ["чечен", "чечня", "грозный", "аргун", "гудермес", "шалинск", "урус-мартан"] },
  { id: 21, code: "CU", iso: "RU-CU", name: "Чувашская Республика", shortName: "Чувашия", capital: "Чебоксары", district: "ПФО", slug: "chuvashiya", aliases: ["чуваш", "чебоксар", "новочебоксарск", "канаш", "алатырь"] },
  { id: 22, code: "ALT", iso: "RU-ALT", name: "Алтайский край", shortName: "Алтайский край", capital: "Барнаул", district: "СФО", slug: "altayskiy-kray", aliases: ["алтайский край", "алтайский кр", "барнаул", "бийск", "рубцовск", "новоалтайск", "заринск"] },
  { id: 23, code: "KDA", iso: "RU-KDA", name: "Краснодарский край", shortName: "Краснодарский край", capital: "Краснодар", district: "ЮФО", slug: "krasnodarskiy-kray", aliases: ["краснодар", "сочи", "сириус", "новороссийск", "армавир", "анапа", "геленджик", "кропоткин", "славянск-на-кубани", "туапсе", "лабинск", "тихорецк", "темрюк", "ейск"] },
  { id: 24, code: "KYA", iso: "RU-KYA", name: "Красноярский край", shortName: "Красноярский край", capital: "Красноярск", district: "СФО", slug: "krasnoyarskiy-kray", aliases: ["красноярск", "норильск", "ачинск", "канск", "железногорск", "минусинск", "зеленогорск", "енисейск"] },
  { id: 25, code: "PRI", iso: "RU-PRI", name: "Приморский край", shortName: "Приморский край", capital: "Владивосток", district: "ДФО", slug: "primorskiy-kray", aliases: ["примор", "владивосток", "уссурийск", "находка", "артем", "артём", "арсеньев", "спасск-дальний", "большой камень", "партизанск", "дальнегорск"] },
  { id: 26, code: "STA", iso: "RU-STA", name: "Ставропольский край", shortName: "Ставропольский край", capital: "Ставрополь", district: "СКФО", slug: "stavropolskiy-kray", aliases: ["ставропол", "пятигорск", "кисловодск", "невинномысск", "ессентуки", "минеральные воды", "минводы", "георгиевск", "буденновск", "будённовск"] },
  { id: 27, code: "KHA", iso: "RU-KHA", name: "Хабаровский край", shortName: "Хабаровский край", capital: "Хабаровск", district: "ДФО", slug: "khabarovskiy-kray", aliases: ["хабаровск", "комсомольск-на-амуре", "комсомольск на амуре", "г амурск", "советская гавань", "николаевск-на-амуре", "бикин", "вяземский", "тополево"] },
  { id: 28, code: "AMU", iso: "RU-AMU", name: "Амурская область", shortName: "Амурская область", capital: "Благовещенск", district: "ДФО", slug: "amurskaya-oblast", aliases: ["амурск", "благовещенск", "белогорск", "свободный", "тында", "зея", "райчихинск"] },
  { id: 29, code: "ARK", iso: "RU-ARK", name: "Архангельская область", shortName: "Архангельская область", capital: "Архангельск", district: "СЗФО", slug: "arkhangelskaya-oblast", aliases: ["архангельск", "северодвинск", "котлас", "новодвинск", "коряжма"] },
  { id: 30, code: "AST", iso: "RU-AST", name: "Астраханская область", shortName: "Астраханская область", capital: "Астрахань", district: "ЮФО", slug: "astrakhanskaya-oblast", aliases: ["астрахан", "ахтубинск", "знаменск"] },
  { id: 31, code: "BEL", iso: "RU-BEL", name: "Белгородская область", shortName: "Белгородская область", capital: "Белгород", district: "ЦФО", slug: "belgorodskaya-oblast", aliases: ["белгород", "старый оскол", "губкин", "шебекино", "алексеевка", "валуйки"] },
  { id: 32, code: "BRY", iso: "RU-BRY", name: "Брянская область", shortName: "Брянская область", capital: "Брянск", district: "ЦФО", slug: "bryanskaya-oblast", aliases: ["брянск", "клинцы", "новозыбков", "дятьково", "унча"] },
  { id: 33, code: "VLA", iso: "RU-VLA", name: "Владимирская область", shortName: "Владимирская область", capital: "Владимир", district: "ЦФО", slug: "vladimirskaya-oblast", aliases: ["владимир", "ковров", "муром", "александров", "гусь-хрустальный", "кольчугино", "вязники", "юрьев-польский"] },
  { id: 34, code: "VGG", iso: "RU-VGG", name: "Волгоградская область", shortName: "Волгоградская область", capital: "Волгоград", district: "ЮФО", slug: "volgogradskaya-oblast", aliases: ["волгоград", "волжский", "камышин", "михайловка", "урюпинск", "фролово"] },
  { id: 35, code: "VLG", iso: "RU-VLG", name: "Вологодская область", shortName: "Вологодская область", capital: "Вологда", district: "СЗФО", slug: "vologodskaya-oblast", aliases: ["вологд", "череповец", "сокол", "великий устюг"] },
  { id: 36, code: "VOR", iso: "RU-VOR", name: "Воронежская область", shortName: "Воронежская область", capital: "Воронеж", district: "ЦФО", slug: "voronezhskaya-oblast", aliases: ["воронеж", "россошь", "борисоглебск", "лиски", "острогожск", "нововоронеж"] },
  { id: 37, code: "IVA", iso: "RU-IVA", name: "Ивановская область", shortName: "Ивановская область", capital: "Иваново", district: "ЦФО", slug: "ivanovskaya-oblast", aliases: ["иванов", "кинешма", "шуя", "вичуга", "тейково"] },
  { id: 38, code: "IRK", iso: "RU-IRK", name: "Иркутская область", shortName: "Иркутская область", capital: "Иркутск", district: "СФО", slug: "irkutskaya-oblast", aliases: ["иркутск", "братск", "ангарск", "усть-илимск", "усолье-сибирское", "черемхово", "тулун", "шелехов"] },
  { id: 39, code: "KGD", iso: "RU-KGD", name: "Калининградская область", shortName: "Калининградская область", capital: "Калининград", district: "СЗФО", slug: "kaliningradskaya-oblast", aliases: ["калининград", "советск", "черняховск", "балтийск", "гусев", "светлый"] },
  { id: 40, code: "KLU", iso: "RU-KLU", name: "Калужская область", shortName: "Калужская область", capital: "Калуга", district: "ЦФО", slug: "kaluzhskaya-oblast", aliases: ["калуг", "обнинск", "людиново", "малоярославец"] },
  { id: 41, code: "KAM", iso: "RU-KAM", name: "Камчатский край", shortName: "Камчатский край", capital: "Петропавловск-Камчатский", district: "ДФО", slug: "kamchatskiy-kray", aliases: ["камчат", "петропавловск-камчатский", "елизово", "вилючинск"] },
  { id: 42, code: "KEM", iso: "RU-KEM", name: "Кемеровская область", shortName: "Кемеровская область — Кузбасс", capital: "Кемерово", district: "СФО", slug: "kemerovskaya-oblast", aliases: ["кемеров", "кузбасс", "новокузнецк", "прокопьевск", "междуреченск", "ленинск-кузнецкий", "киселевск", "белово", "анжеро-судженск"] },
  { id: 43, code: "KIR", iso: "RU-KIR", name: "Кировская область", shortName: "Кировская область", capital: "Киров", district: "ПФО", slug: "kirovskaya-oblast", aliases: ["кировск", "кирово-чепецк", "слободской", "вятские поляны", "котельнич", "кулыги"] },
  { id: 44, code: "KOS", iso: "RU-KOS", name: "Костромская область", shortName: "Костромская область", capital: "Кострома", district: "ЦФО", slug: "kostromskaya-oblast", aliases: ["костром", "буй", "шарья", "нерехта"] },
  { id: 45, code: "KGN", iso: "RU-KGN", name: "Курганская область", shortName: "Курганская область", capital: "Курган", district: "УФО", slug: "kurganskaya-oblast", aliases: ["курган", "шадринск", "шумиха"] },
  { id: 46, code: "KRS", iso: "RU-KRS", name: "Курская область", shortName: "Курская область", capital: "Курск", district: "ЦФО", slug: "kurskaya-oblast", aliases: ["курск", "железногорск", "курчатов", "льгов"] },
  { id: 47, code: "LEN", iso: "RU-LEN", name: "Ленинградская область", shortName: "Ленинградская область", capital: "Санкт-Петербург", district: "СЗФО", slug: "leningradskaya-oblast", aliases: ["ленинградск", "гатчин", "выборг", "сосновый бор", "всеволожск", "тихорецк", "волхов", "кириши", "кингисепп", "тосно"] },
  { id: 48, code: "LIP", iso: "RU-LIP", name: "Липецкая область", shortName: "Липецкая область", capital: "Липецк", district: "ЦФО", slug: "lipetskaya-oblast", aliases: ["липецк", "елец", "грязи", "данков", "усмань"] },
  { id: 49, code: "MAG", iso: "RU-MAG", name: "Магаданская область", shortName: "Магаданская область", capital: "Магадан", district: "ДФО", slug: "magadanskaya-oblast", aliases: ["магадан", "сусуман", "п ола"] },
  { id: 50, code: "MOS", iso: "RU-MOS", name: "Московская область", shortName: "Московская область", capital: "Красногорск", district: "ЦФО", slug: "moskovskaya-oblast", aliases: ["московская область", "подмосков", "ногинск", "красногорск", "химки", "подольск", "балашиха", "мытищи", "королев", "королёв", "люберцы", "электросталь", "коломна", "одинцово", "серпухов", "орехово-зуево", "домодедово", "щелково", "щёлково", "истра", "раменское", "жуковский", "пушкино", "долгопрудный", "реутов"] },
  { id: 51, code: "MUR", iso: "RU-MUR", name: "Мурманская область", shortName: "Мурманская область", capital: "Мурманск", district: "СЗФО", slug: "murmanskaya-oblast", aliases: ["мурманск", "апатиты", "североморск", "мончегорск", "кандалакша", "кировск", "оленегорск", "полярный"] },
  { id: 52, code: "NIZ", iso: "RU-NIZ", name: "Нижегородская область", shortName: "Нижегородская область", capital: "Нижний Новгород", district: "ПФО", slug: "nizhegorodskaya-oblast", aliases: ["нижегород", "нижний новгород", "дзержинск", "арзамас", "саров", "г бор", "кстово", "павлово", "выкса", "балахна", "чкаловск"] },
  { id: 53, code: "NGR", iso: "RU-NGR", name: "Новгородская область", shortName: "Новгородская область", capital: "Великий Новгород", district: "СЗФО", slug: "novgorodskaya-oblast", aliases: ["новгородск", "великий новгород", "боровичи", "старая русса", "валдай"] },
  { id: 54, code: "NVS", iso: "RU-NVS", name: "Новосибирская область", shortName: "Новосибирская область", capital: "Новосибирск", district: "СФО", slug: "novosibirskaya-oblast", aliases: ["новосибирск", "бердск", "искитим", "куйбышев", "барабинск", "послок садовый", "садовый"] },
  { id: 55, code: "OMS", iso: "RU-OMS", name: "Омская область", shortName: "Омская область", capital: "Омск", district: "СФО", slug: "omskaya-oblast", aliases: ["омск", "тара", "исилькуль", "калачинск"] },
  { id: 56, code: "ORE", iso: "RU-ORE", name: "Оренбургская область", shortName: "Оренбургская область", capital: "Оренбург", district: "ПФО", slug: "orenburgskaya-oblast", aliases: ["оренбург", "орск", "новотроицк", "бузулук", "гай", "медногорск"] },
  { id: 57, code: "ORL", iso: "RU-ORL", name: "Орловская область", shortName: "Орловская область", capital: "Орёл", district: "ЦФО", slug: "orlovskaya-oblast", aliases: ["орловск", "орёл", "орел", "ливны", "мценск"] },
  { id: 58, code: "PNZ", iso: "RU-PNZ", name: "Пензенская область", shortName: "Пензенская область", capital: "Пенза", district: "ПФО", slug: "penzenskaya-oblast", aliases: ["пензен", "пенза", "кузнецк", "заречный", "каменка"] },
  { id: 59, code: "PER", iso: "RU-PER", name: "Пермский край", shortName: "Пермский край", capital: "Пермь", district: "ПФО", slug: "permskiy-kray", aliases: ["перм", "березники", "соликамск", "чайковский", "кунгур", "лысьва", "краснокамск"] },
  { id: 60, code: "PSK", iso: "RU-PSK", name: "Псковская область", shortName: "Псковская область", capital: "Псков", district: "СЗФО", slug: "pskovskaya-oblast", aliases: ["псков", "великие луки", "остров"] },
  { id: 61, code: "ROS", iso: "RU-ROS", name: "Ростовская область", shortName: "Ростовская область", capital: "Ростов-на-Дону", district: "ЮФО", slug: "rostovskaya-oblast", aliases: ["ростов", "ростов-на-дону", "таганрог", "шахты", "новочеркасск", "волгодонск", "батайск", "новошахтинск", "каменск-шахтинский", "азов"] },
  { id: 62, code: "RYA", iso: "RU-RYA", name: "Рязанская область", shortName: "Рязанская область", capital: "Рязань", district: "ЦФО", slug: "ryazanskaya-oblast", aliases: ["рязан", "касимов", "скопин", "сасово"] },
  { id: 63, code: "SAM", iso: "RU-SAM", name: "Самарская область", shortName: "Самарская область", capital: "Самара", district: "ПФО", slug: "samarskaya-oblast", aliases: ["самар", "тольятти", "сызрань", "новокуйбышевск", "чапаевск", "жигулевск", "жигулёвск", "отрадный"] },
  { id: 64, code: "SAR", iso: "RU-SAR", name: "Саратовская область", shortName: "Саратовская область", capital: "Саратов", district: "ПФО", slug: "saratovskaya-oblast", aliases: ["саратов", "энгельс", "балаково", "балашов", "вольск", "пугачев", "пугачёв"] },
  { id: 65, code: "SAK", iso: "RU-SAK", name: "Сахалинская область", shortName: "Сахалинская область", capital: "Южно-Сахалинск", district: "ДФО", slug: "sakhalinskaya-oblast", aliases: ["сахалин", "южно-сахалинск", "корсаков", "холмск", "оха", "поронайск", "анива", "невельск", "углегорск"] },
  { id: 66, code: "SVE", iso: "RU-SVE", name: "Свердловская область", shortName: "Свердловская область", capital: "Екатеринбург", district: "УФО", slug: "sverdlovskaya-oblast", aliases: ["свердловск", "екатеринбург", "нижний тагил", "каменск-уральский", "первоуральск", "серов", "новоуральск", "асбест", "полевской", "ревда", "косулино"] },
  { id: 67, code: "SMO", iso: "RU-SMO", name: "Смоленская область", shortName: "Смоленская область", capital: "Смоленск", district: "ЦФО", slug: "smolenskaya-oblast", aliases: ["смоленск", "вязьма", "рославль", "ярцево", "сафоново", "десногорск"] },
  { id: 68, code: "TAM", iso: "RU-TAM", name: "Тамбовская область", shortName: "Тамбовская область", capital: "Тамбов", district: "ЦФО", slug: "tambovskaya-oblast", aliases: ["тамбов", "мичуринск", "рассказово", "моршанск", "котовск"] },
  { id: 69, code: "TVE", iso: "RU-TVE", name: "Тверская область", shortName: "Тверская область", capital: "Тверь", district: "ЦФО", slug: "tverskaya-oblast", aliases: ["твер", "ржев", "вышний волочек", "вышний волочёк", "кимры", "торжок", "конаково", "удомля", "кесова гора"] },
  { id: 70, code: "TOM", iso: "RU-TOM", name: "Томская область", shortName: "Томская область", capital: "Томск", district: "СФО", slug: "tomskaya-oblast", aliases: ["томск", "северск", "стрежевой", "колпашево"] },
  { id: 71, code: "TUL", iso: "RU-TUL", name: "Тульская область", shortName: "Тульская область", capital: "Тула", district: "ЦФО", slug: "tulskaya-oblast", aliases: ["тульск", "тула", "новомосковск", "донской", "алексин", "щекино", "щёкино", "узловая", "ефремов", "богородицк"] },
  { id: 72, code: "TYU", iso: "RU-TYU", name: "Тюменская область", shortName: "Тюменская область", capital: "Тюмень", district: "УФО", slug: "tyumenskaya-oblast", aliases: ["тюмен", "тобольск", "ишим", "ялуторовск", "заводоуковск"] },
  { id: 73, code: "ULY", iso: "RU-ULY", name: "Ульяновская область", shortName: "Ульяновская область", capital: "Ульяновск", district: "ПФО", slug: "ulyanovskaya-oblast", aliases: ["ульяновск", "димитровград", "инза", "барыш"] },
  { id: 74, code: "CHE", iso: "RU-CHE", name: "Челябинская область", shortName: "Челябинская область", capital: "Челябинск", district: "УФО", slug: "chelyabinskaya-oblast", aliases: ["челябинск", "магнитогорск", "златоуст", "миасс", "копейск", "озерск", "озёрск", "троицк", "снежинск", "сатк"] },
  { id: 75, code: "ZAB", iso: "RU-ZAB", name: "Забайкальский край", shortName: "Забайкальский край", capital: "Чита", district: "ДФО", slug: "zabaykalskiy-kray", aliases: ["забайкал", "чита", "краснокаменск", "борзя", "петровск-забайкальский"] },
  { id: 76, code: "YAR", iso: "RU-YAR", name: "Ярославская область", shortName: "Ярославская область", capital: "Ярославль", district: "ЦФО", slug: "yaroslavskaya-oblast", aliases: ["ярославл", "рыбинск", "переславль-залесский", "тутаев", "углич", "ростов великий"] },
  { id: 77, code: "MOW", iso: "RU-MOW", name: "г. Москва", shortName: "Москва", capital: "Москва", district: "ЦФО", slug: "moskva", aliases: ["москва", "moscow", "зеленоград", "лужники"] },
  { id: 78, code: "SPE", iso: "RU-SPE", name: "г. Санкт-Петербург", shortName: "Санкт-Петербург", capital: "Санкт-Петербург", district: "СЗФО", slug: "sankt-peterburg", aliases: ["санкт-петербург", "санкт петербург", "петербург", "питер", "спб", "колпино", "пушкин", "петергоф", "кронштадт"] },
  { id: 79, code: "YEV", iso: "RU-YEV", name: "Еврейская автономная область", shortName: "Еврейская АО", capital: "Биробиджан", district: "ДФО", slug: "evreyskaya-avtonomnaya-oblast", aliases: ["еврейск", "биробиджан", "еао", "облучье"] },
  { id: 82, code: "CR", iso: "RU-CR", name: "Республика Крым", shortName: "Крым", capital: "Симферополь", district: "ЮФО", slug: "krym", aliases: ["крым", "симферополь", "керчь", "евпатория", "ялта", "феодосия", "джанкой", "алушта", "бахчисарай"] },
  { id: 83, code: "NEN", iso: "RU-NEN", name: "Ненецкий автономный округ", shortName: "Ненецкий АО", capital: "Нарьян-Мар", district: "СЗФО", slug: "nenetskiy-ao", aliases: ["ненецк", "нарьян-мар", "нарьян мар", "нао", "искателей"] },
  { id: 86, code: "KHM", iso: "RU-KHM", name: "Ханты-Мансийский автономный округ — Югра", shortName: "ХМАО — Югра", capital: "Ханты-Мансийск", district: "УФО", slug: "khmao-yugra", aliases: ["хмао", "югра", "сургут", "нижневартовск", "нефтеюганск", "ханты-мансийск", "когалым", "нягань", "мегион", "лангепас"] },
  { id: 87, code: "CHU", iso: "RU-CHU", name: "Чукотский автономный округ", shortName: "Чукотский АО", capital: "Анадырь", district: "ДФО", slug: "chukotskiy-ao", aliases: ["чукот", "анадырь", "певек", "билибино"] },
  { id: 89, code: "YAN", iso: "RU-YAN", name: "Ямало-Ненецкий автономный округ", shortName: "ЯНАО", capital: "Салехард", district: "УФО", slug: "yanao", aliases: ["янао", "новый уренгой", "ноябрьск", "салехард", "надым", "муравленко", "губкинский", "лабытнанги"] },
  { id: 92, code: "SEV", iso: "RU-SEV", name: "г. Севастополь", shortName: "Севастополь", capital: "Севастополь", district: "ЮФО", slug: "sevastopol", aliases: ["севастопол", "балаклава", "инкерман"] }
];

const regionByIdMap = new Map();
const regionByCodeMap = new Map();
const regionBySlugMap = new Map();

GTO_REGIONS.forEach(r => {
  regionByIdMap.set(r.id, r);
  regionByCodeMap.set(r.code, r);
  regionByCodeMap.set(r.iso, r);
  regionBySlugMap.set(r.slug, r);
});

export function normalizeRegionName(rawStr) {
  if (rawStr === null || rawStr === undefined || rawStr === "") return null;
  if (typeof rawStr === "number" && regionByIdMap.has(rawStr)) return rawStr;
  const num = Number(rawStr);
  if (!isNaN(num) && num > 0 && num <= 99 && regionByIdMap.has(num)) return num;

  const s = String(rawStr).toLowerCase().replace(/[^а-яa-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return null;

  // 1. Сахалинская область (65) - STRICT priority over Саха
  if (s.includes("сахалин") || s.includes("южно-сахалинск") || s.includes("анива") || 
      s.includes("корсаков") || s.includes("холмск") || s.includes("оха") || 
      s.includes("поронайск") || s.includes("невельск") || s.includes("углегорск")) {
    return 65;
  }

  // 2. Республика Саха (Якутия) (14) - NEVER match "сахалин"
  if (s.includes("якути") || s.includes("якутск") || s.includes("республика саха") || 
      s.includes("мирный") || s.includes("нерюнгр") || s.includes("алдан") || 
      s.includes("ленск") || s.includes("мохсоголлох") || s.includes("дохсун") || 
      s.includes("вилюй") || s.includes("саха (якутия)") || s.includes("саха якутия") || 
      /(?:^|\s)саха(?:\s|$)/.test(s)) {
    return 14;
  }

  // 3. Хабаровский край (27)
  if (s.includes("хабаровск") || s.includes("комсомольск-на-амуре") || s.includes("комсомольск на амуре") || 
      s.includes("советская гавань") || s.includes("николаевск-на-амуре") || s.includes("бикин") || s.includes("вяземский")) {
    return 27;
  }

  // 4. Приморский край (25)
  if (s.includes("примор") || s.includes("владивосток") || s.includes("уссурийск") || 
      s.includes("находка") || s.includes("артём") || s.includes("артем") || 
      s.includes("арсеньев") || s.includes("спасск-дальний") || s.includes("большой камень")) {
    return 25;
  }

  // 5. Московская область (50)
  if (s.includes("московская область") || s.includes("подмосков") || s.includes("ногинск") || 
      s.includes("красногорск") || s.includes("химки") || s.includes("подольск") || 
      s.includes("балашиха") || s.includes("истра") || s.includes("королев") || s.includes("королёв") || 
      s.includes("раменское") || s.includes("щелково") || s.includes("щёлково") || s.includes("мытищи")) {
    return 50;
  }

  // 6. Ленинградская область (47)
  if (s.includes("ленинградская область") || s.includes("гатчин") || s.includes("выборг")) {
    return 47;
  }

  // 7. Москва (77)
  if (s.includes("москва") || s.includes("мск") || s.includes("moscow") || s.includes("зеленоград") || s.includes("лужники") || s.includes("поклонной горе")) {
    return 77;
  }

  // 8. Санкт-Петербург (78)
  if (s.includes("петербург") || s.includes("спб") || s.includes("питер") || s.includes("санкт петербург")) {
    return 78;
  }

  // 9. Тюменская область (72)
  if (s.includes("тюмен") || s.includes("тобольск") || s.includes("ишим")) {
    return 72;
  }

  // 10. Ульяновская область (73)
  if (s.includes("ульяновск") || s.includes("димитровград")) {
    return 73;
  }

  for (const reg of GTO_REGIONS) {
    for (const alias of reg.aliases) {
      if (alias.length <= 4) {
        const re = new RegExp("(?:^|[\\s.,!?()«»\"-])" + alias + "(?:$|[\\s.,!?()«»\"-])", "i");
        if (re.test(s)) return reg.id;
      } else if (s.includes(alias)) {
        return reg.id;
      }
    }
  }

  return null;
}

export function getRegionById(idOrSlug) {
  if (idOrSlug === undefined || idOrSlug === null) return null;
  const num = Number(idOrSlug);
  if (!isNaN(num) && regionByIdMap.has(num)) {
    return regionByIdMap.get(num);
  }
  const str = String(idOrSlug).toUpperCase();
  if (regionByCodeMap.has(str)) {
    return regionByCodeMap.get(str);
  }
  const low = String(idOrSlug).toLowerCase();
  if (regionBySlugMap.has(low)) {
    return regionBySlugMap.get(low);
  }
  return null;
}

export function buildRegionStats(athletes = [], calendarEvents = [], records = [], federations = []) {
  const stats = {};
  GTO_REGIONS.forEach(r => {
    stats[r.id] = {
      region: r,
      athletes_count: 0,
      tournaments_count: 0,
      records_count: 0,
      podiums_count: 0,
      wins_count: 0,
      athletes: [],
      topAthletes: [],
      tournaments: [],
      tournamentIds: new Set(),
      records: [],
      federation: null
    };
  });

  if (Array.isArray(federations)) {
    federations.forEach(fed => {
      const regId = normalizeRegionName(`${fed.name} ${fed.region} ${fed.address} ${fed.code || ""}`);
      if (regId && stats[regId]) {
        stats[regId].federation = fed;
      }
    });
  }

  if (Array.isArray(athletes)) {
    athletes.forEach(a => {
      const regId = normalizeRegionName(a.region);
      if (regId && stats[regId]) {
        const item = stats[regId];
        item.athletes_count++;
        item.podiums_count += (a.podiums_count || 0);
        item.wins_count += (a.wins_count || 0);
        item.athletes.push(a);

        if (Array.isArray(a.competitions)) {
          a.competitions.forEach(c => {
            const tSlug = c.tournament_slug || c.tournament_title;
            if (tSlug && !item.tournamentIds.has(tSlug)) {
              item.tournamentIds.add(tSlug);
            }
          });
        }
      }
    });

    Object.values(stats).forEach(item => {
      item.topAthletes = item.athletes
        .slice()
        .sort((a, b) => {
          const scoreA = (a.wins_count || 0) * 10 + (a.podiums_count || 0) * 4 + (a.records_count || 0) * 3;
          const scoreB = (b.wins_count || 0) * 10 + (b.podiums_count || 0) * 4 + (b.records_count || 0) * 3;
          return scoreB - scoreA;
        })
        .slice(0, 8);
    });
  }

  if (Array.isArray(calendarEvents)) {
    calendarEvents.forEach(e => {
      const regId = e.region_id || normalizeRegionName(`${e.city || ""} ${e.location || ""} ${e.title || ""}`);
      if (regId && stats[regId]) {
        const item = stats[regId];
        const eventKey = `event-${e.id}`;
        if (!item.tournamentIds.has(eventKey)) {
          item.tournamentIds.add(eventKey);
          item.tournaments.push(e);
        }
      }
    });

    Object.values(stats).forEach(item => {
      item.tournaments_count = Math.max(item.tournaments.length, item.tournamentIds.size);
    });
  }

  if (Array.isArray(records)) {
    records.forEach(rec => {
      let regId = null;
      if (rec.holder && Array.isArray(athletes)) {
        const hLow = rec.holder.toLowerCase().trim();
        const foundAthlete = athletes.find(a => a.name && a.name.toLowerCase().includes(hLow));
        if (foundAthlete) {
          regId = normalizeRegionName(foundAthlete.region);
        }
      }
      if (!regId) {
        regId = normalizeRegionName(`${rec.city || ""} ${rec.event || ""}`);
      }

      if (regId && stats[regId]) {
        stats[regId].records_count++;
        stats[regId].records.push(rec);
      }
    });
  }

  const summary = {
    totalAthletes: athletes.length,
    totalTournaments: calendarEvents.length,
    totalRecords: records.length,
    totalRegions: GTO_REGIONS.length,
    activeRegions: Object.values(stats).filter(s => s.athletes_count > 0 || s.tournaments_count > 0).length
  };

  return { stats, summary };
}
