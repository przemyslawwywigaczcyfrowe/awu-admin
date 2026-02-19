export const isEmailValid = (input: string): boolean => {
  return /^[^@]+@\w+(\.\w+)+\w$/.test(input)
}

export const isPhoneNumberValid = (input: string): boolean => {
  return !/[a-zA-Z]/.test(input) && input.length >= 9
}

export const isNipValid = (nip: string): boolean => {
  const cleaned = nip.replace(/[\s-]/g, '')
  if (cleaned.length !== 10 || !/^\d{10}$/.test(cleaned)) return false
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * weights[i]
  }
  return sum % 11 === parseInt(cleaned[9])
}

export const isPostalCodeValid = (input: string): boolean => {
  return /^[0-9]{2}-[0-9]{3}$/.test(input)
}
