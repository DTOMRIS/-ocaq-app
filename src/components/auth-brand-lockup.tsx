import Image from 'next/image'

export default function AuthBrandLockup({
  dark = false,
  compact = false,
}: {
  dark?: boolean
  compact?: boolean
}) {
  const size = compact ? 46 : 82

  return (
    <div
      aria-label="Shaurma No1 — OCAQ Operasiya Portalı"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: compact ? 'flex-start' : 'center',
        gap: compact ? 10 : 12,
      }}
    >
      <Image
        src="/images/shaurma-n1-logo.png"
        alt="Shaurma No1"
        width={size}
        height={size}
        priority
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          boxShadow: dark
            ? '0 0 0 3px rgba(242,168,29,.18), 0 10px 28px rgba(0,0,0,.28)'
            : '0 0 0 3px rgba(200,16,46,.08), 0 8px 22px rgba(15,23,42,.12)',
        }}
      />
      <div style={{ textAlign: 'left' }}>
        <strong
          style={{
            display: 'block',
            color: dark ? '#fff' : '#0f172a',
            fontSize: compact ? 16 : 18,
            lineHeight: 1.15,
          }}
        >
          Shaurma No1
        </strong>
        <span
          style={{
            display: 'block',
            color: dark ? '#a1a1aa' : '#64748b',
            fontSize: compact ? 10 : 11,
            marginTop: 3,
            letterSpacing: '.04em',
            textTransform: 'uppercase',
          }}
        >
          OCAQ Operasiya Portalı
        </span>
      </div>
    </div>
  )
}
