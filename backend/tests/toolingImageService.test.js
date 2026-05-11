const fs = require("fs");
const path = require("path");

const { saveToolingItemImage } = require("../src/services/toolingImageService");

describe("tooling image service", () => {
  const createdFiles = [];

  afterEach(() => {
    createdFiles.splice(0).forEach((imageUrl) => {
      const absolutePath = path.join(__dirname, "..", imageUrl.replace(/^\/images\//, "images/"));
      if (fs.existsSync(absolutePath)) {
        fs.rmSync(absolutePath);
      }
    });
  });

  test("stores uploaded item images under backend images tooling items", async () => {
    const result = await saveToolingItemImage({
      fileName: "Bearing 6204.png",
      mimeType: "image/png",
      data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lwkx7QAAAABJRU5ErkJggg=="
    });
    createdFiles.push(result.imageUrl);

    expect(result.imageUrl).toMatch(/^\/images\/tooling\/items\/bearing-6204-[a-f0-9]+\.png$/);
    expect(fs.existsSync(path.join(__dirname, "..", result.imageUrl.replace(/^\/images\//, "images/")))).toBe(true);
  });

  test("rejects unsupported image types", async () => {
    await expect(saveToolingItemImage({
      fileName: "readme.txt",
      mimeType: "text/plain",
      data: "SGVsbG8="
    })).rejects.toMatchObject({
      statusCode: 400,
      message: "Only jpg, png, and webp images are allowed"
    });
  });
});
