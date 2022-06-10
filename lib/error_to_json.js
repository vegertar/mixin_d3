// pruned from https://stackoverflow.com/a/18391400/3581018

const properties = ["code", "name", "message", "stack"];

export function toJSON(error) {
  const alt = {};

  const keys = new Set([...Object.getOwnPropertyNames(error), ...properties]);
  keys.forEach(function (key) {
    const value = error[key];
    if (value !== undefined) {
      alt[key] = value;
    }
  }, error);

  return alt;
}

if (!("toJSON" in Error.prototype)) {
  Object.defineProperty(Error.prototype, "toJSON", {
    value: function () {
      return toJSON(this);
    },
    configurable: true,
    writable: true,
  });
}
