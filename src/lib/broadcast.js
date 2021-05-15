var recorder = require('media-recorder-stream')
var hypercore = require('hypercore')
var hyperdiscovery = require('hyperdiscovery')
var cluster = require('webm-cluster-stream')
var pump = require('pump')
var ram = require('random-access-memory')
const market = require('dazaar')
const m = market('./tmp');

module.exports = {
  start: start,
  stop: stop
}

// start broadcast
function start (quality, media, add, cb) {
  // create bitrate options
  var video = (quality === 3) ? 800000 : (quality === 2) ? 500000 : 200000
  var audio = (quality === 3) ? 128000 : (quality === 2) ? 64000 : 32000

  // create MediaRecorder
  var opts = {
    interval: 1000,
    videoBitsPerSecond: video,
    audioBitsPerSecond: audio,
  }

  // create MediaRecorder stream
  var mediaRecorder = recorder(media, opts)

  mediaRecorder.on('data', function (data) {
    add(data);
  })

  // create a feed
  var feed = hypercore(function (filename) {
      return ram(filename);
  });

  const seller = m.sell(feed, {
    validate (remoteKey, cb) {
      cb(null)
    }
  })

  seller.ready(function (err) {
  if (err) throw err // Do proper error handling
  console.log('seller key pair fully loaded ...')

  const buyer = m.buy(seller.key)

  buyer.on('feed', function () {
    console.log('got the feed!')
    console.log(buyer.feed)
     buyer.feed.on('download', function (index, data) {
       // add(data);
      })
  })



  buyer.on('validate', function () {
    console.log('remote validated us')
  })

  const stream = seller.replicate()

  pump(stream, buyer.replicate(), stream, function (err) {
    console.log('replication ended', err)
  })


})



}

// stop broadcast
function stop (recorder, cb) {
  recorder.stop()
  cb()
}
