import { CustomElement } from "./custom_element.js";

var d3 = window.d3;

const __index__ = Symbol("__index__");
const __origin__ = Symbol("__origin__");

function getOrigin(value) {
  const t = value?.[__origin__];
  return !t ? value : getOrigin(t);
}

function isLiteral(children) {
  return children.length && typeof children[0] !== "object";
}

function childNodes(include, names) {
  const set = new Set(names.map((d) => d.toUpperCase()));
  return function () {
    const results = Array(this.childNodes.length);
    let n = 0;
    for (const node of this.childNodes) {
      const had = set.has(node.nodeName);
      if ((include && had) || (!include && !had)) {
        results[n++] = node;
      }
    }
    results.length = n;
    return results;
  };
}

export function excludeChildNodes(...excludes) {
  return childNodes(false, excludes);
}

export function includeChildNodes(...includes) {
  return childNodes(true, includes);
}

export function mixinD3(base) {
  if (base !== CustomElement && !(base.prototype instanceof CustomElement)) {
    throw new Error(`Required a sub-class of CustomElement`);
  }

  if (arguments[1]) {
    if (d3 && d3 !== arguments[1]) {
      throw new Error(
        "The provided d3 parameter is used IFF the d3 module is unavailable under global scope."
      );
    }
    d3 = arguments[1];
  }

  return class extends base {
    _changelog = [];
    _data = null;

    sync = false;
    root = d3.select(this.shadowRoot || this);
    selector = excludeChildNodes(
      "link",
      "style",
      "script",
      "foreignObject",
      "slot"
    );
    // allow to use .data[0] directly before mounting
    data = [];
    ns = null;
    key = null;
    join = null;
    each = null;
    call = null;

    connectedCallback() {
      super.connectedCallback();
      const data = this.data;

      // defining data setter/getter after mounted to avoid incorrect uses
      Object.defineProperty(this, "data", {
        get() {
          if (!this._data) {
            this.data = [];
          }
          return this._data;
        },

        set(children) {
          if (!Array.isArray(children)) {
            throw new Error(`Should be an array, got ${typeof children}`);
          }

          this._data = createProxy(children, (changelogItem) => {
            this._changelog.push(changelogItem);
            this.dispatch();
          });
        },
      });

      if (data) {
        this.data = data;
      }
    }

    dispatch() {
      if (this.sync) {
        this.update();
      } else {
        this.updateAsync();
      }
    }

    update() {
      const changelog = this._changelog;
      this._changelog = [];
      updateAll(changelog, this);
    }

    updateAsync() {
      this.raf(this.update);
    }
  };
}

export function create(d, ns) {
  let s;

  let tag = d.tag;
  if (tag) {
    if (ns && tag.indexOf(":") === -1) {
      tag = `${ns}:${tag}`;
    }

    s = d3.create(tag);
  } else {
    s = d3.select(createLiteralNode(d.text, ns));
  }

  // remember the initialization datum
  s.node()[__origin__] = d;

  d.$enter?.(s);
  return s;
}

// grouping changelogs by index
function group(changelog) {
  const changelogs = new Map();
  for (const op of changelog) {
    const props = op[0];
    const index = props.length === 0 ? op[2] : props[1];
    const ops = changelogs.get(index);

    if (!ops) {
      changelogs.set(index, [op]);
    } else {
      ops.push(op);
    }
  }
  return changelogs;
}

function applyCall(call, selection) {
  if (Array.isArray(call)) {
    call.length && call[0](selection, ...call.slice(1));
  } else if (typeof call === "function") {
    call(selection);
  }
}

function createLiteralNode(d, ns) {
  switch (ns) {
    case "svg": {
      const n = document.createElementNS("http://www.w3.org/2000/svg", "text");
      n.textContent = d;
      return n;
    }
    default:
      return document.createTextNode(d);
  }
}

function joinEnter(ns) {
  return (enter) =>
    enter.append((d) =>
      typeof d !== "object" ? createLiteralNode(d, ns) : create(d, ns).node()
    );
}

// It's not recommended to update from here when size of changelog
// are far more less than config.data.length
function updateAll(changelog, config) {
  const { root, selector, data, key, ns, join, call, each } = config;
  const [onenter, onupdate, onexit] = join || [];

  const changelogs = changelog ? group(changelog) : null;
  const selection = root
    .selectAll(selector)
    .data(getOrigin(data), key)
    .join(onenter || joinEnter(ns), onupdate, onexit)
    .each(function (d, i, group) {
      if (changelogs) {
        replay.apply(this, [config, changelogs, d, i, group]);
      }

      const eachs = d.$each;
      eachs?.apply(this, arguments);

      const calls = d.$call;
      calls && applyCall(calls, d3.select(this));

      each?.apply(this, arguments);
    });

  call && applyCall(call, selection);
}

