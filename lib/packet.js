const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function pack(items, enc = encoder) {
  let n = 0;
  const encoded = [];
  for (let i = 0; i < items.length; ++i) {
    const item = enc.encode(items[i]);
    if (item.byteLength > 65535) {
      throw new Error(`Too much long message at [${i}]`);
    }
    n += 2 + item.byteLength;
    encoded.push(item);
  }

  const buffer = new Uint8Array(n);
  let i = 0;
  for (const item of encoded) {
    const length = item.byteLength;
    const high = (length & 0xff00) >> 8;
    const low = length & 0xff;

    buffer[i++] = high;
    buffer[i++] = low;
    buffer.set(item, i);

    i += length;
  }

  return buffer;
}

export function unpack(buffer, dec = decoder) {
  const message = [];
  for (let i = 0; i < buffer.byteLength; ) {
    const n = new Uint8Array(buffer.slice(i, i + 2));
    const length = (n[0] << 8) + n[1];

    i += 2;
    message.push(dec.decode(buffer.slice(i, i + length)));
    i += length;
  }
  return message;
}
