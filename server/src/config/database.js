import dns from 'node:dns';
import { execFileSync } from 'node:child_process';
import mongoose from 'mongoose';
import { safeErrorMessage } from '../utils/safeError.js';

let observingConnection = false;

function observeConnection() {
    if (observingConnection) return;
    observingConnection = true;
    mongoose.connection.on('error', (error) => console.error('MongoDB connection error:', safeErrorMessage(error)));
    mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'));
    mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));
}

function readWindowsDnsServers() {
    const output = execFileSync(
        'powershell.exe',
        [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            'Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object { $_.ServerAddresses.Count -gt 0 } | ForEach-Object { $_.ServerAddresses } | Select-Object -Unique',
        ],
        { encoding: 'utf8', windowsHide: true, timeout: 15000 },
    );

    return output.split(/\r?\n/).map((server) => server.trim()).filter(Boolean);
}

export function configureWindowsDnsServers({
    platform = process.platform,
    getServers = readWindowsDnsServers,
    setServers = dns.setServers,
} = {}) {
    if (platform !== 'win32') return;

    try {
        const servers = getServers();
        if (servers.length === 0) return false;
        setServers(servers);
        return true;
    } catch {
        console.error('Windows DNS lookup unavailable; using the current DNS resolver configuration');
        return false;
    }
}

export default async function connectDB() {
    observeConnection();
    if (process.env.NODE_ENV === 'development' && process.env.MONGODB_URI?.startsWith('mongodb+srv://')) {
        configureWindowsDnsServers();
    }

    await mongoose.connect(process.env.MONGODB_URI?.trim(), { serverSelectionTimeoutMS: 10000 });
    console.log('MongoDB connected');
}
