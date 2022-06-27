import http from "http";
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";
import express from "express";

const app = express();
app.set("view engine","pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));

// 질문 페이지 만들어주기
app.get("/", (_, res) => res.render("home"));
// 메인 페이지
app.get("/room", (_, res) => res.render("room"));
app.get("/*", (_,res)=> res.redirect("/"));

const httpServer = http.createServer(app);
const wsServer = new Server(httpServer, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true,
  },
});

instrument(wsServer, {
  auth: false
});

function publicRooms() {
    const {
      sockets: {
        adapter: { sids, rooms },
      },
    } = wsServer;
    const publicRooms = [];
    rooms.forEach((_, key) => {
      if (sids.get(key) === undefined) {
        publicRooms.push(key);
      }
    });
    return publicRooms;
  }

// 몇명 들어와있는지 알아내기 & 물음표 쓴 이유는 저 roomName을 찾지 못할 수도 있어서!
function countRoom(roomName) {
    return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}
wsServer.on("connection", (socket) => {
    socket["nickname"] = "Anon";
    socket["roomName"] = "";
    wsServer.sockets.emit("room_change", publicRooms()); // room 들어오자마자 입장 가능한 room 보여줘야 하니까 여기다가 한번 더 쓴다..
    socket.onAny((event)=> {
        console.log(`Socket Event: ${event}`);
    })
    socket.on("entering", (roomName)=>(socket["roomName"]=roomName))
    socket.on("enter_room", (roomName, nickName, done) => {
        socket["nickname"] = nickName;
        socket.join(roomName);
        socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName)); // 새로운 사람 들어오면 모두에게 welcome이라는 문자 보내기
        done(); // 이걸 하면 showRoom 들어간 부분이 실행되네.. 신기..
        wsServer.sockets.emit("room_change", publicRooms()); // 지금 무슨 room이 있는지 알려주기
    });
    socket.on("disconnecting", () => {
        socket.rooms.forEach((room) => socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1)); // 아직 퇴장 전이라서 -1. 곧 퇴장할테니까
    });
    socket.on("disconnect", () => {
        wsServer.sockets.emit("room_change", publicRooms());
      }); // room 없어지면 알려주기
    socket.on("new_message", (msg, roomName, done) => {
        socket.to(roomName).emit("new_message", `${socket.nickname}`, "other-name");
        socket.to(roomName).emit("new_message", `${msg}`, "other");
        done();
    });
    socket.on("nickname", (nickname)=>(socket["nickname"]=nickname))
})

const handleListen = ()=> console.log(`Listening on http://localhost:3000`);
httpServer.listen(3000, handleListen);