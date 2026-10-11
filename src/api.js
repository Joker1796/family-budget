// Apps Script не умеет отвечать на CORS preflight, поэтому шлём text/plain —
// такой запрос браузер отправляет без предварительной проверки.
export async function callApi({ apiUrl, secret }, body) {
  let res
  try {
    res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...body, secret }),
    })
  } catch {
    throw new Error('Нет связи с сервером — изменения отправятся позже')
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  let data
  try {
    data = await res.json()
  } catch {
    throw new Error('Сервер ответил не JSON — проверьте, что веб-приложение открыто для «Все» (Anyone)')
  }
  if (!data.ok) throw new Error(data.error === 'unauthorized' ? 'Неверный семейный пароль' : data.error)
  return data
}
