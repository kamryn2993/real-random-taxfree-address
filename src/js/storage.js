// Local Storage Management

const STORAGE_KEY = 'saved_addresses';
const RATE_LIMIT_KEY = 'address_generation_rate_limit';
const MIN_INTERVAL_MS = 2000; // 2秒
const MAX_PER_HOUR = 88; // 每小时最多88次

// Get all saved addresses
export function getSavedAddresses() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading saved addresses:', error);
    return [];
  }
}

// Extract core address fields for comparison (exclude id, savedAt)
function getAddressCore(address) {
  const { id, savedAt, ...core } = address;
  return core;
}

// Save address
export function saveAddress(address) {
  try {
    const addresses = getSavedAddresses();
    
    // Check for duplicates based on core address fields (excluding id and savedAt)
    const addressCore = getAddressCore(address);
    const addressCoreString = JSON.stringify(addressCore);
    const isDuplicate = addresses.some(addr => {
      const savedCore = getAddressCore(addr);
      return JSON.stringify(savedCore) === addressCoreString;
    });
    
    if (isDuplicate) {
      return { success: false, message: '该地址已保存，请勿重复添加' };
    }
    
    addresses.push({
      ...address,
      id: Date.now().toString(),
      savedAt: new Date().toISOString()
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
    return { success: true, message: '地址已成功保存' };
  } catch (error) {
    console.error('Error saving address:', error);
    return { success: false, message: '保存地址时出错' };
  }
}

// Delete address by id
export function deleteAddress(id) {
  try {
    const addresses = getSavedAddresses();
    const filtered = addresses.filter(addr => addr.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return { success: true, message: '删除成功' };
  } catch (error) {
    console.error('Error deleting address:', error);
    return { success: false, message: '删除地址时出错' };
  }
}

// Clear all addresses
export function clearAllAddresses() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return { success: true, message: '已清空所有地址' };
  } catch (error) {
    console.error('Error clearing addresses:', error);
    return { success: false, message: '清空地址时出错' };
  }
}

// Get saved addresses count
export function getSavedCount() {
  return getSavedAddresses().length;
}

// Export to CSV
export function exportToCSV() {
  try {
    const addresses = getSavedAddresses();
    
    if (addresses.length === 0) {
      return { success: false, message: '没有保存的地址' };
    }
    
    // CSV header
    const headers = ['姓名', '性别', '电话', '电子邮件', '完整地址'];
    const rows = addresses.map(addr => {
      const name = `${addr.firstName || ''} ${addr.lastName || ''}`.trim();
      const gender = addr.gender || '';
      const phone = addr.phone || '';
      const email = addr.email || '';
      const fullAddress = addr.fullAddress || formatAddress(addr);
      
      return [
        name,
        gender,
        phone,
        email,
        fullAddress
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });
    
    const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CSV-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    return { success: true, message: 'CSV文件已下载' };
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return { success: false, message: '导出CSV失败' };
  }
}

// Export to JSON
export function exportToJSON() {
  try {
    const addresses = getSavedAddresses();
    
    if (addresses.length === 0) {
      return { success: false, message: '没有保存的地址' };
    }
    
    const json = JSON.stringify(addresses, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `JSON-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    return { success: true, message: 'JSON文件已下载' };
  } catch (error) {
    console.error('Error exporting JSON:', error);
    return { success: false, message: '导出JSON失败' };
  }
}

// Rate limiting functions
function getRateLimitData() {
  try {
    const data = localStorage.getItem(RATE_LIMIT_KEY);
    return data ? JSON.parse(data) : { lastGeneration: 0, hourlyGenerations: [] };
  } catch (error) {
    console.error('Error loading rate limit data:', error);
    return { lastGeneration: 0, hourlyGenerations: [] };
  }
}

function saveRateLimitData(data) {
  try {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving rate limit data:', error);
  }
}

// Clean old generation records (older than 1 hour)
function cleanOldGenerations(generations) {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  return generations.filter(timestamp => timestamp > oneHourAgo);
}

// Check if generation is allowed
export function checkGenerationRateLimit() {
  try {
    const now = Date.now();
    const rateLimitData = getRateLimitData();
    
    // Clean old records
    rateLimitData.hourlyGenerations = cleanOldGenerations(rateLimitData.hourlyGenerations);
    
    // Check 2 second interval (skip if first time, lastGeneration is 0)
    if (rateLimitData.lastGeneration > 0) {
      const timeSinceLastGeneration = now - rateLimitData.lastGeneration;
      if (timeSinceLastGeneration < MIN_INTERVAL_MS) {
        const remainingSeconds = Math.ceil((MIN_INTERVAL_MS - timeSinceLastGeneration) / 1000);
        return {
          allowed: false,
          message: `请等待 ${remainingSeconds} 秒后再生成`,
          remainingSeconds: remainingSeconds
        };
      }
    }
    
    // Check hourly limit
    if (rateLimitData.hourlyGenerations.length >= MAX_PER_HOUR) {
      const oldestGeneration = rateLimitData.hourlyGenerations[0];
      const timeUntilOldestExpires = (oldestGeneration + (60 * 60 * 1000)) - now;
      const remainingMinutes = Math.ceil(timeUntilOldestExpires / (60 * 1000));
      return {
        allowed: false,
        message: `每小时最多生成 ${MAX_PER_HOUR} 次，请等待 ${remainingMinutes} 分钟`,
        remainingMinutes: remainingMinutes
      };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // If there's an error, allow generation to prevent blocking users
    return { allowed: true };
  }
}

// Record generation (used for both generation and save operations)
export function recordGeneration() {
  try {
    const now = Date.now();
    const rateLimitData = getRateLimitData();
    
    // Clean old records
    rateLimitData.hourlyGenerations = cleanOldGenerations(rateLimitData.hourlyGenerations);
    
    // Update last generation time
    rateLimitData.lastGeneration = now;
    
    // Add current generation to hourly list
    rateLimitData.hourlyGenerations.push(now);
    
    // Save updated data
    saveRateLimitData(rateLimitData);
    
    return {
      success: true,
      remainingInHour: MAX_PER_HOUR - rateLimitData.hourlyGenerations.length
    };
  } catch (error) {
    console.error('Error recording generation:', error);
    // Return success even if recording fails to prevent blocking
    return {
      success: true,
      remainingInHour: MAX_PER_HOUR
    };
  }
}

// Check if save can be done without recording (if it's within 2 seconds of last generation)
export function canSaveWithoutRecording() {
  try {
    const now = Date.now();
    const rateLimitData = getRateLimitData();
    // If lastGeneration is 0, it's the first time, so save needs to be recorded
    if (rateLimitData.lastGeneration === 0) {
      return false;
    }
    const timeSinceLastGeneration = now - rateLimitData.lastGeneration;
    
    // If save happens within 2 seconds of generation, it's part of the same operation
    return timeSinceLastGeneration < MIN_INTERVAL_MS;
  } catch (error) {
    console.error('Error checking save without recording:', error);
    // On error, require recording to be safe
    return false;
  }
}

// Helper function to format address
function formatAddress(address) {
  if (typeof address === 'string') {
    return address;
  }
  if (address.street && address.city && address.state && address.zip) {
    return `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
  }
  return JSON.stringify(address);
}

