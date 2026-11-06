import { User } from "lucide-react";

/* Avatar default: ikon orang abu-abu di dalam lingkaran abu-abu, seperti
   avatar bawaan Instagram — tampil saat pengguna tidak mengisi URL avatar. */
export function Avatar({
  name,
  src,
  size = 40,
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        // URL avatar bebas domain (diisi user), jadi tidak lewat next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="inline-flex h-full w-full items-center justify-center bg-text-muted text-bg"
        >
          <User
            width={Math.round(size * 0.55)}
            height={Math.round(size * 0.55)}
            strokeWidth={2}
          />
        </span>
      )}
    </span>
  );
}
