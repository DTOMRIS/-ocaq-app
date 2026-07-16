import ModuleStatus from '@/components/module-status'

export default function OryentasiyaPage() {
  return <ModuleStatus
    title="Oryentasiya"
    description="Köhnə checklist yalnız açıq brauzerdə qalırdı və əməkdaşa bağlanmırdı. Saxta tamamlama görüntüsü çıxarıldı; modul real personel və təlim mənbəyi bağlandıqdan sonra aktivləşdiriləcək."
    steps={[
      'Filial müdiri real əməkdaşı və mentorunu seçir.',
      'Roluna uyğun xidmət, əl yuma, porsiya/gramaj və iş yeri tapşırıqları avtomatik açılır.',
      'Mentor müşahidəni qeyd edir, əməkdaş tamamlamanı təsdiqləyir.',
      'Bölgə müdürü gecikənləri və təlimdən sonra sahə performansını izləyir.',
    ]}
  />
}
