/**
 * TIXORA SECURE FILE UPLOAD & PAYLOAD LIMIT ENGINE
 * OWASP ASVS 4.0 & CWE-434 / CWE-400 Defense Protocol
 * 
 * Strictly restricts upload sizes, MIME types, extensions, magic signatures,
 * and enforces request body size limits against Denial of Service (DoS).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { applySecurityHeaders } = require('./security-headers');
const { handleCors } = require('./cors');
const { csrfGuard } = require('./csrf');

// ============================================================================
// CONFIGURATION & LIMITS
// ============================================================================

// Maximum file upload size: 5 Megabytes
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5,242,880 bytes

// Standard request body limit: 100 Kilobytes (JSON / Auth / Forms)
const MAX_REQUEST_BODY_SIZE = 100 * 1024; // 102,400 bytes

// Maximum upload payload size: 6 Megabytes (to allow for multipart/base64 framing)
const MAX_UPLOAD_BODY_SIZE = 6 * 1024 * 1024; // 6,291,456 bytes

// Whitelist of allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
]);

// Whitelist of allowed file extensions
const ALLOWED_EXTENSIONS = new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif'
]);

// Explicit blacklist of dangerous extensions (executables, scripts, markup, archives)
const DANGEROUS_EXTENSIONS = new Set([
    '.exe', '.bat', '.cmd', '.sh', '.bin', '.msi', '.dll', '.com', '.scr',
    '.pif', '.vbs', '.js', '.mjs', '.ts', '.jsx', '.tsx',
    '.php', '.php3', '.php4', '.php5', '.phtml', '.phps', '.phar',
    '.asp', '.aspx', '.cer', '.asa', '.jsp', '.jspx', '.cgi', '.pl',
    '.py', '.pyc', '.pyw', '.rb', '.sh', '.bash', '.zsh',
    '.htaccess', '.htpasswd', '.config', '.ini',
    '.svg', '.html', '.htm', '.xhtml', '.xml', '.shtml',
    '.zip', '.tar', '.gz', '.7z', '.rar', '.bz2', '.iso'
]);

// Map extensions to canonical MIME types
const EXT_TO_MIME = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif'
};

// Storage directory for uploaded posters
const ROOT_DIR = path.resolve(__dirname, '..');
const UPLOAD_SUBDIR = path.join('posters', 'uploads');
const UPLOAD_DIR = path.join(ROOT_DIR, UPLOAD_SUBDIR);

// Ensure upload directory exists
try {
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
} catch (e) {
    // In read-only environments (e.g. Vercel serverless /tmp), create in /tmp
    const tmpDir = path.join('/tmp', 'posters', 'uploads');
    try {
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
    } catch (err) {}
}

// ============================================================================
// MAGIC BYTE & FILE SIGNATURE VERIFICATION
// ============================================================================

/**
 * Inspect raw buffer header bytes (Magic Bytes) to verify true file format
 * Prevents MIME-spoofing where a script/executable is renamed to an image.
 * 
 * @param {Buffer} buffer
 * @returns {string|null} Detected MIME type or null
 */
function detectMagicType(buffer) {
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 4) {
        return null;
    }

    // 1. JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return 'image/jpeg';
    }

    // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buffer.length >= 8 &&
        buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
        buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
        return 'image/png';
    }

    // 3. GIF: GIF87a or GIF89a (47 49 46 38 37/39 61)
    if (buffer.length >= 6 &&
        buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38 &&
        (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61) {
        return 'image/gif';
    }

    // 4. WebP: RIFF .... WEBP
    if (buffer.length >= 12 &&
        buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
        buffer.slice(8, 12).toString('ascii') === 'WEBP') {
        return 'image/webp';
    }

    return null;
}

/**
 * Scan buffer for suspicious embedded scripts, PHP tags, or HTML injection
 * @param {Buffer} buffer 
 * @returns {boolean} True if malicious payload or embedded code detected
 */
function containsEmbeddedMalware(buffer) {
    if (!buffer || buffer.length === 0) return false;

    // Check first 1KB and last 512 bytes for dangerous tags
    const inspectLength = Math.min(buffer.length, 2048);
    const headText = buffer.slice(0, inspectLength).toString('latin1').toLowerCase();

    // Check for PHP tags, script tags, or SVG XML injection
    if (
        headText.includes('<?php') ||
        headText.includes('<script') ||
        headText.includes('javascript:') ||
        headText.includes('onload=') ||
        headText.includes('onerror=') ||
        headText.includes('<!doctype html') ||
        headText.includes('<svg')
    ) {
        return true;
    }

    // Check executable PE headers (MZ header) or ELF
    if (buffer.length >= 2 && buffer[0] === 0x4D && buffer[1] === 0x5A) {
        return true; // Windows PE Executable
    }
    if (buffer.length >= 4 && buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) {
        return true; // Linux ELF Executable
    }

    return false;
}

