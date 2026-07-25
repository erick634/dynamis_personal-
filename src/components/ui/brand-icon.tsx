import { Unlock } from 'lucide-react';

type BrandIconProps = {
  className?: string;
};

/** Open padlock mark for the Unlock product brand. */
export function BrandIcon({ className = 'h-5 w-5' }: BrandIconProps) {
  return <Unlock className={className} strokeWidth={2} aria-hidden />;
}
