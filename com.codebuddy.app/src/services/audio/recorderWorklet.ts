// Inlined as a Blob URL so we don't need a separate .js file served by Vite.
export const recorderWorkletCode = `
class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 512;          // 32ms at 16kHz
    this.buffer = new Float32Array(this.bufferSize);
    this.offset = 0;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;

    for (let i = 0; i < input.length; i++) {
      this.buffer[this.offset++] = input[i];
      if (this.offset >= this.bufferSize) {
        const chunk = this.buffer.slice();
        this.port.postMessage(chunk, [chunk.buffer]);
        this.offset = 0;
      }
    }
    return true;
  }
}

registerProcessor('recorder-processor', RecorderProcessor);
`;