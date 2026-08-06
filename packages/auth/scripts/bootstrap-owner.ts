import { closeDatabaseConnection, db, schema } from "@repo/db";
import { hashPassword } from "better-auth/crypto";
import { createInterface } from "node:readline/promises";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readHidden(label: string): Promise<string> {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("ต้องรันคำสั่งนี้จาก terminal ที่รองรับการกรอกรหัสผ่านแบบซ่อน");
  }

  process.stdout.write(label);
  process.stdin.setEncoding("utf8");
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return new Promise((resolve, reject) => {
    let value = "";

    const finish = (error?: Error) => {
      process.stdin.removeListener("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");

      if (error) reject(error);
      else resolve(value);
    };

    const onData = (chunk: string | Buffer) => {
      for (const character of chunk.toString()) {
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }

        if (character === "\u0003") {
          finish(new Error("ยกเลิกการสร้าง Owner"));
          return;
        }

        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
          continue;
        }

        if (character >= " ") value += character;
      }
    };

    process.stdin.on("data", onData);
  });
}

async function main() {
  console.log("สร้างบัญชี Owner คนแรก (รหัสผ่านจะไม่แสดงบนหน้าจอและไม่ถูกบันทึกในไฟล์)");

  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const name = (await prompt.question("ชื่อ Owner: ")).trim();
  const email = (await prompt.question("อีเมล Owner: ")).trim().toLowerCase();
  const organizationName = (await prompt.question("ชื่อองค์กร: ")).trim();
  const organizationSlug = (await prompt.question("รหัสองค์กร เช่น acme-company: ")).trim().toLowerCase();
  prompt.close();

  if (!name || !organizationName) throw new Error("ชื่อ Owner และชื่อองค์กรห้ามว่าง");
  if (!emailPattern.test(email)) throw new Error("รูปแบบอีเมลไม่ถูกต้อง");
  if (!slugPattern.test(organizationSlug)) {
    throw new Error("รหัสองค์กรใช้ได้เฉพาะ a-z, 0-9 และขีดกลาง โดยห้ามขึ้นต้นหรือลงท้ายด้วยขีดกลาง");
  }

  const password = await readHidden("รหัสผ่าน (อย่างน้อย 8 ตัวอักษร): ");
  const passwordConfirmation = await readHidden("ยืนยันรหัสผ่าน: ");

  if (password.length < 8 || password.length > 128) {
    throw new Error("รหัสผ่านต้องมีความยาวระหว่าง 8 ถึง 128 ตัวอักษร");
  }
  if (password !== passwordConfirmation) throw new Error("รหัสผ่านทั้งสองครั้งไม่ตรงกัน");

  const passwordHash = await hashPassword(password);

  await db.transaction(async (transaction) => {
    const existingUsers = await transaction.select({ id: schema.users.id }).from(schema.users).limit(1);
    if (existingUsers.length > 0) {
      throw new Error("ฐานข้อมูลมีผู้ใช้อยู่แล้ว คำสั่ง bootstrap ใช้ได้เฉพาะตอนสร้าง Owner คนแรก");
    }

    const userId = crypto.randomUUID();
    const organizationId = crypto.randomUUID();

    await transaction.insert(schema.users).values({
      id: userId,
      name,
      email,
      emailVerified: false,
    });
    await transaction.insert(schema.accounts).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
    });
    await transaction.insert(schema.organizations).values({
      id: organizationId,
      name: organizationName,
      slug: organizationSlug,
    });
    await transaction.insert(schema.organizationMembers).values({
      id: crypto.randomUUID(),
      organizationId,
      userId,
      role: "owner",
    });
  });

  console.log("สร้าง Owner และองค์กรเรียบร้อยแล้ว สามารถใช้บัญชีนี้เข้าสู่ระบบได้");
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
  console.error(`ไม่สามารถสร้าง Owner: ${message}`);
  process.exitCode = 1;
} finally {
  await closeDatabaseConnection();
}
