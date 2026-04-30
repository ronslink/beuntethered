import assert from "node:assert/strict";
import test from "node:test";
import {
  getUploadFilesFromFormData,
  sanitizeAttachmentFilename,
} from "../src/lib/storage.ts";

test("sanitizes uploaded attachment filenames", () => {
  assert.equal(sanitizeAttachmentFilename("../scope evidence final!.pdf"), "scope-evidence-final-.pdf");
  assert.equal(sanitizeAttachmentFilename(""), "attachment");
  assert.equal(sanitizeAttachmentFilename("..."), "attachment");
});

test("extracts upload files from form data", () => {
  const formData = new FormData();
  formData.append("attachments", new File(["hello"], "audit.txt", { type: "text/plain" }));

  const files = getUploadFilesFromFormData(formData, "attachments");

  assert.equal(files.length, 1);
  assert.equal(files[0].name, "audit.txt");
});

test("rejects too many or oversized attachments", () => {
  const tooMany = new FormData();
  for (let i = 0; i < 6; i += 1) {
    tooMany.append("attachments", new File(["x"], `file-${i}.txt`));
  }

  assert.throws(() => getUploadFilesFromFormData(tooMany, "attachments", { maxFiles: 5 }), /Upload up to 5 files/);

  const tooLarge = new FormData();
  tooLarge.append("attachments", new File(["12345"], "large.txt"));

  assert.throws(() => getUploadFilesFromFormData(tooLarge, "attachments", { maxBytes: 4 }), /larger than the 4B limit/);
});
