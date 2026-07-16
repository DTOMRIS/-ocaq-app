import ModuleStatus from '@/components/module-status'

export default function SinaqPage() {
  return <ModuleStatus
    title="Sınaq müddəti dəyərləndirməsi"
    description="Köhnə ekran nəticəni yalnız alert ilə göstərir, bazaya yazmırdı. Yanıltıcı “saxlanıldı” düyməsi çıxarıldı."
    steps={[
      'Filial müdiri real əməkdaş üçün dövr və müşahidə meyarlarını doldurur.',
      'Qiymət ilə birlikdə konkret nümunə, inkişaf tapşırığı və son tarix tələb olunur.',
      'Əməkdaş rəyin görüldüyünü təsdiqləyir; düzəlişlər audit tarixçəsində qalır.',
      'Bölgə müdürü yalnız istisnaları və gecikmiş inkişaf planlarını izləyir.',
    ]}
  />
}
