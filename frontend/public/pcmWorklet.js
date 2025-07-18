class PCMWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    // 20 ms of audio per chunk @16 kHz => 320 samples
    this.chunkSize = 320;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }
    const channelData = input[0]; // mono only
    for (let i = 0; i < channelData.length; i++) {
      let s = channelData[i];
      // clamp
      s = Math.max(-1, Math.min(1, s));
      // float [-1,1] -> int16
      const intSample = s < 0 ? s * 0x8000 : s * 0x7FFF;
      this.buffer.push(intSample);
      if (this.buffer.length >= this.chunkSize) {
        // copy to Int16Array
        const chunk = new Int16Array(this.buffer.splice(0, this.chunkSize));
        this.port.postMessage(chunk.buffer, [chunk.buffer]); // zero-copy
      }
    }
    return true;
  }
}

registerProcessor('pcm-worklet', PCMWorkletProcessor); 