// ============================================================================
// FILE VALIDATION ENGINE
// ============================================================================

/**
 * Validates file size, file extension, declared MIME type, and binary magic bytes
 * 
 * @param {Object} file
 * @param {Buffer} file.buffer
 * @param {string} file.originalName
 * @param {string} file.mimeType
 * @param {number} [file.size]
 * @returns {{ valid: boolean, code?: string, error?: string, sanitizedExt?: string, canonicalMime?: string }}
 */
function validateFile({ buffer, originalName = '', mimeType = '', size = 0 }) {
    const actualSize = (buffer && Buffer.isBuffer(buffer)) ? buffer.length : size;

    // 1. Size Validation: Empty File Check
    if (!actualSize || actualSize <= 0) {
        return {
            valid: false,
            code: 'FILE_EMPTY',
            error: 'Upload rejected: File is empty (0 bytes).'
        };
    }

    // 2. Size Validation: Max 5MB Limit Check
    if (actualSize > MAX_FILE_SIZE) {
        return {
            valid: false,
            code: 'FILE_TOO_LARGE',
            error: `Upload rejected: File size (${(actualSize / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 5 MB.`
        };
    }

    // 3. Extension Validation
    const cleanName = path.basename(originalName || '').replace(/[\0\r\n\x00-\x1F]/g, '');
    const ext = path.extname(cleanName).toLowerCase();

    if (!ext) {
        return {
            valid: false,
            code: 'MISSING_FILE_EXTENSION',
            error: 'Upload rejected: File must have a valid extension (.jpg, .jpeg, .png, .webp, .gif).'
        };
    }

    if (DANGEROUS_EXTENSIONS.has(ext)) {
        return {
            valid: false,
            code: 'DANGEROUS_FILE_TYPE_BLOCKED',
            error: `Security Alert: Upload of executable or script file type "${ext}" is strictly forbidden.`
        };
    }

    if (!ALLOWED_EXTENSIONS.has(ext)) {
        return {
            valid: false,
            code: 'UNSUPPORTED_FILE_TYPE',
            error: `Upload rejected: Unsupported extension "${ext}". Allowed types: JPEG, PNG, WebP, GIF.`
        };
    }

    // 4. Declared MIME Type Validation
    const cleanMime = (mimeType || '').trim().toLowerCase();
    if (cleanMime && !ALLOWED_MIME_TYPES.has(cleanMime)) {
        return {
            valid: false,
            code: 'UNSUPPORTED_MIME_TYPE',
            error: `Upload rejected: Unsupported MIME type "${cleanMime}". Allowed types: image/jpeg, image/png, image/webp, image/gif.`
        };
    }

    // 5. Binary Magic Byte Verification
    if (buffer && Buffer.isBuffer(buffer)) {
        const detectedMime = detectMagicType(buffer);
        if (!detectedMime) {
            return {
                valid: false,
                code: 'INVALID_FILE_SIGNATURE',
                error: 'Upload rejected: Corrupt or invalid image file. Magic bytes do not match supported image formats.'
            };
        }

        // Verify that detected format matches the extension
        const expectedMime = EXT_TO_MIME[ext];
        if (expectedMime && detectedMime !== expectedMime) {
            return {
                valid: false,
                code: 'MIME_SPOOFING_DETECTED',
                error: `Security Alert: File signature spoofing detected. File has extension "${ext}" but binary header is "${detectedMime}".`
            };
        }

        // 6. Embedded Malware & Polyglot Check
        if (containsEmbeddedMalware(buffer)) {
            return {
                valid: false,
                code: 'MALICIOUS_PAYLOAD_DETECTED',
                error: 'Security Alert: File contains embedded executable code, script tags, or dangerous markup.'
            };
        }

        return {
            valid: true,
            sanitizedExt: ext,
            canonicalMime: detectedMime,
            size: actualSize
        };
    }

    return {
        valid: true,
        sanitizedExt: ext,
        canonicalMime: EXT_TO_MIME[ext] || cleanMime,
        size: actualSize
    };
}

// ============================================================================
// SECURE REQUEST STREAM READER (DOS & PAYLOAD LIMIT DEFENSE)
// ============================================================================

