import React from 'react'
import { useApp } from '../context/AppContext'
import {
  Calendar, CheckCircle2, GraduationCap, Award, Bell, MessageSquare,
  User, Lock, Settings, ClipboardList, Users, FlaskConical, Clock,
  CalendarOff, Shield, Mail, ShieldCheck
} from 'lucide-react'

function Section({ icon, title, children }) {
  return (
    <section className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-5 mb-4">
      <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-2 flex items-center gap-2">
        <span className="text-[#1565C0] dark:text-[#7DD4FC]" aria-hidden="true">{icon}</span>
        {title}
      </h3>
      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2 leading-relaxed">
        {children}
      </div>
    </section>
  )
}

function Step({ n, children }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 text-[#1565C0] dark:text-[#7DD4FC] text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function UserHelp() {
  return (
    <>
      <Section icon={<Calendar className="w-4 h-4" />} title="Randevu Al">
        <Step n={1}>Üst menüden <strong>Randevu Al</strong> sekmesine geçin.</Step>
        <Step n={2}>İlinizdeki bir stüdyo/alan seçin, ardından bir tarih seçin. Hafta sonu ve resmi tatil günleri kapalıdır.</Step>
        <Step n={3}>Müsait saat dilimlerinden birini seçin (kalan kontenjan yanında görünür).</Step>
        <Step n={4}>İsteğe bağlı bir not ekleyip <strong>Randevu Talebi Oluştur</strong> ile gönderin.</Step>
        <Step n={5}>Talebiniz <em>Onay Bekliyor</em> olarak görüntülenir; il yöneticisi onayladığında e-posta alırsınız.</Step>
      </Section>

      <Section icon={<CheckCircle2 className="w-4 h-4" />} title="Randevumu İptal Et veya Değiştir">
        <p>Profilim sekmesinde aktif randevularınızı görürsünüz. Statüye göre:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li><strong>Onay Bekliyor</strong>: Doğrudan iptal edebilirsiniz.</li>
          <li><strong>Onaylı</strong>: <em>İptal Talebi</em> gönderirsiniz; yönetici inceler.</li>
          <li><strong>Yeniden Planla</strong>: tarih veya saat değiştirmek için aktif randevuda <em>Yeniden Planla</em> butonunu kullanın.</li>
        </ul>
      </Section>

      <Section icon={<GraduationCap className="w-4 h-4" />} title="Atölyelere Katıl">
        <p>Atölyeler sekmesinden ilinizdeki yaklaşan atölyeleri görürsünüz. Kontenjan varsa <strong>Kayıt Ol</strong> ile katılım sağlayın. Kayıt sonrası onay e-postası alırsınız.</p>
      </Section>

      <Section icon={<Award className="w-4 h-4" />} title="Sertifika">
        <p>Katıldığınız atölyelerde yönetici katılım onayını verdikten sonra Profilim sekmesinde <strong>Sertifikalarım</strong> alanında sertifikanız görünür. <em>Sertifika</em> butonu ile görüntüleyip PDF olarak yazdırabilirsiniz.</p>
      </Section>

      <Section icon={<Bell className="w-4 h-4" />} title="Bildirimler">
        <p>Bildirimler sekmesinde randevu durumu, hatırlatmalar ve sistem duyuruları görüntülenir. <strong>Tümünü Temizle</strong> ile listeyi temizleyebilirsiniz; istediğinizde <em>Geri Al</em> butonu ile gizlediklerinizi geri getirebilirsiniz.</p>
      </Section>

      <Section icon={<MessageSquare className="w-4 h-4" />} title="Mesajlar">
        <p>Mesajlar sekmesinden il yöneticinize veya merkez yöneticiye ulaşabilirsiniz. Yanıt geldiğinde sayacı sekme yanında görürsünüz.</p>
      </Section>

      <Section icon={<User className="w-4 h-4" />} title="Profilim">
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Avatar/fotoğraf, isim, telefon, branş, kurum gibi bilgilerinizi güncelleyebilirsiniz.</li>
          <li>Şehir değişikliği aktif randevularınızı etkileyebilir; uyarı modalı bilgilendirir.</li>
          <li><strong>Şifremi Değiştir</strong> alanından mevcut şifrenizi vererek yeni bir şifre belirleyebilirsiniz.</li>
        </ul>
      </Section>

      <Section icon={<Lock className="w-4 h-4" />} title="Güvenlik">
        <p>25 dakika boyunca aktif olmazsanız uyarı gösterilir; 5 dakika daha pasif kalırsanız oturum otomatik kapatılır. 5 yanlış şifre denemesinde 60 saniye boyunca giriş engellenir.</p>
      </Section>
    </>
  )
}

function AdminHelp({ isGlobal }) {
  return (
    <>
      <Section icon={<ClipboardList className="w-4 h-4" />} title="Randevular">
        <p>Onay bekleyen, onaylı ve iptal talepli randevuları listeler; tarih, saat, lab, durum filtreleri ile arama yapabilirsiniz. Her randevuda:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li><strong>Onayla</strong> — yeni tarih/saat'le de onaylanabilir; kullanıcıya e-posta gider.</li>
          <li><strong>İptal Et</strong> — randevuyu doğrudan iptal eder; sıradaki bekleme listesindeki kullanıcı varsa otomatik bilgilendirilir.</li>
          <li><strong>İptal Talebini Reddet</strong> — kullanıcının iptal isteğini geri çevirir.</li>
          <li><strong>Tamamlandı İşaretle</strong> — onaylı randevu gerçekleştiyse statüyü COMPLETED yapar.</li>
          <li><strong>CSV İndir</strong> — filtrelenmiş listeyi tablo olarak alır.</li>
        </ul>
      </Section>

      <Section icon={<GraduationCap className="w-4 h-4" />} title="Atölyeler">
        <p>Yeni atölye oluşturma, kapasiteyi belirleme, kayıtlı kullanıcı listesini görme ve katılım onayı (sertifika için gerekli) bu sekmeden yapılır.</p>
      </Section>

      <Section icon={<FlaskConical className="w-4 h-4" />} title="Alanlar (Stüdyolar)">
        <p>İlinize ait stüdyoları ekleyebilir, düzenleyebilirsiniz. Kapasite slot başına 1 (ses/video/podcast) veya özel ayar olabilir. Aktif randevusu olan bir alan silinemez; önce randevular iptal edilmelidir.</p>
      </Section>

      <Section icon={<Clock className="w-4 h-4" />} title="Saat Dilimleri">
        <p>İl bazında saat dilimleri eklenir/kaldırılır. Belirli bir stüdyo lokasyonuna özel saat dilimi de tanımlanabilir.</p>
      </Section>

      <Section icon={<CalendarOff className="w-4 h-4" />} title="Kapalı Günler">
        <p>Resmi tatil dışında kapalı tutulacak özel günler eklenir. Bu günlere kullanıcı randevu oluşturamaz.</p>
      </Section>

      <Section icon={<Users className="w-4 h-4" />} title="Üye Onayları">
        <p>Kayıt başvurularını inceleyip onaylayabilir veya reddedebilirsiniz. <strong>Çoklu Onay</strong> ile birden fazla başvuruyu seçip toplu onaylayabilir, <strong>CSV İçe Aktar</strong> ile listeyle toplu kullanıcı oluşturabilirsiniz. Her oluşturmada kullanıcıya geçici şifre e-postası gider.</p>
      </Section>

      <Section icon={<Shield className="w-4 h-4" />} title="İstatistikler">
        <p>Randevu yoğunluğu, en çok kullanılan alanlar, durum dağılımı ve aylık trendi görsel olarak görürsünüz.</p>
      </Section>

      <Section icon={<MessageSquare className="w-4 h-4" />} title="Mesajlar">
        <p>Kullanıcı veya diğer yöneticilerle mesajlaşma ekranıdır. Okunmamış mesajlar sekme üzerinde sayaçla görünür.</p>
      </Section>

      {isGlobal && (
        <Section icon={<Award className="w-4 h-4" />} title="Sertifika (yalnızca merkez)">
          <p>Sistem genelinde geçerli sertifika şablonunu (başlık, gövde, imza, logo) düzenler ve önizler. Atölye bazlı katılımcılara toplu sertifika e-postası gönderebilirsiniz.</p>
        </Section>
      )}

      {isGlobal && (
        <Section icon={<Bell className="w-4 h-4" />} title="Bildirim Gönder (yalnızca merkez)">
          <p>Tüm illere veya seçili il kullanıcılarına manuel duyuru gönderirsiniz. <strong>Ayrıca e-posta olarak da gönder</strong> seçeneği işaretliyse aynı içerik onaylı kullanıcılara e-posta olarak da iletilir.</p>
        </Section>
      )}

      {isGlobal && (
        <Section icon={<Settings className="w-4 h-4" />} title="Yönetici Yönetimi (yalnızca merkez)">
          <p>Yeni il yöneticisi veya merkez yöneticisi oluşturma, mevcutları düzenleme, şifre sıfırlama ve silme buradan yapılır.</p>
        </Section>
      )}

      {isGlobal && (
        <Section icon={<ShieldCheck className="w-4 h-4" />} title="Denetim Kayıtları (yalnızca merkez)">
          <p>Tüm yönetici işlemlerinin (onay, iptal, şifre sıfırlama, vb.) izlenebilir kaydıdır. Aksiyon türü, tarih aralığı ve aktör ile filtrelenir; CSV olarak indirilebilir.</p>
        </Section>
      )}

      {isGlobal && (
        <Section icon={<Mail className="w-4 h-4" />} title="E-posta (yalnızca merkez)">
          <p>Brevo entegrasyonu üzerinden gönderilen otomatik ve manuel e-postaların durumu görüntülenir.</p>
        </Section>
      )}

      <Section icon={<Lock className="w-4 h-4" />} title="Profil & Şifre">
        <p>Üst karttaki <em>Düzenle</em> butonuyla isim, e-posta, telefon ve avatar güncellenir. <em>Şifremi Değiştir</em> ile mevcut şifreyi vererek yeni şifre belirlenir. İlk girişte şifre değiştirme zorunludur (must_change_password).</p>
      </Section>
    </>
  )
}

export default function HowToUseScreen() {
  const { loggedInAdmin } = useApp()
  const isAdmin = loggedInAdmin !== null
  const isGlobal = loggedInAdmin?.role === 'GLOBAL'

  return (
    <div className="px-4 py-4">
      <div className="bg-gradient-to-br from-[#1565C0] to-[#0D47A1] dark:from-[#1565C0] dark:to-[#061A3A] rounded-2xl p-5 mb-5 text-white">
        <h2 className="font-bold text-base mb-1">Nasıl Kullanırım?</h2>
        <p className="text-xs opacity-90">
          {isAdmin
            ? (isGlobal ? 'Merkez yönetici olarak sahip olduğunuz yetkiler ve sık kullanılan akışlar.' : 'İl yöneticisi olarak yapabilecekleriniz ve sık kullanılan akışlar.')
            : 'Sistemi en verimli şekilde kullanmak için kısa bir rehber.'}
        </p>
      </div>

      {isAdmin ? <AdminHelp isGlobal={isGlobal} /> : <UserHelp />}
    </div>
  )
}
