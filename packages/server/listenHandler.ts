import {us_listen_socket} from 'uWebSockets.js'
import PROD from './PROD'
import getGraphQLExecutor from './utils/getGraphQLExecutor'

const listenHandler = (listenSocket: us_listen_socket) => {
  const PORT = Number(PROD ? process.env.PORT : process.env.SOCKET_PORT)
  const SERVER_ID = process.env.SERVER_ID
  if (listenSocket) {
    console.log(`\n🔥🔥🔥 Server ID: ${SERVER_ID}. Ready for Sockets: Port ${PORT} 🔥🔥🔥`)
    getGraphQLExecutor().subscribe()
  } else {
    console.log(`❌❌❌    Port ${PORT} is in use!    ❌❌❌`)
  }
}

export default listenHandler
