import { useState } from 'react';

interface MechanicAvatarProps {
  name: string;
  /** Signed photo link; without one (or if it fails to load) the first letter shows */
  photoUrl?: string | null;
  /** Width and height in pixels */
  size?: number;
  muted?: boolean;
  className?: string;
}

/** A mechanic's round photo, or their initial when there is no photo */
export default function MechanicAvatar({ name, photoUrl, size = 44, muted = false, className = '' }: MechanicAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = !!photoUrl && failedUrl !== photoUrl;
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 font-bold ${
        showPhoto ? 'bg-slate-100' : muted ? 'bg-slate-200 text-slate-500' : 'bg-slate-800 text-white'
      } ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden="true"
    >
      {showPhoto ? (
        <img
          src={photoUrl}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          className={`w-full h-full object-cover ${muted ? 'grayscale opacity-70' : ''}`}
          onError={() => setFailedUrl(photoUrl)}
        />
      ) : (
        initial
      )}
    </span>
  );
}
