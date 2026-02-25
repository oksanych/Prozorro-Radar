import { formatUAH, formatUAHShort } from '@/lib/formatters';

interface MoneyFormatProps {
  value: number | null;
  short?: boolean;
}

export default function MoneyFormat({ value, short }: MoneyFormatProps) {
  return (
    <span>{short ? formatUAHShort(value) : formatUAH(value)}</span>
  );
}
