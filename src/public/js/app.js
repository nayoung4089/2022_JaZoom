const socket = io();
const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const youTubeBtn = document.getElementById("youTubeBtn");
const peerFace = document.getElementById("peerFace");

const call = document.getElementById("call");

call.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myNickName;
let myPeerConnection;
let myDataChannel;

// 갑분 랜덤이름만들기
var choi = new Array('절약하는','긴장감 있는', '관용적인', '낭만적인', '너그러운', '느긋한', '용감한', '명랑한', '사려깊은', '나긋나긋한', '냉소적인', '변덕스러운', '야심찬', '거들먹거리는', '부지런한', '성미가 급한');
var nana = new Array('오렌지', '네이비', '보르도', '올리브', '스카이블루', '바이올렛', '코코아','올드로즈', '화이트', '마젠타', '브라운', '인디블루', '코랄', '레몬옐로우', '베이비핑크', '시그널레드', '시나몬', '인디고', '울트라마린' );

// 위의 주어진 배열(Array)에서 무작위 요소 1개를 반환한다.
function randomItem(a) {
    return a[Math.floor(Math.random() * a.length)];
}


async function getCameras(){
    try{
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device)=> device.kind === 'videoinput'); // video인 device만 추출
        const currentCamera = myStream.getVideoTracks()[0];
        cameras.forEach(camera => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if(currentCamera.label == camera.label){
                option.selected = true;
            }
            camerasSelect.appendChild(option);
        })
    }catch(e){
        console.log(e)
    }
}
async function getMedia(deviceId){
    const initialConstrains = {
        audio: true, 
        video: { facingMode: "user" }
    };
    // 카메라가 존재하면 사용
    const cameraConstraints = {
        audio: true,
        video: {deviceId: { exact: deviceId}},
    }
    try{
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId? cameraConstraints : initialConstrains// 카메라가 존재하면 있는거 쓰자
        );
        myFace.srcObject = myStream;
        if(!deviceId){
            await getCameras();
        }
    } catch(e){
        console.log(e);
    }

}

function handleMuteClick(){
    myStream.getAudioTracks().forEach(track => (track.enabled = !track.enabled))
    if(!muted){
        muteBtn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>';
        muted = true;
    }else{
        muteBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
        muted = false;
    }
}

function handleCameraClick(){
    myStream.getVideoTracks().forEach(track => (track.enabled = !track.enabled))
    if(cameraOff){
        cameraBtn.innerHTML = '<i class="fa-solid fa-video"></i>';
        cameraOff = false;
    }else{
        cameraBtn.innerHTML = '<i class="fa-solid fa-video-slash"></i>';
        cameraOff = true;
    }
}

async function handleCameraChange(){
    await getMedia(camerasSelect.value);
    if (myPeerConnection) {
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection
          .getSenders()
          .find((sender) => sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack);
      }
}
muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);

// welcome Form (join a room)
const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function initCall(){
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    makeConnection();
}
//socket.on("offer") 조작할 때 myPeerConnection이 미리 존재하도록
// 나머지 내용들은 닉네임 변경함수가 캐리함
welcomeForm.addEventListener("submit", initCall);

//채팅창 함수들
const form = welcome.querySelector("form");
const nickName = document.getElementById("nickName"); 
const nickForm = nickName.querySelector("form");
const room = document.getElementById("room");
const black = document.querySelector("#blur");
// const chatBlack = document.getElementById("#chatblur");
const footer = document.getElementById("footer");

nickName.hidden = true;
room.hidden = true;
black.hidden = true;
// chatBlack.hidden = true;

function addMessage(message,id) {
    const ul = room.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = message;
    ul.appendChild(li);
    li.id = id
}

// 닉네임 바꾸기
const handleChangeSubmit = (event) => {
    const input = room.querySelector("#name input");
    event.preventDefault();
    myNickName = input.value;
    socket.emit("nickname", myNickName);
    console.log(input.value);
    room.querySelector("#name").hidden = true;
    black.hidden = true;
};
const nameForm = room.querySelector("#name");
nameForm.addEventListener("submit", handleChangeSubmit);

// 버튼 누르면 보이고 사라지고
function closeAndClick(nameForm){
    if(black.hidden == true){
        nameForm.hidden = false;
        black.hidden = false;
    }else{
        nameForm.hidden = true;
        black.hidden = true;
    }
}
//닉네임 변경창
const closeBtn = document.getElementById("close");
closeBtn.addEventListener("click", ()=>{closeAndClick(nameForm)});
document.querySelector("#change").addEventListener("click", ()=>{closeAndClick(nameForm)});

