import type { QualityFormKey } from './quality-form-catalog'

export type QualityFieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'time'
  | 'number'
  | 'choice'
  | 'boolean'
  | 'signature'

export type QualityField = {
  key: string
  label: string
  type: QualityFieldType
  required?: boolean
  options?: readonly string[]
  unit?: string
  min?: number
  max?: number
  step?: number
}

export type QualityFormTemplate = {
  formKey: QualityFormKey
  headerFields: readonly QualityField[]
  rowFields: readonly QualityField[]
  signoffFields: readonly QualityField[]
}

const dateField = (key = 'date', label = 'Tarix'): QualityField => ({
  key, label, type: 'date', required: true,
})

const textField = (key: string, label: string, required = false): QualityField => ({
  key, label, type: 'text', required,
})

const numberField = (
  key: string,
  label: string,
  unit?: string,
  min = -100,
  max = 500,
): QualityField => ({
  key, label, type: 'number', unit, min, max, step: 0.1,
})

const choiceField = (
  key: string,
  label: string,
  options: readonly string[],
  required = false,
): QualityField => ({
  key, label, type: 'choice', options, required,
})

const signatureField = (key: string, label: string, required = false): QualityField => ({
  key, label, type: 'signature', required,
})

const timedTemperatureFields = (times: readonly string[]) =>
  times.flatMap((time, index) => [
    {
      key: `time_${index + 1}`,
      label: `${time} — saat`,
      type: 'time' as const,
      required: true,
    },
    numberField(`temperature_${index + 1}`, `${time} — temperatur`, '°C'),
  ])

const timedValueAndSignatureFields = (times: readonly string[], valueLabel: string) =>
  times.flatMap((time, index) => [
    textField(`value_${index + 1}`, `${time} — ${valueLabel}`, true),
    signatureField(`signature_${index + 1}`, `${time} — imza`, true),
  ])

const traceabilityRowFields: readonly QualityField[] = [
  dateField(),
  textField('product_name', 'Məhsul adı / çeşidi', true),
  ...Array.from({ length: 8 }, (_, index) => [
    textField(`batch_${index + 1}`, `Partiya № ${index + 1}`),
    { key: `expiry_time_${index + 1}`, label: `İST saatı ${index + 1}`, type: 'time' as const },
  ]).flat(),
  textField('shelf_life', 'Yararlılıq müddəti', true),
]

const managerSignoff: readonly QualityField[] = [
  textField('manager_name', 'Filial menecerinin adı və soyadı', true),
  signatureField('manager_signature', 'Filial menecerinin imzası', true),
]

