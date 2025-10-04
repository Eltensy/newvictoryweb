export const cn = (...classes: string[]) => classes.filter(Boolean).join(' ');

export function luhnCheck(cardNumber: string) {
  const digits = cardNumber.replace(/\s/g, '').split('').map(Number);
  let sum = 0;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits[i];
    if ((digits.length - i) % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}