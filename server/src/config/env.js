export class ConfigurationError extends Error {}

export function validateEnvironment(environment = process.env) {
    const required = ['MONGODB_URI', 'JWT_SECRET'];
    const missing = required.filter((name) => !environment[name]?.trim());
    const problems = [];
    if (missing.length) problems.push(`Missing environment variables: ${missing.join(', ')}`);
    if (environment.MONGODB_URI?.trim() && !/^mongodb(?:\+srv)?:\/\/\S+$/.test(environment.MONGODB_URI.trim())) {
        problems.push('MONGODB_URI must use mongodb:// or mongodb+srv://');
    }
    if (environment.JWT_SECRET?.trim() && environment.JWT_SECRET.trim().length < 32) {
        problems.push('JWT_SECRET must be at least 32 characters');
    }
    const portValue = environment.PORT?.trim() || '5000';
    const port = Number(portValue);
    if (!/^\d+$/.test(portValue) || !Number.isInteger(port) || port < 1 || port > 65535) {
        problems.push('PORT must be an integer between 1 and 65535');
    }
    if (problems.length) throw new ConfigurationError(problems.join('\n'));
    return { port };
}
