import "./App.css";
import React, { useEffect } from "react";
import * as broadcast from "../src/lib/broadcast.js";
var hyperchat = require('@e-e-e/hyperchat')

const App = () => {

  const streamCamVideo = () => {
    var constraints = { audio: true, video: { width: 1280, height: 720 } };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function(mediaStream) {
        var video = document.querySelector("video");
        broadcast.start(3, mediaStream, function (mediaRecorder, hash) {
          window.recorder = mediaRecorder
          console.log(hash);
        })
        video.srcObject = mediaStream;
        video.onloadedmetadata = function(e) {
          video.play();
        };
      })
      .catch(function(err) {
        console.log(err.name + ": " + err.message);
      }); // always check for errors at the end.
  }

  const openChat = () => {
        var chat = new hyperchat('username')
        chat.on('ready', () => console.log(chat.name, 'now available on public key:', chat.key))
        chat.on('connection', () => console.log('i am connected to someone'))
        chat.on('listening', data => console.log('i am listening to', data.key))
        chat.on('disconnecting', key => console.log('disconnecting from', key))
        chat.on('disconnected', key => console.log('disconnected from', key))
        chat.on('destroyed', () => console.log('Hyperchat is destroyed'))
        chat.on('started', data => console.log(data.name, 'joined conversation'))
        chat.on('ended', data => console.log(data.name, 'exited conversation'))
        chat.on('heard', data => console.log(data.name, 'heard', data.who, '-', data.index))
        chat.on('message', data => console.log(`${data.name}:`, data.message))
  }

  useEffect(() => {
    streamCamVideo();
    openChat();
  }, []);

  return (
    <div className="App">
      <video/>
    </div>
  );
};

export default App;
