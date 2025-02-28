const cron = require('node-cron');
const axios = require('axios');
const cheerio = require('cheerio');

// Constants
const TELEGRAM_BOT_TOKEN = '7608356824:AAHwzOG2d9Jn-XT5v1eH5qXL6w4NyXbBBZk';
const TELEGRAM_CHANNEL_ID = '@doitforsteff';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const RSS_FEED_URL = 'https://rss.app/feeds/_Fb15tVVZjtF15HN3.xml';

let currentArticles = [];
let currentArticleIndex = 0;

async function fetchArticles() {
  try {
    console.log('📥 Fetching articles from RSS feed...');
    const response = await axios.get(RSS_FEED_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MyBot/1.0)',
        'Accept': 'application/xml, application/rss+xml, text/xml'
      }
    });

    const $ = cheerio.load(response.data, { xmlMode: true });
    const articles = [];

    $('item').each((_, item) => {
      const $item = $(item);
      const title = $item.find('title').first().text().trim();
      const content = $item.find('description').first().text().trim();
      const image = $item.find('media\\:content, enclosure').attr('url') ||
                   $('img', content).first().attr('src');

      if (title) {
        articles.push({ title, content, image });
      }
    });

    console.log(`✅ Fetched ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ Error fetching articles:', error);
    return [];
  }
}

async function sendToTelegram(text, imageUrl) {
  try {
    const cleanText = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n\n');
    
    if (imageUrl) {
      await axios.post(`${TELEGRAM_API_URL}/sendPhoto`, {
        chat_id: TELEGRAM_CHANNEL_ID,
        photo: imageUrl,
        caption: cleanText.substring(0, 1024),
        parse_mode: 'HTML'
      });
    } else {
      await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: TELEGRAM_CHANNEL_ID,
        text: cleanText,
        parse_mode: 'HTML'
      });
    }
    return true;
  } catch (error) {
    console.error('❌ Error sending to Telegram:', error);
    return false;
  }
}

async function postNextArticle() {
  console.log('🔄 Starting post article process...');
  
  if (currentArticles.length === 0 || currentArticleIndex >= currentArticles.length) {
    currentArticles = await fetchArticles();
    currentArticleIndex = 0;
  }

  if (currentArticles.length > currentArticleIndex) {
    const article = currentArticles[currentArticleIndex];
    console.log(`📝 Posting article ${currentArticleIndex + 1} of ${currentArticles.length}`);
    console.log(`📌 Title: ${article.title}`);
    
    const text = `<b>${article.title}</b>\n\n${article.content}`;
    const success = await sendToTelegram(text, article.image);
    
    if (success) {
      console.log('✅ Article posted successfully');
      currentArticleIndex++;
    } else {
      console.log('❌ Failed to post article');
    }
  }
}

async function refreshArticles() {
  console.log('🔄 Starting articles refresh...');
  currentArticles = await fetchArticles();
  currentArticleIndex = 0;
  console.log('✅ Articles refreshed');
}

// Schedule posts at specific times (Bali time - UTC+8)
console.log('🚀 Starting scheduler service...');

// Post at 14:10
cron.schedule('10 14 * * *', async () => {
  console.log('⏰ Executing scheduled post at 14:10');
  await postNextArticle();
}, {
  timezone: "Asia/Makassar"
});

// Post at 14:13
cron.schedule('13 14 * * *', async () => {
  console.log('⏰ Executing scheduled post at 14:13');
  await postNextArticle();
}, {
  timezone: "Asia/Makassar"
});

// Post at 14:15
cron.schedule('15 14 * * *', async () => {
  console.log('⏰ Executing scheduled post at 14:15');
  await postNextArticle();
}, {
  timezone: "Asia/Makassar"
});

console.log('✅ Scheduler service started successfully');