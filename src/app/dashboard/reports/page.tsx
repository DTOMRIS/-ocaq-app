import ModuleStatus from '@/components/module-status'

export const metadata = { title: 'Hesabatlar — OCAQ' }

export default function ReportsPage() {
  return <ModuleStatus
    title="İdarəetmə hesabatları"
    description="Köhnə hesabat ekrandakı filial, müdür və satış rəqəmlərini kod daxilindən göstərirdi; canlı satış mənbəyindən gəlmirdi. Yanıltıcı cədvəl çıxarıldı."
    steps={[
      'Satış və hədəf məlumatı filial və tarix üzrə təsdiqlənmiş mənbədən alınır.',
      'Filial müdiri yalnız öz filialını, bölgə müdiri öz bölgəsini, super admin bütün şəbəkəni görür.',
      'Mənbə tarixi, son yenilənmə vaxtı və data boşluğu hər hesabatda göstərilir.',
      'Rəqəmlər export və audit izi ilə yoxlanıldıqdan sonra modul menyuya qaytarılır.',
    ]}
  />
}
