const request = require("supertest");
const app = require("../src/app");

describe("static image assets", () => {
  test("serves tooling feature images from the backend images folder", async () => {
    const response = await request(app).get("/images/tooling/bearing-6204.jpg").expect(200);

    expect(response.headers["content-type"]).toMatch(/^image\//);
    expect(Number(response.headers["content-length"] || response.body.length)).toBeGreaterThan(1000);
  });
});
