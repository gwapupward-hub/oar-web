import Link from 'next/link';

/** The canonical Registry Ring (brand/logos/OAR_icon_gradient.svg) with the product name. */
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="OAR Explorer home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/oar-mark.svg" alt="" width={28} height={28} />
      <span className="logo-word">OAR</span>
      <span className="logo-product">Explorer</span>
    </Link>
  );
}
