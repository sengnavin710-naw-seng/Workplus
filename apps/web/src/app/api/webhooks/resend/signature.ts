import { createHmac, timingSafeEqual } from "node:crypto";

const webhookTimestampToleranceSeconds = 5 * 60;

export function verifyResendSignature({
  payload,
  secret,
  signature,
  svixId,
  timestamp,
}: {
  payload: string;
  secret: string;
  signature: string;
  svixId: string;
  timestamp: string;
}) {
  const timestampSeconds = Number(timestamp);
  if (!Number.isInteger(timestampSeconds)) return false;
  if (
    Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) >
    webhookTimestampToleranceSeconds
  )
    return false;

  const encodedSecret = secret.startsWith("whsec_")
    ? secret.slice("whsec_".length)
    : secret;
  const expectedSignature = createHmac(
    "sha256",
    Buffer.from(encodedSecret, "base64"),
  )
    .update(`${svixId}.${timestamp}.${payload}`)
    .digest("base64");

  return signature.split(" ").some((versionedSignature) => {
    const [version, actualSignature] = versionedSignature.split(",", 2);
    if (version !== "v1" || !actualSignature) return false;

    const expected = Buffer.from(expectedSignature);
    const actual = Buffer.from(actualSignature);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  });
}
