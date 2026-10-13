import dns from 'node:dns';
import { execFileSync } from 'node:child_process';
import mongoose from 'mongoose';

function readWindowsDnsServers() {
    const output = execFileSync(
        'powershell.exe',
        [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            'Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object { $_.ServerAddresses.Count -gt 0 } | ForEach-Object { $_.ServerAddresses } | Select-Object -Unique',
        ],
        { encoding: 'utf8', windowsHide: true, timeout: 5000 },
    );

    return output.split(/\r?\n/).map((server) => server.trim()).filter(Boolean);
}

export function configureWindowsDnsServers({
    platform = process.platform,
    getServers = readWindowsDnsServers,
    setServers = dns.setServers,
} = {}) {
    if (platform !== 'win32') return;

    const servers = getServers();
    if (servers.length === 0) {
        throw new Error('No IPv4 DNS servers are configured in Windows');
    }

    setServers(servers);
}

export default async function connectDB() {
    if (process.env.NODE_ENV === 'development' && process.env.MONGODB_URI?.startsWith('mongodb+srv://')) {
        configureWindowsDnsServers();
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
}