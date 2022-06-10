import { toJSON } from "./lib/error_to_json.js";
import "./lib/string_hash_code.js";
import { unpack } from "./lib/packet.js";
import Muuri from "./node_modules/muuri/dist/muuri.module.js";

// to be used in iframe content
window.toJSON = toJSON;

const magic = "urltract";
const grid = new Muuri("body", {
  items: ".container",
});

var ws;
var counter = 0;

function connect() {
  ws = new WebSocket(`ws://${location.host}`);

  ws.addEventListener("open", function () {
    console.log("WS connected");
  });

  ws.addEventListener("message", async function (event) {
    const buffer = await event.data.arrayBuffer();
    handleMessage(unpack(buffer));
  });

  ws.addEventListener("close", (e) => {
    console.log(
      "Socket is closed. Reconnect will be attempted in 1 second.",
      e.reason
    );
    setTimeout(connect, 1000);
  });
}

function handleMessage([type, ...data]) {
  switch (type) {
    case "html":
      return handleHtml(...data);
    case "script":
      return handleScript(...data);
  }
}

function className(id) {
  return `_${id.hashCode()}`;
}

function handleHtml(id, html) {
  let loaded = true;
  let iframe = document.querySelector(`.${className(id)}`);
  if (!iframe) {
    loaded = false;
    iframe = document.createElement("iframe");
    iframe.className = className(id);
  }

  iframe.setAttribute("srcdoc", html);

  if (!loaded) {
    iframe.addEventListener("load", function () {
      window.parent.postMessage({ magic, type: "html", id, result: "load" });
    });

    const container = document.createElement("div");
    container.className = "container";

    const h3 = document.createElement("h3");
    h3.textContent = id;

    container.appendChild(h3);
    container.appendChild(iframe);
    grid.add(container);

    const observer = new ResizeObserver(() => {
      grid.refreshItems();
      grid.layout();
    });
    observer.observe(container);
  }
}

function handleScript(id, script) {
  const iframe = document.querySelector(`.${className(id)}`);
  if (!iframe) {
    window.postMessage({
      magic,
      id,
      type: "script",
      error: new Error(`Not Found Document: ${id}`),
    });
    return;
  }

  const [func, ...params] = JSON.parse(script);
  const paramName = `params${++counter}`;
  iframe.contentWindow[paramName] = params;

  const element = document.createElement("script");
  element.type = "module";
  element.textContent = `
    const data = {magic: "${magic}", type: "script", id: "${id}"};
    const toJSON = window.parent.toJSON;

    try {
      const result = (${func})(...${paramName});
      if (result instanceof Promise) {
        result
          .then(result => 
            window.parent.postMessage({...data, result}))
          .catch(error => 
            window.parent.postMessage({...data, error: toJSON(error)}))
      } else {
        window.parent.postMessage({...data, result});
      }
    } catch (error) {
      window.parent.postMessage({...data, error: toJSON(error)});
    }
  `;
  iframe.contentDocument.head.append(element);
}

connect();

window.addEventListener("message", (event) => {
  if (event.data.magic === magic) {
    ws.send(JSON.stringify(event.data));
  }
});
