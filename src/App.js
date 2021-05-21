import "./App.css";
import Video from "./Video";
import React, {useState} from "react";
var recorder = require("media-recorder-stream");
var hypercore = require("hypercore");
var ram = require("random-access-memory");
const market = require("dazaar");
const m = market("./tmp");
const hyperswarm = require("dazaar/swarm");
const crypto = require("crypto");
const topic = crypto
  .createHash("sha256")
  .update("my-hyperswarm-topic")
  .digest();


const App = () => {
  const broadcast = (quality, media, cb) => {
    // create bitrate options
    var video = quality === 3 ? 800000 : quality === 2 ? 500000 : 200000;
    var audio = quality === 3 ? 128000 : quality === 2 ? 64000 : 32000;

    // create MediaRecorder
    var opts = {
      interval: 500,
      videoBitsPerSecond: video,
      audioBitsPerSecond: audio,
      mimeType: "video/webm;codecs=vp8,opus",
    };

    var feed = hypercore(
      function (filename) {
        return ram(filename);
      },
      null,
      { sparse: true }
    );

    const seller = m.sell(feed, {
      validate(remoteKey, cb) {
        cb(null);
      },
    });

    const swarm = hyperswarm(seller, (e) => console.log(e), {
      wsProxy: ["wss://hyperswarm.mauve.moe"],
      webrtcBootstrap: [
        "wss://geut-webrtc-signal-v3.herokuapp.com",
        "wss://signal.dat-web.eu",
        "wss://geut-webrtc-signal-v3.glitch.me",
      ],
      simplePeer: {
        // The configuration passed to the RTCPeerConnection constructor,for more details see
        // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection#RTCConfiguration_dictionary
        config: {
          // List of STUN and TURN setvers to connect
          // Without the connection is limited to local peers
          iceServers: require("./ice-servers.json"),
        },
      },
    });

    setInterval(() => {
      let mediaRecorder = new MediaRecorder(media, opts);

      mediaRecorder.ondataavailable = async (event) => {
        var arrayBuffer = await event.data.arrayBuffer();
        var uint8View = new Uint8Array(arrayBuffer);
        feed.append(uint8View);
      }

      mediaRecorder.start();
      setTimeout(event => {
        mediaRecorder.stop();
      }, 500);

    }, [500]);


    swarm.on("connection", (socket, info) => {
      console.log("new connection!", info);
    });

    seller.ready(function (err) {
      console.log(seller.key.toString("hex"));
    });
  };

  const streamCamVideo = () => {
    var constraints = { audio: true, video: { width: 1280, height: 720 } };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function (mediaStream) {
        var video = document.querySelector("video");
        broadcast(3, mediaStream, function (mediaRecorder, hash) {
          window.recorder = mediaRecorder;
          console.log(hash);
        });
        video.srcObject = mediaStream;
        video.onloadedmetadata = function (e) {
          video.play();
        };
      })
      .catch(function (err) {
        console.log(err.name + ": " + err.message);
      }); // always check for errors at the end.
  };

  const watch = () => {
    const buyer = m.buy(window.prompt("hey"), { sparse: true });

    const swarm = hyperswarm(buyer, (e) => console.log(e), {
      wsProxy: ["wss://hyperswarm.mauve.moe"],
      webrtcBootstrap: [
        "wss://geut-webrtc-signal-v3.herokuapp.com",
        "wss://signal.dat-web.eu",
        "wss://geut-webrtc-signal-v3.glitch.me",
      ],
      simplePeer: {
        // The configuration passed to the RTCPeerConnection constructor,for more details see
        // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection#RTCConfiguration_dictionary
        config: {
          // List of STUN and TURN setvers to connect
          // Without the connection is limited to local peers
          iceServers: require("./ice-servers.json"),
        },
      },
    });

    swarm.on("connection", (socket, info) => {
      console.log("new connection!", info);
      socket.on("stream", (stream) => {
        console.log(stream);
      });
    });

    console.log(buyer);
    buyer.on("ready", function () {
      console.log("ready");
    });
    buyer.on("feed", async function () {

        setInterval(() => {
          buyer.feed.update(function () {
            console.log(new Date());
            buyer.feed.get(buyer.feed.length, function (err, data) {
              console.log(data);
              const replay = document.querySelector("#replay");
              var ms = new MediaSource();
              replay.src = window.URL.createObjectURL(ms);
              ms.addEventListener(
                  "sourceopen",
                  async () => {
                    let source = ms.addSourceBuffer("video/webm;codecs=vp8,opus");
                    source.appendBuffer(data);
                  },
                  false
              );
            });
          })
        }, [500]);
    });

    buyer.on("validate", function () {
      console.log("remote validated us");
    });
  };

  const [url, setUrl] = useState(null);

  return (
    <div className="App">
      <button onClick={streamCamVideo}>Stream</button>
      <button onClick={watch}>Watch</button>
      <video id={"video"} style={{ width: 600, height: 600 }} autoPlay={true} />
      <video
        id={"replay"}
        style={{ width: 600, height: 600 }}
        autoPlay={true}
      />
      {url && <Video url={url}/>}
    </div>
  );
};

export default App;
