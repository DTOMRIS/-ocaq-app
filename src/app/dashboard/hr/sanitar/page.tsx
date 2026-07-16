import ModuleStatus from '@/components/module-status'

export default function SanitarPage() {
  return <ModuleStatus
    title="Sanitar sənəd izləmə"
    description="Bu modul hazırda aktiv deyil. Köhnə ekrandakı adlar, sənəd nömrələri və tarixlər kod daxilində yazılmış nümunə məlumat idi; real personel bazasından gəlmirdi və çıxarıldı."
    steps={[
      'Səlahiyyətli şəxs real əməkdaş profilində sənəd nömrəsi, verilmə və bitmə tarixini qeyd edir.',
      'Sistem statusu tarixdən hesablayır; istifadəçi əl ilə “etibarlı” status seçmir.',
      'Müddət yaxınlaşanda filial müdürünə tapşırıq, bölgə müdürünə risk xülasəsi göndərilir.',
      'Yenilənən sənəd əvvəlki tarixçə və audit qeydi saxlanılaraq təsdiqlənir.',
    ]}
  />
}
