export const formatDateNumeric = (datetime: string, time: boolean = true): string => {
  if (!datetime) return ''
  const date = new Date(datetime)
  let result =
    (date.getDate() <= 9 ? '0' + date.getDate() : date.getDate()) +
    '.' +
    (date.getMonth() + 1 <= 9 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) +
    '.' +
    date.getFullYear()
  if (time) {
    result +=
      ' ' +
      (date.getHours() <= 9 ? '0' + date.getHours() : date.getHours()) +
      ':' +
      (date.getMinutes() <= 9 ? '0' + date.getMinutes() : date.getMinutes())
  }
  return result
}

export const formatDateLong = (datetime: string, time: boolean = true): string => {
  if (!datetime) return ''
  const date = new Date(datetime)
  const dayName = date.toLocaleDateString('pl-PL', { weekday: 'long' })
  let result = dayName.charAt(0).toUpperCase() + dayName.slice(1) + ', '
  result +=
    (date.getDate() <= 9 ? '0' + date.getDate() : date.getDate()) +
    '.' +
    date.toLocaleDateString('pl-PL', { month: '2-digit' }) +
    '.' +
    date.getFullYear()
  if (time) {
    result +=
      ' ' +
      (date.getHours() <= 9 ? '0' + date.getHours() : date.getHours()) +
      ':' +
      (date.getMinutes() <= 9 ? '0' + date.getMinutes() : date.getMinutes())
  }
  return result
}

export const formatDateRelative = (datetime: string): string => {
  if (!datetime) return ''
  const date = new Date(datetime)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'przed chwilą'
  if (diffMins < 60) return `${diffMins} min temu`
  if (diffHours < 24) return `${diffHours} godz. temu`
  if (diffDays < 7) return `${diffDays} dni temu`
  return formatDateNumeric(datetime, false)
}
