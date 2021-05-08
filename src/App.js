import "./App.css";
import React, { useEffect } from "react";
const hypercore = require("hypercore");
const pump = require("pump");
const market = require("dazaar");
const racf = require("random-access-chrome-file");

const App = () => {
  useEffect(() => {
    const m = market("tmp");

    var feed = hypercore(function (filename) {
      return racf(filename);
    });

    feed.append("valuable");

    const seller = m.sell(feed, {
      validate(remoteKey, cb) {
        console.log("this key wants our hypercore", remoteKey);
        cb(null);
      },
    });

    seller.ready(function (err) {
      if (err) throw err; // Do proper error handling
      console.log("seller key pair fully loaded ...");

      const buyer = m.buy(seller.key);

      buyer.on("feed", function () {
        console.log("got the feed!");
        buyer.feed.get(0, function (err, data) {
          if (err) throw err; // Do proper error handling
          console.log("first feed entry: " + data);
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
  }, []);

  return (
    <div className="App">
      Check console logs to see more...
    </div>
  );
};

export default App;