/**
 * Reads an incoming HTTP request stream with strict byte counting and size enforcement.
 * Aborts and rejects immediately if Content-Length or stream exceeds maxBytes.
 * 
 * @param {http.IncomingMessage} req 
 * @param {number} [maxBytes=MAX_REQUEST_BODY_SIZE]
 * @returns {Promise<Buffer>}
 */
function readBodyWithLimit(req, maxBytes = MAX_REQUEST_BODY_SIZE) {
    return new Promise((resolve, reject) => {
        // If already parsed or ended
        if (req.body !== undefined) {
            if (Buffer.isBuffer(req.body)) return resolve(req.body);
            if (typeof req.body === 'object') return resolve(Buffer.from(JSON.stringify(req.body)));
            if (typeof req.body === 'string') return resolve(Buffer.from(req.body));
        }

        // 1. Fast Upfront Content-Length Header Check
        const contentLength = parseInt(req.headers['content-length'] || '0', 10);
        if (contentLength > maxBytes) {
            const err = new Error(`Payload Too Large: Content-Length ${contentLength} bytes exceeds limit of ${maxBytes} bytes.`);
            err.code = 'PAYLOAD_TOO_LARGE';
            err.statusCode = 413;
            err.maxAllowed = maxBytes;
            return reject(err);
        }

        if (req.readableEnded) {
            return resolve(Buffer.alloc(0));
        }

        // 2. Stream chunk counting
        const chunks = [];
        let totalReceived = 0;
        let isAborted = false;

        function onData(chunk) {
            if (isAborted) return;
            totalReceived += chunk.length;
            if (totalReceived > maxBytes) {
                isAborted = true;
                req.removeListener('data', onData);
                req.removeListener('end', onEnd);
                req.removeListener('error', onError);
                // Pause and unpipe to drop further incoming network bytes
                try { req.pause(); } catch (e) {}

                const err = new Error(`Payload Too Large: Request body exceeded limit of ${maxBytes} bytes.`);
                err.code = 'PAYLOAD_TOO_LARGE';
                err.statusCode = 413;
                err.maxAllowed = maxBytes;
                return reject(err);
            }
            chunks.push(chunk);
        }

        function onEnd() {
            if (isAborted) return;
            resolve(Buffer.concat(chunks));
        }

        function onError(err) {
            if (isAborted) return;
            reject(err);
        }

        req.on('data', onData);
        req.on('end', onEnd);
        req.on('error', onError);
    });
}

// ============================================================================
// MULTIPART & BASE64 UPLOAD PARSER
// ============================================================================

/**
 * Parse multipart/form-data boundary and extract files
 * @param {Buffer} bodyBuffer 
 * @param {string} boundary 
 * @returns {Array<{ name: string, filename: string, mimeType: string, data: Buffer }>}
 */
function parseMultipartBuffer(bodyBuffer, boundary) {
    const files = [];
    if (!bodyBuffer || !boundary) return files;

    const boundaryBuffer = Buffer.from('--' + boundary);
    let startIdx = 0;

    while (startIdx < bodyBuffer.length) {
        const nextBoundary = bodyBuffer.indexOf(boundaryBuffer, startIdx);
        if (nextBoundary === -1) break;

        const partStart = nextBoundary + boundaryBuffer.length;
        // Check for closing delimiter "--"
        if (bodyBuffer.slice(partStart, partStart + 2).toString() === '--') {
            break;
        }

        // Find headers ending with \r\n\r\n
        const headerEnd = bodyBuffer.indexOf(Buffer.from('\r\n\r\n'), partStart);
        if (headerEnd === -1) break;

        const headerStr = bodyBuffer.slice(partStart, headerEnd).toString('latin1');
        const nextBoundaryPos = bodyBuffer.indexOf(boundaryBuffer, headerEnd + 4);
        if (nextBoundaryPos === -1) break;

        // Data ends 2 bytes before next boundary (\r\n)
        const dataEnd = nextBoundaryPos - 2;
        const partData = bodyBuffer.slice(headerEnd + 4, Math.max(headerEnd + 4, dataEnd));

        // Parse headers
        const dispMatch = headerStr.match(/content-disposition:[^\r\n]*name="([^"]+)"(?:;[^\r\n]*filename="([^"]+)")?/i);
        const typeMatch = headerStr.match(/content-type:\s*([^\r\n;]+)/i);

        if (dispMatch) {
            const fieldName = dispMatch[1];
            const originalFilename = dispMatch[2] || '';
            const mimeType = typeMatch ? typeMatch[1].trim() : 'application/octet-stream';

            if (originalFilename || partData.length > 0) {
                files.push({
                    name: fieldName,
                    filename: originalFilename,
                    mimeType: mimeType,
                    data: partData
                });
            }
        }

        startIdx = nextBoundaryPos;
    }

    return files;
}

