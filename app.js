const Koa = require('koa');
const Router = require('koa-router');
const static = require('koa-static');
const render = require('koa-art-template');
const session = require('koa-session');
const path = require('path');
const bodyParser = require('koa-bodyparser');
const IO = require('koa-socket');

let app = new Koa();
let router = new Router();

let msgs = [
  {username: '小明', content: '哈哈'},
  {username: '小李', content: '呵呵'},
  {username: '小洪', content: '嘿嘿'},
]

//  全局变量
global.mySessionStore = {};

//  根据socketId找key
function findKeyBySocketId (socketId) {
  for (var key in global.mySessionStore) {
    let obj = global.mySessionStore[key];
    // console.log(obj);
    if (obj.socketId === socketId) {
      return key;
    }
  }
}

//  根据socketId找value
function findBySocketId (socketId) {
  for (var timeStamp in global.mySessionStore) {
    let obj = global.mySessionStore[timeStamp];
    // console.log(obj);
    if (obj.socketId === socketId) {
      return obj;
    }
  }
}

//  加入socket.io开始
let io = new IO();

io.attach(app); //  附加到app产生关联
io.on('connection', ctx => {
  console.log('连接上了一个');
  //  发消息给msg1
  io.broadcast('msg1', '我是服务器来的');
});

//  接收用户的消息
io.on('sendMsg', content => {
  // console.log(content, 'content')
  //  context.socket (客户端的哪个连接)
  //  context.socket.socket.id //  私聊用的
  // console.log('消息来了', content.data.newContent);
  // console.log('当前的socketid', content.socket.socket.id);

  //  查找对象的用户
  let obj = findBySocketId(content.socket.socket.id);
  // console.log(obj);

  //  广播给所有人
  io.broadcast('allMessage', obj.username + '对所有人说：' + content.data.newContent);
})
//  处理登录同步信息
io.on('login', context => {
  let id = context.data.id;
  global.mySessionStore[id].socketId = context.socket.socket.id;

  //  测试当前在线用户
  io.broadcast('online', {
    online: global.mySessionStore
  })



  //  测试用户上线
  console.log('一个用户上线了');
  context.socket.on('disconnect', context => {
    let socketId = context.socket.socket.id;
    let key = findKeyBySocketId(socketId);
    // 删除key
    delete global.mySessionStore[key];
    console.log('一个用户退出了');

    io.broadcast('online', {
      online: global.mySessionStore
    })
  })
})
//  加入socket.io结束


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
  //  生成时间戳将时间戳响应给客户端（类似cookie）
  let id = Date.now();
  ctx.session.user.id = id;

  //  保存到自己的sessionStore中
  global.mySessionStore[id] = {
    username: username
  }
  //  重定向到聊天列表
  ctx.redirect('/list');
})
.get('/list', async ctx => {
  
  ctx.render('list', {
    username: ctx.session.user.username,
    id: ctx.session.user.id,
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