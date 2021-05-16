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
const hyperswarm = require("hyperswarm-web");
const crypto = require("crypto");

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

    // create MediaRecorder stream
    console.log(media);
    var mediaRecorder = recorder(media, opts);
    mediaRecorder.on("data", function (data) {
      feed.append(data);
    });
    console.log(mediaRecorder.recorder);

    // create a feed
    var feed = hypercore(function (filename) {
      return ram(filename);
    });

    const seller = m.sell(feed, {
      validate(remoteKey, cb) {
        cb(null);
      },
    });

    seller.ready(function (err) {
      console.log(seller.key.toString("hex"));
      if (err) throw err; // Do proper error handling
      console.log("seller key pair fully loaded ...");

      const buyer = m.buy(seller.key);

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

      const stream = seller.replicate();

      pump(stream, buyer.replicate(), stream, function (err) {
        console.log("replication ended", err);
      });
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
    const swarm = hyperswarm({
      bootstrap: ["ws://localhost:4977"],
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

    const topic = crypto.createHash('sha256')
      .update('my-hyperswarm-topic')
      .digest()

    swarm.join(topic, {
      announce: true,
      lookup: true
    })

    swarm.on("connection", (socket, details) => {
      console.log("new connection!", details);

      // you can now use the socket as a stream, eg:
      // socket.pipe(hypercore.replicate()).pipe(socket)
    });

    const buyer = m.buy(
      "297de7f0943ab8090d874768f43843fbf036abe3b83f6511a8455a4ecb5a982a"
    );
    console.log(buyer);
    buyer.on("ready", function () {
      console.log("remote validated us");
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
