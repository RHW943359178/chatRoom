const Koa = require('koa');
const Router = require('koa-router');
const static = require('koa-static');
const render = require('koa-art-template');
const session = require('koa-session');
const path = require('path');
const bodyParser = require('koa-bodyparser');

let app = new Koa();
let router = new Router();

let msgs = [
  {username: '小明', content: '哈哈'},
  {username: '小李', content: '呵呵'},
  {username: '小洪', content: '嘿嘿'},
]

//  配置render
render(app, {
  //  页面查找的目录
  root: path.join(__dirname, 'views'),
  //  设置后缀名
  extname: '.html',
  //  debug
  debug: process.env.NODE_ENV !== 'production'
});

router.get('/', ctx => {
  ctx.render('index');
})
.post('/login', ctx => {
  let {username, password} = ctx.request.body;
  //  不验证直接挂在session上
  ctx.session.user = {
    username
  }
  //  重定向到聊天列表
  ctx.redirect('/list');
})
.get('/list', async ctx => {
  ctx.render('list', {
    username: ctx.session.user.username,
    msgs
  });
})
.post('/add', async ctx => {
  let username = ctx.session.user.username;
  let content = ctx.request.body.msg;
  //  加入到msg数组中,返回最新消息回去
  msgs.push({
    username, content
  });
  ctx.body = msgs;
})

app.keys = ['a secret code for chatRoom']

//  在服务器内存中存储 {session_id:用户数据}
let store = {
  storage: {},
  get (key) {
    return this.storage[key];
  },
  set (key, session) {
    this.storage[key] = session;
  },
  destroy () {
    delete this.storage[key];
  }
}

//  处理静态资源
app.use(static(path.resolve('./public')));
//  处理session
app.use(session({store}, app))
//  处理解析
app.use(bodyParser());
//  处理路由
app.use(router.routes());
//  处理405 501
app.use(router.allowedMethods());

app.listen(8888);