# Security policy · Güvenlik politikası

## English

Do not open a public issue for a vulnerability. Report it privately:

- **Security → Report a vulnerability** on this repository, or
- email **talkdedsec@proton.me** with `tlk-ascii` in the subject.

Acknowledgement within 72 hours, assessment within 7 days.

### In scope

- Script injection through text input, a crafted image or video, or the exported HTML / SVG files.
- Anything that sends your files off the device. Conversion runs locally.
- In the Windows app: a crafted file that runs code, or a release / installer whose integrity can be
  subverted.

### Out of scope

- Output that looks wrong or renders slowly — open a normal issue for those.
- Bundled fonts, which keep their own licences and upstreams.
- Attacks that need control of the machine already.

## Türkçe

Güvenlik açığı için herkese açık issue açma. Gizli bildir:

- bu repoda **Security → Report a vulnerability**, ya da
- konu satırında `tlk-ascii` geçen bir e-postayla **talkdedsec@proton.me**.

72 saat içinde dönüş, 7 gün içinde değerlendirme.

### Kapsamda

- Metin girişi, özel hazırlanmış görsel/video ya da dışa aktarılan HTML / SVG ile script çalıştırma.
- Dosyalarını cihaz dışına gönderen her şey. Dönüştürme yerelde yapılır.
- Windows uygulamasında: kod çalıştıran özel hazırlanmış dosya ya da bütünlüğü bozulabilen
  sürüm/kurulum dosyası.

### Kapsam dışı

- Yanlış görünen ya da yavaş çizilen çıktı — bunlar için normal issue aç.
- Paketlenen fontlar; kendi lisanslarını ve kaynaklarını korurlar.
- Makinenin zaten ele geçirilmiş olmasını gerektiren saldırılar.
