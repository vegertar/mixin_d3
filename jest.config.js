export default {
  transform: {},
  testEnvironment: "./jest.env.js",
  setupFilesAfterEnv: ["./jest.setup.js"],
  globalSetup: "./jest.global_setup.js",
  globalTeardown: "./jest.global_teardown.js",
};
