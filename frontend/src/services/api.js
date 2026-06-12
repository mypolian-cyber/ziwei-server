import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export async function calcFree(input) {
  const { data } = await api.post('/ziwei/calculate', { ...input, service_type: 'ziwei_free' })
  return data
}

export async function createOrder(service_type, cache_key) {
  const { data } = await api.post('/payment/order', { service_type, cache_key })
  return data
}

export async function calcPaid(input, service_type, payment_key) {
  const { data } = await api.post('/ziwei/calculate', { ...input, service_type, payment_key })
  return data
}

export async function calcTest(input, service_type) {
  const { data } = await api.post('/ziwei/calculate', { ...input, service_type, payment_key: 'test_skip' })
  return data
}

export async function sendContact(form) {
  const { data } = await api.post('/contact/send', form)
  return data
}
