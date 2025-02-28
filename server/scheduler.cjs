const cron = require('node-cron');
const axios = require('axios');
const cheerio = require('cheerio');

// Constants
const TELEGRAM_BOT_TOKEN = '7608356824:AAHwzOG2d9Jn-XT5v1eH5qXL6w4NyXbBBZk';
const TELEGRAM_CHANNEL_ID = '@doitforsteff';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const RSS_FEED_URL = 'https://rss.app/feeds/_Fb15tVVZjtF15HN3.xml';

const OPENAI_API_KEY = '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';
const DEEPAI_API_KEY = '8a63f25a-8d9e-45cd-a45e-5c7c75200588';
const DEEPAI_API_URL = 'https://api.deepai.org/api/text2img';

let currentArticles = [];
let currentArticleIndex = 0;

async function generateMiniPost(title) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `Create a mini post about this article (max 1200 characters). Follow these formatting rules strictly:
1. Use single emojis only, no duplicate emojis
2. Keep paragraphs short (2-3 sentences max)
3. Use at most 3 emojis in total
4. Place emoji at the start of relevant paragraph only
5. Each paragraph must be separated by a blank line
6. No extra line breaks allowed

Title: ${title}`
          }
        ],
        temperature: 1,
        max_tokens: 800
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );
    
    return response.data.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('Error generating mini post:', error);
    return '';
  }
}

async function generateImage(title) {
  try {
    const response = await axios.post(
      DEEPAI_API_URL,
      { text: title },
      {
        headers: {
          'api-key': DEEPAI_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.output_url;
  } catch (error) {
    console.error('Error generating image:', error);
    return undefined;
  }
}

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
                   // Try to generate an image if none exists
                   await generateImage(title);
      
      // Generate mini post for the article
      const miniPost = await generateMiniPost(title);
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
    
    // Generate content if not already present
    if (!article.miniPost) {
      article.miniPost = await generateMiniPost(article.title);
    }
    if (!article.image) {
      article.image = await generateImage(article.title);
    }
    
    const text = `<b>${article.title}</b>\n\n${article.miniPost || article.content}`;
    const success = await sendToTelegram(text, article.image);
    
    if (success) {
      console.log('✅ Article posted successfully');
      currentArticleIndex++;
    } else {
      console.log('❌ Failed to post article');
    }
  }
}

// Schedule posts at specific times (Bali time - UTC+8)
console.log('🚀 Starting scheduler service...');

// Post at 19:37
cron.schedule('37 19 * * *', async () => {
  console.log('⏰ Executing scheduled post at 19:37');
  await postNextArticle();
}, {
  timezone: "Asia/Makassar"
});

// Post at 19:40
cron.schedule('40 19 * * *', async () => {
  console.log('⏰ Executing scheduled post at 19:40');
  await postNextArticle();
}, {
  timezone: "Asia/Makassar"
});

// Post at 19:43
cron.schedule('43 19 * * *', async () => {
  console.log('⏰ Executing scheduled post at 19:43');
  await postNextArticle();
}, {
  timezone: "Asia/Makassar"
});

console.log('✅ Scheduler service started successfully');
