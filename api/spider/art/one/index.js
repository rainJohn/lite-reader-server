/**
 * 一个
 */

const request = require('request-promise-native');
const cheerio = require('cheerio');

const config = require('./config');
// const { writeFile } = require('../../../../utils');
/**
 * 获取栏目
 * @return {!Array<Object>}
 */
const getMenu = () => {
  const menu = [];
  Object.keys(config.menu).forEach((key) => {
    menu.push({
      title: config.menu[key].title,
      name: key
    });
  });
  return menu;
};

/**
 * 获取文章列表
 * @param {!Number} page
 * @param {!String} column 栏目
 * @param {!String} url 栏目对应的 URL
 * @return {!Array<Object>}
 */
const getArticleList = async (column, id, page = 1) => {
  const url = config.menu[column].url;
  const articleList = [];
  let data = null;
  if (column === 'home') {
    const current = page > 1 ? new Date(Date.now() - ((page - 1) * 86400000)) : new Date();
    const year = current.getFullYear();
    const month = current.getMonth() + 1;
    const day = current.getDate();
    const date = `${year}-${month}-${day}`;
    const reqURL = url.replace(/date/, date);
    const responseJSON = await request(reqURL);
    data = JSON.parse(responseJSON).data.content_list;
  } else {
    // 获取列表
    const responseJSON = await request(url);
    const content = JSON.parse(responseJSON).html_content;
    // 通过正则表达式提取数据
    const reg = /var allarticles=\[.+\]/gm;
    const jsonData = reg.exec(content)[0].replace(/var allarticles=/, '');
    // 获取列表数组
    try {
      const allLists = JSON.parse(jsonData);
      data = allLists[page - 1].list;
    } catch (error) {
      // 尝试解析错误数据
      const allLists = JSON.parse(jsonData.concat('}]'));
      data = allLists[page - 1].list;
    }
  }
  data.forEach((item) => {
    const article = {};
    article.id = item.item_id ? item.item_id : item.id;
    article.title = item.title ? item.title : item.t;
    article.url = item.share_url;
    article.image = item.img_url ? item.img_url : `http://image.wufazhuce.com/${item.co}`;
    article.summary = item.forward;
    article.time = item.post_date ? item.post_date : item.d;
    // 内容类型
    article.category = item.category ? item.category : url[url.length - 1];
    articleList.push(article);
  });
  return articleList;
};

/**
 * 获取文章详情
 * @param {!String} url -
 * @param {!Object} payload 部分参数
 * @return {!Object}
 */
const getArticle = async (param) => {
  const { id, category } = param;
  try {
    if (parseInt(category, 10) === 0) {
      throw new Error('图文无法打开');
    }
    const url = config.articleDetailURL[category].replace(/id/, id);
    const responseJSON = await request(url);
    const data = JSON.parse(responseJSON).data;
    const article = param;
    article.title = data.title;
    article.url = data.web_url;
    const $ = cheerio.load(data.html_content);
    article.content = $('.one-content-box').html();
    return article;
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = {
  getMenu,
  getArticleList,
  getArticle
};
