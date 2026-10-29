const test = require("node:test");
const assert = require("node:assert/strict");

test("health endpoint returns a healthy database status", async () => {
  const response = await fetch("http://localhost:5000/health");

  assert.equal(response.status, 200);

  const body = await response.json();

  assert.equal(body.status, "ok");
  assert.equal(body.database, "connected");
});
