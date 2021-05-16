import "./App.css";
import React, { useEffect, useState } from "react";
import * as broadcast from "../src/lib/broadcast.js";
import Video from "../src/Video";
var recorder = require("media-recorder-stream");
var hypercore = require("hypercore");
var hyperdiscovery = require("hyperdiscovery");
var cluster = require("webm-cluster-stream");
var pump = require("pump");
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
      interval: 1000,
      videoBitsPerSecond: video,
      audioBitsPerSecond: audio,
      mimeType: "video/webm;codecs=vp8,opus",
    };

    var feed = hypercore(function (filename) {
      return ram(filename);
    });

    // create MediaRecorder stream
    console.log(media);
    var mediaRecorder = recorder(media, opts);
    mediaRecorder.on("data", function (data) {
      feed.append(data);
    });
    console.log(mediaRecorder.recorder);

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

    swarm.on("connection", (socket, info) => {
      console.log("new connection!", info);
    });

    swarm.join(topic, {
      lookup: true, // find & connect to peers
      announce: true, // optional- announce self as a connection target
    });

    seller.ready(function (err) {
      console.log(seller.key.toString("hex"));
      if (err) throw err; // Do proper error handling
      console.log("seller key pair fully loaded ...");
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
    const buyer = m.buy(
      "297de7f0943ab8090d874768f43843fbf036abe3b83f6511a8455a4ecb5a982a"
    );

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

    swarm.join(topic, {
      lookup: true, // find & connect to peers
      announce: true, // optional- announce self as a connection target
    });

    swarm.on("connection", (socket, info) => {
      console.log("new connection!", info);
    });

    console.log(buyer);
    buyer.on("ready", function () {
      console.log("ready");
    });
    buyer.on("feed", function () {
      console.log("got the feed!");
      console.log(buyer.feed);
      const replay = document.querySelector("#replay");
      var ms = new MediaSource();
      replay.src = window.URL.createObjectURL(ms);
      ms.addEventListener(
        "sourceopen",
        () => {
          let source = ms.addSourceBuffer("video/webm;codecs=vp8,opus");
          buyer.feed.on("download", function (index, data) {
            console.log(data);
            source.appendBuffer(new Uint8Array(data));
          });
        },
        false
      );
    });

    buyer.on("validate", function () {
      console.log("remote validated us");
    });
  };

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
    </div>
  );
};

export default App;
