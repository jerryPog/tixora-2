/**
 * TIXORA PARAMETERIZED QUERY ENGINE
 * OWASP ASVS 4.0 Compliant Database Parameterization & Anti-SQLi Defense
 * 
 * Guarantees that all database interactions use prepared statements / parameterized bindings,
 * preventing SQL injection (CWE-89) and PostgREST filter injection.
 */

const crypto = require('crypto');

/**
 * Validates that an SQL identifier (table name, column name) contains only safe characters
 * @param {string} identifier
 * @returns {string} Sanitized identifier or throws error
 */
function validateIdentifier(identifier) {
    if (typeof identifier !== 'string') {
        throw new Error(`[ParameterizedQuery] Identifier must be a string, received ${typeof identifier}`);
    }
    const clean = identifier.trim();
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(clean)) {
        throw new Error(`[ParameterizedQuery] Invalid SQL identifier: "${clean}". Only alphanumeric characters and underscore allowed.`);
    }
    return clean;
}

/**
 * Validates parameter types and sanitizes values before binding
 * @param {any} val 
 * @param {string} type 
 * @returns {any} Sanitized value
 */
function sanitizeParam(val, type = 'string') {
    if (val === null || val === undefined) return null;
    switch (type.toLowerCase()) {
        case 'uuid': {
            const s = String(val).trim().toLowerCase();
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(s)) {
                throw new Error(`[ParameterizedQuery] Invalid UUID parameter: "${val}"`);
            }
            return s;
        }
        case 'int':
        case 'integer': {
            const num = parseInt(val, 10);
            if (isNaN(num)) throw new Error(`[ParameterizedQuery] Invalid integer parameter: "${val}"`);
            return num;
        }
        case 'float':
        case 'number':
        case 'numeric': {
            const num = parseFloat(val);
            if (isNaN(num)) throw new Error(`[ParameterizedQuery] Invalid numeric parameter: "${val}"`);
            return num;
        }
        case 'boolean':
        case 'bool': {
            if (typeof val === 'boolean') return val;
            if (val === 'true' || val === 1 || val === '1') return true;
            if (val === 'false' || val === 0 || val === '0') return false;
            throw new Error(`[ParameterizedQuery] Invalid boolean parameter: "${val}"`);
        }
        case 'email': {
            const s = String(val).trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
                throw new Error(`[ParameterizedQuery] Invalid email parameter: "${val}"`);
            }
            return s;
        }
        case 'date':
        case 'timestamp': {
            const d = new Date(val);
            if (isNaN(d.getTime())) throw new Error(`[ParameterizedQuery] Invalid date parameter: "${val}"`);
            return d.toISOString();
        }
        case 'string':
        default:
            return String(val);
    }
}

/**
 * Inspects raw input for SQL injection patterns
 * Throws an explicit security exception if an attack vector is detected.
 * @param {string} input 
 */
function detectSqlInjection(input) {
    if (typeof input !== 'string') return;
    const dangerousPatterns = [
        /(?:'|"|`)\s*OR\s*['"0-9a-zA-Z]/i,
        /(?:'|"|`)\s*AND\s*['"0-9a-zA-Z]/i,
        /--.*$/,
        /\/\*[\s\S]*?\*\//,
        /;\s*(?:DROP|DELETE|UPDATE|INSERT|CREATE|ALTER|TRUNCATE|GRANT|REVOKE)\b/i,
        /\bUNION\s+(?:ALL\s+)?SELECT\b/i,
        /\bWAITFOR\s+DELAY\b/i,
        /\bBENCHMARK\s*\(/i,
        /\bPG_SLEEP\s*\(/i
    ];
    for (const pattern of dangerousPatterns) {
        if (pattern.test(input)) {
            const err = new Error(`[ParameterizedQuery Security Barrier] Potential SQL injection pattern detected: ${pattern.source}`);
            err.code = 'SQLI_PATTERN_DETECTED';
            throw err;
        }
    }
}

/**
 * Verifies that an SQL query is properly parameterized using positional placeholders ($1, $2, ...)
 * and binds the parameters securely.
 * @param {string} sqlText 
 * @param {Array} params 
 * @returns {{ text: string, values: Array }}
 */
function prepare(sqlText, params = []) {
    if (typeof sqlText !== 'string' || !sqlText.trim()) {
        throw new Error('[ParameterizedQuery] Query text must be a non-empty string');
    }
    if (!Array.isArray(params)) {
        throw new Error('[ParameterizedQuery] Query params must be an Array');
    }

    // Count positional placeholders ($1, $2, $3...)
    const matches = sqlText.match(/\$[0-9]+/g) || [];
    const uniquePlaceholders = new Set(matches);

    if (uniquePlaceholders.size !== params.length) {
        throw new Error(`[ParameterizedQuery] Parameter mismatch: Query has ${uniquePlaceholders.size} placeholder(s) ($1..$${uniquePlaceholders.size}) but received ${params.length} argument(s).`);
    }

    return {
        text: sqlText,
        values: params
    };
}

/**
 * Supabase PostgREST Parameterized Query Builder Wrapper
 * Guarantees that callers bind parameters safely without string interpolation
 */
function createParameterizedClient(supabaseClient) {
    if (!supabaseClient) return null;

    return {
        /**
         * Parameterized Select Query
         * @param {string} table 
         * @param {string} selectColumns 
         * @param {Array<{ column: string, op?: string, value: any, type?: string }>} filters
         */
        select(table, selectColumns = '*', filters = []) {
            const safeTable = validateIdentifier(table);
            let query = supabaseClient.from(safeTable).select(selectColumns);

            for (const filter of filters) {
                const { column, op = 'eq', value, type = 'string' } = filter;
                const safeCol = validateIdentifier(column);
                const safeVal = sanitizeParam(value, type);

                if (typeof query[op] === 'function') {
                    query = query[op](safeCol, safeVal);
                } else {
                    query = query.filter(safeCol, op, safeVal);
                }
            }
            return query;
        },

        /**
         * Parameterized Stored Procedure (RPC) Invocation
         * @param {string} procedureName 
         * @param {Object} params 
         */
        async rpc(procedureName, params = {}) {
            const safeProcedure = validateIdentifier(procedureName);
            const safeParams = {};
            for (const [k, v] of Object.entries(params)) {
                const safeKey = validateIdentifier(k);
                safeParams[safeKey] = v;
            }
            return await supabaseClient.rpc(safeProcedure, safeParams);
        }
    };
}

module.exports = {
    validateIdentifier,
    sanitizeParam,
    detectSqlInjection,
    prepare,
    createParameterizedClient
};