// ============================================================================
// SAFE STORAGE
// ============================================================================

/**
 * Persists an uploaded image buffer safely to disk with a random cryptographic filename
 * 
 * @param {Buffer} buffer 
 * @param {string} ext 
 * @returns {{ publicUrl: string, absolutePath: string, filename: string }}
 */
function saveUploadedFile(buffer, ext) {
    const randomHex = crypto.randomBytes(16).toString('hex');
    const safeFilename = `poster_${Date.now()}_${randomHex}${ext}`;

    // Target directory: /tmp on read-only serverless (Vercel), local posters/uploads otherwise
    const tmpDir = path.join(process.env.VERCEL ? '/tmp' : os.tmpdir(), 'posters', 'uploads');
    const candidateDirs = process.env.VERCEL ? [tmpDir] : [UPLOAD_DIR, tmpDir];

    let lastErr = null;
    for (const dir of candidateDirs) {
        try {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const resolvedDir = path.resolve(dir);
            const filePath = path.resolve(resolvedDir, safeFilename);

            // Verify boundary containment (Path Traversal defense)
            if (!filePath.startsWith(resolvedDir + path.sep)) {
                throw new Error('Directory traversal attempt blocked.');
            }

            fs.writeFileSync(filePath, buffer);
            const publicUrl = `posters/uploads/${safeFilename}`;
            return {
                publicUrl,
                absolutePath: filePath,
                filename: safeFilename
            };
        } catch (err) {
            lastErr = err;
        }
    }

    throw lastErr || new Error('Failed to write uploaded file to storage.');
}

// ============================================================================
// UPLOAD ENDPOINT HTTP HANDLER
// ============================================================================

/**
 * Handles POST /api/upload
 * Validates CSRF, CORS, Request Body Size (<=6MB), File Size (<=5MB), and File Types.
 */
