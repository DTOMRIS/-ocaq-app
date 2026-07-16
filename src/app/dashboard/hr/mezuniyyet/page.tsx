import ModuleStatus from '@/components/module-status'

export default function MezuniyyetPage() {
  return <ModuleStatus
    title="Məzuniyyət və icazə"
    description="Bu modul hazırda aktiv deyil. Köhnə forma heç kimə göndərilmir və məlumatı bazada saxlamırdı; həmin yanıltıcı forma çıxarıldı."
    steps={[
      'Əməkdaş və ya filial müdiri tarixləri və əvəzləyən şəxsi seçərək sorğu yaradır.',
      'Filial müdiri növbə əhatəsini yoxlayıb təsdiq edir və ya düzəliş istəyir.',
      'Səlahiyyətli HR/admin qalıq günü və sənədləri yoxlayaraq yekunlaşdırır.',
      'Bölgə müdiri yalnız əhatə və risk vəziyyətini görür; şəxsi qeydləri dəyişmir.',
    ]}
  />
}
