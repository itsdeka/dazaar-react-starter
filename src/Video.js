import React, { useEffect, useState } from "react";

const Video = ({ url }) => {
  const localVideo = React.createRef();

  // localVideo.current is null on first render
  // localVideo.current.srcObject = stream;

  useEffect(() => {
    // Let's update the srcObject only after the ref has been set
    // and then every time the stream prop updates
    if (localVideo.current) localVideo.current.src = url;
  }, [url, localVideo]);

  return (
      <video ref={localVideo} autoPlay />
  );
};

export default Video;