function databaseName(uri) {
    const match = /^mongodb(?:\+srv)?:\/\/[^/\s]+\/([^/?#]+)(?:\?([^#]*))?$/.exec(uri);
    if (!match) throw new Error('TEST_MONGODB_URI must select an explicit, isolated test database');
    const query = new URLSearchParams(match[2] || '');
    if ([...query.keys()].some((key) => key.toLowerCase() === 'dbname')) {
        throw new Error('TEST_MONGODB_URI must not override the database through query options');
    }
    try {
        return decodeURIComponent(match[1]);
    } catch {
        throw new Error('TEST_MONGODB_URI contains an invalid database name');
    }
}

export function getTestDatabaseConfig(environment = process.env) {
    const uri = environment.TEST_MONGODB_URI?.trim();
    if (!uri) return null;
    const dbName = databaseName(uri);
    if (!/^[a-z0-9][a-z0-9_-]*_test(?:_[a-z0-9][a-z0-9-]*)?$/i.test(dbName) || Buffer.byteLength(dbName) > 63) {
        throw new Error('TEST_MONGODB_URI must use a dedicated database ending in _test or _test_<suffix>');
    }
    if (environment.MONGODB_URI?.trim()) {
        let productionName;
        try { productionName = databaseName(environment.MONGODB_URI.trim()); } catch { /* No explicit production database. */ }
        if (productionName === dbName) throw new Error('TEST_MONGODB_URI must use a different database from production');
    }
    return { uri, dbName };
}
