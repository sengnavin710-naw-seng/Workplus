# Workplus Login UX/UI Plan

เอกสารนี้เป็นแผนปรับหน้า Login ของ Workplus โดยใช้ [DESIGN.md](../DESIGN.md) เป็น design system หลัก และใช้ภาพอ้างอิงเฉพาะด้านโครงสร้างกับลำดับสายตา ไม่คัดลอกสี ฟอนต์ โลโก้ หรือองค์ประกอบตกแต่งจากภาพ

## 1. เป้าหมาย

- ทำให้หน้า Login มี form card กลางหน้าจอคล้ายภาพอ้างอิง
- ใช้สี typography spacing radius และ elevation จาก `DESIGN.md` เท่านั้น
- ทำให้การเข้าสู่ระบบของ Workspace Owner/Admin เป็นงานหลักเพียงอย่างเดียว
- รักษาความแตกต่างระหว่าง web account กับ employee device enrollment
- ใช้ข้อความที่ผู้ใช้เห็นเป็นภาษาอังกฤษทั้งหมด
- ไม่แสดงฟีเจอร์ authentication ที่ระบบยังไม่รองรับ

## 2. Design System ที่ต้องยึด

### สี

| หน้าที่ | Token จาก `DESIGN.md` | ค่า |
| --- | --- | --- |
| พื้นหลังหน้า | `colors.canvas` | `#fdfbfa` |
| พื้นผิว card | `colors.canvas-raised` | `#fdfbfa` |
| ข้อความหลัก | `colors.ink` | `#27251e` |
| เส้นขอบหลัก | `colors.border-medium` | `#271a00` |
| เส้นแบ่งและขอบแบบเบา | `colors.surface-soft` | `#dedbd4` |
| สี action และ focus | `colors.primary` | `#016a71` |
| สี hover ของ action | `colors.primary-soft` | `#01838c` |
| ข้อความบนปุ่มหลัก | `colors.on-primary` | `#fdfbfa` |
| ข้อความ error | `colors.negative` | `#a23544` |

กฎสำคัญ:

- ไม่ใช้พื้นหลังขาวล้วนหรือ cool gray
- ไม่เพิ่ม purple, blue หรือ gradient จากภาพอ้างอิง
- ใช้ teal เฉพาะ primary action, link สำคัญ และ focus ring
- ไม่ใช้สี accent ที่สอง

### Typography

`pplxSans` เป็น proprietary font จึงใช้ fallback ที่ `DESIGN.md` แนะนำ:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
```

หน้า Login จะใช้:

| ส่วน | Token | ขนาด/น้ำหนัก |
| --- | --- | --- |
| Workplus wordmark | ปรับจาก `wordmark-display` | 48–64px / 500 / lowercase |
| หัวข้อ | `heading-md` | 22px / 500 |
| คำอธิบาย | `body-md` | 14px / 400 |
| Label | `label-md` | 14px / 500 |
| Input | `body-md` | 14px / 400 |
| Button | `button-md` | 16px / 500 |
| หมายเหตุ | `caption` | 12px / 400 |

กฎสำคัญ:

- ไม่ใช้ font weight 600 หรือ 700
- ไม่ใช้ตัวพิมพ์ใหญ่เป็น wordmark
- ไม่เพิ่ม serif หรือ monospace
- ใช้ spacing และ weight สร้าง hierarchy แทนการทำข้อความหนามาก

### Shape และ elevation

- Form card: `rounded.lg` หรือ 12px
- Input: `rounded.md` หรือ 8px
- Primary action: `rounded.pill` หรือ 9999px
- Card ใช้เส้นขอบ `surface-soft` 1px
- ไม่ใช้ drop shadow
- ใช้ tonal contrast ระหว่าง cream, stone และ teal แทนเงา

## 3. การแปลงภาพอ้างอิงเป็น Workplus

### สิ่งที่นำมาใช้

- Login card อยู่กลางหน้าจอ
- Brand อยู่ด้านบนของ card
- หัวข้อและคำอธิบายสั้นก่อนเริ่ม form
- Email และ Password เรียงตามลำดับแนวตั้ง
- Primary action กว้างเต็ม form
- Signup link อยู่ส่วนท้าย
- มีพื้นที่ว่างรอบ form มากพอให้จุดสนใจชัด

### สิ่งที่ไม่ใช้

- พื้นหลังทรงกลม gradient สีม่วง–ฟ้า
- Tutorial headline และปุ่มลูกศรด้านนอก form
- Google และ Apple login จนกว่า Better Auth provider จะถูกตั้งค่าจริง
- Forgot password จนกว่าจะมี reset route และ email delivery
- Remember me จนกว่าจะกำหนด session-duration behavior
- Logo และชื่อผลิตภัณฑ์จากภาพอ้างอิง

## 4. โครงสร้างหน้าเป้าหมาย

```text
┌──────────────────────────────────────────────────────────┐
│                      cream canvas                        │
│                                                          │
│                       workplus                           │
│              ┌────────────────────────────┐              │
│              │ Welcome back               │              │
│              │ Sign in to manage your     │              │
│              │ Workplus workspace.        │              │
│              │                            │              │
│              │ Email                      │              │
│              │ [ you@company.com        ] │              │
│              │                            │              │
│              │ Password            Show   │              │
│              │ [ •••••••••••••••       ] │              │
│              │                            │              │
│              │ [       Sign in          ] │              │
│              │                            │              │
│              │ New to Workplus?           │              │
│              │ Create a workspace         │              │
│              └────────────────────────────┘              │
│                                                          │
│  Employees using an enrolled device do not need a        │
│  web account.                                            │
└──────────────────────────────────────────────────────────┘
```

## 5. English UI Copy

- Wordmark: `workplus`
- Page title: `Welcome back`
- Description: `Sign in to manage your Workplus workspace.`
- Email label: `Email`
- Email placeholder: `you@company.com`
- Password label: `Password`
- Password actions: `Show` / `Hide`
- Submit button: `Sign in`
- Loading button: `Signing in…`
- Signup prompt: `New to Workplus?`
- Signup link: `Create a workspace`
- Boundary note: `Employees using an enrolled device do not need a web account.`
- Invalid credentials: `We couldn't sign you in. Check your email and password and try again.`
- Server error: `Workplus couldn't reach the server. Please try again.`

