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
    };

    // create MediaRecorder stream
    console.log(media);
    var mediaRecorder = recorder(media, opts);
    console.log(mediaRecorder);
    const replay = document.querySelector("#replay");
    var ms = new MediaSource();
    replay.src = window.URL.createObjectURL(ms);
    ms.addEventListener(
      "sourceopen",
      () => {
        let source = ms.addSourceBuffer("video/webm;codecs=vp8,opus");
        mediaRecorder.on("data", function (data) {
          source.appendBuffer(new Uint8Array(data));
        });
      },
      false
    );

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
      if (err) throw err; // Do proper error handling
      console.log("seller key pair fully loaded ...");

      const buyer = m.buy(seller.key);

      buyer.on("feed", function () {
        console.log("got the feed!");
        console.log(buyer.feed);
        buyer.feed.on("download", function (index, data) {
          // add(data);
        });
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

  useEffect(() => {
    streamCamVideo();
  }, []);

  return (
    <div className="App">
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
