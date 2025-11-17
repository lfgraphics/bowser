/**
 * Storage Testing Utilities
 * Use these in browser console to debug IndexedDB issues
 */

import localforage from 'localforage'

// Test if localforage is working
export async function testStorage() {
  try {
    console.log('Testing localforage...')
    
    // Test write
    await localforage.setItem('test_key', { test: 'data', timestamp: new Date().toISOString() })
    console.log('✅ Write test passed')
    
    // Test read
    const data = await localforage.getItem('test_key')
    console.log('✅ Read test passed:', data)
    
    // Test delete
    await localforage.removeItem('test_key')
    console.log('✅ Delete test passed')
    
    // List all keys
    const keys = await localforage.keys()
    console.log('📋 All keys in storage:', keys)
    
    return { success: true, keys }
  } catch (error) {
    console.error('❌ Storage test failed:', error)
    return { success: false, error }
  }
}

// Get all morning update keys
export async function getMorningUpdateKeys() {
  try {
    const keys = await localforage.keys()
    const morningUpdateKeys = keys.filter(k => k.startsWith('morningUpdate_'))
    console.log('Morning update keys:', morningUpdateKeys)
    return morningUpdateKeys
  } catch (error) {
    console.error('Failed to get keys:', error)
    return []
  }
}

// Get data for a specific key
export async function getStorageData(key: string) {
  try {
    const data = await localforage.getItem(key)
    console.log(`Data for key "${key}":`, data)
    return data
  } catch (error) {
    console.error(`Failed to get data for key "${key}":`, error)
    return null
  }
}

// Clear all morning update data
export async function clearAllMorningUpdates() {
  try {
    const keys = await getMorningUpdateKeys()
    for (const key of keys) {
      await localforage.removeItem(key)
      console.log(`Removed: ${key}`)
    }
    console.log(`✅ Cleared ${keys.length} morning update entries`)
    return keys.length
  } catch (error) {
    console.error('Failed to clear morning updates:', error)
    return 0
  }
}

// Export for browser console usage
if (typeof window !== 'undefined') {
  (window as any).storageTest = {
    test: testStorage,
    getKeys: getMorningUpdateKeys,
    getData: getStorageData,
    clearAll: clearAllMorningUpdates,
  }
  console.log('Storage test utilities loaded. Use: window.storageTest')
}
