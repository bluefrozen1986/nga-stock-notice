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
    let data = await fetchData(page)
    resolve(data)
  })
}

async function listenNewMessage() {
  const data = await getCurrentData(currentPage)
  const result = data.result
  const length = result.length
  const lou = result[length - 1].lou

  if (data.currentPage === data.totalPage) {
    if (currentFloor === lou) {
      console.log(`当前楼层${currentFloor}，没有新内容`)
      return
    }
    handleMessage(result, lou)
  } else {
    if (currentFloor === lou) {
      currentPage += 1
    } else {
      handleMessage(result, lou)
      currentPage += 1
    }
  }
}

function handleMessage (result, lou) {
  for (let i = currentFloor + 1; i <= lou; i++) {
    const message = result.find(e => e.lou === i)
    currentFloor = i
    sendMessage(message)
  }
}

function sendMessage (message) {
  const author = Author.find(author => author.uid === message.author.uid)
  if (!author) {
    console.log(`当前楼层${message.lou}，有新内容，但不是监听的大佬发言`)
    return
  }
  const content = message.content.replace(/\[quote\].+\[\/quote\]|<b>.+<\/b>|\[img\].+\[\/img\]|<br\/>/g, '')
  const body = `${message.lou}楼\n${content}`
  console.log('*************************************')
  console.log(`当前楼层${message.lou}`)
  console.log(`作者 ${author.name}`)
  console.log(`内容 ${content}`)
  console.log('*************************************')
  Receiver.forEach(receiver => {
    Axios({
      url: `https://api.day.app/${receiver.id}/${encodeURIComponent(author.name)}/${encodeURIComponent(body)}`
    }).then(res => {
      console.log('发送成功')
    }).catch(err => {
      console.log('发送失败')
    })
  })
}

function init () {
  return new Promise(async (resolve, reject) => {
    const data = await getCurrentData(9999999)
    currentPage = data.totalPage
    currentFloor = data.vrows - 1
    resolve()
  })
}

async function start () {
  await init()
  await listenNewMessage()
  setInterval(async () => {
    await listenNewMessage()
  }, 10000)
}

start()
