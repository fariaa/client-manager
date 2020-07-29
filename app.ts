import * as express from "express";
import { createServer, Server } from 'http';
import * as socketIo from 'socket.io';

import { queue } from './rabbit';

import { encodeToken, decodeToken, User } from './session';

interface Message {
  userId: number
  action: string
  url?: string
  dateCreate?: Date
}

interface ValidJWT {
  ret: Boolean
  user?: User
}

class App {
  public app: express.Application;
  public server: Server;
  private io: SocketIO.Server;

  private clients: Map<number, SocketIO.Socket>;
  private messageNotReceived: Map<number, Array<Message>>;

  public PORT: number = 8100;
  public SECRET_KEY_HERE = "teste";

  constructor() {
    this.clients = new Map();
    this.messageNotReceived = new Map();

    this.routes();
    this.sockets();
    this.listen();
    this.consumer();
  }

  routes() {
    this.app = express();
    this.app.route("/").get((req, res) => {
      res.sendFile(__dirname + '/index.html');
    });

    this.app.route("/user").get((req, res) => {

      const { id } = req.query;
      const socket = this.clients.get(Number.parseInt(id + ''));
      this.io.to(socket.id).emit('chat message', 'olá');
      res.json({
        msg: 'ok'
      });
    });

    this.app.route("/users").get((req, res) => {

      interface UserToken {
        user: User
        token: string
      }
      let users: Array<UserToken> = new Array<UserToken>();

      for (let i = 2; i < 12; i++) {
        const user: User = {
          id: i,
          name: `user - ${i}`
        }
        const userToken: UserToken = {
          user: user,
          token: encodeToken(this.SECRET_KEY_HERE, user)
        }
        users.push(userToken);
      }

      res.json({
        users
      });
    });

  }

  private sockets(): void {
    this.server = createServer(this.app);
    this.io = socketIo(this.server);
  }


  private sendMessage(socket: socketIo.Socket): void {
    let index: Number | null = null;
    this.clients.forEach((clientSocket, key) => {
      if (socket.id === clientSocket.id) {
        index = key;
        return;
      }
    })

    //there is a message for the user
    if (index && this.messageNotReceived.has(Number.parseInt(index + ''))) {
      console.log("há mensagem para ser enviada para o usuário")
      const msgs = this.messageNotReceived.get(Number.parseInt(index + ''));
      msgs.forEach(msg => {
        console.log("msg", msg);
        this.io.to(socket.id).emit('chat message', msg);
      })
      this.messageNotReceived.delete(Number.parseInt(index + ''));
    }
  }


  private listen(): void {

    const isValidJwt = (socket: SocketIO.Socket, header: string = ""): ValidJWT => {
      const token = header.split(' ')[1];
      const user = decodeToken(this.SECRET_KEY_HERE, token);
      if (user !== null) {
        const { id } = user;
        const userId: number = Number.parseInt(id + '');
        socket.request.token = token;
        this.clients.set(userId, socket);
        return { ret: true, user };
      }
      return { ret: false };
    };

    this.io.use((socket, next) => {
      const header = socket.handshake.headers['authorization'];
      let access: ValidJWT = { ret: false };

      try {
        access = isValidJwt(socket, header)
      } catch (error) {
        access = { ret: false };
      }

      if (access.ret) {
        return next();
      }
      return next(new Error('authentication error'));
    });

    this.io.on('connection', (socket: any) => {
      console.log('a user connected');
      this.sendMessage(socket);

      socket.on('chat message', (m: any) => {
        this.io.emit('chat message', m);
      });

      socket.on('disconnect', () => {
        let index: Number | null = null;
        this.clients.forEach((clientSocket, key) => {
          if (socket.id === clientSocket.id) {
            index = key;
            return;
          }
        })
        console.log("key", index);
        if (index) {
          this.clients.delete(Number.parseInt(index + ''));
        }
      });
    });
  }

  private consumer(): void {
    queue.activateConsumer((message) => {
      const msgJson = JSON.parse(message.getContent());
      const { userId, action, url, dateCreate } = msgJson;

      console.log("Message received: " + message.getContent(), "user", userId);
      if (this.clients.has(userId)) {
        console.log("mensagem enviada")
        const socket = this.clients.get(userId);
        this.io.to(socket.id).emit('chat message', msgJson);
      }
      else {
        console.log("mensagem não enviada pq cliente não esta logado")
        if (this.messageNotReceived.has(userId)) {
          const msgs = this.messageNotReceived.get(userId);
          msgs.push(msgJson);
        }
        else {
          const msgs: Array<Message> = new Array();
          msgs.push(msgJson);
          this.messageNotReceived.set(userId, msgs);
        }
      }
      message.ack(true);
    });
  }
}

export default new App();