// 랜덤 이름정해서 value에 넣어주기.
const randomName = document.getElementById("random");
const nickNameInput = nickName.querySelector("input");
const randomNameChange = document.getElementById("randomChange");
const nicknameChangeInput = room.querySelector("#name input");

function getRandom(nickNameInput){
    nickNameInput.value = `${randomItem(choi)} ${randomItem(nana)}`;
}
randomName.addEventListener("click", ()=>{getRandom(nickNameInput)});
randomNameChange.addEventListener("click", ()=>{getRandom(nicknameChangeInput)});


// 기본 닉네임 함수 -> 방번호와 함께 바로 입장까지 총괄
function handleNicknameSubmit(event) {
    event.preventDefault();
    myNickName = nickNameInput.value;
    socket.emit("enter_room", roomName, myNickName, showRoom);
    nickName.hidden = true;
    room.hidden=false;
    room.querySelector("#name").hidden = true;
    nickNameInput.value = "";
    const changeNameInput = room.querySelector("#name input");
    changeNameInput.value = nickNameInput.value;
}
nickForm.addEventListener("submit", handleNicknameSubmit);

// 제목 변경(사람수 등)
let newCount;
function title(roomName, newCount){
    console.log(`${roomName}, ${newCount}`)
}

function showRoom(){
    title(roomName, newCount);
    room.hidden = false;
    welcome.hidden = true;
    const nameForm = room.querySelector("#name");
    nameForm.addEventListener("submit", handleChangeSubmit);
    const msgForm = room.querySelector("#message");
    msgForm.addEventListener("submit", handleMessageSubmit);
}

function handleRoomSubmit(event) {
    const roomNameInput = welcome.querySelector("input");
    event.preventDefault();
    socket.emit("entering", roomNameInput.value);
    welcome.hidden = true;
    nickName.hidden = false;
    document.querySelector("header").style.display = "none";
    document.querySelector("body").style.backgroundColor="black";
    roomName = roomNameInput.value;
    roomNameInput.value = "";
}
form.addEventListener("submit", handleRoomSubmit);

// 채팅내용 함수 : 보내고 수신하기
function handleMessageSubmit(event) {
    event.preventDefault();
    const input = room.querySelector("#message input");
    const { value } = input;
    // myDataChannel.send(value);
    input.value = "";
    // addMessage(value, "me");
    socket.emit("new_message", value, roomName, () => {
        addMessage(value, "me");
    });
}
const msgForm = room.querySelector("#message");
msgForm.addEventListener("submit", handleMessageSubmit);
/////

// socket Code & 관련 함수
// 첫번째 enter된 브라우저(누가 왔어요! 연락받는 브라우저)에서만 작동됨
socket.on("welcome", async(user)=> {
    title(roomName, newCount);
    youTubeBtn.style.display="none";
    peerYouTube.style.display="none";
    peerYouTube.src = "";
    peerFace.className ="video-fill";
    myFace.className ="video-small";
    // if(myFace.className == "video-small"){
    //     peerFace.className = "video-fill";
    // }
    // // 채팅창 만들기
    myDataChannel = myPeerConnection.createDataChannel("chat"); 
    // // 채팅내용
    // myDataChannel.addEventListener("message", (event)=>{
    //     addMessage(user, "other-name");
    //     addMessage(event.data, "other");
    // }); 
    // 처음 환영인사
    myDataChannel.addEventListener("open", ()=>{
        addMessage(`${user}님이 입장하셨습니다`, "join");
        youTubeBtn.style.display="none";
        peerYouTube.style.display="none";
        peerYouTube.src = "";
        peerFace.className ="video-fill";
        myFace.className ="video-small";
        if(myFace.className == "video-small"){
            peerFace.className = "video-fill";
        }
        peerFace.style.zIndex="3000";
    });
    ///
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    console.log("sent the offer");
    socket.emit("offer", offer, roomName, myNickName);
})

// 새로 들어온 브라우저에서 작동됨
socket.on("offer", async(offer, user) => {
    // 채팅 받기
    myPeerConnection.addEventListener("datachannel", (event)=>{
        myDataChannel = event.channel;
        // 채팅내용
        // myDataChannel.addEventListener("message", (event)=>{
        //     console.log(myNickName);
        //     addMessage(user, "other-name");
        //     addMessage(event.data, "other");
        // });
    });
    console.log("received the offer");
    youTubeBtn.style.display="none";
    peerYouTube.style.display="none";
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer",answer, roomName, myNickName);
    console.log("sent the answer");
})
// 이건 또 처음 브라우저
socket.on("answer", (answer)=>{
    console.log("received the answer");
    myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice)=> {
    console.log("received candidate");
    myPeerConnection.addIceCandidate(ice);
})
socket.on("new_message", addMessage);