function replay(config, changelogs, d, i, group) {
  const index = d[__index__];
  const changed = changelogs.get(index);
  if (!changed) {
    return;
  }

  let root = d3.select(this);
  let node = this;
  let indexOfData = -1;
  let isUpdatingOnly = true;

  for (let k = 0; k < changed.length; ++k) {
    const op = changed[k];
    const props = op[0];

    let name, obj, row, column, value;

    if (props.length === 0) {
      // this is a reset
      value = op[3];
      const datum = value[__origin__];
      // either an old reset or not the newly created one
      if (!config.key && (datum !== d || node[__origin__] !== d)) {
        root = create(datum, config.ns);
        node = root.node();
        // attach datum
        root.datum(datum);
      }
    } else if (props.length === 2) {
      name = op[2];
      obj = op[3];
    } else {
      [/* data, index, datum, */ name, obj, row] = props.slice(3);
      column = op[2];
      value = op[3];
    }

    // prevent updating from deep level assignment,
    // e.g. foo.data[1].properties[0][1][0][1] = 2;
    if (row && obj[row] !== op[1] && name !== "data") {
      continue;
    }

    // set consecutive data in a batch way
    if (
      (indexOfData !== -1 && (k === changed.length - 1 || name !== "data")) ||
      (indexOfData === -1 && k === changed.length - 1 && name === "data")
    ) {
      d.data &&
        setData(
          { ...config, ...d, root },
          indexOfData === -1
            ? [op]
            : changed.slice(indexOfData, name === "data" ? k + 1 : k)
        );
      indexOfData = -1;
    }

    switch (name) {
      case undefined:
        isUpdatingOnly = false;
        setAttrs(root, value.attrs);
        setProperties(root, value.properties);
        setStyles(root, value.styles);
        setEvents(root, value.events);
        setText(root, value.text);
        setTransitions(root, value.transitions);
        value.data && setData({ ...config, ...value, root });
        break;
      case "$$":
        setDollars(root, obj);
        break;
      case "text":
        setText(root, obj);
        break;
      case "attrs":
        setAttrs(root, obj, row, column, value);
        break;
      case "styles":
        setStyles(root, obj, row, column, value);
        break;
      case "properties":
        setProperties(root, obj, row, column, value);
        break;
      case "events":
        setEvents(root, obj, row, column, value);
        break;
      case "transitions":
        setTransitions(root, obj, row, column, value);
        break;
      case "data":
        if (indexOfData === -1) {
          indexOfData = k;
        }
        break;
      default:
        break;
    }
  }

  if (node !== this) {
    // attach the new node
    this.replaceWith(node);
    group[i] = node;
  }

  if (isUpdatingOnly) {
    d.$update?.(root);
  }
}

function setField(obj, row, column, value, fn) {
  if (row === undefined && column === undefined) {
    forEach(obj, fn);
  } else if (row === undefined) {
    fn(column, value);
  } else if (!isNaN(row) && +column === 1) {
    fn(obj[row][0], value);
  }
}

function setDollars(s, [name, ...args]) {
  s.node()[name]?.(...args);
}

function setAttrs(s, obj, row, column, value) {
  setField(obj, row, column, value, (...args) => s.attr(...args));
}

function setProperties(s, obj, row, column, value) {
  setField(obj, row, column, value, (...args) => s.property(...args));
}

function setStyles(s, obj, row, column, value) {
  setField(obj, row, column, value, (...args) => s.style(...args));
}

function setEvents(s, obj, row, column, value) {
  setField(obj, row, column, value, (...args) => s.on(...args));
}

function setTransitions(root, obj) {
  if (!obj) {
    return;
  }

  if (!Array.isArray(obj)) {
    throw new Error(`Transitions require an array of transition configs`);
  }

  let created = false;
  let t = null;
  for (const config of obj) {
    if (
      typeof config === "string" ||
      config === undefined ||
      config === null ||
      config instanceof d3.transition
    ) {
      created = true;
      t = root.transition(config);
      continue;
    }

    if (!t) {
      t = root.transition();
    } else if (created) {
      created = false;
    } else {
      t = t.transition();
    }

    forEach(config, (k, v, ...x) => {
      switch (k) {
        case "text":
          setText(t, v);
          break;
        case "attrs":
          setAttrs(t, v);
          break;
        case "styles":
          setStyles(t, v);
          break;
        case "events":
          setEvents(t, v);
          break;
        case "tweens":
          forEach(v, (...args) => t.tween(...args));
          break;
        default:
          t = t[k](v, ...x);
          break;
      }
    });
  }
}

function isAtRoot(props, prop) {
  return (
    (props.length === 0 || props[props.length - 1] === "data") && !isNaN(prop)
  );
}

