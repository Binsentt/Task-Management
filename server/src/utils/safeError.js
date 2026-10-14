import { ConfigurationError } from '../config/env.js';

// Never serialize a driver error: its message, stack, cause and topology may contain credentials.
export function safeErrorMessage(error) {
    if (error instanceof ConfigurationError) return error.message;
    const code = error?.code ?? error?.cause?.code;
    if (code === 'EADDRINUSE') return 'The HTTP port is already in use. Check PORT and running processes.';
    if (code === 'EACCES' || code === 'EPERM') return 'The operation was denied by the host. Check network and process permissions.';
    if (['querySrv', 'queryTxt', 'queryA', 'queryAaaa'].includes(error?.syscall)
        || code === 'ENOTFOUND' || code === 'EAI_AGAIN' || code === 'ENODATA') {
        return 'MongoDB DNS lookup failed. Check the Atlas hostname and DNS resolver.';
    }
    if (code === 18 || code === 'AuthenticationFailed') {
        return 'MongoDB authentication failed. Check the Atlas database user and URI encoding.';
    }
    if (error?.name === 'MongoParseError' || error?.name === 'MongoInvalidArgumentError') {
        return 'MongoDB connection configuration is invalid. Check MONGODB_URI and connection options.';
    }
    if (['MongooseServerSelectionError', 'MongoServerSelectionError', 'MongoNetworkError', 'MongoNetworkTimeoutError'].includes(error?.name)
        || ['ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET'].includes(code)) {
        return 'MongoDB is unreachable. Check Atlas Network Access, cluster availability, credentials, and DNS.';
    }
    return 'Backend operation failed. Check service configuration and availability.';
}
