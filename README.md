# Mohammad Alaraj Portfolio

هذا بورتفوليو شخصي لمحمد الأعرج + صفحة قائمة انتظار كورس ومجتمع الذكاء الاصطناعي.

| الصفحة | الرابط المتوقع | الملفات |
| --- | --- | --- |
| البورتفوليو | https://alar3j.github.io/mohammad-alaraj-portfolio/ | `index.html` |
| قائمة الانتظار (AI) | https://alar3j.github.io/mohammad-alaraj-portfolio/waitlist/ | `waitlist/` (مبني) ← المصدر في `apps/waitlist/` |
| لوحة التسجيلات | https://alar3j.github.io/mohammad-alaraj-portfolio/waitlist/admin.html | محمية بمفتاح |

## التشغيل على GitHub Pages

Settings → Pages → Deploy from branch → main → /root

ملف `.nojekyll` موجود عشان GitHub ينشر الملفات زي ما هي.

## صفحة قائمة الانتظار — شو فيها؟

- **تسجيل حقيقي شغّال**: الإيميلات بتنحفظ بقاعدة بيانات Supabase (مشروع `wasla`، سكيما خاصة `techalaraj`)
  عن طريق Edge Function اسمها `techalaraj-waitlist`. فيها: منع التكرار، حماية من البوتات، وحد للمحاولات.
- **صورة ثلاثية الأبعاد** بالـHero: صورتك الحقيقية + خريطة عمق من نموذج Depth Anything V2 (Hugging Face)
  معروضة بـ three.js / React Three Fiber.
- **مكتشف الأدوات بالذكاء الاصطناعي**: الزائر بيكتب شو بده يعمل بلهجته، ونموذج Hugging Face بيشتغل داخل المتصفح
  وبيقترح الأداة المناسبة من الـ30 أداة بالدليل، مع "مجرّة" ثلاثية الأبعاد للأدوات.
- **Python**: سكربتات `ml/` اللي بنت النموذج، خريطة العمق، صغّرت الـPDF من 7.8MB لـ2.8MB، وبتصدّر التسجيلات CSV.

التفاصيل التقنية: [`apps/waitlist/README.md`](apps/waitlist/README.md) و [`ml/README.md`](ml/README.md).

## التعديل

- البورتفوليو: كل النصوص والتصميم داخل `index.html`.
- صفحة الانتظار: عدّل بـ `apps/waitlist/src/` وبعدين:

```bash
cd apps/waitlist && pnpm install && pnpm build   # بيكتب النسخة الجاهزة بـ waitlist/
```
