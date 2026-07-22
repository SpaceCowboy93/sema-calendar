'use client'

export interface BlobConfig {
  color: string
  size: number         // px
  top: string
  left: string
  duration: number     // animation duration in seconds
  delay?: number       // animation delay in seconds
}

interface Props {
  blobs: BlobConfig[]
  className?: string
}

export function AnimatedBackground({ blobs, className }: Props) {
  return (
    <div
      className={`pointer-events-none fixed inset-0 overflow-hidden -z-10 ${className ?? ''}`}
      aria-hidden="true"
    >
      {blobs.map((blob, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: blob.top,
            left: blob.left,
            width: blob.size,
            height: blob.size,
            borderRadius: '50%',
            background: blob.color,
            filter: `blur(${Math.round(blob.size * 0.45)}px)`,
            opacity: 0.18,
            animation: `bgBlob ${blob.duration}s ease-in-out ${blob.delay ?? 0}s infinite alternate`,
            willChange: 'transform',
          }}
        />
      ))}

      <style>{`
        @keyframes bgBlob {
          0%   { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(18px, -22px) scale(1.06); }
          66%  { transform: translate(-14px, 12px) scale(0.95); }
          100% { transform: translate(10px, 20px) scale(1.03); }
        }
      `}</style>
    </div>
  )
}