function isAtObject(props) {
  const n = props.length;
  return (
    (n === 2 && !isNaN(props[1])) ||
    (n % 4 === 2 && props[n - 3] === "data" && !isNaN(props[n - 1]))
  );
}

function proxyHandler(onSet, ...props) {
  return {
    get(obj, prop, receiver) {
      if (prop === __origin__) {
        return obj;
      }

      if (props.length === 0 && prop === "touch") {
        return () => {
          // use the trick of trivial change to force updating
          receiver.length = receiver.length;
        };
      }

      if (isAtObject(props)) {
        switch (prop) {
          case "touch":
            return () => {
              // use the trick of trivial change to force updating
              receiver.data.length = receiver.data.length;
            };
          case "text":
            return (v) => {
              receiver.text = v;
              return receiver;
            };
          case "join":
            return (...funcs) => {
              receiver.join = funcs;
              return receiver;
            };
          case "each":
            return (f) => {
              receiver.each = f;
              return receiver;
            };
          case "call":
            return (f, ...args) => {
              receiver.call = [f, ...args];
              return receiver;
            };
          case "attr":
            return (...args) => {
              receiver.attrs = [args];
              return receiver;
            };
          case "property":
            return (...args) => {
              receiver.properties = [args];
              return receiver;
            };
          case "style":
            return (...args) => {
              receiver.styles = [args];
              return receiver;
            };
          case "on":
            return (...args) => {
              receiver.events = [args];
              return receiver;
            };
          case "transition":
            const transitions = [];
            receiver.transitions = transitions;

            const transition = (name) => {
              name && transitions.push(name);
              transitions.push([]);
              return new Proxy(
                {},
                {
                  get(_obj2, prop2, receiver2) {
                    return prop2 === "transition"
                      ? transition
                      : (...args) => {
                          transitions[transitions.length - 1].push([
                            prop2,
                            ...args,
                          ]);
                          return receiver2;
                        };
                  },
                  set() {
                    throw new Error("Disabled function");
                  },
                }
              );
            };
            return transition;
          case "$":
            return (...args) => {
              receiver.$$ = args;
              return receiver;
            };
          default:
            break;
        }
      }

      obj = getOrigin(obj);
      const value = getOrigin(Reflect.get(obj, prop));

      if (typeof value !== "object") {
        return value;
      }

      // use the integer index for the root level accessing
      if (isAtRoot(props, prop)) {
        prop = +prop;
      }

      return new Proxy(value, proxyHandler(onSet, ...props, obj, prop));
    },
    set(obj, prop, value) {
      obj = getOrigin(obj);
      value = getOrigin(value);

      if (Reflect.set(obj, prop, value)) {
        // use the integer index for the root level accessing
        if (typeof value === "object" && isAtRoot(props, prop)) {
          prop = +prop;
          // remember the initialization index
          Reflect.set(value, __index__, prop);
          // use a light copy to prevent overwriting from immediately settings
          value = { ...value, [__origin__]: value };
        }

        onSet([props, obj, prop, value]);
        return true;
      }
      return false;
    },
    deleteProperty() {
      throw new Error(`Not supported yet`);
    },
  };
}

function createProxy(data, onSet) {
  const proxy = new Proxy(data, proxyHandler(onSet));

  if (!isLiteral(data)) {
    // placement proxy to avoid allocating new array
    for (let i = 0; i < data.length; ++i) {
      proxy[i] = data[i];
    }
  }

  return proxy;
}

function setData(config, ops) {
  const data = getOrigin(config.data);
  if (!data) {
    return;
  }

  let changelog;
  if (!isLiteral(data)) {
    if (!ops) {
      changelog = Array(data.length);
      createProxy(data, (item) => {
        const index = item[2];
        changelog[index] = item;
      });
    } else {
      changelog = ops;
      for (let i = 0, n = ops.length; i < n; ++i) {
        const op = ops[i];
        const props = op[0];

        // Remove the up level props.
        // Pay attention that we cannot use shift() in here otherwise the
        // closure parameter `props` of proxyHandler will be ruined and
        // cannot be reused in next get()
        op[0] = props.slice(4);

        if (op[0].length === 0 && op[2] === "data") {
          changelog.splice(i--, 1, ...Array(op[3].length));
          createProxy(op[3], (item) => {
            changelog[++i] = item;
          });
        }
      }
    }
  }

  updateAll(changelog, config);
}

function setText(s, text) {
  if (text !== undefined) {
    s.text(text);
  }
}

function forEach(obj, fn) {
  if (!obj) {
    return;
  }

  if (Array.isArray(obj)) {
    for (const args of obj) {
      fn(...args);
    }
  } else {
    for (const name in obj) {
      fn(name, obj[name]);
    }
  }
}

export const MixinD3 = mixinD3(CustomElement);
