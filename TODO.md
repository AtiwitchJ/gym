# 📝 TODO & Project Roadmap (Jetts Fitness Web App สำหรับทุกอุปกรณ์)

โปรเจกต์นี้ได้รับการพัฒนาให้เป็น **Progressive Web App (PWA)** ที่รองรับการใช้งานบนทุกอุปกรณ์ ทั้ง **iOS (iPhone/iPad), Android, Tablet และ Desktop/PC** พร้อมใช้งานแบบ **Offline** ในยิมได้ทันที

---

## ✅ สิ่งที่ทำเสร็จเรียบร้อยแล้ว (Completed Tasks)

### 1. 📱 ระบบ Web App สำหรับทุกอุปกรณ์ (Cross-Device PWA)
- [x] **Responsive Mobile-First Design:** ปรับขนาดและเลย์เอาต์ให้พอดีกับหน้าจอมือถือทุกขนาด พร้อมรองรับ Safe Area (Notch / Dynamic Island) ของ iPhone
- [x] **Web App Manifest (`manifest.json`):** กำหนดชื่อแอป, สีธีม `#E50914`, โหมดแสดงผลแบบ `standalone` (เปิดเต็มจอ ไม่มีแถบ URL เหมือนแอปแท้)
- [x] **Service Worker (`sw.js`):** แคชไฟล์หน้าเว็บทั้งหมด สามารถเปิดใช้งานได้แม้ไม่มีสัญญาณอินเทอร์เน็ตในยิม (Offline Ready)
- [x] **App Icons:** สร้างไอคอนความละเอียดสูงสำหรับหน้าจอโฮม (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`)
- [x] **iOS Safari Optimization:** รองรับ `apple-mobile-web-app-capable` และไอคอนตอน Add to Home Screen

### 2. 🏋️ ตารางออกกำลังกายและตัวติดตาม (Workout Tracker)
- [x] **โปรแกรม 4 วันฉบับสมบูรณ์:** จันทร์ (ขา+ก้น), อังคาร (อก+หลังแขน), พุธ (หลัง+หน้าแขน), พฤหัสบดี (ไหล่+ท้อง), ศุกร์-อาทิตย์ (พักฟื้น)
- [x] **ระบุท่าหลัก vs ท่าเสริม:** ติดป้าย ⭐ `(ท่าหลัก - Compound Lift)` และ 🔹 `(ท่าเสริม - Accessory)` ชัดเจนทุกท่า
- [x] **⚡ ระบบซ้อมเสริมท้ายคาบ (Bonus Touch-Up):** 2 เซ็ตต่อส่วน (1 วอร์ม 15 ครั้ง + 1 เล่นจริง 6–8 ครั้ง) พร้อมข้อแนะนำไม่ให้ตีกับตารางวันถัดไป
- [x] **ระบบจดน้ำหนัก & เซ็ต (Local Storage):** ติ๊กถูกและบันทึกน้ำหนักที่ยก (กก.) ลงในเครื่องทันที ข้อมูลไม่หายเมื่อรีเฟรช
- [x] **Rest Timer ในตัว:** ตัวจับเวลาพักเซ็ต (60s / 90s / 120s) พร้อมเสียง Beep และระบบสั่นเตือน
- [x] **Quick Video Links:** ปุ่มเปิดดูคลิป YouTube สอนฟอร์มการเล่นของทุกท่า

### 3. 📝 Interactive Gym TODO & Checklist (ในตัวแอป)
- [x] เพิ่มแท็บ **"📝 To-Do"** ในแถบเมนูหลักของหน้าเว็บ
- [x] มีเช็คลิสต์มาตรฐานสำหรับการเตรียมตัวและฟื้นฟูร่างกาย
- [x] ผู้ใช้สามารถพิมพ์ **เพิ่มรายการสิ่งที่ต้องทำของตัวเอง** (เช่น "ซื้อเวย์", "จัดฟอร์ม Hip Thrust") และลบรายการได้ตามใจชอบ โดยบันทึกลงในเครื่องอัตโนมัติ

### 4. 🌐 การติดตั้ง & เผยแพร่ (Deployment)
- [x] Git Repository บน GitHub: [https://github.com/AtiwitchJ/gym](https://github.com/AtiwitchJ/gym)
- [x] เผยแพร่ผ่าน GitHub Pages: [https://atiwitchj.github.io/gym/](https://atiwitchj.github.io/gym/)

---

## 📲 วิธีติดตั้งเป็น App บนหน้าจอมือถือ (Add to Home Screen)

### 🍏 สำหรับ iPhone / iPad (Safari)
1. เปิดลิงก์ **[https://atiwitchj.github.io/gym/](https://atiwitchj.github.io/gym/)** บน Safari
2. กดปุ่ม **แชร์ (Share)** (ไอคอนสี่เหลี่ยมมีลูกศรชี้ขึ้นที่แถบล่าง)
3. เลื่อนลงมาเลือก **"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)**
4. กด **"เพิ่ม" (Add)** ที่มุมขวาบน จะได้ไอคอนแอปสีแดงดำบนหน้าจอ เปิดใช้งานเต็มจอได้ทันที

### 🤖 สำหรับ Android (Chrome)
1. เปิดลิงก์ **[https://atiwitchj.github.io/gym/](https://atiwitchj.github.io/gym/)** บน Google Chrome
2. กดปุ่ม **เมนู 3 จุด (⋮)** ที่มุมขวาบน
3. เลือก **"ติดตั้งแอป" (Install app)** หรือ **"เพิ่มลงในหน้าจอหลัก" (Add to Home screen)**
4. กดยืนยัน จะได้ไอคอนแอปบนหน้าจอมือถือทันที

### 💻 สำหรับ คอมพิวเตอร์ / Mac / Windows (Chrome/Edge)
1. เปิดเว็บใน Chrome หรือ Edge
2. กดไอคอน **ติดตั้ง (Install)** ที่แถบขวาบนของ URL bar เพื่อใช้งานแบบ Desktop App

---

## 🚀 แผนพัฒนาในอนาคต (Future Enhancements Roadmap)

- [ ] **Workout History Log:** บันทึกประวัติและสถิติน้ำหนักย้อนหลังของแต่ละสัปดาห์
- [ ] **One-Rep Max (1RM) Calculator:** เครื่องคำนวณน้ำหนัก 1RM อัตโนมัติจากน้ำหนักที่ยกได้ 6–8 ครั้ง
- [ ] **Custom Rest Timer Duration:** ปรับเวลาพักเซ็ตแบบกำหนดเองได้อิสระ (เช่น 45s, 75s, 150s)
- [ ] **Export / Import Data:** ปุ่มส่งออกข้อมูลการฝึกเป็นไฟล์ CSV หรือ JSON เพื่อสำรองข้อมูล
- [ ] **Sound Settings:** ปรับระดับเสียง Beep หรือเลือกรูปแบบเสียงแจ้งเตือน