/// 복붙 코드임
// 퇴장하셨습니다
socket.on("bye", (left, newCount) => {
    title(roomName, newCount);
    myDataChannel.addEventListener("close", ()=>{
        addMessage(`${left}님이 나가셨습니다`, "join");
        myFace.className ="video-fill";
        peerFace.className ="video-small";
        peerYouTube.className ="iframe-video-small";
        youTubeBtn.style.display="block";
        peerYouTube.style.display="block";
        peerFace.style.zIndex="-3000";
        youTube.style.display ="block";
        black.hidden = false;
    });
    
});

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
// RTC code (peer-to-peer 커넥션을 위함)
function makeConnection(){
    myPeerConnection = new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:stun1.l.google.com:19302",
              "stun:stun2.l.google.com:19302",
              "stun:stun3.l.google.com:19302",
              "stun:stun4.l.google.com:19302",
            ],
          },
        ],
      });
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("addstream", handleAddStream);
    myStream.getTracks().forEach((track)=> myPeerConnection.addTrack(track, myStream))
}

function handleIce(data){
    console.log("sent candidate");
    socket.emit("ice", data.candidate, roomName, myNickName);
};

function handleAddStream(data){
    const peerFace = document.getElementById("peerFace");
    peerFace.srcObject = data.stream;
}


/// css Party
// 비디오 누르면 화면크기 조정
const peerYouTube = document.getElementById("peerYouTube");
$(function () {
    $(document).on("click", "#change-size", (function(){
        $("#myFace").toggleClass("video-small video-fill");
        $(".video-small").offset({top: 30,  left: $(window).width() -180});
        if(youTubeBtn.style.display == "none"){
            $("#peerFace").toggleClass("video-small video-fill");
            $( ".video-small" ).draggable();
        }else{
            $("#peerYouTube").toggleClass("iframe-video-small iframe-video-fill");
        }
    }))
});

// 작은 화면 드래그 가능하게
const smallVideo = document.querySelector(".video-small");
$( function() {
    $( ".video-small" ).draggable();
  } );

// 채팅방 나오게 만들기
const chatBtn = document.getElementById("chatStart");
const chatting = document.getElementById("chatting");
function startChatting(){
    if(footer.style.display == 'none') {
        footer.style.display = 'flex';
        chatting.style.display="block";
        document.querySelector("#video-area").style.width = "80%";
        document.querySelector("#section1").style.width = "80%";
        call.style.display='flex';
    }
    else {
        footer.style.display = 'none';
        chatting.style.display="none";
        document.querySelector("#video-area").style.width = "100%";
        document.querySelector("#section1").style.width = "100%";
    }
}
chatBtn.addEventListener("click", startChatting);

// 유튜브 불러오기
const youTube = document.getElementById("youtube");
const urlIn = document.querySelector("iframe");

let url;
let subURL;
const handleURLSubmit = (event) => {
    const input = youTube.querySelector("input");
    event.preventDefault();
    if(input.value.includes("=")){
        subURL = input.value.split('=',2)[1];
    }else if(input.value.includes("embed")){
        subURL = input.value.split('/', 5)[4];
    }else {
        subURL = input.value.split('/', 4)[3];
    }
    url = `https://www.youtube.com/embed/${subURL}?frameborder=0&showinfo=0&modestbranding=0&fs=0&autoplay=1&amp;playlist=${subURL}&loop=1&rel=0&showsearch=0`
    console.log(url);
    urlIn.src = url;
    youTube.style.display="none";
    black.hidden = true;
};
youTube.querySelector("form").addEventListener("submit", handleURLSubmit);

function showYouTube(){
    if(youTube.style.display=="block")
    {
        youTube.style.display="none";
        black.hidden = true;
    }
    else{
            youTube.style.display="block";
            black.hidden = false;
        }
};
youTubeBtn.addEventListener("click", showYouTube);
// const closeYouTubeBtn = document.getElementById("closeYouTube");
// closeYouTubeBtn.addEventListener("click", ()=>{
//     youTube.style.display="none";
//     black.hidden = true;
// });

// 모바일 뒤로가기
const backBtn = document.getElementById("back");
function backFun(){
    chatting.style.display="none";
    document.querySelector("#video-area").style.width = "100%";
    document.querySelector("#section1").style.width = "100%";
}
backBtn.addEventListener("click", backFun);