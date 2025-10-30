import localforage from 'localforage'

localforage.config({
  name: 'myApp',
  storeName: 'myStore'
})

// Save any object (e.g. entire page state) under a specific key
export async function saveFormData (key: string, data: any) {
  await localforage.setItem(key, data)
}

export async function loadFormData<T> (key: string): Promise<T | null> {
  const data = await localforage.getItem<T>(key)
  return data || null
}

export async function clearFormData (key: string) {
  await localforage.removeItem(key)
}

// Optional: Clear all form data
export async function clearAllForms () {
  await localforage.clear()
}
