const WebSocket = require('ws')
const wss = new WebSocket.Server({port: 8080}) // 
const code2ws = new Map() // 控制码和ws的映射关系，存在内存里面
wss.on('connection', function connection(ws, request) {
    // ws => 就是我们的端， 然后我们需要建立一个端和控制码的联系，用到之前的随机码
    let code = Math.floor(Math.random()*(999999-100000)+ 100000)
    code2ws.set(code, ws)
    // 因为send必须是字符串，所以这里用个小技巧封装一下
    ws.sendData = (event, data) => {
        ws.send(JSON.stringify({event, data}))
    }
    ws.sendError = msg => {ws.sendData('error', {msg})}
    ws.on('message', function incoming(message) {
        console.log('incoming', message)
        // 假设我们传进来的都是JSON.stringify之后的东西， 我们约定的一个格式是{event, data}
        let parsedMessage = {}
        try {
            parsedMessage = JSON.parse(message)
        } catch(e) {
            ws.sendError('message invalid')
            console.log('parse message error', e)
            return
        }
        let {event, data} = parsedMessage
        if(event === 'login') {
            ws.sendData('logined', {code})
        } else if(event === 'control') {
            let remote = data.remote
            if(code2ws.has(remote)) {
                ws.sendData('controlled', {remote})
                ws.sendRemote = code2ws.get(remote).sendData
                code2ws.get(remote).sendData=ws.sendData
                ws.sendRemote('be-controlled', {remote: code})
            }
        } else if(event === 'forward') {
            // data = {event, data}
            ws.sendRemote(data.event, data.data)
        }
        ws.on('close', () => {
            code2ws.delete(code)
            clearTimeout(ws.closeTimeout)
        })
    })
    ws.closeTimeout = setTimeout(() => {
        ws.terminate()
    }, 10*60*1000) // after 10 minutes, close it 
})