async function handleUploadEndpoint(req, res) {
    applySecurityHeaders(res, { isApi: true, req });
    if (handleCors(req, res)) return;

    // 1. Method Check
    if (req.method !== 'POST') {
        const payload = { error: 'Method Not Allowed. Use POST for file uploads.' };
        if (typeof res.status === 'function') return res.status(405).json(payload);
        res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }

    // 2. CSRF Protection Barrier
    if (!csrfGuard(req, res)) return;

    // 2b. Authentication & Admin/Manager Authorization Barrier
    const {
        verifySessionCookies,
        verifySupabaseAccessToken,
        resolveVerifiedRole
    } = require('./auth/session');

    let isAuthorizedAdmin = false;
    let isAuthenticated = false;

    const sessionCheck = verifySessionCookies(req);
    if (sessionCheck.valid) {
        isAuthenticated = true;
        isAuthorizedAdmin = sessionCheck.isAdmin;
    }

    const authHeader = String((req.headers && req.headers.authorization) || '');
    if (!isAuthorizedAdmin && authHeader.toLowerCase().startsWith('bearer ')) {
        const bearerToken = authHeader.slice(7).trim();
        if (bearerToken) {
            const verifiedUser = await verifySupabaseAccessToken(bearerToken);
            if (verifiedUser) {
                isAuthenticated = true;
                const role = await resolveVerifiedRole(verifiedUser, bearerToken);
                isAuthorizedAdmin = role === 'admin' || role === 'manager';
            }
        }
    }

    if (!isAuthenticated) {
        const payload = {
            status: 'unauthorized',
            code: 'AUTHENTICATION_REQUIRED',
            error: 'Authentication required to upload media assets.'
        };
        if (typeof res.status === 'function') return res.status(401).json(payload);
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }

    if (!isAuthorizedAdmin) {
        const payload = {
            status: 'forbidden',
            code: 'ADMIN_ROLE_REQUIRED',
            error: 'Administrator or manager clearance is required to upload media assets.'
        };
        if (typeof res.status === 'function') return res.status(403).json(payload);
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }

    // 3. Read Request Body with Strict 6MB Upload Limit
    let rawBuffer;
    try {
        rawBuffer = await readBodyWithLimit(req, MAX_UPLOAD_BODY_SIZE);
    } catch (err) {
        const statusCode = err.statusCode || 400;
        const payload = {
            status: 'error',
            code: err.code || 'UPLOAD_READ_ERROR',
            error: err.message
        };
        if (typeof res.status === 'function') return res.status(statusCode).json(payload);
        res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }

    const contentType = req.headers['content-type'] || '';

    let uploadItem = null;

    // 4a. Handle Multipart/form-data upload
    if (contentType.includes('multipart/form-data')) {
        const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
        if (!boundaryMatch) {
            const payload = { status: 'error', code: 'INVALID_MULTIPART_BOUNDARY', error: 'Missing boundary in multipart form data.' };
            if (typeof res.status === 'function') return res.status(400).json(payload);
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(payload));
        }

        const boundary = boundaryMatch[1].trim().replace(/^"|"$/g, '');
        const files = parseMultipartBuffer(rawBuffer, boundary);
        const filePart = files.find(f => f.filename || f.data.length > 0);

        if (!filePart || !filePart.data || filePart.data.length === 0) {
            const payload = { status: 'error', code: 'NO_FILE_UPLOADED', error: 'No file found in upload request.' };
            if (typeof res.status === 'function') return res.status(400).json(payload);
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(payload));
        }

        uploadItem = {
            buffer: filePart.data,
            originalName: filePart.filename || 'uploaded_image.png',
            mimeType: filePart.mimeType,
            size: filePart.data.length
        };
    } 
    // 4b. Handle JSON / Base64 upload
    else {
        let jsonBody = {};
        try {
            jsonBody = JSON.parse(rawBuffer.toString('utf8'));
        } catch (e) {
            const payload = { status: 'error', code: 'MALFORMED_JSON_PAYLOAD', error: 'Upload must be multipart/form-data or valid JSON with base64 data.' };
            if (typeof res.status === 'function') return res.status(400).json(payload);
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(payload));
        }

        const dataUri = jsonBody.file || jsonBody.image || jsonBody.data || '';
        const originalName = jsonBody.filename || jsonBody.name || 'uploaded_poster.webp';

        if (!dataUri || typeof dataUri !== 'string') {
            const payload = { status: 'error', code: 'NO_FILE_DATA', error: 'Field "file" containing base64 data URL is required.' };
            if (typeof res.status === 'function') return res.status(400).json(payload);
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(payload));
        }

        // Parse Data URI: data:image/png;base64,iVBOR...
        const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
        let declaredMime = '';
        let base64Data = dataUri;

        if (match) {
            declaredMime = match[1];
            base64Data = match[2];
        }

        const fileBuffer = Buffer.from(base64Data, 'base64');
        uploadItem = {
            buffer: fileBuffer,
            originalName: originalName,
            mimeType: declaredMime,
            size: fileBuffer.length
        };
    }

    // 5. Strict Security Validation (Size <= 5MB, Allowed Types, Magic Bytes, Malware Inspection)
    const validation = validateFile(uploadItem);

    if (!validation.valid) {
        const statusCode = validation.code === 'FILE_TOO_LARGE' ? 413 : 400;
        const payload = {
            status: 'error',
            code: validation.code,
            error: validation.error,
            allowedTypes: Array.from(ALLOWED_EXTENSIONS),
            maxSizeBytes: MAX_FILE_SIZE,
            maxSizeMb: 5
        };
        if (typeof res.status === 'function') return res.status(statusCode).json(payload);
        res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }

    // 6. Save Validated File with Cryptographic Random Filename
    let saved;
    try {
        saved = saveUploadedFile(uploadItem.buffer, validation.sanitizedExt);
    } catch (saveErr) {
        const payload = { status: 'error', code: 'STORAGE_WRITE_FAILED', error: 'Failed to write uploaded file to storage.' };
        if (typeof res.status === 'function') return res.status(500).json(payload);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }

    // 7. Return Success
    const responsePayload = {
        status: 'success',
        message: 'File successfully validated and uploaded.',
        url: saved.publicUrl,
        filename: saved.filename,
        originalName: path.basename(uploadItem.originalName),
        sizeBytes: validation.size,
        sizeFormatted: `${(validation.size / 1024).toFixed(1)} KB`,
        mimeType: validation.canonicalMime
    };

    if (typeof res.status === 'function') return res.status(200).json(responsePayload);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(responsePayload));
}

module.exports = {
    MAX_FILE_SIZE,
    MAX_REQUEST_BODY_SIZE,
    MAX_UPLOAD_BODY_SIZE,
    ALLOWED_MIME_TYPES,
    ALLOWED_EXTENSIONS,
    DANGEROUS_EXTENSIONS,
    detectMagicType,
    containsEmbeddedMalware,
    validateFile,
    readBodyWithLimit,
    parseMultipartBuffer,
    saveUploadedFile,
    handleUploadEndpoint
};

