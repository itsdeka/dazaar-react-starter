import "./App.css";
import Video from "./Video";
import React, {useState, useEffect} from "react";
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

    seller.on('ready', () => seller.on('peer-add', onBuyerValid));

    const onBuyerValid = (stream) => {
      // watch(stream.remotePublicKey);
    };

    const swarm = hyperswarm(seller, (e) => console.log(e), {
      wsProxy: ["wss://hc.virale.io/proxy"],
      webrtcBootstrap: [
        "wss://hc.virale.io/signal"
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
        console.log('Seller ' + feed.length)
        console.log('Seller ' + new Date().toISOString());
      }

      mediaRecorder.start();
      setTimeout(event => {
        mediaRecorder.stop();
      }, 1000);

    }, [1000]);

    swarm.on("connection", (socket, info) => {
      console.log("new connection!", info);
    });

    seller.ready(function (err) {
      console.log(seller.key.toString("hex"));
    });
  };

  const streamCamVideo = () => {
    var constraints = { audio: true, video: { width: 1920, height: 1080 } };
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

  const watch = (key) => {
    if (!key) key = window.prompt('hey');
    const buyer = m.buy(key, { sparse: true });

    const swarm = hyperswarm(buyer, (e) => console.log(e), {
      wsProxy: ["wss://hc.virale.io/proxy"],
      webrtcBootstrap: [
        "wss://hc.virale.io/signal"
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
      await buyer.feed.update(function () {
        let stream = buyer.feed.createReadStream({
          snapshot: false,
          tail: true,
          live: true,
          batch: 100
        });

        stream.on("data", chunk => {
            const replay = document.querySelector("#replay");
            var ms = new MediaSource();
            replay.src = window.URL.createObjectURL(ms);
            ms.addEventListener(
                "sourceopen",
                async () => {
                  let source = ms.addSourceBuffer("video/webm;codecs=vp8,opus");
                  source.appendBuffer(chunk);
                  console.log('Buyer ' + stream.index)
                  console.log('Buyer ' + new Date().toISOString());
                },
                false
            );
        });
      });
    });

    buyer.on("validate", function () {
      console.log("remote validated us");
    });
  };

  const [url, setUrl] = useState(null);

  return (
    <div className="App">
      <button onClick={() => streamCamVideo()}>Stream</button>
      <button onClick={() => watch(null)}>Watch</button>
      <video id={"video"} style={{ width: 600, height: 600 }} muted={true} autoPlay={true} />
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
