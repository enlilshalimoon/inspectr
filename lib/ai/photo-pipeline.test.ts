// The /try photo pipeline, with a fake model. Proves the image bytes are what
// the model is asked to look at, and that multi-finding, no-defect, and unclear
// replies come back as drafts. No network and no API key.
import { test } from "node:test";
import assert from "node:assert/strict";
import { draftFindingsFromImage, UnsupportedImageError, type PhotoModelCreate } from "./anthropic";

function jpeg(payload: string): Buffer {
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from(payload)]);
}

function reply(body: unknown): Awaited<ReturnType<PhotoModelCreate>> {
  return {
    stop_reason: "end_turn",
    content: [{ type: "text", text: JSON.stringify(body) }],
  };
}

const twoDefects = {
  primary_subject: "electrical panel and water heater",
  evidence: "An open knockout and rust on the fittings are both in the photo.",
  result: "defect",
  findings: [
    {
      section: "water_heater",
      severity: "minor_repair",
      title: "Corrosion at supply fittings",
      description: "Rust is visible on the supply fittings.",
      recommended_action: "Recommend a licensed plumber evaluate and repair.",
      confidence: 0.7,
    },
    {
      section: "electrical",
      severity: "safety_hazard",
      title: "Open knockout in the panel",
      description: "A panel knockout is open.",
      recommended_action: "Recommend a licensed electrician evaluate and repair.",
      confidence: 0.9,
    },
  ],
};

test("draftFindingsFromImage sends this photo's bytes to the model", async () => {
  const buf = jpeg("the-actual-inspection-photo");
  let seen: Parameters<PhotoModelCreate>[0] | undefined;
  const create: PhotoModelCreate = async (params) => {
    seen = params;
    return reply(twoDefects);
  };

  const out = await draftFindingsFromImage(buf, create);

  assert.ok(seen);
  assert.equal(seen.temperature, 0);
  assert.match(String(seen.system), /no_defect/);
  assert.match(String(seen.system), /distinct defect/);
  const content = seen.messages[0].content;
  assert.ok(Array.isArray(content));
  const image = content.find((block) => block.type === "image");
  assert.ok(image && image.type === "image");
  assert.equal(image.source.type, "base64");
  assert.equal(image.source.media_type, "image/jpeg");
  assert.equal(image.source.data, buf.toString("base64"));
  assert.notEqual(image.source.data, jpeg("some-other-photo").toString("base64"));

  assert.equal(out.result, "defect");
  assert.equal(out.findings.length, 2);
  assert.equal(out.findings[0].title, "Open knockout in the panel");
  assert.equal(out.findings[1].section, "water_heater");
});

test("a no-defect reply is one info draft and still saw the photo", async () => {
  const buf = jpeg("serviceable-nameplate");
  let imageData = "";
  const out = await draftFindingsFromImage(buf, async (params) => {
    const content = params.messages[0].content;
    assert.ok(Array.isArray(content));
    const image = content.find((block) => block.type === "image");
    assert.ok(image && image.type === "image");
    assert.equal(image.source.type, "base64");
    if (image.source.type !== "base64") return reply({ result: "unclear", findings: [] });
    imageData = image.source.data;
    return reply({
      result: "no_defect",
      evidence: "The data plate is readable and the cabinet looks intact.",
      findings: [
        {
          section: "hvac",
          severity: "major_repair",
          title: "Air handler: no defect visible in photo",
          description: "The air handler cabinet and data plate show no visible defect.",
          recommended_action: "Replace the unit.",
          confidence: 0.8,
        },
      ],
    });
  });

  assert.equal(imageData, buf.toString("base64"));
  assert.equal(out.result, "no_defect");
  assert.equal(out.findings.length, 1);
  assert.equal(out.findings[0].severity, "info");
  assert.equal(out.findings[0].recommended_action, "");
  assert.match(out.findings[0].title, /no defect visible/);
});

test("an unclear reply is one info draft", async () => {
  const out = await draftFindingsFromImage(jpeg("blur"), async () =>
    reply({
      result: "unclear",
      evidence: "The frame is a grey blur with no readable component.",
      findings: [
        {
          section: "interior",
          severity: "monitor",
          title: "Photo unclear",
          description: "The photo is too blurry to judge. A closer, lit photo would settle it.",
          recommended_action: "Recommend a structural engineer evaluate.",
          confidence: 0.2,
        },
      ],
    }),
  );

  assert.equal(out.result, "unclear");
  assert.equal(out.findings.length, 1);
  assert.equal(out.findings[0].severity, "info");
  assert.equal(out.findings[0].recommended_action, "");
});

test("an unreadable file never reaches the model", async () => {
  const heic = Buffer.alloc(16);
  heic.write("ftyp", 4, "latin1");
  heic.write("heic", 8, "latin1");
  let called = false;
  await assert.rejects(
    () =>
      draftFindingsFromImage(heic, async () => {
        called = true;
        return reply({ result: "defect", findings: [] });
      }),
    (err: unknown) => err instanceof UnsupportedImageError && /HEIC/.test(err.message),
  );
  assert.equal(called, false);
});

test("a reply cut off at the token limit is an error, not a finding", async () => {
  await assert.rejects(
    () =>
      draftFindingsFromImage(jpeg("cut-off"), async () => ({
        stop_reason: "max_tokens",
        content: [{ type: "text", text: '{"result":"defect","title":"partial' }],
      })),
    /cut off at max_tokens/,
  );
});
