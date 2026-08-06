# Mission: ดูแลฐานข้อมูล Workforce Platform อย่างปลอดภัย

## Why
ผู้ใช้ต้องการตรวจสอบโครงสร้างและข้อมูลของ Workforce Platform ด้วยตนเอง เพื่อพัฒนาและแก้ปัญหาได้โดยไม่แก้ไขหรือลบข้อมูลสำคัญโดยไม่ตั้งใจ

## Success looks like
- เปิด Drizzle Studio และบอกได้ว่ากำลังดู database, schema, table หรือ row
- ตรวจสอบตารางและข้อมูลด้วยการอ่านอย่างปลอดภัย
- รู้ว่าเมื่อใดควรใช้ `bun db:push` และเมื่อใดไม่ควรแก้ schema ผ่าน Studio

## Constraints
- ใช้ Bun และเครื่องมือที่มีอยู่ใน monorepo
- ไม่เปิดเผย credential จาก `.env`
- เริ่มจาก PostgreSQL และ Drizzle Studio ระดับพื้นฐาน

## Out of scope
- การออกแบบฐานข้อมูลขั้นสูงและ performance tuning
- Production migration, backup, replication และ disaster recovery
