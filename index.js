// gxgujnk1993   27178316
// 泰莫拉尔   38666451
// 阿特洛玻絲与末三   41505116
// lishu945   34904557
// 不骂人不发黄图   60259365
// 卯吴骆辰黎毕   60086897
// shxtchhh   6373130
// mafeigba   10927997
// 那塔拉夏   34008960
// 天之藍～   42255599
// colaman2006   533348
// Northcode   39147059
// 舒特翔   19639523
// 神妻天理   15403706

const Koa = require('koa')
const Axios = require('axios')
const Author = require('./author')
const Receiver = require('./receiver')

const app = new Koa()
app.listen(3000)

let currentPage = 1 // 当前页码
let currentFloor = 1 // 当前楼层

function fetchData (page) {
  return new Promise((reslove, reject) => {
    Axios({
      method: 'post',
      timeout: 5000,
      url: 'http://ngabbs.com/app_api.php?__lib=post&__act=list',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-User-Agent': 'NGA_skull/6.0.7(iPhone11,6;iOS 12.2)',
        'User-Agent': 'NGA/6.0.7 (iPhone; iOS 12.2; Scale/3.00)',
        'Accept-Language': 'zh-Hans-CN;q=1'
      },
      data: `tid=16053925&page=${page}`
    }).then(res => {
      reslove(res.data)
    }).catch(res => {
      reject(res)
    })
  })
}

function getCurrentData (page) {
  return new Promise(async (resolve, reject) => {
    let data = await fetchData(page).catch(err => {
      console.log('fetchData 出错')
    })
    resolve(data)
  })
}

async function listenNewMessage() {
  let data = await getCurrentData(currentPage).catch(err => {
    console.log('getCurrentData 出错')
  })
  let result = data.result || null
  if (!result) {
    return
  }
  let length = result.length
  let lou = result[length - 1].lou || null

  if (!lou) {
    return
  }

  if (data.currentPage === data.totalPage) {
    if (currentFloor === lou) {
      console.log(`当前页码${data.currentPage}，当前楼层${currentFloor}，没有新内容`)
      return
    }
    handleMessage(result, data.currentPage, lou)
  } else {
    if (currentFloor === lou) {
      currentPage += 1
    } else {
      handleMessage(result, data.currentPage, lou)
      currentPage += 1
    }
  }
}

function handleMessage (result, currentPage, lou) {
  for (let i = currentFloor + 1; i <= lou; i++) {
    let message = result.find(e => e.lou === i)
    currentFloor = i
    sendMessage(message, currentPage)
  }
}

function sendMessage (message, currentPage) {
  let author = Author.find(author => author.uid === message.author.uid)
  if (!author) {
    console.log(`当前页码${currentPage}，当前楼层${message.lou}，有新内容，但不是收听的大佬发言`)
    return
  }
  let content = message.content.replace(/\[quote\].+\[\/quote\]|<b>.+<\/b>|\[img\].+\[\/img\]|<br\/>/g, '')
  content = content.length <= 140 ? content : `${content.substring(0, 139)}...（帖子过长，请去股楼查看）`
  let body = `${message.lou}楼\n${content}`
  let url = `https://bbs.nga.cn/read.php?tid=16053925&page=${currentPage}#l${message.lou}`
  Receiver.forEach(receiver => {
    handleAxios(receiver, author, body, url)
  })
  console.log('*************************************')
  console.log(`当前页码 ${currentPage}`)
  console.log(`当前楼层 ${message.lou}`)
  console.log(`作者 ${author.name}`)
  console.log(`内容 ${content}`)
  console.log(`跳转链接 ${url}`)
  console.log('*************************************')
}

function handleAxios (receiver, author, body, url) {
  Axios({
    method: 'get',
    timeout: 5000,
    url: `https://api.day.app/${receiver.id}/${encodeURIComponent(author.name)}/${encodeURIComponent(body)}?url=${encodeURIComponent(url)}`
  }).then(res => {
    console.log(`${receiver.name} 发送成功`)
  }).catch(err => {
    console.log(`${receiver.name} 发送失败，重新发送`)
    handleAxios(receiver, author, body, url)
  })
}

function init () {
  return new Promise(async (resolve, reject) => {
    let data = await getCurrentData(9999999).catch(err => {
      console.log('getCurrentData 出错')
    })
    currentPage = data.totalPage
    currentFloor = data.vrows - 1
    resolve()
  })
}

async function start () {
  await init().catch(err => {
    console.log('init 出错')
  })
  await listenNewMessage().catch(err => {
    console.log('start listenNewMessage 出错')
  })
  setInterval(async () => {
    await listenNewMessage().catch(err => {
      console.log('listenNewMessage 出错')
    })
  }, 10000)
}

start()