ข้อความ error ต้องไม่เปิดเผยว่า email ใดมีบัญชีอยู่จริง

## 6. Interaction States

### Default

- Card ใช้ cream canvas และ hairline border
- Primary button เป็น teal pill
- Input ใช้ dark cocoa border โดยไม่มี shadow

### Hover

- Primary button เปลี่ยนจาก `primary` เป็น `primary-soft`
- Secondary link ใช้ teal และมี underline ที่มองเห็นได้

### Focus

- Input และ interactive elements ใช้ focus ring สี `primary`
- Focus ring ต้องมองเห็นได้ด้วย keyboard
- ห้ามเอา outline ออกโดยไม่มีสิ่งทดแทน

### Password visibility

- Show/Hide เป็นปุ่มจริงและใช้งานด้วย keyboard ได้
- การเปลี่ยน visibility ต้องไม่ล้างค่า password หรือทำ focus หลุด

### Submitting

- ปิดปุ่มชั่วคราวเพื่อป้องกันการ submit ซ้ำ
- ขนาดปุ่มต้องไม่เปลี่ยนเมื่อข้อความเป็น `Signing in…`
- ประกาศสถานะให้ screen reader ทราบ

### Error

- แสดงข้อความใกล้ form ก่อนปุ่ม submit
- ใช้ `colors.negative` ร่วมกับข้อความ ไม่ใช้สีอย่างเดียว
- เก็บ email และ password ที่กรอกไว้เพื่อให้แก้ไขได้
- ใช้ `role="alert"` หรือ live region ที่เหมาะสม

### Success

- Workspace ที่มีอยู่แล้วไป `/dashboard`
- Account ที่ยังไม่มี Workspace ไป `/onboarding`

## 7. Responsive Plan

### Mobile: 360px ขึ้นไป

- Page padding 16px
- Card กว้างเต็มพื้นที่ที่เหลือ
- Card padding 24px
- Wordmark ลดเป็นประมาณ 40–48px
- ใช้ normal document flow เพื่อไม่ให้ form ถูกตัดเมื่อหน้าจอสั้นหรือ keyboard เปิด
- หมายเหตุเรื่อง employee device อยู่ใต้ card

### Tablet: 768px ขึ้นไป

- Card กว้างประมาณ 400–440px
- Card padding 32px
- คง layout แบบหนึ่ง column กลางหน้าจอ

### Desktop: 1280px ขึ้นไป

