import fs from 'fs';
import { join } from 'path';
import isDev from 'electron-is-dev';

// Configuration file path
const configPath = isDev
    ? join(process.cwd(), 'user-config.json')
    : join(process.resourcesPath, 'user-config.json');

// Default configuration
const defaultConfig = {
    localUri: 'mongodb://localhost:27017'
};

// Load user configuration
let userConfig = { ...defaultConfig };

try {
    if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        userConfig = { ...defaultConfig, ...JSON.parse(configData) };
    }
} catch (error) {
    console.warn('Could not load user config, using defaults:', error.message);
}

// Save user configuration
export function saveConfig(newConfig) {
    try {
        userConfig = { ...userConfig, ...newConfig };
        fs.writeFileSync(configPath, JSON.stringify(userConfig, null, 2));
        console.log('💾 Configuration saved:', newConfig);
        return true;
    } catch (error) {
        console.error('Could not save user config:', error.message);
        return false;
    }
}

// Reload configuration from file (useful after external changes)
export function reloadConfig() {
    try {
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            userConfig = { ...defaultConfig, ...JSON.parse(configData) };
            console.log('🔄 Configuration reloaded from file');
            return true;
        }
    } catch (error) {
        console.warn('Could not reload user config:', error.message);
        return false;
    }
    return false;
}

// Get configuration value
export function getConfig(key) {
    return userConfig[key];
}

// Get all configuration
export function getAllConfig() {
    return { ...userConfig };
}

export default {
    saveConfig,
    getConfig,
    getAllConfig
};