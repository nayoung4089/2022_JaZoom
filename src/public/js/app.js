const socket = io();
const welcome = document.getElementById("welcome");
const form = welcome.querySelector("form");
const nickName = document.getElementById("nickName"); 
const nickForm = nickName.querySelector("form");
const room = document.getElementById("room");
const black = document.querySelector("#blur");

nickName.hidden = true;
room.hidden = true;
black.hidden = true;

let roomName;

function addMessage(message,id) {
    const ul = room.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = message;
    ul.appendChild(li);
    li.id = id
}

function handleMessageSubmit(event) {
    event.preventDefault();
    const input = room.querySelector("#message input");
    const { value } = input;
    socket.emit("new_message", value, roomName, () => {
      addMessage(value, "me");
    });
    input.value = "";
}

// 닉네임 바꾸기
const handleChangeSubmit = (event) => {
    event.preventDefault();
    const input = room.querySelector("#name input");
    socket.emit("nickname", input.value);
    room.querySelector("#name").hidden = true;
    black.hidden = true;
};
document.querySelector("#change").addEventListener("click",()=>{
    room.querySelector("#name").hidden = false;
    black.hidden = false;
})

// 기본 닉네임 함수 -> 방번호와 함께 바로 입장까지 총괄
function handleNicknameSubmit(event) {
    event.preventDefault();
    const nickNameInput = nickName.querySelector("input");
    socket.emit("enter_room", roomName, nickNameInput.value, showRoom);
    nickName.hidden = true;
    room.hidden=false;
    room.querySelector("#name").hidden = true;
    nickNameInput.value = "";
    const changeNameInput = room.querySelector("#name input");
    changeNameInput.value = nickNameInput.value;
}
nickForm.addEventListener("submit", handleNicknameSubmit);

// 제목 변경(사람수 등)
function title(roomName, newCount){
    const h3 = document.querySelector("#h3");
    if (newCount == ""){
        h3.innerText = `${roomName}`;
    }else{
        h3.innerText = `${roomName} (${newCount})`;
    }
}

function showRoom(){
    title(roomName, "");
    room.hidden = false;
    welcome.hidden = true;
    const msgForm = room.querySelector("#message");
    const nameForm = room.querySelector("#name");
    msgForm.addEventListener("submit", handleMessageSubmit);
    nameForm.addEventListener("submit", handleChangeSubmit);
}

function handleRoomSubmit(event) {
    const roomNameInput = welcome.querySelector("input");
    event.preventDefault();
    socket.emit("entering", roomNameInput.value);
    welcome.hidden = true;
    nickName.hidden = false;
    roomName = roomNameInput.value;
    roomNameInput.value = "";
}
form.addEventListener("submit", handleRoomSubmit);

// 입장하셨습니다
socket.on("welcome", (user, newCount) => {
    // const h3 = room.querySelector("h3");
    // h3.innerText = `Room ${roomName} (${newCount})`;
    title(roomName, newCount);
    addMessage(`${user}님이 입장하셨습니다.`, "join"); // server.js에서 socket.nickname을 가져왔으니 frontend에서 보여주는거지!! user로.
});
// 퇴장하셨습니다
socket.on("bye", (left, newCount) => {
    title(roomName, newCount);
    addMessage(`${left}님이 나갔습니다.`, "join");
});

socket.on("new_message", addMessage);

// 지금 어떤 방이 있는지 알려주기
socket.on("room_change", (rooms)=>{
    const roomList = welcome.querySelector("ul"); 
    roomList.innerHTML = ""; // 항상 리스트를 비워서 중복으로 생기지 않게!
    // 방이 없던지 없어지던지해서 아무것도 없는 경우
    if(rooms.length === 0){
        return;
    }
    // 걍 저장
    rooms.forEach(room => {
        const li = document.createElement("li");
        li.innerText = room;
        roomList.appendChild(li);
        // 입장 가능한 room 누르면 자동으로 input 채워짐
        li.addEventListener("click",()=>{
            const roomNameInput = welcome.querySelector("input");
            roomNameInput.value = li.innerText;
        })
    })
});