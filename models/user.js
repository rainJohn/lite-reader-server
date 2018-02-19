const MongoDB = require('./db');

const UserSchema = {
  username: String,
  password: String,
  email: String, // 邮箱，唯一
  registerTime: Date, // 注册时间
  ips: Array, // 访问 ip
  readHistory: Array, // 阅读的历史文章
  followAPPs: Array, // 关注的应用
  setting: Object // 个人设置信息
};

const { model } = new MongoDB('user', UserSchema);

class User {
  constructor() {
    this.db = model;
  }

  async checkUser(email) {
    const exitEmails = await this.db.find({ email });
    if (exitEmails.length) {
      return 1; // error: '邮箱已被占用'
    }
    return 0;
  }

  async getUser({ email, id } = {}) {
    try {
      const user = email ? await this.db.findOne({ email }) : await this.db.findById(id);
      return user;
    } catch (error) {
      throw new Error(error);
    }
  }

  async insertUser(user) {
    try {
      // 返回插入的数据
      const result = await this.db.insertMany(user);
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }

  async updateUserName(id, username) {
    try {
      await this.db.findByIdAndUpdate(id, { username });
      const result = await this.db.findById(id);
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }

  async updateEmail(id, email) {
    try {
      await this.db.findByIdAndUpdate(id, { email });
      const result = this.db.findById(id);
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }


  async addUserFollow(id, app) {
    try {
      // 关注的应用是否已经存在
      const exit = await this.db.findOne({ _id: id, 'followAPPs.title': app.title });
      // 存在，则更新 delete 标志为 0，否则插入新数据

      if (exit) {
        await this.db.update(
          {
            _id: id,
            'followAPPs.title': app.title
          },
          {
            $set: {
              'followAPPs.$.delete': 0
            }
          }
        );
      } else {
        await this.db.findByIdAndUpdate(id, { $push: { followAPPs: app } });
      }
      const result = await this.db.findById(id);
      const apps = result.followAPPs.filter(v => !v.delete);
      return apps;
    } catch (error) {
      throw new Error(error);
    }
  }

  async cancelUserFollow(id, app) {
    try {
      await this.db.update(
        {
          _id: id,
          'followAPPs.title': app.title
        },
        {
          $set: {
            'followAPPs.$.delete': 1
          }
        }
      );
      const result = await this.db.findById(id);
      const apps = result.followAPPs.filter(v => !v.delete);
      return apps;
    } catch (error) {
      throw new Error(error);
    }
  }
}

// new User().addUserFollow('5a858d11501f6b4ce7338f04', { title: '21CTO' });

module.exports = new User();

