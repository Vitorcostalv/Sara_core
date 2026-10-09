import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from "node:crypto";
import { Writable } from "node:stream";
import { createInterface } from "node:readline/promises";

export function sealConfig(config, password) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(password, salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(config), "utf8"), cipher.final()]);
  return { version: 1, salt: salt.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: encrypted.toString("base64") };
}

export function openConfig(vault, password) {
  if (vault.version !== 1) throw new Error("Unsupported vault version");
  const key = scryptSync(password, Buffer.from(vault.salt, "base64"), 32);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(vault.iv, "base64"));
  decipher.setAuthTag(Buffer.from(vault.tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(vault.data, "base64")), decipher.final()]).toString("utf8"));
}

export async function askRecoveryKey() {
  const silent = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
  const input = createInterface({ input: process.stdin, output: silent, terminal: Boolean(process.stdin.isTTY) });
  process.stdout.write("Cole a chave de recuperação e pressione Enter (entrada oculta): ");
  try { return (await input.question("")).trim(); }
  finally { input.close(); process.stdout.write("\n"); }
}
