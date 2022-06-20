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

export function mixinD3(base) {
  if (base !== CustomElement && !(base.prototype instanceof CustomElement)) {
    throw new Error(`Require a child class of CustomElement`);
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
    static get observedAttributes() {
      return ["onupdate", ...super.observedAttributes];
    }

    _onupdate = null;
    _changelog = [];
    _data = null;

    get data() {
      if (!this._data) {
        this.data = [];
      }
      return this._data;
    }

    set data(children) {
      if (!Array.isArray(children)) {
        throw new Error(`Should be an array`);
      }

      this.children = children;
      if (isLiteral(children)) {
        // Allow to bind literal array, but any further `get data()`will reset
        // the children. If this is not what you want, try change the property
        // `this.children` directly and call `this.raf(this.update)` to update,
        // or simply use d3 API to operate `this.root`.
        this._data = null;
        this.raf(this.update);
      } else {
        this._data = createProxy(children, (changelogItem) => {
          this._changelog.push(changelogItem);
          this.raf(this.update);
        });
      }
    }

    root = d3.select(this.shadowRoot || this);
    selector = function () {
      return this.childNodes;
    };
    children = null;
    ns = null;
    key = null;
    join = null;
    each = null;
    call = null;

    attributeChangedCallback(name, oldValue, newValue) {
      super.attributeChangedCallback(name, oldValue, newValue);
      if (oldValue === newValue) {
        return;
      }

      switch (name) {
        case "onupdate":
          if (this._onupdate) {
            this.removeEventListener("update", this._onupdate);
            this._onupdate = null;
          }
          if (newValue) {
            this._onupdate = new Function(newValue);
            this.addEventListener("update", this._onupdate);
          }
          break;
      }
    }

    update() {
      const changelog = this._changelog;
      this._changelog = [];
      updateAll(changelog, this);
      this.dispatchEvent(new Event("update"));
    }
  };
}

export function create(d, ns) {
  let tag = d.tag;
  if (ns && tag.indexOf(":") === -1) {
    tag = `${ns}:${tag}`;
  }

  const s = d3.create(tag);
  // remember the initialization datum
  s.node()[__origin__] = d;

  d.__enter__?.(s);
  return s;
}

// grouping changelogs by index
function group(changelog) {
  const changelogs = new Map();
  if (changelog) {
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
    case "svg":
      return document.createElementNS("http://www.w3.org/2000/svg", "text");
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
  const { root, selector, children, key, ns, join, call, each } = config;
  const [onenter, onupdate, onexit] = join || [];

  const changelogs = group(changelog);
  const selection = root
    .selectAll(selector)
    .data(children, key)
    .join(onenter || joinEnter(ns), onupdate, onexit)
    .each(function (d, i, group) {
      replay.apply(this, [config, changelogs, d, i, group]);

      const eachs = d.__each__;
      eachs?.apply(this, arguments);

      const calls = d.__call__;
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
  let indexOfChildren = -1;
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
    if (row && obj[row] !== op[1] && name !== "children") {
      continue;
    }

    // set consecutive children in a batch way
    if (
      (indexOfChildren !== -1 &&
        (k === changed.length - 1 || name !== "children")) ||
      (indexOfChildren === -1 &&
        k === changed.length - 1 &&
        name === "children")
    ) {
      d.children &&
        setChildren(
          { ...config, ...d, root },
          indexOfChildren === -1
            ? [op]
            : changed.slice(indexOfChildren, name === "children" ? k + 1 : k)
        );
      indexOfChildren = -1;
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
        value.children && setChildren({ ...config, ...value, root });
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
      case "children":
        if (indexOfChildren === -1) {
          indexOfChildren = k;
        }
        break;
    }
  }

  if (node !== this) {
    // attach the new node
    this.replaceWith(node);
    group[i] = node;
  }

  if (isUpdatingOnly) {
    d.__update__?.(root);
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
    (props.length === 0 || props[props.length - 1] === "children") &&
    !isNaN(prop)
  );
}

function isAtObject(props) {
  const n = props.length;
  return (
    (n === 2 && !isNaN(props[1])) ||
    (n % 4 === 2 && props[n - 3] === "children" && !isNaN(props[n - 1]))
  );
}

function proxyHandler(onSet, ...props) {
  return {
    get(obj, prop, receiver) {
      if (prop === __origin__) {
        return obj;
      }

      if (props.length === 0 && prop === "updateChildren") {
        return () => {
          // use the trick of trivial change to force updating
          receiver.length = receiver.length;
        };
      }

      if (isAtObject(props)) {
        switch (prop) {
          case "updateChildren":
            return () => {
              // use the trick of trivial change to force updating
              receiver.children.length = receiver.children.length;
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
        }
      }

      obj = getOrigin(obj);
      const value = getOrigin(Reflect.get(obj, prop));

      // use the integer index for the root level accessing
      if (isAtRoot(props, prop)) {
        prop = +prop;
      }
      return typeof value === "object"
        ? new Proxy(value, proxyHandler(onSet, ...props, obj, prop))
        : value;
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

  // placement proxy to avoid allocating new array
  for (let i = 0; i < data.length; ++i) {
    proxy[i] = data[i];
  }

  return proxy;
}

function setChildren(config, ops) {
  const { children } = config;
  if (!children) {
    return;
  }

  let changelog;
  if (!isLiteral(children)) {
    if (!ops) {
      changelog = Array(children.length);
      createProxy(children, (item) => {
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
        // closure parameter `props' of proxyHandler will be ruined and
        // cannot be reused in next get()
        op[0] = props.slice(4);

        if (op[0].length === 0 && op[2] === "children") {
          // a children assignment
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
