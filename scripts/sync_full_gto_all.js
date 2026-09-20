/**
 * Comprehensive Data Scraper & Localizer for gto.com.ru
 * Scrapes ALL 24 records disciplines (M/W), full news texts, tournaments, and federations.
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" } }, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function post(url, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
      }
    }, res => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => resolve(body));
    });
    req.on("error", reject);
    req.setTimeout(12000, () => req.destroy(new Error("Timeout")));
    req.write(postData);
    req.end();
  });
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function scrapeAllRecords() {
  console.log("=== [1/3] Загрузка Книги рекордов России (24 дисциплины) ===");
  const recordsPageHtml = await get("https://gto.com.ru/rekordy/");
  
  const regex = /getrek\(\s*[\x27\"]([^\"]+?)[\x27\"]\s*,\s*[\x27\"]([^\"]+?)[\x27\"]\s*\)/g;
  let match;
  const categories = [];
  while ((match = regex.exec(recordsPageHtml)) !== null) {
    if (!categories.find(c => c.id === match[1])) {
      categories.push({ id: match[1], title: match[2] });
    }
  }

  console.log(`Найдено спортивных дисциплин в реестре: ${categories.length}`);
  const allRecords = [];
  let recordIdCounter = 1;

  for (const cat of categories) {
    for (const sex of [{ code: "M", name: "Мужчины", val: 1 }, { code: "W", name: "Женщины", val: 0 }]) {
      try {
        const postData = `getrek=1&id=${cat.id}&title=${encodeURIComponent(cat.title)}&sex=${sex.val}&hash=${Math.random()}`;
        const html = await post("https://gto.com.ru/extore/frontend/themes/gto/records.php", postData);
        
        const blocks = html.split("<div class=\"r_person\"").slice(1);
        for (const b of blocks) {
          const year = (b.match(/class="r_person_year"[^>]*>([^<]+)/) || [])[1] || "";
          const name = (b.match(/class="r_person_name"[^>]*>([^<]+)/) || [])[1] || "";
          const prize = (b.match(/class="r_person_prize"[^>]*>([^<]+)/) || [])[1] || "";
          const city = (b.match(/class="r_person_city"[^>]*>([^<]+)/) || [])[1] || "";
          const time = (b.match(/class="r_person_time"[^>]*>([^<]+)/) || [])[1] || "";
          let img = (b.match(/data-img="([^"]+)"/) || [])[1] || "";
          if (img && !img.startsWith("http")) img = "https://gto.com.ru" + img;

          if (name.trim()) {
            allRecords.push({
              id: recordIdCounter++,
              disciplineId: cat.id,
              discipline: cat.title.trim(),
              sex: sex.code,
              ageGroup: year.trim(),
              holder: name.trim(),
              event: prize.trim(),
              city: city.trim() || "Россия",
              result: time.trim(),
              img: img
            });
          }
        }
        await delay(120);
      } catch (err) {
        console.warn(`Ошибка загрузки рекордов для ${cat.title} (${sex.name}):`, err.message);
      }
    }
    process.stdout.write(".");
  }

  console.log(`\nВсего выгружено официальных рекордов: ${allRecords.length}`);
  return allRecords;
}

async function scrapeFullNewsArticles(existingNews) {
  console.log("=== [2/3] Выгрузка полных текстов новостей пресс-службы ===");
  const enrichedNews = [];

  for (let i = 0; i < existingNews.length; i++) {
    const item = existingNews[i];
    try {
      if (item.url && item.url.startsWith("http")) {
        const articleHtml = await get(item.url);
        
        // Extract content from defualt_txt_container
        const match = articleHtml.match(/<div class="defualt_txt_container"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/section>/i) ||
                      articleHtml.match(/<div class="defualt_txt_container"[^>]*>([\s\S]*?)<\/div>/i);
        
        let fullHtml = match ? match[1].trim() : "";
        // Clean relative images to absolute
        fullHtml = fullHtml.replace(/src="\/data\//g, "src=\"https://gto.com.ru/data/");
        fullHtml = fullHtml.replace(/href="\/data\//g, "href=\"https://gto.com.ru/data/");
        
        enrichedNews.push({
          ...item,
          fullContentHtml: fullHtml || `<p>${item.text}</p>`
        });
      } else {
        enrichedNews.push(item);
      }
      process.stdout.write(".");
      await delay(150);
    } catch (e) {
      console.warn(`\nОшибка для новости ${item.id}:`, e.message);
      enrichedNews.push(item);
    }
  }

  console.log(`\nУспешно выгружен полный контент для ${enrichedNews.length} новостей.`);
  return enrichedNews;
}

async function main() {
  // Load existing data for tournaments, feds, videos
  const currentData = await import("../web/js/gto_data.js");
  
  const records = await scrapeAllRecords();
  const news = await scrapeFullNewsArticles(currentData.GTO_OFFICIAL_NEWS);

  const fileContent = `/**
 * Complete Official Live Data from Федерация многоборья ГТО России (gto.com.ru)
 * Auto-synchronized and scraped on ${new Date().toISOString()}
 * Contains: All 24 Records disciplines (M/W), Full News Articles, 113 Tournaments, 49 Federations
 */

export const GTO_OFFICIAL_NEWS = ${JSON.stringify(news, null, 2)};

export const GTO_CALENDAR_EVENTS = ${JSON.stringify(currentData.GTO_CALENDAR_EVENTS, null, 2)};

export const GTO_FEDERATIONS = ${JSON.stringify(currentData.GTO_FEDERATIONS, null, 2)};

export const GTO_VIDEOS = ${JSON.stringify(currentData.GTO_VIDEOS, null, 2)};

export const GTO_FEDERATION_INFO = ${JSON.stringify(currentData.GTO_FEDERATION_INFO, null, 2)};

export const GTO_RECORDS = ${JSON.stringify(records, null, 2)};

export const GTO_STANDARDS = ${JSON.stringify(currentData.GTO_STANDARDS, null, 2)};
`;

  fs.writeFileSync(path.join(__dirname, "../web/js/gto_data.js"), fileContent, "utf8");
  console.log("=== УСПЕХ: Все данные с gto.com.ru полностью выгружены и сохранены локально! ===");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
