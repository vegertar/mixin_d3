export default function () {
  if (process.argv.indexOf("--watch") === -1) {
    global.server_process?.kill();
  }
}
