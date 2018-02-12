/**
 * Flipboard
 * 通过 Flipboard 的接口批量获取应用
 */

const request = require('request-promise-native');
const cheerio = require('cheerio');
const config = require('./config');
const { writeFile } = require('../../utils');

const getCategories = async () => {
  const { categoryURL, params } = config;
  const responseJSON = await request({
    url: categoryURL,
    qs: params
  });
  const categories = JSON.parse(responseJSON).categories;
  return categories;
};

const getAppArticleList = async (section, id) => {
  const { contentListURL, params } = config;
  params.sections = section;
  params.pageKey = id;
  const res = await request({
    url: contentListURL,
    qs: params,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36'
    }
  });
  // 将非 JSON 格式的数据转换成 JSON 格式的
  const jsonData = res.split('\n').filter((e) => {
    try {
      const obj = JSON.parse(e);
      return obj.id && obj.hashCode;
    } catch (error) {
      return false;
    }
  });
  // 提取文章信息，删除没有标题的文章
  const data = jsonData.map((e, i, array) => {
    writeFile('test.json', array);
    const parseData = JSON.parse(e);
    // 根据原数据 type 提取主要数据
    let item;
    const article = {};
    article.section = parseData.sectionID;
    // mainItem 可能不存在
    if (parseData.type === 'sectionCover') {
      item = parseData.mainItem ? parseData.mainItem : {};
    } else {
      item = parseData;
    }
    article.title = item.title;
    article.id = item.id;
    article.summary = item.excerptText;
    article.time = item.dateCreated;
    article.image = item.inlineImage ? item.inlineImage.mediumURL : '';
    article.url = item.sourceURL;
    article.rssText = item.rssText;
    return article;
  }).filter(e => e.title);
  // 删除重复文章
  let flag;
  data.forEach((e) => {
    if (e.title === data[0].title) {
      flag = true;
    }
  });
  if (flag) {
    data.shift();
  }
  return data;
};

const getAppArticle = async (url, section, hasRss) => {
  // 微信公众号文章
  if (url.indexOf('weixin') > -1) {
    const responseHTML = await request(url);
    const $ = cheerio.load(responseHTML);
    const article = {};
    // 文章标题
    article.title = $('#img-content .rich_media_title').text();
    // 文章发布时间
    article.time = $('#img-content #post-date').text();
    // 文章内容（HTML）
    const content = $('#img-content .rich_media_content ').html().replace(/data-src/g, 'src');
    article.content = content;
    return article;
  }
  // 可以直接通过 rssText 获取内容的文章
  if (hasRss) {
    const rssURL = `${config.rssURL}/${encodeURIComponent(url)}`;
    console.log(rssURL);
    const responseJSON = await request({
      url: rssURL,
      qs: {
        sectionId: section
      }
    });
    const { data } = JSON.parse(responseJSON);
    const article = {};
    article.title = data.title;
    article.time = data.itemcreated.$date;
    article.content = data.rss;
    return article;
  }
  // 通过其他合作接口获取
  const res = await request(url);
  return res;
};

module.exports = {
  getCategories,
  getAppArticleList,
  getAppArticle
};