- Card กว้างประมาณ 440px
- ใช้พื้นที่ว่างรอบ card เป็นองค์ประกอบหลัก
- ไม่ใช้ side marketing rail ในหน้า Login
- Wordmark และ card ใช้แกนกลางเดียวกัน

### Wide desktop: 1600px ขึ้นไป

- จำกัดความกว้าง form และระยะ card ไม่ให้ขยายตาม viewport
- พื้นที่ว่างเพิ่มขึ้นได้ แต่ขนาดข้อความและ input ต้องคงเดิม

## 8. Accessibility

- ทุก input ต้องมี label ที่มองเห็นและเชื่อมด้วย `htmlFor`
- Email ใช้ `type="email"` และ `autocomplete="email"`
- Password ใช้ `autocomplete="current-password"`
- Font ของ input ควรอย่างน้อย 16px บน mobile เพื่อป้องกัน browser zoom
- Tab order ต้องเป็น Email → Password → Show/Hide → Sign in → Create a workspace
- Interactive target ควรมีขนาดอย่างน้อย 44×44px
- Color contrast ต้องผ่าน WCAG AA
- หน้าใช้ `h1` เพียงหนึ่งจุด
- ทดสอบ keyboard, 200% zoom และ reduced motion

## 9. ขอบเขตไฟล์เมื่อเริ่ม Implement

- `apps/web/src/app/globals.css`
- `apps/web/src/components/auth-shell.tsx`
- `apps/web/src/components/password-field.tsx`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/login/login-form.tsx`

ยังไม่ควรเปลี่ยน shared UI package จนกว่าจะพบ requirement ที่ใช้ร่วมกับหน้าอื่นจริง

## 10. ลำดับการ Implement

### Step 1 — Map design tokens

- เพิ่ม CSS variables จาก `DESIGN.md` ใน `globals.css`
- เปลี่ยน font stack ให้ตรงกับ Inter fallback
- ลบสี slate/stone/emerald ที่ไม่ตรง token ออกจาก auth surface

### Step 2 — Rebuild AuthShell

- เปลี่ยนจาก split marketing rail เป็น centered cream canvas
- สร้าง lowercase Workplus wordmark
- สร้าง 12px card พร้อม 1px hairline และไม่มี shadow
- รองรับ Login, Signup และ Onboarding ผ่าน shared shell โดยไม่ผูก layout กับ client JavaScript

### Step 3 — Restyle LoginForm

- ใช้ typography, spacing, input 8px และ primary pill ตาม design system
- รักษา Better Auth submit logic เดิม
- ปรับ error และ loading state โดยไม่เปลี่ยน business logic
- เก็บ employee/device boundary note ไว้

### Step 4 — Responsive and accessibility pass

- ตรวจที่ 360, 768, 1280 และ 1600px
- ตรวจ short viewport และ 200% zoom
- ตรวจ keyboard, focus, autofill และ screen-reader announcements

### Step 5 — Authentication QA

- ทดสอบ invalid credentials
- ทดสอบ server unavailable
- ทดสอบ login สำเร็จไป dashboard
- ทดสอบ account ที่ยังไม่มี workspace ไป onboarding
- รัน `bun run lint` และ `bun run check-types`

## 11. Acceptance Criteria

- หน้า Login มี centered card ตามโครงสร้างภาพอ้างอิง
- สี ฟอนต์ typography spacing radius และ elevation ตรงกับ `DESIGN.md`
- ไม่มี gradient สีม่วง–ฟ้าหรือ accent เพิ่มเติม
- ไม่มี drop shadow
- Press targets หลักใช้ pill และ readable container ใช้ 12px radius
- All visible UI copy is English
- Login, loading, error และ redirect behavior เดิมยังทำงาน
- ไม่มี Google, Apple, Forgot password หรือ Remember me ที่ยังทำงานไม่ได้
- แยก web account ออกจาก employee device enrollment อย่างชัดเจน
- ไม่มี horizontal overflow และใช้งาน keyboard ได้ครบ
- `bun run lint` และ `bun run check-types` ผ่าน

## 12. Deferred Work

- Forgot-password flow
- Remember-me/session-duration controls
- Apple authentication
- Additional identity providers
- Dark mode tokens
- Animation and transition specification

รายการเหล่านี้ต้องมี backend behavior และ recovery path ที่ใช้งานได้ก่อนจึงเพิ่มเข้า UI Google authentication is now implemented as an optional, environment-gated Better Auth provider.