export const QUALITY_FORM_TEMPLATES: readonly QualityFormTemplate[] = [
  {
    formKey: 'sh-kn-f-002-goods-receipt',
    headerFields: [dateField('inspection_date', 'Tarix'), textField('inspector', 'Yoxlama aparan şəxs', true)],
    rowFields: [
      textField('sequence', 'S/N', true),
      textField('supplier', 'Firma adı', true),
      textField('product_name', 'Məhsul adı', true),
      dateField('production_date', 'İstehsal tarixi'),
      dateField('expiry_date', 'Son istifadə tarixi'),
      textField('batch_number', 'Partiya nömrəsi', true),
      numberField('product_temperature', 'Məhsulun temperaturu', '°C'),
      numberField('vehicle_temperature', 'NV-nin temperaturu', '°C'),
      choiceField('vehicle_cleanliness', 'NV-nin təmizliyi', ['Uyğundur', 'Uyğun deyil'], true),
      dateField('receipt_date', 'Qəbul tarixi'),
      { key: 'notes', label: 'Əlavə qeydlər', type: 'textarea' },
    ],
    signoffFields: [],
  },
  {
    formKey: 'sh-kn-f-006-fryer-oil-change',
    headerFields: [],
    rowFields: [
      dateField('change_needed_date', 'Yağın dəyişilməyə ehtiyac olduğu tarix'),
      dateField('special_container_date', 'Yağın xüsusi qaba əlavə olunduğu tarix'),
      textField('checker_name', 'Yoxlayan — ad və soyad', true),
      signatureField('checker_signature', 'Yoxlayan — imza', true),
    ],
    signoffFields: [],
  },
  {
    formKey: 'sh-kn-f-008-temperature-humidity',
    headerFields: [choiceField('area', 'Sahə adı', ['Zal', 'Mətbəx', 'Anbar'], true)],
    rowFields: [
      dateField(),
      ...['11:00', '15:00', '19:00', '23:00', '03:00'].flatMap((time, index) => [
        numberField(`temperature_${index + 1}`, `${time} — temperatur`, '°C'),
        numberField(`humidity_${index + 1}`, `${time} — nəmlik`, '%', 0, 100),
        signatureField(`signature_${index + 1}`, `${time} — imza`),
      ]),
    ],
    signoffFields: managerSignoff,
  },
  {
    formKey: 'sh-kn-f-011-cleaning-control',
    headerFields: [
      choiceField('area', 'Təmizlənən sahə', ['Zal', 'Mətbəx', 'Sanitar qovşaq', 'Anbar'], true),
    ],
    rowFields: [
      dateField(),
      ...timedValueAndSignatureFields(['09:00', '14:00', '19:00', '23:00', '03:00'], 'nəticə'),
    ],
    signoffFields: managerSignoff,
  },
  {
    formKey: 'sh-kn-f-015-nonconforming-product',
    headerFields: [dateField(), textField('area', 'Ərazi', true)],
    rowFields: [
      textField('sequence', 'Sıra №', true),
      textField('product_name', 'Məhsul adı', true),
      numberField('quantity', 'Miqdar', 'ədəd/kq', 0, 1_000_000),
      dateField('production_date', 'İstehsal tarixi'),
      dateField('expiry_date', 'Son istifadə tarixi'),
      { key: 'reason', label: 'Yararsızlıq səbəbi', type: 'textarea', required: true },
    ],
    signoffFields: [
      textField('qhs_name', 'KN və SƏTƏM üzrə mütəxəssis', true),
      signatureField('qhs_signature', 'KN və SƏTƏM üzrə mütəxəssisin imzası', true),
      textField('authorized_name', 'Səlahiyyətli şəxs', true),
      signatureField('authorized_signature', 'Səlahiyyətli şəxsin imzası', true),
    ],
  },
  {
    formKey: 'sh-kn-f-017-role-hygiene',
    headerFields: [],
    rowFields: [
      dateField(),
      choiceField('position', 'Vəzifə', [
        'Menecer', 'Kassir', 'Şaurmaçı', 'Fırınçı', 'Barista',
        'Mətbəx işçisi / Qabyuyan', 'Ofisiant / Ofisiant köməkçisi',
      ], true),
      ...[
        ['clothing', 'Geyim'],
        ['hair_beard', 'Saç-saqqalın uzunluğu'],
        ['jewelry', 'Zinət əşyaları'],
        ['hands_nails', 'Əldəki yaralar və dırnaqlar'],
        ['strong_perfume', 'Ağır iyli ətirlərdən istifadə'],
      ].map(([key, label]) => choiceField(key, label, ['− Uyğundur', '+ Uyğunsuzluq'], true)),
      { key: 'nonconformity_source', label: 'Uyğunsuzluğun mənbəyi', type: 'textarea' },
      { key: 'corrective_action', label: 'Düzəldici tədbir', type: 'textarea' },
      textField('checker_name', 'Yoxlayan', true),
      signatureField('checker_signature', 'İmza', true),
    ],
    signoffFields: [],
  },
  {
    formKey: 'sh-kn-f-018-production-visitors',
    headerFields: [],
    rowFields: [
      dateField(),
      textField('full_name', 'Ad və soyad', true),
      choiceField('origin_type', 'Haradan', ['Tədarükçü', 'Şirkət', 'Qonaq', 'Qurum', 'Audit'], true),
      textField('origin_name', 'Şirkət / qurum adı'),
      textField('purpose', 'Məqsəd', true),
      choiceField('instruction_compliance', 'SH-KN-T-018 təlimatına uyğundur?', ['Bəli', 'Xeyr'], true),
      choiceField('health_problem', 'Sağlamlıq problemi varmı?', ['Xeyr', 'Bəli'], true),
      choiceField('hygiene_commitment', 'Sanitar-gigiyenik qaydalara riayət təsdiqi', ['Təsdiq edirəm'], true),
      signatureField('visitor_signature', 'Ziyarətçinin imzası', true),
    ],
    signoffFields: [],
  },
  {
    formKey: 'sh-kn-f-020-oven-temperature',
    headerFields: [],
    rowFields: [
      dateField(),
      choiceField('food_type', 'Yemək növü', ['Lahmacun', 'Pide', 'Pizza', 'Bükmə'], true),
      ...timedTemperatureFields(['', '', '', '', '']),
      signatureField('signature', 'İmza', true),
    ],
    signoffFields: [],
  },
  {
    formKey: 'sh-kn-f-028-freezer-refrigerator-temperature',
    headerFields: [
      textField('device_number', 'Cihaz №', true),
      choiceField('device_type', 'Cihaz növü', ['Dondurucu', 'Soyuducu'], true),
    ],
    rowFields: [
      dateField(),
      ...timedTemperatureFields(['09:00', '14:00', '19:00', '23:00', '03:00']),
    ],
    signoffFields: [
      textField('recorder_name', 'Qeydiyyat aparan şəxsin adı və soyadı', true),
      signatureField('recorder_signature', 'İmza', true),
    ],
  },
  ...([
    'sh-kn-f-034-bukme-traceability',
    'sh-kn-f-034-lahmacun-traceability',
    'sh-kn-f-034-pide-traceability',
    'sh-kn-f-034-pizza-traceability',
    'sh-kn-f-034-shaurma-traceability',
  ] as const).map((formKey): QualityFormTemplate => ({
    formKey,
    headerFields: [],
    rowFields: traceabilityRowFields,
    signoffFields: [],
  })),
  {
    formKey: 'sh-kn-f-035-defrost-registration',
    headerFields: [],
    rowFields: [
      dateField(),
      textField('product_name', 'Məhsulun adı', true),
      ...['11:00', '14:00', '17:00', '20:00', '23:00'].map((time, index) =>
        numberField(`temperature_${index + 1}`, `${time} — temperatur`, '°C'),
      ),
    ],
    signoffFields: [
      textField('recorder_name', 'Qeydiyyat aparan şəxsin adı və soyadı', true),
      signatureField('recorder_signature', 'İmza', true),
    ],
  },
  {
    formKey: 'sh-kn-f-037-service-temperature',
    headerFields: [],
    rowFields: [
      dateField(),
      ...['12:30', '15:30', '18:30', '21:30', '23:30', '02:30'].map((time, index) =>
        numberField(`temperature_${index + 1}`, `${time} — temperatur`, '°C'),
      ),
      signatureField('signature', 'İmza', true),
    ],
    signoffFields: [],
  },
  {
    formKey: 'sh-kn-f-040-soup-salad-receipt',
    headerFields: [],
    rowFields: [
      dateField(),
      choiceField('category', 'Kateqoriya', ['Şorba', 'Salat'], true),
      textField('product_name', 'Şorbanın / salatın adı', true),
      { key: 'receipt_time', label: 'Qəbul saatı', type: 'time', required: true },
      numberField('temperature', 'Qəbul temperaturu', '°C'),
      textField('checker_name', 'Yoxlayan — ad və soyad', true),
      signatureField('checker_signature', 'Yoxlayan — imza', true),
    ],
    signoffFields: [],
  },
  {
    formKey: 'sh-kn-f-041-cooked-spit-temperature',
    headerFields: [],
    rowFields: [
      dateField(),
      ...['11:30', '14:30', '17:30', '19:30', '22:30', '00:30'].map((time, index) =>
        numberField(`temperature_${index + 1}`, `${time} — temperatur`, '°C'),
      ),
      signatureField('signature', 'İmza', true),
    ],
    signoffFields: [],
  },
]

export function getQualityFormTemplate(formKey: string): QualityFormTemplate | undefined {
  return QUALITY_FORM_TEMPLATES.find((template) => template.formKey === formKey)
}
