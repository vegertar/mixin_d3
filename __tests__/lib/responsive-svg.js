test("responsive svg", async () => {
  await useHtml({ flex: 1, width: "unset", height: "unset" });
  await useScript(async () => {
    await import("/lib/responsive-svg.js");
    document.body.innerHTML = `
    <style>
      body {
        display: flex;
      }

      svg {
        background: rgba(255,255,255,.1);
      }
    </style>
    <responsive-svg viewBox="0,0,400,100">
      <svg viewBox="0,0,400,100">
        <rect width="400" height="100" fill="none" stroke="red"></rect>
      </svg>
    </responsive-svg>
    <responsive-svg viewBox="0,0,100,400">
      <svg viewBox="0,0,100,400">
        <rect width="100" height="400" fill="none" stroke="red"></rect>
      </svg>
    </responsive-svg>
  `;
  });
});
